import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPublicReport } from '@/lib/actions/report'

import { Button } from '@/components/ui/button'

interface DiscoveryReportPageProps {
  params: Promise<{ id: string }>
}

export default async function DiscoveryReportPage({
  params
}: DiscoveryReportPageProps) {
  const { id } = await params
  const report = await getPublicReport(id)

  if (!report) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/discovery"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; 返回 Discovery
        </Link>
      </div>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{report.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>发布于 {formatDate(report.updatedAt)}</span>
            {report.metadata?.wordCount && (
              <span>{report.metadata.wordCount} 字</span>
            )}
          </div>
          {report.metadata?.tags && report.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {report.metadata.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {report.coverImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={report.coverImage}
              alt={report.title}
              className="w-full h-auto"
            />
          </div>
        )}

        <div
          className="prose prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: report.content }}
        />
      </article>

      <div className="mt-12 pt-8 border-t">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            想要创建自己的市场调研报告？
          </p>
          <Link href="/">
            <Button size="lg">开始我的调研</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
