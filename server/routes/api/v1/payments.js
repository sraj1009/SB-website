import express from 'express';
import {
    createPaymentSession,
    handleWebhook,
    getPaymentStatus,
    markProofUploaded
} from '../../../controllers/paymentController.js';
import { authenticate } from '../../../middleware/auth.js';
import { paymentLimiter } from '../../../middleware/rateLimiter.js';
import { uploadCloudinary } from '../../../utils/cloudinary.js';

const router = express.Router();

/**
 * @route   POST /api/v1/payments/create-session
 * @desc    Create payment session for an order
 * @access  Private
 */
router.post('/create-session', authenticate, paymentLimiter, createPaymentSession);

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    Handle Cashfree payment webhook
 * @access  Public (verified by signature)
 */
router.post('/webhook', handleWebhook);

/**
 * @route   GET /api/v1/payments/status/:orderId
 * @desc    Get payment status for an order
 * @access  Private
 */
router.get('/status/:orderId', authenticate, getPaymentStatus);

/**
 * @route   POST /api/v1/payments/upload-proof
 * @desc    Mark that payment proof has been uploaded (for UPI manual)
 * @access  Private
 */
router.post('/upload-proof', authenticate, uploadCloudinary.single('proof'), markProofUploaded);

export default router;
