import { headers } from 'next/headers'

import { auth } from './index'

/**
 * 获取当前登录用户 (服务端)
 * 用于替代原来的 Supabase getCurrentUser
 */
export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    return session?.user ?? null
  } catch (error) {
    console.error('[Better Auth] getCurrentUser error:', error)
    return null
  }
}

/**
 * 获取当前用户 ID
 * 未登录返回 'anonymous'
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await getCurrentUser()
  return user?.id ?? 'anonymous'
}

/**
 * 获取完整 session
 */
export async function getServerSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    })
  } catch (error) {
    console.error('[Better Auth] getServerSession error:', error)
    return null
  }
}

/**
 * 检查用户是否已登录
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * 获取用户角色
 * 默认返回 'guest'
 */
export async function getUserRole(): Promise<string> {
  const user = await getCurrentUser()
  return (user as { role?: string } | null)?.role ?? 'guest'
}
