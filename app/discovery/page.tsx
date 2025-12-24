import Link from 'next/link'

import { getPublicReports } from '@/lib/actions/report'
import { getRedisClient } from '@/lib/redis/config'
import type { ResearchReport } from '@/lib/types/research-report'

import { Button } from '@/components/ui/button'

import { DiscoveryGrid } from '@/components/discovery/discovery-grid'

// Force dynamic rendering to ensure fresh data from Redis
export const dynamic = 'force-dynamic'

// Direct Redis query for official research reports (避免 Server Action 在 SSR 时的 Redis 连接问题)
async function getOfficialReportsDirect(
  page: number = 1,
  limit: number = 5
): Promise<{ reports: ResearchReport[]; total: number; hasMore: boolean }> {
  try {
    const redis = await getRedisClient()
    const publicReportsKey = 'research-reports:v1:public'

    const total = await redis.zcard(publicReportsKey)
    const offset = (page - 1) * limit

    const reportKeys = await redis.zrange(publicReportsKey, offset, offset + limit - 1, {
      rev: true
    })

    if (reportKeys.length === 0) {
      return { reports: [], total, hasMore: false }
    }

    const reports = await Promise.all(
      reportKeys.map(async reportKey => {
        const report = await redis.hgetall(reportKey)
        return report
      })
    )

    const parsedReports = reports
      .filter((report): report is Record<string, unknown> => {
        return report !== null && Object.keys(report).length > 0
      })
      .map(report => ({
        id: report.id as string,
        title: report.title as string,
        description: report.description as string,
        pdfUrl: report.pdfUrl as string,
        pdfFileName: report.pdfFileName as string,
        pdfFileSize: parseInt(report.pdfFileSize as string) || 0,
        coverImage: (report.coverImage as string) || undefined,
        category: report.category as ResearchReport['category'],
        tags: typeof report.tags === 'string' ? JSON.parse(report.tags as string) : (report.tags as string[]) || [],
        author: (report.author as string) || undefined,
        publishDate: report.publishDate ? new Date(report.publishDate as string) : undefined,
        isPublic: report.isPublic === 'true',
        viewCount: parseInt(report.viewCount as string) || 0,
        downloadCount: parseInt(report.downloadCount as string) || 0,
        createdAt: new Date(report.createdAt as string),
        updatedAt: new Date(report.updatedAt as string),
        createdBy: report.createdBy as string
      }))

    return {
      reports: parsedReports,
      total,
      hasMore: offset + limit < total
    }
  } catch (error) {
    console.error('Error getting official research reports:', error)
    return { reports: [], total: 0, hasMore: false }
  }
}

export default async function DiscoveryPage() {
  // 并行获取两类报告，默认加载5个
  const [userReportsData, officialReportsData] = await Promise.all([
    getPublicReports(1, 5),
    getOfficialReportsDirect(1, 5)
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Discovery</h1>
          <p className="text-muted-foreground mt-1">
            发现优质的市场调研报告，获取行业洞察
          </p>
        </div>
        <Link href="/">
          <Button>开始我的调研</Button>
        </Link>
      </div>

      <DiscoveryGrid
        initialUserReports={userReportsData.reports}
        initialOfficialReports={officialReportsData.reports}
        initialUserTotal={userReportsData.total}
        initialOfficialTotal={officialReportsData.total}
      />

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}
