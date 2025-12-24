import { tool } from 'ai'
import { z } from 'zod'

const SKILLS_API_URL = process.env.SKILLS_API_URL || 'http://localhost:8000'
const HOMESTAY_SKILL_ID = 'skill_015FtmDcs3NUKhwqTgukAyWc'

/**
 * Parse SSE stream from Skills API and extract text content
 */
async function parseSSEStream(response: Response): Promise<{
  textContent: string
  model?: string
  containerId?: string
  usage?: { input_tokens: number; output_tokens: number }
  fileIds?: string[]
}> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let textParts: string[] = []
  let model: string | undefined
  let containerId: string | undefined
  let usage: { input_tokens: number; output_tokens: number } | undefined
  let fileIds: string[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        // Skip keepalive comments and empty lines
        if (!line || line.startsWith(': keepalive')) continue

        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            const eventType = data.type

            if (eventType === 'text_delta') {
              const text = data.delta || data.text || ''
              if (text) textParts.push(text)
            } else if (eventType === 'done') {
              model = data.model
              containerId = data.container_id
              usage = data.usage
              fileIds = data.file_ids || []
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return {
    textContent: textParts.join(''),
    model,
    containerId,
    usage,
    fileIds
  }
}

/**
 * Homestay skill tool that calls the external Skills API
 * for data-driven homestay investment decision support.
 * Uses streaming endpoint to handle long-running skill executions.
 */
export const homestaySkillTool = tool({
  description:
    'Call the Homestay Market Entry skill to get data-driven investment analysis and market research for homestay/民宿 investment decisions. Use this after collecting user requirements.',
  parameters: z.object({
    location: z.string().describe('Target location for homestay investment (e.g., 郑州大学附近, 杭州西湖区)'),
    budget: z.string().optional().describe('Investment budget range'),
    homestayType: z.string().optional().describe('Type of homestay (e.g., 公寓, 别墅, 民宿)'),
    targetCustomers: z.string().optional().describe('Target customer segments'),
    additionalRequirements: z.string().optional().describe('Any additional requirements or focus areas')
  }),
  execute: async ({ location, budget, homestayType, targetCustomers, additionalRequirements }) => {
    try {
      // Construct the message for the skill
      const messageParts = [
        `请对【${location}】的民宿投资市场进行全面分析。`
      ]

      if (budget) {
        messageParts.push(`投资预算范围：${budget}`)
      }
      if (homestayType) {
        messageParts.push(`民宿类型：${homestayType}`)
      }
      if (targetCustomers) {
        messageParts.push(`目标客群：${targetCustomers}`)
      }
      if (additionalRequirements) {
        messageParts.push(`其他需求：${additionalRequirements}`)
      }

      messageParts.push(
        '请提供以下分析：',
        '1. 区位分析：地理位置、交通便利性、周边配套',
        '2. 市场规模：民宿市场容量、增长趋势',
        '3. 竞争格局：主要竞争对手、定价策略',
        '4. 目标客群：客源结构、消费特征',
        '5. 投资建议：投资回报预测、风险评估、运营建议'
      )

      const message = messageParts.join('\n')

      console.log(`[Homestay Skill] Calling Skills API at ${SKILLS_API_URL}/stream/invoke`)

      // Call the Skills API streaming endpoint (supports long-running executions)
      const response = await fetch(`${SKILLS_API_URL}/stream/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skill_ids: [HOMESTAY_SKILL_ID],
          message: message,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Skills API request failed: ${response.status} - ${errorText}`)
      }

      // Parse the SSE stream
      const result = await parseSSEStream(response)

      console.log(`[Homestay Skill] Analysis complete. Model: ${result.model}, Files: ${result.fileIds?.length || 0}`)

      return {
        status: 'success',
        location,
        analysis: result.textContent,
        model: result.model,
        containerId: result.containerId,
        usage: result.usage,
        fileIds: result.fileIds
      }
    } catch (error) {
      console.error('Error calling Homestay Skill API:', error)
      return {
        status: 'error',
        location,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        analysis: ''
      }
    }
  }
})
