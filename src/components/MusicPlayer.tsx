import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react'

interface PlaybackState {
  is_playing: boolean
  item?: {
    name: string
    artists: { name: string }[]
    album: {
      name: string
      images: { url: string }[]
    }
    duration_ms: number
  }
  progress_ms: number
}

const SpotifyPlayer = () => {
  const [connected, setConnected] = useState(false)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    window.ipcRenderer.invoke('spotify:is-connected').then(setConnected)

    window.ipcRenderer.on('spotify:callback', async (_: any, code: string) => {
      const result = await (window as any).ipcRenderer.exchangeCodeForToken(code)
      if (result.success) {
        setAccessDenied(false)
        setConnected(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    const fetchPlayback = async () => {
      const data = await (window as any).ipcRenderer.getPlayback()
      if (cancelled) return
      if (data?.error === 403) {
        setAccessDenied(true)
        clearInterval(interval)
        return
      }
      if (data) setPlayback(data)
    }
    fetchPlayback()
    const interval = setInterval(fetchPlayback, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [connected])

  const connectSpotify = async () => {
    const url = await window.ipcRenderer.invoke('spotify:get-auth-url')
    window.ipcRenderer.invoke('shell:open-external', url)
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-4 h-full">
        <Music size={24} className="text-[#3D3020]" />
        <p className="text-[#6a5a48] text-[11px] text-center">Connect Spotify to play music while you code</p>
        <button
          onClick={connectSpotify}
          className="bg-[#1DB954] text-white text-[11px] px-3 py-1.5 rounded-full hover:bg-[#1aa34a] transition-colors cursor-pointer"
        >
          Connect Spotify
        </button>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 h-full">
        <Music size={24} className="text-[#3D3020]" />
        <p className="text-[#6a5a48] text-[11px] text-center">
          Spotify denied access. The Spotify Web API requires a Premium subscription — free accounts can't be used here.
        </p>
      </div>
    )
  }

  if (!playback?.item) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <p className="text-[#6a5a48] text-[11px]">Nothing playing</p>
      </div>
    )
  }

  const { item, is_playing, progress_ms } = playback
  const albumArt = item.album.images[0]?.url
  const progress = (progress_ms / item.duration_ms) * 100

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Album art + info */}
      <div className="flex items-center gap-2">
        {albumArt && (
          <img src={albumArt} alt="album art" className="w-10 h-10 rounded flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] text-[#C8B898] truncate">{item.name}</span>
          <span className="text-[10px] text-[#6a5a48] truncate">
            {item.artists.map(a => a.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-[#3D3020] rounded-full">
        <div
          className="h-full bg-[#1DB954] rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => window.ipcRenderer.invoke('spotify:previous')}
          className="text-[#6a5a48] hover:text-[#E8C088] transition-colors cursor-pointer"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={() => window.ipcRenderer.invoke(is_playing ? 'spotify:pause' : 'spotify:play')}
          className="text-[#E8C088] hover:text-white transition-colors cursor-pointer"
        >
          {is_playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => window.ipcRenderer.invoke('spotify:next')}
          className="text-[#6a5a48] hover:text-[#E8C088] transition-colors cursor-pointer"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}

export default SpotifyPlayer