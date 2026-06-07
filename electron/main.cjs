const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

let mainWindow = null

function log(level, ...args) {
  const ts = new Date().toISOString()
  console[level](`[JobHunter][${ts}]`, ...args)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,  // disable for local file loading
    },
    autoHideMenuBar: true,
    show: false,
  })

  // Build path to index.html inside asar
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  log('info', 'indexPath resolved to:', indexPath)
  log('info', '__dirname inside asar is:', __dirname)

  // Use file:// protocol directly
  const indexUrl = `file://${indexPath.replace(/\\/g, '/')}`
  log('info', 'Loading URL:', indexUrl)

  mainWindow.loadURL(indexUrl).then(() => {
    log('info', 'loadURL succeeded')
  }).catch(err => {
    log('error', 'loadURL failed:', err.message || err)
  })

  // Show window only when ready to avoid flash of blank
  mainWindow.once('ready-to-show', () => {
    log('info', 'ready-to-show fired')
    mainWindow.show()
  })

  // Capture renderer errors
  mainWindow.webContents.on('crashed', () => log('error', 'Renderer crashed'))
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    log('error', 'Render process gone:', details.reason)
  })
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    log('info', `[Renderer console][${level}]`, msg)
  })
  mainWindow.webContents.on('did-fail-load', (e, errCode, errDesc) => {
    log('error', `did-fail-load: ${errCode} - ${errDesc}`)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    log('info', 'did-finish-load fired')
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open DevTools in case window stays blank
  mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  log('info', 'App ready')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})