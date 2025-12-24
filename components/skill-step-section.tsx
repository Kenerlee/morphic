'use client'

import { useMemo } from 'react'

import {
  Check,
  ChevronDown,
  Code,
  Cpu,
  Download,
  FileCode,
  FileText,
  Loader2,
  Server,
  Zap
} from 'lucide-react'

import { cn } from '@/lib/utils'

import { Badge } from './ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'
import { IconLogo } from './ui/icons'

// Skill step data structure
export interface SkillStepData {
  stepId: string
  stepNumber: number
  stepType: 'tool_use' | 'server_tool_use' | 'code_execution'
  toolName: string
  state: 'running' | 'completed'
  totalSteps?: number
}

// Skill complete data structure
export interface SkillCompleteData {
  totalSteps: number
  completedSteps: number
}

interface SkillStepSectionProps {
  steps: SkillStepData[]
  isComplete?: boolean
  completedInfo?: SkillCompleteData
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  fileIds?: string[]
  downloadBaseUrl?: string
}

// Get icon for step type
function getStepIcon(stepType: string, state: string) {
  const isRunning = state === 'running'
  const iconClassName = cn(
    'size-4',
    isRunning ? 'text-blue-500' : 'text-green-500'
  )

  if (isRunning) {
    return <Loader2 className={cn(iconClassName, 'animate-spin')} />
  }

  switch (stepType) {
    case 'tool_use':
      return <Code className={iconClassName} />
    case 'server_tool_use':
      return <Server className={iconClassName} />
    case 'code_execution':
      return <Cpu className={iconClassName} />
    default:
      return <Zap className={iconClassName} />
  }
}

// Get human-readable name for tool
function getToolDisplayName(toolName: string): string {
  const nameMap: Record<string, string> = {
    code_execution: 'Code Execution',
    skill: 'Skill Processing',
    unknown: 'Processing'
  }
  return nameMap[toolName] || toolName
}

// Single step item component
function StepItem({ step }: { step: SkillStepData }) {
  const isRunning = step.state === 'running'

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors',
        isRunning ? 'bg-blue-500/5' : 'bg-green-500/5'
      )}
    >
      {getStepIcon(step.stepType, step.state)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {getToolDisplayName(step.toolName)}
          </span>
          {isRunning && (
            <Badge variant="outline" className="text-xs py-0 h-5 text-blue-600">
              Running
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Step {step.stepNumber}
        </span>
      </div>
      {!isRunning && <Check className="size-4 text-green-500" />}
    </div>
  )
}

// File download item component
// Uses local proxy API to avoid CORS issues with Skills API
function FileDownloadItem({
  fileId
}: {
  fileId: string
  downloadBaseUrl?: string // kept for backwards compatibility but not used
}) {
  const handleDownload = async () => {
    try {
      // Use local proxy API to avoid CORS issues
      const proxyBaseUrl = '/api/skills-files'

      // First get metadata to get the filename
      const metadataRes = await fetch(`${proxyBaseUrl}/${fileId}?action=metadata`)
      let filename = `report_${fileId}.md`

      if (metadataRes.ok) {
        const metadata = await metadataRes.json()
        filename = metadata.file?.filename || filename
      }

      // Trigger download via proxy
      const downloadUrl = `${proxyBaseUrl}/${fileId}?action=download`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex items-center gap-2 py-2 px-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors w-full text-left"
    >
      <FileText className="size-4 text-blue-500" />
      <span className="text-sm text-muted-foreground flex-1 truncate">
        下载完整报告
      </span>
      <Download className="size-4 text-muted-foreground" />
    </button>
  )
}

export function SkillStepSection({
  steps,
  isComplete,
  completedInfo,
  isOpen,
  onOpenChange,
  fileIds,
  downloadBaseUrl
}: SkillStepSectionProps) {
  const completedSteps = useMemo(
    () => steps.filter(s => s.state === 'completed').length,
    [steps]
  )

  const totalSteps = completedInfo?.totalSteps || steps.length
  const isAllComplete = isComplete || completedSteps === totalSteps

  // Header with step count
  const header = (
    <div className="flex items-center gap-2 w-full">
      <div className="flex items-center gap-2 flex-1">
        <FileCode className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {isAllComplete ? (
            <>
              <span className="text-green-600">{totalSteps} steps</span>
              <span className="text-muted-foreground ml-1">completed</span>
            </>
          ) : (
            <>
              <span className="text-blue-600">{completedSteps}</span>
              <span className="text-muted-foreground">/{totalSteps} steps</span>
            </>
          )}
        </span>
      </div>
      {!isAllComplete && (
        <Loader2 className="size-4 text-blue-500 animate-spin" />
      )}
      {isAllComplete && <Check className="size-4 text-green-500" />}
    </div>
  )

  if (steps.length === 0) {
    return null
  }

  return (
    <div className="flex">
      <div className="relative flex flex-col items-center">
        <div className="w-5">
          <IconLogo className="size-5" />
        </div>
      </div>

      <div className="flex-1 rounded-2xl p-4 border border-border/50">
        <Collapsible open={isOpen} onOpenChange={onOpenChange} className="w-full">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="text-sm w-full">{header}</div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1 hover:bg-accent group"
                aria-label={isOpen ? 'Collapse' : 'Expand'}
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
            <div className="mt-3 space-y-2">
              {steps.map(step => (
                <StepItem key={step.stepId} step={step} />
              ))}
              {/* Show file download links if available */}
              {fileIds && fileIds.length > 0 && downloadBaseUrl && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">
                    生成的报告文件
                  </div>
                  {fileIds.map(fileId => (
                    <FileDownloadItem
                      key={fileId}
                      fileId={fileId}
                      downloadBaseUrl={downloadBaseUrl}
                    />
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
