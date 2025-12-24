import { NextRequest, NextResponse } from 'next/server'

import { updateUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getRedisClient } from '@/lib/redis/config'

const INVITE_KEY = (code: string) => `invite:${code}`

/**
 * POST - Activate invite code after registration
 * This upgrades the user from 'guest' to 'user' role
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const code = (body.code || '').toUpperCase().trim()

    if (!code || code.length < 6) {
      return NextResponse.json({
        success: false,
        error: '邀请码格式无效'
      })
    }

    const redis = await getRedisClient()
    const invite = await redis.hgetall(INVITE_KEY(code))

    if (!invite || Object.keys(invite).length === 0) {
      return NextResponse.json({
        success: false,
        error: '邀请码不存在'
      })
    }

    // Check if already used
    if (invite.usedBy) {
      return NextResponse.json({
        success: false,
        error: '邀请码已被使用'
      })
    }

    // Check if expired
    if (new Date(invite.expiresAt as string) < new Date()) {
      return NextResponse.json({
        success: false,
        error: '邀请码已过期'
      })
    }

    // Mark invite as used
    await redis.hmset(INVITE_KEY(code), {
      ...invite,
      usedBy: user.id,
      usedAt: new Date().toISOString()
    } as Record<string, string>)

    // Upgrade user role to 'user' and record who invited them
    await updateUserProfile(user.id, {
      role: 'user',
      invited_by: invite.createdBy as string,
      invite_code_used: code
    })

    console.log(`[Invite] Code ${code} activated by user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: '邀请码激活成功'
    })
  } catch (error) {
    console.error('Error activating invite:', error)
    return NextResponse.json(
      { success: false, error: '激活失败' },
      { status: 500 }
    )
  }
}
