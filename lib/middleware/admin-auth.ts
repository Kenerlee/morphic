import { getOrCreateUserProfile } from '@/lib/actions/user-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export interface AdminAuthResult {
  isAdmin: boolean
  userId: string | null
  error?: {
    code: number
    message: string
  }
}

/**
 * 验证当前用户是否是管理员
 * 使用 Redis 中的 user profile 检查角色（持久化）
 */
export async function checkAdminAuth(): Promise<AdminAuthResult> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        error: {
          code: 40101,
          message: '未登录'
        }
      }
    }

    // 从 Redis user profile 获取角色（持久化存储）
    const profile = await getOrCreateUserProfile(
      user.id,
      user.email || undefined
    )

    // 检查是否是管理员
    if (profile.role !== 'admin') {
      return {
        isAdmin: false,
        userId: user.id,
        error: {
          code: 40301,
          message: '无权访问管理后台'
        }
      }
    }

    return {
      isAdmin: true,
      userId: user.id
    }
  } catch (error) {
    console.error('Admin auth check error:', error)
    return {
      isAdmin: false,
      userId: null,
      error: {
        code: 50001,
        message: '验证失败'
      }
    }
  }
}
