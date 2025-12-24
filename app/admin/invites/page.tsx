'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface Invite {
  code: string
  createdBy: string
  createdAt: string
  expiresAt: string
  usedBy?: string
  usedAt?: string
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [batchCount, setBatchCount] = useState(5)

  // Load existing invites
  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    try {
      const response = await fetch('/api/admin/invites')
      const data = await response.json()
      if (data.success) {
        setInvites(data.invites)
      }
    } catch (err) {
      console.error('Failed to load invites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createInvites = async () => {
    setIsCreating(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建失败')
      }

      setInvites(prev => [...data.invites, ...prev])
      setSuccessMessage(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setSuccessMessage(`已复制邀请码: ${code}`)
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  const copyAllCodes = () => {
    const unusedCodes = invites
      .filter(i => !i.usedBy && new Date(i.expiresAt) > new Date())
      .map(i => i.code)
      .join('\n')
    navigator.clipboard.writeText(unusedCodes)
    setSuccessMessage(`已复制 ${unusedCodes.split('\n').length} 个可用邀请码`)
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getStatus = (invite: Invite) => {
    if (invite.usedBy) {
      return { label: '已使用', color: 'bg-gray-100 text-gray-800' }
    }
    if (new Date(invite.expiresAt) < new Date()) {
      return { label: '已过期', color: 'bg-red-100 text-red-800' }
    }
    return { label: '可用', color: 'bg-green-100 text-green-800' }
  }

  const availableCount = invites.filter(
    i => !i.usedBy && new Date(i.expiresAt) > new Date()
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">邀请码管理</h2>
        <p className="text-sm text-muted-foreground">
          共 {invites.length} 个邀请码，{availableCount} 个可用
        </p>
      </div>

      {/* 创建区域 */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h3 className="font-medium mb-4">创建邀请码</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">批量创建</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={batchCount}
              onChange={e =>
                setBatchCount(
                  Math.min(20, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">个</span>
          </div>
          <Button onClick={createInvites} disabled={isCreating}>
            {isCreating ? '创建中...' : '创建邀请码'}
          </Button>
          {availableCount > 0 && (
            <Button variant="outline" onClick={copyAllCodes}>
              复制所有可用邀请码
            </Button>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {successMessage && (
          <p className="mt-2 text-sm text-green-600">{successMessage}</p>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>• 每个邀请码有效期为 7 天</p>
          <p>• 每个邀请码只能使用一次</p>
          <p>• 使用邀请码注册的用户将获得 &quot;user&quot; 角色</p>
        </div>
      </div>

      {/* 邀请码列表 */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          加载中...
        </div>
      ) : invites.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请码</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>过期时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>使用者</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite, index) => {
                const status = getStatus(invite)
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-lg tracking-wider">
                      {invite.code}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(invite.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(invite.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invite.usedBy ? (
                        <span className="font-mono text-xs">
                          {invite.usedBy.slice(0, 8)}...
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(invite.code)}
                        disabled={!!invite.usedBy}
                      >
                        复制
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>暂无邀请码</p>
          <p className="text-sm mt-1">点击上方按钮创建邀请码</p>
        </div>
      )}
    </div>
  )
}
