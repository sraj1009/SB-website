import express from 'express';
import { setup2FA, verify2FA, disable2FA, verify2FALogin } from '../../controllers/twoFactorController.js';
import { authenticate } from '../../../middleware/auth.js';
import { validateRequest } from '../../../middleware/zodValidate.js';
import { twoFactorSetupSchema, twoFactorVerifySchema, twoFactorDisableSchema, twoFactorLoginSchema } from '../../../schemas/authSchemas.js';

const router = express.Router();

// 2FA Setup (Admin only)
router.post(
  '/setup',
  authenticate,
  validateRequest(twoFactorSetupSchema),
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can setup 2FA',
        },
      });
    }
    next();
  },
  setup2FA
);

// 2FA Verification (Admin only)
router.post(
  '/verify',
  authenticate,
  validateRequest(twoFactorVerifySchema),
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can verify 2FA',
        },
      });
    }
    next();
  },
  verify2FA
);

// 2FA Disable (Admin only)
router.post(
  '/disable',
  authenticate,
  validateRequest(twoFactorDisableSchema),
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can disable 2FA',
        },
      });
    }
    next();
  },
  disable2FA
);

// 2FA Login Verification (Public - used after initial auth)
router.post(
  '/verify-login',
  validateRequest(twoFactorLoginSchema),
  verify2FALogin
);

export default router;
