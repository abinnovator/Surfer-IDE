import { app, BrowserWindow, ipcMain, dialog, safeStorage, Menu, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import os from 'os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import SpotifyWebApi from 'spotify-web-api-node'

const execAsync = promisify(exec)



const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

dotenv.config({
  path: app.isPackaged 
    ? path.join(process.resourcesPath, '.env')
    : path.join(__dirname, '..', '.env')
})
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let settingsWin: BrowserWindow | null = null
const shellExecutable = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
let ptyProcess: any = null
const tokenPath = path.join(app.getPath('userData'), 'token.enc')
const recentFoldersPath = path.join(app.getPath('userData'), 'recent-folders.json')

function getRecentFolders(): string[] {
  if (!fs.existsSync(recentFoldersPath)) return []
  try { return JSON.parse(fs.readFileSync(recentFoldersPath, 'utf-8')) } catch { return [] }
}

function addRecentFolder(folderPath: string): void {
  const recent = getRecentFolders().filter(p => p !== folderPath)
  recent.unshift(folderPath)
  fs.writeFileSync(recentFoldersPath, JSON.stringify(recent.slice(0, 10), null, 2))
}

ipcMain.handle('recent-folders:get', () => getRecentFolders())
ipcMain.handle('recent-folders:add', (_, folderPath: string) => addRecentFolder(folderPath))
// In dev stuff
ipcMain.handle('ai:get-inline-suggestion', async (_, payload: {
  filePath: string
  fileContent: string
  token: string
  cursorPosition: { line: number, column: number }
  packId?: string
  workspaceRoot?: string
}) => {
  const { createGroq } = await import('@ai-sdk/groq')
  const { generateText } = await import('ai')
  const { Pool } = await import('pg')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE api_token = $1',
      [payload.token.trim()]
    )
    const user = rows[0]

    if (!user) {
      return { suggestion: null, error: 'Invalid token' }
    }

    const PLAN_LIMITS: Record<string, number> = {
      free: 1_000_000,
      pro: 5_000_000,
      max: 20_000_000,
    }
    const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free
    if (user.token_spend >= limit) {
      return { suggestion: null, error: 'Token limit reached' }
    }

    const lines = payload.fileContent.split('\n')
    const beforeCursor = lines
      .slice(0, payload.cursorPosition.line - 1)
      .join('\n') + '\n' + (lines[payload.cursorPosition.line - 1]?.substring(0, payload.cursorPosition.column) ?? '')
    const afterCursor = (lines[payload.cursorPosition.line - 1]?.substring(payload.cursorPosition.column) ?? '') +
      '\n' + lines.slice(payload.cursorPosition.line).join('\n')
    console.log('beforeCursor (last 200 chars):', beforeCursor.slice(-200))
    console.log('afterCursor (first 100 chars):', afterCursor.slice(0, 100))
    let projectContext = ''
    if (payload.workspaceRoot) {
      const indexPath = path.join(payload.workspaceRoot, '.surfer', 'index.json')
      if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        projectContext = `Project Stack: ${index.stack.join(', ')}\nFiles:\n${index.files.map((f: any) => `- ${f.path}: ${f.summary}`).join('\n')}`
      }
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
    let model = 'llama-3.1-8b-instant'
    const packPath = payload.packId && payload.workspaceRoot
      ? path.join(payload.workspaceRoot, '.surfer', 'packs', `${payload.packId}.json`)
      : null
    if (packPath && fs.existsSync(packPath)) {
      const packData = JSON.parse(fs.readFileSync(packPath, 'utf-8'))
      model = packData.data.aiProfile.model ?? model
    }
    console.log('cursorPosition:', payload.cursorPosition)
    const { text, usage } = await generateText({
      model: groq(model),
      system: `You are a code completion engine. Your ONLY job is to complete the text immediately after the cursor. 
  - Look at where the cursor is in "Code before cursor" 
  - Complete ONLY what comes next at that exact position
  - Return the completion text only — no explanation, no markdown, no backticks
  - Maximum 1-2 lines
  - Do NOT suggest unrelated code`,

  prompt:`You are completing code mid-stream. The | marks exactly where the cursor is. Complete ONLY the missing characters — do not rewrite or paraphrase what comes after |.

${beforeCursor.slice(-300)}|${afterCursor.slice(0, 100)}

The text after | already exists. Only return what's missing at |. If the word is already complete after |, return nothing.`,
      maxOutputTokens: 600,
    })
    console.log('raw text from model:', JSON.stringify(text))
    console.log('usage:', usage)

    await pool.query(
      'UPDATE users SET token_spend = token_spend + $1 WHERE id = $2',
      [usage.totalTokens, user.id]
    )

    return { suggestion: text.trim(), error: null }

  } catch (err) {
    console.error('ai:get-inline-suggestion error:', err)
    return { suggestion: null, error: 'Something went wrong' }
  } finally {
    await pool.end()
  }
})
// Terminal
ipcMain.handle('terminal:create', async (_, workspaceRoot: string) => {
  const pty = await import('node-pty')
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
  ptyProcess = pty.default.spawn(shellExecutable, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: workspaceRoot ?? process.env.HOME,
    env: process.env as Record<string, string>,
  })
  ptyProcess.onData((data: string) => {
    win?.webContents.send('terminal:data', data)
  })
})

