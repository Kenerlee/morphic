import { NextResponse } from 'next/server'

import {
  getOrCreateUserProfile,
  getUserProfileWithQuotaStatus} from '@/lib/actions/user-profile'
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

    // 获取或创建用户配置文件（传入邮箱以便同步）
    const profile = await getOrCreateUserProfile(user.id, user.email ?? undefined)

    // 获取配额状态（内部会自动检查并重置月度配额）
    const quotaStatus = await getUserProfileWithQuotaStatus(user.id)

    // 从 Better Auth 用户获取手机号
    const phone = (user as any).phone || profile.mobile

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone,
        level: quotaStatus?.level || profile.level,
        role: quotaStatus?.role || profile.role,
        level_expire_at:
          quotaStatus?.level_expire_at || profile.level_expire_at,
        created_at: quotaStatus?.created_at || profile.created_at
      },
      quota: quotaStatus
        ? {
            limit: quotaStatus.quota_limit,
            used: quotaStatus.quota_used,
            remaining: quotaStatus.quota_remaining,
            is_unlimited: quotaStatus.quota_limit === -1,
            reset_date: quotaStatus.quota_reset_date
          }
        : null
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取用户信息失败' },
      { status: 500 }
    )
  }
}
