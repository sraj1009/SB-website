import express from 'express';
import { authenticate } from '../../../middleware/auth.js';
import isAdmin from '../../../middleware/admin.js';
import validate from '../../../middleware/validate.js';

// User management
import {
  getAllUsers,
  getUser,
  updateUserStatus,
  getDashboardStats,
} from '../../../controllers/userController.js';

// Product management
import { getAllProductsAdmin } from '../../../controllers/productController.js';

// Order management
import {
  getAllOrders,
  getOrderAdmin,
  updateOrderStatus,
  markPaymentComplete,
} from '../../../controllers/orderController.js';

// Review moderation
import { getAllReviews, moderateReview } from '../../../controllers/reviewController.js';

// Audit logs
import AuditLog from '../../../models/AuditLog.js';

import { updateOrderStatusSchema, markPaymentSchema } from '../../../validators/orderValidators.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(isAdmin);

// ============ DASHBOARD ============

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', getDashboardStats);

// ============ USER MANAGEMENT ============

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get single user
 * @access  Admin
 */
router.get('/users/:id', getUser);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Update user status (ban/unban/suspend)
 * @access  Admin
 */
router.patch('/users/:id/status', updateUserStatus);

// ============ PRODUCT MANAGEMENT ============

import multer from 'multer';
import { processAndUploadImage } from '../../../utils/imageProcessor.js';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   POST /api/v1/admin/upload-image
 * @desc    Upload product image to Cloudinary (Optimized with Sharp)
 * @access  Admin
 */
router.post('/upload-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No image uploaded' } });
    }

    const { url, thumbnailUrl } = await processAndUploadImage(req.file.buffer, req.file.originalname);

    res.json({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: { url, thumbnailUrl },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/admin/products
 * @desc    Get all products (including deleted)
 * @access  Admin
 */
router.get('/products', getAllProductsAdmin);

// ============ ORDER MANAGEMENT ============

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders
 * @access  Admin
 */
router.get('/orders', getAllOrders);

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Get single order
 * @access  Admin
 */
router.get('/orders/:id', getOrderAdmin);

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);

/**
 * @route   PATCH /api/v1/admin/orders/:id/payment
 * @desc    Mark payment as complete
 * @access  Admin
 */
router.patch('/orders/:id/payment', validate(markPaymentSchema), markPaymentComplete);

// ============ REVIEW MODERATION ============

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews for moderation
 * @access  Admin
 */
router.get('/reviews', getAllReviews);

/**
 * @route   PATCH /api/v1/admin/reviews/:reviewId/approve
 * @desc    Approve or reject a review
 * @access  Admin
 */
router.patch('/reviews/:reviewId/approve', moderateReview);

// ============ AUDIT LOGS ============

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get admin audit logs
 * @access  Admin
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, actorId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (action) filter.action = action;
    if (actorId) filter.actor = actorId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('actor', 'fullName email')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/audit-logs/security
 * @desc    Get security-related audit logs
 * @access  Admin
 */
router.get('/audit-logs/security', async (req, res, next) => {
  try {
    const logs = await AuditLog.getSecurityLogs(100);
    res.json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
