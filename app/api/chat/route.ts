import { cookies } from 'next/headers'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { isProviderEnabled } from '@/lib/utils/registry'

export const maxDuration = 30

const DEFAULT_MODEL: Model = {
  id: 'deepseek-chat',
  name: 'DeepSeek V3',
  provider: 'DeepSeek',
  providerId: 'deepseek',
  enabled: true,
  toolCallType: 'manual'
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId } = await req.json()
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')
    const userId = await getCurrentUserId()

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'
    const dueDiligenceMode =
      cookieStore.get('due-diligence-mode')?.value === 'true'
    const deepResearchMode =
      cookieStore.get('deep-research-mode')?.value === 'true'

    let selectedModel = DEFAULT_MODEL

    if (modelJson) {
      try {
        selectedModel = JSON.parse(modelJson) as Model
      } catch (e) {
        console.error('Failed to parse selected model:', e)
      }
    }

    // Auto-select Claude Sonnet 4+ for due diligence mode
    if (dueDiligenceMode) {
      const isClaude4Plus =
        selectedModel.id === 'claude-sonnet-4-5-20250929' ||
        selectedModel.id === 'claude-sonnet-4-20250514'

      if (!isClaude4Plus) {
        // Override with Claude Sonnet 4.5 as the preferred model
        selectedModel = {
          id: 'claude-sonnet-4-5-20250929',
          name: 'Claude Sonnet 4.5',
          provider: 'Anthropic',
          providerId: 'anthropic',
          enabled: true,
          toolCallType: 'native'
        }
        console.log(
          'Auto-selected Claude Sonnet 4.5 for market due diligence mode'
        )
      }
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    return supportsToolCalling
      ? createToolCallingStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          dueDiligenceMode,
          deepResearchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          dueDiligenceMode,
          deepResearchMode,
          userId
        })
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