ipcMain.handle('terminal:write', (_, data: string) => {
  ptyProcess?.write(data)
})

ipcMain.handle('terminal:resize', (_, cols: number, rows: number) => {
  ptyProcess?.resize(cols, rows)
})

ipcMain.handle('terminal:run', async (_, cwd: string, command: string) => {
  if (!ptyProcess) {
    const pty = await import('node-pty')
    ptyProcess = pty.default.spawn(shellExecutable, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as Record<string, string>,
    })
    ptyProcess.onData((data: string) => {
      win?.webContents.send('terminal:data', data)
    })
    await new Promise(r => setTimeout(r, 300))
  }
  ptyProcess.write(`${command}\r`)
})

// Hackatime Stuff
ipcMain.handle('store-hackatime-token', (_, token: string) => {
  const encrypted = safeStorage.encryptString(token)
  fs.writeFileSync(path.join(app.getPath('userData'), 'hackatime-token.enc'), encrypted)
})
ipcMain.handle('get-hackatime-token', () => {
  return getHacktimeToken()
})
// Aliases matching preload naming convention
ipcMain.handle('hackatime:store-token', (_, token: string) => {
  const encrypted = safeStorage.encryptString(token)
  fs.writeFileSync(path.join(app.getPath('userData'), 'hackatime-token.enc'), encrypted)
})
ipcMain.handle('hackatime:get-token', () => {
  return getHacktimeToken()
})
async function getHacktimeToken(): Promise<string | null> {
  const tokenFilePath = path.join(app.getPath('userData'), 'hackatime-token.enc')
  if (!fs.existsSync(tokenFilePath)) return null
  const encrypted = fs.readFileSync(tokenFilePath)
  return safeStorage.decryptString(Buffer.from(encrypted))
}
ipcMain.handle('hackatime:delete-token', () => {
  const tokenFilePath = path.join(app.getPath('userData'), 'hackatime-token.enc')
  if (fs.existsSync(tokenFilePath)) {
    fs.unlinkSync(tokenFilePath)
  } 
})
async function sendHackatimeHeartbeat(payload: {
  entity: string
  language: string
  project: string
  isWrite: boolean
}) {
  const apiKey = await getHacktimeToken()
  if (!apiKey) return

  try {
    const url = `https://hackatime.hackclub.com/api/hackatime/v1/users/current/heartbeats?api_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: payload.entity,
        type: 'file',
        language: payload.language,
        project: payload.project,
        time: Date.now() / 1000,
        is_write: payload.isWrite,
        editor: 'Surfer',
        plugin: 'surfer-ide/0.1.0',
      })
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('hackatime heartbeat error:', res.status, body)
    }
  } catch (err) {
    console.error('hackatime heartbeat failed:', err)
  }
}
async function getTodaysStats(): Promise<Record<string, unknown> | null> {
  const apiKey = await getHacktimeToken()
  if (!apiKey) return null

  try {
    const url = `https://hackatime.hackclub.com/api/hackatime/v1/users/current/statusbar/today?api_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text()
      console.error('hackatime stats error:', res.status, body)
      return null
    }
    const data = await res.json()
    console.log('hackatime stats data:', JSON.stringify(data))
    return data
  } catch (err) {
    console.error('hackatime stats failed:', err)
    return null
  }
}
ipcMain.handle('hackatime:get-todays-stats', async () => {
  return getTodaysStats()
})

