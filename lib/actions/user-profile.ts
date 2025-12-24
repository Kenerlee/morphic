'use server'

import { getRedisClient } from '@/lib/redis/config'
import {
  CreateUserProfileInput,
  QUOTA_LIMITS,
  UpdateUserProfileInput,
  UserLevel,
  UserProfile,
  UserProfileWithQuotaStatus
} from '@/lib/types/user-profile'

// Redis key patterns
const PROFILE_KEY = (userId: string) => `user:profile:${userId}`
const PROFILES_ALL_KEY = 'user:profiles:all'
const MOBILE_INDEX_KEY = (mobile: string) => `user:profile:mobile:${mobile}`

// In-memory fallback for development
const memoryStore: Map<string, UserProfile> = new Map()
const mobileIndex: Map<string, string> = new Map()

/**
 * Get user profile by user ID
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const redis = await getRedisClient()
    const data = await redis.hgetall<Record<string, string>>(
      PROFILE_KEY(userId)
    )

    if (!data || Object.keys(data).length === 0) {
      // Check memory fallback
      return memoryStore.get(userId) || null
    }

    return parseProfile(data)
  } catch (error) {
    console.error('Error getting user profile from Redis:', error)
    // Fallback to memory
    return memoryStore.get(userId) || null
  }
}

// Admin emails that should automatically get admin role
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'kenerlee@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

/**
 * Create a new user profile
 */
export async function createUserProfile(
  input: CreateUserProfileInput
): Promise<UserProfile> {
  const { userId, email, mobile } = input
  const now = new Date().toISOString()

  // Check if email is in admin list
  const isAdmin = email && ADMIN_EMAILS.includes(email.toLowerCase())

  const profile: UserProfile = {
    id: userId,
    email: email || null,
    mobile: mobile || null,
    level: isAdmin ? 'admin' : 'free',
    role: isAdmin ? 'admin' : 'guest', // Default to guest, upgrade to user with invite
    quota_limit: isAdmin ? -1 : QUOTA_LIMITS.free, // Unlimited for admin
    quota_used: 0,
    quota_reset_date: null,
    level_expire_at: null,
    invited_by: null,
    invite_code_used: null,
    created_at: now,
    updated_at: now
  }

  if (isAdmin) {
    console.log(`[User Profile] Auto-setting admin role for: ${email}`)
  }

  try {
    const redis = await getRedisClient()
    const pipeline = redis.pipeline()

    // Store profile
    pipeline.hmset(PROFILE_KEY(userId), serializeProfile(profile))

    // Add to all profiles index
    pipeline.zadd(PROFILES_ALL_KEY, Date.now(), userId)

    // Add mobile index if provided
    if (mobile) {
      await redis.hmset(MOBILE_INDEX_KEY(mobile), { userId })
    }

    await pipeline.exec()
  } catch (error) {
    console.error('Error creating user profile in Redis:', error)
  }

  // Also store in memory
  memoryStore.set(userId, profile)
  if (mobile) {
    mobileIndex.set(mobile, userId)
  }

  return profile
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserProfileInput
): Promise<UserProfile | null> {
  const existing = await getUserProfile(userId)
  if (!existing) {
    return null
  }

  const updatedProfile: UserProfile = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  }

  // If level changed, update quota_limit
  if (updates.level && updates.level !== existing.level) {
    updatedProfile.quota_limit = QUOTA_LIMITS[updates.level]

    // Set reset date for pro/vip
    if (updates.level === 'pro' || updates.level === 'vip') {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      nextMonth.setHours(0, 0, 0, 0)
      updatedProfile.quota_reset_date = nextMonth.toISOString()
      updatedProfile.quota_used = 0 // Reset usage on upgrade
    }
  }

  try {
    const redis = await getRedisClient()
    await redis.hmset(PROFILE_KEY(userId), serializeProfile(updatedProfile))

    // Update mobile index if mobile changed
    if (updates.mobile && updates.mobile !== existing.mobile) {
      if (existing.mobile) {
        await redis.del(MOBILE_INDEX_KEY(existing.mobile))
        mobileIndex.delete(existing.mobile)
      }
      await redis.hmset(MOBILE_INDEX_KEY(updates.mobile), { userId })
      mobileIndex.set(updates.mobile, userId)
    }
  } catch (error) {
    console.error('Error updating user profile in Redis:', error)
  }

  memoryStore.set(userId, updatedProfile)

  return updatedProfile
}

/**
 * Get user profile by mobile number
 */
export async function getUserProfileByMobile(
  mobile: string
): Promise<UserProfile | null> {
  try {
    const redis = await getRedisClient()
    const data = await redis.hgetall<{ userId?: string }>(
      MOBILE_INDEX_KEY(mobile)
    )

    if (data?.userId) {
      return getUserProfile(data.userId)
    }
  } catch (error) {
    console.error('Error getting user by mobile from Redis:', error)
  }

  // Fallback to memory
  const userId = mobileIndex.get(mobile)
  if (userId) {
    return memoryStore.get(userId) || null
  }

  return null
}

/**
 * Get all user profiles (for admin)
 */
