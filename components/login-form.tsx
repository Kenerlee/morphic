'use client'

import { useState } from 'react'
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

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  messages: any
}

export function LoginForm({ className, messages, ...props }: LoginFormProps) {
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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 使用 Better Auth 登录
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message || '登录失败')
      }

      // Check if there's a return URL stored
      const returnUrl = sessionStorage.getItem('returnUrl')
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl')
        router.push(returnUrl)
      } else {
        // Redirect to root and refresh to ensure server components get updated session
        router.push('/')
      }
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '登录失败')
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
                <span className="bg-muted px-2 text-muted-foreground">{t('auth.or')}</span>
              </div>
            </div>
            */}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.loggingIn') : t('auth.signIn')}
              </Button>
            </form>

            <Link
              href="/auth/login"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              {t('auth.usePhoneLogin')}
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
