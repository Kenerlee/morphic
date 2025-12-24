import { cookies } from 'next/headers'

import { PhoneSignUpForm } from '@/components/phone-sign-up-form'
import { SignUpForm } from '@/components/sign-up-form'

import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ method?: string; invite?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const messages = locale === 'zh' ? zhMessages : enMessages

  const params = await searchParams
  const method = params.method
  const inviteCode = params.invite || ''

  // Default to phone sign up, switch to email if ?method=email
  const useEmailSignUp = method === 'email'

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {useEmailSignUp ? (
          <SignUpForm messages={messages} initialInviteCode={inviteCode} />
        ) : (
          <PhoneSignUpForm messages={messages} initialInviteCode={inviteCode} />
        )}
      </div>
    </div>
  )
}
