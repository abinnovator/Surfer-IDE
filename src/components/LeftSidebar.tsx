import { Files, Search, GitGraph, List, Package, ChevronDown, ChevronRight, Folder, FolderOpen, File, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import TaskList from '../TaskList'
import LangPackCard from './LangPackCard'
import { useStore, FileEntry } from '../../lib/zustand'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu"

interface SidebarColors {
  iconColor: string
  iconActiveColor: string
  iconHoverBg: string
  border: string
  panelBg: string
}

const updateEntry = (entries: FileEntry[], targetPath: string, updater: (e: FileEntry) => FileEntry): FileEntry[] => {
  return entries.map(entry => {
    if (entry.path === targetPath) return updater(entry)
    if (entry.children) return { ...entry, children: updateEntry(entry.children, targetPath, updater) }
    return entry
  })
}

const removeEntry = (entries: FileEntry[], targetPath: string): FileEntry[] => {
  return entries
    .filter(e => e.path !== targetPath)
    .map(e => e.children ? { ...e, children: removeEntry(e.children, targetPath) } : e)
}

const sortEntries = (entries: FileEntry[]) => {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })
}

function FileTreeItem({ entry, depth = 0, onToggle, onOpenFile, sc }: {
  entry: FileEntry
  depth?: number
  onToggle: (entry: FileEntry) => void
  onOpenFile: (entry: FileEntry) => void
  sc: SidebarColors
}) {
  const [createFolderName, setCreateFolderName] = useState('')
  const [createFileName, setCreateFileName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [creatingFile, setCreatingFile] = useState(false)

  const deleteFile = async (entry: FileEntry) => {
    await window.ipcRenderer.deleteFile(entry.path)
    useStore.setFiles.getState().setFiles(
      removeEntry(useStore.setFiles.getState().files, entry.path)
    )
  }
  const createFolder = async (entry: FileEntry, folderName: string) => {
    await window.ipcRenderer.createFolder(entry.path, folderName)
    const newChildren = await window.ipcRenderer.readDir(entry.path)
    useStore.setFiles.getState().setFiles(
      updateEntry(useStore.setFiles.getState().files, entry.path, (e) => ({
        ...e, isOpen: true, children: sortEntries(newChildren),
      }))
    )
  }
  const createFile = async (entry: FileEntry, fileName: string) => {
    await window.ipcRenderer.createFile(entry.path, fileName)
    const newChildren = await window.ipcRenderer.readDir(entry.path)
    useStore.setFiles.getState().setFiles(
      updateEntry(useStore.setFiles.getState().files, entry.path, (e) => ({
        ...e, isOpen: true, children: sortEntries(newChildren),
      }))
    )
  }

  const inputStyle = { background: sc.iconHoverBg, color: sc.iconActiveColor, borderColor: sc.border }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div>
          <div
            className="flex items-center gap-1.5 py-0.5 text-[11px] rounded transition-colors cursor-pointer"
            style={{ paddingLeft: `${8 + depth * 12}px`, color: sc.iconColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = sc.iconHoverBg; (e.currentTarget as HTMLElement).style.color = sc.iconActiveColor }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = sc.iconColor }}
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
                ? <FolderOpen size={12} className="flex-shrink-0" style={{ color: sc.iconActiveColor }} />
                : <Folder size={12} className="flex-shrink-0" />
              : <File size={12} className="flex-shrink-0" />
            }
            {creatingFolder && entry.isDirectory && (
              <input
                type="text"
                placeholder="Folder name"
                className="placeholder:opacity-40 border p-1 rounded text-[11px] focus:outline-none"
                style={inputStyle}
                autoFocus
                onChange={(e) => setCreateFolderName(e.target.value)}
                onBlur={() => setCreatingFolder(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { createFolder(entry, createFolderName); setCreatingFolder(false); setCreateFolderName('') }
                }}
              />
            )}
            {creatingFile && entry.isDirectory && (
              <input
                type="text"
                placeholder="File name"
                className="placeholder:opacity-40 border p-1 rounded text-[11px] focus:outline-none"
                style={inputStyle}
                autoFocus
                onChange={(e) => setCreateFileName(e.target.value)}
                onBlur={() => setCreatingFile(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { createFile(entry, createFileName); setCreatingFile(false); setCreateFileName('') }
                }}
              />
            )}
            <span className="truncate">{entry.name}</span>
          </div>
          {entry.isOpen && entry.children && sortEntries(entry.children).map(child => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} onToggle={onToggle} onOpenFile={onOpenFile} sc={sc} />
          ))}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className="p-2 rounded-2xl border-2"
        style={{ background: sc.panelBg, borderColor: sc.border }}
      >
        {entry.isDirectory && (
          <>
            <ContextMenuItem style={{ color: sc.iconActiveColor }} onClick={() => setCreatingFile(true)}>Create File</ContextMenuItem>
            <ContextMenuItem style={{ color: sc.iconActiveColor }} onClick={() => setCreatingFolder(true)}>Create folder</ContextMenuItem>
          </>
        )}
        <ContextMenuItem style={{ color: sc.iconActiveColor }} onClick={() => deleteFile(entry)}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

