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

interface PhoneLoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  messages: any
}

export function PhoneLoginForm({
  className,
  messages,
  ...props
}: PhoneLoginFormProps) {
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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)

  // 图形验证码状态
  const [captchaImage, setCaptchaImage] = useState<string>('')
  const [captchaToken, setCaptchaToken] = useState<string>('')

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

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
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
      // 使用 Better Auth 验证 OTP 并登录
      const { data, error } = await authClient.phoneNumber.verify({
        phoneNumber: `+86${phone}`,
        code: otp,
      })

      if (error) {
        throw new Error(error.message || '验证失败')
      }

      // 登录成功，跳转
      const returnUrl = sessionStorage.getItem('returnUrl')
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl')
        window.location.href = returnUrl
      } else {
        window.location.href = '/'
      }
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
            {t('auth.welcomeBack')}
          </CardTitle>
          <CardDescription>{t('auth.signInToAccount')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Google login temporarily disabled
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={handleSocialLogin}
              disabled={isLoading}
            >
              {t('auth.signInWithGoogle')}
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
            */}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {/* 手机号 */}
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('auth.phone')}</Label>
                <Input
                  id="phone"
                  name="phone"
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

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || !codeSent}>
                {isLoading ? t('auth.loggingIn') : t('auth.signIn')}
              </Button>
            </form>

            <Link
              href="/auth/login?method=email"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              {t('auth.useEmailLogin')}
            </Link>
          </div>
          <div className="mt-6 text-center text-sm">
            {t('auth.dontHaveAccount')}{' '}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              {t('auth.signUp')}
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
