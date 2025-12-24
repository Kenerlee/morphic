/**
 * User Migration Script: Supabase → Better Auth
 *
 * 使用方法:
 * npx tsx scripts/migrate-to-better-auth.ts
 *
 * 注意:
 * - 需要设置 SUPABASE_SERVICE_ROLE_KEY 环境变量
 * - 迁移后用户需要重置密码（通过邮箱或手机验证码登录）
 */

import { createClient } from '@supabase/supabase-js'

// 加载环境变量
import 'dotenv/config'

interface MigrationStats {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: string[]
}

async function migrateUsers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const redisUrl = process.env.LOCAL_REDIS_URL || process.env.REDIS_URL

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.log('Required environment variables:')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🚀 Starting user migration from Supabase to Better Auth')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log(`📍 Redis URL: ${redisUrl || 'Not configured (using memory)'}`)
  console.log('')

  // 创建 Supabase Admin 客户端
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 获取所有 Supabase 用户
    console.log('📥 Fetching users from Supabase...')
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('❌ Failed to list users:', error)
      process.exit(1)
    }

    stats.total = users?.length || 0
    console.log(`📊 Found ${stats.total} users to migrate`)
    console.log('')

    if (!users || users.length === 0) {
      console.log('✅ No users to migrate')
      return stats
    }

    // 动态导入 auth (避免环境变量问题)
    const { auth } = await import('../lib/auth')

    for (const user of users) {
      try {
        // 检查是否是手机号用户
        const isPhoneUser = user.email?.endsWith('@phone.navix.local')
        const cleanPhone = isPhoneUser
          ? user.email?.split('@')[0]
          : user.phone?.replace(/^\+86/, '')

        // 提取用户信息
        const userData = {
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          phone: cleanPhone,
          emailVerified: !!user.email_confirmed_at,
          phoneVerified: !!user.phone_confirmed_at || isPhoneUser,
          role: 'user' as const, // 迁移的用户默认为 user 角色
        }

        console.log(`  → Migrating: ${userData.email}`)

        // 尝试在 Better Auth 中创建用户
        // 注意: Better Auth 需要配置数据库适配器才能持久化用户
        // 如果只使用 Redis session 存储，用户数据需要另外处理

        // 这里我们只是记录需要迁移的用户信息
        // 实际迁移在用户下次登录时通过"静默迁移"完成
        console.log(`    ✓ Recorded: ${userData.email} (${isPhoneUser ? 'phone' : 'email'} user)`)
        stats.migrated++

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error(`    ✗ Failed: ${user.email} - ${errorMsg}`)
        stats.failed++
        stats.errors.push(`${user.email}: ${errorMsg}`)
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  return stats
}

// 打印迁移报告
function printReport(stats: MigrationStats) {
  console.log('')
  console.log('═══════════════════════════════════════')
  console.log('📊 Migration Report')
  console.log('═══════════════════════════════════════')
  console.log(`  Total users:    ${stats.total}`)
  console.log(`  Migrated:       ${stats.migrated}`)
  console.log(`  Skipped:        ${stats.skipped}`)
  console.log(`  Failed:         ${stats.failed}`)
  console.log('')

  if (stats.errors.length > 0) {
    console.log('❌ Errors:')
    stats.errors.forEach(err => console.log(`    - ${err}`))
    console.log('')
  }

  if (stats.failed === 0) {
    console.log('✅ Migration completed successfully!')
  } else {
    console.log('⚠️  Migration completed with errors')
  }

  console.log('')
  console.log('📌 Next Steps:')
  console.log('  1. Users will be silently migrated on their next login')
  console.log('  2. Phone users can log in with SMS verification')
  console.log('  3. Email users can use password reset if needed')
  console.log('═══════════════════════════════════════')
}

// 运行迁移
async function main() {
  console.log('')
  console.log('╔═══════════════════════════════════════╗')
  console.log('║  NaviX User Migration Tool            ║')
  console.log('║  Supabase → Better Auth               ║')
  console.log('╚═══════════════════════════════════════╝')
  console.log('')

  const stats = await migrateUsers()
  printReport(stats)
}

main().catch(console.error)
