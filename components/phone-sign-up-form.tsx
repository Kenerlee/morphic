'use client'

import { useEffect,useState } from 'react'
import Link from 'next/link'

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

interface PhoneSignUpFormProps extends React.ComponentPropsWithoutRef<'div'> {
  messages: any
  initialInviteCode?: string
}

export function PhoneSignUpForm({
  className,
  messages,
  initialInviteCode = '',
  ...props
}: PhoneSignUpFormProps) {
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  const [phone, setPhone] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [otp, setOtp] = useState('')
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase())
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)

  // 图形验证码状态
  const [captchaImage, setCaptchaImage] = useState<string>('')
  const [captchaToken, setCaptchaToken] = useState<string>('')

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

  // 加载图形验证码
  const loadCaptcha = async () => {
    try {
      const response = await fetch('/api/auth/captcha')
      const data = await response.json()
      if (data.captcha_id && data.captcha_image) {
        setCaptchaImage(data.captcha_image)
        setCaptchaToken(data.captcha_id)
        setCaptchaAnswer('')
      }
    } catch (error) {
      console.error('Failed to load captcha:', error)
    }
  }

  useEffect(() => {
    loadCaptcha()
  }, [])

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送短信验证码
  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError(t('auth.phoneRequired') || '请输入正确的手机号')
      return
    }

    if (!captchaAnswer) {
      setError(t('captcha.required') || '请输入图形验证码答案')
      return
    }

    setIsSendingCode(true)
    setError(null)

    try {
      // 先验证图形验证码
      const captchaResponse = await fetch('/api/auth/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha_id: captchaToken, captcha_code: captchaAnswer })
      })

      const captchaData = await captchaResponse.json()

      if (!captchaResponse.ok || !captchaData.success) {
        setError(captchaData.error || t('captcha.error') || '图形验证码错误')
        loadCaptcha()
        return
      }

      // 使用 Better Auth phoneNumber 插件发送 OTP
      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber: `+86${phone}`,
      })

      if (error) {
        throw new Error(error.message || '发送失败')
      }

      setCodeSent(true)
      setCountdown(60)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('auth.sendOtpError'))
      loadCaptcha()
    } finally {
      setIsSendingCode(false)
    }
  }

  // 注册
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!codeSent) {
      setError(t('auth.sendCodeFirst') || '请先获取短信验证码')
      return
    }

    if (!otp || otp.length !== 6) {
      setError(t('auth.otpRequired') || '请输入6位短信验证码')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 使用 Better Auth 验证 OTP 并注册/登录
      // phoneNumber 插件配置了 signUpOnVerification，验证成功后会自动创建用户
      const { data, error } = await authClient.phoneNumber.verify({
        phoneNumber: `+86${phone}`,
        code: otp,
      })

      if (error) {
        throw new Error(error.message || '验证失败')
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

      // 注册成功，跳转到首页
      window.location.href = '/'
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('auth.verifyOtpError'))
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
          <CardDescription>{t('auth.enterPhoneToGetStarted')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            {/* 手机号 */}
            <div className="grid gap-2">
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('placeholders.phonePlaceholder')}
                required
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
              />
            </div>

            {/* 图形验证码 */}
            <div className="grid gap-2">
              <Label>{t('captcha.title')}</Label>
              <div className="flex gap-2 items-center">
                <div
                  className="flex-1 h-10 bg-muted rounded border cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={loadCaptcha}
                  title={t('captcha.refresh')}
                >
                  {captchaImage ? (
                    <img
                      src={captchaImage}
                      alt="captcha"
                      className="h-full w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('admin.loading')}
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="答案"
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
                  className="w-20 text-center"
                  maxLength={3}
                />
              </div>
            </div>

            {/* 短信验证码 */}
            <div className="grid gap-2">
              <Label htmlFor="otp">{t('auth.verificationCode')}</Label>
              <div className="flex gap-2">
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t('placeholders.otpPlaceholder')}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoComplete="one-time-code"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={isSendingCode || countdown > 0 || !phone || phone.length < 11}
                  className="flex-shrink-0 w-28"
                >
                  {isSendingCode
                    ? t('auth.sendingCode')
                    : countdown > 0
                      ? `${countdown}s`
                      : t('auth.sendCode')}
                </Button>
              </div>
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

            <Button type="submit" className="w-full" disabled={isLoading || !codeSent}>
              {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-muted px-2 text-muted-foreground">
                  {t('auth.or')}
                </span>
              </div>
            </div>

            <Link
              href={inviteCode ? `/auth/sign-up?method=email&invite=${inviteCode}` : '/auth/sign-up?method=email'}
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              {t('auth.useEmailSignUp')}
            </Link>
          </form>
          <div className="mt-6 text-center text-sm">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/auth/login" className="underline underline-offset-4">
              {t('auth.signIn')}
            </Link>
          </div>
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
