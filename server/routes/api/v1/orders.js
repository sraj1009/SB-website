import express from 'express';
import {
    createOrder,
    getMyOrders,
    getOrder,
    cancelOrder
} from '../../../controllers/orderController.js';
import { authenticate } from '../../../middleware/auth.js';
import validate from '../../../middleware/validate.js';
import {
    createOrderSchema,
    cancelOrderSchema,
    orderQuerySchema
} from '../../../validators/orderValidators.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', validate(createOrderSchema), createOrder);

/**
 * @route   GET /api/v1/orders
 * @desc    Get current user's orders
 * @access  Private
 */
router.get('/', validate(orderQuerySchema, 'query'), getMyOrders);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order by ID (own orders only)
 * @access  Private
 */
router.get('/:id', getOrder);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private (own orders only)
 */
router.post('/:id/cancel', validate(cancelOrderSchema), cancelOrder);

export default router;
