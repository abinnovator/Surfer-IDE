import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { java } from '@codemirror/lang-java'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { useStore } from '../../lib/zustand'
import toast from 'react-hot-toast'

const LANG_MAP: Record<string, any> = {
  js: javascript(), jsx: javascript({ jsx: true }),
  ts: javascript({ typescript: true }),
  tsx: javascript({ jsx: true, typescript: true }),
  py: python(), rs: rust(), go: go(),
  java: java(), css: css(), html: html(),
  json: json(), md: markdown(),
}

const getSurferTheme = (editorColors: any) => EditorView.theme({
  '&': { height: '100%', background: 'transparent' },
  '.cm-scroller': { fontFamily: '"Geist Mono", monospace', fontSize: '12px', lineHeight: '1.6' },
  '.cm-gutters': {
    background: editorColors?.background || '#0F0B08',
    borderRight: '1px solid #1e1710',
    color: editorColors?.['line-numbers'] || '#7a6a58'
  },
  '.cm-activeLineGutter': { background: '#1a1208' },
  '.cm-activeLine': { background: '#1a120820' },
  '.cm-cursor': { borderLeftColor: '#E8C088' },
  '.cm-selectionBackground, ::selection': { background: '#3D302080 !important' },
  '.cm-content': { caretColor: '#E8C088', color: editorColors?.['pre-highlight'] || '#d4d4d4' },
}, { dark: true })

interface Props {
  content: string
  fileName: string
  filePath: string
  onSave?: (content: string) => Promise<void> | void
  onKeystroke?: () => void
}

export default function Editor({ content, fileName, filePath, onSave, onKeystroke }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const setCursorPosition = useStore.filePosition(state => state.setCursorPosition)
  const folderPath = useStore.folderPath(state => state.folderPath)
  const theme = useStore.theme(state => state.theme)
  const editorColors = theme?.colors?.editor

  const getExtensions = useCallback(() => {
    const ext = fileName.split('.').pop() || ''
    const lang = LANG_MAP[ext]

    return [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: (view) => {
            onSave?.(view.state.doc.toString())
            useStore.unsavedFiles.getState().setUnsavedFiles(
              useStore.unsavedFiles.getState().unsavedFiles.filter(p => p !== filePath)
            )
            return true
          }
        },
        {
          key: 'Mod-e',
          run: (view) => {
            const pos = view.state.selection.main.head
            const line = view.state.doc.lineAt(pos)
            const cursorPosition = { line: line.number, column: pos - line.from + 1 }
            window.ipcRenderer.getToken().then(token => {
              if (!token) {
                toast.error('No token stored', { style: { background: '#1E1710', color: '#E8C088' } })
                return null
              }
              return window.ipcRenderer.getInlineSuggestion({
                filePath,
                fileContent: view.state.doc.toString(),
                token,
                cursorPosition,
                workspaceRoot: folderPath || undefined,
              })
            }).then(result => {
              if (!result?.suggestion) return
              const currentPos = view.state.selection.main.head
              view.dispatch({ changes: { from: currentPos, insert: result.suggestion } })
            })
            return true
          }
        }
      ]),
      getSurferTheme(editorColors),
      ...(lang ? [lang] : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onKeystroke?.()
          const unsaved = useStore.unsavedFiles.getState().unsavedFiles
          if (!unsaved.includes(filePath)) {
            useStore.unsavedFiles.getState().setUnsavedFiles([...unsaved, filePath])
          }
        }
        if (update.selectionSet) {
          const pos = update.state.selection.main.head
          const line = update.state.doc.lineAt(pos)
          setCursorPosition(line.number, pos - line.from + 1)
        }
      }),
    ]
  }, [fileName, filePath, onSave, onKeystroke, setCursorPosition, folderPath, editorColors])

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: content,
      extensions: getExtensions(),
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [filePath])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content }
      })
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      style={{ background: editorColors?.background || '#0F0B08' }}
    />
  )
}