import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../../domain/services/AuthenticationService';
import logger from '../../shared/logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter middleware.
 * Tracks requests per user (by userId if authenticated, otherwise by IP).
 * 100 requests per minute window. Returns 429 with Retry-After header when exceeded.
 * Requirements: 20.5
 */
export function createRateLimiter(options?: {
  maxRequests?: number;
  windowMs?: number;
}) {
  const maxRequests = options?.maxRequests ?? 100;
  const windowMs = options?.windowMs ?? 60 * 1000; // 1 minute
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Allow cleanup interval to not prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();

    let entry = store.get(key);

    // Reset if window has expired
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${key}`);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Derive a unique key for rate limiting.
 * Uses userId if authenticated, otherwise falls back to IP address.
 */
function getClientKey(req: Request): string {
  const user = (req as any).__jwtPayload as JWTPayload | undefined;
  if (user?.userId) {
    return `user:${user.userId}`;
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}
