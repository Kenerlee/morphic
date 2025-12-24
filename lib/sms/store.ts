import { Redis } from '@upstash/redis'

// Redis 客户端（如果配置了的话）
let redis: Redis | null = null
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
}

// 内存存储作为 Redis 的备选（仅用于开发环境）
const memoryStore = new Map<
  string,
  { code: string; expiresAt: number; sendAt: number }
>()

export const OTP_EXPIRY = 300 // 5分钟有效期（秒）
export const RESEND_INTERVAL = 60 // 60秒后才能重发

export { memoryStore, redis }
