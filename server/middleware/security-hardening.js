const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const validator = require('validator');

// Advanced security middleware for production hardening

/**
 * Enhanced Security Headers with OWASP recommendations
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'", "https://www.google.com", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.razorpay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Permissions Policy
  permissionsPolicy: {
    directives: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: ['self'],
      usb: []
    }
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * Advanced Rate Limiting with different tiers
 */
const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100,
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Custom key generation for different user types
      if (req.user && req.user.role === 'admin') {
        return `admin:${req.user.id}:${req.ip}`;
      } else if (req.user) {
        return `user:${req.user.id}:${req.ip}`;
      }
      return `anonymous:${req.ip}`;
    },
    skip: (req) => {
      // Skip rate limiting for health checks and static assets
      return req.path === '/health' || req.path.startsWith('/static/');
    }
  });
};

// Rate limiters for different endpoints
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 60, // 60 API requests per minute
});

const paymentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3, // 3 payment attempts per 5 minutes
  skipSuccessfulRequests: true
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10, // 10 uploads per hour
});

/**
 * Input Validation and Sanitization
 */
const validateAndSanitize = (req, res, next) => {
  try {
    // Validate and sanitize all input
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }
    
    next();
  } catch (error) {
    console.error('Input validation error:', error);
    res.status(400).json({
      error: 'Invalid input data',
      code: 'INVALID_INPUT'
    });
  }
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return validator.escape(input.trim());
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

/**
 * SQL Injection Prevention
 */
const preventSQLInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|;|\/\*|\*\/|@@|@|CHAR|NCHAR|VARCHAR|NVARCHAR|ALTER|BEGIN|CAST|CREATE|CURSOR|DECLARE|DELETE|DENY|DROP|EXECUTE|FETCH|INSERT|KILL|OPEN|REVOKE|SET|UNION|UPDATE|WHERE)/i,
    /(\bOR\b.*=.*\bOR\b|\bAND\b.*=.*\bAND\b)/i
  ];
  
  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return sqlPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && checkString(value)) {
        return true;
      } else if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  };
  
  // Check all request data
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.warn('SQL injection attempt detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Invalid request detected',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  next();
};

/**
 * XSS Prevention
 */
const preventXSS = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>)/i,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>)/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<img\b[^>]*src[^>]*javascript:/i
  ];
  
  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return xssPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && checkString(value)) {
        return true;
      } else if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  };
  
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.warn('XSS attempt detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Invalid request detected',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  next();
};

/**
 * CSRF Protection
 */
const csrfProtection = (req, res, next) => {
  const csrfToken = req.get('x-csrf-token') || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  // Skip CSRF protection for GET requests and API endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  
  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    console.warn('CSRF attempt detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_VIOLATION'
    });
  }
  
  next();
};

/**
 * Request Size Limiting
 */
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
      return res.status(413).json({
        error: 'Request entity too large',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    
    next();
  };
};

const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  
  if (!match) return 0;
  return parseFloat(match[1]) * (units[match[2]] || 1);
};

/**
 * IP Whitelisting/Blacklisting
 */
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Whitelist for known good IPs
  const whitelist = process.env.IP_WHITELIST?.split(',') || [];
  if (whitelist.length > 0 && whitelist.includes(clientIP)) {
    return next();
  }
  
  // Blacklist for known bad IPs
  const blacklist = process.env.IP_BLACKLIST?.split(',') || [];
  if (blacklist.includes(clientIP)) {
    console.warn('Blacklisted IP access attempt:', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

/**
 * Bot Detection
 */
const botDetection = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /node/i
  ];
  
  const isBot = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot && !req.path.startsWith('/api/')) {
    // Allow bots for API endpoints but log them
    console.info('Bot detected:', {
      ip: req.ip,
      userAgent,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    // Rate limit bots more strictly
    return rateLimit({
      windowMs: 60 * 1000,
      max: 10 // 10 requests per minute for bots
    })(req, res, next);
  }
  
  next();
};

/**
 * Security Audit Logging
 */
const securityAudit = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request details for security monitoring
  const auditLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    userId: req.user?.id,
    userRole: req.user?.role,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  };
  
  // Log to security audit file (in production, use proper logging service)
  console.log('SECURITY_AUDIT:', JSON.stringify(auditLog));
  
  // Add response time logging
  res.on('finish', () => {
    auditLog.responseTime = Date.now() - startTime;
    auditLog.statusCode = res.statusCode;
    
    // Log security events
    if (res.statusCode >= 400) {
      console.warn('SECURITY_EVENT:', JSON.stringify(auditLog));
    }
  });
  
  next();
};

/**
 * Data Encryption Helper
 */
const encryptSensitiveData = (data, key = process.env.ENCRYPTION_KEY) => {
  if (!key) throw new Error('Encryption key not configured');
  
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('singglebee', 'utf8'));
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decryptSensitiveData = (encryptedData, key = process.env.ENCRYPTION_KEY) => {
  if (!key) throw new Error('Encryption key not configured');
  
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('singglebee', 'utf8'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
};

/**
 * Security Headers Middleware
 */
const addSecurityHeaders = (req, res, next) => {
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self), usb=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'SINGGLEBEE');
  
  next();
};

module.exports = {
  securityHeaders,
  authLimiter,
  apiLimiter,
  paymentLimiter,
  uploadLimiter,
  validateAndSanitize,
  preventSQLInjection,
  preventXSS,
  csrfProtection,
  requestSizeLimit,
  ipFilter,
  botDetection,
  securityAudit,
  encryptSensitiveData,
  decryptSensitiveData,
  addSecurityHeaders
};
