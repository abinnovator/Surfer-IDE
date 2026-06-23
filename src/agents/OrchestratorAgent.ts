import { ToolLoopAgent, tool, jsonSchema, stepCountIs } from 'ai'
import { getGroqModel } from './groqProvider'
import { createPlannerAgent } from './PlannerAgent'
import { createCoderAgent } from './CoderAgent'
import { createReviewerAgent } from './ReviewerAgent'

export function createOrchestratorAgent(
  workspaceRoot: string,
  sendUpdate: (msg: string) => void,
  projectContext: string =''
) {
  let totalTokens = 0

  const planner = createPlannerAgent(workspaceRoot, sendUpdate)
  const coder = createCoderAgent(workspaceRoot, sendUpdate)
  const reviewer = createReviewerAgent(workspaceRoot, sendUpdate)

  let plannerDone = false
  let coderDone = false
  let reviewerDone = false

  const agent = new ToolLoopAgent({
    model: getGroqModel('openai/gpt-oss-120b'),
    instructions: `You are the Lead Orchestrator for Surfer AI. Manage a coding task by delegating to sub-agents.

SEQUENCE: call_planner (optional) → call_coder → call_reviewer → done.
- Use call_planner for complex tasks that need a breakdown. Skip it for simple tasks.
- Always call call_coder with the plan (or the original task if you skipped planning).
- Always call call_reviewer with the coder's output.
- After the reviewer responds, write a short summary for the user. Do not call any more tools.
- IF you need to give one of your subagents context about the project layout and structure, use the following information: ${projectContext}`,
    stopWhen: stepCountIs(10),
    tools: {
      call_planner: tool({
        description: 'Send a task to the Planner Agent to get a technical breakdown. Only call this once.',
        inputSchema: jsonSchema<{ task: string }>({
          type: 'object',
          properties: {
            task: { type: 'string', description: 'The task to plan' },
          },
          required: ['task'],
        }),
        execute: async ({ task }: { task: string }) => {
          if (plannerDone) return 'Planning already done. Call call_coder now with the plan.'
          plannerDone = true
          sendUpdate('Planning architecture...')
          const result = await planner.generate({ prompt: task })
          totalTokens += result.usage?.totalTokens ?? 0
          return result.text
        }
      }),
      call_coder: tool({
        description: 'Send a plan or task to the Coder Agent to create files. Only call this once.',
        inputSchema: jsonSchema<{ plan: string }>({
          type: 'object',
          properties: {
            plan: { type: 'string', description: 'The plan or task for the coder' },
          },
          required: ['plan'],
        }),
        execute: async ({ plan }: { plan: string }) => {
          if (coderDone) return 'Coding already done. Call call_reviewer now with the result.'
          coderDone = true
          sendUpdate('Writing and creating files...')
          const result = await coder.generate({ prompt: plan })
          totalTokens += result.usage?.totalTokens ?? 0
          return result.text
        }
      }),
      call_reviewer: tool({
        description: 'Send code output to the Reviewer Agent for quality check.',
        inputSchema: jsonSchema<{ codeOrReport: string }>({
          type: 'object',
          properties: {
            codeOrReport: { type: 'string', description: 'The code or report to review' },
          },
          required: ['codeOrReport'],
        }),
        execute: async ({ codeOrReport }: { codeOrReport: string }) => {
          if (reviewerDone) return 'Review already done. Provide your final summary to the user now.'
          reviewerDone = true
          sendUpdate('Reviewing code quality...')
          const result = await reviewer.generate({ prompt: codeOrReport })
          totalTokens += result.usage?.totalTokens ?? 0
          return result.text
        }
      }),
    }
  })

  return { agent, getTokens: () => totalTokens }
}
