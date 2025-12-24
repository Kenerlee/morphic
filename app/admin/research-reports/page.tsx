'use client'

import { useEffect,useState } from 'react'

import { Download, Eye, Pencil,Trash2, Upload } from 'lucide-react'

import type { ResearchReport, ResearchReportCategory } from '@/lib/types/research-report'
import { REPORT_CATEGORY_LABELS } from '@/lib/types/research-report'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export default function ResearchReportsPage() {
  const [reports, setReports] = useState<ResearchReport[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<ResearchReport | null>(null)

  // 表单状态
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ResearchReportCategory>('market_research')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/research-reports')
      const data = await response.json()
      if (data.success) {
        setReports(data.data.reports)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('加载报告失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('market_research')
    setAuthor('')
    setTags('')
    setIsPublic(true)
    setPdfFile(null)
    setCoverFile(null)
    setEditingReport(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      if (editingReport) {
        // 更新报告
        const response = await fetch('/api/admin/research-reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingReport.id,
            title,
            description,
            category,
            author,
            tags,
            isPublic
          })
        })

        if (!response.ok) {
          throw new Error('更新失败')
        }
      } else {
        // 创建新报告
        if (!pdfFile) {
          alert('请选择 PDF 文件')
          return
        }

        const formData = new FormData()
        formData.append('title', title)
        formData.append('description', description)
        formData.append('category', category)
        formData.append('author', author)
        formData.append('tags', tags)
        formData.append('isPublic', isPublic.toString())
        formData.append('pdf', pdfFile)
        if (coverFile) {
          formData.append('cover', coverFile)
        }

        const response = await fetch('/api/admin/research-reports', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('上传失败')
        }
      }

      resetForm()
      setIsDialogOpen(false)
      loadReports()
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个报告吗？')) return

    try {
      const response = await fetch(`/api/admin/research-reports?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadReports()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  const handleEdit = (report: ResearchReport) => {
    setEditingReport(report)
    setTitle(report.title)
    setDescription(report.description)
    setCategory(report.category)
    setAuthor(report.author || '')
    setTags(report.tags.join(', '))
    setIsPublic(report.isPublic)
    setIsDialogOpen(true)
  }

  const handleTogglePublic = async (report: ResearchReport) => {
    try {
      const response = await fetch('/api/admin/research-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          isPublic: !report.isPublic
        })
      })

      if (response.ok) {
        loadReports()
      }
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">调研报告管理</h2>
          <p className="text-muted-foreground mt-1">
            管理官方调研报告，上传 PDF 文件供用户浏览
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              上传报告
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReport ? '编辑报告' : '上传新报告'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">报告标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入报告标题"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">报告简介 *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要描述报告内容"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">报告分类 *</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ResearchReportCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REPORT_CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">作者/来源</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="报告作者或来源机构"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">标签（逗号分隔）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: 东南亚, 电商, 2024"
                />
              </div>

              {!editingReport && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pdf">PDF 文件 *</Label>
                    <Input
                      id="pdf"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      required
                    />
                    {pdfFile && (
                      <p className="text-sm text-muted-foreground">
                        已选择: {pdfFile.name} ({formatFileSize(pdfFile.size)})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover">封面图片（可选）</Label>
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    />
                    {coverFile && (
                      <p className="text-sm text-muted-foreground">
                        已选择: {coverFile.name}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic">公开显示</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
                  }}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? '处理中...' : editingReport ? '保存' : '上传'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            报告列表 ({total} 篇)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无报告，点击上方按钮上传第一篇报告
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>作者</TableHead>
                  <TableHead>文件大小</TableHead>
                  <TableHead>浏览/下载</TableHead>
                  <TableHead>公开</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {report.title}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        {REPORT_CATEGORY_LABELS[report.category]}
                      </span>
                    </TableCell>
                    <TableCell>{report.author || '-'}</TableCell>
                    <TableCell>{formatFileSize(report.pdfFileSize)}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {report.viewCount} / {report.downloadCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={report.isPublic}
                        onCheckedChange={() => handleTogglePublic(report)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={report.pdfUrl} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(report)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