ipcMain.handle('hackatime:heartbeat', async (_, payload: {
  entity: string
  language: string
  project: string
  isWrite: boolean
}) => {
  await sendHackatimeHeartbeat(payload)
})
// AI stuff
ipcMain.handle('store-token', (_, token: string) => {
  const encrypted = safeStorage.encryptString(token)
  fs.writeFileSync(tokenPath, encrypted)
})

ipcMain.handle('get-token', () => {
  if (!fs.existsSync(tokenPath)) return null
  const encrypted = fs.readFileSync(tokenPath)
  return safeStorage.decryptString(Buffer.from(encrypted))
})

ipcMain.handle('delete-token', () => {
  if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath)
})


ipcMain.handle('ai:chat', async (event, payload: { messages: any[], token: string, workspaceRoot: string, packId?: string }) => {
  const { createGroq } = await import('@ai-sdk/groq')
  const { streamText } = await import('ai')
  const { Pool } = await import('pg')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const token = payload.token?.trim() ?? ''
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE api_token = $1',
      [token]
    )
    const user = rows[0]

    if (!user) {
      event.sender.send('ai:chunk', 'Error: Invalid token. Make sure you copied your token correctly from surfer.aaditbhambri.com/token')
      event.sender.send('ai:done')
      return
    }

    const PLAN_LIMITS: Record<string, number> = {
      free: 1_000_000,
      pro: 5_000_000,
      max: 20_000_000,
    }
    const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free
    if (user.token_spend >= limit) {
      event.sender.send('ai:chunk', 'Error: Token limit reached. Please upgrade your plan.')
      event.sender.send('ai:done')
      return
    }

    let projectContext = ''
    if (payload.workspaceRoot) {
      const indexPath = path.join(payload.workspaceRoot, '.surfer', 'index.json')
      if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        projectContext = `
Project Stack: ${index.stack.join(', ')}
Project Files:
${index.files.map((f: any) => `- ${f.path}: ${f.summary}`).join('\n')}`
      }
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
    let model = 'openai/gpt-oss-120b'
    let systemPrompt = ''

    const packPath = payload.packId && payload.workspaceRoot
      ? path.join(payload.workspaceRoot, '.surfer', 'packs', `${payload.packId}.json`)
      : null

    if (packPath && fs.existsSync(packPath)) {
      const packData = JSON.parse(fs.readFileSync(packPath, 'utf-8'))
      const specialPrompt = packData.data.aiProfile.systemPrompt
      model = packData.data.aiProfile.model
      systemPrompt = `${specialPrompt}${projectContext ? `\nProject context:\n${projectContext}` : '\nNo project indexed yet. Ask the user to click the index button.'}`
    } else {
      systemPrompt = `You are Surfer AI, a coding assistant built into the Surfer IDE. Your north star: your editor should understand what you're building, not just what you're typing. Be concise, helpful, and context-aware. Respond in markdown format and include code snippets when relevant.
${projectContext ? `\nProject context:\n${projectContext}` : '\nNo project indexed yet. Ask the user to click the index button.'}`
    }
    const result = streamText({
      model: groq(model),
      system: systemPrompt,
      messages: payload.messages,
    })

    for await (const chunk of result.textStream) {
      event.sender.send('ai:chunk', chunk)
    }

    const usage = await result.usage
    await pool.query(
      'UPDATE users SET token_spend = token_spend + $1 WHERE id = $2',
      [usage.totalTokens, user.id]
    )

    event.sender.send('ai:done')

  } catch (err) {
    console.error('ai:chat error:', err)
    event.sender.send('ai:chunk', 'Error: Something went wrong.')
    event.sender.send('ai:done')
  } finally {
    await pool.end()
  }
})

ipcMain.handle('ai:get-percentage-used', async (_, token: string) => {
  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    ssl: { rejectUnauthorized: false }
  })
  try{
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE api_token = $1',
      [token]
    )
    const user = rows[0]

    if (!user) {

      return
    }

    const PLAN_LIMITS: Record<string, number> = {
      free: 1_000_000,
      pro: 5_000_000,
      max: 20_000_000,
    }
    const percentageUsed = Math.min((user.token_spend / (PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free)) * 100, 100)
    return percentageUsed
  }catch(err){
    console.error('ai:get-percentage-used error:', err)
  }
})

