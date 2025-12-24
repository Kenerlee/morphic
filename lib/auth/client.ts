'use client'

import { createAuthClient } from 'better-auth/client'
import { adminClient,phoneNumberClient } from 'better-auth/client/plugins'
import { inviteClient } from 'better-auth-invite'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || ''),
  plugins: [
    phoneNumberClient(),
    adminClient(),
    inviteClient(),
  ],
})

// 导出便捷方法
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
