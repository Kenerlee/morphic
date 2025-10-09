import Link from 'next/link'
import { redirect } from 'next/navigation'

import { FileText, Plus } from 'lucide-react'

import { getReports } from '@/lib/actions/report'
import { getCurrentUserId } from '@/lib/auth/get-current-user'

import { Button } from '@/components/ui/button'

import { ReportCard } from '@/components/reports/report-card'
import {
  EmptyReportsState,
  NewReportButton,
  ReportsCount,
  ReportsPageHeader} from '@/components/reports-page-client'

export const metadata = {
  title: '我的报告 - 出海罗盘',
  description: '查看和管理您保存的出海市场研究报告'
}

export default async function ReportsPage() {
  const userId = await getCurrentUserId()

  if (!userId) {
    redirect('/auth/login')
  }

  const reports = await getReports(userId)

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <ReportsPageHeader />
            </div>
            <NewReportButton />
          </div>
          <ReportsCount count={reports.length} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {reports.length === 0 ? (
            <EmptyReportsState />
          ) : (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-6 space-y-6">
              {reports.map(report => (
                <div key={report.id} className="mb-6 break-inside-avoid">
                  <ReportCard report={report} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
