'use client'

import { useState } from 'react'

import { UserLevel,UserProfile } from '@/lib/types/user-profile'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
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

interface LevelEditorProps {
  user: UserProfile
  onClose: () => void
  onUpdate: (userId: string, updatedUser: UserProfile) => void
}

const levelOptions: { value: UserLevel; label: string; description: string }[] = [
  { value: 'free', label: 'Free', description: '免费用户，3次/月' },
  { value: 'pro', label: 'Pro', description: '专业用户，20次/月' },
  { value: 'vip', label: 'VIP', description: 'VIP用户，100次/月' },
  { value: 'admin', label: 'Admin', description: '管理员，无限次数' }
]

export function LevelEditor({ user, onClose, onUpdate }: LevelEditorProps) {
  const [level, setLevel] = useState<UserLevel>(user.level)
  const [expireDays, setExpireDays] = useState<number>(
    level === 'pro' ? 30 : level === 'vip' ? 365 : 30
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${user.id}/level`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          expire_days: expireDays
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '更新失败')
      }

      onUpdate(user.id, data.data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>修改用户等级</DialogTitle>
          <DialogDescription>
            用户 ID: {user.id.slice(0, 8)}...
            {user.mobile && ` | 手机: ${user.mobile}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="level">用户等级</Label>
            <Select
              value={level}
              onValueChange={(value: UserLevel) => {
                setLevel(value)
                if (value === 'pro') setExpireDays(30)
                else if (value === 'vip') setExpireDays(365)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择等级" />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(level === 'pro' || level === 'vip') && (
            <div className="grid gap-2">
              <Label htmlFor="expireDays">有效期（天）</Label>
              <Input
                id="expireDays"
                type="number"
                min={1}
                max={3650}
                value={expireDays}
                onChange={e => setExpireDays(parseInt(e.target.value, 10) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                将于 {new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')} 到期
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
