import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { utilityProcess } from 'electron'
import path from 'path'
import fs from 'fs'
import net from 'net'
import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import { autoUpdater } from 'electron-updater'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development'

interface AppConfig {
  mode: 'single' | 'lan'
  serverUrl: string
}

const configPath = path.join(app.getPath('userData'), 'config.json')

const MARIADB_PORT_DEFAULT = 3307
let activeMariaDbPort = MARIADB_PORT_DEFAULT

// Search for system-installed MariaDB mysqld.exe in common Windows paths
function findSystemMariaDb(): string | null {
  const versions = [
    '12.3', '12.2', '12.1',
    '11.8', '11.7', '11.6', '11.5', '11.4', '11.3', '11.2', '11.1', '11.0',
    '10.11', '10.6', '10.5', '10.4',
  ]
  const programFiles = [
    process.env['ProgramFiles'] || 'C:\\Program Files',
    process.env['ProgramW6432'] || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
  ]

  const candidates: string[] = []

  // Official MariaDB installer paths
  for (const pf of programFiles) {
    for (const v of versions) {
      candidates.push(path.join(pf, `MariaDB ${v}`, 'bin', 'mysqld.exe'))
    }
  }

  // XAMPP
  candidates.push('C:\\xampp\\mysql\\bin\\mysqld.exe')

  // WAMP / WAMP64 — scan subdirectories
  for (const wampDir of ['C:\\wamp64\\bin\\mariadb', 'C:\\wamp\\bin\\mariadb']) {
    if (fs.existsSync(wampDir)) {
      try {
        for (const sub of fs.readdirSync(wampDir)) {
          candidates.push(path.join(wampDir, sub, 'bin', 'mysqld.exe'))
        }
      } catch { /* ignore */ }
    }
  }

  // Laragon
  for (const lgDir of ['C:\\laragon\\bin\\mysql', 'C:\\laragon\\bin\\mariadb']) {
    if (fs.existsSync(lgDir)) {
      try {
        for (const sub of fs.readdirSync(lgDir)) {
          candidates.push(path.join(lgDir, sub, 'bin', 'mysqld.exe'))
        }
      } catch { /* ignore */ }
    }
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

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

let globalServerUrl = 'http://127.0.0.1:3002/api'
let serverProc: Electron.UtilityProcess | null = null
let mariadbProc: ChildProcess | null = null

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

function isPortBusy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => { server.close(); resolve(false) })
    server.listen(port, '127.0.0.1')
  })
}

async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 20; port++) {
    if (!(await isPortBusy(port))) return port
  }
  throw new Error(`No free port found in range ${start}–${start + 19}`)
}

