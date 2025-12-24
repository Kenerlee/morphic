'use client'

import { useState } from 'react'

import { UserLevel,UserProfile } from '@/lib/types/user-profile'

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

import { LevelEditor } from './level-editor'

interface UserTableProps {
  initialUsers: UserProfile[]
}

const levelLabels: Record<UserLevel, string> = {
  free: 'Free',
  pro: 'Pro',
  vip: 'VIP',
  admin: 'Admin'
}

const levelColors: Record<UserLevel, string> = {
  free: 'bg-gray-100 text-gray-800',
  pro: 'bg-blue-100 text-blue-800',
  vip: 'bg-amber-100 text-amber-800',
  admin: 'bg-purple-100 text-purple-800'
}

export function UserTable({ initialUsers }: UserTableProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  const filteredUsers = users.filter(
    user =>
      user.id.toLowerCase().includes(search.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(search.toLowerCase())) ||
      (user.mobile && user.mobile.includes(search))
  )

  const handleLevelUpdate = (userId: string, updatedUser: UserProfile) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? updatedUser : u))
    )
    setEditingUser(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索用户 ID、邮箱或手机号..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户 ID</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>配额</TableHead>
              <TableHead>到期时间</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  暂无用户数据
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-xs">
                    {user.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">{user.email || '-'}</TableCell>
                  <TableCell>{user.mobile || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${levelColors[user.level]}`}
                    >
                      {levelLabels[user.level]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.quota_limit === -1
                      ? '无限'
                      : `${user.quota_used}/${user.quota_limit}`}
                  </TableCell>
                  <TableCell>{formatDate(user.level_expire_at)}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                    >
                      修改等级
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <LevelEditor
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={handleLevelUpdate}
        />
      )}
    </div>
  )
}
