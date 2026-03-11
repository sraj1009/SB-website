import express from 'express';
import { deleteUserData, exportUserData, getDataActivities } from '../../../controllers/gdprController.js';
import { authenticate } from '../../../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Rate limiting for GDPR endpoints (more restrictive)
const gdprLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    error: {
      code: 'GDPR_RATE_LIMIT_EXCEEDED',
      message: 'Too many GDPR requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `gdpr_${req.user._id}` : req.ip;
  },
});

// Delete user data (Right to be Forgotten)
router.delete('/me', authenticate, gdprLimiter, deleteUserData);

// Export user data (Data Portability)
router.get('/me/export', authenticate, gdprLimiter, exportUserData);

// Get data processing activities
router.get('/me/data-activities', authenticate, gdprLimiter, getDataActivities);

export default router;
