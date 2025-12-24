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

export function Chat({
  id,
  savedMessages = [],
  query,
  models,
  user
}: {
  id: string
  savedMessages?: Message[]
  query?: string
  models?: Model[]
  user?: any
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [completedTasks, setCompletedTasks] = useState<TaskId[]>([])
  const [currentTask, setCurrentTask] = useState<TaskId>('pest')
  const [isDueDiligenceActive, setIsDueDiligenceActive] = useState(false)

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
    id: id, // Use unique chat ID for isolated streaming
    body: {
      id
    },
    // Custom fetch to ensure long-running requests don't timeout
    // Note: Avoid using AbortController timeout as it can prematurely cancel Skills API calls
    fetch: async (input, init) => {
      return fetch(input, {
        ...init,
        // Don't use keepalive: true as it limits request body size to 64KB
      })
    },
    onFinish: () => {
      // Only update URL if we're on the home page (new chat)
      // Don't update if we're already on a search page to avoid hijacking navigation
      if (window.location.pathname === '/') {
        window.history.replaceState({}, '', `/search/${id}`)
      }
      window.dispatchEvent(new CustomEvent('chat-history-updated'))
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: false, // Disable extra message fields,
    experimental_throttle: 100
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        // Start a new section when a user message is found
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection && message.role === 'assistant') {
        // Add assistant message to the current section
        currentSection.assistantMessages.push(message)
      }
      // Ignore other role types like 'system' for now
    }

    // Add the last section if exists
    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  // Detect if scroll container is at the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 50 // threshold in pixels
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Set initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll to bottom when messages update (for streaming content)
  useEffect(() => {
    if (isAtBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isAtBottom])

  // Scroll to the section when a new user message is sent
  useEffect(() => {
    // Only scroll if this chat is currently visible in the URL
    const isCurrentChat =
      window.location.pathname === `/search/${id}` ||
      (window.location.pathname === '/' && sections.length > 0)

    if (isCurrentChat && sections.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        // If the last message is from user, find the corresponding section
        const sectionId = lastMessage.id
        requestAnimationFrame(() => {
          const sectionElement = document.getElementById(`section-${sectionId}`)
          sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [sections, messages, id])

  useEffect(() => {
    setMessages(savedMessages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Detect if due diligence tool is active and track task completion
  useEffect(() => {
    // Check if market_due_diligence tool is being used
    const hasDueDiligenceTool =
      data &&
      Array.isArray(data) &&
      data.some(
        (item: any) =>
          item.type === 'tool_call' &&
          item.data?.toolName === 'market_due_diligence'
      )

    setIsDueDiligenceActive(hasDueDiligenceTool || false)

    // Only track tasks if due diligence is active
    if (!hasDueDiligenceTool || !messages.length) return

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
  }, [messages, data, isLoading])

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

      setData(undefined)

      await reload({
        body: {
          chatId: id,
          regenerate: true
        }
      })
    } catch (error) {
      console.error('Failed to reload after message update:', error)
      toast.error(`Failed to reload conversation: ${(error as Error).message}`)
    }
  }

  const handleReloadFrom = async (
    messageId: string,
    options?: ChatRequestOptions
  ) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      const userMessageIndex = messages
        .slice(0, messageIndex)
        .findLastIndex(m => m.role === 'user')
      if (userMessageIndex !== -1) {
        const trimmedMessages = messages.slice(0, userMessageIndex + 1)
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
    <div
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col',
        messages.length === 0 ? 'items-center justify-center' : ''
      )}
      data-testid="full-chat"
    >
      <ChatMessages
        sections={sections}
        data={data}
        onQuerySelect={onQuerySelect}
        isLoading={isLoading}
        chatId={id}
        addToolResult={addToolResult}
        scrollContainerRef={scrollContainerRef}
        onUpdateMessage={handleUpdateAndReloadMessage}
        reload={handleReloadFrom}
      />
      {/* Progress Indicator - Only show for due diligence, above ChatPanel */}
      {isDueDiligenceActive &&
        messages.length > 0 &&
        completedTasks.length > 0 &&
        currentTask !== 'finalize' && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
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
        messages={messages}
        setMessages={setMessages}
        stop={stop}
        query={query}
        append={append}
        models={models}
        showScrollToBottomButton={!isAtBottom}
        scrollContainerRef={scrollContainerRef}
        user={user}
      />
    </div>
  )
}
