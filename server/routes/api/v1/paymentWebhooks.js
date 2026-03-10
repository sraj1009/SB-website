import express from 'express';
import { cashfreeWebhook, verifyManualPayment, getPaymentStatus } from '../../controllers/paymentWebhookController.js';
import { authenticate } from '../../../middleware/auth.js';
import { adminOnly } from '../../../middleware/admin.js';
import { validateRequest } from '../../../middleware/zodValidate.js';
import { z } from 'zod';

const router = express.Router();

// Webhook schemas
const manualPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  amount: z.number().positive('Amount must be positive'),
  proofUrl: z.string().url('Valid proof URL is required'),
});

/**
 * @swagger
 * /api/v1/payments/webhook/cashfree:
 *   post:
 *     summary: Cashfree payment webhook
 *     tags: [Payments]
 *     security: [] (Public endpoint)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook/cashfree', cashfreeWebhook);

/**
 * @swagger
 * /api/v1/payments/verify-manual:
 *   post:
 *     summary: Verify manual payment (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             orderId: {type: string}
 *             transactionId: {type: string}
 *             amount: {type: number}
 *             proofUrl: {type: string}
 *     responses:
 *       200:
 *         description: Payment verified
 */
router.post('/verify-manual', authenticate, adminOnly, validateRequest(manualPaymentSchema), verifyManualPayment);

/**
 * @swagger
 * /api/v1/payments/status/{orderId}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 */
router.get('/status/:orderId', authenticate, getPaymentStatus);

export default router;
