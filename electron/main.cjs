const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Charger les variables d'environnement pour la production
if (process.env.NODE_ENV !== 'development') {
  dotenv.config({ path: path.join(process.resourcesPath, '.env') });
} else {
  dotenv.config();
}

const { setupDatabaseIPC, prisma } = require('./ipc/database.cjs');
const { setupAuthIPC } = require('./ipc/auth.cjs');
const { setupSyncIPC, runSync } = require('./ipc/sync.cjs');

// Définir l'environnement par défaut si non spécifié
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isDev = process.env.NODE_ENV === 'development';
console.log(`Application démarrée en mode: ${process.env.NODE_ENV}`);

const runDbPush = () => {
  const prismaPath = isDev
    ? path.join(__dirname, '../node_modules/prisma/build/index.js')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'prisma', 'build', 'index.js');

  return new Promise((resolve, reject) => {
    console.log('Lancement de Prisma db push pour assurer la création des tables...');
    
    const dbPushProcess = spawn(process.execPath, [prismaPath, 'db', 'push', '--accept-data-loss']);

    dbPushProcess.stdout.on('data', (data) => {
      console.log(`[DB PUSH] stdout: ${data}`);
    });
    dbPushProcess.stderr.on('data', (data) => {
      console.error(`[DB PUSH] stderr: ${data}`);
    });
    dbPushProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Schéma de la BDD appliqué avec succès.');
        resolve();
      } else {
        console.error(`Le processus db push s'est terminé avec le code ${code}`);
        reject(new Error('La création du schéma a échoué.'));
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
  // La logique de copie de la BDD depuis database.cjs est maintenant la seule responsable
  // de l'initialisation en production. Nous n'appelons plus runDbPush() ici pour
  // éviter la boucle infinie de spawn.
  setupDatabaseIPC(prisma);
  setupAuthIPC(prisma);
  setupSyncIPC(prisma);
  
  createWindow();
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
