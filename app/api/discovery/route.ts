import { NextRequest, NextResponse } from 'next/server'

import { getPublicReports } from '@/lib/actions/report'
import { getRedisClient } from '@/lib/redis/config'

// Force dynamic rendering to avoid caching
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '12', 10)
    const type = searchParams.get('type') || 'all' // 'all' | 'user' | 'official'

    // 根据类型返回不同的报告
    if (type === 'user') {
      // 只返回用户分享的报告
      const result = await getPublicReports(page, limit)
      return NextResponse.json({
        success: true,
        data: {
          ...result,
          type: 'user'
        }
      })
    }

    if (type === 'official') {
      // 只返回官方调研报告 - 直接使用 Redis 客户端
      const redis = await getRedisClient()
      const publicReportsKey = 'research-reports:v1:public'

      const total = await redis.zcard(publicReportsKey)
      const offset = (page - 1) * limit

      const reportKeys = await redis.zrange(publicReportsKey, offset, offset + limit - 1, {
        rev: true
      })

      if (reportKeys.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            reports: [],
            total,
            hasMore: false,
            type: 'official'
          }
        })
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
          ...report,
          tags: typeof report.tags === 'string' ? JSON.parse(report.tags as string) : report.tags,
          isPublic: report.isPublic === 'true',
          viewCount: parseInt(report.viewCount as string) || 0,
          downloadCount: parseInt(report.downloadCount as string) || 0,
          pdfFileSize: parseInt(report.pdfFileSize as string) || 0,
          createdAt: new Date(report.createdAt as string),
          updatedAt: new Date(report.updatedAt as string),
          publishDate: report.publishDate ? new Date(report.publishDate as string) : null
        }))

      return NextResponse.json({
        success: true,
        data: {
          reports: parsedReports,
          total,
          hasMore: offset + limit < total,
          type: 'official'
        }
      })
    }

    // 返回所有报告（混合）- 用户报告 + 官方调研报告
    const redis = await getRedisClient()
    const publicReportsKey = 'research-reports:v1:public'

    // 获取用户报告
    const userReports = await getPublicReports(page, Math.ceil(limit / 2))

    // 获取官方调研报告
    const officialTotal = await redis.zcard(publicReportsKey)
    const offset = (page - 1) * Math.ceil(limit / 2)
    const reportKeys = await redis.zrange(publicReportsKey, offset, offset + Math.ceil(limit / 2) - 1, {
      rev: true
    })

    let officialReports: Record<string, unknown>[] = []
    if (reportKeys.length > 0) {
      const reports = await Promise.all(
        reportKeys.map(async reportKey => {
          const report = await redis.hgetall(reportKey)
          return report
        })
      )

      officialReports = reports
        .filter((report): report is Record<string, unknown> => {
          return report !== null && Object.keys(report).length > 0
        })
        .map(report => ({
          ...report,
          tags: typeof report.tags === 'string' ? JSON.parse(report.tags as string) : report.tags,
          isPublic: report.isPublic === 'true',
          viewCount: parseInt(report.viewCount as string) || 0,
          downloadCount: parseInt(report.downloadCount as string) || 0,
          pdfFileSize: parseInt(report.pdfFileSize as string) || 0,
          createdAt: new Date(report.createdAt as string),
          updatedAt: new Date(report.updatedAt as string),
          publishDate: report.publishDate ? new Date(report.publishDate as string) : null
        }))
    }

    return NextResponse.json({
      success: true,
      data: {
        userReports: userReports.reports,
        officialReports: officialReports,
        userTotal: userReports.total,
        officialTotal: officialTotal,
        total: userReports.total + officialTotal,
        hasMore: userReports.hasMore || (offset + Math.ceil(limit / 2) < officialTotal),
        type: 'all'
      }
    })
  } catch (error) {
    console.error('获取公开报告列表错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取报告列表失败' },
      { status: 500 }
    )
  }
}
