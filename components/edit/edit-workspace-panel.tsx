'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ChevronDown, FileText, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import { generateReportTitle } from '@/lib/actions/report'
import { exportToPDF } from '@/lib/utils/export-enhanced-pdf'
import { exportToWord } from '@/lib/utils/export-enhanced-word'
import { exportToPDF as exportToPDFLegacy } from '@/lib/utils/export-pdf'
import { exportToWord as exportToWordLegacy } from '@/lib/utils/export-word'

import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'

import { useEdit } from './edit-context'
import { EnhancedRichTextEditor } from './enhanced-rich-text-editor'

export function EditWorkspacePanel() {
  const { state, close, updateContent, resetContent, markClean } = useEdit()
  const [isExporting, setIsExporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  if (!state.isOpen) return null

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      const title = await generateReportTitle(state.editedContent)
      await exportToPDF({
        title,
        content: state.editedContent,
        filename: `report-${Date.now()}.pdf`
      })
      toast.success('PDF 导出成功')
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('PDF 导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportWord = async () => {
    try {
      setIsExporting(true)
      const title = await generateReportTitle(state.editedContent)
      await exportToWord({
        title,
        content: state.editedContent,
        filename: `report-${Date.now()}.docx`
      })
      toast.success('Word 导出成功')
    } catch (error) {
      console.error('Word export error:', error)
      toast.error('Word 导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const extractFirstImage = (htmlContent: string): string | null => {
    // Extract first image src from HTML content
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i)
    return imgMatch ? imgMatch[1] : null
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const title = await generateReportTitle(state.editedContent)
      const coverImage = extractFirstImage(state.editedContent)

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: state.editedContent,
          coverImage,
          metadata: {}
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save report')
      }

      const { report } = await response.json()
      toast.success('已保存到"我的尽调报告"')
      close()
      router.push('/reports')
    } catch (error) {
      console.error('Error saving report:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header with close button in top-left and action buttons in top-right */}
      <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">编辑内容</h2>
          {state.isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-500">
              • 未保存
            </span>
          )}
        </div>

        {/* Top-right action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer"
          >
            <Save className="h-4 w-4 mr-1.5" />
            保存
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                className="cursor-pointer"
              >
                导出
                <ChevronDown className="h-4 w-4 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100]">
              <DropdownMenuItem
                onClick={handleExportPDF}
                className="cursor-pointer"
              >
                导出为 PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportWord}
                className="cursor-pointer"
              >
                导出为 Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Rich Text Editor */}
      <div className="flex-1 overflow-hidden">
        <EnhancedRichTextEditor
          content={state.editedContent}
          onChange={updateContent}
          className="h-full border-0"
          showOutline={false}
        />
      </div>
    </div>
  )
}
