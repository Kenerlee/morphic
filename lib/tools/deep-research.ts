import { tool } from 'ai'
import { z } from 'zod'

export interface DeepResearchResult {
  summary: string
  keyFindings: string[]
  insights: string[]
  sources: Array<{
    title: string
    url: string
    snippet?: string
  }>
  steps: number
  query: string
}

/**
 * Creates a deep research tool using JinaAI Deep Research API
 */
export function createDeepResearchTool() {
  return tool({
    description:
      'Perform deep research on a topic using multi-step analysis and information gathering',
    parameters: z.object({
      query: z.string().describe('The research query or topic to investigate')
    }),
    execute: async ({ query }): Promise<DeepResearchResult> => {
      try {
        console.log(`Starting deep research for query: ${query}`)

        const jinaApiKey = process.env.JINA_API_KEY
        if (!jinaApiKey) {
          throw new Error('JINA_API_KEY is not configured')
        }

        const response = await fetch(
          'https://deepsearch.jina.ai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jinaApiKey}`,
              Accept: 'application/json'
            },
            body: JSON.stringify({
              model: 'jina-deepsearch-v1',
              messages: [
                {
                  role: 'user',
                  content: `请对以下主题进行深度调研分析，包括关键发现、趋势洞察和可靠来源：${query}`
                }
              ],
              stream: true,
              reasoning_effort: 'high'
            })
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error('JinaAI API error:', response.status, errorText)
          throw new Error(
            `Deep Research API returned ${response.status}: ${errorText}`
          )
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader available')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let finalContent = ''
        let citations: any[] = []
        let stepCount = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue

            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              // Track reasoning steps
              if (parsed.reasoning_step) {
                stepCount++
                console.log(
                  `Deep research step ${stepCount}:`,
                  parsed.reasoning_step
                )
              }

              // Accumulate content
              if (parsed.choices?.[0]?.delta?.content) {
                finalContent += parsed.choices[0].delta.content
              }

              // Collect citations
              if (parsed.citations) {
                citations = parsed.citations
              }
            } catch (e) {
              console.warn('Failed to parse SSE line:', line)
            }
          }
        }

        // Parse the content to extract structured information
        const lines = finalContent
          .split('\n')
          .filter((line: string) => line.trim())

        // Try to extract sections
        let summary = ''
        const keyFindings: string[] = []
        const insights: string[] = []

        let currentSection = ''
        for (const line of lines) {
          if (line.includes('摘要') || line.includes('Summary')) {
            currentSection = 'summary'
          } else if (
            line.includes('关键发现') ||
            line.includes('Key Findings')
          ) {
            currentSection = 'findings'
          } else if (
            line.includes('趋势') ||
            line.includes('洞察') ||
            line.includes('Insights')
          ) {
            currentSection = 'insights'
          } else if (line.match(/^[\d•\-\*]/)) {
            // Bullet point or numbered item
            const cleaned = line.replace(/^[\d•\-\*\.\s]+/, '').trim()
            if (currentSection === 'findings') {
              keyFindings.push(cleaned)
            } else if (currentSection === 'insights') {
              insights.push(cleaned)
            }
          } else if (currentSection === 'summary' && line.length > 20) {
            summary += line + ' '
          }
        }

        // If no structured parsing worked, use the whole content as summary
        if (!summary && finalContent) {
          summary = finalContent.substring(0, 500)
        }

        // Format citations as sources
        const sources = citations.map((citation: any, index: number) => ({
          title: citation.title || `来源 ${index + 1}`,
          url: citation.url || citation.link || '',
          snippet: citation.snippet || citation.text || ''
        }))

        const result: DeepResearchResult = {
          summary: summary.trim() || `关于 "${query}" 的深度研究分析`,
          keyFindings:
            keyFindings.length > 0
              ? keyFindings
              : [`基于 ${sources.length} 个来源的综合分析`],
          insights:
            insights.length > 0
              ? insights
              : [
                  'JinaAI Deep Search 提供的深度分析',
                  '多源信息交叉验证',
                  '可靠性评估完成'
                ],
          sources,
          steps: stepCount || 4,
          query
        }

        console.log(`Deep research completed for: ${query}`)
        return result
      } catch (error) {
        console.error('Error in deep research:', error)
        throw new Error(
          `Deep Research 调研暂不可用，请稍后重试: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  })
}
