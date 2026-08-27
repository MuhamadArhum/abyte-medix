import { app, BrowserWindow, ipcMain } from 'electron'
import { utilityProcess } from 'electron'
import path from 'path'
import fs from 'fs'
import net from 'net'
import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

interface AppConfig {
  mode: 'single' | 'lan'
  serverUrl: string
}

const configPath = path.join(app.getPath('userData'), 'config.json')

const MARIADB_PORT = 3307
const BUNDLED_DB_URL = `mysql://root:@127.0.0.1:${MARIADB_PORT}/abyte_medix`

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
let mariadbProc: ChildProcess | null = null

function getMariaDbDir(): string {
  if (isDev) {
    return path.join(app.getAppPath(), 'mariadb-bin')
  }
  return path.join(process.resourcesPath, 'mariadb-bin')
}

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'mariadb-data')
}

function waitForPort(port: number, timeout = 90000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout
    function attempt() {
      const sock = net.createConnection(port, '127.0.0.1')
      sock.setTimeout(1000)
      sock.on('connect', () => { sock.destroy(); resolve() })
      sock.on('error', () => {
        sock.destroy()
        if (Date.now() >= deadline) reject(new Error(`Port ${port} did not open within ${timeout / 1000}s`))
        else setTimeout(attempt, 500)
      })
      sock.on('timeout', () => {
        sock.destroy()
        if (Date.now() >= deadline) reject(new Error(`Port ${port} connection timed out`))
        else setTimeout(attempt, 500)
      })
    }
    attempt()
  })
}

async function startMariaDb(): Promise<void> {
  const mariadbDir = getMariaDbDir()
  const mysqldPath = path.join(mariadbDir, 'bin', 'mysqld.exe')
  const dataDir = getDataDir()

  if (!fs.existsSync(mysqldPath)) {
    throw new Error('MariaDB binary not found: ' + mysqldPath)
  }

  // First-run: initialize data directory (insecure = no root password)
  if (!fs.existsSync(path.join(dataDir, 'mysql'))) {
    console.log('[MariaDB] First run — initializing data directory...')
    fs.mkdirSync(dataDir, { recursive: true })

    await new Promise<void>((resolve, reject) => {
      const init = spawn(mysqldPath, [
        '--initialize-insecure',
        `--datadir=${dataDir}`,
        `--basedir=${mariadbDir}`,
      ], { stdio: 'pipe' })

      init.stderr?.on('data', (d: Buffer) => {
        const msg = d.toString().trim()
        if (msg) console.log('[MariaDB init]', msg)
      })
      init.on('error', reject)
      init.on('close', () => {
        if (fs.existsSync(path.join(dataDir, 'mysql'))) resolve()
        else reject(new Error('MariaDB initialization failed — mysql system dir not created'))
      })
    })

    console.log('[MariaDB] Data directory initialized successfully')
  }

  // Start the server
  console.log(`[MariaDB] Starting on port ${MARIADB_PORT}...`)
  mariadbProc = spawn(mysqldPath, [
    `--datadir=${dataDir}`,
    `--basedir=${mariadbDir}`,
    `--port=${MARIADB_PORT}`,
    '--bind-address=127.0.0.1',
    '--console',
  ], { stdio: 'pipe' })

  mariadbProc.stdout?.on('data', (d: Buffer) => {
    const msg = d.toString().trim()
    if (msg) console.log('[MariaDB]', msg)
  })
  mariadbProc.stderr?.on('data', (d: Buffer) => {
    const msg = d.toString().trim()
    if (msg) console.log('[MariaDB]', msg)
  })
  mariadbProc.on('exit', (code) => {
    console.log('[MariaDB] Process exited with code', code)
  })

  await waitForPort(MARIADB_PORT, 90000)
  console.log('[MariaDB] Ready!')
}

function getServerBundlePath(): string {
  if (isDev) {
    return path.join(__dirname, '../server-bundle/server.cjs')
  }
  return path.join(process.resourcesPath, 'server-bundle', 'server.cjs')
}

function startServer(): Promise<void> {
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
        DATABASE_URL: BUNDLED_DB_URL,
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
      console.log('[Server]', msg.trim())
      if (msg.includes('running on') || msg.includes(':3002')) resolve()
    })

    serverProc.stderr?.on('data', (data: Buffer) => {
      console.error('[Server]', data.toString().trim())
    })

    serverProc.on('exit', (code) => {
      console.log('[Server] Exited with code', code)
    })

    // Fallback: open app after 45 seconds regardless
    setTimeout(resolve, 45000)
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
    // First run: show setup wizard
    createWindow('/setup')
    return
  }

  globalServerUrl = config.serverUrl

  if (config.mode === 'single') {
    try {
      await startMariaDb()
    } catch (e: any) {
      console.error('[MariaDB] Failed to start:', e.message)
    }
    await startServer()
  }

  createWindow()
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  serverProc?.kill()
  mariadbProc?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
