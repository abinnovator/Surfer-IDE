/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface IpcFileEntry { name: string; path: string; isDirectory: boolean; isOpen?: boolean; children?: IpcFileEntry[] }
interface IpcPack { id: string; name: string; description?: string }
interface Window {
  ipcRenderer: import('electron').IpcRenderer & {
    openFolder: () => Promise<string | null>
    readDir: (path: string) => Promise<IpcFileEntry[]>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<string>
    terminal: {
      create: (cwd?: string) => Promise<string>
      write: (data: string) => Promise<void>
      resize: (cols: number, rows: number) => Promise<void>
      onData: (cb: (data: string) => void) => void
      run: (cwd: string, command: string) => Promise<void>
    }
    storeToken: (token: string) => Promise<void>
    getToken: () => Promise<string | null>
    deleteToken: () => Promise<void>
    runAgent: (task: string, workspaceRoot: string) => Promise<string>
    onAgentUpdate: (cb: (msg: string) => void) => void
    onAgentDone: (cb: (result: string, tokens: number) => void) => void
    indexProject: (workspaceRoot: string) => Promise<void>
    onIndexUpdate: (cb: (msg: string) => void) => void
    getLangPacks: () => Promise<IpcPack[]>
    installLangPack: (packId: string, workspaceRoot: string) => Promise<void>
    checkLangPackInstalled: (packId: string, workspaceRoot: string) => Promise<boolean>
    getInstalledPackDetails: (packId: string, workspaceRoot: string) => Promise<IpcPack | null>
    windowMinimize: () => Promise<void>
    windowMaximize: () => Promise<void>
    windowClose: () => Promise<void>
    windowIsMaximized: () => Promise<boolean>
    windowHide: () => Promise<void>
    lintFile: (filePath: string) => Promise<unknown>
    readAllFiles: (path: string) => Promise<IpcFileEntry[]>
    deleteFile: (path: string) => Promise<boolean>
    createFolder: (parentPath: string, folderName: string) => Promise<void>
    createFile: (parentPath: string, fileName: string) => Promise<void>
    checkIfIndexExists: (workspaceRoot: string) => Promise<boolean>
    getIndex: (workspaceRoot: string) => Promise<{ startCommand?: string; stack?: string[]; files?: IpcFileEntry[] } | null>
    getInlineSuggestion: (payload: { filePath: string; fileContent: string; token: string; cursorPosition: { line: number; column: number }; workspaceRoot?: string; packId?: string }) => Promise<{ suggestion: string | null; error: string | null }>
    checkGitExists: (folderPath: string) => Promise<{ there: boolean; reason?: string; remoteUrl?: string }>
    checkGitStatus: (folderPath: string) => Promise<{ isClean: boolean; ahead: number; behind: number; currentBranch: string; changes: { path: string; file: string; status: string }[] }>
    commitToGit: (folderPath: string, message: string) => Promise<void>
    getRecentFolders: () => Promise<string[]>
    addRecentFolder: (folderPath: string) => Promise<void>
    createWindow: () => Promise<void>
    openSettings: () => Promise<void>
    getActiveTheme: () => Promise<string>
    getSpecificTheme: (themeId: string) => Promise<import('../lib/zustand').Theme | null>
    getAllThemes: () => Promise<{ id: string; name: string; description?: string; preview?: string; video?: string }[]>
    updateActiveTheme: (id: string) => Promise<void>
    openDevTools: () => Promise<void>
  }
}