ipcMain.handle('agent:run', async (event, payload: { task: string, workspaceRoot: string }) => {
  const { createOrchestratorAgent } = await import('../src/agents/OrchestratorAgent')

  const sendUpdate = (msg: string) => event.sender.send('agent:update', msg)

  let projectContext = ''
  const indexPath = path.join(payload.workspaceRoot, '.surfer', 'index.json')
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    projectContext = `
Project Stack: ${index.stack.join(', ')}
Project Files:
${index.files.map((f: any) => `- ${f.path}: ${f.summary}`).join('\n')}`
  }

  const { agent, getTokens } = createOrchestratorAgent(payload.workspaceRoot, sendUpdate, projectContext)
  const result = await agent.generate({ prompt: payload.task })
  event.sender.send('agent:done', { result: result.text, tokens: getTokens() })
})


ipcMain.handle('project:index', async (event, workspaceRoot: string) => {
  const { indexProject } = await import('../src/agents/index/IndexAgent')
  const onUpdate = (msg: string) => event.sender.send('index:update', msg)
  const index = await indexProject(workspaceRoot, onUpdate)
  return index
})

// FIle shit
ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (result.canceled) return null
  return result.filePaths[0]
})
ipcMain.handle('create-folder', async (_, parentPath: string, folderName: string) => {
  const newFolderPath = path.join(parentPath, folderName)
  if (!fs.existsSync(newFolderPath)) {
    fs.mkdirSync(newFolderPath)
  }
})
ipcMain.handle("create-file", async (_, parentPath: string, fileName: string) => {
  const newFilePath = path.join(parentPath, fileName)
  if (!fs.existsSync(newFilePath)) {
    fs.writeFileSync(newFilePath, '', 'utf-8')
  }})
ipcMain.handle('read-dir', async (_, dirPath: string) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  return entries.map(entry => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    isDirectory: entry.isDirectory(),
  }))
})

ipcMain.handle('run-command', (_, folderPath: string, command: string) => {
  ptyProcess?.write(`cd "${folderPath}" && ${command}\r`)
})

ipcMain.handle('read-file', async (_, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8')
})
ipcMain.handle("delete-file", async (_, filePath: string) => {
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
    return true
  }
})

function findProjectRoot(startDir: string): string {
  let dir = startDir
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return dir
    dir = path.dirname(dir)
  }
  return startDir
}

async function getDiagnostics(filePath: string): Promise<string> {
  const fileDir = path.dirname(filePath)
  const projectRoot = findProjectRoot(fileDir)
  const results: string[] = []

  try {
    await execAsync(`npx eslint --fix "${filePath}"`, { cwd: fileDir })
  } catch (err: any) {
    const out = (err.stdout ?? '').toString().trim()
    if (out) results.push(out)
  }

  try {
    await execAsync(`npx tsc --noEmit --pretty false`, { cwd: projectRoot })
  } catch (err: any) {
    const out = (err.stdout ?? err.stderr ?? '').toString()
    const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/')
    const filtered = out
      .split('\n')
      .filter((line: string) => line.includes(rel) || line.includes(path.basename(filePath)))
      .join('\n')
      .trim()
    if (filtered) results.push(filtered)
  }

  return results.join('\n')
}

async function formatFile(filePath: string): Promise<string | null> {
  try {
    const prettier = await import('prettier')
    const content = fs.readFileSync(filePath, 'utf-8')
    
    const info = await prettier.getFileInfo(filePath)
    if (!info.inferredParser) return null 
    
    const formatted = await prettier.format(content, {
      parser: info.inferredParser,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
    })
    return formatted
  } catch (err) {
    console.error('prettier error:', err)
    return null
  }
}
ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8')

  const formatted = await formatFile(filePath)
  if (formatted && formatted !== content) {
    fs.writeFileSync(filePath, formatted, 'utf-8')
  }

  getDiagnostics(filePath).then(output => {
    win?.webContents.send('diagnostics:result', { filePath, output })
  })

  return formatted ?? content
})

