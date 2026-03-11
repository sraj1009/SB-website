import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Rate limit configuration interface
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  auth: {
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
    register: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 3 requests per 15 minutes
    forgotPassword: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 requests per hour
  },
  orders: {
    create: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes per user
    webhook: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute per IP
  },
  general: {
    api: { windowMs: 15 * 60 * 1000, maxRequests: 1000 }, // 1000 requests per 15 minutes per IP
    upload: { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50 uploads per hour per user
  },
};

/**
 * Redis-based rate limiting middleware
 */
export const rateLimitRedis = (config: RateLimitConfig) => {
  const redis = redisClient;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate key for rate limiting
      const key = config.keyGenerator ? config.keyGenerator(req) : generateRateLimitKey(req);

      // Get current request count
      const current = await redis.get(key);
      const requests = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (requests >= config.maxRequests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + ttl * 1000);

        logger.warn(`Rate limit exceeded for key: ${key}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          requests,
          limit: config.maxRequests,
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: config.message || 'Too many requests, please try again later.',
            retryAfter: ttl,
            resetTime: resetTime.toISOString(),
          },
        });
      }

      // Increment request count
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const newRequests = results?.[0]?.[1] || 1;

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, config.maxRequests - newRequests).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // If Redis fails, allow the request (fail open)
      next();
    }
  };
};

/**
 * Generate rate limit key
 */
function generateRateLimitKey(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const endpoint = req.route?.path || req.path || 'unknown';
  return RedisClient.getKeys.rateLimit.endpoint(endpoint, ip);
}

/**
 * User-based rate limiting (requires authentication)
 */
export const userRateLimit = (config: RateLimitConfig) => {
  return rateLimitRedis({
    ...config,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      if (user && user._id) {
        const endpoint = req.route?.path || req.path || 'unknown';
        return RedisClient.getKeys.rateLimit.endpoint(endpoint, user._id.toString());
      }
      // Fallback to IP-based limiting
      return generateRateLimitKey(req);
    },
  });
};

/**
 * IP whitelist rate limiting (for webhooks and trusted sources)
 */
export const ipWhitelistRateLimit = (config: RateLimitConfig, whitelist: string[] = []) => {
  return rateLimitRedis({
    ...config,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      // Skip rate limiting for whitelisted IPs
      if (whitelist.includes(ip)) {
        return ''; // Empty key will be handled below
      }

      const endpoint = req.route?.path || req.path || 'unknown';
      return RedisClient.getKeys.rateLimit.endpoint(endpoint, ip);
    },
  });
};

/**
 * Progressive rate limiting (increasingly strict limits)
 */
export const progressiveRateLimit = (
  tiers: Array<{
    windowMs: number;
    maxRequests: number;
    trigger?: (req: Request) => boolean;
  }>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = redisClient;

      // Find applicable tier
      const tier = tiers.find((t) => !t.trigger || t.trigger(req)) || tiers[0];

      const key = generateRateLimitKey(req) + ':progressive';
      const current = await redis.get(key);
      const requests = current ? parseInt(current) : 0;

      // Check if limit exceeded
      if (requests >= tier.maxRequests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + ttl * 1000);

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
            retryAfter: ttl,
            resetTime: resetTime.toISOString(),
          },
        });
      }

      // Increment request count
      await redis.setex(key, Math.ceil(tier.windowMs / 1000), requests + 1);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': tier.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, tier.maxRequests - requests - 1).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + tier.windowMs).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Progressive rate limiting error:', error);
      next();
    }
  };
};

/**
 * Rate limiting for API endpoints with different configurations
 */
export const createRateLimitMiddleware = (
  type: keyof typeof RATE_LIMIT_CONFIGS,
  endpoint: string
) => {
  const config = RATE_LIMIT_CONFIGS[type];
  const endpointConfig = config[endpoint as keyof typeof config];

  if (!endpointConfig) {
    throw new Error(`Rate limit configuration not found for ${type}.${endpoint}`);
  }

  return rateLimitRedis({
    ...endpointConfig,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return RedisClient.getKeys.rateLimit.endpoint(`${type}:${endpoint}`, ip);
    },
  });
};

/**
 * Rate limiting utilities
 */
export class RateLimitUtils {
  /**
   * Check current rate limit status for a key
   */
  static async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    remaining: number;
    resetTime: Date;
    isLimited: boolean;
  }> {
    try {
      const redis = redisClient;
      const current = await redis.get(key);
      const requests = current ? parseInt(current) : 0;
      const ttl = await redis.ttl(key);

      return {
        remaining: Math.max(0, config.maxRequests - requests),
        resetTime: new Date(Date.now() + ttl * 1000),
        isLimited: requests >= config.maxRequests,
      };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return {
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMs),
        isLimited: false,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  static async resetRateLimit(key: string): Promise<void> {
    try {
      const redis = redisClient;
      await redis.del(key);
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }

  /**
   * Get rate limit statistics
   */
  static async getRateLimitStats(pattern: string = 'singglebee:ratelimit:*'): Promise<{
    totalKeys: number;
    totalRequests: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
  }> {
    try {
      const redis = redisClient;
      const keys = await redis.keys(pattern);

      let totalRequests = 0;
      const endpointCounts: Record<string, number> = {};

      for (const key of keys) {
        const requests = await redis.get(key);
        const count = requests ? parseInt(requests) : 0;
        totalRequests += count;

        // Extract endpoint from key
        const parts = key.split(':');
        if (parts.length >= 4) {
          const endpoint = parts[3];
          endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
        }
      }

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, requests]) => ({ endpoint, requests }));

      return {
        totalKeys: keys.length,
        totalRequests,
        topEndpoints,
      };
    } catch (error) {
      logger.error('Rate limit stats error:', error);
      return {
        totalKeys: 0,
        totalRequests: 0,
        topEndpoints: [],
      };
    }
  }

  /**
   * Clear all rate limit data
   */
  static async clearAllRateLimits(): Promise<number> {
    try {
      const redis = redisClient;
      const keys = await redis.keys('singglebee:ratelimit:*');

      if (keys.length > 0) {
        const deleted = await redis.del(...keys);
        logger.info(`Cleared ${deleted} rate limit entries`);
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Failed to clear rate limits:', error);
      return 0;
    }
  }
}

export default rateLimitRedis;
