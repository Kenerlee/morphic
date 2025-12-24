'use client'

import { useState } from 'react'

import {
  Consultation,
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_TYPE_LABELS,
  ConsultationStatus} from '@/lib/types/consultation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

interface ConsultationTableProps {
  initialConsultations: Consultation[]
}

const statusColors: Record<ConsultationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

export function ConsultationTable({
  initialConsultations
}: ConsultationTableProps) {
  const [consultations, setConsultations] =
    useState<Consultation[]>(initialConsultations)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingConsultation, setEditingConsultation] =
    useState<Consultation | null>(null)
  const [editStatus, setEditStatus] = useState<ConsultationStatus>('pending')
  const [editNotes, setEditNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredConsultations = consultations.filter(c =>
    filterStatus === 'all' ? true : c.status === filterStatus
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEdit = (consultation: Consultation) => {
    setEditingConsultation(consultation)
    setEditStatus(consultation.status)
    setEditNotes(consultation.admin_notes || '')
  }

  const handleSave = async () => {
    if (!editingConsultation) return

    setIsUpdating(true)
    try {
      const response = await fetch(
        `/api/consultations/${editingConsultation.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: editStatus,
            admin_notes: editNotes
          })
        }
      )

      if (!response.ok) {
        throw new Error('更新失败')
      }

      const { data } = await response.json()

      setConsultations(prev =>
        prev.map(c => (c.id === editingConsultation.id ? data : c))
      )
      setEditingConsultation(null)
    } catch (error) {
      console.error('更新咨询记录失败:', error)
      alert('更新失败，请重试')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条咨询记录吗？')) return

    try {
      const response = await fetch(`/api/consultations/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      setConsultations(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      console.error('删除咨询记录失败:', error)
      alert('删除失败，请重试')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="contacted">已联系</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>公司</TableHead>
              <TableHead>电话</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>咨询类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>提交时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConsultations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  暂无咨询记录
                </TableCell>
              </TableRow>
            ) : (
              filteredConsultations.map(consultation => (
                <TableRow key={consultation.id}>
                  <TableCell className="font-medium">
                    {consultation.name}
                  </TableCell>
                  <TableCell>{consultation.company || '-'}</TableCell>
                  <TableCell>{consultation.phone}</TableCell>
                  <TableCell>{consultation.email || '-'}</TableCell>
                  <TableCell>
                    {CONSULTATION_TYPE_LABELS[consultation.consultation_type]}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[consultation.status]}`}
                    >
                      {CONSULTATION_STATUS_LABELS[consultation.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(consultation.created_at)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(consultation)}
                    >
                      处理
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(consultation.id)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingConsultation}
        onOpenChange={() => setEditingConsultation(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>处理咨询</DialogTitle>
          </DialogHeader>

          {editingConsultation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">姓名：</span>
                  <span className="font-medium">{editingConsultation.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">电话：</span>
                  <span className="font-medium">{editingConsultation.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">公司：</span>
                  <span>{editingConsultation.company || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">邮箱：</span>
                  <span>{editingConsultation.email || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">咨询类型：</span>
                  <span>
                    {
                      CONSULTATION_TYPE_LABELS[
                        editingConsultation.consultation_type
                      ]
                    }
                  </span>
                </div>
                {editingConsultation.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">需求描述：</span>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">
                      {editingConsultation.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={editStatus}
                  onValueChange={v => setEditStatus(v as ConsultationStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="contacted">已联系</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>管理员备注</Label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="添加处理备注..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingConsultation(null)}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
