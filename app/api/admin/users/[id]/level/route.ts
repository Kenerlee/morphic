import { NextRequest, NextResponse } from 'next/server'

import { getUserProfile, updateUserProfile } from '@/lib/actions/user-profile'
import { checkAdminAuth } from '@/lib/middleware/admin-auth'
import { QUOTA_LIMITS,UserLevel } from '@/lib/types/user-profile'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authResult = await checkAdminAuth()
    if (!authResult.isAdmin) {
      return NextResponse.json(
        {
          error: authResult.error?.message,
          error_code: authResult.error?.code
        },
        { status: authResult.error?.code === 40101 ? 401 : 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { level, expire_days } = body

    // 验证等级参数
    const validLevels: UserLevel[] = ['free', 'pro', 'vip', 'admin']
    if (!level || !validLevels.includes(level as UserLevel)) {
      return NextResponse.json(
        { error: '无效的用户等级', error_code: 40001 },
        { status: 400 }
      )
    }

    const validatedLevel = level as UserLevel

    // 获取用户配置文件
    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json(
        { error: '用户不存在', error_code: 40401 },
        { status: 404 }
      )
    }

    // 计算会员过期时间
    let levelExpireAt: string | null = null
    if (validatedLevel === 'pro' || validatedLevel === 'vip') {
      const days = expire_days || (validatedLevel === 'pro' ? 30 : 365)
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + days)
      levelExpireAt = expireDate.toISOString()
    }

    // 更新用户等级
    const updatedProfile = await updateUserProfile(userId, {
      level: validatedLevel,
      role: validatedLevel === 'admin' ? 'admin' : 'user',
      quota_limit: QUOTA_LIMITS[validatedLevel],
      level_expire_at: levelExpireAt,
      // 升级时重置配额
      quota_used: 0,
      quota_reset_date: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        user: updatedProfile
      }
    })
  } catch (error) {
    console.error('更新用户等级错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新用户等级失败' },
      { status: 500 }
    )
  }
}
