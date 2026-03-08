import rateLimit from 'express-rate-limit';

// Global rate limiter - 100 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
});

// Stricter rate limiter for auth routes - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: {
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Too many login attempts. Please try again after 15 minutes.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
});

// API rate limiter - 50 requests per minute
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: {
        success: false,
        error: {
            code: 'API_RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded. Please slow down.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
});

// Stricter rate limiter for payment sessions - 5 attempts per 15 mins to prevent abuse
export const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: {
            code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
            message: 'Too many payment requests. Please try again after 15 minutes.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
});
