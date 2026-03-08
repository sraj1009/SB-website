import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { globalLimiter } from './middleware/rateLimiter.js';
import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './routes/api/v1/auth.js';
import productRoutes from './routes/api/v1/products.js';
import orderRoutes from './routes/api/v1/orders.js';
import adminRoutes from './routes/api/v1/admin.js';
import paymentRoutes from './routes/api/v1/payments.js';
import wishlistRoutes from './routes/api/v1/wishlist.js';
import addressRoutes from './routes/api/v1/addresses.js';
import reviewRoutes from './routes/api/v1/reviews.js';
import aiRoutes from './routes/aiRoutes.js';

const app = express();

// Trust proxy when behind load balancer (e.g. Nginx, Heroku) - needed for correct IP in rate limiting
app.set('trust proxy', 1);

// Enable GZIP compression
app.use(compression());

// ===========================================
// ENVIRONMENT VALIDATION
// ===========================================

if (!process.env.NODE_ENV) {
    logger.warn('NODE_ENV is not set, defaulting to development');
    process.env.NODE_ENV = 'development';
}
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    logger.warn('FRONTEND_URL is not set in production');
}

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: [], // Force HTTPS in production
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS - Strict origin configuration
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:4173'
        ];

        // Allow null origin only in development (Postman, mobile apps).
        // In production every caller must be in the allowlist.
        const isDev = process.env.NODE_ENV !== 'production';
        if ((isDev && !origin) || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Global rate limiting
app.use(globalLimiter);

// ===========================================
// BODY PARSING & SANITIZATION
// ===========================================

// Parse JSON bodies (limit to prevent large payloads)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware - prevent NoSQL injection & XSS
app.use(mongoSanitize());

// Optional: Basic XSS prevention on specific body fields can be added here,
// but helmet and the frontend framework handle most of it securely.

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
            ip: req.ip
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
        version: '1.0.0'
    });
});

// ===========================================
// API ROUTES
// ===========================================

// Core routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);

// User feature routes
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/assistant', aiRoutes);

// Admin routes
app.use('/api/v1/admin', adminRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;

