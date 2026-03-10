import express from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { adminOnly } from '../../../middleware/adminOnly.js';
import validate from '../../../middleware/validate.js';
import { upload } from '../../../controllers/uploadController.js';

// Admin controllers
import {
  getDashboardStats,
  getAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  verifyOrder,
} from '../../../controllers/adminController.js';

// Validation schemas
import {
  createProductSchema,
  updateProductSchema,
  verifyOrderSchema,
  statsQuerySchema,
  adminProductQuerySchema,
  adminOrderQuerySchema,
} from '../../../validators/adminValidators.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(adminOnly);

// ============ DASHBOARD ============

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/stats', validate(statsQuerySchema, 'query'), getDashboardStats);

// ============ PRODUCT MANAGEMENT ============

/**
 * @route   GET /api/v1/admin/products
 * @desc    Get all products for admin
 * @access  Admin
 */
router.get('/products', validate(adminProductQuerySchema, 'query'), getAdminProducts);

/**
 * @route   GET /api/v1/admin/products/:id
 * @desc    Get single product for admin
 * @access  Admin
 */
router.get('/products/:id', getAdminProduct);

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create new product
 * @access  Admin
 */
router.post('/products', upload.single('image'), validate(createProductSchema), createAdminProduct);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/products/:id', upload.single('image'), validate(updateProductSchema), updateAdminProduct);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete product (soft delete)
 * @access  Admin
 */
router.delete('/products/:id', deleteAdminProduct);

// ============ ORDER MANAGEMENT ============

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders for admin
 * @access  Admin
 */
router.get('/orders', validate(adminOrderQuerySchema, 'query'), getAdminOrders);

/**
 * @route   PUT /api/v1/admin/orders/:id/verify
 * @desc    Verify or reject order
 * @access  Admin
 */
router.put('/orders/:id/verify', validate(verifyOrderSchema), verifyOrder);

export default router;
