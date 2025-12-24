'use client'

import Link from 'next/link'

import { BadgeCheck,Download, Eye, FileText } from 'lucide-react'

import type { ResearchReport } from '@/lib/types/research-report'
import { REPORT_CATEGORY_LABELS } from '@/lib/types/research-report'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ResearchReportCardProps {
  report: ResearchReport
}

export function ResearchReportCard({ report }: ResearchReportCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Link href={`/discovery/research/${report.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden">
        {/* 官方报告标识 */}
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="bg-blue-500/90 text-white hover:bg-blue-500">
            <BadgeCheck className="h-3 w-3 mr-1" />
            官方
          </Badge>
        </div>

        {report.coverImage ? (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
            <img
              src={report.coverImage}
              alt={report.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        ) : (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
            <FileText className="h-16 w-16 text-blue-400 dark:text-blue-300" />
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="shrink-0 text-xs">
              {REPORT_CATEGORY_LABELS[report.category]}
            </Badge>
          </div>
          <CardTitle className="text-lg line-clamp-2 mt-2">
            {report.title}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {report.description}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {report.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {report.downloadCount}
              </span>
            </div>
            <span>{formatFileSize(report.pdfFileSize)}</span>
          </div>

          {report.author && (
            <p className="text-xs text-muted-foreground mt-2">
              来源: {report.author}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(report.publishDate || report.createdAt)}
            </span>
          </div>

          {report.tags && report.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {report.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-muted rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
