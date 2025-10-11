import { cookies } from 'next/headers'

import { ForgotPasswordForm } from '@/components/forgot-password-form'

import enMessages from '@/messages/en.json'
import zhMessages from '@/messages/zh.json'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'zh'
  const messages = locale === 'zh' ? zhMessages : enMessages

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm messages={messages} />
      </div>
    </div>
  )
}
