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
    run: (cwd: string, command: string) => ipcRenderer.invoke('terminal:run', cwd, command),
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
  readAllFiles: (path: string) => ipcRenderer.invoke('read-all-files', path),
  deleteFile: (path: string) => ipcRenderer.invoke('delete-file', path),
  createFolder: (parentPath: string, folderName: string) => ipcRenderer.invoke('create-folder', parentPath, folderName),
  createFile: (parentPath: string, fileName: string) => ipcRenderer.invoke('create-file', parentPath, fileName),
  checkIfIndexExists: (workspaceRoot: string) => ipcRenderer.invoke('check-if-index-exists', workspaceRoot),
  runCommand: (folderPath: string, command: string) => ipcRenderer.invoke('run-command', folderPath, command),
  getIndex: (workspaceRoot: string) => ipcRenderer.invoke('get-index', workspaceRoot),
  getInlineSuggestion: (payload: { filePath: string, fileContent: string, token: string, cursorPosition: { line: number, column: number }, workspaceRoot?: string, packId?: string }) => ipcRenderer.invoke('ai:get-inline-suggestion', payload),
  createWindow: () => ipcRenderer.invoke('create-window'),
  openSettings: () => ipcRenderer.invoke('window:open-settings'),
  createTheme: (themeData: {id: string, name: string, colors: {background: string, titlebar: string, sidebar: string, border: string, accent: string,text: string, textMuted: string, textDim: string,}, videoUrl: string}, workspaceRoot: string) => ipcRenderer.invoke('create-theme', themeData, workspaceRoot),
  closeSettingsWindow: () => ipcRenderer.invoke('settings-window: close'),
  openDevTools: () => ipcRenderer.invoke('dev:open-devtools'),
  getSpecificTheme: (themeId: string) => ipcRenderer.invoke('get-specific-theme', themeId),
  getActiveTheme: () => ipcRenderer.invoke('get-active-theme-id'),
  getAllThemes: () => ipcRenderer.invoke('get-all-themes'),
  updateActiveTheme: (id: string) => ipcRenderer.invoke('update-active-theme-id', id),
  commitToGit: (workspaceRoot: string, message: string) => ipcRenderer.invoke('git:commit-changes', workspaceRoot, message),
  checkGitStatus: (workspaceRoot: string) => ipcRenderer.invoke('git:get-uncommitted-changes', workspaceRoot),
  checkGitExists: (workspaceRoot: string) => ipcRenderer.invoke('git:check-exists', workspaceRoot),
  getRecentFolders: () => ipcRenderer.invoke('recent-folders:get'),
  addRecentFolder: (folderPath: string) => ipcRenderer.invoke('recent-folders:add', folderPath),
})
