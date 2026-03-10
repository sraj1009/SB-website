import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';
import { notificationService } from '../utils/notification.js';

/**
 * @desc    Handle Cashfree payment webhook
 * @route   POST /api/v1/payments/webhook/cashfree
 * @access  Public (webhook endpoint)
 */
export const cashfreeWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-cashfree-signature'];
    const timestamp = req.headers['x-cashfree-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_HEADERS',
          message: 'Missing required webhook headers',
        },
      });
    }

    // Verify webhook signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = generateSignature(payload, timestamp);
    
    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature received', {
        signature,
        expectedSignature,
        payload: JSON.stringify(req.body).substring(0, 100),
      });
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      });
    }

    const { type, data } = req.body;
    
    // Handle different webhook events
    switch (type) {
      case 'PAYMENT_SUCCESS':
        await handlePaymentSuccess(data);
        break;
      case 'PAYMENT_FAILED':
        await handlePaymentFailed(data);
        break;
      case 'PAYMENT_PENDING':
        await handlePaymentPending(data);
        break;
      case 'ORDER_PROCESSED':
        await handleOrderProcessed(data);
        break;
      default:
        logger.warn(`Unhandled webhook type: ${type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still return 200 to avoid retry loops
    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload, timestamp) {
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CASHFREE_SECRET_KEY not configured');
  }

  const data = payload + timestamp;
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('base64');
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data) {
  const { order_id, transaction_id, payment_method, amount } = data;
  
  const order = await Order.findOne({ 
    $or: [
      { orderId: order_id },
      { 'payment.cashfreeOrderId': order_id }
    ]
  });

  if (!order) {
    logger.warn(`Order not found for payment success: ${order_id}`);
    return;
  }

  // Verify webhook signature on order
  const isValid = order.verifyWebhook(
    req.headers['x-cashfree-signature'],
    req.body
  );

  if (!isValid) {
    logger.warn(`Webhook verification failed for order: ${order.orderId}`);
    return;
  }

  // Update order status
  await order.updateStatus('paid');
  
  // Update payment details
  order.payment.transactionId = transaction_id;
  order.payment.status = 'success';
  order.payment.paidAt = new Date();
  order.payment.method = payment_method;
  await order.save();

  logger.info(`Payment successful for order: ${order.orderId}`, {
    transactionId,
    amount,
  });

  // Send payment confirmation
  try {
    await notificationService.sendPaymentConfirmation(order);
  } catch (error) {
    logger.debug(`Payment confirmation notification failed: ${error.message}`);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data) {
  const { order_id, transaction_id, reason, amount } = data;
  
  const order = await Order.findOne({ 
    $or: [
      { orderId: order_id },
      { 'payment.cashfreeOrderId': order_id }
    ]
  });

  if (!order) {
    logger.warn(`Order not found for payment failed: ${order_id}`);
    return;
  }

  // Update payment status
  order.payment.status = 'failed';
  order.payment.failureReason = reason;
  order.payment.transactionId = transaction_id;
  await order.save();

  // Release reserved stock
  for (const item of order.items) {
    const Product = mongoose.model('Product');
    await Product.atomicStockUpdate(item.product, item.quantity, 'release');
  }

  logger.info(`Payment failed for order: ${order.orderId}`, {
    transactionId,
    reason,
    amount,
  });

  // Send payment failure notification
  try {
    await notificationService.sendPaymentFailure(order, reason);
  } catch (error) {
    logger.debug(`Payment failure notification failed: ${error.message}`);
  }
}

/**
 * Handle pending payment
 */
async function handlePaymentPending(data) {
  const { order_id, transaction_id } = data;
  
  const order = await Order.findOne({ 
    $or: [
      { orderId: order_id },
      { 'payment.cashfreeOrderId': order_id }
    ]
  });

  if (!order) {
    logger.warn(`Order not found for payment pending: ${order_id}`);
    return;
  }

  // Update payment status
  order.payment.status = 'processing';
  order.payment.transactionId = transaction_id;
  await order.save();

  logger.info(`Payment pending for order: ${order.orderId}`, {
    transactionId,
  });
}

/**
 * Handle order processed by Cashfree
 */
async function handleOrderProcessed(data) {
  const { order_id, status } = data;
  
  const order = await Order.findOne({ 
    $or: [
      { orderId: order_id },
      { 'payment.cashfreeOrderId': order_id }
    ]
  });

  if (!order) {
    logger.warn(`Order not found for processed: ${order_id}`);
    return;
  }

  logger.info(`Order processed: ${order.orderId}`, { status });
}

/**
 * @desc    Manual payment verification (for UPI/manual payments)
 * @route   POST /api/v1/payments/verify-manual
 * @access  Admin
 */
export const verifyManualPayment = async (req, res, next) => {
  try {
    const { orderId, transactionId, amount, proofUrl } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    if (order.payment.status === 'success') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PAID',
          message: 'Order is already paid',
        },
      });
    }

    // Update payment details
    order.payment.status = 'success';
    order.payment.paidAt = new Date();
    order.payment.transactionId = transactionId;
    order.payment.proofUploaded = true;
    order.payment.proofUrl = proofUrl;

    // Update order status
    await order.updateStatus('paid');

    logger.info(`Manual payment verified for order: ${order.orderId}`, {
      transactionId,
      amount,
      verifiedBy: req.user.email,
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment status
 * @route   GET /api/v1/payments/status/:orderId
 * @access  Private
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      $or: [
        { orderId },
        { _id: orderId }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Check if user owns this order
    if (req.user && order.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.payment.status,
        paymentMethod: order.payment.method,
        amount: order.pricing.total,
        paidAt: order.payment.paidAt,
        failureReason: order.payment.failureReason,
      },
    });
  } catch (error) {
    next(error);
  }
};
