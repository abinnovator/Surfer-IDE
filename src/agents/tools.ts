import { tool, jsonSchema } from 'ai'
import fs from 'fs'
import path from 'path'

export function createWorkspaceTools(workspaceRoot: string, sendUpdate: (msg: string) => void) {
  return {
    list_files: tool({
      description: 'List all files in the workspace',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
        required: [],
      }),
      execute: async (_args: Record<string, never>) => {
        sendUpdate('Listing workspace files...')
        const files = getAllFiles(workspaceRoot, workspaceRoot)
        return { entries: files }
      }
    }),

    read_file: tool({
      description: 'Read a file from the workspace',
      inputSchema: jsonSchema<{ path: string }>({
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file' },
        },
        required: ['path'],
      }),
      execute: async ({ path: filePath }: { path: string }) => {
        sendUpdate(`Reading: ${filePath}`)
        try {
          const content = fs.readFileSync(path.join(workspaceRoot, filePath), 'utf-8')
          return { content }
        } catch {
          return { content: `Could not read: ${filePath}` }
        }
      }
    }),

    create_file: tool({
      description: 'Create or overwrite a file in the workspace',
      inputSchema: jsonSchema<{ path: string; content: string }>({
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path for the new file' },
          content: { type: 'string', description: 'File content to write' },
        },
        required: ['path', 'content'],
      }),
      execute: async ({ path: filePath, content }: { path: string; content: string }) => {
        sendUpdate(`Creating: ${filePath}`)
        const fullPath = path.join(workspaceRoot, filePath)
        fs.mkdirSync(path.dirname(fullPath), { recursive: true })
        fs.writeFileSync(fullPath, content, 'utf-8')
        return { success: true, path: filePath }
      }
    }),

    create_folder: tool({
      description: 'Create a folder in the workspace',
      inputSchema: jsonSchema<{ path: string }>({
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path for the new folder' },
        },
        required: ['path'],
      }),
      execute: async ({ path: folderPath }: { path: string }) => {
        sendUpdate(`Creating folder: ${folderPath}`)
        fs.mkdirSync(path.join(workspaceRoot, folderPath), { recursive: true })
        return { success: true, path: folderPath }
      }
    }),

    ask_user: tool({
      description: 'Ask the user a question and get their input',
      inputSchema: jsonSchema<{ question: string }>({
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question to ask the user' },
        },
        required: ['question'],
      }),
      execute: async ({ question }: { question: string }) => {
        sendUpdate(`question:${question}`)
        return { answer: 'User input not yet implemented in desktop app' }
      }
    })
  }
}

export function getAllFiles(dir: string, root: string, files: string[] = []): string[] {
  const ignored = ['node_modules', '.git', 'out', 'dist', '.next']
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      if (ignored.includes(item)) continue
      const fullPath = path.join(dir, item)
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, root, files)
      } else {
        files.push(path.relative(root, fullPath))
      }
    }
  } catch {}
  return files
}
