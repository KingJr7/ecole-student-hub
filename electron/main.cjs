const { app, BrowserWindow, ipcMain, protocol, dialog, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Gestionnaire global pour les rejets de promesses non gérés
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection (Global): ', reason);
});

// Charger les variables d'environnement
if (process.env.NODE_ENV !== 'development') {
  dotenv.config({ path: path.join(process.resourcesPath, '.env') });
} else {
  dotenv.config();
  console.log(`[main.cjs] DATABASE_URL: ${process.env.DATABASE_URL}`);
}

// Définir l'environnement de manière fiable
const isDev = !app.isPackaged;
console.log(`Application démarrée en mode: ${isDev ? 'development' : 'production'}`);

const runMigration = () => {
  return new Promise((resolve, reject) => {
    console.log('Vérification et application des migrations de la base de données...');
    
    const projectRoot = path.join(__dirname, '..');
    const dbPath = path.join(projectRoot, 'prisma', 'ntik.sqlite');

    const command = fs.existsSync(dbPath) ? 'deploy' : 'reset';
    const args = ['prisma', 'migrate', command];
    if (command === 'reset') {
      args.push('--force');
    }

    const migrateProcess = spawn('npx', args, { 
        cwd: projectRoot,
        shell: false
    });

    migrateProcess.stdout.on('data', (data) => {
      console.log(`[MIGRATE] stdout: ${data}`);
    });
    migrateProcess.stderr.on('data', (data) => {
      console.error(`[MIGRATE] stderr: ${data}`);
    });
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Migrations appliquées avec succès.');
        resolve();
      } else {
        console.error(`Le processus de migration s'est terminé avec le code ${code}`);
        reject(new Error('L\'application des migrations a échoué.'));
      }
    });
  });
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
      preload: path.join(__dirname, 'preload.cjs')
    },
    autoHideMenuBar: true,
    show: false,
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (!isDev) {
    win.setMenu(null);
  }

  if (isDev) {
    const serverUrl = 'http://localhost:8080';
    win.loadURL(serverUrl).catch(() => {
      console.log('Serveur Vite non prêt, chargement depuis les fichiers locaux...');
      tryLoadFromDist(win);
    });
    win.webContents.openDevTools();
  } else {
    tryLoadFromDist(win);
  }
}

function tryLoadFromDist(win) {
  const indexPath = path.join(__dirname, '../dist/index.html');
  const fileUrl = `file://${indexPath}`;
  win.loadURL(fileUrl).catch(err => {
    console.error('Erreur finale lors du chargement de index.html:', err);
  });
}

app.whenReady().then(async () => {
  const { initializePrisma, setupDatabaseIPC } = require('./ipc/database.cjs');
  const { setupAuthIPC } = require('./ipc/auth.cjs');
  const { setupSyncIPC, runSync } = require('./ipc/sync.cjs');

  if (isDev) {
      await runMigration();
  }

  const prisma = initializePrisma();

  await prisma.$connect();

  const imagesDir = path.join(app.getPath('userData'), 'images', 'students');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  setupDatabaseIPC(prisma);
  setupAuthIPC(prisma);
  setupSyncIPC(prisma, imagesDir);

  protocol.registerFileProtocol('ntik-fs', (request, callback) => {
    const url = request.url.replace('ntik-fs://', '');
    const imagePath = path.join(imagesDir, url);
    callback({ path: imagePath });
  });

  ipcMain.handle('images:get-base64', async (event, fileName) => {
    if (!fileName) return null;
    const imagePath = path.join(imagesDir, fileName);
    try {
      if (fs.existsSync(imagePath)) {
        const data = fs.readFileSync(imagePath);
        const base64 = data.toString('base64');
        // Assuming webp, adjust if other formats are stored
        return `data:image/webp;base64,${base64}`;
      }
    } catch (error) {
      console.error(`Failed to read image ${fileName}:`, error);
    }
    return null;
  });

  ipcMain.handle('images:process-student-photo', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    if (canceled || filePaths.length === 0) {
      return null;
    }

    const sourcePath = filePaths[0];
    const newFileName = `${Date.now()}.webp`;
    const savePath = path.join(imagesDir, newFileName);

    try {
      await sharp(sourcePath)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(savePath);
      return newFileName;
    } catch (error) {
      console.error("Erreur lors du traitement de l'image:", error);
      return null;
    }
  });

  // #region Printer IPC Handlers
  ipcMain.handle('printers:get-list', async (event) => {
    if (event.sender && typeof event.sender.getPrintersAsync === 'function') {
      return await event.sender.getPrintersAsync();
    }
    return [];
  });

  ipcMain.handle('printers:print-receipt', async (event, { htmlContent, printerName }) => {
    const printWindow = new BrowserWindow({ show: false });
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURI(htmlContent)}`);
    
    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
          silent: true,
          deviceName: printerName,
          printBackground: true,
        }, (success, errorType) => {
          if (!success) {
            console.error('Printing failed:', errorType);
            reject(new Error(errorType));
          } else {
            resolve({ success: true });
          }
          printWindow.close();
        });
      });
    });
  });
  // #endregion

  ipcMain.handle('debug:get-web-contents-methods', (event) => {
    try {
      const sender = event.sender;
      const proto = Object.getPrototypeOf(sender);
      const methods = Object.getOwnPropertyNames(proto);
      const printerMethods = methods.filter(m => m.toLowerCase().includes('printer'));
      return {
        totalMethods: methods.length,
        printerRelatedMethods: printerMethods,
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  createWindow();

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings && settings.loggedIn === 1 && settings.schoolId) {
      console.log('[SYNC STARTUP] Utilisateur déjà connecté. Lancement de la synchronisation au démarrage...');
      runSync(prisma, settings.schoolId, settings.userToken).catch(err => {
        console.error('[SYNC STARTUP] La synchronisation au démarrage a échoué:', err);
      });
    }
  } catch (error) {
      console.error("Impossible de vérifier les settings pour la synchro auto, la table n'existe probablement pas encore.", error.message);
  }

  if (!isDev) {
    app.commandLine.appendSwitch('disable-http2');
    let retries = 0;
    const MAX_RETRIES = 3;
    autoUpdater.on('checking-for-update', () => console.log('[AUTO-UPDATE] Recherche de mise à jour...'));
    autoUpdater.on('update-available', (info) => { console.log('[AUTO-UPDATE] Mise à jour disponible.', info); retries = 0; });
    autoUpdater.on('download-progress', (p) => console.log(`[AUTO-UPDATE] Téléchargement: ${p.percent.toFixed(2)}%`));
    autoUpdater.on('update-downloaded', () => { console.log('[AUTO-UPDATE] Mise à jour téléchargée. Installation au redémarrage.'); autoUpdater.quitAndInstall(); });
    autoUpdater.on('error', (err) => {
      console.error('[AUTO-UPDATE] Erreur: ', err.message);
      if (err.message.includes('net::') && retries < MAX_RETRIES) {
        retries++;
        setTimeout(() => autoUpdater.checkForUpdates(), retries * 5000);
      }
    });
    autoUpdater.checkForUpdates();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});