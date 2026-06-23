interface SurferAPI {
  openFolder: () => Promise<string | null>
  readDir: (path: string) => Promise<FileEntry[]>
  readFile: (path: string) => Promise<string>
}

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  children?: FileEntry[]
  isOpen?: boolean
}

declare global {
  interface Window {
    surfer: SurferAPI
  }
}