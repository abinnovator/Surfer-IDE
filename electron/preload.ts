import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit) 
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readDir: (path: string) => ipcRenderer.invoke('read-dir', path),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  terminal: {
    create: (cwd?: string) => ipcRenderer.invoke('terminal:create', cwd),
    write: (data: string) => ipcRenderer.invoke('terminal:write', data),
    resize: (cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', cols, rows),
    onData: (cb: (data: string) => void) => ipcRenderer.on('terminal:data', (_, data) => cb(data)),
  },
  storeToken: (token: string) => ipcRenderer.invoke('store-token', token),
  getToken: () => ipcRenderer.invoke('get-token'),
  deleteToken: () => ipcRenderer.invoke('delete-token'),
  runAgent: (task: string, workspaceRoot: string) => ipcRenderer.invoke('agent:run', { task, workspaceRoot }),
  onAgentUpdate: (cb: (msg: string) => void) => ipcRenderer.on('agent:update', (_, msg) => cb(msg)),
  onAgentDone: (cb: (result: string, tokens: number) => void) => ipcRenderer.on('agent:done', (_, data) => cb(data.result, data.tokens)),
  indexProject: (workspaceRoot: string) => ipcRenderer.invoke('project:index', workspaceRoot),
  onIndexUpdate: (cb: (msg: string) => void) => ipcRenderer.on('index:update', (_, msg) => cb(msg)),
  getLangPacks: () => ipcRenderer.invoke('get-packs'),
  installLangPack: (packId: string, workspaceRoot: string) => ipcRenderer.invoke('install-pack', packId, workspaceRoot),
  checkLangPackInstalled: (packId: string, workspaceRoot: string) => ipcRenderer.invoke('check-pack-installed', packId, workspaceRoot),
  getInstalledPackDetails: (packId: string, workspaceRoot: string) => ipcRenderer.invoke('get-installed-pack-details', packId,workspaceRoot),
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  windowHide: () => ipcRenderer.invoke('window:hide'),
  lintFile: (filePath: string) => ipcRenderer.invoke('lint-file', filePath),
})