ipcMain.handle('lint-file', async (_, filePath: string) => {
  return getDiagnostics(filePath)
})

// tasks 

ipcMain.handle('task:get-tasks', async () => {})
ipcMain.handle('task:create-task', async () => {})
ipcMain.handle('task:update-task', async () => {})


// Pack shit

ipcMain.handle('get-packs', async () => {
  const res = await fetch('https://surfer.aaditbhambri.com/api/packs')
  const { packs } = await res.json()
  return packs
})


ipcMain.handle('install-pack', async (_, packId: string, workspaceRoot: string) => {
  console.log(`Installing pack: ${packId}`)
  const res = await fetch(`https://surfer.aaditbhambri.com/api/packs/${packId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch pack "${packId}": ${res.status} ${res.statusText}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const body = await res.text()
    throw new Error(`Pack API returned non-JSON response for "${packId}": ${body.slice(0, 200)}`)
  }
  const { pack } = await res.json()
  console.log(`Pack data received: ${pack}`)
  const packDir = path.join(workspaceRoot, '.surfer', 'packs')
  if (!fs.existsSync(packDir)) fs.mkdirSync(packDir, { recursive: true })
  fs.writeFileSync(path.join(packDir, `${packId}.json`), JSON.stringify(pack, null, 2), 'utf-8')
  return pack
}
)
ipcMain.handle('check-pack-installed', async (_, packId: string, workspaceRoot: string) => {
  const packPath = path.join(workspaceRoot, '.surfer', 'packs', `${packId}.json`)
  const exists = fs.existsSync(packPath);
  return exists
})

ipcMain.handle('get-installed-pack-details', async (_, packId:string, workspaceRoot: string )=> {
  const packPath = path.join(workspaceRoot, '.surfer', 'packs', `${packId}.json`)
  const content =  fs.readFileSync(packPath, 'utf-8')
  console.log(content)
  return content
})

// Window stuff
ipcMain.handle('settings-window: close', () => {
  if (settingsWin) {
    settingsWin.close()
    settingsWin = null
  }
})
ipcMain.handle('window:minimize', () => win?.minimize())
ipcMain.handle('window:maximize', () => {
  if (win?.isMaximized()) win?.unmaximize()
  else win?.maximize()
})
ipcMain.handle('window:close', () => win?.close())
ipcMain.handle('window:is-maximized', () => win?.isMaximized())
ipcMain.handle("window:hide", () => win?.minimize())

// Indexing stuff

ipcMain.handle('read-all-files', async (_, dirPath: string) => {
  const ignored = ['node_modules', '.git', 'dist', '.next', '.surfer']
  
  const walk = (dir: string): any[] => {
    const results: any[] = []
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (ignored.includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...walk(fullPath))
        } else {
          results.push({
            name: entry.name,
            path: fullPath,
            isDirectory: false,
          })
        }
      }
    } catch {
      console.log(`Failed to read directory: ${dir}`)
    }
    return results
  }

  return walk(dirPath)
})
ipcMain.handle('check-if-index-exists', async (_, workspaceRoot: string) => {
  const indexPath = path.join(workspaceRoot, '.surfer', 'index.json')
  return fs.existsSync(indexPath)
})

ipcMain.handle('get-index', async (_, workspaceRoot: string) => {
  const indexPath = path.join(workspaceRoot, '.surfer', 'index.json')
  if (!fs.existsSync(indexPath)) return null
  const content = fs.readFileSync(indexPath, 'utf-8')
  return JSON.parse(content)
})
// Window shit
ipcMain.handle('create-window', async () => {
  createWindow()
})

ipcMain.handle('window:open-settings', () => {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus()
    return
  }
  settingsWin = new BrowserWindow({
    width: 720,
    height: 520,
    resizable: false,
    icon: path.join(process.env.VITE_PUBLIC, 'wave.svg'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    titleBarStyle: 'hidden',
    title: 'Settings',
  })
  settingsWin.once('ready-to-show', () => settingsWin?.show())
  settingsWin.on('closed', () => { settingsWin = null })
  if (VITE_DEV_SERVER_URL) {
    settingsWin.loadURL(VITE_DEV_SERVER_URL + '#settings')
  } else {
    settingsWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'settings' })
  }
})

// Theme shit
ipcMain.handle('create-theme', async (_, themeData: {id: string, name: string, colors: {background: string, titlebar: string, sidebar: string, border: string, accent: string,text: string, textMuted: string, textDim: string,}, videoUrl: string}, workspaceRoot: string) => {
  const themesDir = path.join(workspaceRoot, '.surfer', 'themes')
  if (!fs.existsSync(themesDir)) fs.mkdirSync(themesDir, { recursive: true })
  const themePath = path.join(themesDir, `${themeData.id}.json`)
  fs.writeFileSync(themePath, JSON.stringify(themeData))
})
ipcMain.handle('dev:open-devtools', () => {
  win?.webContents.openDevTools()
})
ipcMain.handle('get-specific-theme', (_, id: string) => {
  return getSpecificTheme(id)
})
ipcMain.handle('get-active-theme-id', () => {
  return getActiveThemeID()
})
ipcMain.handle('update-active-theme-id', (_, id: string) => {
  updateActiveThemeID(id)
})
ipcMain.handle('get-all-themes', () => {
  return getAllThemes()
})
function getSpecificTheme(id: string): Record<string, unknown> | null {
  const themePath = path.join(process.env.VITE_PUBLIC, 'themes', `${id}.json`)
  if (!fs.existsSync(themePath)) return null
  const content = fs.readFileSync(themePath, 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}
function getActiveThemeID(): string | null {
  const themePath = path.join(process.env.VITE_PUBLIC, 'themes', 'index.json')
  if (!fs.existsSync(themePath)) return null
  const content = fs.readFileSync(themePath, 'utf-8')
  return (JSON.parse(content) as { activeTheme: string }).activeTheme
}
function updateActiveThemeID(id: string): void {
  const themePath = path.join(process.env.VITE_PUBLIC, 'themes', 'index.json')
  const existing = fs.existsSync(themePath) ? JSON.parse(fs.readFileSync(themePath, 'utf-8')) : {}
  fs.writeFileSync(themePath, JSON.stringify({ ...existing, activeTheme: id }, null, 2))
}
function getAllThemes() {
  const themesDir = path.join(process.env.VITE_PUBLIC, 'themes','index.json')
  if (!fs.existsSync(themesDir)) return []
  const content = fs.readFileSync(themesDir, 'utf-8')
  const parsedContent =  JSON.parse(content).themes;
  return parsedContent
}


// Source control stuff oh god ts gonna be annoying
async function getGitExists(workspaceRoot: string): Promise<{ there: boolean; reason?: string, remoteUrl?: string} > {
  const {simpleGit} = await import('simple-git')
  try {
    const folderPath = path.join(workspaceRoot, '.git')
    const getDirExists = fs.existsSync(folderPath)
    if (!getDirExists) {
      return { there: false, reason: 'No .git folder found' }
    }
    const git = simpleGit(workspaceRoot)
    // check if folder has remote links adskads
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');

    if (!origin || !origin.refs.fetch) {
      return { there: false, reason: 'No remote origin configuration found' };
    }
    return { 
      there: true, 
      remoteUrl: origin.refs.fetch 
    };
    

  } catch (error) {
    return { there: false, reason: 'Error occurred while checking for .git folder' }
  }

}
ipcMain.handle('git:check-exists', async (_, workspaceRoot: string) => {
  return await getGitExists(workspaceRoot)
})
ipcMain.handle('git:get-uncommitted-changes', async (_, workspaceRoot: string) => {
  const {simpleGit} = await import('simple-git')
   try {
    const git = simpleGit(workspaceRoot);
    const status = await git.status();

    const changes = [
      ...status.not_added.map(file => ({ file, status: 'untracked' })),
      ...status.modified.map(file => ({ file, status: 'modified' })),
      ...status.created.map(file => ({ file, status: 'created' })),
      ...status.deleted.map(file => ({ file, status: 'deleted' })),
      ...status.renamed.map(file => ({ file, status: 'renamed' }))
    ];

    return {
      isClean: status.isClean(),
      ahead: status.ahead,
      behind: status.behind,
      currentBranch: status.current,
      changes // Array of { file, status }
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
})
ipcMain.handle('git:commit-changes', async (_, workspaceRoot: string, message: string) => {
  const {simpleGit} = await import('simple-git')
  try {
    const git = simpleGit(workspaceRoot);
    await git.add('.');
    const commitSummary = await git.commit(message);
    const gitPush = await git.push();
    return { success: true, commitSummary, gitPush };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
})
interface searchIndex {
  path: string,
  lines: string[]
}
let searchIndexData: searchIndex[] = []
function buildSearchIndex(workspaceRoot: string): { success: boolean, indexedFiles: number } {
  const ignored = ['node_modules', '.git', 'dist', '.next', '.surfer', 'dist-electron', '.release','.godot','.next','.vite','.vscode','.idea','__pycache__','venv','.venv','.mypy_cache','.pytest_cache']
  const index: searchIndex[] = []
  const indexed = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (ignored.includes(entry.name)) continue  // fixed
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          indexed(fullPath)
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            index.push({ path: fullPath, lines: content.split('\n') })
          } catch (error) {
            console.error(`Error reading file ${fullPath}:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error)
    }
  }
  indexed(workspaceRoot)
  searchIndexData = index
  return { success: true, indexedFiles: index.length }
}
ipcMain.handle('search:build-index', async (_, workspaceRoot: string) => {
  const result = await  buildSearchIndex(workspaceRoot)
  return result
})
ipcMain.handle("search:query", async (_, workspaceRoot: string, query: string) => {
  if (!searchIndexData.length) {
    await buildSearchIndex(workspaceRoot)
  }
  
  const results: { filePath: string, line: number, content: string }[] = []
  
  for (const file of searchIndexData) {
    file.lines.forEach((line, i) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        results.push({ filePath: file.path, line: i + 1, content: line.trim() })
      }
    })
  }
  
  return results.slice(0, 200)
})

