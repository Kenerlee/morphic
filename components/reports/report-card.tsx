'use client'

import { useState } from 'react'
import Link from 'next/link'

import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { FileText, MoreVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Report } from '@/lib/types/report'

import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'

interface ReportCardProps {
  report: Report
  onDelete?: (reportId: string) => void
}

export function ReportCard({ report, onDelete }: ReportCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  // Generate consistent random height based on report ID
  const getCardHeight = (id: string | undefined) => {
    const heights = ['h-48', 'h-56', 'h-64', 'h-52', 'h-60', 'h-44']
    if (!id) return heights[0]
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return heights[hash % heights.length]
  }

  const imageHeight = getCardHeight(report?.id)

  const handleDelete = async () => {
    if (!confirm('确定要删除这份报告吗？此操作无法撤销。')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete report')
      }

      toast.success('报告已删除')
      onDelete?.(report.id)
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('删除报告失败')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl break-inside-avoid">
      <Link href={`/reports/${report.id}`}>
        <div className="relative">
          {report.coverImage ? (
            <div
              className={`w-full ${imageHeight} overflow-hidden rounded-t-xl`}
            >
              <img
                src={report.coverImage}
                alt={report.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div
              className={`w-full ${imageHeight} bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 flex items-center justify-center relative overflow-hidden rounded-t-xl`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
              <FileText className="h-12 w-12 text-white/90 relative z-10" />
            </div>
          )}

          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 shadow-lg"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={e => {
                    e.preventDefault()
                    handleDelete()
                  }}
                  className="text-red-600 dark:text-red-400"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除报告
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardContent className="p-4">
          <CardTitle className="text-sm font-semibold line-clamp-3 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-relaxed">
            {report.title}
          </CardTitle>

          <div className="space-y-2">
            {report.metadata && (
              <div className="flex flex-wrap gap-1.5">
                {report.metadata.company && (
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs">
                    {report.metadata.company}
                  </span>
                )}
                {report.metadata.destination && (
                  <span className="px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs">
                    {report.metadata.destination}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
