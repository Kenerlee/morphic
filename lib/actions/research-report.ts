'use server'

import { revalidatePath } from 'next/cache'

import { getRedisClient, RedisWrapper } from '@/lib/redis/config'
import {
  type CreateResearchReportInput,
  type ResearchReport,
  type ResearchReportListResult,
  type UpdateResearchReportInput
} from '@/lib/types/research-report'

async function getRedis(): Promise<RedisWrapper> {
  return await getRedisClient()
}

const REPORT_VERSION = 'v1'

function getResearchReportKey(reportId: string) {
  return `research-report:${REPORT_VERSION}:${reportId}`
}

function getPublicResearchReportsKey() {
  return `research-reports:${REPORT_VERSION}:public`
}

function getAllResearchReportsKey() {
  return `research-reports:${REPORT_VERSION}:all`
}

function generateReportId(): string {
  return `rr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * 创建官方调研报告（仅 Admin）
 */
export async function createResearchReport(
  userId: string,
  input: CreateResearchReportInput
): Promise<ResearchReport> {
  const redis = await getRedis()
  const reportId = generateReportId()
  const now = new Date()

  const report: ResearchReport = {
    id: reportId,
    title: input.title,
    description: input.description,
    pdfUrl: input.pdfUrl,
    pdfFileName: input.pdfFileName,
    pdfFileSize: input.pdfFileSize,
    coverImage: input.coverImage,
    category: input.category,
    tags: input.tags || [],
    author: input.author,
    publishDate: input.publishDate || now,
    isPublic: input.isPublic ?? true,
    viewCount: 0,
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  }

  const reportKey = getResearchReportKey(reportId)
  const allReportsKey = getAllResearchReportsKey()
  const publicReportsKey = getPublicResearchReportsKey()

  // 存储报告
  await redis.hmset(reportKey, {
    id: report.id,
    title: report.title,
    description: report.description,
    pdfUrl: report.pdfUrl,
    pdfFileName: report.pdfFileName,
    pdfFileSize: report.pdfFileSize.toString(),
    coverImage: report.coverImage || '',
    category: report.category,
    tags: JSON.stringify(report.tags),
    author: report.author || '',
    publishDate: report.publishDate?.toISOString() || '',
    isPublic: report.isPublic ? 'true' : 'false',
    viewCount: '0',
    downloadCount: '0',
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    createdBy: report.createdBy
  })

  // 添加到所有报告列表
  await redis.zadd(allReportsKey, now.getTime(), reportKey)

  // 如果公开，添加到公开列表
  if (report.isPublic) {
    await redis.zadd(publicReportsKey, now.getTime(), reportKey)
  }

  revalidatePath('/discovery')
  revalidatePath('/admin/research-reports')
  return report
}

/**
 * 获取单个官方调研报告
 */
export async function getResearchReport(
  reportId: string
): Promise<ResearchReport | null> {
  try {
    const redis = await getRedis()
    const reportKey = getResearchReportKey(reportId)
    const report = await redis.hgetall(reportKey)

    if (!report || Object.keys(report).length === 0) {
      return null
    }

    return parseResearchReport(report)
  } catch (error) {
    console.error('Error getting research report:', error)
    return null
  }
}

/**
 * 获取公开的官方调研报告（仅公开的）
 */
export async function getPublicResearchReport(
  reportId: string
): Promise<ResearchReport | null> {
  const report = await getResearchReport(reportId)
  if (!report || !report.isPublic) {
    return null
  }
  return report
}

/**
 * 更新官方调研报告
 */
export async function updateResearchReport(
  reportId: string,
  input: UpdateResearchReportInput
): Promise<ResearchReport | null> {
  try {
    const redis = await getRedis()
    const reportKey = getResearchReportKey(reportId)

    const existing = await redis.hgetall(reportKey)
    if (!existing || Object.keys(existing).length === 0) {
      return null
    }

    const now = new Date()
    const updates: Record<string, string> = {
      updatedAt: now.toISOString()
    }

    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.coverImage !== undefined) updates.coverImage = input.coverImage
    if (input.category !== undefined) updates.category = input.category
    if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags)
    if (input.author !== undefined) updates.author = input.author
    if (input.publishDate !== undefined) {
      updates.publishDate = input.publishDate.toISOString()
    }

    // 处理 isPublic 字段
    if (input.isPublic !== undefined) {
      updates.isPublic = input.isPublic ? 'true' : 'false'

      const publicReportsKey = getPublicResearchReportsKey()
      if (input.isPublic) {
        await redis.zadd(publicReportsKey, Date.now(), reportKey)
      } else {
        await redis.zrem(publicReportsKey, reportKey)
      }
    }

    await redis.hmset(reportKey, updates)

    revalidatePath('/discovery')
    revalidatePath('/admin/research-reports')
    revalidatePath(`/discovery/research/${reportId}`)

    return getResearchReport(reportId)
  } catch (error) {
    console.error('Error updating research report:', error)
    return null
  }
}

/**
 * 删除官方调研报告
 */
export async function deleteResearchReport(reportId: string): Promise<boolean> {
  try {
    const redis = await getRedis()
    const reportKey = getResearchReportKey(reportId)

    const existing = await redis.hgetall(reportKey)
    if (!existing || Object.keys(existing).length === 0) {
      return false
    }

    const allReportsKey = getAllResearchReportsKey()
    const publicReportsKey = getPublicResearchReportsKey()

    // 从列表中移除
    await redis.zrem(allReportsKey, reportKey)
    await redis.zrem(publicReportsKey, reportKey)

    // 删除报告
    await redis.del(reportKey)

    revalidatePath('/discovery')
    revalidatePath('/admin/research-reports')
    return true
  } catch (error) {
    console.error('Error deleting research report:', error)
    return false
  }
}

/**
 * 获取公开的官方调研报告列表（用于 Discovery）
 */
export async function getPublicResearchReports(
  page: number = 1,
  limit: number = 12,
  category?: string
): Promise<ResearchReportListResult> {
  try {
    const redis = await getRedis()
    const publicReportsKey = getPublicResearchReportsKey()

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

    let parsedReports = reports
      .filter((report): report is Record<string, any> => {
        return report !== null && Object.keys(report).length > 0
      })
      .map(parseResearchReport)

    // 按分类筛选
    if (category && category !== 'all') {
      parsedReports = parsedReports.filter(r => r.category === category)
    }

    return {
      reports: parsedReports,
      total,
      hasMore: offset + limit < total
    }
  } catch (error) {
    console.error('Error getting public research reports:', error)
    return { reports: [], total: 0, hasMore: false }
  }
}

/**
 * 获取所有官方调研报告（Admin 用）
 */
export async function getAllResearchReports(
  page: number = 1,
  limit: number = 20
): Promise<ResearchReportListResult> {
  try {
    const redis = await getRedis()
    const allReportsKey = getAllResearchReportsKey()

    const total = await redis.zcard(allReportsKey)
    const offset = (page - 1) * limit

    const reportKeys = await redis.zrange(allReportsKey, offset, offset + limit - 1, {
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
      .filter((report): report is Record<string, any> => {
        return report !== null && Object.keys(report).length > 0
      })
      .map(parseResearchReport)

    return {
      reports: parsedReports,
      total,
      hasMore: offset + limit < total
    }
  } catch (error) {
    console.error('Error getting all research reports:', error)
    return { reports: [], total: 0, hasMore: false }
  }
}

/**
 * 增加浏览次数
 */
export async function incrementViewCount(reportId: string): Promise<void> {
  try {
    const redis = await getRedis()
    const reportKey = getResearchReportKey(reportId)
    await redis.hincrby(reportKey, 'viewCount', 1)
  } catch (error) {
    console.error('Error incrementing view count:', error)
  }
}

/**
 * 增加下载次数
 */
export async function incrementDownloadCount(reportId: string): Promise<void> {
  try {
    const redis = await getRedis()
    const reportKey = getResearchReportKey(reportId)
    await redis.hincrby(reportKey, 'downloadCount', 1)
  } catch (error) {
    console.error('Error incrementing download count:', error)
  }
}

/**
 * 解析 Redis 数据为 ResearchReport 对象
 */
function parseResearchReport(data: Record<string, any>): ResearchReport {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    pdfUrl: data.pdfUrl,
    pdfFileName: data.pdfFileName,
    pdfFileSize: parseInt(data.pdfFileSize, 10) || 0,
    coverImage: data.coverImage || undefined,
    category: data.category,
    tags: data.tags ? JSON.parse(data.tags) : [],
    author: data.author || undefined,
    publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
    isPublic: data.isPublic === 'true',
    viewCount: parseInt(data.viewCount, 10) || 0,
    downloadCount: parseInt(data.downloadCount, 10) || 0,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    createdBy: data.createdBy
  }
}
