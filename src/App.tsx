import { useEffect, useRef, useCallback, useState } from 'react'
import './App.css'
import { X, Plus } from 'lucide-react'
import Editor from './components/Editor'
import Terminal from './components/Terminal'
import SidebarComponent from './components/SidebarComponent'
import React from 'react'
import Titlebar from './components/Titlebar'
import LeftSidebar from './components/LeftSidebar'
import { useStore, TerminalTab } from '../lib/zustand'
import ActionsMenu from './components/QuickFileMenu'
import Statusbar from './components/Statusbar'

function App() {
  const openTabs = useStore.openTabs((state) => state.openTabs)
  const activeTabPath = useStore.activeTabPath((state) => state.activeTabPath)
  const terminalOpen = useStore.terminalOpen((state) => state.terminalOpen)
  const terminalHeight = useStore.terminalHeight((state) => state.terminalHeight)
  const terminalTabs = useStore.terminalTabs((state) => state.terminalTabs)
  const activeTerminalTabId = useStore.activeTerminalTabId((state) => state.activeTerminalTabId)
  const activeBottomSection = useStore.activeBottomSection((state) => state.activeBottomSection)
  const problems = useStore.problems((state) => state.problems)
  const folderPath = useStore.folderPath((state) => state.folderPath)
  const fileMenuOpen = useStore.fileMenuOpen((state) => state.fileMenuOpen)
  const files = useStore.setFiles((state) => state.files)
  const unsavedFiles = useStore.unsavedFiles((state) => state.unsavedFiles)

  const isResizing = useRef(false)
  const terminalCounter = useRef(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoPlaying = useStore.video((state) => state.video)
  const [videoPath, setVideoPath] = useState<string>('/Chillhop_White_Oak.mp4')
  const themeObject = useStore.theme((state) => state.theme)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (videoPlaying) v.play().catch(() => {})
    else v.pause()
  }, [videoPlaying, videoPath])

  const activeTab = openTabs.find(t => t.path === activeTabPath) ?? null

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startY = e.clientY
    const startHeight = terminalHeight
    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startY - ev.clientY
      useStore.terminalHeight.getState().setTerminalHeight(Math.max(80, Math.min(600, startHeight + delta)))
    }
    const onMouseUp = () => {
      isResizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

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

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = useStore.openTabs.getState().openTabs
    const remaining = current.filter(t => t.path !== path)
    useStore.openTabs.getState().setOpenTabs(remaining)
    if (activeTabPath === path) {
      useStore.activeTabPath.getState().setActiveTabPath(
        remaining.length > 0 ? remaining[remaining.length - 1].path : ''
      )
    }
    const currentUnsaved = useStore.unsavedFiles.getState().unsavedFiles
    useStore.unsavedFiles.getState().setUnsavedFiles(currentUnsaved.filter(p => p !== path))
  }

  useEffect(() => {
    window.ipcRenderer.getLangPacks().then(packs => {
      useStore.packs.getState().setPacks(packs)
    })
  }, [])

  const addTerminal = useCallback(() => {
    const id = String(terminalCounter.current++)
    const tab: TerminalTab = { id, label: `Terminal ${id}` }
    const current = useStore.terminalTabs.getState().terminalTabs
    useStore.terminalTabs.getState().setTerminalTabs([...current, tab])
    useStore.activeTerminalTabId.getState().setActiveTerminalTab(id)
    useStore.terminalOpen.getState().setTerminalOpen(true)
  }, [])

  const closeTerminalTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const current = useStore.terminalTabs.getState().terminalTabs
    const remaining = current.filter(t => t.id !== id)
    useStore.terminalTabs.getState().setTerminalTabs(remaining)
    if (activeTerminalTabId === id) {
      const next = remaining.length > 0 ? remaining[remaining.length - 1].id : ''
      useStore.activeTerminalTabId.getState().setActiveTerminalTab(next)
      if (remaining.length === 0) useStore.terminalOpen.getState().setTerminalOpen(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        const tOpen = useStore.terminalOpen.getState().terminalOpen
        const tTabs = useStore.terminalTabs.getState().terminalTabs
        if (!tOpen) {
          if (tTabs.length === 0) addTerminal()
          else useStore.terminalOpen.getState().setTerminalOpen(true)
        } else {
          useStore.terminalOpen.getState().setTerminalOpen(false)
        }
      } else if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        const fe = useStore.fileExplorerOpen.getState().fileExplorerOpen
        const gm = useStore.gitMenuOpen.getState().gitMenuOpen
        const sm = useStore.searchMenuOpen.getState().searchMenuOpen
        const tl = useStore.taskListOpen.getState().taskListOpen
        const lp = useStore.langPackOpen.getState().langPackOpen
        if (fe) togglePanel({ panel: 'file-explorer' })
        else if (gm) togglePanel({ panel: 'git' })
        else if (sm) togglePanel({ panel: 'search' })
        else if (tl) togglePanel({ panel: 'task-list' })
        else if (lp) togglePanel({ panel: 'langPackPanel' })
      else {
      togglePanel({ panel: 'file-explorer' })
      } 
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addTerminal, togglePanel])

  const saveFile = async (path: string, content: string): Promise<void> => {
    const formatted = await window.ipcRenderer.writeFile(path, content)

    const currentTabs = useStore.openTabs.getState().openTabs
    useStore.openTabs.getState().setOpenTabs(
      currentTabs.map(t => t.path === path ? { ...t, content: formatted } : t)
    )

    const currentUnsaved = useStore.unsavedFiles.getState().unsavedFiles
    useStore.unsavedFiles.getState().setUnsavedFiles(currentUnsaved.filter(p => p !== path))
  }

  useEffect(() => {
    const handler = (_: unknown, { filePath, output }: { filePath: string; output: string }) => {
      const lines = output.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      const activeTabPathNow = useStore.activeTabPath.getState().activeTabPath
      if (filePath === activeTabPathNow) {
        useStore.problems.getState().setProblems(lines)
        if (lines.length > 0) {
          useStore.terminalOpen.getState().setTerminalOpen(true)
          useStore.activeBottomSection.getState().setActiveBottomSection('problems')
        }
      }
    }
    window.ipcRenderer.on('diagnostics:result', handler)
    return () => { window.ipcRenderer.off('diagnostics:result', handler) }
  }, [])
  const quotes = ["You're Editor should understand what you're building.", "Your editor should adapt to you. Not the other way around.", "Your editor should understand what you're building,not just what you're typing."]
  const quote = quotes[Math.floor(Math.random() * quotes.length)]

  useEffect(() => {
    async function loadVideo() {
      const activeThemeId = await window.ipcRenderer.getActiveTheme()
      if (!activeThemeId) return
      console.log('Active theme ID:', activeThemeId)
      const theme = await window.ipcRenderer.getSpecificTheme(activeThemeId)
      console.log('Loaded theme Video:', theme?.video)
      if (theme?.video) setVideoPath(theme.video as string)
        console.log('Video path set to:', videoPath)
    }
    loadVideo()
  }, [])
  useEffect(() => {
    async function loadStyles() {
      const activeThemeId = await window.ipcRenderer.getActiveTheme()
      if (!activeThemeId) return
      const theme = await window.ipcRenderer.getSpecificTheme(activeThemeId)
      useStore.theme.getState().setTheme(theme)
    }
    loadStyles()
  }, [])
    


  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoPath || '/Chillhop_White_Oak.mp4'}
        loop
        muted
        onLoadedData={() => { if (videoPlaying) videoRef.current?.play().catch(() => {}) }}
        onError={() => { if (videoPath !== '/Chillhop_White_Oak.mp4') setVideoPath('/Chillhop_White_Oak.mp4') }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.15, zIndex: 0 }}
      />  
      {/* Content */}
    <div className="h-screen w-screen   text-white overflow-hidden flex flex-col">

      <Titlebar />
      <div className="absolute top-40 left-1/2  z-50">
        <ActionsMenu />
      </div>

      <div className="flex flex-row flex-1 overflow-hidden">

        <LeftSidebar />

        {/* Editor area */}
        <div className={`flex-1 bg-[#0F0B08] overflow-hidden flex flex-col`}>

          {/* Tab bar */}
          {openTabs.length > 0 && (
            <div className="flex flex-row overflow-x-auto shrink-0 border-b border-b-[#3D3020] bg-[#1A1208]" style={{ scrollbarWidth: 'none' }}>
              {openTabs.map(tab => (
                <div
                  key={tab.path}
                  onClick={() => useStore.activeTabPath.getState().setActiveTabPath(tab.path)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer shrink-0 border-r border-r-[#3D3020] group transition-colors ${
                    tab.path === activeTabPath
                      ? `text-${themeObject?.colors?.editor?.tabsActiveTextColor || '#E8C088'} bg-[${themeObject?.colors?.editor?.tabsActiveBackground || '#0F0B08'}] border-t border-t-[${themeObject?.colors?.editor?.tabsBorder || '#E8C088'}]`
                      : `text-${themeObject?.colors?.editor?.tabsInactiveTextColor || '#6B5D4A'} hover:text-${themeObject?.colors?.editor?.tabsHoverTextColor || '#9A8A78'} hover:bg-[${themeObject?.colors?.editor?.tabsHoverBackground || '#16110D'}]`
                  }`}
                >
                  <span className="truncate max-w-32">{tab.name}</span>
                  
                  {unsavedFiles.includes(tab.path) && <div className="rounded-[100px] bg-[#E8C088] w-2 h-2"></div>}
                  <button
                    onClick={e => handleCloseTab(tab.path, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[#E8C088] transition-opacity shrink-0 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {activeTab ? (
              <Editor
                content={activeTab.content}
                fileName={activeTab.name}
                filePath={activeTab.path}
                onSave={(content) => saveFile(activeTab.path, content)}
              />
            ) : (
              <>
              {
                folderPath ? (<div className="h-full flex items-center justify-center flex-col gap-2">
                <p className="text-[#3D3020] text-[12px]">Open a file to start editing</p>
                <p className="text-[#2a2018] text-[10px]">{quote}</p>
              </div>) : (<div className="h-full flex items-center justify-center flex-col gap-2">
                <p className="text-[#3D3020] text-[12px]">Open a folder to start editing</p>
                <p className="text-[#2a2018] text-[10px]">{quote}</p>
              </div>)
              }</>
              
            )}
          </div>
          {/* Terminal */}

          {terminalOpen && (
            <div className="flex flex-col flex-shrink-0 border-t-2 border-t-[#3D3020]" style={{ height: terminalHeight }}>
              <div
                className="h-1 flex-shrink-0 cursor-row-resize hover:bg-[#E8C088] transition-colors"
                onMouseDown={handleResizeStart}
              />

              <div className="flex items-center border-b border-b-[#3D3020] bg-[#1A1208] flex-shrink-0">
                <button
                  onClick={() => useStore.activeBottomSection.getState().setActiveBottomSection('terminal')}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border-t-2 transition-colors cursor-pointer ${
                    activeBottomSection === 'terminal'
                      ? 'text-[#E8C088] border-t-[#E8C088]'
                      : 'text-[#675D49] border-t-transparent hover:text-[#9A8A78]'
                  }`}
                >
                  Terminal
                </button>
                <button
                  disabled={files.length === 0}
                  onClick={() => useStore.activeBottomSection.getState().setActiveBottomSection('problems')}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border-t-2 transition-colors cursor-pointer ${
                    activeBottomSection === 'problems'
                      ? 'text-[#E8C088] border-t-[#E8C088]'
                      : 'text-[#675D49] border-t-transparent hover:text-[#9A8A78]'
                  }`}
                >
                  Problems
                </button>

                <div className="flex items-center ml-auto gap-0.5 px-2">
                  {activeBottomSection === 'terminal' && (
                    <div className="flex items-center gap-0.5">
                      {terminalTabs.map(tab => (
                        <div
                          key={tab.id}
                          onClick={() => useStore.activeTerminalTabId.getState().setActiveTerminalTab(tab.id)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] cursor-pointer rounded transition-colors group ${
                            tab.id === activeTerminalTabId
                              ? 'bg-[#3D3020] text-[#E8C088]'
                              : 'text-[#675D49] hover:text-[#9A8A78] hover:bg-[#2a1f10]'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <button
                            onClick={e => closeTerminalTab(tab.id, e)}
                            className="opacity-0 group-hover:opacity-100 hover:text-[#E8C088] transition-opacity"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addTerminal}
                        title="New Terminal"
                        className="text-[#675D49] hover:text-[#E8C088] transition-colors px-1.5 py-0.5"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => useStore.terminalOpen.getState().setTerminalOpen(false)}
                        title="Close Panel"
                        className="text-[#675D49] hover:text-[#E8C088] transition-colors px-1.5 py-0.5 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                {activeBottomSection === 'problems' && (
                  <div className="absolute inset-0 flex flex-col">
                    {problems.map(problem => (
                      <div
                        key={problem}
                        className="px-3 py-2 border-b border-b-[#3D3020] text-[11px] text-[#9A8A78] hover:bg-[#3D3020] cursor-pointer"
                      >
                        {problem}
                      </div>
                    ))}
                  </div>
                )}

                {activeBottomSection === 'terminal' &&
                  terminalTabs.map(tab => (
                    <div
                      key={tab.id}
                      className="absolute inset-0"
                      style={{ display: tab.id === activeTerminalTabId ? 'flex' : 'none', flexDirection: 'column' }}
                    >
                      <Terminal path={folderPath || null} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <SidebarComponent workspaceRoot={folderPath || null} />
        

      </div>
        <Statusbar />

      {fileMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => useStore.fileMenuOpen.getState().setFileMenuOpen(false)} />
      )}
    </div>
    {/* bg with no vid is supposed to be:- bg-[#0F0B08] */}
    </div>
  )
}

export default App
