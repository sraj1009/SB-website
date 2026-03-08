import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Higher-order function to wrap API logic with Redis caching.
 * @param key Redis key for the cache
 * @param ttl Time-to-live in seconds (default: 3600 / 1 hour)
 * @param fetcher Async function that fetches data if cache is missing
 */
export async function withCache<T>(
    key: string,
    ttl: number = 3600,
    fetcher: () => Promise<T>
): Promise<T> {
    try {
        // 1. Try to get from cache
        const cached = await redis.get<T>(key);
        if (cached) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }

        console.log(`[Cache] MISS: ${key}`);

        // 2. Fetch fresh data
        const freshData = await fetcher();

        // 3. Store in cache (background, don't await if you want speed, but safer to await)
        if (freshData) {
            await redis.set(key, freshData, { ex: ttl });
        }

        return freshData;
    } catch (error) {
        console.error(`[Cache] Error for key ${key}:`, error);
        // Fallback to fresh data if Redis fails
        return await fetcher();
    }
}

/**
 * Manually invalidate a cache key
 */
export async function invalidateCache(key: string) {
    try {
        await redis.del(key);
    } catch (error) {
        console.error(`[Cache] Invalidation fail for ${key}:`, error);
    }
}
