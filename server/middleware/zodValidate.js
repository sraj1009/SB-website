import { ZodError } from 'zod';
import logger from '../utils/logger.js';

/**
 * Validation middleware wrapper for Zod schemas
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
export const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      // Ensure content type is set
      if (property === 'body') {
        res.setHeader('Content-Type', 'application/json');
      }

      // Validate the request property
      const validatedData = schema.parse(req[property]);

      // Replace request property with validated and sanitized data
      req[property] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn(`Validation failed for ${property}:`, {
          path: req.path,
          method: req.method,
          errors,
          ip: req.ip,
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

      // If it's not a ZodError, pass it to the next error handler
      next(error);
    }
  };
};

/**
 * Async validation middleware for complex validations
 * @param {Function} validator - Async validator function
 * @param {string} property - Request property to validate
 */
export const validateAsync = (validator, property = 'body') => {
  return async (req, res, next) => {
    try {
      await validator(req[property], req);
      next();
    } catch (error) {
      logger.warn(`Async validation failed for ${property}:`, {
        path: req.path,
        method: req.method,
        error: error.message,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Validation failed',
        },
      });
    }
  };
};

/**
 * Sanitize and validate file uploads
 * @param {Object} options - File validation options
 */
export const validateFile = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = false,
  } = options;

  return (req, res, next) => {
    if (!req.file && !required) {
      return next();
    }

    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'File upload is required',
        },
      });
    }

    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
          },
        });
      }

      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          },
        });
      }
    }

    next();
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} field - Field name to validate
 */
export const validateObjectId = (field = 'id') => {
  return (req, res, next) => {
    const id = req.params[field] || req.body[field];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ID_REQUIRED',
          message: `${field} is required`,
        },
      });
    }

    // Basic ObjectId validation (24 character hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: `Invalid ${field} format`,
        },
      });
    }

    next();
  };
};

/**
 * Rate limiting validation helper
 * @param {number} max - Maximum requests
 * @param {number} windowMs - Window in milliseconds
 */
export const validateRateLimit = (max, windowMs) => {
  return (req, res, next) => {
    // This would integrate with your rate limiting middleware
    // For now, just pass through
    next();
  };
};
