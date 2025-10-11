'use client'

import { useState } from 'react'

import { ChevronDown, ChevronUp } from 'lucide-react'

// 定义6个Due Diligence任务
export const DUE_DILIGENCE_TASKS = [
  {
    id: 'pest',
    label: '国别研究（PEST模型分析）',
    sectionMarker: '第一部分'
  },
  {
    id: 'smart',
    label: '行业研究（SMART模型分析）',
    sectionMarker: '第二部分'
  },
  {
    id: 'benchmark',
    label: '市场标杆企业研究',
    sectionMarker: '第三部分'
  },
  {
    id: 'roadmap',
    label: '出海路径策略建议（七步法）',
    sectionMarker: '第四部分'
  },
  {
    id: 'references',
    label: '参考文献整理',
    sectionMarker: '第五部分'
  },
  {
    id: 'finalize',
    label: '整合报告并交付用户',
    sectionMarker: null // 当前5个任务完成后自动标记
  }
] as const

export type TaskId = (typeof DUE_DILIGENCE_TASKS)[number]['id']

interface ReportGenerationProgressProps {
  completedTasks: TaskId[]
  currentTask: TaskId
  totalTasks?: number
}

export function ReportGenerationProgress({
  completedTasks,
  currentTask,
  totalTasks = 6
}: ReportGenerationProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const currentTaskInfo = DUE_DILIGENCE_TASKS.find(t => t.id === currentTask)
  const completedCount = completedTasks.length
  const isAllCompleted = completedCount === totalTasks

  return (
    <div className="w-full mb-2 animate-in slide-in-from-top duration-300">
      <div className="bg-muted rounded-3xl border border-input overflow-hidden">
        {/* 折叠态 - 当前任务 + 进度 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/80 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 当前任务名称 */}
            <span className="text-sm font-medium truncate">
              {isAllCompleted ? (
                <>全部任务已完成 🎉</>
              ) : (
                currentTaskInfo?.label || '正在生成报告...'
              )}
            </span>
          </div>

          {/* 右侧：进度 + 展开按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">进度:</span>
              <span className="text-sm font-semibold text-primary">
                {completedCount} / {totalTasks}
              </span>
              {isAllCompleted ? (
                <span className="text-base">✅</span>
              ) : (
                <span className="text-base">☐</span>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* 展开态 - 完整任务列表 */}
        {isExpanded && (
          <div className="border-t border-border px-4 py-3 space-y-2 animate-in slide-in-from-top duration-200">
            {DUE_DILIGENCE_TASKS.map(task => {
              const isCompleted = completedTasks.includes(task.id)
              const isCurrent = task.id === currentTask

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors ${
                    isCurrent
                      ? 'bg-primary/10 text-primary font-medium'
                      : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                >
                  {/* 状态图标 */}
                  <span className="text-base shrink-0">
                    {isCompleted ? '✅' : '☐'}
                  </span>

                  {/* 任务名称 */}
                  <span className="flex-1">{task.label}</span>

                  {/* 当前进行中标识 */}
                  {isCurrent && !isCompleted && (
                    <span className="text-xs text-primary shrink-0">
                      ← 进行中
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
