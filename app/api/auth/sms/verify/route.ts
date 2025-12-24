import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated This route was used for Supabase-based SMS verification.
 * Better Auth now handles phone verification through the phoneNumber plugin.
 *
 * The phone verification flow is now:
 * 1. Client calls: authClient.phoneNumber.sendOtp({ phoneNumber: '+86xxx' })
 * 2. Client calls: authClient.phoneNumber.verify({ phoneNumber: '+86xxx', code: '123456' })
 *
 * This route is kept for backwards compatibility but will return a deprecation notice.
 */
export async function POST(request: NextRequest) {
  console.warn('[DEPRECATED] /api/auth/sms/verify is deprecated. Use Better Auth phoneNumber plugin instead.')

  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Please use the new authentication flow.',
      message: '此接口已废弃，请使用新的认证流程。'
    },
    { status: 410 } // 410 Gone
  )
}
