import React from 'react'
import { LogOut, Send } from 'lucide-react'

interface IpcRenderer {
  [x: string]: any
  storeToken: (token: string) => Promise<void>
  getToken: () => Promise<string | null>
  invoke: (channel: string, ...args: unknown[]) => Promise<void>
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
  off: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
}
const ipc = () => (window as unknown as { ipcRenderer: IpcRenderer }).ipcRenderer

interface Message {
  role: 'user' | 'assistant'
  content: string
}


const SidebarComponent = ({workspaceRoot}: {workspaceRoot: string | null}) => {
  const [userToken, setUserToken] = React.useState('')
  const [inputToken, setInputToken] = React.useState('')
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const appendDeltaRef = React.useRef<((delta: string) => void) | null>(null)

  const saveToken = async (token: string) => {
    await ipc().storeToken(token)
  }
  const loadToken = async () => {
    const token = await ipc().getToken()
    setUserToken(token ?? '')
  }

  React.useEffect(() => { loadToken() }, [])

  React.useEffect(() => {
    const chunkHandler = (_: unknown, chunk: unknown) => {
      appendDeltaRef.current?.(chunk as string)
    }
    const doneHandler = () => {
      setIsStreaming(false)
    }
    ipc().on('ai:chunk', chunkHandler)
    ipc().on('ai:done', doneHandler)
    return () => {
      ipc().off('ai:chunk', chunkHandler)
      ipc().off('ai:done', doneHandler)
    }
  }, [])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const history = [...messages, userMessage]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setIsStreaming(true)

    appendDeltaRef.current = (delta: string) => {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content: next[next.length - 1].content + delta,
        }
        return next
      })
    }

    try {
      await ipc().invoke('ai:chat', { messages: history, token: userToken, workspaceRoot: workspaceRoot })
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: 'Error: could not reach Surfer AI.' }
        return next
      })
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  

  if (!userToken) {
    return (
      <div className="flex flex-col justify-between w-64 border-l-2 border-l-[#3D3020] bg-[#16110B] flex-shrink-0">
        <div className="flex flex-col justify-center items-center h-full px-4 gap-3">
          <p className="text-[#675D49] text-[12px] text-center">
            Please enter your token to use Surfer AI.<br />
            Don't have a token?{' '}
            <a href="https://surfer.aaditbhambri.com/token" target="_blank" className="text-[#E8C088] hover:underline">
              Get one here
            </a>.
          </p>
          <input
            type="text"
            placeholder="enter your token here"
            className="bg-[#3D3020] text-[#ffffff] w-full py-1.5 text-[10px] px-2 rounded-sm focus:outline-none text-center"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
          />
          <button
            className="bg-[#E8C088] text-[#16110B] py-1.5 px-4 rounded-sm hover:bg-[#D4A76F] text-[10px] cursor-pointer"
            onClick={async () => {
              await saveToken(inputToken)
              setUserToken(inputToken)
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-64 border-l-2 border-l-[#3D3020] bg-[#16110B] flex-shrink-0">
      <div className="px-3 py-2.5 border-b-2 border-b-[#3D3020] flex-shrink-0 flex flex-row justify-between">
        <h1 className="text-[#675D49] text-[13px]">Surfer AI</h1>
        <button
          onClick={async () => {
            await ipc().deleteToken()
            setUserToken('')
          }}
          className="text-[#3D3020] hover:text-[#E8C088] transition-colors cursor-pointer"
          title="Sign out"
        >
        <LogOut />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-[#3D3020] text-[10px] text-center mt-4">Ask Surfer AI anything...</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-[11px] rounded px-2 py-1.5 whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'bg-[#3D3020] text-[#E8C088] self-end ml-4'
                : 'text-[#9A8A78] self-start mr-4'
            }`}
          >
            {msg.content || (isStreaming && i === messages.length - 1
              ? <span className="animate-pulse text-[#675D49]">loading response...</span>
              : null
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-2 pb-3 pt-1 flex-shrink-0 flex gap-1 border-t border-t-[#3D3020]">
        <input
          type="text"
          placeholder="Ask Surfer AI..."
          className="bg-[#3D3020] text-[#ffffff] flex-1 py-1.5 text-[10px] px-2 rounded-sm focus:outline-none disabled:opacity-50"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="bg-[#3D3020] hover:bg-[#4D4030] text-[#E8C088] px-2 rounded-sm disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Send size={10} />
        </button>
      </div>
    </div>
  )
}

export default SidebarComponent
