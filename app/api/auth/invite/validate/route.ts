import { NextRequest, NextResponse } from 'next/server'

import { getRedisClient } from '@/lib/redis/config'

const INVITE_KEY = (code: string) => `invite:${code}`

// POST - Validate invite code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = (body.code || '').toUpperCase().trim()

    if (!code || code.length < 6) {
      return NextResponse.json({
        valid: false,
        error: '邀请码格式无效'
      })
    }

    const redis = await getRedisClient()
    const invite = await redis.hgetall(INVITE_KEY(code))

    if (!invite || Object.keys(invite).length === 0) {
      return NextResponse.json({
        valid: false,
        error: '邀请码不存在'
      })
    }

    // Check if already used
    if (invite.usedBy) {
      return NextResponse.json({
        valid: false,
        error: '邀请码已被使用'
      })
    }

    // Check if expired
    if (new Date(invite.expiresAt as string) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: '邀请码已过期'
      })
    }

    return NextResponse.json({
      valid: true,
      code: invite.code
    })
  } catch (error) {
    console.error('Error validating invite:', error)
    return NextResponse.json({
      valid: false,
      error: '验证失败'
    })
  }
}
