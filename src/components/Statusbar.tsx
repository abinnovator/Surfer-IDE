import { useStore } from '../../lib/zustand'
import { ClockIcon, Pause, Play, Video, VideoOff } from 'lucide-react'

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
    const theme = useStore.theme((state) => state.theme)
    const sb = theme?.colors?.statusBar
    const videoState = useStore.video((state) => state.video)
    console.log('Statusbar theme:', sb)
    const videoEnabled = useStore.videoEnabled((state) => state.videoEnabled)
  return (
    <div
      className="flex flex-row justify-between items-center py-2 px-2 border-t-2"
      style={{ background: sb?.background || '#1E1710', borderTopColor: sb?.border || '#3D3020', color: sb?.['text-color'] || '#9A8A78' }}
    >
        <div className="flex flex-row gap-2">
            <span className="text-[8px]">Project: {folderName? folderName: "No project Opened"}</span>
            {activeTab && (
                <span className="text-[8px]">{activeTab.name}</span>
            )}
            <span className="flex flex-row text-[10px] gap-2"><ClockIcon size={12} /> {timeTracked} </span>
            <button onClick={() => useStore.video.getState().setVideo(!useStore.video.getState().video)} className="cursor-pointer">
                {videoState ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button className="cursor-pointer" onClick={()=> useStore.videoEnabled.getState().setVideoEnabled(!useStore.videoEnabled.getState().videoEnabled)}>
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
  )
}

export default Statusbar