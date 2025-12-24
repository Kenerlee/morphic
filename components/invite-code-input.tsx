'use client'

import { useState } from 'react'

import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InviteCodeInputProps {
  onActivated?: () => void
  className?: string
}

export function InviteCodeInput({ onActivated, className }: InviteCodeInputProps) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleActivate = async () => {
    if (!code || code.length < 6) {
      setMessage('请输入有效的邀请码')
      setStatus('error')
      return
    }

    setStatus('loading')

    try {
      const { error } = await authClient.invite.activate({ code })

      if (error) {
        throw new Error(error.message || '邀请码无效')
      }

      setStatus('success')
      setMessage('邀请码激活成功！注册后将获得完整权限')
      onActivated?.()
    } catch (error: unknown) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '激活失败')
    }
  }

  const statusClass = status === 'success' ? 'text-green-600' : 'text-red-500'

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="输入邀请码 (可选)"
          maxLength={8}
          className="font-mono"
        />
        <Button
          type="button"
          onClick={handleActivate}
          disabled={status === 'loading' || !code}
          variant="outline"
        >
          {status === 'loading' ? '验证中...' : '激活'}
        </Button>
      </div>
      {message && (
        <p className={"text-sm mt-2 " + statusClass}>
          {message}
        </p>
      )}
    </div>
  )
}