async function startMariaDb(mysqldPath: string): Promise<void> {
  // basedir = parent of bin/ directory
  const mariadbDir = path.dirname(path.dirname(mysqldPath))
  const dataDir = getDataDir()

  // Find a free port for MariaDB (skip ports occupied by other apps)
  activeMariaDbPort = await findFreePort(MARIADB_PORT_DEFAULT)
  if (activeMariaDbPort !== MARIADB_PORT_DEFAULT) {
    console.log(`[MariaDB] Port ${MARIADB_PORT_DEFAULT} busy — using port ${activeMariaDbPort}`)
  }

  // Clean up stale .pid / lock files that block restart after a crash
  for (const staleFile of [
    path.join(dataDir, 'mysqld.pid'),
    path.join(dataDir, 'mariadbd.pid'),
    path.join(dataDir, 'mysql.pid'),
    path.join(dataDir, 'aria_log_control'),
  ]) {
    if (staleFile.endsWith('.pid') && fs.existsSync(staleFile)) {
      try { fs.unlinkSync(staleFile); console.log('[MariaDB] Removed stale pid:', staleFile) } catch { /* ignore */ }
    }
  }

  // First-run: initialize data directory (insecure = no root password)
  if (!fs.existsSync(path.join(dataDir, 'mysql'))) {
    console.log('[MariaDB] First run — initializing data directory...')
    fs.mkdirSync(dataDir, { recursive: true })

    await new Promise<void>((resolve, reject) => {
      const initLines: string[] = []
      const init = spawn(mysqldPath, [
        '--initialize-insecure',
        `--datadir=${dataDir}`,
        `--basedir=${mariadbDir}`,
      ], { stdio: 'pipe' })

      init.stderr?.on('data', (d: Buffer) => {
        const msg = d.toString().trim()
        if (msg) { console.log('[MariaDB init]', msg); initLines.push(msg) }
      })
      init.stdout?.on('data', (d: Buffer) => {
        const msg = d.toString().trim()
        if (msg) { console.log('[MariaDB init]', msg); initLines.push(msg) }
      })
      init.on('error', (err) => reject(new Error(`mysqld.exe spawn failed: ${err.message}`)))
      init.on('close', (code) => {
        if (fs.existsSync(path.join(dataDir, 'mysql'))) {
          resolve()
        } else {
          const detail = initLines.slice(-10).join('\n')
          reject(new Error(`MariaDB init failed (exit ${code}):\n${detail || 'No output captured'}`)
          )
        }
      })
    })

    console.log('[MariaDB] Data directory initialized successfully')
  }

  // Start the server
  console.log(`[MariaDB] Starting on port ${activeMariaDbPort}...`)
  const serverLines: string[] = []

  await new Promise<void>((resolve, reject) => {
    mariadbProc = spawn(mysqldPath, [
      `--datadir=${dataDir}`,
      `--basedir=${mariadbDir}`,
      `--port=${activeMariaDbPort}`,
      '--bind-address=127.0.0.1',
      '--console',
    ], { stdio: 'pipe' })

    const collectLine = (d: Buffer) => {
      const msg = d.toString().trim()
      if (msg) { console.log('[MariaDB]', msg); serverLines.push(msg) }
    }
    mariadbProc.stdout?.on('data', collectLine)
    mariadbProc.stderr?.on('data', collectLine)

    mariadbProc.on('error', (err) => reject(new Error(`mysqld.exe spawn failed: ${err.message}`)))

    mariadbProc.on('exit', (code) => {
      console.log('[MariaDB] Process exited with code', code)
      const detail = serverLines.slice(-15).join('\n')
      reject(new Error(`MariaDB crashed (exit ${code}):\n${detail || 'No output captured'}`))
    })

    waitForPort(activeMariaDbPort, 90000).then(resolve).catch((timeoutErr) => {
      const detail = serverLines.slice(-15).join('\n')
      reject(new Error(`${timeoutErr.message}\n\nMariaDB output:\n${detail || 'No output captured'}`))
    })
  })

  console.log('[MariaDB] Ready!')
}

function getServerBundlePath(): string {
  if (isDev) {
    return path.join(__dirname, '../server-bundle/server.cjs')
  }
  return path.join(process.resourcesPath, 'server-bundle', 'server.cjs')
}

