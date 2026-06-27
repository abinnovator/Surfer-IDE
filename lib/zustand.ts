import { create } from 'zustand'

export interface Tab { path: string; name: string; content: string }
export interface TerminalTab { id: string; label: string }
export interface Pack { id: string; name: string; description?: string }
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isOpen?: boolean
  children?: FileEntry[]
}

const fileMenuOpen = create<{ fileMenuOpen: boolean; setFileMenuOpen: (open: boolean) => void }>((set) => ({
    fileMenuOpen: false,
    setFileMenuOpen: (open) => set({ fileMenuOpen: open })
}))
const fileExplorerOpen = create<{ fileExplorerOpen: boolean; setFileExplorerOpen: (open: boolean) => void }>((set) => ({
    fileExplorerOpen: true,
    setFileExplorerOpen: (open) => set({ fileExplorerOpen: open })
}))
const searchMenuOpen = create<{ searchMenuOpen: boolean; setSearchMenuOpen: (open: boolean) => void }>((set) => ({
    searchMenuOpen: true,
    setSearchMenuOpen: (open) => set({ searchMenuOpen: open })
}))
const folderPath = create<{ folderPath: string; setFolderPath: (path: string) => void }>((set) => ({
    folderPath: '',
    setFolderPath: (path) => set({ folderPath: path })
}))

const setFiles = create<{ files: FileEntry[]; setFiles: (files: FileEntry[]) => void }>((set) => ({
    files: [],
    setFiles: (files) => set({ files })
}))
const folderName = create<{ folderName: string; setFolderName: (name: string) => void }>((set) => ({
    folderName: '',
    setFolderName: (name) => set({ folderName: name })
}))
const gitMenuOpen = create<{ gitMenuOpen: boolean; setGitMenuOpen: (open: boolean) => void }>((set) => ({
    gitMenuOpen: false,
    setGitMenuOpen: (open) => set({ gitMenuOpen: open })
}))
const taskListOpen = create<{ taskListOpen: boolean; setTaskListOpen: (open: boolean) => void }>((set) => ({
    taskListOpen: false,
    setTaskListOpen: (open) => set({ taskListOpen: open })
}))

const openTabs = create<{ openTabs: Tab[]; setOpenTabs: (tabs: Tab[]) => void }>((set) => ({
    openTabs: [],
    setOpenTabs: (tabs) => set({ openTabs: tabs })
}))

const activeTabPath = create<{ activeTabPath: string; setActiveTabPath: (path: string) => void }>((set) => ({
    activeTabPath: '',
    setActiveTabPath: (path) => set({ activeTabPath: path })
}))
const terminalOpen = create<{ terminalOpen: boolean; setTerminalOpen: (open: boolean) => void }>((set) => ({
    terminalOpen: false,
    setTerminalOpen: (open) => set({ terminalOpen: open })
}))
const terminalHeight = create<{ terminalHeight: number; setTerminalHeight: (height: number) => void }>((set) => ({
    terminalHeight: 200,
    setTerminalHeight: (height) => set({ terminalHeight: height })
}))

const isResizing = create<{ isResizing: boolean; setIsResizing: (resizing: boolean) => void }>((set) => ({
    isResizing: false,
    setIsResizing: (resizing) => set({ isResizing: resizing })
}))
const isIndexing = create<{ isIndexing: boolean; setIsIndexing: (indexing: boolean) => void }>((set) => ({
    isIndexing: false,
    setIsIndexing: (indexing) => set({ isIndexing: indexing })
}))
const indexLog = create<{ indexLog: string; setIndexLog: (log: string) => void }>((set) => ({
    indexLog: '',
    setIndexLog: (log) => set({ indexLog: log })
}))
const langPackOpen = create<{ langPackOpen: boolean; setLangPackOpen: (open: boolean) => void }>((set) => ({
    langPackOpen: false,
    setLangPackOpen: (open) => set({ langPackOpen: open })
}))
const packs = create<{ packs: Pack[]; setPacks: (packs: Pack[]) => void }>((set) => ({
    packs: [],
    setPacks: (packs) => set({ packs })
}))
const minimized = create<{ minimized: boolean; setMinimized: (minimized: boolean) => void }>((set) => ({
    minimized: false,
    setMinimized: (minimized) => set({ minimized })
}))
const terminalTabs = create<{ terminalTabs: TerminalTab[]; setTerminalTabs: (tabs: TerminalTab[]) => void }>((set) => ({
    terminalTabs: [],
    setTerminalTabs: (tabs) => set({ terminalTabs: tabs })
}))
const activeTerminalTabId = create<{ activeTerminalTabId: string; setActiveTerminalTab: (tab: string) => void }>((set) => ({
    activeTerminalTabId: '',
    setActiveTerminalTab: (tab) => set({ activeTerminalTabId: tab })
}))

const activeBottomSection = create<{ activeBottomSection: string; setActiveBottomSection: (section: string) => void }>((set) => ({
    activeBottomSection: 'terminal',
    setActiveBottomSection: (section) => set({ activeBottomSection: section })
}))

const problems = create<{ problems: string[]; setProblems: (problems: string[]) => void }>((set) => ({
    problems: [],
    setProblems: (problems) => set({ problems })
}))

const actionMenu = create <{ actionMenuOpen: boolean; setActionMenuOpen: (open: boolean) => void }>((set) => ({
    actionMenuOpen: false,
    setActionMenuOpen: (open) => set({ actionMenuOpen: open })
}))
const files = create<{ files: FileEntry[]; setFiles: (files: FileEntry[]) => void }>((set) => ({
    files: [],
    setFiles: (files) => set({ files })
}))
const timeTracked = create<{ timeTracked: number; setTimeTracked: (time: number) => void }>((set) => ({
    timeTracked: 0,
    setTimeTracked: (time) => set({ timeTracked: time })
}))

const filePosition = create<{ cursorLine: number; cursorCol: number; setCursorPosition: (line: number, col: number) => void }>((set) => ({
    cursorLine: 0,
    cursorCol: 0,
    setCursorPosition: (line: number, col: number) => set({ cursorLine: line, cursorCol: col })
}))

const unsavedFiles = create<{ unsavedFiles: string[]; setUnsavedFiles: (files: string[]) => void }>((set) => ({
    unsavedFiles: [],
    setUnsavedFiles: (files) => set({ unsavedFiles: files }),
    removeSavedFile: (filePath: string) => set(state => ({ unsavedFiles: state.unsavedFiles.filter(p => p !== filePath) }))
}))
const video = create<{ video: boolean; setVideo: (video: boolean) => void }>((set) => ({
    video: true,
    setVideo: (video) => set({ video })
}))
export const useStore =  {
    fileMenuOpen,
    fileExplorerOpen,
    searchMenuOpen,
    folderPath,
    setFiles,
    folderName,
    gitMenuOpen,
    taskListOpen,
    openTabs,
    activeTabPath,
    terminalOpen,
    terminalHeight,
    isResizing,
    isIndexing,
    indexLog,
    langPackOpen,
    packs,
    minimized,
    terminalTabs,
    activeTerminalTabId,
    activeBottomSection,
    problems,
    actionMenu,
    files,
    timeTracked,
    filePosition,
    unsavedFiles,
    video
}