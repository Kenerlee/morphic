import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { ArrowLeft } from 'lucide-react'

import { getReport } from '@/lib/actions/report'
import { getCurrentUserId } from '@/lib/auth/get-current-user'

import { Button } from '@/components/ui/button'

import { ReportViewer } from '@/components/reports/report-viewer'

export const dynamic = 'force-dynamic'

export default async function ReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect('/auth/login')
  }

  const { id } = await params
  const report = await getReport(id, userId)

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold flex-1 line-clamp-1">
              {report.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <ReportViewer report={report} />
      </div>
    </div>
  )
}
