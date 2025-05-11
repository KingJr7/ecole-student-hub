const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { setupDatabaseIPC } = require('./ipc/database.cjs')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // En développement, charge l'URL de développement
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:8080')
    win.webContents.openDevTools()
  } else {
    // En production, charge le fichier HTML construit
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Configuration des IPC pour la base de données
  setupDatabaseIPC()
  
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