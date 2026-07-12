import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../lib/zustand'
import { ClockIcon, Pause, Play, Video, VideoOff, X } from 'lucide-react'

const REFRESH_MS = 5 * 60 * 1000

const Statusbar = () => {
  const openTabs = useStore.openTabs((state) => state.openTabs)
  const folderName = useStore.folderName((state) => state.folderName)
  const activeTabPath = useStore.activeTabPath((state) => state.activeTabPath)
  const activeTab = openTabs.find(t => t.path === activeTabPath) ?? null
  const linesofCode = activeTab?.content.split(/\r\n|\r|\n/).length ?? 0
  const cursorLine = useStore.filePosition((state) => state.cursorLine)
  const cursorCol = useStore.filePosition((state) => state.cursorCol)
  const type = activeTab?.name.split('.').pop()
  const theme = useStore.theme((state) => state.theme)
  const sb = theme?.colors?.statusBar
  const floating = theme?.floating
  const sbBorderRadius = sb?.['border-radius']
  const sbPaddingX = sb?.['padding-x']
  const sbPaddingBottom = sb?.['padding-bottom']
  const videoState = useStore.video((state) => state.video)
  const videoEnabled = useStore.videoEnabled((state) => state.videoEnabled)

  const [todayTime, setTodayTime] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = async () => {
    try {
      const stats = await window.ipcRenderer.hackatimeGetTodaysStats() as any
      const text = stats?.data?.grand_total?.text as string | undefined
      if (text) setTodayTime(text)
    console.log('Hackatime stats:', stats)
    } catch {
      // silently ignore — stats are non-critical
    }
  }

  useEffect(() => {
    window.ipcRenderer.hackatimeGetToken().then((token: string | null) => {
      const ok = typeof token === 'string' && token.length > 0
      setHasToken(ok)
      if (ok) {
        fetchStats()
        intervalRef.current = setInterval(fetchStats, REFRESH_MS)
      }
    })
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return
    setSaving(true)
    await window.ipcRenderer.hackatimeStoreToken(tokenInput.trim())
    setHasToken(true)
    setShowModal(false)
    setTokenInput('')
    setSaving(false)
    await fetchStats()
    intervalRef.current = setInterval(fetchStats, REFRESH_MS)
  }

  return (
    <>
      <div
        className="flex flex-row justify-between items-center py-2 px-2"
        style={{
          background: sb?.background || '#1E1710',
          borderTop: floating ? undefined : `2px solid ${sb?.border || '#3D3020'}`,
          border: floating ? `2px solid ${sb?.border || '#3D3020'}` : undefined,
          color: sb?.['text-color'] || '#9A8A78',
          margin: floating ? `0px ${sbPaddingX || '0px'} ${sbPaddingBottom || '0px'}` : undefined,
          borderRadius: floating ? (sbBorderRadius || '0px') : undefined,
        }}
      >
        <div className="flex flex-row gap-2 items-center">
          <span className="text-[8px]">Project: {folderName ? folderName : 'No project Opened'}</span>
          {activeTab && (
            <span className="text-[8px]">{activeTab.name}</span>
          )}
          <button
            onClick={() => { if (!hasToken) setShowModal(true) }}
            className={`flex flex-row text-[10px] gap-1 items-center ${!hasToken ? 'cursor-pointer opacity-60 hover:opacity-100' : 'cursor-default'}`}
            title={!hasToken ? 'Click to add Hackatime token' : undefined}
          >
            <ClockIcon size={12} />
            <span>{hasToken ? (todayTime ?? '…') : 'Add token'}</span>
          </button>
          <button onClick={() => useStore.video.getState().setVideo(!useStore.video.getState().video)} className="cursor-pointer">
            {videoState ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button className="cursor-pointer" onClick={() => useStore.videoEnabled.getState().setVideoEnabled(!useStore.videoEnabled.getState().videoEnabled)}>
            {!videoEnabled ? <Video size={12} /> : <VideoOff size={12} />}
          </button>
        </div>
        <div className="flex flex-row gap-3">
          {activeTab && (
            <>
              <span className="text-[8px]">Lines: {linesofCode}</span>
              <span className="text-[8px]">Ln {cursorLine}, Col {cursorCol}</span>
              <span className="text-[8px]">Type: {type}</span>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="rounded-lg p-5 flex flex-col gap-3 w-80"
            style={{ background: sb?.background || '#1E1710', border: `1px solid ${sb?.border || '#3D3020'}`, color: sb?.['text-color'] || '#9A8A78' }}
          >
            <div className="flex flex-row justify-between items-center">
              <span className="text-xs font-semibold">Hackatime Token</span>
              <button onClick={() => setShowModal(false)} className="cursor-pointer opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
            <p className="text-[10px] opacity-70">
              Enter your Hackatime API key to track today's coding time.
            </p>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveToken() }}
              placeholder="Paste token here…"
              autoFocus
              className="text-[11px] rounded px-2 py-1 outline-none w-full"
              style={{ background: '#0F0B08', border: `1px solid ${sb?.border || '#3D3020'}`, color: sb?.['text-color'] || '#9A8A78' }}
            />
            <button
              onClick={handleSaveToken}
              disabled={saving || !tokenInput.trim()}
              className="text-[11px] rounded py-1 cursor-pointer disabled:opacity-40"
              style={{ background: sb?.border || '#3D3020' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Statusbar
