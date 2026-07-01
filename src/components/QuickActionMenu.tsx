import { useStore } from '../../lib/zustand'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  FileText, Plus, Terminal, PanelLeft, Settings, RefreshCw,
  FileCode, FolderOpen, GitBranch, ExternalLink, Play,
  Package, Hammer, Brain, MessageSquare, Palette, Video,
  VideoOff, ChevronDown, ChevronRight, X,
} from 'lucide-react'
import { useState } from 'react'

type InlineMode =
  | null
  | 'createEnv'
  | 'addEnvVar'
  | 'createGitignore'
  | 'createReadme'
  | 'aiCustomTask'
  | 'themePicker'

interface Action {
  id: string
  label: string
  icon: React.ReactNode
  section: string
  onClick: () => void | Promise<void>
}

const SECTIONS = ['Project Setup', 'Git', 'Project', 'Editor', 'AI', 'Theme / UI'] as const

const QuickActionMenu = () => {
  const isOpen = useStore.quickEasyActionMenu((state) => state.quickEasyActionMenuOpen)
  const qam = useStore.quickEasyActionMenu
  const [query, setQuery] = useState('')
  const [inlineMode, setInlineMode] = useState<InlineMode>(null)
  const [textContent, setTextContent] = useState('')
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const folder = useStore.folderPath((state) => state.folderPath)
  const activeTabPath = useStore.activeTabPath((state) => state.activeTabPath)
  const videoEnabled = useStore.videoEnabled((state) => state.videoEnabled)

  useHotkeys('ctrl+shift+p', () => {
    qam.getState().setQuickEasyActionMenuOpen(!qam.getState().quickEasyActionMenuOpen)
  })

  const close = () => {
    qam.getState().setQuickEasyActionMenuOpen(false)
    setInlineMode(null)
    setQuery('')
    setTextContent('')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ipc = (window as any).ipcRenderer

  const createFile = async (name: string, content = '') => {
    if (!folder) return
    await ipc.createFile(folder, name)
    if (content) await ipc.writeFile(`${folder}/${name}`, content)
  }

  const getGitignoreContent = async () => {
    let stack: string[] = []
    if (folder) {
      try {
        const idx = await ipc.getIndex(folder)
        if (idx?.stack) stack = idx.stack
      } catch (_e) { /* index not available yet */ }
    }
    const sl = stack.map((s: string) => s.toLowerCase())
    const isNode = sl.some((s: string) => ['node', 'typescript', 'javascript', 'react', 'next', 'vue', 'svelte'].some(k => s.includes(k)))
    const isPy   = sl.some((s: string) => ['python', 'django', 'flask', 'fastapi'].some(k => s.includes(k)))
    const isRust = sl.some((s: string) => s.includes('rust'))
    const isJava = sl.some((s: string) => ['java', 'spring', 'gradle', 'maven'].some(k => s.includes(k)))
    const useNode = isNode || (!isPy && !isRust && !isJava)

    return [
      '# OS\n.DS_Store\nThumbs.db\ndesktop.ini',
      '\n# Editor\n.idea/\n.vscode/\n*.swp\n*~',
      '\n# Logs\n*.log\nlogs/',
      useNode && '\n\n# Node\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\n.env\n.env.local\ndist/\nbuild/\n.next/',
      isPy   && '\n\n# Python\n__pycache__/\n*.py[cod]\n.venv/\nvenv/\ndist/\n*.egg-info/\n.pytest_cache/',
      isRust && '\n\n# Rust\ntarget/',
      isJava && '\n\n# Java\n*.class\n*.jar\ntarget/\n.gradle/\nbuild/',
    ].filter(Boolean).join('')
  }

  const runInTerminal = (cmd: string) => {
    if (!folder) return
    useStore.terminalOpen.getState().setTerminalOpen(true)
    ipc.terminal.run(folder, cmd)
    close()
  }

  const detectAndRun = async (kind: 'run' | 'install' | 'build') => {
    if (!folder) return
    const read = (f: string) => ipc.readFile(`${folder}/${f}`).catch(() => null)
    const pkgRaw = await read('package.json')
    const pkg = pkgRaw ? JSON.parse(pkgRaw) : null

    if (kind === 'run') {
      if (pkg?.scripts?.dev)        { runInTerminal('npm run dev');     return }
      if (pkg?.scripts?.start)      { runInTerminal('npm start');       return }
      if (await read('main.py'))    { runInTerminal('python main.py');  return }
      if (await read('app.py'))     { runInTerminal('python app.py');   return }
      if (await read('Cargo.toml')) { runInTerminal('cargo run');       return }
    }
    if (kind === 'install') {
      if (pkg) {
        if (await read('pnpm-lock.yaml')) { runInTerminal('pnpm install'); return }
        if (await read('yarn.lock'))      { runInTerminal('yarn install'); return }
        runInTerminal('npm install'); return
      }
      if (await read('requirements.txt')) { runInTerminal('pip install -r requirements.txt'); return }
      if (await read('Cargo.toml'))       { runInTerminal('cargo fetch');                     return }
    }
    if (kind === 'build') {
      if (pkg?.scripts?.build)      { runInTerminal('npm run build');         return }
      if (await read('Cargo.toml')) { runInTerminal('cargo build --release'); return }
      if (await read('pom.xml'))    { runInTerminal('mvn package');            return }
    }
  }

  const actions: Action[] = [
    {
      id: 'create-env', label: 'Create .env file', section: 'Project Setup', icon: <FileText size={13} />,
      onClick: () => { setInlineMode('createEnv'); setTextContent('') },
    },
    {
      id: 'add-env-var', label: 'Add env var', section: 'Project Setup', icon: <Plus size={13} />,
      onClick: () => { setInlineMode('addEnvVar'); setTextContent('') },
    },
    {
      id: 'create-gitignore', label: 'Create .gitignore', section: 'Project Setup', icon: <FileText size={13} />,
      onClick: async () => {
        const content = await getGitignoreContent()
        setTextContent(content)
        setInlineMode('createGitignore')
      },
    },
    {
      id: 'create-readme', label: 'Create README.md template', section: 'Project Setup', icon: <FileText size={13} />,
      onClick: () => { setInlineMode('createReadme'); setTextContent('') },
    },

    {
      id: 'git-init', label: 'Initialize git repo', section: 'Git', icon: <GitBranch size={13} />,
      onClick: () => runInTerminal('git init'),
    },
    {
      id: 'git-open-remote', label: 'Open git remote in browser', section: 'Git', icon: <ExternalLink size={13} />,
      onClick: async () => {
        if (!folder) return
        try {
          const res = await ipc.checkGitExists(folder)
          if (res?.remoteUrl) {
            const url = res.remoteUrl.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '')
            await ipc.invoke('shell:open-external', url)
          }
        } catch (_e) { /* no remote configured */ }
        close()
      },
    },

    // Project
    {
      id: 'run-project', label: 'Run project', section: 'Project', icon: <Play size={13} />,
      onClick: () => detectAndRun('run'),
    },
    {
      id: 'install-deps', label: 'Install dependencies', section: 'Project', icon: <Package size={13} />,
      onClick: () => detectAndRun('install'),
    },
    {
      id: 'build-project', label: 'Build project', section: 'Project', icon: <Hammer size={13} />,
      onClick: () => detectAndRun('build'),
    },
    {
      id: 'open-folder', label: 'Open project in file explorer', section: 'Project', icon: <FolderOpen size={13} />,
      onClick: async () => {
        if (folder) await ipc.invoke('shell:open-folder', folder)
        close()
      },
    },

    // Editor
    {
      id: 'toggle-terminal', label: 'Toggle terminal', section: 'Editor', icon: <Terminal size={13} />,
      onClick: () => {
        const s = useStore.terminalOpen.getState()
        s.setTerminalOpen(!s.terminalOpen)
        close()
      },
    },
    {
      id: 'toggle-sidebar', label: 'Toggle sidebar', section: 'Editor', icon: <PanelLeft size={13} />,
      onClick: () => {
        const s = useStore.fileExplorerOpen.getState()
        s.setFileExplorerOpen(!s.fileExplorerOpen)
        close()
      },
    },
    {
      id: 'open-settings', label: 'Open settings', section: 'Editor', icon: <Settings size={13} />,
      onClick: () => { ipc.openSettings(); close() },
    },
    {
      id: 'reindex', label: 'Reindex project', section: 'Editor', icon: <RefreshCw size={13} />,
      onClick: async () => {
        if (!folder) return
        useStore.isIndexing.getState().setIsIndexing(true)
        await ipc.indexProject(folder)
        useStore.isIndexing.getState().setIsIndexing(false)
        close()
      },
    },
    {
      id: 'format-file', label: 'Format current file', section: 'Editor', icon: <FileCode size={13} />,
      onClick: async () => {
        if (!activeTabPath) return
        const tabs = useStore.openTabs.getState().openTabs
        const tab  = tabs.find(t => t.path === activeTabPath)
        if (!tab) return
        const formatted = await ipc.writeFile(activeTabPath, tab.content)
        useStore.openTabs.getState().setOpenTabs(
          tabs.map(t => t.path === activeTabPath ? { ...t, content: formatted } : t),
        )
        close()
      },
    },
    {
      id: 'reveal-file', label: 'Reveal file in sidebar', section: 'Editor', icon: <FileCode size={13} />,
      onClick: () => {
        useStore.fileExplorerOpen.getState().setFileExplorerOpen(true)
        useStore.searchMenuOpen.getState().setSearchMenuOpen(false)
        useStore.gitMenuOpen.getState().setGitMenuOpen(false)
        close()
      },
    },

    // AI
    {
      id: 'ai-ask', label: 'Ask Surfer AI about current file', section: 'AI', icon: <Brain size={13} />,
      onClick: () => setInlineMode('aiCustomTask'),
    },
    {
      id: 'ai-explain', label: 'Explain current file', section: 'AI', icon: <MessageSquare size={13} />,
      onClick: async () => {
        if (!activeTabPath || !folder) return
        await ipc.runAgent(`Explain this file clearly: ${activeTabPath}`, folder)
        close()
      },
    },
    {
      id: 'ai-error-handling', label: 'Add error handling', section: 'AI', icon: <MessageSquare size={13} />,
      onClick: async () => {
        if (!activeTabPath || !folder) return
        await ipc.runAgent(`Add comprehensive error handling to: ${activeTabPath}`, folder)
        close()
      },
    },
    {
      id: 'ai-write-tests', label: 'Write tests for current file', section: 'AI', icon: <MessageSquare size={13} />,
      onClick: async () => {
        if (!activeTabPath || !folder) return
        await ipc.runAgent(`Write comprehensive unit tests for: ${activeTabPath}`, folder)
        close()
      },
    },

    // Theme / UI
    {
      id: 'switch-theme', label: 'Switch theme', section: 'Theme / UI', icon: <Palette size={13} />,
      onClick: async () => {
        const all = await ipc.getAllThemes()
        setThemes(all || [])
        setInlineMode('themePicker')
      },
    },
    {
      id: 'toggle-video',
      label: videoEnabled ? 'Disable video background' : 'Enable video background',
      section: 'Theme / UI',
      icon: videoEnabled ? <VideoOff size={13} /> : <Video size={13} />,
      onClick: () => {
        useStore.videoEnabled.getState().setVideoEnabled(!videoEnabled)
        close()
      },
    },
  ]

  const filtered = query.trim()
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions

  const renderInline = (actionId: string) => {
    const inputCls = 'bg-[#1A1208] border-[#3D3020] border-2 text-[#675D49] p-2 rounded-md w-full text-xs focus:outline-none'
    const Hint = ({ text }: { text: string }) => (
      <p className="text-[9px] text-[#675D49] opacity-50">{text}</p>
    )

    if (inlineMode === 'createEnv' && actionId === 'create-env') return (
      <div className="flex flex-col gap-1.5 px-4 py-2">
        <textarea autoFocus placeholder="KEY=value..." rows={5} className={`${inputCls} resize-none`}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              await createFile(query || '.env', e.currentTarget.value); close()
            } else if (e.key === 'Escape') setInlineMode(null)
          }} />
        <Hint text={`Ctrl+Enter to create "${query || '.env'}" · Esc to cancel`} />
      </div>
    )

    if (inlineMode === 'addEnvVar' && actionId === 'add-env-var') return (
      <div className="flex flex-col gap-1.5 px-4 py-2">
        <textarea autoFocus placeholder="KEY=value (one per line)..." rows={3} className={`${inputCls} resize-none`}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              const envPath = `${folder}/.env`
              const existing = await ipc.readFile(envPath).catch(() => '')
              const newContent = existing ? `${existing}\n${e.currentTarget.value}` : e.currentTarget.value
              await ipc.writeFile(envPath, newContent)
              close()
            } else if (e.key === 'Escape') setInlineMode(null)
          }} />
        <Hint text="Ctrl+Enter to append to .env · Esc to cancel" />
      </div>
    )

    if (inlineMode === 'createGitignore' && actionId === 'create-gitignore') return (
      <div className="flex flex-col gap-1.5 px-4 py-2">
        <textarea autoFocus rows={7} value={textContent} onChange={e => setTextContent(e.target.value)}
          className={`${inputCls} resize-none`}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              await createFile('.gitignore', textContent); close()
            } else if (e.key === 'Escape') setInlineMode(null)
          }} />
        <Hint text="Ctrl+Enter to create .gitignore · Esc to cancel" />
      </div>
    )

    if (inlineMode === 'createReadme' && actionId === 'create-readme') return (
      <div className="flex flex-col gap-1.5 px-4 py-2">
        <input autoFocus placeholder="Project title (leave blank for folder name)..."
          className={inputCls}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              const title = e.currentTarget.value || folder?.split(/[\\/]/).pop() || 'Project'
              const content = [
                `# ${title}`, '',
                '## Overview', '', 'A brief description of what this project does.', '',
                '## Getting Started', '', '### Prerequisites', '', '- List requirements here', '',
                '### Installation', '', '```bash', '# installation steps', '```', '',
                '### Usage', '', '```bash', '# usage example', '```', '',
                '## Contributing', '', 'Contributions are welcome!', '',
                '## License', '', 'MIT',
              ].join('\n')
              await createFile('README.md', content); close()
            } else if (e.key === 'Escape') setInlineMode(null)
          }} />
        <Hint text="Enter to create README.md · Esc to cancel" />
      </div>
    )

    if (inlineMode === 'aiCustomTask' && actionId === 'ai-ask') return (
      <div className="flex flex-col gap-1.5 px-4 py-2">
        <input autoFocus
          placeholder={`Ask about ${activeTabPath?.split(/[\\/]/).pop() || 'current file'}...`}
          className={inputCls}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              await ipc.runAgent(`${e.currentTarget.value} (file: ${activeTabPath})`, folder || ''); close()
            } else if (e.key === 'Escape') setInlineMode(null)
          }} />
        <Hint text="Enter to run · Esc to cancel" />
      </div>
    )

    if (inlineMode === 'themePicker' && actionId === 'switch-theme') return (
      <div className="flex flex-col gap-0.5 px-4 py-2">
        {themes.length === 0
          ? <p className="text-[10px] text-[#675D49] opacity-50">No themes installed</p>
          : themes.map((t) => (
              <button key={t.id}
                className="flex items-center px-2 py-1 text-[12px] rounded hover:bg-[#3D3020] text-left transition-colors cursor-pointer"
                style={{ color: '#9A8A78' }}
                onClick={async () => {
                  await ipc.updateActiveTheme(t.id)
                  const ts = await ipc.getSpecificTheme(t.id)
                  if (ts) useStore.theme.getState().setTheme(ts)
                  close()
                }}>
                {t.name}
              </button>
            ))
        }
        <Hint text="Click a theme · Esc to cancel" />
      </div>
    )

    return null
  }

  if (!isOpen) return null

  const toggleSection = (s: string) => setCollapsed(prev => ({ ...prev, [s]: !prev[s] }))

  return (
    <div className="bg-[#16110B] text-gray-300 border-[#3D3020] border-2 p-2 rounded-2xl w-80 max-h-[68vh] flex flex-col shadow-2xl">
      {/* Search bar */}
      <div className="flex items-center gap-2 pb-2">
        <input
          type="text"
          autoFocus
          placeholder="Search commands..."
          className="bg-[#1A1208] border-[#3D3020] border-2 text-[#675D49] p-2 rounded-md flex-1 text-xs focus:outline-none"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') close() }}
        />
        <button onClick={close} className="text-[#675D49] hover:text-[#E8C088] transition-colors p-1 shrink-0">
          <X size={13} />
        </button>
      </div>

      {/* Action list */}
      <div
        className="flex flex-col overflow-y-auto flex-1 gap-0.5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3D3020 transparent' }}
      >
        {query.trim()
          ? filtered.map(action => (
              <div key={action.id} className="flex flex-col">
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#3D3020] text-left transition-colors cursor-pointer w-full"
                  onClick={action.onClick}
                >
                  <span className="text-[#675D49] shrink-0">{action.icon}</span>
                  <span className="text-[12px]">{action.label}</span>
                </button>
                {renderInline(action.id)}
              </div>
            ))
          : SECTIONS.map(section => {
              const sectionActions = filtered.filter(a => a.section === section)
              if (!sectionActions.length) return null
              const isCollapsed = collapsed[section]
              return (
                <div key={section} className="flex flex-col">
                  <button
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#675D49] opacity-60 hover:opacity-100 transition-opacity w-full"
                    onClick={() => toggleSection(section)}
                  >
                    {isCollapsed ? <ChevronRight size={9} /> : <ChevronDown size={9} />}
                    {section}
                  </button>
                  {!isCollapsed && sectionActions.map(action => (
                    <div key={action.id} className="flex flex-col">
                      <button
                        className="flex items-center gap-2 px-4 py-1.5 rounded hover:bg-[#3D3020] text-left transition-colors cursor-pointer w-full"
                        onClick={action.onClick}
                      >
                        <span className="text-[#675D49] shrink-0">{action.icon}</span>
                        <span className="text-[12px]">{action.label}</span>
                      </button>
                      {renderInline(action.id)}
                    </div>
                  ))}
                </div>
              )
            })
        }
        {filtered.length === 0 && (
          <p className="text-[#675D49] text-[11px] px-4 py-2 opacity-50">No commands found</p>
        )}
      </div>
    </div>
  )
}

export default QuickActionMenu
