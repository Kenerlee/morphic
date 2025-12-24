'use server'

import { revalidatePath } from 'next/cache'

import { getRedisClient, RedisWrapper } from '@/lib/redis/config'
import {
  type CreateReportInput,
  type Report,
  type UpdateReportInput
} from '@/lib/types/report'

async function getRedis(): Promise<RedisWrapper> {
  return await getRedisClient()
}

const REPORT_VERSION = 'v1'

function getUserReportsKey(userId: string) {
  return `user:${REPORT_VERSION}:reports:${userId}`
}

function getReportKey(reportId: string) {
  return `report:${REPORT_VERSION}:${reportId}`
}

function getPublicReportsKey() {
  return `reports:${REPORT_VERSION}:public`
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Extract keywords from HTML content for title generation
 */
function extractKeywords(content: string): {
  company?: string
  product?: string
  destination?: string
} {
  // Strip HTML tags using regex (server-safe approach)
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extract company/product/destination patterns (can be enhanced with NLP)
  const keywords: { company?: string; product?: string; destination?: string } =
    {}

  // Simple pattern matching - can be improved
  const companyMatch = text.match(/([\u4e00-\u9fa5]{2,8})(公司|集团|企业)/)
  if (companyMatch) keywords.company = companyMatch[0]

  const productMatch = text.match(/([\u4e00-\u9fa5]{2,8})(产品|服务|平台)/)
  if (productMatch) keywords.product = productMatch[0]

  const destinationMatch = text.match(
    /(美国|欧洲|日本|韩国|东南亚|印度|巴西|中东)/
  )
  if (destinationMatch) keywords.destination = destinationMatch[0]

  return keywords
}

/**
 * Generate report title from content
 * Extracts the first heading (h1, h2, h3) from HTML content
 * Falls back to keyword-based title if no heading is found
 */
export async function generateReportTitle(
  content: string,
  metadata?: Partial<Report['metadata']>
): Promise<string> {
  // Try to extract the first heading from HTML content
  const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim()
  }

  const h2Match = content.match(/<h2[^>]*>(.*?)<\/h2>/i)
  if (h2Match) {
    return h2Match[1].replace(/<[^>]*>/g, '').trim()
  }

  const h3Match = content.match(/<h3[^>]*>(.*?)<\/h3>/i)
  if (h3Match) {
    return h3Match[1].replace(/<[^>]*>/g, '').trim()
  }

  // Fallback to keyword-based title
  const keywords = extractKeywords(content)
  const company = metadata?.company || keywords.company || '企业'
  const product = metadata?.product || keywords.product || '产品'
  const destination = metadata?.destination || keywords.destination || '海外'

  return `${company} - ${product} ${destination}市场研究报告`
}

/**
 * Create a new report
 */
export async function createReport(
  userId: string,
  input: CreateReportInput
): Promise<Report> {
  const redis = await getRedis()
  const reportId = generateReportId()
  const now = new Date()

  // Count words in content (strip HTML tags)
  const textContent = input.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = textContent.split(/\s+/).length

  const report: Report = {
    id: reportId,
    userId,
    title: input.title,
    content: input.content,
    coverImage: input.coverImage,
    isPublic: false,
    metadata: {
      ...input.metadata,
      wordCount
    },
    createdAt: now,
    updatedAt: now
  }

  const reportKey = getReportKey(reportId)
  const userReportsKey = getUserReportsKey(userId)

  // Store report
  await redis.hmset(reportKey, {
    id: report.id,
    userId: report.userId,
    title: report.title,
    content: report.content,
    coverImage: report.coverImage || '',
    isPublic: 'false',
    metadata: JSON.stringify(report.metadata),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  })

  // Add to user's reports list (sorted by creation time)
  await redis.zadd(userReportsKey, now.getTime(), reportKey)

  revalidatePath('/reports')
  return report
}

/**
 * Get all reports for a user
 */
