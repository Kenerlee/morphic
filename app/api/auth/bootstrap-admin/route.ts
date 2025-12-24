import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * Bootstrap Admin Endpoint
 *
 * 用于将当前登录用户提升为 admin
 * 仅在开发环境可用，且需要 BOOTSTRAP_SECRET
 *
 * POST /api/auth/bootstrap-admin
 * Body: { "secret": "your-bootstrap-secret" }
 */
export async function POST(request: NextRequest) {
  // 仅开发环境可用
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { secret } = body

    // 验证 bootstrap secret (简单的安全措施)
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET || 'navix-dev-admin-2024'
    if (secret !== bootstrapSecret) {
      return NextResponse.json(
        { error: 'Invalid bootstrap secret' },
        { status: 401 }
      )
    }

    // 获取当前 session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to become admin' },
        { status: 401 }
      )
    }

    // 使用 admin 插件设置角色
    // Better Auth admin plugin 提供了 setRole API
    const result = await auth.api.setRole({
      body: {
        userId: session.user.id,
        role: 'admin',
      },
      headers: await headers(),
    })

    return NextResponse.json({
      success: true,
      message: `User ${session.user.email} is now an admin`,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('[Bootstrap Admin] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bootstrap admin' },
      { status: 500 }
    )
  }
}
