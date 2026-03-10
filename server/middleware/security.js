// 🛡️ Security Middleware for SINGGLEBEE Backend

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Security Headers Configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.cashfree.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://singglebee.com"],
      connectSrc: ["'self'", "https://api.singglebee.com", "https://checkout.cashfree.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Rate Limiting Configuration
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900 // 15 minutes
  },
  skipSuccessfulRequests: true,
});

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://singglebee.com',
      'https://www.singglebee.com',
      'https://app.singglebee.com'
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// HTTPS Enforcement Middleware
const enforceHTTPS = (req, res, next) => {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};

// Security Logging Middleware
const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer')
    };
    
    // Log suspicious activities
    if (res.statusCode >= 400) {
      console.warn('🚨 Security Alert:', logData);
    }
    
    // Log slow requests
    if (duration > 5000) {
      console.warn('⏱️ Slow Request:', logData);
    }
  });
  
  next();
};

// Request Size Limit
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    });
  }
  
  next();
};

// IP Whitelist/Blacklist (optional)
const ipFilter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const blacklist = process.env.BLACKLISTED_IPS ? process.env.BLACKLISTED_IPS.split(',') : [];
  const whitelist = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',') : [];
  
  // Check blacklist
  if (blacklist.includes(clientIP)) {
    return res.status(403).json({ error: 'IP address blocked' });
  }
  
  // Check whitelist (if configured)
  if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
    return res.status(403).json({ error: 'IP address not allowed' });
  }
  
  next();
};

module.exports = {
  securityHeaders,
  rateLimiter,
  authRateLimiter,
  corsOptions,
  enforceHTTPS,
  securityLogger,
  requestSizeLimit,
  ipFilter
};