export async function getReports(userId: string): Promise<Report[]> {
  if (!userId) {
    return []
  }

  try {
    const redis = await getRedis()
    const userReportsKey = getUserReportsKey(userId)

    const reportKeys = await redis.zrange(userReportsKey, 0, -1, {
      rev: true // Most recent first
    })

    if (reportKeys.length === 0) {
      return []
    }

    const reports = await Promise.all(
      reportKeys.map(async reportKey => {
        const report = await redis.hgetall(reportKey)
        return report
      })
    )

    return reports
      .filter((report): report is Record<string, any> => {
        return report !== null && Object.keys(report).length > 0
      })
      .map(report => {
        const plainReport = { ...report }
        if (typeof plainReport.metadata === 'string') {
          try {
            plainReport.metadata = JSON.parse(plainReport.metadata)
          } catch {
            plainReport.metadata = {}
          }
        }
        if (plainReport.createdAt && !(plainReport.createdAt instanceof Date)) {
          plainReport.createdAt = new Date(plainReport.createdAt)
        }
        if (plainReport.updatedAt && !(plainReport.updatedAt instanceof Date)) {
          plainReport.updatedAt = new Date(plainReport.updatedAt)
        }
        // Convert isPublic string to boolean
        plainReport.isPublic = plainReport.isPublic === 'true'
        return plainReport as Report
      })
  } catch (error) {
    console.error('Error getting reports:', error)
    return []
  }
}

/**
 * Get a single report by ID
 */
export async function getReport(
  reportId: string,
  userId: string
): Promise<Report | null> {
  try {
    const redis = await getRedis()
    const reportKey = getReportKey(reportId)
    const report = await redis.hgetall(reportKey)

    if (!report || Object.keys(report).length === 0) {
      return null
    }

    // Verify ownership
    if (report.userId !== userId) {
      return null
    }

    const plainReport: any = { ...report }
    if (typeof plainReport.metadata === 'string') {
      try {
        plainReport.metadata = JSON.parse(plainReport.metadata)
      } catch {
        plainReport.metadata = {}
      }
    }
    if (plainReport.createdAt && !(plainReport.createdAt instanceof Date)) {
      plainReport.createdAt = new Date(plainReport.createdAt as string)
    }
    if (plainReport.updatedAt && !(plainReport.updatedAt instanceof Date)) {
      plainReport.updatedAt = new Date(plainReport.updatedAt as string)
    }
    // Convert isPublic string to boolean
    plainReport.isPublic = plainReport.isPublic === 'true'

    return plainReport as Report
  } catch (error) {
    console.error('Error getting report:', error)
    return null
  }
}

/**
 * Get a public report by ID (no ownership check)
 */
export async function getPublicReport(
  reportId: string
): Promise<Report | null> {
  try {
    const redis = await getRedis()
    const reportKey = getReportKey(reportId)
    const report = await redis.hgetall(reportKey)

    if (!report || Object.keys(report).length === 0) {
      return null
    }

    // Check if report is public
    if (report.isPublic !== 'true') {
      return null
    }

    const plainReport: any = { ...report }
    if (typeof plainReport.metadata === 'string') {
      try {
        plainReport.metadata = JSON.parse(plainReport.metadata)
      } catch {
        plainReport.metadata = {}
      }
    }
    if (plainReport.createdAt && !(plainReport.createdAt instanceof Date)) {
      plainReport.createdAt = new Date(plainReport.createdAt as string)
    }
    if (plainReport.updatedAt && !(plainReport.updatedAt instanceof Date)) {
      plainReport.updatedAt = new Date(plainReport.updatedAt as string)
    }
    plainReport.isPublic = true

    return plainReport as Report
  } catch (error) {
    console.error('Error getting public report:', error)
    return null
  }
}

/**
 * Update a report
 */
