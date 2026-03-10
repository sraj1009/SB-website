import mongoose from 'mongoose';
import Order from '../models/Order.js';
import PaymentSession from '../models/PaymentSession.js';
import cashfreeService from '../services/cashfreeService.js';
import logger from '../utils/logger.js';
import { paymentsCounter } from '../utils/metrics.js';

/**
 * @desc    Create payment session for an order
 * @route   POST /api/v1/payments/create-session
 * @access  Private
 */
export const createPaymentSession = async (req, res, next) => {
  try {
    const { items, shippingAddress, tax, shippingCost } = req.body;

    if (!items || !shippingAddress) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Items and shipping address are required',
        },
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = subtotal + (tax || 0) + (shippingCost || 0);

    // 1. Release any globally expired locks before we proceed
    await releaseExpiredLocks();

    // 2. Lock stock atomicity check
    const Product = mongoose.model('Product');
    for (const item of items) {
      const prod = await Product.findById(item.product);
      if (!prod)
        return res
          .status(404)
          .json({ success: false, error: { message: `Product ${item.product} not found` } });
      if (prod.stockQuantity < item.quantity) {
        return res
          .status(400)
          .json({
            success: false,
            error: {
              message: `Insufficient stock for ${prod.title}. Only ${prod.stockQuantity} left.`,
            },
          });
      }
    }

    // Decrement stock to soft-lock it
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: -item.quantity },
      });
    }

    // Create temporary PaymentSession
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes soft lock

    const paymentSessionDoc = await PaymentSession.create({
      sessionId,
      user: req.user._id,
      items,
      shippingAddress,
      pricing: {
        subtotal,
        shippingFee: shippingCost || 0,
        tax: tax || 0,
        totalAmount,
      },
      gateway: cashfreeService.isConfigured() ? 'cashfree' : 'upi_manual',
      expiresAt,
    });

    // Check if Cashfree is configured
    if (!cashfreeService.isConfigured()) {
      return res.json({
        success: true,
        message: 'Use manual UPI payment',
        data: {
          paymentMethod: 'upi_manual',
          paymentSessionId: sessionId,
          upiId: process.env.UPI_ID || 'singglebee.rsventures@okhdfcbank',
          amount: totalAmount,
        },
      });
    }

    // Create Cashfree payment session
    const cfSession = await cashfreeService.createPaymentSession(
      {
        orderId: sessionId,
        pricing: { total: totalAmount },
      },
      {
        id: req.user._id.toString(),
        fullName: shippingAddress.fullName,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
      }
    );

    res.json({
      success: true,
      message: 'Payment session created',
      data: {
        paymentMethod: 'cashfree',
        paymentSessionId: cfSession.paymentSessionId,
        cfOrderId: cfSession.cfOrderId,
        sessionId: sessionId,
        amount: totalAmount,
        environment: cfSession.environment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Cashfree webhook
 * @route   POST /api/v1/payments/webhook
 * @access  Public (verified by signature)
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    // Verify signature when Cashfree is configured (REQUIRED for security)
    if (cashfreeService.isConfigured()) {
      if (!signature || !timestamp) {
        logger.warn('Webhook missing signature or timestamp');
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_SIGNATURE',
            message: 'Webhook signature and timestamp are required',
          },
        });
      }
      const rawPayload = req.rawBody || Buffer.from(JSON.stringify(payload));
      const isValid = cashfreeService.verifyWebhookSignature(rawPayload, signature, timestamp);

      if (!isValid) {
        logger.warn('Invalid webhook signature received');
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid webhook signature',
          },
        });
      }
    }

    const { data } = payload;
    const eventType = payload.type;

    logger.info(
      `Received Cashfree webhook: ${eventType} for session/order ${data?.order?.order_id}`
    );

    if (!data?.order?.order_id) {
      return res.status(200).json({ success: true, message: 'No order data in webhook' });
    }

    const sessionId = data.order.order_id;

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT_SUCCESS': {
        const session = await PaymentSession.findOne({ sessionId });
        if (session && !session.orderCreated) {
          let dbSession = null;
          try {
            dbSession = await mongoose.startSession();
            await dbSession.withTransaction(async () => {
              // Create the final order from session data
              const orderData = {
                user: session.user,
                items: session.items.map((item) => ({
                  product: item.product,
                  title: item.name, // Mapping from session.name to order.title
                  price: item.price,
                  quantity: item.quantity,
                  image: item.image,
                })),
                shippingAddress: {
                  fullName: session.shippingAddress.fullName,
                  phone: session.shippingAddress.phone,
                  email: session.shippingAddress.email,
                  street: session.shippingAddress.line1,
                  landmark: session.shippingAddress.line2,
                  city: session.shippingAddress.city,
                  state: session.shippingAddress.state,
                  zipCode: session.shippingAddress.postalCode,
                  country: session.shippingAddress.country,
                },
                pricing: {
                  subtotal: session.pricing.subtotal,
                  shippingFee: session.pricing.shippingFee,
                  discount: 0,
                  total: session.pricing.totalAmount,
                },
                payment: {
                  method: 'cashfree',
                  status: 'success',
                  paidAt: new Date(),
                  transactionId: data.payment?.cf_payment_id?.toString(),
                  cashfreeOrderId: data.payment?.cf_order_id?.toString(),
                  cashfreePaymentSessionId: data.payment?.payment_session_id,
                },
                status: 'paid',
              };

              const order = new Order(orderData);
              await order.save({ session: dbSession });

              // Update session
              session.orderCreated = true;
              session.status = 'completed';
              await session.save({ session: dbSession });

              logger.info(
                `Order ${order.orderId} created via Cashfree webhook for session ${sessionId}`
              );

              // Increment Prometheus counter
              paymentsCounter.inc({ gateway: 'cashfree', status: 'success' });
            });
            await dbSession.endSession();
          } catch (error) {
            logger.error(`Failed to create order from Cashfree webhook: ${error.message}`);
            if (error.message.includes('stock')) {
              session.status = 'failed';
              await session.save();
            }
            if (dbSession) await dbSession.endSession().catch(() => { });
            return res.status(500).json({
              success: false,
              error: {
                code: 'WEBHOOK_PROCESSING_FAILED',
                message: 'Order creation failed, will retry',
              },
            });
          }
        }
        break;
      }

      case 'PAYMENT_FAILED': {
        const session = await PaymentSession.findOne({ sessionId });
        if (session && session.status === 'pending') {
          session.status = 'failed';
          await session.save();

          // Release stock lock
          const Product = mongoose.model('Product');
          for (const item of session.items) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stockQuantity: item.quantity },
            });
          }

          logger.info(`Session ${sessionId} marked as payment failed via webhook, stock restored`);

          // Increment Prometheus counter
          paymentsCounter.inc({ gateway: 'cashfree', status: 'failed' });
        }
        break;
      }

      case 'PAYMENT_USER_DROPPED':
      case 'ORDER_CANCELLED':
      case 'ORDER_CANCELLED_WEBHOOK': {
        const session = await PaymentSession.findOne({ sessionId });
        if (session && session.status === 'pending' && !session.orderCreated) {
          session.status = 'failed';
          await session.save();

          // Release stock lock atomically
          const Product = mongoose.model('Product');
          for (const item of session.items) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stockQuantity: item.quantity },
            });
          }

          logger.info(`Session ${sessionId} marked as cancelled/dropped via webhook, stock restored`);
          paymentsCounter.inc({ gateway: 'cashfree', status: 'cancelled' });
        }
        break;
      }

      default:
        logger.debug(`Unhandled webhook event: ${eventType}`);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    // Return 500 so Cashfree retries on transient failures
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Error processing webhook',
      },
    });
  }
};

