'use client'

import { useCallback,useEffect, useState } from 'react'

import { RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CaptchaProps {
  onVerified: (token: string) => void
  onError?: (error: string) => void
  messages: {
    title?: string
    placeholder?: string
    refresh?: string
    verifying?: string
    error?: string
  }
  className?: string
}

export function Captcha({
  onVerified,
  onError,
  messages,
  className
}: CaptchaProps) {
  const [captchaId, setCaptchaId] = useState<string>('')
  const [captchaImage, setCaptchaImage] = useState<string>('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCaptcha = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    setCaptchaCode('')

    try {
      const response = await fetch('/api/auth/captcha')
      const data = await response.json()

      if (response.ok) {
        setCaptchaId(data.captcha_id)
        setCaptchaImage(data.captcha_image)
      } else {
        setError(data.error || '加载验证码失败')
      }
    } catch (err) {
      setError('加载验证码失败')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCaptcha()
  }, [loadCaptcha])

  const handleVerify = async () => {
    if (!captchaCode || captchaCode.trim().length === 0) {
      setError('请输入验证码答案')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captcha_id: captchaId,
          captcha_code: captchaCode
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onVerified(data.captcha_token)
      } else {
        setError(data.error || messages.error || '验证码错误')
        onError?.(data.error || messages.error || '验证码错误')
        // Refresh captcha on error
        loadCaptcha()
      }
    } catch (err) {
      const errorMsg = '验证失败，请重试'
      setError(errorMsg)
      onError?.(errorMsg)
      loadCaptcha()
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && captchaCode.trim().length > 0) {
      handleVerify()
    }
  }

  return (
    <div className={cn('grid gap-4', className)}>
      <div className="grid gap-2">
        <Label>{messages.title || '请输入验证码'}</Label>
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {captchaImage ? (
              <img
                src={captchaImage}
                alt="验证码"
                className="h-10 w-[120px] rounded border bg-white"
              />
            ) : (
              <div className="flex h-10 w-[120px] items-center justify-center rounded border bg-muted">
                <RefreshCw className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadCaptcha}
            disabled={isRefreshing}
            title={messages.refresh || '刷新验证码'}
          >
            <RefreshCw
              className={cn('size-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Input
          type="text"
          maxLength={10}
          placeholder={messages.placeholder || '请输入计算结果'}
          value={captchaCode}
          onChange={e => setCaptchaCode(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        type="button"
        onClick={handleVerify}
        disabled={isLoading || captchaCode.trim().length === 0}
        className="w-full"
      >
        {isLoading ? (messages.verifying || '验证中...') : '验证'}
      </Button>
    </div>
  )
}
