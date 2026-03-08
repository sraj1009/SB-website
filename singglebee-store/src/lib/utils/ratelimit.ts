import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured, fallback gracefully if not
const isUpstashConfigured =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = isUpstashConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// Fallback logic for local development if Upstash isn't provided
const mockRateLimitSuccess = {
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
    pending: Promise.resolve(),
};

/**
 * Strict rate limiting for the Login endpoint
 * Limits: 5 requests per 5 minutes per IP
 */
export const loginRateLimit = isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(5, "5 m"),
        analytics: false,
        prefix: "rl_login",
    })
    : { limit: async () => mockRateLimitSuccess };

/**
 * Strict rate limiting for Signup endpoint (prevents mass bot registration)
 * Limits: 3 requests per 1 hour per IP
 */
export const signupRateLimit = isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        analytics: false,
        prefix: "rl_signup",
    })
    : { limit: async () => mockRateLimitSuccess };

/**
 * Strict rate limiting for Forgot Password endpoint (prevents email spamming)
 * Limits: 3 requests per 1 hour per IP
 */
export const forgotPasswordRateLimit = isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        analytics: false,
        prefix: "rl_forgot_pw",
    })
    : { limit: async () => mockRateLimitSuccess };
