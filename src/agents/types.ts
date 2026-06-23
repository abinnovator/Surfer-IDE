export interface AgentUpdate {
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

export type OnUpdate = (update: AgentUpdate) => void

export interface TaskContext {
  userRequest: string
  workspaceFiles: string[]
  workspaceRoot: string
}