function startServer(): Promise<boolean> {
  return new Promise((resolve) => {
    const bundlePath = getServerBundlePath()
    if (!fs.existsSync(bundlePath)) {
      console.error('Server bundle not found:', bundlePath)
      resolve(false)
      return
    }

    let resolved = false
    const done = (ok: boolean) => { if (!resolved) { resolved = true; resolve(ok) } }

    serverProc = utilityProcess.fork(bundlePath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: `mysql://root:@127.0.0.1:${activeMariaDbPort}/abyte_medix`,
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
      if (msg.includes('running on') || msg.includes(':3002')) done(true)
    })

    serverProc.stderr?.on('data', (data: Buffer) => {
      console.error('[Server]', data.toString().trim())
    })

    serverProc.on('exit', (code) => {
      console.log('[Server] Exited with code', code)
      done(false)
    })

    // Fallback: consider started after 45s
    setTimeout(() => done(true), 45000)
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

function setupAutoUpdater(win: BrowserWindow) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available')
  })
  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update-progress', progress)
  })
  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update-downloaded', info)
  })
  autoUpdater.on('error', (err) => {
    win.webContents.send('update-error', err.message)
  })

  ipcMain.handle('check-for-updates', () => {
    if (!isDev) autoUpdater.checkForUpdates().catch(console.error)
  })
  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate().catch(console.error)
  })
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })
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
    const setupWin = createWindow('/setup')
    setupAutoUpdater(setupWin)
    return
  }

  globalServerUrl = config.serverUrl

  if (config.mode === 'single') {
    // Detect system-installed MariaDB
    const mysqldPath = findSystemMariaDb()
    if (!mysqldPath) {
      const { response } = await dialog.showMessageBox({
        type: 'error',
        title: 'MariaDB Not Installed',
        message: 'MariaDB database server was not found on this system.',
        detail: 'AbyteMedix requires MariaDB to be installed before use.\n\nSteps:\n1. Click "Download MariaDB" below\n2. Install MariaDB (use default settings)\n3. Restart AbyteMedix after installation',
        buttons: ['Download MariaDB', 'Exit'],
        defaultId: 0,
        cancelId: 1,
      })
      if (response === 0) {
        shell.openExternal('https://mariadb.org/download/?t=mariadb&o=true&p=mariadb')
      }
      app.quit()
      return
    }

    console.log('[MariaDB] Found system installation:', mysqldPath)

    let mariaDbStarted = false

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await startMariaDb(mysqldPath)
        mariaDbStarted = true
        break
      } catch (e: any) {
        console.error('[MariaDB] Failed to start:', e.message)

        // Try to read MariaDB error log for more detail
        const logPath = path.join(getDataDir(), 'mariadbd.err')
        let logTail = ''
        try {
          if (fs.existsSync(logPath)) {
            const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean)
            logTail = '\n\nMariaDB Log (last 5 lines):\n' + lines.slice(-5).join('\n')
          }
        } catch { /* ignore */ }

        const { response } = await dialog.showMessageBox({
          type: 'error',
          title: 'Database Failed to Start',
          message: 'MariaDB could not start.',
          detail: `${e.message}${logTail}\n\nTroubleshooting:\n• App will automatically find a free port on retry\n• Try restarting your PC\n• Re-install MariaDB if the issue persists`,
          buttons: ['Retry', 'Exit'],
          defaultId: 0,
          cancelId: 1,
        })

        if (response === 1) {
          app.quit()
          return
        }
        // response === 0 → Retry next iteration
      }
    }

    if (!mariaDbStarted) {
      const dataDir = getDataDir()
      await dialog.showMessageBox({
        type: 'error',
        title: 'Cannot Start Database',
        message: 'AbyteMedix could not start the database after retrying.',
        detail: `Steps to fix:\n1. Restart your PC and open AbyteMedix again\n2. Make sure no other app is using port ${MARIADB_PORT}\n3. If issue persists, delete the data folder and re-setup:\n   ${dataDir}\n4. Re-install MariaDB from mariadb.org if needed`,
        buttons: ['Exit'],
      })
      app.quit()
      return
    }

    const serverOk = await startServer()
    if (!serverOk) {
      const { response } = await dialog.showMessageBox({
        type: 'error',
        title: 'Server Failed to Start',
        message: 'AbyteMedix server could not start.',
        detail: 'Manual Fix Steps:\n1. Close AbyteMedix\n2. Restart your PC and try again\n3. If issue persists, re-install AbyteMedix\n4. Contact support if problem continues',
        buttons: ['Try Anyway', 'Exit'],
        defaultId: 0,
        cancelId: 1,
      })
      if (response === 1) {
        app.quit()
        return
      }
    }
  }

  const win = createWindow()
  setupAutoUpdater(win)
  if (!isDev) setTimeout(() => autoUpdater.checkForUpdates().catch(console.error), 10000)
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
