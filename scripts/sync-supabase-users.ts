#!/usr/bin/env npx ts-node

/**
 * Script to sync Supabase users to Redis profiles
 *
 * This script fetches all users from Supabase Auth and creates
 * Redis profiles for users that don't have one yet.
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env.local
 *   2. Run: npx ts-node scripts/sync-supabase-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Redis configuration
const USE_LOCAL_REDIS = process.env.USE_LOCAL_REDIS === 'true'
const LOCAL_REDIS_URL = process.env.LOCAL_REDIS_URL || 'redis://localhost:6379'
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Profile key patterns
const PROFILE_KEY = (userId: string) => `user:profile:${userId}`
const PROFILES_ALL_KEY = 'user:profiles:all'

// Quota limits
const QUOTA_LIMITS = {
  free: 5,
  pro: 100,
  vip: 500,
  admin: -1 // unlimited
}

interface UserProfile {
  id: string
  mobile: string | null
  level: 'free' | 'pro' | 'vip' | 'admin'
  role: 'user' | 'admin'
  quota_limit: number
  quota_used: number
  quota_reset_date: string | null
  level_expire_at: string | null
  created_at: string
  updated_at: string
}

async function getRedisClient() {
  if (USE_LOCAL_REDIS) {
    // For local Redis, we need to use a different approach
    // Since we're using Upstash Redis client, we'll need to use it differently
    console.log('Using local Redis at:', LOCAL_REDIS_URL)
    throw new Error('Local Redis not supported in this script. Please use Upstash Redis or run the migration first.')
  }

  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Upstash Redis configuration not found')
  }

  return new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN
  })
}

function serializeProfile(profile: UserProfile): Record<string, string> {
  return {
    id: profile.id,
    mobile: profile.mobile || '',
    level: profile.level,
    role: profile.role,
    quota_limit: String(profile.quota_limit),
    quota_used: String(profile.quota_used),
    quota_reset_date: profile.quota_reset_date || '',
    level_expire_at: profile.level_expire_at || '',
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Supabase to Redis User Sync Script')
  console.log('='.repeat(60))

  // Validate configuration
  if (!SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL not set')
    process.exit(1)
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set')
    console.error('')
    console.error('To fix this:')
    console.error('1. Go to https://supabase.com/dashboard/project/_/settings/api')
    console.error('2. Copy the "service_role" key (under "Project API keys")')
    console.error('3. Add it to your .env.local file:')
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key_here')
    process.exit(1)
  }

  console.log('Supabase URL:', SUPABASE_URL)
  console.log('')

  try {
    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Initialize Redis client
    const redis = await getRedisClient()
    console.log('Connected to Redis')

    // Fetch all users from Supabase
    console.log('Fetching users from Supabase Auth...')
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching users:', error.message)
      process.exit(1)
    }

    console.log(`Found ${users.length} users in Supabase`)
    console.log('')

    // Get existing profiles from Redis
    const existingProfiles = await redis.zrange(PROFILES_ALL_KEY, 0, -1) as string[]
    console.log(`Found ${existingProfiles.length} existing profiles in Redis`)
    console.log('')

    // Create profiles for users that don't have one
    let created = 0
    let skipped = 0

    for (const user of users) {
      const userId = user.id
      const email = user.email || 'unknown'
      const phone = user.phone || null

      // Check if profile already exists
      if (existingProfiles.includes(userId)) {
        console.log(`[SKIP] ${email} (${userId}) - profile already exists`)
        skipped++
        continue
      }

      // Create new profile
      const now = new Date().toISOString()
      const profile: UserProfile = {
        id: userId,
        mobile: phone,
        level: 'free',
        role: 'user',
        quota_limit: QUOTA_LIMITS.free,
        quota_used: 0,
        quota_reset_date: null,
        level_expire_at: null,
        created_at: now,
        updated_at: now
      }

      try {
        // Store profile in Redis
        await redis.hmset(PROFILE_KEY(userId), serializeProfile(profile))

        // Add to all profiles index
        await redis.zadd(PROFILES_ALL_KEY, { score: Date.now(), member: userId })

        console.log(`[CREATE] ${email} (${userId}) - profile created`)
        created++
      } catch (err) {
        console.error(`[ERROR] ${email} (${userId}) - failed to create profile:`, err)
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Summary:')
    console.log(`  Total users in Supabase: ${users.length}`)
    console.log(`  Profiles already in Redis: ${skipped}`)
    console.log(`  New profiles created: ${created}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Script error:', error)
    process.exit(1)
  }
}

main()
