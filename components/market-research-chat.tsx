'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useChat } from '@ai-sdk/react'
import { ChatRequestOptions } from 'ai'
import { Message } from 'ai/react'
import { toast } from 'sonner'

import { Model } from '@/lib/types/models'
import { cn } from '@/lib/utils'

import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'
import {
  DUE_DILIGENCE_TASKS,
  ReportGenerationProgress,
  type TaskId
} from './report-generation-progress'

// Define section structure
interface ChatSection {
  id: string // User message ID
  userMessage: Message
  assistantMessages: Message[]
}

export function MarketResearchChat({
  id,
  savedMessages = [],
  models
}: {
  id: string
  savedMessages?: Message[]
  models?: Model[]
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasInitialMessage, setHasInitialMessage] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<TaskId[]>([])
  const [currentTask, setCurrentTask] = useState<TaskId>('pest')

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop,
    append,
    data,
    setData,
    addToolResult,
    reload
  } = useChat({
    initialMessages: savedMessages,
    id: id,
    body: {
      id
    },
    onFinish: () => {
      window.dispatchEvent(new CustomEvent('chat-history-updated'))
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: false,
    experimental_throttle: 100
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection) {
        currentSection.assistantMessages.push(message)
      }
    }

    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  useEffect(() => {
    const container = scrollContainerRef.current

    const handleScroll = () => {
      if (!container) return

      const threshold = 50
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        threshold

      setIsAtBottom(isNearBottom)
    }

    if (container) {
      container.addEventListener('scroll', handleScroll)
      handleScroll()
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isAtBottom])

  // Show initial prompt on mount if no messages
  useEffect(() => {
    if (!hasInitialMessage && messages.length === 0) {
      setHasInitialMessage(true)
    }
  }, [messages, hasInitialMessage])

  // Detect task completion based on messages content
  useEffect(() => {
    if (!messages.length) return

    // 收集所有助手消息内容
    const allContent = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join('\n')

    const newCompletedTasks: TaskId[] = []

    // 使用正则匹配markdown标题，避免误判正文中提到的部分名称
    const pestStarted = /##?\s*第一部分/.test(allContent)
    const smartStarted = /##?\s*第二部分/.test(allContent)
    const benchmarkStarted = /##?\s*第三部分/.test(allContent)
    const roadmapStarted = /##?\s*第四部分/.test(allContent)
    const referencesStarted = /##?\s*(第五部分|参考)/.test(allContent)

    // 完成判断：下一部分开始了，上一部分才算完成
    // 这样可以避免AI刚写标题就标记为完成，确保内容真正写完
    if (pestStarted && smartStarted) {
      newCompletedTasks.push('pest')
    }
    if (smartStarted && benchmarkStarted) {
      newCompletedTasks.push('smart')
    }
    if (benchmarkStarted && roadmapStarted) {
      newCompletedTasks.push('benchmark')
    }
    if (roadmapStarted && referencesStarted) {
      newCompletedTasks.push('roadmap')
    }
    if (referencesStarted && !isLoading) {
      newCompletedTasks.push('references')
    }

    // 如果前5个任务都完成且不在加载中，标记最终任务完成
    if (!isLoading && newCompletedTasks.length >= 5) {
      newCompletedTasks.push('finalize')
    }

    setCompletedTasks(newCompletedTasks)

    // 设置当前任务为下一个未完成的任务
    const nextTask = DUE_DILIGENCE_TASKS.find(
      task => !newCompletedTasks.includes(task.id)
    )
    if (nextTask) {
      setCurrentTask(nextTask.id)
    } else {
      setCurrentTask('finalize')
    }
  }, [messages, isLoading])

  const onQuerySelect = (query: string) => {
    append({
      role: 'user',
      content: query
    })
  }

  const handleUpdateAndReloadMessage = async (
    messageId: string,
    newContent: string
  ) => {
    setMessages(currentMessages =>
      currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    )

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const messagesUpToEdited = messages.slice(0, messageIndex + 1)
      setMessages(messagesUpToEdited)

      await reload({ body: { id } })
    } catch (error) {
      console.error('Error reloading message:', error)
    }
  }

  const handleReloadFrom = async (
    messageId: string,
    options?: ChatRequestOptions
  ): Promise<string | null | undefined> => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      const messagesToKeep = messages.slice(0, messageIndex + 1)
      const hasAssistantAfter = messages
        .slice(messageIndex + 1)
        .some(msg => msg.role === 'assistant')

      if (hasAssistantAfter) {
        const trimmedMessages = messages.slice(0, messageIndex + 1)
        setMessages(trimmedMessages)
        return await reload(options)
      }
    }
    return await reload(options)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setData(undefined)
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Market Research</h1>
            <p className="text-muted-foreground">
              Generate comprehensive market due diligence reports for any target
              market and industry
            </p>
          </div>

          {/* Suggestions when no messages */}
          {messages.length === 0 && (
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              <button
                onClick={() =>
                  append({
                    role: 'user',
                    content:
                      'Generate a market due diligence report for electric vehicles in Germany'
                  })
                }
                className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-1">
                  Electric Vehicles in Germany
                </div>
                <div className="text-sm text-muted-foreground">
                  Market size, competition, regulations, and opportunities
                </div>
              </button>
              <button
                onClick={() =>
                  append({
                    role: 'user',
                    content: 'Analyze the fintech industry in Southeast Asia'
                  })
                }
                className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-1">
                  Fintech in Southeast Asia
                </div>
                <div className="text-sm text-muted-foreground">
                  Growth trends, key players, and market entry strategies
                </div>
              </button>
              <button
                onClick={() =>
                  append({
                    role: 'user',
                    content:
                      'Research the e-commerce market in the United States'
                  })
                }
                className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-1">
                  E-commerce in United States
                </div>
                <div className="text-sm text-muted-foreground">
                  Consumer trends, distribution channels, and competitive
                  landscape
                </div>
              </button>
              <button
                onClick={() =>
                  append({
                    role: 'user',
                    content:
                      'Generate a market report for renewable energy in India'
                  })
                }
                className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium mb-1">
                  Renewable Energy in India
                </div>
                <div className="text-sm text-muted-foreground">
                  Market potential, policy landscape, and investment
                  opportunities
                </div>
              </button>
            </div>
          )}

          {/* Messages */}
          <ChatMessages
            chatId={id}
            sections={sections}
            isLoading={isLoading}
            data={data}
            onQuerySelect={onQuerySelect}
            addToolResult={addToolResult}
            scrollContainerRef={scrollContainerRef}
            onUpdateMessage={handleUpdateAndReloadMessage}
            reload={handleReloadFrom}
          />
        </div>
      </div>

      {/* Input Panel */}
      <div className={cn('border-t bg-background')}>
        <div className="max-w-3xl mx-auto">
          {/* Progress Indicator - Show only when report generation started, above input */}
          {messages.length > 0 &&
            completedTasks.length > 0 &&
            currentTask !== 'finalize' && (
              <div className="px-4 pt-4">
                <ReportGenerationProgress
                  completedTasks={completedTasks}
                  currentTask={currentTask}
                  totalTasks={6}
                />
              </div>
            )}
          <ChatPanel
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            stop={stop}
            messages={messages}
            setMessages={setMessages}
            append={append}
            models={models}
            showScrollToBottomButton={!isAtBottom}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </div>
    </div>
  )
}
