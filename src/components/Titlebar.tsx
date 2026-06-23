import React, { useCallback } from 'react'
import { useStore, FileEntry } from '.././../lib/zustand'
import { ChevronDown, Maximize, Minimize, Minus, ScanSearch, X } from 'lucide-react'

const Titlebar = () => {
  const fileMenuOpen = useStore.fileMenuOpen((state) => state.fileMenuOpen)
  const setFileMenuOpen = useStore.fileMenuOpen((state) => state.setFileMenuOpen)

  const folderPath = useStore.folderPath((state) => state.folderPath)
  const indexing = useStore.isIndexing((state) => state.isIndexing)
  const indexLog = useStore.indexLog((state) => state.indexLog)
  const minimized = useStore.minimized((state) => state.minimized)
  const setMinimized = useStore.minimized((state) => state.setMinimized)
  const indexProject = async () => {
    if (!folderPath) return
    useStore.isIndexing.getState().setIsIndexing(true)

    window.ipcRenderer.onIndexUpdate((msg: string) => {
      useStore.indexLog.getState().setIndexLog(msg)
    })

    await window.ipcRenderer.indexProject(folderPath)
    useStore.isIndexing.getState().setIsIndexing(false)
    useStore.indexLog.getState().setIndexLog('')
  }
  const handleMinimize = () => {
    window.ipcRenderer.windowMaximize()
    setMinimized(!minimized)
  }
  const closeWindow = () => {
    window.ipcRenderer.windowClose()
  }
  const hideWindow = () => {
    window.ipcRenderer.windowHide()
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
    const sortEntries = (entries: FileEntry[]) => {
    return [...entries].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }
  const handleOpenFolder = async () => {
    const folder = await (window as any).ipcRenderer.openFolder()
    if (!folder) return
    useStore.folderPath.getState().setFolderPath(folder)
    const entries = await (window as any).ipcRenderer.readDir(folder)
    useStore.setFiles.getState().setFiles(sortEntries(entries))
    useStore.folderName.getState().setFolderName(folder.split(/[\\/]/).filter(Boolean).pop() || folder)
    togglePanel({ panel: 'file-explorer' })
  }

  return (
    <div className="flex flex-row items-center bg-[#1E1710] border-b-2 border-b-[#3D3020] h-10 px-4 gap-4 flex-shrink-0 relative z-50 justify-between" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        {/* Left Side */}
        <div className="flex flex-row gap-4 items-center">
        <h1 className="text-[12px] text-[#C8B898] mr-2">Surfer</h1>

        {/* File Menu */}
        <div className="relative">
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className="flex items-center gap-1 text-[11px] text-[#9A8A78] hover:text-[#E8C088] px-2 py-1 rounded hover:bg-[#3D3020] transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            File <ChevronDown size={10} />
          </button>
          {fileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#1E1710] border border-[#3D3020] rounded shadow-xl z-50 w-48 py-1">
              <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]" onClick={handleOpenFolder}>
                Open Folder
              </button>
              <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]">
                New File
              </button>
              <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]">
                Save
              </button>
              <div className="border-t border-[#3D3020] my-1" />
              <button className="w-full text-left px-3 py-1.5 text-[11px] text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]">
                Quit
              </button>
            </div>
          )}
        </div>

        <button className="text-[11px] text-[#9A8A78] hover:text-[#E8C088] px-2 py-1 rounded hover:bg-[#3D3020] transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          Edit
        </button>
        <button className="text-[11px] text-[#9A8A78] hover:text-[#E8C088] px-2 py-1 rounded hover:bg-[#3D3020] transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          View
        </button>
        </div>
        {/* Right */}
        <div className="flex flex-row gap-2 items-center">
          <button 
          onClick={indexProject} 
          disabled={indexing || !folderPath}
          title="Index Project"
          className="text-[#9A8A78] cursor-pointer hover:text-[#E8C088] disabled:opacity-40 transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <ScanSearch size={20} />
        </button>
        <button className="text-[#9A8A78] cursor-pointer hover:text-[#E8C088] opacity-40 transition-colors" onClick={hideWindow} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Minus size={20}  />
        </button>
        <button className="text-[#9A8A78] cursor-pointer hover:text-[#E8C088] opacity-40 transition-colors" onClick={handleMinimize} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {minimized ? <Maximize size={20} /> : <Minimize size={20} />}
        </button>
        <button className="text-[#9A8A78] cursor-pointer hover:text-[#E8C088] opacity-40 transition-colors" onClick={closeWindow} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <X size={20} />
        </button>
        
        
        </div>
        

        {indexing && (
          <p className="absolute left-1/2 -translate-x-1/2 text-[9px] text-[#E8C088] px-3 animate-pulse pointer-events-none">{indexLog}</p>
        )}

      </div>
  )
}

export default Titlebar