import { Send } from 'lucide-react'
import React from 'react'

interface Props {
  workspaceRoot: string | null
}

const TaskList = ({ workspaceRoot }: Props) => { 
  const [tasks, setTasks] = React.useState<string[]>([])
  const [inputValue, setInputValue] = React.useState<string>("")
  const [agentLog, setAgentLog] = React.useState<string[]>([])
  const [running, setRunning] = React.useState(false)

  const handleAddTask = async () => {
    if (!inputValue.trim() || !workspaceRoot) return
    
    setTasks(prev => [...prev, inputValue.trim()])
    setAgentLog([])
    setRunning(true)

    // listen for updates
    const updateHandler = (_: unknown, msg: string) => {
      setAgentLog(prev => [...prev, msg])
    }
    const doneHandler = (_: unknown, data: { result: string }) => {
      setAgentLog(prev => [...prev, '✓ ' + data.result])
      setRunning(false)
      ;(window as any).ipcRenderer.off('agent:update', updateHandler)
      ;(window as any).ipcRenderer.off('agent:done', doneHandler)
    }

    ;(window as any).ipcRenderer.on('agent:update', updateHandler)
    ;(window as any).ipcRenderer.on('agent:done', doneHandler)

    await (window as any).ipcRenderer.runAgent(inputValue.trim(), workspaceRoot)
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTask()
  }

  return (
    <div className="flex flex-col h-full">
      

      <div className="flex flex-row gap-1 px-2 pt-2">
        <input 
          type="text" 
          placeholder="Add a task" 
          className="flex-1 p-1 text-[11px] bg-[#1E1710] border border-[#3D3020] rounded text-[#C8B898] placeholder-[#3D3020] focus:outline-none focus:border-[#E8C088]" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
        /> 
        <button
          onClick={handleAddTask}
          disabled={!inputValue.trim() || running || !workspaceRoot}
          className="bg-[#3D3020] hover:bg-[#4D4030] text-[#E8C088] px-2 rounded-sm disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Send size={10} />  
        </button>
      </div>

      {/* task log */}
      {agentLog.length > 0 && (
        <div className="mx-2 mt-2 bg-[#1E1710] border border-[#3D3020] rounded p-2 flex flex-col gap-1 overflow-y-auto max-h-48">
          {agentLog.map((log, i) => (
            <p key={i} className="text-[9px] text-[#9A8A78] font-mono">{log}</p>
          ))}
          {running && <p className="text-[9px] text-[#E8C088] animate-pulse">running...</p>}
        </div>
      )}

      {/* task list */}
      <ul className="flex flex-col gap-1 px-2 pt-2">
        {tasks.map((task, index) => (
          <li key={index} className="text-[#6B5D4A] text-[10px] hover:text-[#E8C088] cursor-pointer font-mono">
            {task}
          </li>
        ))}
      </ul>

      {!workspaceRoot && (
        <p className="text-[#3D3020] text-[9px] px-3 pt-2">Open a folder first</p>
      )}
    </div>
  )
}

export default TaskList