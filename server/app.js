import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import promBundle from 'express-prom-bundle';
import { initializeTracing } from './otel/tracing.js';

// Initialize OpenTelemetry first
initializeTracing();
import { globalLimiter } from './middleware/rateLimiter.js';
import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Import routes
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { register } from './utils/metrics.js';
import authRoutes from './routes/api/v1/auth.js';
import productRoutes from './routes/api/v1/products.js';
import orderRoutes from './routes/api/v1/orders.js';
import adminRoutes from './routes/api/v1/admin.js';
import paymentRoutes from './routes/api/v1/payments.js';
import wishlistRoutes from './routes/api/v1/wishlist.js';
import addressRoutes from './routes/api/v1/addresses.js';
import reviewRoutes from './routes/api/v1/reviews.js';
import assistantRoutes from './routes/assistant.js';
import couponRoutes from './routes/api/v1/coupons.js';
import uploadRoutes from './routes/api/v1/upload.js';
import twoFactorRoutes from './routes/api/v1/twoFactor.js';
import gdprRoutes from './routes/api/v1/gdpr.js';
import paymentWebhookRoutes from './routes/api/v1/paymentWebhooks.js';
import { authLimiter, paymentLimiter, apiLimiter, adminLimiter } from './middleware/rateLimiter.js';

const app = express();

// Trust proxy when behind load balancer (e.g. Nginx, Heroku) - needed for correct IP in rate limiting
app.set('trust proxy', 1);

// Enable GZIP compression
app.use(compression());

// ===========================================
// METRICS & MONITORING
// ===========================================
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'singglebee-backend' },
  promClient: {
    collectDefaultMetrics: {},
  },
  promRegistry: register,
});

app.use(metricsMiddleware);

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Middleware
app.use(cookieParser());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://sdk.cashfree.com'], // Removed unsafe-inline
        styleSrc: ["'self'", 'https://fonts.googleapis.com'], // Removed unsafe-inline
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.cashfree.com', 'https://www.google-analytics.com'],
        connectSrc: ["'self'", 'https://*.cashfree.com', 'https://api.cashfree.com', 'https://www.google-analytics.com', 'https://stats.g.doubleclick.net'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        frameSrc: ["'self'", 'https://*.cashfree.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        // Add nonce support for dynamic scripts
        scriptSrcAttr: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Additional security headers
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
    noSniff: true,
    originAgentCluster: true,
  })
);

// CORS - More permissive for development, strict for production
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.frontendUrl,
      'https://singglebee.com',
      'https://www.singglebee.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4173',
    ];

    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages', 'Set-Cookie'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Global rate limiting
app.use(globalLimiter);

// ===========================================
// BODY PARSING & SANITIZATION
// ===========================================

// Parse JSON bodies (limit to prevent large payloads)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware - prevent NoSQL injection & XSS
app.use(mongoSanitize());

// Optional: Basic XSS prevention on specific body fields can be added here,
// but helmet and the frontend framework handle most of it securely.

// ===========================================
// JSON RESPONSE MIDDLEWARE
// ===========================================
// Ensure all responses are JSON formatted
app.use((req, res, next) => {
  // Set default content type for API routes
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// ===========================================
// REQUEST LOGGING
// ===========================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });

  next();
});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SINGGLEBEE API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// ===========================================
// API DOCUMENTATION (SWAGGER)
// ===========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===========================================
// API ROUTES
// ===========================================

// Core routes with specific rate limiting
app.use('/api/v1/auth/signin', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', apiLimiter, productRoutes);
app.use('/api/v1/orders', apiLimiter, orderRoutes);
app.use('/api/v1/payments', paymentLimiter, paymentRoutes);

// User feature routes with API rate limiting
app.use('/api/v1/wishlist', apiLimiter, wishlistRoutes);
app.use('/api/v1/addresses', apiLimiter, addressRoutes);
app.use('/api/v1/reviews', apiLimiter, reviewRoutes);
app.use('/api/v1/coupons', apiLimiter, couponRoutes);
app.use('/api/v1/upload', apiLimiter, uploadRoutes);
app.use('/api/v1/assistant', apiLimiter, assistantRoutes);

// Admin routes with strict rate limiting
app.use('/api/v1/admin', adminLimiter, adminRoutes);

// 2FA routes (admin only)
app.use('/api/v1/admin/2fa', adminLimiter, twoFactorRoutes);

// GDPR routes (users)
app.use('/api/v1/users', gdprRoutes);

// Payment webhook routes (public endpoints)
app.use('/api/v1/payments', paymentWebhookRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
