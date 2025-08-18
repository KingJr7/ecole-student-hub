const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
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
}

// Définir l'environnement de manière fiable
const isDev = !app.isPackaged;
console.log(`Application démarrée en mode: ${isDev ? 'development' : 'production'}`);

const runMigration = () => {
  return new Promise((resolve, reject) => {
    console.log('Vérification et application des migrations de la base de données...');
    
    const projectRoot = path.join(__dirname, '..');
    const migrateProcess = spawn('npx', ['prisma', 'migrate', 'deploy'], { 
        cwd: projectRoot,
        shell: true
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
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev,
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
  // Déplacer les imports et l'initialisation de Prisma ici
  const { initializePrisma, setupDatabaseIPC } = require('./ipc/database.cjs');
  const { setupAuthIPC } = require('./ipc/auth.cjs');
  const { setupSyncIPC, runSync } = require('./ipc/sync.cjs');

  // Étape 1: S'assurer que la base de données est migrée AVANT TOUT
  if (isDev) {
      await runMigration();
  }

  // Étape 2: Initialiser le client Prisma seulement APRÈS la migration
  const prisma = initializePrisma();

  // Étape 3: Lancer les modules de l'application avec le client initialisé
  setupDatabaseIPC(prisma);
  setupAuthIPC(prisma);
  setupSyncIPC(prisma);
  
  createWindow();

  // Étape 4: Lancer la synchronisation au démarrage si nécessaire
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

  // --- Configuration et logique de mise à jour automatique ---
  if (!isDev) {
    // Désactiver HTTP/2 si nécessaire pour éviter certains bugs réseau
    app.commandLine.appendSwitch('disable-http2');

    let retries = 0;
    const MAX_RETRIES = 3;

    autoUpdater.on('checking-for-update', () => {
      console.log('[AUTO-UPDATE] Recherche de mise à jour...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AUTO-UPDATE] Mise à jour disponible.', info);
      retries = 0; // Réinitialiser les tentatives en cas de succès
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = `Vitesse: ${(progressObj.bytesPerSecond / 1024).toFixed(2)} KB/s`;
      log_message += ` - Téléchargé ${progressObj.percent.toFixed(2)}%`;
      log_message += ` (${(progressObj.transferred / 1048576).toFixed(2)}/${(progressObj.total / 1048576).toFixed(2)} MB)`;
      console.log(`[AUTO-UPDATE] ${log_message}`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AUTO-UPDATE] Mise à jour téléchargée. L\'application va redémarrer pour installer.');
      autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (err) => {
      console.error('[AUTO-UPDATE] Erreur: ', err.message);
      const isNetworkError = err.message.includes('net::') || err.message.includes('Network Error');
      if (isNetworkError && retries < MAX_RETRIES) {
        retries++;
        const delay = retries * 5000; // Délai progressif (5s, 10s, 15s)
        console.log(`[AUTO-UPDATE] Erreur réseau. Nouvelle tentative dans ${delay / 1000} secondes... (Tentative ${retries}/${MAX_RETRIES})`);
        setTimeout(() => {
          autoUpdater.checkForUpdates();
        }, delay);
      } else {
        console.error('[AUTO-UPDATE] Échec final de la mise à jour après plusieurs tentatives.');
      }
    });

    // Lancer la vérification au démarrage
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