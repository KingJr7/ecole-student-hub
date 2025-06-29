const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const { setupDatabaseIPC } = require('./ipc/database.cjs')
const { setupAuthIPC } = require('./ipc/auth.cjs')
const { setupSyncIPC } = require('./ipc/sync.cjs')

// Définir l'environnement par défaut si non spécifié
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Activer le logging pour le débogage en production
const isDev = process.env.NODE_ENV === 'development';
console.log(`Application démarrée en mode: ${process.env.NODE_ENV}`);


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Désactiver devTools en production
      devTools: process.env.NODE_ENV === 'development'
    },
    // Supprimer le menu standard d'Electron
    autoHideMenuBar: true,
    show: false
  })

  // Activer la fenêtre une fois qu'elle est prête (meilleure expérience utilisateur)
  win.once('ready-to-show', () => {
    win.show()
  })

  // Supprimer complètement le menu en production
  if (process.env.NODE_ENV !== 'development') {
    win.setMenu(null)
  }

  // Configurer la Content-Security-Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' https: localhost:8081; script-src 'self' 'unsafe-inline' https://cdn.gpteng.co localhost:8081; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com localhost:8081; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: localhost:8081 ws://localhost:8081"]
      }
    });
  });
  
  // Gestion différente selon le mode développement ou production
  if (process.env.NODE_ENV === 'development') {
    // En développement, charger depuis le serveur Vite
    const serverUrl = 'http://localhost:8080';
    console.log(`Mode développement: connexion au serveur Vite sur ${serverUrl}`);
    
    // Charger l'URL du serveur de développement
    win.loadURL(serverUrl).catch(err => {
      console.error('Erreur lors de la connexion au serveur Vite:', err);
      console.log('Vérifiez que le serveur Vite est bien démarré sur le port 8080');
      // Si le serveur Vite n'est pas disponible, tenter de charger depuis le dossier dist
      tryLoadFromDist();
    });
  } else {
    // En production, charger depuis le dossier dist
    tryLoadFromDist();
  }
  
  // Fonction pour charger l'application depuis le dossier dist
  function tryLoadFromDist() {
    const distPath = path.join(__dirname, '../dist');
    console.log(`Chemin du dossier dist: ${distPath}`);
    
    const indexPath = path.join(distPath, 'index.html');
    console.log(`Chargement du fichier: ${indexPath}`);
    
    try {
      require('fs').accessSync(indexPath);
      console.log('Le fichier index.html existe.');
      
      // Utiliser le protocole file:// correctement formaté
      // Convertir les backslashes en slashes pour les chemins Windows
      const normalizedPath = indexPath.replace(/\\/g, '/');
      // Construire une URL valide avec le protocole file://
      const fileUrl = `file://${normalizedPath}`;
      console.log(`URL de fichier : ${fileUrl}`);
      
      // Charger directement l'URL avec le protocole file://
      win.loadURL(fileUrl).catch(err => {
        console.error('Erreur lors du chargement de l\'URL du fichier:', err);
        // Si loadURL échoue, essayer avec loadFile comme fallback
        win.loadFile(indexPath).catch(err2 => {
          console.error('Erreur lors du chargement du fichier:', err2);
        });
      });
    } catch (err) {
      console.error('ERREUR: Le fichier index.html est introuvable!', err);
    }
  }
  
  // Ouvrir les DevTools en mode développement
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  } else {
    // Empêcher l'ouverture des DevTools en production
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools();
    });
  }
  
  // Ajouter un gestionnaire d'erreurs pour le webContents
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Échec du chargement: ${errorDescription} (${errorCode})`);
  });
}

// Configuration des mises à jour automatiques
function setupAutoUpdater() {
  // Désactiver les notifications manuelles et activer les mises à jour automatiques
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'KingJr7',
    repo: 'ecole-student-hub',
    private: true,
    token: process.env.GH_TOKEN // Le token doit être fourni au moment du build
  });
  // Mode silencieux pour les mises à jour discrètes
  autoUpdater.logger = null;
  
  // Vérifier les mises à jour au démarrage
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    console.log('Erreur lors de la vérification des mises à jour:', err);
  });
  
  // Configurer une vérification périodique des mises à jour (toutes les 6 heures)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.log('Erreur lors de la vérification périodique des mises à jour:', err);
    });
  }, 6 * 60 * 60 * 1000);
  
  // Gérer les événements de mise à jour (pour le débogage uniquement)
  if (isDev) {
    autoUpdater.on('checking-for-update', () => {
      console.log('Vérification des mises à jour...');
    });
    
    autoUpdater.on('update-available', (info) => {
      console.log('Mise à jour disponible:', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      console.log('Pas de mise à jour disponible:', info);
    });
    
    autoUpdater.on('error', (err) => {
      console.log('Erreur de mise à jour:', err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Téléchargement: ${Math.round(progressObj.percent)}%`);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Mise à jour téléchargée, sera installée à la fermeture de l\'application');
    });
  }
}

app.whenReady().then(() => {
  // Configuration des IPC pour la base de données
  const db = setupDatabaseIPC();
  setupAuthIPC(db);
  setupSyncIPC();
  // Configurer les mises à jour automatiques
  setupAutoUpdater();
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 