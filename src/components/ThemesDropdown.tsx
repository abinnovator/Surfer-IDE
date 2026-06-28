import { useState, useRef, useEffect } from 'react'

const ThemesDropdown = ({ themes, activeThemeId }: { themes: { id: string; name: string }[], activeThemeId: string }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeTheme = themes.find(t => t.id === activeThemeId)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-1.5 text-[11px] bg-[#1A1208] border border-[#3D3020] text-[#E8C088] rounded cursor-pointer hover:bg-[#3D3020] transition-colors flex items-center gap-2"
      >
        {activeTheme?.name ?? activeThemeId}
        <span className="text-[#675D49]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#1A1208] border border-[#3D3020] rounded z-50 min-w-[160px] overflow-hidden">
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => {
                window.ipcRenderer.updateActiveTheme(theme.id)
                setOpen(false)
              }}
              className={`px-3 py-1.5 text-[11px] cursor-pointer transition-colors ${
                theme.id === activeThemeId
                  ? 'text-[#E8C088] bg-[#3D3020]'
                  : 'text-[#9A8A78] hover:bg-[#3D3020] hover:text-[#E8C088]'
              }`}
            >
              {theme.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ThemesDropdown
