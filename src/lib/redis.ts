// server-only — do not import in Client Components
import { Redis } from 'ioredis'
import { env } from '@/lib/env'

// Lazy Redis connection (avoids connection at build time)
let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.UPSTASH_REDIS_URL, {
      password: env.UPSTASH_REDIS_TOKEN,
    })
  }
  return _redis
}

// For backward compatibility - proxy all methods
export const redis = new Proxy({} as Redis, {
  get(_target, prop: keyof Redis) {
    return getRedis()[prop]
  },
})