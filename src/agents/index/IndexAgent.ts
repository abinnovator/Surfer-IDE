import {  generateText } from 'ai'
import { getGroqModel } from '../groqProvider'
import fs from 'fs'
import path from 'path'

const IGNORED = [
  'node_modules', '.git', 'dist', '.next', '.surfer',
  'dist-electron',  // electron build output
  'release',        // electron-builder output
  'out',            // another common build output
  '.vite',          // vite cache
  'build',          // generic build folder
  '.cache',         // various tool caches
  '.turbo',         // turborepo
  '.vercel',        // vercel output
  '__pycache__',    // python
  '.pytest_cache',  // python
  'target',         // rust
  'vendor',         // php/go
]
const SUPPORTED_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'py', 'cs', 'gd', 'rs', 'go', 'java', 'json', 'md', 'html', 'css', 'toml', 'yaml']
function detectStartCommand(workspaceRoot: string): string {
  const packageJsonPath = path.join(workspaceRoot, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (pkg.scripts?.dev) return 'npm run dev'
    if (pkg.scripts?.start) return 'npm start'
    if (pkg.scripts?.serve) return 'npm run serve'
  }

  if (fs.existsSync(path.join(workspaceRoot, 'project.godot'))) return 'godot .'

  if (fs.existsSync(path.join(workspaceRoot, 'main.py'))) return 'python main.py'
  if (fs.existsSync(path.join(workspaceRoot, 'app.py'))) return 'python app.py'

  if (fs.existsSync(path.join(workspaceRoot, 'Cargo.toml'))) return 'cargo run'

  if (fs.existsSync(path.join(workspaceRoot, 'go.mod'))) return 'go run .'

  return 'unknown'
}

interface FileIndex {
  path: string
  name: string
  extension: string
  summary: string
  exports: string[]
}

interface ProjectIndex {
  root: string
  generatedAt: string
  stack: string[]
  startCommand: string  // add this
  files: FileIndex[]
}

function getAllFiles(dir: string, root: string, files: string[] = []): string[] {
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      if (IGNORED.includes(item)) continue
      const fullPath = path.join(dir, item)
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, root, files)
      } else {
        const ext = item.split('.').pop() || ''
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push(path.relative(root, fullPath))
        }
      }
    }
  } catch (e)
  {
    // ignore read errors
  }
  return files
}


function detectStack (files: string[]): string[] {
  const stack: string[] = []
  if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) stack.push('TypeScript')
  if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) stack.push('JavaScript')
  if (files.some(f => f.endsWith('.py'))) stack.push('Python')
  if (files.some(f => f.endsWith('.gd'))) stack.push('Godot/GDScript')
  if (files.some(f => f.endsWith('.cs'))) stack.push('C#')
  if (files.some(f => f.endsWith('.cpp'))) stack.push('C Plus Plus')
  if (files.some(f => f.endsWith('.java'))) stack.push('Java')
  if (files.some(f => f === 'next.config.ts' || f === 'next.config.js')) stack.push('Next.js')
  if (files.some(f => f.endsWith('.tsx') || f.endsWith('.jsx'))) stack.push('React')
  if (files.some(f => f.endsWith('project.godot'))) stack.push('Godot 4')
  if (files.some(f => f === 'Cargo.toml')) stack.push('Rust')
  if (files.some(f => f === 'bun.lock')) stack.push('BUN')
  if (files.some(f => f === 'pnpm-lock.yaml')) stack.push('PNPM')
  if (files.some(f => f === 'package-lock.yaml')) stack.push('NPM')    
  return stack
}


async function summarizeFile (filePath: string , fileContent: string): Promise<string> {
  if (fileContent.length < 30) return 'Empty or minimal file'
  if (fileContent.length > 8000) fileContent = fileContent.slice(0, 8000) + '\n...(truncated)'
  try {
    const { text } = await generateText({
      model: getGroqModel('llama-3.3-70b-versatile'),
      prompt: `Summarize this file in one concise sentence. File: ${filePath}\n\n${fileContent}`,
      maxOutputTokens: 60,
    })
    return text.trim()
  } catch {
    return 'Could not summarize'
  }
}
export async function indexProject(
  workspaceRoot: string,
  onUpdate: (msg: string) => void
): Promise<ProjectIndex> {
  onUpdate('Scanning files...')
  const files = getAllFiles(workspaceRoot, workspaceRoot)
  const stack = detectStack(files)

  onUpdate(`Found ${files.length} files. Detected: ${stack.join(', ') || 'unknown stack'}`)

  const indexed: FileIndex[] = []

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    onUpdate(`Indexing ${i + 1}/${files.length}: ${filePath}`)

    try {
      const content = fs.readFileSync(path.join(workspaceRoot, filePath), 'utf-8')
      const summary = await summarizeFile(filePath, content)

      indexed.push({
        path: filePath,
        name: path.basename(filePath),
        extension: filePath.split('.').pop() || '',
        summary,
        exports: [],
      })
    } catch {
      // skip unreadable files
    }
  }

  const index: ProjectIndex = {
    root: workspaceRoot,
    generatedAt: new Date().toISOString(),
    stack,
    startCommand: detectStartCommand(workspaceRoot),  // add this
    files: indexed,
  }

  const surferDir = path.join(workspaceRoot, '.surfer')
  fs.mkdirSync(surferDir, { recursive: true })
  fs.writeFileSync(path.join(surferDir, 'index.json'), JSON.stringify(index, null, 2), 'utf-8')

  const gitignorePath = path.join(workspaceRoot, '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8')
    if (!gitignore.includes('.surfer')) {
      fs.appendFileSync(gitignorePath, '\n.surfer\n')
    }
  }

  onUpdate(`Done! Indexed ${indexed.length} files.`)
  return index
}