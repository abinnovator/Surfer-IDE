import { generateText, tool, jsonSchema } from 'ai'
import { getGroqModel } from './groqProvider'
import { createWorkspaceTools } from './tools'
import { webSearch } from '@exalabs/ai-sdk'
import fs from 'fs'
import path from 'path'

export function createCoderAgent(workspaceRoot: string, sendUpdate: (msg: string) => void) {
  const tools = createWorkspaceTools(workspaceRoot, sendUpdate)

  return {
    generate: async ({ prompt }: { prompt: string }) => {
      let finished = false
      let filesCreated = 0

      return generateText({
        model: getGroqModel('openai/gpt-oss-120b'),
        system: `You are a programming agent. Your only job is to write files to disk.

- Call create_file for every file. Do NOT describe files in text — write them.
- Call create_folder before create_file when the directory does not exist.
- Call finish only AFTER all files have been created. Calling finish with no files created will fail.
- You must call a tool in every response.`,
        prompt,
        toolChoice: 'required',
        tools: {
          list_files: tools.list_files,
          read_file: tools.read_file,
          create_folder: tools.create_folder,
          websearch: webSearch(),
          create_file: tool({
            description: 'Create or overwrite a file in the workspace. Call this for every file.',
            inputSchema: jsonSchema<{ path: string; content: string }>({
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Relative path for the new file' },
                content: { type: 'string', description: 'Full file content to write' },
              },
              required: ['path', 'content'],
            }),
            execute: async ({ path: filePath, content }: { path: string; content: string }) => {
              filesCreated++
              sendUpdate(`Creating: ${filePath}`)
              const fullPath = path.join(workspaceRoot, filePath)
              fs.mkdirSync(path.dirname(fullPath), { recursive: true })
              fs.writeFileSync(fullPath, content, 'utf-8')
              return { success: true, path: filePath }
            }
          }),
          finish: tool({
            description: 'Signal that all files have been created. Only call this after create_file has been called at least once.',
            inputSchema: jsonSchema<{ summary: string }>({
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'Short summary of what was created' },
              },
              required: ['summary'],
            }),
            execute: async ({ summary }: { summary: string }) => {
              if (filesCreated === 0) {
                return { error: 'No files have been created yet. You must call create_file before calling finish.' }
              }
              finished = true
              sendUpdate(`Done creating ${filesCreated} file(s).`)
              return { done: true, summary }
            }
          }),
        },
        stopWhen: () => finished,
      })
    }
  }
}
