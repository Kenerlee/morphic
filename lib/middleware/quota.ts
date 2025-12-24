import {
  checkAndResetMonthlyQuota,
  getOrCreateUserProfile,
  getUserProfile,
  incrementQuotaUsage} from '@/lib/actions/user-profile'

export interface QuotaCheckResult {
  allowed: boolean
  remaining: number
  is_unlimited: boolean
  error?: {
    code: number
    message: string
  }
}

/**
 * 检查用户配额是否允许发起请求
 * 仅检查，不扣减配额
 */
export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
  try {
    // 获取或创建用户配置文件
    let profile = await getOrCreateUserProfile(userId)

    // 检查并重置月度配额（如果需要）
    await checkAndResetMonthlyQuota(userId, profile)

    // 重新获取最新的配置文件
    const updatedProfile = await getUserProfile(userId)
    if (updatedProfile) {
      profile = updatedProfile
    }

    // Admin 用户无限配额
    if (profile.quota_limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        is_unlimited: true
      }
    }

    // 检查配额是否用完
    const remaining = profile.quota_limit - profile.quota_used
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        is_unlimited: false,
        error: {
          code: 40201,
          message: '您的配额已用完，请升级会员或等待下月重置'
        }
      }
    }

    // 检查会员是否过期（Pro/VIP）
    if (
      profile.level !== 'free' &&
      profile.level !== 'admin' &&
      profile.level_expire_at
    ) {
      const expireDate = new Date(profile.level_expire_at)
      if (expireDate < new Date()) {
        // 会员已过期，降级为 free 用户的配额
        // 这里不自动降级，只是提示
        return {
          allowed: false,
          remaining: 0,
          is_unlimited: false,
          error: {
            code: 40201,
            message: '您的会员已过期，请续费或联系管理员'
          }
        }
      }
    }

    return {
      allowed: true,
      remaining,
      is_unlimited: false
    }
  } catch (error) {
    console.error('配额检查错误:', error)
    // 出错时默认允许（降级处理）
    return {
      allowed: true,
      remaining: -1,
      is_unlimited: true
    }
  }
}

/**
 * 扣减用户配额
 * 应在请求成功完成后调用
 */
export async function deductQuota(userId: string): Promise<boolean> {
  try {
    // 获取当前配置文件
    const profile = await getOrCreateUserProfile(userId)

    // Admin 用户不扣减
    if (profile.quota_limit === -1) {
      return true
    }

    // 扣减配额
    await incrementQuotaUsage(userId)
    return true
  } catch (error) {
    console.error('配额扣减错误:', error)
    return false
  }
}
