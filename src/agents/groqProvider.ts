import { createGroq } from '@ai-sdk/groq'

let groqProvider: ReturnType<typeof createGroq> | null = null

export function initGroqProvider() {
  groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY! })
}

export function getGroqModel(modelName: string = 'openai/gpt-oss-120b') {
  if (!groqProvider) initGroqProvider()
  return groqProvider!(modelName)
}