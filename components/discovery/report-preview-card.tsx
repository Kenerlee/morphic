'use client'

import Link from 'next/link'

import { Report } from '@/lib/types/report'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReportPreviewCardProps {
  report: Report
}

export function ReportPreviewCard({ report }: ReportPreviewCardProps) {
  // Extract a preview from the content (strip HTML)
  const getPreview = (content: string, maxLength: number = 150) => {
    const text = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Link href={`/discovery/${report.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        {report.coverImage && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={report.coverImage}
              alt={report.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-2">{report.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {getPreview(report.content)}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(report.updatedAt)}</span>
            {report.metadata?.wordCount && (
              <span>{report.metadata.wordCount} 字</span>
            )}
          </div>
          {report.metadata?.tags && report.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {report.metadata.tags.slice(0, 3).map((tag, index) => (
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
