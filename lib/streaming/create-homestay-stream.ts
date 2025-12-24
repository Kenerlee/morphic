import {
  convertToCoreMessages,
  CoreMessage,
  createDataStreamResponse,
  DataStreamWriter,
  formatDataStreamPart,
  generateId,
  streamText
} from 'ai'

import { createQuestionTool } from '../tools/question'
import { retrieveTool } from '../tools/retrieve'
import { createSearchTool } from '../tools/search'
import { getMaxAllowedTokens, truncateMessages } from '../utils/context-window'
import { getModel } from '../utils/registry'

import { handleStreamFinish } from './handle-stream-finish'
import { BaseStreamConfig } from './types'

const SKILLS_API_URL = process.env.SKILLS_API_URL || 'http://localhost:8000'
const HOMESTAY_SKILL_ID = 'skill_015FtmDcs3NUKhwqTgukAyWc'

// System prompt for the agent when NOT using skills API
const FALLBACK_SYSTEM_PROMPT = `
你是一位专业的民宿投资顾问，专门为用户提供数据驱动的民宿投资决策支持。

**分析流程：**

1. 使用 search 工具搜索该区域的民宿市场信息
2. 搜索竞争对手信息和定价策略
3. 搜索当地政策法规信息
4. 生成综合报告

**报告结构要求：**

## 一、区位分析
- 地理位置概述
- 交通便利性
- 周边配套

## 二、市场分析
- 当地民宿市场规模
- 市场增长趋势
- 主要客源结构

## 三、竞争格局
- 主要竞争对手分析
- 价格区间分布
- 差异化机会

## 四、投资测算
- 初始投资估算
- 运营成本预估
- 收益预测
- 投资回报周期

## 五、风险评估
- 政策风险
- 市场风险
- 运营风险

## 六、投资建议
- 是否建议投资
- 最佳投资时机
- 推荐经营模式

使用 [number](url) 格式引用信息来源。报告应使用简体中文。
`

// Check if message contains ask_question tool invocation
function containsAskQuestionTool(message: CoreMessage) {
  if (message.role !== 'assistant' || !Array.isArray(message.content)) {
    return false
  }
  return message.content.some(
    item => item.type === 'tool-call' && item.toolName === 'ask_question'
  )
}

