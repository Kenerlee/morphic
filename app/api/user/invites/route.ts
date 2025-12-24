import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getRedisClient } from '@/lib/redis/config'

// Redis keys
const USER_INVITES_KEY = (userId: string) => `user:invites:${userId}`
const INVITE_KEY = (code: string) => `invite:${code}`
const INVITES_KEY = 'invites:all'

// Generate invite code (8 chars, no confusing characters)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface UserInvite {
  code: string
  createdBy: string
  createdAt: string
  expiresAt: string
  usedBy?: string
  usedAt?: string
  usedByEmail?: string
}

// GET - Get current user's invite codes
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const redis = await getRedisClient()

    // Get user's invite codes (sorted by timestamp, newest first)
    const codes = await redis.zrange(USER_INVITES_KEY(user.id), 0, -1, { rev: true })

    const invites: UserInvite[] = []
    for (const code of codes) {
      const data = await redis.hgetall(INVITE_KEY(code))
      if (data && Object.keys(data).length > 0) {
        invites.push(data as unknown as UserInvite)
      }
    }

    // Count stats
    const totalCreated = invites.length
    const totalUsed = invites.filter(i => i.usedBy).length
    const available = invites.filter(i => !i.usedBy && new Date(i.expiresAt) > new Date()).length

    return NextResponse.json({
      success: true,
      invites,
      stats: {
        totalCreated,
        totalUsed,
        available
      }
    })
  } catch (error) {
    console.error('Error getting user invites:', error)
    return NextResponse.json(
      { error: '获取邀请码失败' },
      { status: 500 }
    )
  }
}

// POST - Create a new invite code for current user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const redis = await getRedisClient()

    // Check how many active invites user has (limit to 10)
    const existingCodes = await redis.zrange(USER_INVITES_KEY(user.id), 0, -1)
    let activeCount = 0
    for (const code of existingCodes) {
      const data = await redis.hgetall(INVITE_KEY(code))
      if (data && !data.usedBy && new Date(data.expiresAt as string) > new Date()) {
        activeCount++
      }
    }

    if (activeCount >= 10) {
      return NextResponse.json({
        success: false,
        error: '您已有 10 个未使用的邀请码，请等待使用后再生成'
      })
    }

    // Generate new invite code
    const code = generateInviteCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days for user invites

    const invite: UserInvite = {
      code,
      createdBy: user.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    // Store invite
    await redis.hmset(INVITE_KEY(code), invite as unknown as Record<string, string>)
    // Add to global index
    await redis.zadd(INVITES_KEY, Date.now(), code)
    // Add to user's invite list
    await redis.zadd(USER_INVITES_KEY(user.id), Date.now(), code)

    return NextResponse.json({
      success: true,
      invite,
      message: '邀请码创建成功'
    })
  } catch (error) {
    console.error('Error creating user invite:', error)
    return NextResponse.json(
      { error: '创建邀请码失败' },
      { status: 500 }
    )
  }
}
