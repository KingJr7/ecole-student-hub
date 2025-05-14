const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { setupDatabaseIPC } = require('./ipc/database.cjs')
const { setupActivationIPC } = require('./ipc/activation.cjs')

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

  // En développement, charge l'URL de développement
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080')
    win.webContents.openDevTools()
  } else {
    // En production, charge le fichier HTML construit
    win.loadFile(path.join(__dirname, '../dist/index.html'))
    
    // Empêcher l'ouverture des DevTools en production
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
  }
}

app.whenReady().then(() => {
  // Configuration des IPC pour la base de données
  setupDatabaseIPC()
  
  // Configuration des IPC pour l'activation
  setupActivationIPC()
  
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