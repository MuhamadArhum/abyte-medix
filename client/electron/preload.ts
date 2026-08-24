// Electron preload — must be CommonJS in sandboxed context.
// Using require() directly (not import) so bundler emits no ESM import statement
// regardless of vite-plugin-electron format settings.

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { contextBridge } = (require as any)('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