export async function getAllUserProfiles(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ profiles: UserProfile[]; total: number }> {
  try {
    const redis = await getRedisClient()
    const start = (page - 1) * limit
    const end = start + limit - 1

    // Get user IDs from sorted set
    const userIds = await redis.zrange(PROFILES_ALL_KEY, start, end, {
      rev: true
    })

    if (!userIds || userIds.length === 0) {
      return { profiles: [], total: 0 }
    }

    // Get profiles for each user
    const profiles: UserProfile[] = []
    for (const userId of userIds) {
      const profile = await getUserProfile(userId)
      if (profile) {
        // Filter by search term if provided
        if (search) {
          if (profile.mobile?.includes(search)) {
            profiles.push(profile)
          }
        } else {
          profiles.push(profile)
        }
      }
    }

    // Get total count (approximate)
    const allIds = await redis.zrange(PROFILES_ALL_KEY, 0, -1)
    const total = allIds.length

    return { profiles, total }
  } catch (error) {
    console.error('Error getting all user profiles from Redis:', error)

    // Fallback to memory
    let profiles = Array.from(memoryStore.values())
    if (search) {
      profiles = profiles.filter(p => p.mobile?.includes(search))
    }

    const start = (page - 1) * limit
    const paged = profiles.slice(start, start + limit)

    return { profiles: paged, total: profiles.length }
  }
}

/**
 * Get user profile with quota status
 */
export async function getUserProfileWithQuotaStatus(
  userId: string
): Promise<UserProfileWithQuotaStatus | null> {
  const profile = await getUserProfile(userId)
  if (!profile) {
    return null
  }

  // Check if monthly quota needs reset
  await checkAndResetMonthlyQuota(userId, profile)

  // Refresh profile after potential reset
  const updatedProfile = await getUserProfile(userId)
  if (!updatedProfile) {
    return null
  }

  const quotaRemaining =
    updatedProfile.quota_limit === -1
      ? -1
      : Math.max(0, updatedProfile.quota_limit - updatedProfile.quota_used)

  const quotaPercentage =
    updatedProfile.quota_limit === -1
      ? 0
      : updatedProfile.quota_limit > 0
        ? (updatedProfile.quota_used / updatedProfile.quota_limit) * 100
        : 100

  const isQuotaExpired =
    updatedProfile.level_expire_at !== null &&
    new Date(updatedProfile.level_expire_at) < new Date()

  return {
    ...updatedProfile,
    quota_remaining: quotaRemaining,
    quota_percentage: quotaPercentage,
    is_quota_expired: isQuotaExpired
  }
}

/**
 * Increment quota usage
 */
export async function incrementQuotaUsage(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  if (!profile) {
    return false
  }

  // Don't increment for unlimited quota
  if (profile.quota_limit === -1) {
    return true
  }

  const updated = await updateUserProfile(userId, {
    quota_used: profile.quota_used + 1
  })

  return updated !== null
}

/**
 * Check and reset monthly quota if needed
 */
export async function checkAndResetMonthlyQuota(
  userId: string,
  profile: UserProfile
): Promise<void> {
  // Only pro and vip have monthly reset
  if (profile.level !== 'pro' && profile.level !== 'vip') {
    return
  }

  // Check if reset date has passed
  if (profile.quota_reset_date) {
    const resetDate = new Date(profile.quota_reset_date)
    const now = new Date()

    if (now >= resetDate) {
      // Calculate next reset date
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      nextMonth.setHours(0, 0, 0, 0)

      await updateUserProfile(userId, {
        quota_used: 0,
        quota_reset_date: nextMonth.toISOString()
      })
    }
  }
}

/**
 * Get or create user profile
 */
export async function getOrCreateUserProfile(
  userId: string,
  email?: string,
  mobile?: string
): Promise<UserProfile> {
  const existing = await getUserProfile(userId)
  if (existing) {
    // Update email/mobile if provided and different
    const updates: { email?: string; mobile?: string } = {}
    if (email && email !== existing.email) {
      updates.email = email
    }
    if (mobile && mobile !== existing.mobile) {
      updates.mobile = mobile
    }
    if (Object.keys(updates).length > 0) {
      const updated = await updateUserProfile(userId, updates)
      return updated || existing
    }
    return existing
  }

  return createUserProfile({ userId, email, mobile })
}

// Helper: Parse profile from Redis hash
function parseProfile(data: Record<string, any>): UserProfile {
  return {
    id: data.id || '',
    email: data.email || null,
    mobile: data.mobile || null,
    level: (data.level as UserLevel) || 'free',
    role: data.role || 'user',
    quota_limit: parseInt(data.quota_limit) || QUOTA_LIMITS.free,
    quota_used: parseInt(data.quota_used) || 0,
    quota_reset_date: data.quota_reset_date || null,
    level_expire_at: data.level_expire_at || null,
    invited_by: data.invited_by || null,
    invite_code_used: data.invite_code_used || null,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString()
  }
}

// Helper: Serialize profile for Redis hash
function serializeProfile(profile: UserProfile): Record<string, string> {
  return {
    id: profile.id,
    email: profile.email || '',
    mobile: profile.mobile || '',
    level: profile.level,
    role: profile.role,
    quota_limit: String(profile.quota_limit),
    quota_used: String(profile.quota_used),
    quota_reset_date: profile.quota_reset_date || '',
    level_expire_at: profile.level_expire_at || '',
    invited_by: profile.invited_by || '',
    invite_code_used: profile.invite_code_used || '',
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
}
