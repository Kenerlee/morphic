'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth/client'
import { cn } from '@/lib/utils/index'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { IconLogo } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

interface SignUpFormProps extends React.ComponentPropsWithoutRef<'div'> {
  messages: any
  initialInviteCode?: string
}

export function SignUpForm({ className, messages, initialInviteCode = '', ...props }: SignUpFormProps) {
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase())
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // 验证邀请码
  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 6) {
      setInviteStatus('idle')
      return
    }

    try {
      const response = await fetch('/api/auth/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() })
      })
      const data = await response.json()
      setInviteStatus(data.valid ? 'valid' : 'invalid')
    } catch {
      setInviteStatus('invalid')
    }
  }

  // Validate initial invite code if provided via URL
  useEffect(() => {
    if (initialInviteCode && initialInviteCode.length >= 6) {
      validateInviteCode(initialInviteCode)
    }
  }, [initialInviteCode])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      setIsLoading(false)
      return
    }

    try {
      // 使用 Better Auth 注册
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0], // 使用邮箱前缀作为默认名称
      })

      if (error) {
        throw new Error(error.message || '注册失败')
      }

      // 如果有有效的邀请码，激活它（升级用户角色）
      if (inviteCode && inviteStatus === 'valid') {
        try {
          await fetch('/api/auth/invite/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode })
          })
        } catch (err) {
          console.error('Failed to activate invite:', err)
          // 不阻止注册流程
        }
      }

      // 注册成功后直接登录（Better Auth 默认会自动登录）
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn('flex flex-col items-center gap-6', className)}
      {...props}
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex flex-col items-center justify-center gap-4">
            <IconLogo className="size-12" />
            {t('auth.createAccount')}
          </CardTitle>
          <CardDescription>
            {t('auth.enterDetailsToGetStarted')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('placeholders.emailPlaceholder')}
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                </div>
                <PasswordInput
                  id="password"
                  type="password"
                  placeholder={t('placeholders.passwordPlaceholder')}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">{t('auth.repeatPassword')}</Label>
                </div>
                <PasswordInput
                  id="repeat-password"
                  type="password"
                  placeholder={t('placeholders.passwordPlaceholder')}
                  required
                  value={repeatPassword}
                  onChange={e => setRepeatPassword(e.target.value)}
                />
              </div>

              {/* 邀请码输入 */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="invite-code">{t('auth.inviteCode')}</Label>
                  <span className="text-xs text-muted-foreground">{t('auth.optional')}</span>
                </div>
                <div className="relative">
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder={t('placeholders.inviteCodePlaceholder')}
                    value={inviteCode}
                    onChange={e => {
                      const code = e.target.value.toUpperCase()
                      setInviteCode(code)
                      if (code.length >= 6) {
                        validateInviteCode(code)
                      } else {
                        setInviteStatus('idle')
                      }
                    }}
                    maxLength={8}
                    className={cn(
                      'font-mono tracking-wider',
                      inviteStatus === 'valid' && 'border-green-500 focus-visible:ring-green-500',
                      inviteStatus === 'invalid' && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                  {inviteStatus === 'valid' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
                      ✓ {t('auth.inviteCodeValid')}
                    </span>
                  )}
                  {inviteStatus === 'invalid' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-sm">
                      ✗ {t('auth.inviteCodeInvalid')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('auth.inviteCodeHint')}
                </p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
              </Button>

              <Link
                href={inviteCode ? `/auth/sign-up?invite=${inviteCode}` : '/auth/sign-up'}
                className="text-center text-sm text-muted-foreground hover:underline"
              >
                {t('auth.usePhoneSignUp')}
              </Link>
            </div>
            <div className="mt-6 text-center text-sm">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                {t('auth.signIn')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          {t('auth.backToHome')}
        </Link>
      </div>
    </div>
  )
}
