import React from 'react'
import { LogOut, Send } from 'lucide-react'
import { useStore } from '../../lib/zustand'

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
  const themes = useStore.theme((state) => state.theme)
  const aiChatThemes = (themes?.colors?.aiChat ?? {}) as Record<string, string | undefined>
  const aiChatColors = {
    background: aiChatThemes.background || '#16110B',
    textColor: aiChatThemes['text-color'] || aiChatThemes.textColor || '#9A8A78',
    border: aiChatThemes.border || '#3D3020',
    headingColor: aiChatThemes.HeadingColor || aiChatThemes.headingColor || aiChatThemes.headingTextColor || '#E8C088',
    promptTextColor: aiChatThemes.promptTextColor || aiChatThemes.emptyStateTextColor || aiChatThemes['text-color'] || '#9A8A78',
    userMessageBackground: aiChatThemes.userMessageBackground || aiChatThemes.messageUserBackground || '#3D3020',
    userMessageTextColor: aiChatThemes.userMessageTextColor || aiChatThemes.messageUserTextColor || '#E8C088',
    assistantMessageBackground: aiChatThemes.assistantMessageBackground || aiChatThemes.messageAssistantBackground || 'transparent',
    assistantMessageTextColor: aiChatThemes.assistantMessageTextColor || aiChatThemes.messageAssistantTextColor || aiChatThemes['text-color'] || '#9A8A78',
    loadingTextColor: aiChatThemes.loadingTextColor || aiChatThemes.placeholderTextColor || '#675D49',
    inputBackground: aiChatThemes.inputBackground || '#3D3020',
    inputTextColor: aiChatThemes.inputTextColor || '#ffffff',
    inputPlaceholderColor: aiChatThemes.inputPlaceholderColor || aiChatThemes.placeholderTextColor || '#8b8b8b',
    sendButtonBackground: aiChatThemes.sendButtonBackground || aiChatThemes.inputBackground || '#3D3020',
    sendButtonTextColor: aiChatThemes.sendButtonTextColor || aiChatThemes.sendButtonColor || '#E8C088',
    signInTextColor: aiChatThemes.signInTextColor || aiChatThemes['text-color'] || '#9A8A78',
    signInLinkColor: aiChatThemes.signInLinkColor || aiChatThemes.linkColor || aiChatThemes.HeadingColor || '#E8C088',
    signInInputBackground: aiChatThemes.signInInputBackground || aiChatThemes.inputBackground || '#3D3020',
    signInInputTextColor: aiChatThemes.signInInputTextColor || aiChatThemes.inputTextColor || '#ffffff',
    signInButtonBackground: aiChatThemes.signInButtonBackground || '#E8C088',
    signInButtonTextColor: aiChatThemes.signInButtonTextColor || '#16110B',
    headerBorderColor: aiChatThemes.headerBorder || aiChatThemes.border || '#3D3020',
    inputBorderColor: aiChatThemes.inputBorder || aiChatThemes.border || '#3D3020',
  }

  if (!userToken) {
    return (
      <div className="flex flex-col justify-between w-64 border-l-2 border-l-[#3D3020] flex-shrink-0" style={{ background: aiChatColors.background, color: aiChatColors.textColor, borderLeftColor: aiChatColors.border }}>
        <div className="flex flex-col justify-center items-center h-max px-4 gap-3">
          <p className="text-[12px] text-center" style={{ color: aiChatColors.signInTextColor }}>
            Please enter your token to use Surfer AI.<br />
            Don't have a token?{' '}
            <a href="https://surfer.aaditbhambri.com/token" target="_blank" className="hover:underline" style={{ color: aiChatColors.signInLinkColor }}>
              Get one here
            </a>.
          </p>
          <input
            type="text"
            placeholder="enter your token here"
            className="w-full py-1.5 text-[10px] px-2 rounded-sm focus:outline-none text-center border"
            style={{ backgroundColor: aiChatColors.signInInputBackground, color: aiChatColors.signInInputTextColor, borderColor: aiChatColors.inputBorderColor }}
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
          />
          <button
            className="py-1.5 px-4 rounded-sm text-[10px] cursor-pointer"
            style={{ backgroundColor: aiChatColors.signInButtonBackground, color: aiChatColors.signInButtonTextColor }}
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
    <div className="flex flex-col w-64 border-l-2 border-l-[#3D3020] bg-[#16110B] flex-shrink-0" style={{ background: aiChatColors.background, borderLeftColor: aiChatColors.border }}>
      <div className="px-3 py-2.5 border-b-2 border-b-[#3D3020] flex-shrink-0 flex flex-row justify-between" style={{ borderBottomColor: aiChatColors.headerBorderColor }}>
        <h1 className="text-[13px]" style={{ color: aiChatColors.headingColor }}>Surfer AI</h1>
        <button
          onClick={async () => {
            await ipc().deleteToken()
            setUserToken('')
          }}
          className="transition-colors cursor-pointer"
          style={{ color: aiChatColors.headingColor }}
          title="Sign out"
        >
        <LogOut />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-[10px] text-center mt-4" style={{ color: aiChatColors.promptTextColor }}>Ask Surfer AI anything...</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-[11px] rounded px-2 py-1.5 whitespace-pre-wrap break-words ${
              msg.role === 'user'
                ? 'self-end ml-4'
                : 'self-start mr-4'
            }`}
            style={{
              backgroundColor: msg.role === 'user' ? aiChatColors.userMessageBackground : aiChatColors.assistantMessageBackground,
              color: msg.role === 'user' ? aiChatColors.userMessageTextColor : aiChatColors.assistantMessageTextColor,
            }}
          >
            {msg.content || (isStreaming && i === messages.length - 1
              ? <span className="animate-pulse" style={{ color: aiChatColors.loadingTextColor }}>loading response...</span>
              : null
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-2 pb-3 pt-1 flex-shrink-0 flex gap-1 border-t border-t-[#3D3020]" style={{ borderTopColor: aiChatColors.inputBorderColor }}>
        <input
          type="text"
          placeholder="Ask Surfer AI..."
          className="flex-1 py-1.5 text-[10px] px-2 rounded-sm focus:outline-none disabled:opacity-50 border"
          style={{ backgroundColor: aiChatColors.inputBackground, color: aiChatColors.inputTextColor, borderColor: aiChatColors.inputBorderColor }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        <button
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          className="px-2 rounded-sm disabled:opacity-40 cursor-pointer transition-colors"
          style={{ backgroundColor: aiChatColors.sendButtonBackground, color: aiChatColors.sendButtonTextColor }}
        >
          <Send size={10} />
        </button>
      </div>
    </div>
  )
}

export default SidebarComponent
