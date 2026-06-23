import { useEffect, useState } from "react"
import toast from "react-hot-toast"

interface IpcRenderer {
  [x: string]: any
  storeToken: (token: string) => Promise<void>
  getToken: () => Promise<string | null>
  invoke: (channel: string, ...args: unknown[]) => Promise<void>
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
  off: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
}
const ipc = () => (window as unknown as { ipcRenderer: IpcRenderer }).ipcRenderer

const LangPackCard = ({title, desc,id, workspacePath}:{ title: string, desc: string, id: string, workspacePath: string }) => {
  const [isInstalled,setIsInstalled] = useState(false);
    const installPack = async () => {
        if (isInstalled) {
          toast.error("Language pack is already installed.",{style: {
      borderRadius: '10px',
      background: '#1E1710',
      color: '#E8C088',
    },})
          return 
        }
        else {
        await ipc().installLangPack(id, workspacePath)
        toast.success("Language pack installed successfully!",{style: {
      borderRadius: '10px',
      background: '#1E1710',
      color: '#E8C088',
    },})
        setIsInstalled(true)
      }
    }
    
    useEffect(() => {
      const checkInstalled = async () => {
        const installed = await ipc().checkLangPackInstalled(id, workspacePath)
        setIsInstalled(installed)
      }
      checkInstalled()
    }, [id,  workspacePath])
  return (
    <div className="bg-[#1E1710] px-2 py-2 rounded-[9px] flex flex-col gap-1">
        <h1 className="text-[#ffffff] text-[11px] uppercase tracking-widest text-center">{title}</h1>
        <p className="text-[#9A8A78] text-[10px] text-center">{desc}</p>
        <button className="bg-[#E8C088] text-[#0F0B08] text-[10px] font-bold py-1 px-2 rounded-sm hover:bg-[#D4A76A] transition-colors cursor-pointer" onClick={installPack} disabled={isInstalled}>
            {isInstalled?'The pack is already installed': 'Install'}
        </button>
    </div>
  )
}

export default LangPackCard