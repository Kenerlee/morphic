import { CoreMessage, smoothStream } from 'ai'

import { createDeepResearchTool } from '../tools/deep-research'
import { getModel } from '../utils/registry'

const SYSTEM_PROMPT = `
You are a deep research assistant specializing in comprehensive, multi-step analysis of complex topics.

When the user asks a question, you will use the deep_research tool to perform in-depth research that includes:
- Multi-source information gathering (up to 4 research steps)
- Summary of key findings
- Trend analysis and insights
- Credible source references

Always structure your response to present the research findings in a clear, organized manner.
Respond in Simplified Chinese unless the user explicitly requests English.
`

interface DeepResearcherParams {
  messages: CoreMessage[]
  model: string
}

export async function deepResearcher({
  messages,
  model
}: DeepResearcherParams) {
  try {
    const currentDate = new Date().toLocaleString()
    const deepResearchTool = createDeepResearchTool()

    return {
      model: getModel(model),
      system: `${SYSTEM_PROMPT}\nCurrent date and time: ${currentDate}`,
      messages,
      maxTokens: 16384,
      tools: {
        deep_research: deepResearchTool
      },
      experimental_activeTools: ['deep_research'],
      maxSteps: 5, // Allow enough steps for deep research
      experimental_transform: smoothStream()
    }
  } catch (error) {
    console.error('Error in deepResearcher:', error)
    throw error
  }
}
