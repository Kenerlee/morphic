import Redis from 'ioredis'

// 生产环境使用本地 Redis，开发环境可用 Upstash
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000)
    return delay
  },
  lazyConnect: true,
})

// 连接事件监听
redis.on('connect', () => {
  console.log('[Better Auth] Redis connected')
})

redis.on('error', (err) => {
  console.error('[Better Auth] Redis error:', err)
})

// Better Auth SecondaryStorage 接口实现
export const redisStorage = {
  get: async (key: string) => {
    try {
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('[Better Auth] Redis get error:', error)
      return null
    }
  },
  set: async (key: string, value: unknown, ttl?: number) => {
    try {
      const stringValue = JSON.stringify(value)
      if (ttl) {
        await redis.set(key, stringValue, 'EX', ttl)
      } else {
        await redis.set(key, stringValue)
      }
    } catch (error) {
      console.error('[Better Auth] Redis set error:', error)
    }
  },
  delete: async (key: string) => {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('[Better Auth] Redis delete error:', error)
    }
  },
}

// 健康检查
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping()
    return pong === 'PONG'
  } catch (error) {
    console.error('[Better Auth] Redis health check failed:', error)
    return false
  }
}
