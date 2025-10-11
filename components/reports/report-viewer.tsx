'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronDown, Download, Edit, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Report } from '@/lib/types/report'

// Dynamically import heavy components
const EnhancedRichTextEditor = dynamic(
  () =>
    import('../edit/enhanced-rich-text-editor').then(
      mod => mod.EnhancedRichTextEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'

interface ReportViewerProps {
  report: Report
}

export function ReportViewer({ report: initialReport }: ReportViewerProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(true) // Default to editing mode
  const [report, setReport] = useState(initialReport)
  const [editedContent, setEditedContent] = useState(initialReport.content)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editedContent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save report')
      }

      const { report: updatedReport } = await response.json()
      setReport(updatedReport)
      setIsEditing(false)
      toast.success('报告已保存')
      router.refresh()
    } catch (error) {
      console.error('Error saving report:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Dynamically import PDF export library only when needed
      const { exportToPDF } = await import('@/lib/utils/export-enhanced-pdf')
      await exportToPDF({
        title: report.title,
        content: report.content,
        filename: `${report.title}-${Date.now()}.pdf`
      })
      toast.success('已导出为 PDF')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportWord = async () => {
    setIsExporting(true)
    try {
      // Dynamically import Word export library only when needed
      const { exportToWord } = await import('@/lib/utils/export-enhanced-word')
      await exportToWord({
        title: report.title,
        content: report.content,
        filename: `${report.title}-${Date.now()}.docx`
      })
      toast.success('已导出为 Word')
    } catch (error) {
      console.error('Error exporting Word:', error)
      toast.error('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  // If editing, show full-screen editor
  if (isEditing) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Edit Mode Header */}
        <div className="border-b bg-background px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">编辑报告</h2>
            <span className="text-sm text-muted-foreground">
              {report.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              保存
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  导出为 PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord}>
                  导出为 Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Enhanced Editor - Full Height */}
        <div className="flex-1 overflow-hidden">
          <EnhancedRichTextEditor
            content={editedContent}
            onChange={setEditedContent}
            className="h-full border-0"
            showOutline={true}
          />
        </div>
      </div>
    )
  }

  // View mode - normal layout
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Report Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{report.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                创建时间：
                {format(new Date(report.createdAt), 'yyyy年MM月dd日 HH:mm', {
                  locale: zhCN
                })}
              </span>
              {report.metadata?.wordCount && (
                <span>{report.metadata.wordCount.toLocaleString()} 字</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              编辑
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  导出为 PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportWord}>
                  导出为 Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata Tags */}
        {report.metadata && (
          <div className="flex flex-wrap gap-2">
            {report.metadata.company && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                {report.metadata.company}
              </span>
            )}
            {report.metadata.destination && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm">
                {report.metadata.destination}
              </span>
            )}
            {report.metadata.industry && (
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                {report.metadata.industry}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Report Content - Read Only View */}
      <div className="border rounded-lg p-8 bg-white dark:bg-gray-900">
        <div
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mb-3 prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-2 prose-p:leading-relaxed prose-p:mb-4 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:my-6 prose-table:my-6 prose-ul:my-4 prose-ol:my-4"
          dangerouslySetInnerHTML={{ __html: report.content }}
        />
      </div>
    </div>
  )
}
