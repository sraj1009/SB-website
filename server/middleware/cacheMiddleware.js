import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

// Cache for 5 minutes by default
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in seconds
 */
export const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Use URL as cache key
        const key = req.originalUrl;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            logger.debug(`Cache hit for ${key}`);
            return res.json(cachedResponse);
        } else {
            logger.debug(`Cache miss for ${key}`);

            // Override res.json to cache response before sending
            const originalJson = res.json;
            res.json = function (body) {
                // Ensure we only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cache.set(key, body, duration);
                }
                originalJson.call(this, body);
            };
            next();
        }
    };
};

/**
 * Utility to clear cache for specific prefixes
 */
export const clearCache = (prefix) => {
    const keys = cache.keys();
    const keysToDelete = keys.filter(key => key.startsWith(prefix));
    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
        logger.debug(`Cleared ${keysToDelete.length} keys from cache for prefix ${prefix}`);
    }
};