const LeftSidebar = () => {
  const fileExplorerOpen = useStore.fileExplorerOpen((state) => state.fileExplorerOpen)
  const searchMenuOpen=useStore.searchMenuOpen((state) => state.searchMenuOpen)
  const gitMenuOpen = useStore.gitMenuOpen((state) => state.gitMenuOpen)
  const taskListOpen = useStore.taskListOpen((state) => state.taskListOpen)
  const langPackOpen = useStore.langPackOpen((state) => state.langPackOpen)
  const folderName = useStore.folderName((state) => state.folderName)
  const folderPath  = useStore.folderPath((state) => state.folderPath)
  const files= useStore.setFiles((state) => state.files)
  const packs= useStore.packs((state) => state.packs)
  const theme   = useStore.theme((state) => state.theme)

  const [rootCreatingFile, setRootCreatingFile] = useState(false)
  const [rootCreatingFolder, setRootCreatingFolder] = useState(false)
  const [rootInputName, setRootInputName] = useState('')
  const [gitExists, setGitExists] = useState(false)
  const [gitChanges, setGitChanges] = useState({ isClean: true, ahead: 0, behind: 0, currentBranch: '', changes: [] as { path: string; file: string; status: string }[] })
  const [commitMessage, setCommitMessage]  = useState('')

  const ls = theme?.colors?.['left-sidebar']
  const ed = theme?.colors?.editor

  const sc: SidebarColors = {
    iconColor:      ls?.['icon-color']            || '#9A8A78',
    iconActiveColor: ls?.['icon-hover-color']     || '#E8C088',
    iconHoverBg:    ls?.['icon-hover-background'] || '#3D3020',
    border:         ls?.border                    || '#3D3020',
    panelBg:        ed?.tabsBackground            || '#1A1208',
  }

  const stripBg = theme?.colors?.titlebar?.background || '#1E1710'

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

  useEffect(() => {
    if (folderPath) {
      window.ipcRenderer.checkGitExists(folderPath).then(result => setGitExists(result.there))
      window.ipcRenderer.checkGitStatus(folderPath).then(setGitChanges)
    }
  }, [folderPath])

  const panelHeaderStyle = { color: sc.iconColor, opacity: 0.5 }
  const panelBorderStyle = { borderColor: sc.border }
  const inputStyle = { background: sc.iconHoverBg, color: sc.iconActiveColor }

  const panelClass = "flex flex-col w-52 border-r-2 flex-shrink-0"

  return (
    <div
      className="flex flex-row shrink-0 overflow-hidden"
      style={{ '--ls-icon': sc.iconColor, '--ls-active': sc.iconActiveColor, '--ls-hover-bg': sc.iconHoverBg } as React.CSSProperties}
    >
      {/* Icon strip */}
      <div
        className="flex flex-col px-2 py-4 gap-6 w-12 flex-shrink-0 border-r-2"
        style={{ background: stripBg, borderColor: sc.border }}
      >
        {([
          { panel: 'file-explorer' as const, Icon: Files,    open: fileExplorerOpen },
          { panel: 'search'        as const, Icon: Search,   open: searchMenuOpen   },
          { panel: 'git'           as const, Icon: GitGraph, open: gitMenuOpen      },
          { panel: 'task-list'     as const, Icon: List,     open: taskListOpen     },
          { panel: 'langPackPanel' as const, Icon: Package,  open: langPackOpen     },
        ]).map(({ panel, Icon, open }) => (
          <button key={panel} onClick={() => togglePanel({ panel })}>
            <Icon
              size={22}
              className="cursor-pointer transition-colors hover:text-[var(--ls-active)]"
              style={{ color: open ? sc.iconActiveColor : sc.iconColor }}
            />
          </button>
        ))}
      </div>

      {/* File Explorer */}
      <div className={panelClass} style={{ background: sc.panelBg, borderColor: sc.border }} hidden={!fileExplorerOpen}>
        <div className="px-3 py-2.5 border-b flex-shrink-0" style={panelBorderStyle}>
          <h1 className="text-[11px] uppercase tracking-widest" style={panelHeaderStyle}>
            {folderName || 'No folder opened'}
          </h1>
        </div>
        <ContextMenu>
          <ContextMenuTrigger className="flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col py-2 gap-0.5 overflow-y-auto flex-1">
              {(rootCreatingFile || rootCreatingFolder) && folderPath && (
                <div className="flex items-center gap-1.5 px-2 py-0.5">
                  {rootCreatingFolder
                    ? <Folder size={12} className="flex-shrink-0" style={{ color: sc.iconColor }} />
                    : <File   size={12} className="flex-shrink-0" style={{ color: sc.iconColor }} />
                  }
                  <input
                    type="text"
                    placeholder={rootCreatingFolder ? 'Folder name' : 'File name'}
                    className="placeholder:opacity-40 border p-0.5 rounded text-[11px] w-full focus:outline-none"
                    style={{ ...inputStyle, borderColor: sc.border }}
                    autoFocus
                    value={rootInputName}
                    onChange={(e) => setRootInputName(e.target.value)}
                    onBlur={() => { setRootCreatingFile(false); setRootCreatingFolder(false); setRootInputName('') }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && rootInputName.trim()) {
                        if (rootCreatingFolder) await window.ipcRenderer.createFolder(folderPath, rootInputName.trim())
                        else await window.ipcRenderer.createFile(folderPath, rootInputName.trim())
                        const newChildren = await window.ipcRenderer.readDir(folderPath)
                        useStore.setFiles.getState().setFiles(sortEntries(newChildren))
                        setRootCreatingFile(false); setRootCreatingFolder(false); setRootInputName('')
                      } else if (e.key === 'Escape') {
                        setRootCreatingFile(false); setRootCreatingFolder(false); setRootInputName('')
                      }
                    }}
                  />
                </div>
              )}
              {files.map((file) => (
                <FileTreeItem key={file.path} entry={file} onToggle={handleToggleFolder} onOpenFile={handleOpenFile} sc={sc} />
              ))}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="p-2 rounded-2xl border-2" style={{ background: sc.panelBg, borderColor: sc.border }}>
            <ContextMenuItem style={{ color: sc.iconActiveColor }} onClick={() => { setRootCreatingFile(true); setRootCreatingFolder(false); setRootInputName('') }}>New File</ContextMenuItem>
            <ContextMenuItem style={{ color: sc.iconActiveColor }} onClick={() => { setRootCreatingFolder(true); setRootCreatingFile(false); setRootInputName('') }}>New Folder</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Search */}
      <div className={panelClass} style={{ background: sc.panelBg, borderColor: sc.border }} hidden={!searchMenuOpen}>
        <div className="px-3 py-2.5 border-b flex-shrink-0" style={panelBorderStyle}>
          <h1 className="text-[11px] uppercase tracking-widest" style={panelHeaderStyle}>Search</h1>
        </div>
        <div className="flex flex-col items-center pt-4 gap-3">
          <input type="text" placeholder="Search..."  className="max-w-9/10 w-full py-1.5 text-[8px] px-2 rounded-sm focus:outline-none placeholder:opacity-40" style={inputStyle} />
          <input type="text" placeholder="Replace..." className="max-w-9/10 w-full py-1.5 text-[8px] px-2 rounded-sm focus:outline-none placeholder:opacity-40" style={inputStyle} />
        </div>
      </div>

      {/* Git */}
      <div className={panelClass} style={{ background: sc.panelBg, borderColor: sc.border }} hidden={!gitMenuOpen}>
        <div className="px-3 py-2.5 border-b flex-shrink-0" style={panelBorderStyle}>
          <h1 className="text-[11px] uppercase tracking-widest" style={panelHeaderStyle}>Source Control</h1>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] px-2 py-1" style={{ color: sc.iconColor }}>
            {folderPath
              ? gitExists
                ? gitChanges.changes.length === 0 ? 'No changes to commit' : `${gitChanges.changes.length} uncommitted change${gitChanges.changes.length !== 1 ? 's' : ''}`
                : 'No Git repository found'
              : 'Open a folder to view Git status.'
            }
          </p>
          <div className="px-2 flex flex-row gap-2">
            <input
              type="text"
              placeholder="Commit message..."
              className="max-w-9/10 w-full py-1.5 text-[8px] px-2 rounded-sm focus:outline-none placeholder:opacity-40"
              style={inputStyle}
              disabled={!folderPath || !gitExists || gitChanges.changes.length === 0}
              onChange={(e) => setCommitMessage(e.target.value)}
              value={commitMessage}
            />
            <button
              className="px-2 rounded-sm disabled:opacity-40 cursor-pointer transition-colors"
              style={{ background: sc.iconHoverBg, color: sc.iconActiveColor }}
              disabled={!folderPath || !gitExists || !commitMessage.trim()}
              onClick={async () => {
                if (folderPath && gitExists && commitMessage.trim()) {
                  await window.ipcRenderer.commitToGit(folderPath, commitMessage.trim())
                }
              }}
            >
              <Send size={10} />
            </button>
          </div>
          <div className="flex flex-col gap-2 px-2 max-h-9/12 overflow-y-scroll">
            {folderPath && gitExists && gitChanges.changes.map((change) => (
              <div key={change.path} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: sc.iconHoverBg }}>
                <span className="text-[10px] truncate" style={{ color: sc.iconColor }}>{change.file}</span>
                <span className="text-[10px]"          style={{ color: sc.iconColor }}>{change.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className={panelClass} style={{ background: sc.panelBg, borderColor: sc.border }} hidden={!taskListOpen}>
        <div className="px-3 py-2.5 border-b flex-shrink-0" style={panelBorderStyle}>
          <h1 className="text-[11px] uppercase tracking-widest" style={panelHeaderStyle}>Task List</h1>
        </div>
        {folderName
          ? <TaskList workspaceRoot={folderPath} />
          : <p className="text-[10px] px-2 py-1" style={{ color: sc.iconColor }}>Open a folder to load tasks.</p>
        }
      </div>

      {/* Language Packs */}
      <div className={panelClass} style={{ background: sc.panelBg, borderColor: sc.border }} hidden={!langPackOpen}>
        <div className="px-3 py-2.5 border-b flex-shrink-0" style={panelBorderStyle}>
          <h1 className="text-[11px] uppercase tracking-widest" style={panelHeaderStyle}>Language Packs</h1>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] px-2 py-1" style={{ color: sc.iconColor }}>
            {folderPath ? 'Install language packs to enhance your coding experience.' : 'Open a folder to view available language packs.'}
          </p>
          {folderPath && (
            <div className="px-2 py-2">
              {packs.map((pack) => (
                <LangPackCard key={pack.id} title={pack.name} desc={pack.description ?? ''} id={pack.id} workspacePath={folderPath} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
