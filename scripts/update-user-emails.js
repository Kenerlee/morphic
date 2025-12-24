#!/usr/bin/env node

/**
 * Script to update existing Redis profiles with email from Supabase
 *
 * Usage:
 *   node scripts/update-user-emails.js
 */

const { createClient } = require('@supabase/supabase-js')
const { createClient: createRedisClient } = require('redis')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LOCAL_REDIS_URL = process.env.LOCAL_REDIS_URL || 'redis://localhost:6379'

const PROFILE_KEY = (userId) => `user:profile:${userId}`

async function main() {
  console.log('='.repeat(60))
  console.log('Update User Emails Script')
  console.log('='.repeat(60))

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing Supabase configuration')
    process.exit(1)
  }

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

    let updated = 0
    let skipped = 0

    for (const user of users) {
      const userId = user.id
      const email = user.email || null

      if (!email) {
        console.log(`[SKIP] ${userId} - no email`)
        skipped++
        continue
      }

      // Check if profile exists
      const exists = await redis.exists(PROFILE_KEY(userId))
      if (!exists) {
        console.log(`[SKIP] ${userId} - no profile`)
        skipped++
        continue
      }

      // Update email field
      await redis.hSet(PROFILE_KEY(userId), 'email', email)
      console.log(`[UPDATE] ${email} (${userId})`)
      updated++
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Summary:')
    console.log(`  Total users: ${users.length}`)
    console.log(`  Emails updated: ${updated}`)
    console.log(`  Skipped: ${skipped}`)
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
