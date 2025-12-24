'use client'

import { Progress } from '@/components/ui/progress'

interface QuotaDashboardProps {
  used: number
  limit: number
  isUnlimited: boolean
  resetDate?: string | null
}

export function QuotaDashboard({
  used,
  limit,
  isUnlimited,
  resetDate
}: QuotaDashboardProps) {
  const remaining = isUnlimited ? -1 : limit - used
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100)

  const formatResetDate = (date: string | null | undefined) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">本月配额使用</span>
        <span className="text-sm font-medium">
          {isUnlimited ? (
            <span className="text-green-600">无限</span>
          ) : (
            <>
              {used} / {limit}
            </>
          )}
        </span>
      </div>

      {!isUnlimited && (
        <>
          <Progress value={percentage} className="h-2" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              剩余 {remaining} 次
              {percentage >= 80 && remaining > 0 && (
                <span className="text-amber-600 ml-1">（即将用完）</span>
              )}
              {remaining === 0 && (
                <span className="text-red-600 ml-1">（已用完）</span>
              )}
            </span>
            {resetDate && <span>下次重置: {formatResetDate(resetDate)}</span>}
          </div>
        </>
      )}
    </div>
  )
}
