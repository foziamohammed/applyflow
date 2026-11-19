import type { Request, Response, NextFunction } from 'express'

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Creates an in-process per-user rate limiter middleware.
 * @param maxRequests Max requests allowed per window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
  const userCounts = new Map<string, RateLimitEntry>()

  // Cleanup stale entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of userCounts) {
      if (now > entry.resetAt) {
        userCounts.delete(key)
      }
    }
  }, windowMs).unref()

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as { userId?: string }).userId
    if (!userId) {
      next()
      return
    }

    const now = Date.now()
    let entry = userCounts.get(userId)

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      userCounts.set(userId, entry)
    }

    entry.count++

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfterSec))
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `Too many requests. Try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      })
      return
    }

    next()
  }
}