// Terminal and shell stuff
ipcMain.handle('shell:open-external', async (_, url: string) => {
  await shell.openExternal(url)
})

ipcMain.handle('shell:open-folder', async (_, folderPath: string) => {
  await shell.openPath(folderPath)
})


// Spotify auth stuff
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('surfer', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('surfer')
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  const callbackUrl = new URL(url)
  const code = callbackUrl.searchParams.get('code')
  if (code) {
    win?.webContents.send('spotify:callback', code)
  }
})
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('surfer://'))
    if (url) {
      const callbackUrl = new URL(url)
      const code = callbackUrl.searchParams.get('code')
      if (code) win?.webContents.send('spotify:callback', code)
    }
    win?.focus()
  })
}

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'surfer://spotify-callback'
})
ipcMain.handle('spotify:is-connected', () => {
  return !!spotifyApi.getAccessToken()
})
ipcMain.handle('spotify:get-auth-url', () => {
  return spotifyApi.createAuthorizeURL([
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
  ], 'surfer-state')
})

// exchange code for tokens
ipcMain.handle('spotify:exchange-code', async (_, code: string) => {
  const data = await spotifyApi.authorizationCodeGrant(code)
  spotifyApi.setAccessToken(data.body.access_token)
  spotifyApi.setRefreshToken(data.body.refresh_token)
  try {
    const me = await spotifyApi.getMe()
    console.log('spotify authorized as', me.body.id, me.body.email, 'product:', me.body.product)
  } catch (err) {
    const { statusCode, body } = err as { statusCode?: number; body?: unknown }
    console.error('spotify:get-me failed', statusCode, body)
  }
  return { success: true }
})

ipcMain.handle('spotify:get-playback', async () => {
  try {
    const data = await spotifyApi.getMyCurrentPlaybackState()
    return data.body
  } catch (err) {
    const { statusCode, body } = err as { statusCode?: number; body?: unknown }
    console.error('spotify:get-playback failed', statusCode, body)
    return { error: statusCode ?? 0 }
  }
})

ipcMain.handle('spotify:play', async () => spotifyApi.play())
ipcMain.handle('spotify:pause', async () => spotifyApi.pause())
ipcMain.handle('spotify:next', async () => spotifyApi.skipToNext())
ipcMain.handle('spotify:previous', async () => spotifyApi.skipToPrevious())
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'wave.svg'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webSecurity: false,
    },
    titleBarStyle: 'hidden',
    
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
})
