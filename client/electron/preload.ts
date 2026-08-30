// Electron preload — CommonJS only (no ESM imports).
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { contextBridge, ipcRenderer } = (require as any)('electron')

// Read server URL synchronously so api/client.ts has it before the page mounts
const serverUrl: string = ipcRenderer.sendSync('get-server-url')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  serverUrl,
  restartWithConfig: (cfg: unknown) => ipcRenderer.invoke('restart-with-config', cfg),
  saveConfig: (cfg: unknown) => ipcRenderer.invoke('save-config', cfg),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (cb: (info: unknown) => void) => ipcRenderer.on('update-available', (_e: unknown, info: unknown) => cb(info)),
  onUpdateNotAvailable: (cb: () => void) => ipcRenderer.on('update-not-available', cb),
  onUpdateProgress: (cb: (p: unknown) => void) => ipcRenderer.on('update-progress', (_e: unknown, p: unknown) => cb(p)),
  onUpdateDownloaded: (cb: (info: unknown) => void) => ipcRenderer.on('update-downloaded', (_e: unknown, info: unknown) => cb(info)),
  onUpdateError: (cb: (msg: string) => void) => ipcRenderer.on('update-error', (_e: unknown, msg: string) => cb(msg)),
})