// Check if we have received user's answer to questions
function hasUserAnsweredQuestions(messages: CoreMessage[]): {
  answered: boolean
  fieldValues?: Record<string, string>
} {
  // Look for tool-result messages that contain fieldValues
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const content of msg.content) {
        if (
          content.type === 'tool-result' &&
          content.toolName === 'ask_question'
        ) {
          try {
            const result =
              typeof content.result === 'string'
                ? JSON.parse(content.result)
                : content.result
            if (result.fieldValues && Object.keys(result.fieldValues).length > 0) {
              return { answered: true, fieldValues: result.fieldValues }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
  return { answered: false }
}

// Build the message for Skills API
function buildSkillMessage(fieldValues: Record<string, string>): string {
  const messageParts = []

  if (fieldValues.location) {
    messageParts.push(`请对【${fieldValues.location}】的民宿投资市场进行全面分析。`)
  }
  if (fieldValues.budget) {
    messageParts.push(`投资预算范围：${fieldValues.budget}`)
  }
  if (fieldValues.homestay_type) {
    messageParts.push(`民宿类型：${fieldValues.homestay_type}`)
  }
  if (fieldValues.target_customers) {
    messageParts.push(`目标客群：${fieldValues.target_customers}`)
  }
  if (fieldValues.additional_requirements) {
    messageParts.push(`其他需求：${fieldValues.additional_requirements}`)
  }

  messageParts.push(
    '请提供以下分析：',
    '1. 区位分析：地理位置、交通便利性、周边配套',
    '2. 市场规模：民宿市场容量、增长趋势',
    '3. 竞争格局：主要竞争对手、定价策略',
    '4. 目标客群：客源结构、消费特征',
    '5. 投资建议：投资回报预测、风险评估、运营建议'
  )

  return messageParts.join('\n')
}

// Skill step type for tracking execution progress
interface SkillStep {
  id: string
  stepNumber: number
  stepType: 'tool_use' | 'server_tool_use' | 'code_execution'
  toolName: string
  state: 'running' | 'completed'
}

// Stream Skills API response to dataStream
// Returns the full text, usage, steps, and file_ids if successful, null if failed
async function streamSkillsApiResponse(
  fieldValues: Record<string, string>,
  dataStream: DataStreamWriter
): Promise<{ text: string; usage?: { input_tokens: number; output_tokens: number }; steps: SkillStep[]; fileIds?: string[] } | null> {
  const message = buildSkillMessage(fieldValues)

  try {
    // Create AbortController with 10 minute timeout for skill execution
    // Skills API can take 7-8 minutes for complex reports
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    const response = await fetch(`${SKILLS_API_URL}/stream/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        skill_ids: [HOMESTAY_SKILL_ID],
        message: message,
        max_tokens: 32768
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      clearTimeout(timeoutId)
      console.error('Skills API stream request failed:', response.status)
      return null
    }

    const reader = response.body?.getReader()
    if (!reader) {
      clearTimeout(timeoutId)
      console.error('No response body from Skills API')
      return null
    }

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = '' // Buffer for incomplete SSE lines
    let usage: { input_tokens: number; output_tokens: number } | undefined
    let fileIds: string[] | undefined
    const steps: SkillStep[] = []
    const messageId = generateId()

    // Write start_step to indicate beginning of assistant response
    const startStep = formatDataStreamPart('start_step', {
      messageId
    })
    dataStream.write(startStep)

    console.log('Starting to read Skills API stream...')

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Skills API stream done, fullText length:', fullText.length)
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          // Skip empty lines and keepalive comments (lines starting with :)
          if (!line || line.startsWith(':')) {
            if (line.startsWith(': keepalive')) {
              console.log('Received keepalive')
              // Forward keepalive to frontend as empty text to keep connection alive
              const keepalive = formatDataStreamPart('message_annotations', [{
                type: 'keepalive',
                data: { timestamp: Date.now() }
              }])
              dataStream.write(keepalive)
            }
            continue
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('Received event type:', data.type)

              if (data.type === 'text_delta' && data.text) {
                // Stream the text delta directly to the frontend using AI SDK text format
                fullText += data.text
                // Use formatDataStreamPart to write text in the correct format (prefix 0:)
                const formatted = formatDataStreamPart('text', data.text)
                dataStream.write(formatted)
              } else if (data.type === 'step_start') {
                // New step started - track it and send annotation to frontend
                const step: SkillStep = {
                  id: data.tool_id || `step-${data.step_number}`,
                  stepNumber: data.step_number,
                  stepType: data.step_type,
                  toolName: data.tool_name,
                  state: 'running'
                }
                steps.push(step)

                // Send step annotation to frontend using message_annotations (array format)
                const stepAnnotation = formatDataStreamPart('message_annotations', [{
                  type: 'skill_step',
                  data: {
                    stepId: step.id,
                    stepNumber: step.stepNumber,
                    stepType: step.stepType,
                    toolName: step.toolName,
                    state: 'running',
                    totalSteps: steps.length
                  }
                }])
                dataStream.write(stepAnnotation)
                console.log(`Step ${step.stepNumber} started: ${step.toolName}`)
              } else if (data.type === 'step_complete') {
                // Step completed - update state and notify frontend
                // First try to match by step_number (most reliable), then by tool_id, then by tool_name
                const step = steps.find(s =>
                  (data.step_number && s.stepNumber === data.step_number) ||
                  (data.tool_id && s.id === data.tool_id) ||
                  (data.index !== undefined && s.id === `step-${data.index}`)
                )
                if (step) {
                  step.state = 'completed'

                  const stepAnnotation = formatDataStreamPart('message_annotations', [{
                    type: 'skill_step',
                    data: {
                      stepId: step.id,
                      stepNumber: step.stepNumber,
                      stepType: step.stepType,
                      toolName: step.toolName,
                      state: 'completed',
                      totalSteps: steps.length
                    }
                  }])
                  dataStream.write(stepAnnotation)
                  console.log(`Step ${step.stepNumber} completed: ${step.toolName}`)
                } else {
                  console.log(`Warning: Could not find step to complete for step_number=${data.step_number}, tool_id=${data.tool_id}`)
                }
              } else if (data.type === 'code_result_start' || data.type === 'server_result_start') {
                // Code/server execution result starting
                const resultAnnotation = formatDataStreamPart('message_annotations', [{
                  type: 'skill_result',
                  data: {
                    resultType: data.type === 'code_result_start' ? 'code' : 'server',
                    state: 'running'
                  }
                }])
                dataStream.write(resultAnnotation)
              } else if (data.type === 'code_result_complete') {
                // Code execution result complete
                const resultAnnotation = formatDataStreamPart('message_annotations', [{
                  type: 'skill_result',
                  data: {
                    resultType: 'code',
                    state: 'completed'
                  }
                }])
                dataStream.write(resultAnnotation)
              } else if (data.type === 'message_stop') {
                // Message complete - send final step count
                const finalAnnotation = formatDataStreamPart('message_annotations', [{
                  type: 'skill_complete',
                  data: {
                    totalSteps: data.total_steps || steps.length,
                    completedSteps: steps.filter(s => s.state === 'completed').length
                  }
                }])
                dataStream.write(finalAnnotation)
                console.log(`Skill execution complete: ${steps.length} total steps`)
              } else if (data.type === 'done') {
                console.log('Received done event with usage:', data.usage, 'file_ids:', data.file_ids)
                usage = data.usage
                fileIds = data.file_ids

                // Send file_ids annotation to frontend if files were generated
                if (fileIds && fileIds.length > 0) {
                  const fileAnnotation = formatDataStreamPart('message_annotations', [{
                    type: 'skill_files',
                    data: {
                      fileIds: fileIds,
                      downloadBaseUrl: `${SKILLS_API_URL}/files`
                    }
                  }])
                  dataStream.write(fileAnnotation)
                  console.log(`Generated ${fileIds.length} files: ${fileIds.join(', ')}`)
                }
              } else if (data.type === 'error') {
                console.error('Skills API error:', data.error)
                clearTimeout(timeoutId)
                return null
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId)
    }

    // Write finish_step and finish_message to properly end the stream
    if (fullText) {
      const finishStep = formatDataStreamPart('finish_step', {
        finishReason: 'stop',
        isContinued: false
      })
      dataStream.write(finishStep)

      const finishMessage = formatDataStreamPart('finish_message', {
        finishReason: 'stop',
        usage: usage ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens
        } : undefined
      })
      dataStream.write(finishMessage)
    }

    return fullText ? { text: fullText, usage, steps, fileIds } : null
  } catch (error) {
    console.error('Error streaming Skills API:', error)
    return null
  }
}

export function createHomestayStreamResponse(config: BaseStreamConfig) {
  return createDataStreamResponse({
    execute: async (dataStream: DataStreamWriter) => {
      const { messages, model, chatId, userId } = config
      const modelId = `${model.providerId}:${model.id}`

      try {
        const coreMessages = convertToCoreMessages(messages)
        const truncatedMessages = truncateMessages(
          coreMessages,
          getMaxAllowedTokens(model)
        )

        const currentDate = new Date().toLocaleString()

        // Check if user has already answered questions
        const { answered, fieldValues } = hasUserAnsweredQuestions(truncatedMessages)

        if (answered && fieldValues?.location) {
          // User has answered - stream from Skills API directly
          console.log('Streaming from Skills API with fieldValues:', fieldValues)

          const skillResult = await streamSkillsApiResponse(fieldValues, dataStream)

          if (!skillResult) {
            // Fallback to search-based research
            console.log('Skills API failed, falling back to search')

            const searchTool = createSearchTool(modelId)

            const result = streamText({
              model: getModel(modelId),
              system: `${FALLBACK_SYSTEM_PROMPT}\n\n用户需求：
- 投资区域：${fieldValues.location}
- 投资预算：${fieldValues.budget || '未指定'}
- 民宿类型：${fieldValues.homestay_type || '未指定'}
- 目标客群：${fieldValues.target_customers || '未指定'}
- 其他需求：${fieldValues.additional_requirements || '无'}

当前日期时间: ${currentDate}`,
              messages: truncatedMessages,
              maxTokens: 16000,
              tools: {
                search: searchTool,
                retrieve: retrieveTool
              },
              maxSteps: 10,
              onFinish: async result => {
                await handleStreamFinish({
                  responseMessages: result.response.messages,
                  originalMessages: messages,
                  model: modelId,
                  chatId,
                  dataStream,
                  userId,
                  skipRelatedQuestions: true
                })
              }
            })

            result.mergeIntoDataStream(dataStream)
          } else {
            // Skills API succeeded - the text and finish markers have already been streamed
            console.log('Skills API succeeded, result length:', skillResult.text.length)

            // Save to chat history
            await handleStreamFinish({
              responseMessages: [
                {
                  role: 'assistant',
                  content: skillResult.text
                }
              ],
              originalMessages: messages,
              model: modelId,
              chatId,
              dataStream,
              userId,
              skipRelatedQuestions: true
            })
          }
        } else {
          // Need to ask questions first
          const askQuestionTool = createQuestionTool(modelId)

          const QUESTION_SYSTEM_PROMPT = `
你是一位专业的民宿投资顾问。你需要首先收集用户的投资需求信息。

**必须立即使用 ask_question 工具** 收集以下信息：

使用以下参数调用 ask_question 工具：
- question: "为了给您提供最精准的民宿投资分析，请填写以下信息："
- options: []
- allowsInput: false
- inputFields: [
    { name: "location", label: "投资区域", placeholder: "例如：郑州大学附近、杭州西湖区、厦门曾厝垵", required: true },
    { name: "budget", label: "投资预算", placeholder: "例如：50-100万、100-200万", required: false },
    { name: "homestay_type", label: "民宿类型", placeholder: "例如：公寓民宿、独栋别墅、特色民宿", required: false },
    { name: "target_customers", label: "目标客群", placeholder: "例如：大学生、商旅人士、家庭游客", required: false },
    { name: "additional_requirements", label: "其他需求", placeholder: "请描述您的特殊关注点或需求（可选）", required: false }
  ]

不要做任何其他事情，直接调用 ask_question 工具。
`

          const result = streamText({
            model: getModel(modelId),
            system: QUESTION_SYSTEM_PROMPT,
            messages: truncatedMessages,
            maxTokens: 4000,
            tools: {
              ask_question: askQuestionTool
            },
            maxSteps: 2,
            onFinish: async result => {
              await handleStreamFinish({
                responseMessages: result.response.messages,
                originalMessages: messages,
                model: modelId,
                chatId,
                dataStream,
                userId,
                skipRelatedQuestions: true
              })
            }
          })

          result.mergeIntoDataStream(dataStream)
        }
      } catch (error) {
        console.error('Homestay stream execution error:', error)
        throw error
      }
    },
    onError: error => {
      console.error('Homestay stream error:', error)
      return error instanceof Error ? error.message : String(error)
    }
  })
}
