import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'mongo-sanitize';
import sanitizeHtml from 'sanitize-html';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import createError from 'http-errors';
import logger from '../utils/logger.js';

// Security configuration
const SECURITY_CONFIG = {
  // XSS protection settings
  xss: {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    allowedIframeHostnames: [],
    selfClosing: ['br', 'img', 'hr'],
  },

  // Rate limiting configurations
  rateLimit: {
    // General API rate limit
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    },

    // Authentication endpoints (stricter)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      skipSuccessfulRequests: true,
      message: {
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later.',
        },
      },
    },

    // Upload endpoints
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 uploads per hour
      message: {
        success: false,
        error: {
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          message: 'Upload limit exceeded, please try again later.',
        },
      },
    },
  },

  // File upload security
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
  },
};

/**
 * Helmet security headers middleware
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  // Other security headers
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * MongoDB injection protection middleware
 */
export const mongoSanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = mongoSanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = mongoSanitize(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = mongoSanitize(req.params);
    }

    next();
  } catch (error) {
    logger.error('MongoDB sanitization error:', error);
    next(createError(400, 'Invalid request parameters'));
  }
};

/**
 * XSS protection middleware
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize string fields in request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    logger.error('XSS sanitization error:', error);
    next(createError(400, 'Invalid request content'));
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, SECURITY_CONFIG.xss);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Input validation middleware factory
 */
export const validateInput = (schema: any, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        logger.warn('Input validation failed:', {
          ip: req.ip,
          path: req.path,
          errors,
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors,
          },
        });
      }

      // Replace with validated data
      req[source] = result.data;
      next();
    } catch (error) {
      logger.error('Input validation error:', error);
      next(createError(500, 'Validation error'));
    }
  };
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;

    if (!file) {
      return next();
    }

    // Check file size
    if (file.size > SECURITY_CONFIG.upload.maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${SECURITY_CONFIG.upload.maxSize / 1024 / 1024}MB`,
        },
      });
    }

    // Check MIME type
    if (!SECURITY_CONFIG.upload.allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type not allowed',
        },
      });
    }

    // Check file extension
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!SECURITY_CONFIG.upload.allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_EXTENSION',
          message: 'File extension not allowed',
        },
      });
    }

    // Additional security: Check file signature (magic numbers)
    // This would require additional implementation

    next();
  } catch (error) {
    logger.error('File upload security error:', error);
    next(createError(500, 'File validation error'));
  }
};

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (type: keyof typeof SECURITY_CONFIG.rateLimit) => {
  const config = SECURITY_CONFIG.rateLimit[type];

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    keyGenerator: (req) => {
      // Use IP address as key
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
      });

      res.status(429).json(config.message);
    },
  });
};

/**
 * IP blocking middleware for suspicious activity
 */
export const ipBlocker = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  // List of blocked IPs (in production, this would come from Redis/database)
  const blockedIps = new Set([
    // Add known malicious IPs here
  ]);

  if (blockedIps.has(clientIp)) {
    logger.warn('Blocked IP attempted access:', {
      ip: clientIp,
      path: req.path,
      userAgent: req.get('User-Agent'),
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: 'Access denied',
      },
    });
  }

  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: number = 1024 * 1024) => {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds maximum allowed size of ${maxSize / 1024}KB`,
        },
      });
    }

    next();
  };
};

/**
 * Security audit logging middleware
 */
export const securityAudit = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request start
  logger.info('Security audit - Request started:', {
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    logger.info('Security audit - Request completed:', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    // Log suspicious activities
    if (res.statusCode >= 400) {
      logger.warn('Security audit - Suspicious activity detected:', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined,
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Comprehensive security middleware
 */
export const securityMiddleware = [
  securityHeaders,
  mongoSanitizeMiddleware,
  xssProtection,
  ipBlocker,
  requestSizeLimiter(),
  securityAudit,
];

export default {
  securityMiddleware,
  validateInput,
  fileUploadSecurity,
  createRateLimit,
  mongoSanitizeMiddleware,
  xssProtection,
  securityHeaders,
};
