import { useMemo } from 'react'

import { ChatRequestOptions, JSONValue, Message, ToolInvocation } from 'ai'

import { AnswerSection } from './answer-section'
import { ReasoningSection } from './reasoning-section'
import RelatedQuestions from './related-questions'
import {
  SkillCompleteData,
  SkillStepData,
  SkillStepSection
} from './skill-step-section'
import { ToolSection } from './tool-section'
import { UserMessage } from './user-message'

interface RenderMessageProps {
  message: Message
  messageId: string
  getIsOpen: (id: string) => boolean
  onOpenChange: (id: string, open: boolean) => void
  onQuerySelect: (query: string) => void
  chatId?: string
  addToolResult?: (params: { toolCallId: string; result: any }) => void
  onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
}

export function RenderMessage({
  message,
  messageId,
  getIsOpen,
  onOpenChange,
  onQuerySelect,
  chatId,
  addToolResult,
  onUpdateMessage,
  reload
}: RenderMessageProps) {
  const relatedQuestions = useMemo(
    () =>
      message.annotations?.filter(
        annotation => (annotation as any)?.type === 'related-questions'
      ),
    [message.annotations]
  )

  // Render for manual tool call
  const toolData = useMemo(() => {
    const toolAnnotations =
      (message.annotations?.filter(
        annotation =>
          (annotation as unknown as { type: string }).type === 'tool_call'
      ) as unknown as Array<{
        data: {
          args: string
          toolCallId: string
          toolName: string
          result?: string
          state: 'call' | 'result'
        }
      }>) || []

    const toolDataMap = toolAnnotations.reduce((acc, annotation) => {
      const existing = acc.get(annotation.data.toolCallId)
      if (!existing || annotation.data.state === 'result') {
        acc.set(annotation.data.toolCallId, {
          ...annotation.data,
          args: annotation.data.args ? JSON.parse(annotation.data.args) : {},
          result:
            annotation.data.result && annotation.data.result !== 'undefined'
              ? JSON.parse(annotation.data.result)
              : undefined
        } as ToolInvocation)
      }
      return acc
    }, new Map<string, ToolInvocation>())

    return Array.from(toolDataMap.values())
  }, [message.annotations])

  // Extract the unified reasoning annotation directly.
  const reasoningAnnotation = useMemo(() => {
    const annotations = message.annotations as any[] | undefined
    if (!annotations) return null
    return (
      annotations.find(a => a.type === 'reasoning' && a.data !== undefined) ||
      null
    )
  }, [message.annotations])

  // Extract the reasoning time and reasoning content from the annotation.
  // If annotation.data is an object, use its fields. Otherwise, default to a time of 0.
  const reasoningTime = useMemo(() => {
    if (!reasoningAnnotation) return 0
    if (
      typeof reasoningAnnotation.data === 'object' &&
      reasoningAnnotation.data !== null
    ) {
      return reasoningAnnotation.data.time ?? 0
    }
    return 0
  }, [reasoningAnnotation])

  // Skill files data structure
  interface SkillFilesData {
    fileIds: string[]
    downloadBaseUrl: string
  }

  // Extract skill step annotations and skill files
  const { skillSteps, skillComplete, skillFiles } = useMemo(() => {
    const annotations = message.annotations as any[] | undefined
    if (!annotations) return { skillSteps: [], skillComplete: null, skillFiles: null }

    const steps: SkillStepData[] = []
    let complete: SkillCompleteData | null = null
    let files: SkillFilesData | null = null

    // Use a map to track steps by stepId and update their state
    const stepMap = new Map<string, SkillStepData>()

    for (const annotation of annotations) {
      if (annotation?.type === 'skill_step' && annotation?.data) {
        const data = annotation.data as SkillStepData
        // Update or add step (later annotations override earlier ones)
        stepMap.set(data.stepId, data)
      } else if (annotation?.type === 'skill_complete' && annotation?.data) {
        complete = annotation.data as SkillCompleteData
      } else if (annotation?.type === 'skill_files' && annotation?.data) {
        files = annotation.data as SkillFilesData
      }
    }

    // Convert map to array and sort by step number
    steps.push(...Array.from(stepMap.values()))
    steps.sort((a, b) => a.stepNumber - b.stepNumber)

    return { skillSteps: steps, skillComplete: complete, skillFiles: files }
  }, [message.annotations])

  if (message.role === 'user') {
    return (
      <UserMessage
        message={message.content}
        messageId={messageId}
        onUpdateMessage={onUpdateMessage}
      />
    )
  }

  // New way: Use parts instead of toolInvocations
  return (
    <>
      {/* Render skill steps if present */}
      {skillSteps.length > 0 && (
        <SkillStepSection
          steps={skillSteps}
          isComplete={skillComplete !== null}
          completedInfo={skillComplete || undefined}
          isOpen={getIsOpen(`${messageId}-skill-steps`)}
          onOpenChange={open => onOpenChange(`${messageId}-skill-steps`, open)}
          fileIds={skillFiles?.fileIds}
          downloadBaseUrl={skillFiles?.downloadBaseUrl}
        />
      )}
      {toolData.map(tool => (
        <ToolSection
          key={tool.toolCallId}
          tool={tool}
          isOpen={getIsOpen(tool.toolCallId)}
          onOpenChange={open => onOpenChange(tool.toolCallId, open)}
          addToolResult={addToolResult}
          chatId={chatId}
        />
      ))}
      {message.parts?.map((part, index) => {
        // Check if this is the last part in the array
        const isLastPart = index === (message.parts?.length ?? 0) - 1

        switch (part.type) {
          case 'tool-invocation':
            return (
              <ToolSection
                key={`${messageId}-tool-${index}`}
                tool={part.toolInvocation}
                isOpen={getIsOpen(part.toolInvocation.toolCallId)}
                onOpenChange={open =>
                  onOpenChange(part.toolInvocation.toolCallId, open)
                }
                addToolResult={addToolResult}
                chatId={chatId}
              />
            )
          case 'text':
            // Only show actions if this is the last part and it's a text part
            return (
              <AnswerSection
                key={`${messageId}-text-${index}`}
                content={part.text}
                isOpen={getIsOpen(messageId)}
                onOpenChange={open => onOpenChange(messageId, open)}
                chatId={chatId}
                showActions={isLastPart}
                messageId={messageId}
                reload={reload}
              />
            )
          case 'reasoning':
            return (
              <ReasoningSection
                key={`${messageId}-reasoning-${index}`}
                content={{
                  reasoning: part.reasoning,
                  time: reasoningTime
                }}
                isOpen={getIsOpen(messageId)}
                onOpenChange={open => onOpenChange(messageId, open)}
              />
            )
          // Add other part types as needed
          default:
            return null
        }
      })}
      {relatedQuestions && relatedQuestions.length > 0 && (
        <RelatedQuestions
          annotations={relatedQuestions as JSONValue[]}
          onQuerySelect={onQuerySelect}
          isOpen={getIsOpen(`${messageId}-related`)}
          onOpenChange={open => onOpenChange(`${messageId}-related`, open)}
          chatId={chatId || ''}
        />
      )}
    </>
  )
}
