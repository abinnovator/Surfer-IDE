import { useEffect, useState, useRef, useCallback } from 'react'
import { codeToHtml } from 'shiki'
import { useStore } from '../../lib/zustand'
import toast from 'react-hot-toast'

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', cs: 'csharp', gd: 'gdscript', rs: 'rust',
  go: 'go', java: 'java', json: 'json', md: 'markdown',
  html: 'html', css: 'css', toml: 'toml', yaml: 'yaml', txt: 'text'
}

interface Props {
  content: string
  fileName: string
  filePath: string
  onSave?: (content: string) => Promise<void> | void
}

export default function Editor({ content: initialContent, fileName, filePath, onSave }: Props) {
  const setCursorPosition = useStore.filePosition(state => state.setCursorPosition)
  const folderPath = useStore.folderPath(state => state.folderPath)
  const [lineCount, setLineCount] = useState(() => initialContent.split('\n').length)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightId = useRef(0)
  const prevLineCount = useRef(initialContent.split('\n').length)

  const ext = fileName.split('.').pop() || 'txt'
  const lang = LANG_MAP[ext] || 'text'

  useEffect(() => {
    const ta = textareaRef.current
    const pre = preRef.current
    if (ta) ta.value = initialContent
    if (pre) pre.textContent = initialContent

    const count = initialContent.split('\n').length
    prevLineCount.current = count
    setLineCount(count)

    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    const id = ++highlightId.current
    codeToHtml(initialContent, { lang, theme: 'github-dark' }).then(html => {
      if (highlightId.current === id && preRef.current) preRef.current.innerHTML = html
    })
  }, [initialContent, fileName, lang])

  const scheduleHighlight = useCallback(() => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => {
      const id = ++highlightId.current
      const val = textareaRef.current?.value ?? ''
      codeToHtml(val, { lang, theme: 'github-dark' }).then(html => {
        const pre = preRef.current
        const ta = textareaRef.current
        if (!pre || highlightId.current !== id) return
        const scrollTop = ta?.scrollTop ?? 0
        const scrollLeft = ta?.scrollLeft ?? 0
        pre.innerHTML = html
        pre.scrollTop = scrollTop
        pre.scrollLeft = scrollLeft
      })
    }, 500)
  }, [lang])

  const handleInput = useCallback(() => {
    const val = textareaRef.current?.value ?? ''

    if (preRef.current) preRef.current.textContent = val

    const newCount = val.split('\n').length
    if (newCount !== prevLineCount.current) {
      prevLineCount.current = newCount
      setLineCount(newCount)
    }

    const unsaved = useStore.unsavedFiles.getState().unsavedFiles
    if (!unsaved.includes(filePath)) {
      useStore.unsavedFiles.getState().setUnsavedFiles([...unsaved, filePath])
    }

    scheduleHighlight()
  }, [scheduleHighlight, filePath])

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current
    const pre = preRef.current
    const ln = lineNumbersRef.current
    if (!ta) return
    if (pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft }
    if (ln) ln.scrollTop = ta.scrollTop
  }, [])

  const syncCursor = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const before = ta.value.substring(0, ta.selectionStart)
    const lines = before.split('\n')
    setCursorPosition(lines.length, lines[lines.length - 1].length + 1)
  }, [setCursorPosition])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current!
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      useStore.unsavedFiles.getState().setUnsavedFiles(
        useStore.unsavedFiles.getState().unsavedFiles.filter(p => p !== filePath)
      )
      await onSave?.(ta.value)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const next = val.substring(0, start) + '  ' + val.substring(end)
      ta.value = next
      ta.selectionStart = start + 2
      ta.selectionEnd = start + 2
      if (preRef.current) preRef.current.textContent = next
      scheduleHighlight()
      return
    }
    if (e.key === '>') {
    const before = val.substring(0, start)
    const tagMatch = before.match(/<([a-zA-Z0-9-]+)([^>]*)$/)
    const selfClosing = ['img', 'input', 'br', 'hr', 'link', 'meta', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']
    
    if (tagMatch && !selfClosing.includes(tagMatch[1].toLowerCase())) {
      e.preventDefault()
      const tagName = tagMatch[1]
      const closing = `></${tagName}>`
      const next = val.substring(0, start) + closing + val.substring(end)
      
      ta.value = next
      
      requestAnimationFrame(() => {
        ta.selectionStart = start + 1
        ta.selectionEnd = start + 1
      })
      
      if (preRef.current) preRef.current.textContent = next
      scheduleHighlight()

      const unsaved = useStore.unsavedFiles.getState().unsavedFiles
      if (!unsaved.includes(filePath)) {
        useStore.unsavedFiles.getState().setUnsavedFiles([...unsaved, filePath])
      }
    }
    return
  }

    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" }
    if (pairs[e.key]) {
      e.preventDefault()
      const next = val.substring(0, start) + e.key + pairs[e.key] + val.substring(end)
      ta.value = next
      ta.selectionStart = start + 1
      ta.selectionEnd = start + 1
      if (preRef.current) preRef.current.textContent = next
      scheduleHighlight()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault()
      const cursorPosition = {
        line: ta.value.substring(0, ta.selectionStart).split('\n').length,
        column: ta.selectionStart - ta.value.lastIndexOf('\n', ta.selectionStart - 1),
      }
      window.ipcRenderer.getToken().then(token => {
        if (!token) {
          toast.error('No token stored — add your token in settings', { style: { background: '#1E1710', color: '#E8C088' } })
          return
        }
        return window.ipcRenderer.getInlineSuggestion({
          filePath,
          fileContent: ta.value,
          token,
          cursorPosition,
          workspaceRoot: folderPath || undefined,
        })
      }).then(result => {
        if (!result) return
        if (result.error) {
          toast.error(result.error, { style: { background: '#1E1710', color: '#E8C088' } })
          return
        }
        if (!result.suggestion) return
        const currentStart = ta.selectionStart
        const next = ta.value.substring(0, currentStart) + result.suggestion + ta.value.substring(currentStart)
        ta.value = next
        ta.selectionStart = currentStart + result.suggestion.length
        ta.selectionEnd = currentStart + result.suggestion.length
        if (preRef.current) preRef.current.textContent = next
        scheduleHighlight()
      })
    }
  }, [onSave, scheduleHighlight, filePath, folderPath])

  const sharedStyle: React.CSSProperties = {
    fontFamily: '"Geist Mono", monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    padding: '16px 16px 16px 0',
    margin: 0,
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    wordBreak: 'normal',
  }
  const theme = useStore.theme((state) => state.theme)
  const editorstyles= theme?.colors?.editor

  return (
    <div className="h-full flex overflow-hidden" style={{ backgroundColor: editorstyles?.background || '#0F0B08' }}>

      {/* line numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 overflow-hidden select-none"
        style={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          paddingTop: '16px',
          paddingBottom: '16px',
          width: '48px',
          textAlign: 'right',
          color: editorstyles?.lineNumbers || '#7a6a58',
          backgroundColor: editorstyles?.background || '#0F0B08',
          borderRight: '1px solid #1e1710',
          overflowY: 'hidden',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} style={{ paddingRight: '12px' }}>{i + 1}</div>
        ))}
      </div>

      {/* editor */}
      <div className="flex-1 relative overflow-hidden">
        <pre
          ref={preRef}
          style={{
            ...sharedStyle,
            paddingLeft: '16px',
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            background: 'transparent',
            pointerEvents: 'none',
            color: '#d4d4d4',
          }}
        />
        <textarea
          ref={textareaRef}
          defaultValue={initialContent}
          onInput={handleInput}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCursor}
          onClick={syncCursor}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            ...sharedStyle,
            paddingLeft: '16px',
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#E8C088',
            resize: 'none',
            outline: 'none',
            border: 'none',
            overflow: 'auto',
          }}
        />
      </div>
    </div>
  )
}
