import rateLimit from 'express-rate-limit';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { rateLimitBlocksCounter } from '../utils/metrics.js';

const isProd = config.env === 'production';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 1000,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Global rate limit exceeded for IP: ${req.ip}`);
    rateLimitBlocksCounter.inc({ limiter_type: 'global' });
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
});

// Stricter rate limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 5 : 50,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    logger.warn(`Auth/Payment rate limit exceeded for IP: ${req.ip}`);
    rateLimitBlocksCounter.inc({ limiter_type: 'auth' });
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
});

// API rate limiter - 50 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 50 : 500,
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded. Please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    rateLimitBlocksCounter.inc({ limiter_type: 'api' });
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
});

// Stricter rate limiter for payment sessions
export const paymentLimiter = authLimiter; // Reuse authLimiter logic for payments