/**
 * @desc    Get payment status for an order
 * @route   GET /api/v1/payments/status/:orderId
 * @access  Private
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params; // This could be orderId or sessionId

    // 1. Try finding as a completed Order
    let order = await Order.findOne({
      $or: [{ orderId }, { 'payment.cashfreeOrderId': orderId }],
      user: req.user._id,
    });

    if (order) {
      return res.json({
        success: true,
        data: {
          type: 'order',
          orderId: order.orderId,
          orderStatus: order.status,
          paymentStatus: order.payment.status,
          paymentMethod: order.payment.method,
          total: order.pricing.total,
          paidAt: order.payment.paidAt,
        },
      });
    }

    // 2. Try finding as a PaymentSession
    const session = await PaymentSession.findOne({
      sessionId: orderId,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Payment session or order not found',
        },
      });
    }

    // 3. If session exists but order doesn't, check gateway status
    let gatewayStatus = null;
    if (session.gateway === 'cashfree' && cashfreeService.isConfigured()) {
      try {
        gatewayStatus = await cashfreeService.getPaymentStatus(orderId);
        // If paid but webhook missed, sync might happen here or next poll
      } catch (err) {
        logger.debug(`Status check failure: ${err.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        type: 'session',
        sessionId: session.sessionId,
        status: session.status,
        orderCreated: session.orderCreated,
        gateway: session.gateway,
        amount: session.pricing.totalAmount,
        gatewayStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark UPI manual payment as proof uploaded
 * @route   POST /api/v1/payments/upload-proof
 * @access  Private
 */
export const markProofUploaded = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      orderId,
      user: req.user._id,
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

    order.payment.proofUploaded = true;

    if (req.file && req.file.path) {
      order.payment.proofUrl = req.file.path;
    }

    await order.save();

    logger.info(`Payment proof uploaded for order ${orderId}`);

    res.json({
      success: true,
      message: 'Payment proof noted. Your order will be verified shortly.',
      data: {
        orderId: order.orderId,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release expired soft locks
 * @access  Internal Helper
 */
const releaseExpiredLocks = async () => {
  try {
    const expiredSessions = await PaymentSession.find({
      status: 'pending',
      expiresAt: { $lt: new Date() },
    });

    if (expiredSessions.length === 0) return;

    const Product = mongoose.model('Product');
    for (const session of expiredSessions) {
      session.status = 'expired';
      await session.save();

      for (const item of session.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.quantity },
        });
      }
      logger.info(`Released expired stock locks for session ${session.sessionId}`);
    }
  } catch (err) {
    logger.error(`Error releasing expired locks: ${err.message}`);
  }
};
