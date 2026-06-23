import { generateText, stepCountIs } from 'ai'
import { getGroqModel } from './groqProvider'
import { createWorkspaceTools } from './tools'

export function createReviewerAgent(workspaceRoot: string, sendUpdate: (msg: string) => void) {
  const tools = createWorkspaceTools(workspaceRoot, sendUpdate)

  return {
    generate: async ({ prompt }: { prompt: string }) => {
      return generateText({
        model: getGroqModel('openai/gpt-oss-120b'),
        system: `You are the code review agent for Surfer AI. Review the coder's output: check that all requested files were actually created, flag any issues, and suggest fixes if needed. Use read_file to inspect files. Return a concise review verdict.`,
        prompt,
        tools: {
          read_file: tools.read_file,
          ask_user: tools.ask_user,
        },
        stopWhen: stepCountIs(10),
      })
    }
  }
}
