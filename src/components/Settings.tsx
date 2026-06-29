import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import ThemesDropdown from './ThemesDropdown'

const Settings = () => {
  const [activeSection, setActiveSection] = React.useState<'General' | 'Editor' | 'AI'>('General')
  const [themes, setThemes] = React.useState<any[]>([])
  const [activeThemeId, setActiveThemeId] = React.useState<string>('')
  const closeWindow = () => (window as any).ipcRenderer.closeSettingsWindow()
  useEffect(() => {
    function getThemes() {
      (window as any).ipcRenderer.getAllThemes().then((themes: any) => {
        console.log('themes', themes)
        setThemes(themes)
      })
    }
    getThemes()
    function getActiveTheme() {
      (window as any).ipcRenderer.getActiveTheme().then((activeThemeId: string) => {
        console.log('activeThemeId', activeThemeId)
        setActiveThemeId(activeThemeId)
      })
    }
    getActiveTheme()
  }, [])
  

  return (
    <div className="h-screen w-screen bg-[#0F0B08] text-white flex flex-col overflow-hidden">
      {/* Titlebar */}
      <div
        className="flex items-center justify-between bg-[#1E1710] border-b-2 border-b-[#3D3020] h-10 px-4 flex-shrink-0"
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
        <nav className="w-44 bg-[#1A1208] border-r border-r-[#3D3020] flex flex-col py-3 gap-0.5 px-2 flex-shrink-0">
          {/* Add setting sections here, e.g.:
          <SettingsNavItem label="General" />
          <SettingsNavItem label="Editor" />
          <SettingsNavItem label="AI" />
          */}
          <div 
            className={`text-[12px] px-2 py-1 cursor-pointer rounded ${activeSection === 'General' ? 'bg-[#3D3020]' : 'hover:bg-[#3D3020]'}`}
            onClick={() => setActiveSection('General')}
          >
            General
          </div>
          <div 
            className={`text-[12px] px-2 py-1 cursor-pointer rounded ${activeSection === 'Editor' ? 'bg-[#3D3020]' : 'hover:bg-[#3D3020]'}`}
            onClick={() => setActiveSection('Editor')}
          >
            Editor
          </div>
          <div 
            className={`text-[12px] px-2 py-1 cursor-pointer rounded ${activeSection === 'AI' ? 'bg-[#3D3020]' : 'hover:bg-[#3D3020]'}`}
            onClick={() => setActiveSection('AI')}
          >
            AI
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">General Settings</h2>
              {themes && themes.length > 0 ? (
                <div>
                  <h3 className="text-md font-semibold mb-2">Available Themes</h3>
                  <ThemesDropdown themes={themes} activeThemeId={activeThemeId} />
                </div>
              ): 'No themes available.'}
            </div>
          {activeSection === 'Editor' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Editor Settings</h2>
              {/* Add editor settings controls here */}
            </div>
          )}
          {activeSection === 'AI' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">AI Settings</h2>
              {/* Add AI settings controls here */}
            </div>
          )}
        </main>
      </div>

      </div>
  )
}

export default Settings
