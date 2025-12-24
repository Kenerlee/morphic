import { NextRequest, NextResponse } from 'next/server'

import { mkdir,writeFile } from 'fs/promises'
import path from 'path'

import {
  createResearchReport,
  deleteResearchReport,
  updateResearchReport
} from '@/lib/actions/research-report'
import { getUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getRedisClient } from '@/lib/redis/config'
import type {
  CreateResearchReportInput,
  ResearchReport,
  ResearchReportCategory
} from '@/lib/types/research-report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 直接从 Redis 获取所有报告（绕过 Server Action 的 Redis 连接问题）
async function getAllResearchReportsDirect(
  page: number = 1,
  limit: number = 20
): Promise<{ reports: ResearchReport[]; total: number; hasMore: boolean }> {
  try {
    const redis = await getRedisClient()
    const allReportsKey = 'research-reports:v1:all'

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
      .filter((report): report is Record<string, string> => {
        return report !== null && Object.keys(report).length > 0
      })
      .map(data => ({
        id: data.id,
        title: data.title,
        description: data.description,
        pdfUrl: data.pdfUrl,
        pdfFileName: data.pdfFileName,
        pdfFileSize: parseInt(data.pdfFileSize, 10) || 0,
        coverImage: data.coverImage || undefined,
        category: data.category as ResearchReport['category'],
        tags: data.tags ? JSON.parse(data.tags) : [],
        author: data.author || undefined,
        publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
        isPublic: data.isPublic === 'true',
        viewCount: parseInt(data.viewCount, 10) || 0,
        downloadCount: parseInt(data.downloadCount, 10) || 0,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        createdBy: data.createdBy
      }))

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

// 验证是否为 Admin
async function verifyAdmin(): Promise<{ userId: string } | null> {
  try {
    const user = await getCurrentUser()

    if (!user) return null

    const profile = await getUserProfile(user.id)
    if (!profile || profile.level !== 'admin') return null

    return { userId: user.id }
  } catch {
    return null
  }
}

// GET - 获取所有官方报告列表（Admin）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getAllResearchReportsDirect(page, limit)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取报告列表错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取报告列表失败' },
      { status: 500 }
    )
  }
}

// POST - 上传新的官方报告
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  try {
    const formData = await request.formData()

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as ResearchReportCategory
    const author = formData.get('author') as string | null
    const tags = formData.get('tags') as string | null
    const isPublic = formData.get('isPublic') === 'true'
    const pdfFile = formData.get('pdf') as File | null
    const coverFile = formData.get('cover') as File | null

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: '标题、描述和分类为必填项' },
        { status: 400 }
      )
    }

    if (!pdfFile) {
      return NextResponse.json({ error: 'PDF 文件为必填项' }, { status: 400 })
    }

    // 创建上传目录
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'research-reports'
    )
    await mkdir(uploadDir, { recursive: true })

    // 保存 PDF 文件
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())
    const pdfFileName = `${Date.now()}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const pdfPath = path.join(uploadDir, pdfFileName)
    await writeFile(pdfPath, pdfBuffer)
    const pdfUrl = `/uploads/research-reports/${pdfFileName}`

    // 保存封面图片（如果有）
    let coverUrl: string | undefined
    if (coverFile) {
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer())
      const coverFileName = `cover_${Date.now()}_${coverFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const coverPath = path.join(uploadDir, coverFileName)
      await writeFile(coverPath, coverBuffer)
      coverUrl = `/uploads/research-reports/${coverFileName}`
    }

    const input: CreateResearchReportInput = {
      title,
      description,
      pdfUrl,
      pdfFileName: pdfFile.name,
      pdfFileSize: pdfFile.size,
      coverImage: coverUrl,
      category,
      tags: tags
        ? tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        : [],
      author: author || undefined,
      isPublic
    }

    const report = await createResearchReport(admin.userId, input)

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('上传报告错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传报告失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新报告
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: '报告 ID 为必填项' }, { status: 400 })
    }

    // 处理 tags
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    }

    // 处理 publishDate
    if (updates.publishDate) {
      updates.publishDate = new Date(updates.publishDate)
    }

    const report = await updateResearchReport(id, updates)

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('更新报告错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新报告失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除报告
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '报告 ID 为必填项' }, { status: 400 })
    }

    const success = await deleteResearchReport(id)

    if (!success) {
      return NextResponse.json(
        { error: '删除失败，报告可能不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('删除报告错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除报告失败' },
      { status: 500 }
    )
  }
}
