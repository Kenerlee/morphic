'use client'

import { useState } from 'react'

import type { Report } from '@/lib/types/report'
import type { ResearchReport } from '@/lib/types/research-report'

import { Button } from '@/components/ui/button'

import { ReportPreviewCard } from './report-preview-card'
import { ResearchReportCard } from './research-report-card'

interface DiscoveryGridProps {
  initialUserReports: Report[]
  initialOfficialReports: ResearchReport[]
  initialUserTotal: number
  initialOfficialTotal: number
}

export function DiscoveryGrid({
  initialUserReports,
  initialOfficialReports,
  initialUserTotal,
  initialOfficialTotal
}: DiscoveryGridProps) {
  const [userReports, setUserReports] = useState<Report[]>(initialUserReports)
  const [officialReports, setOfficialReports] = useState<ResearchReport[]>(
    initialOfficialReports
  )
  const [userTotal, setUserTotal] = useState(initialUserTotal)
  const [officialTotal, setOfficialTotal] = useState(initialOfficialTotal)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const loadReports = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const currentPage = page + 1
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '5',
        type: 'all'
      })

      const response = await fetch(`/api/discovery?${params}`)
      const data = await response.json()

      if (data.success) {
        setUserReports(prev => [...prev, ...(data.data.userReports || [])])
        setOfficialReports(prev => [
          ...prev,
          ...(data.data.officialReports || [])
        ])
        setUserTotal(data.data.userTotal || 0)
        setOfficialTotal(data.data.officialTotal || 0)
        setHasMore(data.data.hasMore)
        setPage(currentPage)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalCount = userTotal + officialTotal
  const isEmpty = userReports.length === 0 && officialReports.length === 0

  // 合并所有报告并按时间排序
  const allReports: Array<{
    type: 'user' | 'official'
    report: Report | ResearchReport
    date: Date
  }> = [
    ...officialReports.map(r => ({
      type: 'official' as const,
      report: r,
      date: new Date(r.updatedAt || r.createdAt)
    })),
    ...userReports.map(r => ({
      type: 'user' as const,
      report: r,
      date: new Date(r.updatedAt || r.createdAt)
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="space-y-6">
      {/* 统计 */}
      <p className="text-sm text-muted-foreground">共 {totalCount} 篇报告</p>

      {isEmpty ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">暂无报告</p>
          <p className="text-sm text-muted-foreground">暂无公开报告</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allReports.map(item =>
            item.type === 'official' ? (
              <ResearchReportCard
                key={`official-${item.report.id}`}
                report={item.report as ResearchReport}
              />
            ) : (
              <ReportPreviewCard
                key={`user-${item.report.id}`}
                report={item.report as Report}
              />
            )
          )}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && !isEmpty && (
        <div className="text-center">
          <Button variant="outline" onClick={loadReports} disabled={isLoading}>
            {isLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  )
}
