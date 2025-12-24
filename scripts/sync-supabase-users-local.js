#!/usr/bin/env node

/**
 * Script to sync Supabase users to local Redis profiles
 *
 * Usage:
 *   1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local
 *   2. Run: node scripts/sync-supabase-users-local.js
 */

const { createClient } = require('@supabase/supabase-js')
const { createClient: createRedisClient } = require('redis')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Redis configuration
const LOCAL_REDIS_URL = process.env.LOCAL_REDIS_URL || 'redis://localhost:6379'

// Profile key patterns
const PROFILE_KEY = (userId) => `user:profile:${userId}`
const PROFILES_ALL_KEY = 'user:profiles:all'

// Quota limits
const QUOTA_LIMITS = {
  free: 5,
  pro: 100,
  vip: 500,
  admin: -1 // unlimited
}

function serializeProfile(profile) {
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
    created_at: profile.created_at,
    updated_at: profile.updated_at
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Supabase to Local Redis User Sync Script')
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
  console.log('Redis URL:', LOCAL_REDIS_URL)
  console.log('')

  let redis = null

  try {
    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Initialize Redis client
    redis = createRedisClient({ url: LOCAL_REDIS_URL })
    redis.on('error', (err) => console.error('Redis Client Error:', err))
    await redis.connect()
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
    const existingProfiles = await redis.zRange(PROFILES_ALL_KEY, 0, -1)
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
      const profile = {
        id: userId,
        email: email !== 'unknown' ? email : null,
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
        // Store profile in Redis using hSet
        const serialized = serializeProfile(profile)
        await redis.hSet(PROFILE_KEY(userId), serialized)

        // Add to all profiles index
        await redis.zAdd(PROFILES_ALL_KEY, { score: Date.now(), value: userId })

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
  } finally {
    if (redis) {
      await redis.quit()
    }
  }
}

main()
