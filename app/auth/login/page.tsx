import { cookies } from 'next/headers'

import { LoginForm } from '@/components/login-form'
import { PhoneLoginForm } from '@/components/phone-login-form'

import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ method?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const messages = locale === 'zh' ? zhMessages : enMessages

  const params = await searchParams
  const method = params.method

  // Default to phone login, switch to email if ?method=email
  const useEmailLogin = method === 'email'

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {useEmailLogin ? (
          <LoginForm messages={messages} />
        ) : (
          <PhoneLoginForm messages={messages} />
        )}
      </div>
    </div>
  )
}
