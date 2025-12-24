import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  FileText,
  Tag,
  User
} from 'lucide-react'

import { getRedisClient } from '@/lib/redis/config'
import {
  REPORT_CATEGORY_LABELS,
  ResearchReport
} from '@/lib/types/research-report'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { PdfViewer } from '@/components/discovery/pdf-viewer'

interface PageProps {
  params: Promise<{ id: string }>
}

// 直接从 Redis 获取研究报告（避免 Server Action 的问题）
async function getResearchReportDirect(
  reportId: string
): Promise<ResearchReport | null> {
  try {
    const redis = await getRedisClient()
    const reportKey = `research-report:v1:${reportId}`
    const data = await redis.hgetall(reportKey)

    if (!data || Object.keys(data).length === 0) {
      return null
    }

    // 检查是否公开
    if (data.isPublic !== 'true') {
      return null
    }

    return {
      id: data.id as string,
      title: data.title as string,
      description: data.description as string,
      pdfUrl: data.pdfUrl as string,
      pdfFileName: data.pdfFileName as string,
      pdfFileSize: parseInt(data.pdfFileSize as string, 10) || 0,
      coverImage: (data.coverImage as string) || undefined,
      category: data.category as ResearchReport['category'],
      tags:
        typeof data.tags === 'string'
          ? JSON.parse(data.tags as string)
          : data.tags || [],
      author: (data.author as string) || undefined,
      publishDate: data.publishDate
        ? new Date(data.publishDate as string)
        : undefined,
      isPublic: true,
      viewCount: parseInt(data.viewCount as string, 10) || 0,
      downloadCount: parseInt(data.downloadCount as string, 10) || 0,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      createdBy: data.createdBy as string
    }
  } catch (error) {
    console.error('Error getting research report:', error)
    return null
  }
}

// 增加浏览次数
async function incrementViewCountDirect(reportId: string): Promise<void> {
  try {
    const redis = await getRedisClient()
    const reportKey = `research-report:v1:${reportId}`
    await redis.hincrby(reportKey, 'viewCount', 1)
  } catch (error) {
    console.error('Error incrementing view count:', error)
  }
}

export default async function ResearchReportPage({ params }: PageProps) {
  const { id } = await params
  const report = await getResearchReportDirect(id)

  if (!report) {
    notFound()
  }

  // 增加浏览次数
  await incrementViewCountDirect(id)

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 头部导航 */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/discovery"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回 Discovery
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={report.pdfUrl} download={report.pdfFileName}>
                  <Download className="h-4 w-4 mr-2" />
                  下载 PDF
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧：报告信息 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-6">
                {/* 封面图 */}
                {report.coverImage ? (
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-lg mb-6 bg-muted">
                    <img
                      src={report.coverImage}
                      alt={report.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-lg mb-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
                    <FileText className="h-24 w-24 text-blue-400 dark:text-blue-300" />
                  </div>
                )}

                {/* 分类标签 */}
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-blue-500/90 text-white">
                    {REPORT_CATEGORY_LABELS[report.category]}
                  </Badge>
                </div>

                {/* 标题 */}
                <h1 className="text-xl font-bold mb-4">{report.title}</h1>

                {/* 描述 */}
                <p className="text-muted-foreground mb-6">{report.description}</p>

                {/* 元信息 */}
                <div className="space-y-3 text-sm">
                  {report.author && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>来源: {report.author}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(report.publishDate || report.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{formatFileSize(report.pdfFileSize)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {report.viewCount + 1} 次浏览
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      {report.downloadCount} 次下载
                    </span>
                  </div>
                </div>

                {/* 标签 */}
                {report.tags && report.tags.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Tag className="h-4 w-4" />
                      标签
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 下载按钮 */}
                <div className="mt-6">
                  <Button className="w-full" asChild>
                    <a href={report.pdfUrl} download={report.pdfFileName}>
                      <Download className="h-4 w-4 mr-2" />
                      下载完整报告
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：PDF 预览 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <PdfViewer pdfUrl={report.pdfUrl} title={report.title} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
