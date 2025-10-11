'use client'

import { useState } from 'react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/index'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ForgotPasswordFormProps extends React.ComponentPropsWithoutRef<'div'> {
  messages: any
}

export function ForgotPasswordForm({
  className,
  messages,
  ...props
}: ForgotPasswordFormProps) {
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('auth.checkYourEmail')}</CardTitle>
            <CardDescription>{t('auth.passwordResetInstructionsSent')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('auth.passwordResetEmailMessage')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('auth.resetYourPassword')}</CardTitle>
            <CardDescription>
              {t('auth.resetPasswordDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
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
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('auth.sending') : t('auth.sendResetEmail')}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  {t('auth.login')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
