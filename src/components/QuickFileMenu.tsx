import { useEffect, useState } from 'react'
import { useStore } from '../../lib/zustand'
import { cn } from '../../lib/utils'


const fileItem = (file: any) => {
    return (
        <div className="flex items-center p-2 hover:bg-[#1A1208] cursor-pointer rounded-md">
            {file.name}
        </div>
    )
}

const QuickFileMenu = () => {
    const actionMenu = useStore.actionMenu((state) => state.actionMenuOpen)
    const lp = useStore.actionMenu.getState()
    const [query, setQuery] = useState('')
    useEffect(()=> {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'p') {
                lp.setActionMenuOpen(!lp.actionMenuOpen)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    })
    const files = useStore.files((state) => state.files)
    const handleOpenFile = async (entry: FileEntry) => {
        const currentTabs = useStore.openTabs.getState().openTabs
        if (!currentTabs.find(t => t.path === entry.path)) {
        const content = await window.ipcRenderer.readFile(entry.path)
        useStore.openTabs.getState().setOpenTabs([...currentTabs, { path: entry.path, name: entry.name, content }])
        }
        useStore.activeTabPath.getState().setActiveTabPath(entry.path)
        lp.setActionMenuOpen(false)
    }
    const filtered = query.trim() === ''
  ? files.slice(0, 20) 
  : files.filter(f => 
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.path.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 20) 
  return (
    <div className={cn("bg-[#16110B] text-gray-300 border-[#3D3020] border-2 p-2 rounded-2xl", actionMenu == true?  "block": "hidden")}>
        <div className="flex flex-col border-b-[#3D3020]">
        <input type="text" placeholder="search files by name" className="bg-[#1A1208] border-[#3D3020] border-2 text-[#675D49] p-2 rounded-md w-full" onChange={(e) => setQuery(e.target.value)} value={query} />
        </div>
        <div className="flex flex-col mt-2 overflow-scroll max-h-96">
            {query == '' ?
            ( files.map((file) => {
                console.log(file)
                return (
                    <div className="flex items-center p-2 hover:bg-[#1A1208] cursor-pointer rounded-md" onClick={() => handleOpenFile(file)}>
                        {file.name}
                    </div>
                )
            })  ) : filtered.map((file) => { 
                return (
                    <div className="flex items-center p-2 hover:bg-[#1A1208] cursor-pointer rounded-md" onClick={() => handleOpenFile(file)}>
                        {file.name}
                    </div>
                )
            })}
        
        </div>
    </div>
  )
}

export default QuickFileMenu