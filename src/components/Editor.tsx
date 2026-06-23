import { useEffect, useState, useRef, useCallback } from 'react'
import { codeToHtml } from 'shiki'

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
  onSave?: (content: string) => Promise<string> | void
  onLintResult?: (output: string) => void
}

export default function Editor({ content: initialContent, fileName, onSave, onLintResult }: Props) {
  const [lineCount, setLineCount] = useState(() => initialContent.split('\n').length)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    codeToHtml(initialContent, { lang, theme: 'github-dark' }).then(html => {
      if (preRef.current) preRef.current.innerHTML = html
    })
  }, [initialContent, fileName, lang])

  const scheduleHighlight = useCallback(() => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => {
      const val = textareaRef.current?.value ?? ''
      codeToHtml(val, { lang, theme: 'github-dark' }).then(html => {
        const pre = preRef.current
        const ta = textareaRef.current
        if (!pre) return
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
    scheduleHighlight()
  }, [scheduleHighlight])

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current
    const pre = preRef.current
    const ln = lineNumbersRef.current
    if (!ta) return
    if (pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft }
    if (ln) ln.scrollTop = ta.scrollTop
  }, [])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current!
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      const result = await onSave?.(ta.value)
      if (result !== undefined) onLintResult?.(result)
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
  }, [onSave, scheduleHighlight])

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

  return (
    <div className="h-full flex overflow-hidden bg-[#0F0B08]">

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
          color: '#7a6a58',
          backgroundColor: '#0F0B08',
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
        {/* highlight layer — owned by direct DOM writes, not React state */}
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
