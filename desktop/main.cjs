const { app, BrowserWindow, Menu, net, protocol, session } = require('electron')
const { mkdirSync } = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// A secure origin supports the local-fonts API and avoids file:// privileges.
protocol.registerSchemesAsPrivileged([
  { scheme: 'stamp', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

if (app.isPackaged) {
  // Keep preferences beside the executable, so moving the folder moves the data.
  const dataDir = path.join(path.dirname(process.execPath), 'Data')
  mkdirSync(dataDir, { recursive: true })
  app.setPath('userData', dataDir)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    const assetRoot = path.resolve(__dirname, 'web')

    protocol.handle('stamp', (request) => {
      try {
        const url = new URL(request.url)
        if (url.hostname !== 'app') return new Response('Not found', { status: 404 })
        const filename = decodeURIComponent(url.pathname)
        const requestedPath = path.resolve(assetRoot, `.${filename === '/' ? '/index.html' : filename}`)
        if (!requestedPath.startsWith(assetRoot + path.sep)) {
          return new Response('Forbidden', { status: 403 })
        }
        return net.fetch(pathToFileURL(requestedPath).toString())
      } catch {
        return new Response('Invalid path', { status: 400 })
      }
    })

    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(permission === 'local-fonts')
    })
    session.defaultSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) => {
      return permission === 'local-fonts' && requestingOrigin === 'stamp://app'
    })

    // No network is needed for drawing, importing templates, or exporting files.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] },
      (_details, callback) => callback({ cancel: true }))

    Menu.setApplicationMenu(null)
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1050,
      minHeight: 680,
      backgroundColor: '#f5f5f5',
      icon: path.join(assetRoot, 'stamp_origin.png'),
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webviewTag: false,
      },
    })

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== 'stamp://app/' && url !== 'stamp://app/index.html') event.preventDefault()
    })
    mainWindow.once('ready-to-show', () => mainWindow.show())
    mainWindow.loadURL('stamp://app/index.html')
  })

  app.on('window-all-closed', () => app.quit())
}
