/**
 * 初始化 Admin 用户脚本
 *
 * 使用方法：
 * npx tsx scripts/init-admin.ts <user_id>
 */

import { Redis } from '@upstash/redis'

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error('请设置 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN 环境变量')
  process.exit(1)
}

const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN
})

async function initAdmin(userId: string) {
  const now = new Date().toISOString()
  const profileKey = `user:profile:${userId}`

  console.log(`正在为用户 ${userId} 创建 admin 配置...`)

  // 创建 admin 配置文件
  await redis.hmset(profileKey, {
    id: userId,
    mobile: '',
    level: 'admin',
    role: 'admin',
    quota_limit: '-1',
    quota_used: '0',
    quota_reset_date: '',
    level_expire_at: '',
    created_at: now,
    updated_at: now
  })

  // 添加到用户索引
  await redis.zadd('user:profiles:all', { score: Date.now(), member: userId })

  // 验证
  const profile = await redis.hgetall(profileKey)
  console.log('\n✅ Admin 用户创建成功!')
  console.log('用户配置:', JSON.stringify(profile, null, 2))
}

const userId = process.argv[2] || 'dda4050a-b8e7-4bb7-be2a-5ccdbf2a5eb6'
initAdmin(userId).catch(console.error)
