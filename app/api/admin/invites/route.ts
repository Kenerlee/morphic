import { NextRequest, NextResponse } from 'next/server'

import { checkAdminAuth } from '@/lib/middleware/admin-auth'
import { getRedisClient } from '@/lib/redis/config'

// Redis keys
const INVITES_KEY = 'invites:all'
const INVITE_KEY = (code: string) => `invite:${code}`

// Generate invite code (8 chars, no confusing characters)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface Invite {
  code: string
  createdBy: string
  createdAt: string
  expiresAt: string
  usedBy?: string
  usedAt?: string
}

// GET - List all invites
export async function GET() {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error?.message },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const redis = await getRedisClient()
    // Use zrange with rev:true to get newest first (sorted by timestamp)
    const codes = await redis.zrange(INVITES_KEY, 0, -1, { rev: true })

    const invites: Invite[] = []
    for (const code of codes) {
      const data = await redis.hgetall(INVITE_KEY(code))
      if (data && Object.keys(data).length > 0) {
        invites.push(data as unknown as Invite)
      }
    }

    return NextResponse.json({ success: true, invites })
  } catch (error) {
    console.error('Error listing invites:', error)
    return NextResponse.json(
      { error: '获取邀请码列表失败' },
      { status: 500 }
    )
  }
}

// POST - Create new invite(s)
export async function POST(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        { error: authResult.error?.message },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const body = await request.json()
    const count = Math.min(20, Math.max(1, body.count || 1))

    const redis = await getRedisClient()
    const createdInvites: Invite[] = []

    for (let i = 0; i < count; i++) {
      const code = generateInviteCode()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const invite: Invite = {
        code,
        createdBy: authResult.userId!,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }

      // Store invite
      await redis.hmset(INVITE_KEY(code), invite as unknown as Record<string, string>)
      // Use zadd with timestamp as score for ordering
      await redis.zadd(INVITES_KEY, Date.now(), code)

      createdInvites.push(invite)
    }

    return NextResponse.json({
      success: true,
      invites: createdInvites,
      message: `成功创建 ${createdInvites.length} 个邀请码`
    })
  } catch (error) {
    console.error('Error creating invites:', error)
    return NextResponse.json(
      { error: '创建邀请码失败' },
      { status: 500 }
    )
  }
}
