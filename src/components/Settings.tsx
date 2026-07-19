import React, { useEffect, useState } from 'react'
import { X, ExternalLink, MessageSquare, Copy, Check } from 'lucide-react'
import ThemesDropdown from './ThemesDropdown'

const ipc = (window as any).ipcRenderer

type Section = 'General' | 'AI' | 'Lang Packs' | 'Keybindings' | 'About'

const NAV: Section[] = ['General', 'AI', 'Lang Packs', 'Keybindings', 'About']

const KEYBINDINGS = [
  { key: 'Ctrl+P',       action: 'Open file / command palette' },
  { key: 'Ctrl+Shift+P', action: 'Quick action menu' },
  { key: 'Ctrl+B',       action: 'Toggle sidebar' },
  { key: 'Ctrl+`',       action: 'Toggle terminal' },
  { key: 'Ctrl+E',       action: 'Trigger inline suggestion' },
  { key: 'Ctrl+S',       action: 'Save file' },
]

const row = 'flex items-center justify-between py-2.5 border-b border-[#2A1F12]'
const label = 'text-[12px] text-[#C8B898]'
const sub = 'text-[10px] text-[#675D49] mt-0.5'
const inputCls = 'bg-[#1A1208] border border-[#3D3020] text-[#E8C088] text-[11px] px-2 py-1 rounded focus:outline-none focus:border-[#E8C088]'
const toggleBase = 'relative w-8 h-4 rounded-full transition-colors cursor-pointer shrink-0'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`${toggleBase} ${on ? 'bg-[#E8C088]' : 'bg-[#3D3020]'}`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#0F0B08] transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-semibold text-[#E8C088] mb-4">{children}</h2>
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('General')
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([])
  const [activeThemeId, setActiveThemeId] = useState('')

  const [surferToken, setSurferToken] = useState('')
  const [savedToken, setSavedToken] = useState('')
  const [saveHackatimeToken, setSaveHackatimeToken] = useState('')
  const [hackatimeToken, setHackatimeToken] = useState('')
  const [inlineSuggestions, setInlineSuggestions] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tokenSpend, setTokenSpend] = useState<number | null>(null)
  const [loadingSpend, setLoadingSpend] = useState(false)

  // Lang packs
  const [installedPacks, setInstalledPacks] = useState<{ id: string; name: string; description?: string }[]>([])

  const closeWindow = () => ipc.closeSettingsWindow()

  const fetchSpend = async (token: string) => {
    if (!token) return
    setLoadingSpend(true)
    try {
      const pct = await ipc.getPercentageUsed(token)
      if (typeof pct === 'number') setTokenSpend(pct)
    } catch { /* ignore */ } finally {
      setLoadingSpend(false)
    }
  }

  useEffect(() => {
    ipc.getAllThemes().then((t: any) => setThemes(t))
    ipc.getActiveTheme().then((id: string) => setActiveThemeId(id))

    ipc.getToken().then((token: string | null) => {
      if (token) {
        setSurferToken(token)
        setSavedToken(token)
        fetchSpend(token)
      }
    }).catch(() => {})
    ipc.getHackatimeToken().then((token: string | null) => {
      if (token) {
        setSaveHackatimeToken(token)
      }
    }).catch(() => {})

    ipc.invoke?.('settings:get', 'inlineSuggestions').then((v: boolean) => { if (v !== undefined) setInlineSuggestions(v) }).catch(() => {})
    ipc.invoke?.('packs:list').then((p: any[]) => setInstalledPacks(p ?? [])).catch(() => {})
  }, [])

  const saveToken = async () => {
    await ipc.storeToken(surferToken).catch(() => {})
    setSavedToken(surferToken)
    setTokenSpend(null)
    fetchSpend(surferToken)
  }
  const saveHackatimeTokenLocally = async () => {
    await ipc.hackatimeStoreToken(hackatimeToken).catch(() => {})
    setSaveHackatimeToken(hackatimeToken)
  }

  const signOut = async () => {
    await ipc.deleteToken().catch(() => {})
    setSurferToken('')
    setSavedToken('')
    setTokenSpend(null)
  }
  const hackatimeSignOut = async () => {
    await ipc.hackatimeDeleteToken().catch(() => {})
    setHackatimeToken('')
    setSaveHackatimeToken('')
  }

  const copyToken = () => {
    navigator.clipboard.writeText(savedToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const copyHackatimeToken = () => {
    navigator.clipboard.writeText(saveHackatimeToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleInline = (v: boolean) => {
    setInlineSuggestions(v)
    ipc.invoke?.('settings:set', 'inlineSuggestions', v).catch(() => {})
  }
  return (
    <div className="h-screen w-screen bg-[#0F0B08] text-white flex flex-col overflow-hidden">
      {/* Titlebar */}
      <div
        className="flex items-center justify-between bg-[#1E1710] border-b-2 border-b-[#3D3020] h-10 px-4 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[12px] text-[#C8B898]">Settings</span>
        <button
          onClick={closeWindow}
          className="text-[#9A8A78] hover:text-[#E8C088] transition-colors cursor-pointer"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <nav className="w-44 bg-[#1A1208] border-r border-r-[#3D3020] flex flex-col py-3 gap-0.5 px-2 shrink-0">
          {NAV.map(s => (
            <div
              key={s}
              onClick={() => setActiveSection(s)}
              className={`text-[12px] px-2 py-1 cursor-pointer rounded transition-colors ${activeSection === s ? 'bg-[#3D3020] text-[#E8C088]' : 'text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]'}`}
            >
              {s}
            </div>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">

          {activeSection === 'General' && (
            <div>
              <SectionTitle>General</SectionTitle>
              {themes.length > 0 && (
                <div className={row}>
                  <div>
                    <p className={label}>Theme</p>
                    <p className={sub}>Visual colour theme for the editor</p>
                  </div>
                  <ThemesDropdown themes={themes} activeThemeId={activeThemeId} />
                </div>
              )}
            </div>
          )}

          {activeSection === 'AI' && (
            <div>
              <SectionTitle>AI & Hackatime</SectionTitle>

              {/* Token */}
              <div className="mb-5">
                <p className={label}>Surfer token</p>
                <p className={`${sub} mb-2`}>Used to authenticate AI features. Keep this private.</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-surf-..."
                    value={surferToken}
                    onChange={e => setSurferToken(e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  {savedToken && (
                    <button
                      onClick={copyToken}
                      title="Copy token"
                      className="px-2 text-[#9A8A78] hover:text-[#E8C088] transition-colors"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  )}
                  <button
                    onClick={saveToken}
                    disabled={surferToken === savedToken}
                    className="px-3 py-1 text-[11px] bg-[#3D3020] text-[#E8C088] rounded hover:bg-[#5A4530] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    Save
                  </button>
                  {savedToken && (
                    <button
                      onClick={signOut}
                      className="px-3 py-1 text-[11px] bg-[#1A1208] border border-[#3D3020] text-[#9A8A78] rounded hover:border-[#E8C088] hover:text-[#E8C088] transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </div>

      

              {/* Inline suggestions toggle */}
              <div className={row}>
                <div>
                  <p className={label}>Inline suggestions</p>
                  <p className={sub}>Show AI completions while you type</p>
                </div>
                <Toggle on={inlineSuggestions} onChange={toggleInline} />
              </div>

              {/* Inline suggestion key — read-only for now */}
              <div className={row}>
                <div>
                  <p className={label}>Inline suggestion trigger key</p>
                  <p className={sub}>Press this to accept / trigger a suggestion</p>
                </div>
                <kbd className="px-2 py-0.5 text-[10px] bg-[#1A1208] border border-[#3D3020] text-[#E8C088] rounded">
                  Ctrl+E
                </kbd>
              </div>
                
                {/* Hackatime Stuff */}
              <div className="mb-5">
                <p className={label}>Hackatime token</p>
                <p className={`${sub} mb-2`}>Used to authenticate into hackatime which is a service for tracking your coding time</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder=""
                    value={hackatimeToken}
                    onChange={e => setHackatimeToken(e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  {saveHackatimeToken && (
                    <button
                      onClick={copyHackatimeToken}
                      title="Copy token"
                      className="px-2 text-[#9A8A78] hover:text-[#E8C088] transition-colors"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  )}
                  <button
                    onClick={saveHackatimeTokenLocally}
                    disabled={hackatimeToken === saveHackatimeToken}
                    className="px-3 py-1 text-[11px] bg-[#3D3020] text-[#E8C088] rounded hover:bg-[#5A4530] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-default"
                  >
                    Save
                  </button>
                  {saveHackatimeToken && (
                    <button
                      onClick={hackatimeSignOut}
                      className="px-3 py-1 text-[11px] bg-[#1A1208] border border-[#3D3020] text-[#9A8A78] rounded hover:border-[#E8C088] hover:text-[#E8C088] transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </div>
              {/* Token Usage */}
              <div className={`${row} border-none`}>
                <div>
                  <p className={label}>Token usage</p>
                  <p className={sub}>Percentage of your plan's token quota consumed</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-[#675D49]">
                    {!saveHackatimeToken ? 'No token saved' : loadingSpend ? 'Loading…' : tokenSpend !== null ? `${tokenSpend.toFixed(1)}% used` : '—'}
                  </span>
                  {saveHackatimeToken && tokenSpend !== null && (
                    <div className="w-24 h-1 bg-[#2A1F12] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(tokenSpend, 100)}%`, background: tokenSpend > 80 ? '#E87070' : '#E8C088' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Lang Packs' && (
            <div>
              <SectionTitle>Language Packs</SectionTitle>
              {installedPacks.length === 0 ? (
                <p className="text-[12px] text-[#675D49]">No language packs installed. Open a project and use the sidebar to browse packs.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {installedPacks.map(p => (
                    <div key={p.id} className="flex items-start justify-between bg-[#1A1208] border border-[#3D3020] rounded px-3 py-2">
                      <div>
                        <p className="text-[12px] text-[#E8C088]">{p.name}</p>
                        {p.description && <p className="text-[10px] text-[#675D49] mt-0.5">{p.description}</p>}
                      </div>
                      <span className="text-[10px] text-[#675D49] mt-0.5">installed</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[#675D49] mt-4">
                To install new packs, open a project and click the Packages icon in the sidebar.
              </p>
            </div>
          )}

          {activeSection === 'Keybindings' && (
            <div>
              <SectionTitle>Keybindings</SectionTitle>
              <p className="text-[11px] text-[#675D49] mb-4">Full remapping coming soon. These are the current defaults.</p>
              <div className="flex flex-col divide-y divide-[#2A1F12]">
                {KEYBINDINGS.map(({ key, action }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-[12px] text-[#C8B898]">{action}</span>
                    <kbd className="px-2 py-0.5 text-[10px] bg-[#1A1208] border border-[#3D3020] text-[#E8C088] rounded whitespace-nowrap">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'About' && (
            <div>
              <SectionTitle>About Surfer</SectionTitle>
              <div className="flex flex-col gap-3">
                <div className={row}>
                  <p className={label}>Version</p>
                  <span className="text-[11px] text-[#675D49]">0.1.0</span>
                </div>
                <div className={`${row} border-none`}>
                  <p className={label}>Links</p>
                  <div className="flex flex-col gap-1.5 items-end">
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); ipc.invoke?.('shell:open-external', 'https://surfer.dev/docs') }}
                      className="flex items-center gap-1 text-[11px] text-[#9A8A78] hover:text-[#E8C088] transition-colors cursor-pointer"
                    >
                      Docs <ExternalLink size={10} />
                    </a>
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); ipc.invoke?.('shell:open-external', 'https://surfer.dev') }}
                      className="flex items-center gap-1 text-[11px] text-[#9A8A78] hover:text-[#E8C088] transition-colors cursor-pointer"
                    >
                      Landing page <ExternalLink size={10} />
                    </a>
                    <a
                      href="#"
                      onClick={e => { e.preventDefault(); ipc.invoke?.('shell:open-external', 'https://github.com/surfer-ide/surfer/issues') }}
                      className="flex items-center gap-1 text-[11px] text-[#9A8A78] hover:text-[#E8C088] transition-colors cursor-pointer"
                    >
                      Give feedback <MessageSquare size={10} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
