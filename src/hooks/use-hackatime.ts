import { useEffect, useRef } from 'react'

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  py: 'Python', cs: 'C#', gd: 'GDScript', rs: 'Rust', go: 'Go',
  java: 'Java', json: 'JSON', md: 'Markdown', html: 'HTML', css: 'CSS',
}

export function useHackatime(filePath: string | null, fileName: string | null, projectName: string | null) {
  const lastHeartbeat = useRef<number>(0)
  const INTERVAL = 2 * 60 * 1000

  const send = (isWrite = false) => {
    if (!filePath || !fileName || !projectName) return
    const now = Date.now()
    if (!isWrite && now - lastHeartbeat.current < INTERVAL) return
    lastHeartbeat.current = now
    const ext = fileName.split('.').pop() || ''
    ;(window as any).ipcRenderer.hackatimeHeartbeat({
      entity: filePath,
      language: LANG_MAP[ext] || 'Unknown',
      project: projectName,
      isWrite,
    })
  }

  useEffect(() => { send(false) }, [filePath])

  return { onKeystroke: () => send(false), onSave: () => send(true) }
}