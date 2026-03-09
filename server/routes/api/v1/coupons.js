import express from 'express';
import { validateCoupon, getCoupons, createCoupon } from '../../controllers/couponController.js';
import { authenticate } from '../../middleware/auth.js';
import isAdmin from '../../middleware/admin.js';

const router = express.Router();

// Public/Authenticated routes
router.post('/validate', authenticate, validateCoupon);

// Admin only routes
router.get('/', authenticate, isAdmin, getCoupons);
router.post('/', authenticate, isAdmin, createCoupon);

export default router;
