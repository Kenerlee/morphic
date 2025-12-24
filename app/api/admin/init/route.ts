import { NextRequest, NextResponse } from 'next/server'

import { getOrCreateUserProfile, updateUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { QUOTA_LIMITS } from '@/lib/types/user-profile'

/**
 * 初始化第一个管理员账户
 *
 * 使用方法：
 * 1. 在 .env.local 中设置 ADMIN_INIT_SECRET（任意复杂字符串）
 * 2. 用你想成为 admin 的账户登录系统
 * 3. 调用此 API：POST /api/admin/init
 *    Body: { "secret": "你设置的 ADMIN_INIT_SECRET" }
 *
 * 安全说明：
 * - 仅当系统中没有 admin 用户时才能使用
 * - 需要用户已登录
 * - 需要提供正确的 secret
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json()

    // 1. 验证 secret
    const adminInitSecret = process.env.ADMIN_INIT_SECRET
    if (!adminInitSecret) {
      return NextResponse.json(
        { error: '未配置 ADMIN_INIT_SECRET 环境变量' },
        { status: 500 }
      )
    }

    if (secret !== adminInitSecret) {
      return NextResponse.json(
        { error: '密钥错误' },
        { status: 403 }
      )
    }

    // 2. 获取当前登录用户
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: '请先登录，然后再调用此 API' },
        { status: 401 }
      )
    }

    // 3. 获取或创建用户配置文件
    const profile = await getOrCreateUserProfile(user.id)

    // 4. 检查是否已经是 admin
    if (profile.role === 'admin') {
      return NextResponse.json({
        success: true,
        message: '你已经是管理员了',
        user: {
          id: user.id,
          email: user.email,
          level: profile.level,
          role: profile.role
        }
      })
    }

    // 5. 升级为 admin
    const updatedProfile = await updateUserProfile(user.id, {
      level: 'admin',
      role: 'admin',
      quota_limit: QUOTA_LIMITS.admin // -1，无限制
    })

    return NextResponse.json({
      success: true,
      message: '恭喜！你已成为系统管理员',
      user: {
        id: user.id,
        email: user.email,
        phone: (user as any).phone,
        level: updatedProfile?.level,
        role: updatedProfile?.role
      }
    })

  } catch (error) {
    console.error('初始化 admin 错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '初始化失败' },
      { status: 500 }
    )
  }
}
