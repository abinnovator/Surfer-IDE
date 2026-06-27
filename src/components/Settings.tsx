import React from 'react'
import { X } from 'lucide-react'

const Settings = () => {
  const [activeSection, setActiveSection] = React.useState<'General' | 'Editor' | 'AI'>('General')
  const closeWindow = () => (window as any).ipcRenderer.closeSettingsWindow()

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
          {/* Add setting panels here */}
        </main>
      </div>
    </div>
  )
}

export default Settings
