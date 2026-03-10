import { AppError } from '../utils/AppError.js';

/**
 * Admin-only middleware
 * Ensures the user has admin role before proceeding
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403, 'ADMIN_REQUIRED'));
  }

  next();
};

export default adminOnly;
