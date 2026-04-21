import { redis } from './redis'

type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Redis-based rate limiting using sliding window algorithm
 * @param key - Unique identifier for rate limit (e.g., 'user:123:submissions')
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns RateLimitResult with success status, remaining requests, and reset timestamp
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart)
    
    // Count current entries in window
    pipeline.zcard(redisKey)
    
    // Add current request
    pipeline.zadd(redisKey, now.toString(), `${now}-${Math.random()}`)
    
    // Set expiry on the key
    pipeline.expire(redisKey, windowSeconds)
    
    const results = await pipeline.exec()
    
    if (!results) {
      throw new Error('Redis pipeline failed')
    }
    
    // Get count after adding current request
    const currentCount = (results[1][1] as number) + 1
    
    // Calculate reset time
    const resetAt = now + windowSeconds * 1000
    
    return {
      success: currentCount <= limit,
      remaining: Math.max(0, limit - currentCount),
      resetAt,
    }
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    console.error('Rate limit error:', error)
    return {
      success: true,
      remaining: limit,
      resetAt: now + windowSeconds * 1000,
    }
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.success ? 0 : 1)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  }
}
