import { Files, Search, GitGraph, List, Package, ChevronDown, ChevronRight, Folder, FolderOpen, File } from 'lucide-react'
import { useCallback } from 'react'
import TaskList from '../TaskList'
import LangPackCard from './LangPackCard'
import { useStore, FileEntry } from '../../lib/zustand'

const updateEntry = (entries: FileEntry[], targetPath: string, updater: (e: FileEntry) => FileEntry): FileEntry[] => {
  return entries.map(entry => {
    if (entry.path === targetPath) return updater(entry)
    if (entry.children) return { ...entry, children: updateEntry(entry.children, targetPath, updater) }
    return entry
  })
}

const sortEntries = (entries: FileEntry[]) => {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

function FileTreeItem({ entry, depth = 0, onToggle, onOpenFile }: {
  entry: FileEntry
  depth?: number
  onToggle: (entry: FileEntry) => void
  onOpenFile: (entry: FileEntry) => void
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 hover:bg-[#3D3020] cursor-pointer text-[#9A8A78] hover:text-[#E8C088] text-[11px] rounded transition-colors"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => entry.isDirectory ? onToggle(entry) : onOpenFile(entry)}
      >
        {entry.isDirectory
          ? entry.isOpen
            ? <ChevronDown size={10} className="flex-shrink-0" />
            : <ChevronRight size={10} className="flex-shrink-0" />
          : <span className="w-[10px] flex-shrink-0" />
        }
        {entry.isDirectory
          ? entry.isOpen
            ? <FolderOpen size={12} className="flex-shrink-0 text-[#E8C088]" />
            : <Folder size={12} className="flex-shrink-0" />
          : <File size={12} className="flex-shrink-0" />
        }
        <span className="truncate">{entry.name}</span>
      </div>
      {entry.isOpen && entry.children && sortEntries(entry.children).map(child => (
        <FileTreeItem key={child.path} entry={child} depth={depth + 1} onToggle={onToggle} onOpenFile={onOpenFile} />
      ))}
    </div>
  )
}
const LeftSidebar = () => {
    const fileExplorerOpen = useStore.fileExplorerOpen((state) => state.fileExplorerOpen)
    const searchMenuOpen = useStore.searchMenuOpen((state) => state.searchMenuOpen)
    const gitMenuOpen = useStore.gitMenuOpen((state) => state.gitMenuOpen)
    const taskListOpen = useStore.taskListOpen((state) => state.taskListOpen)
    const langPackOpen = useStore.langPackOpen((state) => state.langPackOpen)
    const folderName = useStore.folderName((state) => state.folderName)
    const folderPath = useStore.folderPath((state) => state.folderPath)
    const files = useStore.setFiles((state) => state.files)
    const packs = useStore.packs((state) => state.packs)

    const handleToggleFolder = async (entry: FileEntry) => {
      if (entry.isOpen) {
        useStore.setFiles.getState().setFiles(
          updateEntry(files, entry.path, (e) => ({ ...e, isOpen: false, children: [] }))
        )
      } else {
        const children = await window.ipcRenderer.readDir(entry.path)
        useStore.setFiles.getState().setFiles(
          updateEntry(files, entry.path, (e) => ({ ...e, isOpen: true, children: sortEntries(children) }))
        )
      }
    }

    const handleOpenFile = async (entry: FileEntry) => {
      const currentTabs = useStore.openTabs.getState().openTabs
      if (!currentTabs.find(t => t.path === entry.path)) {
        const content = await window.ipcRenderer.readFile(entry.path)
        useStore.openTabs.getState().setOpenTabs([...currentTabs, { path: entry.path, name: entry.name, content }])
      }
      useStore.activeTabPath.getState().setActiveTabPath(entry.path)
    }

      const togglePanel = useCallback(({ panel }: { panel: 'file-explorer' | 'search' | 'git' | 'task-list' | 'langPackPanel' }) => {
        const fe = useStore.fileExplorerOpen.getState()
        const sm = useStore.searchMenuOpen.getState()
        const gm = useStore.gitMenuOpen.getState()
        const tl = useStore.taskListOpen.getState()
        const lp = useStore.langPackOpen.getState()
    
        if (panel === 'file-explorer') {
          fe.setFileExplorerOpen(!fe.fileExplorerOpen)
          sm.setSearchMenuOpen(false)
          gm.setGitMenuOpen(false)
          tl.setTaskListOpen(false)
          lp.setLangPackOpen(false)
        } else if (panel === 'search') {
          sm.setSearchMenuOpen(!sm.searchMenuOpen)
          fe.setFileExplorerOpen(false)
          gm.setGitMenuOpen(false)
          tl.setTaskListOpen(false)
          lp.setLangPackOpen(false)
        } else if (panel === 'git') {
          gm.setGitMenuOpen(!gm.gitMenuOpen)
          fe.setFileExplorerOpen(false)
          sm.setSearchMenuOpen(false)
          tl.setTaskListOpen(false)
          lp.setLangPackOpen(false)
        } else if (panel === 'task-list') {
          tl.setTaskListOpen(!tl.taskListOpen)
          fe.setFileExplorerOpen(false)
          sm.setSearchMenuOpen(false)
          gm.setGitMenuOpen(false)
          lp.setLangPackOpen(false)
        } else if (panel === 'langPackPanel') {
          lp.setLangPackOpen(!lp.langPackOpen)
          fe.setFileExplorerOpen(false)
          sm.setSearchMenuOpen(false)
          gm.setGitMenuOpen(false)
          tl.setTaskListOpen(false)
        }
      }, [])


  return (
    <div className="flex flex-row shrink-0 overflow-hidden">
        <div className="flex flex-col px-2 py-4 gap-6 bg-[#1E1710] border-r-2 border-r-[#3D3020] w-12 flex-shrink-0">
        <button onClick={togglePanel.bind(null, { panel: 'file-explorer' })}>
                <Files size={22} className={`hover:text-[#E8C088] cursor-pointer transition-colors ${fileExplorerOpen ? 'text-[#E8C088]' : 'text-[#3D3020]'}`} />
              </button>
              <button onClick={togglePanel.bind(null, { panel: 'search' })}>
                <Search size={22} className={`hover:text-[#E8C088] cursor-pointer transition-colors ${searchMenuOpen ? 'text-[#E8C088]' : 'text-[#3D3020]'}`} />
              </button>
              <button onClick={togglePanel.bind(null, { panel: 'git' })}>
                <GitGraph size={22} className={`hover:text-[#E8C088] cursor-pointer transition-colors ${gitMenuOpen ? 'text-[#E8C088]' : 'text-[#3D3020]'}`} />
              </button>
              <button onClick={togglePanel.bind(null, { panel: 'task-list' })}>
                <List size={22} className={`hover:text-[#E8C088] cursor-pointer transition-colors ${taskListOpen ? 'text-[#E8C088]' : 'text-[#3D3020]'}`} />
              </button>
              <button onClick={togglePanel.bind(null, { panel: 'langPackPanel' })}>
                <Package size={22} className={`hover:text-[#E8C088] cursor-pointer transition-colors ${langPackOpen ? 'text-[#E8C088]' : 'text-[#3D3020]'}`} />
              </button>
            </div>
    
            {/* File tree */}
            <div className="flex flex-col bg-[#16110D] w-52 border-r-2 border-r-[#3D3020] flex-shrink-0" hidden={!fileExplorerOpen}>
              <div className="px-3 py-2.5 border-b border-b-[#3D3020] flex-shrink-0">
                <h1 className="text-[#363636] text-[11px] uppercase tracking-widest">{folderName ? folderName : 'No folder Opened'}</h1>
              </div>
              {/* scrollable file list */}
              <div className="flex flex-col py-2 gap-0.5 overflow-y-auto flex-1">
                {files.map((file) => (
                  <FileTreeItem
                    key={file.path}
                    entry={file}
                    onToggle={handleToggleFolder}
                    onOpenFile={handleOpenFile}
                  />
                ))}
              </div>
            </div>
    
            {/* Search Menu */}
            <div className="flex flex-col bg-[#16110D] w-52 border-r-2 border-r-[#3D3020] flex-shrink-0" hidden={!searchMenuOpen}>
              <div className="px-3 py-2.5 border-b border-b-[#3D3020] flex items-center justify-between">
                <h1 className="text-[#363636] text-[11px] uppercase tracking-widest">Search</h1>
              </div>
              <div className="flex flex-col items-center pt-4 gap-3">
                <input type="text" placeholder="Search..." className="bg-[#3D3020] text-[#ffffff] max-w-9/10 w-full py-1.5 text-[8px] px-2 rounded-sm focus:outline-none" />
                <input type="text" placeholder="Replace..." className="bg-[#3D3020] text-[#ffffff] max-w-9/10 w-full py-1.5 text-[8px] px-2 rounded-sm focus:outline-none" />
              </div>
            </div>
    
            {/* Git Menu */}
            <div className="flex flex-col bg-[#16110D] w-52 border-r-2 border-r-[#3D3020] flex-shrink-0" hidden={!gitMenuOpen}>
              <div className="px-3 py-2.5 border-b border-b-[#3D3020] flex items-center justify-between">
                <h1 className="text-[#363636] text-[11px] uppercase tracking-widest">Source Control</h1>
              </div>
            </div>
            {/* Task Menu */}
            <div className="flex flex-col bg-[#16110D] w-52 border-r-2 border-r-[#3D3020] flex-shrink-0" hidden={!taskListOpen}>
              <div className="px-3 py-2.5 border-b border-b-[#3D3020] flex items-center justify-between">
                <h1 className="text-[#363636] text-[11px] uppercase tracking-widest">Task List  </h1>
              </div>
              {/* Task list content */}
              {folderName ? <TaskList workspaceRoot={folderPath} /> : 'No folder Opened.Please open a folder to load tasks.'}
            </div>
            {/* Language Pack Menu */}
            <div className="flex flex-col bg-[#16110D] w-52 border-r-2 border-r-[#3D3020] flex-shrink-0" hidden={!langPackOpen}>
              <div className="px-3 py-2.5 border-b border-b-[#3D3020] flex items-center justify-between">
                <h1 className="text-[#363636] text-[11px] uppercase tracking-widest">Language Packs</h1>
              </div>
              <div className="flex flex-col gap-2">
                {folderPath ? (
                  <p className="text-[10px] text-[#9A8A78] px-2 py-1">Install language packs to enhance your coding experience.</p>
                ) : (
                  <p className="text-[10px] text-[#9A8A78] px-2 py-1">Please open a folder to view available language packs.</p>
                )}
                <div className="px-2 py-2">
                  {folderPath ?(packs.map((pack) => (
                    <LangPackCard 
                      key={pack.id} 
                      title={pack.name}          
                      desc={pack.description ?? ''}    
                      id={pack.id} 
                      workspacePath={folderPath || ''}
                    />
                  ))): ''}
                  
                </div>
                
              </div>
            </div>
            </div>
  )
}

export default LeftSidebar