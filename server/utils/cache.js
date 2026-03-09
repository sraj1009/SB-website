import NodeCache from 'node-cache';
import Redis from 'ioredis';
import logger from './logger.js';
import config from '../config/config.js';
import { cacheHitsCounter } from './metrics.js';

/**
 * Optimized Caching Utility
 * Uses Redis in production/centralized environments, fallbacks to node-cache locally.
 */
class CacheService {
    constructor(ttlSeconds = 600) {
        this.ttl = ttlSeconds;
        this.localCache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false,
        });

        const redisUrl = config.redis?.url || process.env.REDIS_URL;

        if (redisUrl) {
            try {
                this.redis = new Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    connectTimeout: 5000,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            logger.warn('Redis: Max retries reached, falling back to local cache.');
                            return null;
                        }
                        return Math.min(times * 200, 3000);
                    },
                });

                this.redis.on('error', (err) => {
                    logger.error(`Redis Error: ${err.message}`);
                    // We don't set this.redis = null here to allow for reconnects,
                    // but the methods will check this.redis.status before using it.
                });

                this.redis.on('connect', () => {
                    logger.info('Connected to Redis for distributed caching');
                });
            } catch (err) {
                logger.warn('Failed to initialize Redis client, using local node-cache');
            }
        } else {
            logger.info('Using local node-cache (Redis not configured)');
        }
    }

    /**
     * Helper to check if redis is truly available
     */
    isRedisAvailable() {
        return this.redis && this.redis.status === 'ready';
    }

    /**
     * Get value from cache
     */
    async get(key) {
        try {
            if (this.isRedisAvailable()) {
                const data = await this.redis.get(key);
                if (data) {
                    cacheHitsCounter.inc({ type: 'get', result: 'hit' });
                    return JSON.parse(data);
                }
                cacheHitsCounter.inc({ type: 'get', result: 'miss' });
                return null;
            }

            const data = this.localCache.get(key);
            if (data !== undefined) {
                cacheHitsCounter.inc({ type: 'get', result: 'hit' });
                return data;
            }
            cacheHitsCounter.inc({ type: 'get', result: 'miss' });
            return null;
        } catch (err) {
            logger.error(`Cache Get Error: ${err.message}`);
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set(key, value, ttl) {
        try {
            if (this.isRedisAvailable()) {
                await this.redis.set(key, JSON.stringify(value), 'EX', ttl || this.ttl);
                cacheHitsCounter.inc({ type: 'set', result: 'success' });
                return true;
            }

            const success = this.localCache.set(key, value, ttl);
            if (success) cacheHitsCounter.inc({ type: 'set', result: 'success' });
            return success;
        } catch (err) {
            logger.error(`Cache Set Error: ${err.message}`);
            return false;
        }
    }

    /**
     * Delete keys
     */
    async del(keys) {
        try {
            if (this.isRedisAvailable()) {
                const keyList = Array.isArray(keys) ? keys : [keys];
                if (keyList.length > 0) await this.redis.del(...keyList);
                return;
            }
            return this.localCache.del(keys);
        } catch (err) {
            logger.error(`Cache Del Error: ${err.message}`);
        }
    }

    /**
     * Invalidate by prefix
     */
    async invalidateByPrefix(prefix) {
        try {
            if (this.isRedisAvailable()) {
                const keys = await this.redis.keys(`${prefix}:*`);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    logger.info(`Redis: Invalidated ${keys.length} keys starting with ${prefix}`);
                }
                return;
            }

            const keys = this.localCache.keys();
            const targets = keys.filter((k) => k.startsWith(prefix));
            if (targets.length > 0) {
                this.localCache.del(targets);
                logger.info(`LocalCache: Invalidated ${targets.length} keys starting with ${prefix}`);
            }
        } catch (err) {
            logger.error(`Cache Invalidate Error: ${err.message}`);
        }
    }

    generateKey(prefix, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join('&');
        return `${prefix}:${sortedParams || 'all'}`;
    }

    async flush() {
        try {
            if (this.isRedisAvailable()) await this.redis.flushall();
            this.localCache.flushAll();
            logger.info('Cache flushed completely');
        } catch (err) {
            logger.error(`Cache Flush Error: ${err.message}`);
        }
    }
}

// Export a singleton for app-wide use
export const apiCache = new CacheService(300);
export default apiCache;
