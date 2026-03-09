import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
} from '../../../controllers/orderController.js';
import { authenticate } from '../../../middleware/auth.js';
import validate from '../../../middleware/validate.js';
import {
  createOrderSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from '../../../validators/orderValidators.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, shippingAddress]
 *             properties:
 *               items: {type: array, items: {type: object}}
 *               shippingAddress: {type: object}
 *     responses:
 *       201:
 *         description: Order created
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.post('/', validate(createOrderSchema), createOrder);

router.get('/', validate(orderQuerySchema, 'query'), getMyOrders);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/:id', getOrder);

/**
 * @swagger
 * /api/v1/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Order cancelled
 */
router.post('/:id/cancel', validate(cancelOrderSchema), cancelOrder);

export default router;
