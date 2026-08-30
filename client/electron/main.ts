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

let globalServerUrl = 'http://127.0.0.1:3002/api'
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
  console.log(`[MariaDB] Starting on port ${MARIADB_PORT}...`)
  const serverLines: string[] = []

  await new Promise<void>((resolve, reject) => {
    mariadbProc = spawn(mysqldPath, [
      `--datadir=${dataDir}`,
      `--basedir=${mariadbDir}`,
      `--port=${MARIADB_PORT}`,
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

    waitForPort(MARIADB_PORT, 90000).then(resolve).catch((timeoutErr) => {
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

async function showStartupError(title: string, detail: string, manualSteps: string[]) {
  const stepsText = manualSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const { response } = await dialog.showMessageBox({
    type: 'error',
    title,
    message: title,
    detail: `${detail}\n\nManual Fix Steps:\n${stepsText}`,
    buttons: ['Retry', 'Download VC++ Runtime', 'Exit'],
    defaultId: 0,
    cancelId: 2,
  })
  return response // 0=Retry, 1=Download, 2=Exit
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
    let mariaDbStarted = false

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await startMariaDb()
        mariaDbStarted = true
        break
      } catch (e: any) {
        console.error('[MariaDB] Failed to start:', e.message)

        const choice = await showStartupError(
          'Database Failed to Start',
          `MariaDB could not start.\n\n${e.message}\n\nIf the error mentions a missing DLL, install Microsoft Visual C++ 2015-2022 Redistributable (x64).`,
          [
            'Click "Download VC++ Runtime" below if a DLL error is shown',
            'Install "VC_redist.x64.exe" and restart your PC',
            'Re-open AbyteMedix after installation',
          ],
        )

        if (choice === 1) {
          shell.openExternal('https://aka.ms/vs/17/release/vc_redist.x64.exe')
          app.quit()
          return
        } else if (choice === 2) {
          app.quit()
          return
        }
        // choice === 0 → Retry next iteration
      }
    }

    if (!mariaDbStarted) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Cannot Start Database',
        message: 'AbyteMedix could not start the database after retrying.',
        detail: 'Please install Microsoft Visual C++ 2015-2022 Redistributable (x64) and try again.',
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
