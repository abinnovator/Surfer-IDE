import { useStore } from '../../lib/zustand'
import { ClockIcon, Video } from 'lucide-react'

const Statusbar = () => {
    const openTabs = useStore.openTabs((state) => state.openTabs)
    const folderName = useStore.folderName((state) => state.folderName)
    const activeTabPath = useStore.activeTabPath((state) => state.activeTabPath)
    const activeTab = openTabs.find(t => t.path === activeTabPath) ?? null
    const timeTracked = useStore.timeTracked((state) => state.timeTracked)
    const linesofCode = activeTab?.content.split(/\r\n|\r|\n/).length ?? 0
    const cursorLine = useStore.filePosition((state) => state.cursorLine)
    const cursorCol = useStore.filePosition((state) => state.cursorCol)
    const type = activeTab?.name.split('.').pop()
  return (
    <div className="flex flex-row justify-between items-center py-2 px-2 bg-[#1E1710] border-t-2 border-t-[#3D3020] text-white">
        <div className="flex flex-row gap-2">
            <span className="text-[8px]">Project: {folderName? folderName: "No project Opened"}</span>
            {activeTab && (
                <span className="text-[8px]">{activeTab.name}</span>
            )}
            <span className="flex flex-row text-[10px] gap-2"><ClockIcon size={12} /> {timeTracked} </span>
            <button onClick={() => useStore.video.getState().setVideo(!useStore.video.getState().video)} className="cursor-pointer">
                <Video size={12} />
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
  )
}

export default Statusbar