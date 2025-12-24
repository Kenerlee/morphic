export type UserLevel = 'free' | 'pro' | 'vip' | 'admin'
export type UserRole = 'guest' | 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string | null
  mobile: string | null
  level: UserLevel
  role: UserRole
  quota_limit: number
  quota_used: number
  quota_reset_date: string | null
  level_expire_at: string | null
  invited_by: string | null // User ID of who invited this user
  invite_code_used: string | null // The invite code used during registration
  created_at: string
  updated_at: string
}

export interface CreateUserProfileInput {
  userId: string
  email?: string
  mobile?: string
}

export interface UpdateUserProfileInput {
  email?: string
  mobile?: string
  level?: UserLevel
  role?: UserRole
  quota_limit?: number
  quota_used?: number
  quota_reset_date?: string | null
  level_expire_at?: string | null
  invited_by?: string | null
  invite_code_used?: string | null
}

export interface UserProfileWithQuotaStatus extends UserProfile {
  quota_remaining: number
  quota_percentage: number
  is_quota_expired: boolean
}

// Default quota limits by level
export const QUOTA_LIMITS: Record<UserLevel, number> = {
  free: 3,      // Total lifetime limit
  pro: 20,      // Monthly limit
  vip: 100,     // Monthly limit
  admin: -1     // Unlimited
}
