import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis.js';
import { RedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

// Cache middleware options
interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  skipCache?: boolean;
}

// Default cache options
const defaultOptions: CacheOptions = {
  ttl: 300, // 5 minutes
  condition: (req) => req.method === 'GET', // Only cache GET requests
};

/**
 * Cache middleware factory
 * Creates middleware that caches responses and serves from cache when available
 */
export const cache = (options: CacheOptions = {}) => {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if conditions are not met
    if (opts.skipCache || (opts.condition && !opts.condition(req))) {
      return next();
    }

    const cacheKey = opts.keyGenerator 
      ? opts.keyGenerator(req)
      : generateCacheKey(req);

    try {
      // Try to get from cache
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        logger.debug(`Cache hit for key: ${cacheKey}`);
        
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.json(data);
      }

      // Cache miss - continue to controller
      logger.debug(`Cache miss for key: ${cacheKey}`);
      
      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response asynchronously (don't block the response)
          redisClient.setex(
            cacheKey, 
            opts.ttl || 300, 
            JSON.stringify(data)
          ).catch(error => {
            logger.error('Failed to cache response:', error);
          });
          
          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching if Redis fails
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache entries based on request
 */
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to invalidate cache after successful response
    res.json = function(data: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache patterns asynchronously
        invalidateCachePatterns(patterns).catch(error => {
          logger.error('Failed to invalidate cache:', error);
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const baseUrl = req.baseUrl || '';
  const path = req.path || '';
  const query = JSON.stringify(req.query || {});
  const params = JSON.stringify(req.params || {});
  
  return `singglebee:cache:${baseUrl}${path}:${Buffer.from(query + params).toString('base64')}`;
}

/**
 * Invalidate cache patterns
 */
async function invalidateCachePatterns(patterns: string[]): Promise<void> {
  const client = redisClient;
  
  for (const pattern of patterns) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        logger.debug(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }
}

/**
 * Cache helper functions
 */
export class CacheHelper {
  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache keys matching pattern
   */
  static async clear(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        return await redisClient.del(...keys);
      }
      return 0;
    } catch (error) {
      logger.error(`Cache clear error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment numeric value in cache
   */
  static async incr(key: string, amount: number = 1): Promise<number> {
    try {
      return await redisClient.incrby(key, amount);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set value in cache only if key doesn't exist
   */
  static async setnx(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const result = await redisClient.setnx(key, serialized);
      
      if (result && ttl) {
        await redisClient.expire(key, ttl);
      }
      
      return result === 1;
    } catch (error) {
      logger.error(`Cache setnx error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await redisClient.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  static async mset(keyValuePairs: Array<{key: string, value: any, ttl?: number}>): Promise<void> {
    try {
      const pipeline = redisClient.pipeline();
      
      for (const {key, value, ttl} of keyValuePairs) {
        const serialized = JSON.stringify(value);
        pipeline.set(key, serialized);
        if (ttl) {
          pipeline.expire(key, ttl);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Cache mset error:', error);
    }
  }
}

export default cache;
