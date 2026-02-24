import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter. For production with multiple instances, use Redis-based.
 */
class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 60s
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const limiter = new RateLimiter();

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limit middleware for webhook endpoints (WhatsApp)
 * Generous limit to handle burst messages
 */
export function webhookRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const { allowed, remaining, resetAt } = limiter.check(`webhook:${ip}`, 120, 60_000); // 120/min

  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

  if (!allowed) {
    logger.warn({ ip }, 'Webhook rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

/**
 * Rate limit for public API endpoints (simulation, contract view)
 */
export function publicApiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const { allowed, remaining, resetAt } = limiter.check(`public:${ip}`, 30, 60_000); // 30/min

  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

  if (!allowed) {
    logger.warn({ ip }, 'Public API rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}

/**
 * Rate limit for admin API endpoints
 */
export function adminApiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const { allowed, remaining, resetAt } = limiter.check(`admin:${ip}`, 60, 60_000); // 60/min

  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

  if (!allowed) {
    logger.warn({ ip }, 'Admin API rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}