export async function updateReport(
  reportId: string,
  userId: string,
  input: UpdateReportInput
): Promise<Report | null> {
  try {
    const redis = await getRedis()
    const reportKey = getReportKey(reportId)

    // Get existing report
    const existing = await redis.hgetall(reportKey)
    if (!existing || Object.keys(existing).length === 0) {
      return null
    }

    // Verify ownership
    if (existing.userId !== userId) {
      return null
    }

    const now = new Date()

    // Prepare update data
    const updates: Record<string, string> = {
      updatedAt: now.toISOString()
    }

    if (input.title !== undefined) updates.title = input.title
    if (input.content !== undefined) updates.content = input.content
    if (input.coverImage !== undefined) updates.coverImage = input.coverImage

    if (input.metadata !== undefined) {
      const existingMetadata =
        typeof existing.metadata === 'string'
          ? JSON.parse(existing.metadata)
          : existing.metadata || {}
      updates.metadata = JSON.stringify({
        ...existingMetadata,
        ...input.metadata
      })
    }

    // Update word count if content changed
    if (input.content !== undefined) {
      const textContent = input.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const wordCount = textContent.split(/\s+/).length

      const metadata =
        updates.metadata !== undefined
          ? JSON.parse(updates.metadata)
          : typeof existing.metadata === 'string'
            ? JSON.parse(existing.metadata)
            : existing.metadata || {}
      metadata.wordCount = wordCount
      updates.metadata = JSON.stringify(metadata)
    }

    // Handle isPublic field
    if (input.isPublic !== undefined) {
      updates.isPublic = input.isPublic ? 'true' : 'false'
    }

    await redis.hmset(reportKey, updates)

    // Update public reports index
    if (input.isPublic !== undefined) {
      const publicReportsKey = getPublicReportsKey()
      if (input.isPublic) {
        // Add to public reports index
        await redis.zadd(publicReportsKey, Date.now(), reportKey)
      } else {
        // Remove from public reports index
        await redis.zrem(publicReportsKey, reportKey)
      }
    }

    revalidatePath('/reports')
    revalidatePath(`/reports/${reportId}`)
    revalidatePath('/discovery')

    return getReport(reportId, userId)
  } catch (error) {
    console.error('Error updating report:', error)
    return null
  }
}

/**
 * Delete a report
 */
export async function deleteReport(
  reportId: string,
  userId: string
): Promise<boolean> {
  try {
    const redis = await getRedis()
    const reportKey = getReportKey(reportId)

    // Get existing report
    const existing = await redis.hgetall(reportKey)
    if (!existing || Object.keys(existing).length === 0) {
      return false
    }

    // Verify ownership
    if (existing.userId !== userId) {
      return false
    }

    const userReportsKey = getUserReportsKey(userId)
    const publicReportsKey = getPublicReportsKey()

    // Remove from user's reports list
    await redis.zrem(userReportsKey, reportKey)

    // Remove from public reports list if it was public
    await redis.zrem(publicReportsKey, reportKey)

    // Delete report
    await redis.del(reportKey)

    revalidatePath('/reports')
    revalidatePath('/discovery')
    return true
  } catch (error) {
    console.error('Error deleting report:', error)
    return false
  }
}

/**
 * Get all public reports for Discovery page
 */
export async function getPublicReports(
  page: number = 1,
  limit: number = 12
): Promise<{ reports: Report[]; total: number; hasMore: boolean }> {
  try {
    const redis = await getRedis()
    const publicReportsKey = getPublicReportsKey()

    // Get total count
    const total = await redis.zcard(publicReportsKey)

    // Calculate offset
    const offset = (page - 1) * limit

    // Get report keys (most recent first)
    const reportKeys = await redis.zrange(
      publicReportsKey,
      offset,
      offset + limit - 1,
      {
        rev: true
      }
    )

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
      .map(report => {
        const plainReport = { ...report }
        if (typeof plainReport.metadata === 'string') {
          try {
            plainReport.metadata = JSON.parse(plainReport.metadata)
          } catch {
            plainReport.metadata = {}
          }
        }
        if (plainReport.createdAt && !(plainReport.createdAt instanceof Date)) {
          plainReport.createdAt = new Date(plainReport.createdAt)
        }
        if (plainReport.updatedAt && !(plainReport.updatedAt instanceof Date)) {
          plainReport.updatedAt = new Date(plainReport.updatedAt)
        }
        plainReport.isPublic = true
        return plainReport as Report
      })

    return {
      reports: parsedReports,
      total,
      hasMore: offset + limit < total
    }
  } catch (error) {
    console.error('Error getting public reports:', error)
    return { reports: [], total: 0, hasMore: false }
  }
}

/**
 * Toggle report public status
 */
export async function toggleReportPublic(
  reportId: string,
  userId: string,
  isPublic: boolean
): Promise<boolean> {
  const result = await updateReport(reportId, userId, { isPublic })
  return result !== null
}
