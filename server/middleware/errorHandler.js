import logger from '../utils/logger.js';

// Fields that must never appear in logs
const SENSITIVE_FIELDS = new Set([
    'password', 'newPassword', 'oldPassword', 'confirmPassword',
    'token', 'accessToken', 'refreshToken',
    'cardNumber', 'cvv', 'cardExpiry',
    'secret', 'apiKey', 'apiSecret', 'privateKey'
]);

const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return body;
    return Object.fromEntries(
        Object.entries(body).map(([k, v]) =>
            SENSITIVE_FIELDS.has(k) ? [k, '[REDACTED]'] : [k, v]
        )
    );
};

/**
 * Global error handler middleware
 * Catches all errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
    // Log the error — body is sanitized to avoid logging credentials
    logger.error(`${err.name}: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        body: sanitizeBody(req.body)
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: messages.join(', ')
            }
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: {
                code: 'DUPLICATE_ERROR',
                message: `${field} already exists`
            }
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_ID',
                message: 'Invalid resource ID format'
            }
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid authentication token'
            }
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'TOKEN_EXPIRED',
                message: 'Authentication token has expired'
            }
        });
    }

    // Joi validation error
    if (err.isJoi) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: err.details.map(d => d.message).join(', ')
            }
        });
    }

    // Custom application errors
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'APPLICATION_ERROR',
                message: err.message
            }
        });
    }

    // Default server error - hide details in production
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: isProduction ? 'An unexpected error occurred' : err.message,
            ...(isProduction ? {} : { stack: err.stack })
        }
    });
};

/**
 * Not found handler - 404 for unmatched routes
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`
        }
    });
};

export default errorHandler;
