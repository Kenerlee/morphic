'use client'

import Link from 'next/link'

import { FileText, Plus } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import { Button } from '@/components/ui/button'

export function ReportsPageHeader() {
  const t = useTranslations()

  return <h1 className="text-3xl font-bold">{t('reports.myReportsTitle')}</h1>
}

export function NewReportButton() {
  const t = useTranslations()

  return (
    <Button asChild>
      <Link href="/">
        <Plus className="mr-2 h-4 w-4" />
        {t('buttons.newReport')}
      </Link>
    </Button>
  )
}

export function ReportsCount({ count }: { count: number }) {
  const t = useTranslations()
  return (
    <p className="text-sm text-muted-foreground">
      {t('reports.totalReports', { count })}
    </p>
  )
}

export function EmptyReportsState() {
  const t = useTranslations()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">
        {t('reports.noReportsYet')}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('reports.noReportsMessage')}
      </p>
      <Button asChild size="lg">
        <Link href="/">
          <Plus className="mr-2 h-5 w-5" />
          {t('buttons.createFirstReport')}
        </Link>
      </Button>
    </div>
  )
}
