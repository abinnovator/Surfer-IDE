import { generateText, stepCountIs } from 'ai'
import { getGroqModel } from './groqProvider'
import { createWorkspaceTools } from './tools'
import { webSearch } from '@exalabs/ai-sdk'

export function createPlannerAgent(workspaceRoot: string, sendUpdate: (msg: string) => void) {
  const tools = createWorkspaceTools(workspaceRoot, sendUpdate)

  return {
    generate: async ({ prompt }: { prompt: string }) => {
      return generateText({
        model: getGroqModel('openai/gpt-oss-120b'),
        system: `You are the planner agent for Surfer AI. Break down the task into a clear, concrete technical plan: which files to create, what each file should contain, and what tech stack to use. Use list_files and read_file to understand existing code before planning. Use websearch only if you need documentation. Return a detailed plan — do not create any files yourself.`,
        prompt,
        tools: {
          list_files: tools.list_files,
          read_file: tools.read_file,
          ask_user: tools.ask_user,
          websearch: webSearch(),
        },
        stopWhen: stepCountIs(10),
      })
    }
  }
}
