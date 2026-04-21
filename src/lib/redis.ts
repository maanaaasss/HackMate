// server-only — do not import in Client Components
import { Redis } from 'ioredis'
import { env } from '@/lib/env'

export const redis = new Redis(env.UPSTASH_REDIS_URL, {
  password: env.UPSTASH_REDIS_TOKEN,
})