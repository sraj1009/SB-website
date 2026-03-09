import logger from '../utils/logger.js';

/**
 * Admin middleware
 * Must be used AFTER authenticate middleware
 * Checks if authenticated user has admin role
 */
const isAdmin = (req, res, next) => {
  // Ensure authenticate middleware was called first
  if (!req.user) {
    logger.warn('Admin middleware called without authentication');
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_AUTH',
        message: 'Authentication required',
      },
    });
  }

  // Check admin role
  if (req.user.role !== 'admin') {
    logger.warn(`Access denied for user ${req.user.email} - attempted admin route`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required. This incident has been logged.',
      },
    });
  }

  next();
};

export default isAdmin;
