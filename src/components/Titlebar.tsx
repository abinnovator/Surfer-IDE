import React, { useCallback, useEffect, useState } from 'react'
import { useStore, FileEntry } from '.././../lib/zustand'
import { ChevronDown, Maximize, Minimize, Minus, ScanSearch, Settings, X, Play } from 'lucide-react'
import toast from "react-hot-toast"

const Titlebar = () => {
  const fileMenuOpen = useStore.fileMenuOpen((state) => state.fileMenuOpen)
  const setFileMenuOpen = useStore.fileMenuOpen((state) => state.setFileMenuOpen)
  const [recentFolders, setRecentFolders] = useState<string[]>([])

  const folderPath = useStore.folderPath((state) => state.folderPath)
  const indexing = useStore.isIndexing((state) => state.isIndexing)
  const indexLog = useStore.indexLog((state) => state.indexLog)
  const minimized = useStore.minimized((state) => state.minimized)
  const setMinimized = useStore.minimized((state) => state.setMinimized)

  const theme = useStore.theme((state) => state.theme)
  const tb = theme?.colors?.titlebar

  const titleColor       = tb?.titleTextColor || tb?.['title-text-color'] || '#C8B898'
  const btnColor         = tb?.rightButtonsColor || '#9A8A78'
  const btnHoverColor    = tb?.rightButtonsHoverColor || '#E8C088'
  const menuBg           = tb?.fileMenuBackground || '#1E1710'
  const menuBorder       = tb?.fileMenuBorder || '#3D3020'
  const menuItemText     = tb?.fileMenuItemTextColor || '#9A8A78'
  const menuHoverBg      = tb?.fileMenuItemHoverBackground || '#3D3020'
  const menuHoverText    = tb?.fileMenuItemHoverTextColor || '#E8C088'

  const indexProject = async () => {
    if (!folderPath) return
    useStore.isIndexing.getState().setIsIndexing(true)
    toast.success("Indexing project...", { style: { borderRadius: '10px', background: tb?.background || '#1E1710', color: titleColor } })
    window.ipcRenderer.onIndexUpdate((msg: string) => {
      useStore.indexLog.getState().setIndexLog(msg)
    })
    await window.ipcRenderer.indexProject(folderPath)
    useStore.isIndexing.getState().setIsIndexing(false)
    toast.success("Indexing completed!", { style: { borderRadius: '10px', background: tb?.background || '#1E1710', color: titleColor } })
    useStore.indexLog.getState().setIndexLog('')
  }

  const handleMinimize = () => {
    window.ipcRenderer.windowMaximize()
    setMinimized(!minimized)
  }
  const closeWindow = () => { window.ipcRenderer.windowClose() }
  const hideWindow  = () => { window.ipcRenderer.windowHide() }

  const togglePanel = useCallback(({ panel }: { panel: 'file-explorer' | 'search' | 'git' | 'task-list' | 'langPackPanel' }) => {
    const fe = useStore.fileExplorerOpen.getState()
    const sm = useStore.searchMenuOpen.getState()
    const gm = useStore.gitMenuOpen.getState()
    const tl = useStore.taskListOpen.getState()
    const lp = useStore.langPackOpen.getState()

    if (panel === 'file-explorer') {
      fe.setFileExplorerOpen(!fe.fileExplorerOpen); sm.setSearchMenuOpen(false); gm.setGitMenuOpen(false); tl.setTaskListOpen(false); lp.setLangPackOpen(false)
    } else if (panel === 'search') {
      sm.setSearchMenuOpen(!sm.searchMenuOpen); fe.setFileExplorerOpen(false); gm.setGitMenuOpen(false); tl.setTaskListOpen(false); lp.setLangPackOpen(false)
    } else if (panel === 'git') {
      gm.setGitMenuOpen(!gm.gitMenuOpen); fe.setFileExplorerOpen(false); sm.setSearchMenuOpen(false); tl.setTaskListOpen(false); lp.setLangPackOpen(false)
    } else if (panel === 'task-list') {
      tl.setTaskListOpen(!tl.taskListOpen); fe.setFileExplorerOpen(false); sm.setSearchMenuOpen(false); gm.setGitMenuOpen(false); lp.setLangPackOpen(false)
    } else if (panel === 'langPackPanel') {
      lp.setLangPackOpen(!lp.langPackOpen); fe.setFileExplorerOpen(false); sm.setSearchMenuOpen(false); gm.setGitMenuOpen(false); tl.setTaskListOpen(false)
    }
  }, [])

  const sortEntries = (entries: FileEntry[]) => {
    return [...entries].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }

  const loadFolder = async (folder: string) => {
    useStore.folderPath.getState().setFolderPath(folder)
    const entries = await window.ipcRenderer.readDir(folder)
    useStore.setFiles.getState().setFiles(sortEntries(entries))
    useStore.folderName.getState().setFolderName(folder.split(/[\\/]/).filter(Boolean).pop() || folder)
    togglePanel({ panel: 'file-explorer' })
    const allFiles = await window.ipcRenderer.readAllFiles(folder)
    useStore.files.getState().setFiles(allFiles)
    await window.ipcRenderer.addRecentFolder(folder)
    setRecentFolders(await window.ipcRenderer.getRecentFolders())
    setFileMenuOpen(false)
  }

  const handleOpenFolder = async () => {
    const folder = await window.ipcRenderer.openFolder()
    if (!folder) return
    await loadFolder(folder)
  }

  const runProject = async () => {
    if (!folderPath) return
    const index = await window.ipcRenderer.getIndex(folderPath)
    const startCommand = index?.startCommand
    if (!startCommand) {
      toast.error("No run command found in index.json", { style: { backgroundColor: tb?.background || '#1E1710', color: menuItemText } })
      return
    }
    const tabs = useStore.terminalTabs.getState().terminalTabs
    if (tabs.length === 0) {
      useStore.terminalTabs.getState().setTerminalTabs([{ id: '1', label: 'Terminal 1' }])
      useStore.activeTerminalTabId.getState().setActiveTerminalTab('1')
    }
    useStore.terminalOpen.getState().setTerminalOpen(true)
    useStore.activeBottomSection.getState().setActiveBottomSection('terminal')
    await window.ipcRenderer.terminal.run(folderPath, startCommand)
  }

  useEffect(() => {
    if (fileMenuOpen) {
      window.ipcRenderer.getRecentFolders().then(setRecentFolders)
    }
  }, [fileMenuOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') handleMinimize()
      if (e.ctrlKey && e.key === 'w') closeWindow()
      if (e.ctrlKey && e.key === 'h') hideWindow()
      if (e.ctrlKey && e.key === 'o') handleOpenFolder()
      if (e.shiftKey && e.key === 'n') createNewWindow()
      if (e.ctrlKey && e.key === 'r') runProject()
      if (e.ctrlKey && e.key === 'i') indexProject()
      if (e.ctrlKey && e.key === 'd') window.ipcRenderer.openDevTools()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const createNewWindow = async () => {
    await window.ipcRenderer.createWindow()
  }

  // CSS variables let Tailwind hover:text-[var(--x)] classes work with dynamic theme colors
  const cssVars = {
    '--tb-btn':        btnColor,
    '--tb-btn-hover':  btnHoverColor,
    '--tb-hover-bg':   menuHoverBg,
  } as React.CSSProperties

  const btnClass      = "text-[var(--tb-btn)] hover:text-[var(--tb-btn-hover)] transition-colors cursor-pointer"
  const menuItemClass = "w-full text-left px-3 py-1.5 text-[11px] transition-colors cursor-pointer"

  return (
    <div
      className="flex flex-row items-center border-b-2 h-10 px-4 gap-4 flex-shrink-0 relative z-50 justify-between"
      style={{
        ...cssVars,
        background: tb?.background || '#1E1710',
        borderBottomColor: tb?.border || '#3d3020',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left side */}
      <div className="flex flex-row gap-4 items-center">
        <h1 className="text-[12px] mr-2" style={{ color: titleColor }}>Surfer</h1>

        {/* File menu */}
        <div className="relative">
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${btnClass}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            File <ChevronDown size={10} />
          </button>

          {fileMenuOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded shadow-xl z-50 w-56 py-1 border"
              style={{ background: menuBg, borderColor: menuBorder }}
            >
              <button
                className={menuItemClass}
                style={{ color: menuItemText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
                onClick={handleOpenFolder}
                title="ctrl+o"
              >
                Open Folder
              </button>

              {recentFolders.length > 0 && (
                <>
                  <div className="my-1" style={{ borderTop: `1px solid ${menuBorder}` }} />
                  <p className="px-3 py-0.5 text-[9px] uppercase tracking-widest" style={{ color: menuItemText, opacity: 0.5 }}>Recent</p>
                  {recentFolders.map(p => (
                    <button
                      key={p}
                      className={`${menuItemClass} truncate`}
                      style={{ color: menuItemText }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
                      title={p}
                      onClick={() => loadFolder(p)}
                    >
                      {p.split(/[\\/]/).filter(Boolean).pop()}
                      <span className="block text-[9px] truncate" style={{ color: menuItemText, opacity: 0.5 }}>{p}</span>
                    </button>
                  ))}
                </>
              )}

              <div className="my-1" style={{ borderTop: `1px solid ${menuBorder}` }} />
              <button
                className={menuItemClass}
                style={{ color: menuItemText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
              >
                New File
              </button>
              <button
                className={menuItemClass}
                style={{ color: menuItemText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
              >
                Save
              </button>
              <button
                className={menuItemClass}
                style={{ color: menuItemText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
                onClick={createNewWindow}
                title="shift+n"
              >
                Create new window
              </button>
              <div className="my-1" style={{ borderTop: `1px solid ${menuBorder}` }} />
              <button
                className={menuItemClass}
                style={{ color: menuItemText }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = menuHoverBg; (e.currentTarget as HTMLElement).style.color = menuHoverText }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = menuItemText }}
              >
                Quit
              </button>
            </div>
          )}
        </div>

        <button
          className={`text-[11px] px-2 py-1 rounded ${btnClass}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          Edit
        </button>
        <button
          className={`text-[11px] px-2 py-1 rounded ${btnClass}`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          View
        </button>
      </div>

      {/* Right side */}
      <div className="flex flex-row gap-2 items-center">
        <button
          onClick={runProject}
          disabled={!folderPath}
          title="Run project"
          className={`${btnClass} disabled:opacity-40`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Play size={20} />
        </button>
        <button
          onClick={() => window.ipcRenderer.openSettings()}
          title="Settings"
          className={btnClass}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Settings size={20} />
        </button>
        <button
          onClick={indexProject}
          disabled={indexing || !folderPath}
          title="Index Project"
          className={`${btnClass} disabled:opacity-40`}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <ScanSearch size={20} />
        </button>
        <button
          onClick={hideWindow}
          className={btnClass}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Minus size={20} />
        </button>
        <button
          onClick={handleMinimize}
          className={btnClass}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {minimized ? <Maximize size={20} /> : <Minimize size={20} />}
        </button>
        <button
          onClick={closeWindow}
          className={btnClass}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={20} />
        </button>
      </div>

      {indexing && (
        <p className="absolute left-1/2 -translate-x-1/2 text-[9px] px-3 animate-pulse pointer-events-none" style={{ color: titleColor }}>
          {indexLog}
        </p>
      )}
    </div>
  )
}

export default Titlebar
