'use client'

import { useEffect,useState } from 'react'

import { Report } from '@/lib/types/report'

import { Button } from '@/components/ui/button'

import { ReportPreviewCard } from './report-preview-card'

interface ReportGridProps {
  initialReports: Report[]
  initialTotal: number
  initialHasMore: boolean
}

export function ReportGrid({
  initialReports,
  initialTotal,
  initialHasMore
}: ReportGridProps) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  const loadMore = async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const response = await fetch(`/api/discovery?page=${nextPage}&limit=12`)
      const data = await response.json()

      if (data.success) {
        setReports(prev => [...prev, ...data.data.reports])
        setHasMore(data.data.hasMore)
        setPage(nextPage)
      }
    } catch (error) {
      console.error('Failed to load more reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">暂无公开报告</p>
        <p className="text-sm text-muted-foreground">
          成为第一个分享研究报告的用户吧！
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map(report => (
          <ReportPreviewCard key={report.id} report={report} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  )
}
