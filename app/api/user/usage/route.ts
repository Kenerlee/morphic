import { NextResponse } from 'next/server'

import { getOrCreateUserProfile,getUserProfileWithQuotaStatus } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: '未登录', error_code: 40101 },
        { status: 401 }
      )
    }

    // 获取或创建用户配置文件
    await getOrCreateUserProfile(user.id)

    // 获取配额状态
    const quotaStatus = await getUserProfileWithQuotaStatus(user.id)

    if (!quotaStatus) {
      return NextResponse.json(
        { error: '获取用量信息失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      usage: {
        used: quotaStatus.quota_used,
        limit: quotaStatus.quota_limit,
        remaining: quotaStatus.quota_remaining,
        percentage: quotaStatus.quota_percentage,
        reset_date: quotaStatus.quota_reset_date
      }
    })
  } catch (error) {
    console.error('获取用量信息错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取用量信息失败' },
      { status: 500 }
    )
  }
}
