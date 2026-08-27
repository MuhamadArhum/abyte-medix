import { app, BrowserWindow, ipcMain } from 'electron'
import { utilityProcess } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

interface AppConfig {
  mode: 'single' | 'lan'
  serverUrl: string
  dbUrl?: string
}

const configPath = path.join(app.getPath('userData'), 'config.json')

function readConfig(): AppConfig | null {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch { /* ignore */ }
  return null
}

function writeConfig(cfg: AppConfig) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8')
}

let globalServerUrl = 'http://localhost:3002/api'
let serverProc: Electron.UtilityProcess | null = null

function getServerBundlePath(): string {
  if (isDev) {
    return path.join(__dirname, '../../client/server-bundle/server.cjs')
  }
  return path.join(process.resourcesPath, 'server-bundle', 'server.cjs')
}

function startServer(dbUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const bundlePath = getServerBundlePath()
    if (!fs.existsSync(bundlePath)) {
      console.error('Server bundle not found:', bundlePath)
      resolve()
      return
    }

    serverProc = utilityProcess.fork(bundlePath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: dbUrl,
        PORT: '3002',
        JWT_SECRET: 'abyte-medix-jwt-secret-2025',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_SECRET: 'abyte-medix-refresh-secret-2025',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        LICENSE_SECRET: 'abyte-medix-license-secret-@2025#do-not-share',
      },
      stdio: 'pipe',
    })

    serverProc.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString()
      if (msg.includes('running on') || msg.includes(':3002')) resolve()
    })

    serverProc.stderr?.on('data', (data: Buffer) => {
      console.error('[Server]', data.toString())
    })

    serverProc.on('exit', (code) => {
      console.log('[Server] exited with code', code)
    })

    // Open app after 30 seconds regardless
    setTimeout(resolve, 30000)
  })
}

function createWindow(hash?: string) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    title: 'AbyteMedix',
  })

  if (isDev) {
    win.loadURL(`http://localhost:5173${hash ? '/#' + hash : ''}`)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), hash ? { hash } : undefined)
  }

  win.once('ready-to-show', () => win.show())
  return win
}

function setupIPC() {
  ipcMain.on('get-server-url', (event) => {
    event.returnValue = globalServerUrl
  })

  ipcMain.handle('save-config', (_e, cfg: AppConfig) => {
    writeConfig(cfg)
  })

  ipcMain.handle('restart-with-config', (_e, cfg: AppConfig) => {
    writeConfig(cfg)
    app.relaunch()
    app.exit(0)
  })
}

async function bootstrap() {
  setupIPC()

  const config = readConfig()

  if (!config) {
    createWindow('/setup')
    return
  }

  globalServerUrl = config.serverUrl

  if (config.mode === 'single') {
    const dbUrl = config.dbUrl ?? 'mysql://root:12345@localhost:3306/abyte_medix'
    await startServer(dbUrl)
  }

  createWindow()
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  serverProc?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
