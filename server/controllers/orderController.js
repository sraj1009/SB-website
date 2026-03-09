import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import logger from '../utils/logger.js';
import { runInTransaction } from '../utils/dbUtils.js';
import { ordersCreatedCounter } from '../utils/metrics.js';
import { notificationService } from '../utils/notification.js';

/**
 * @desc    Create new order
 * @route   POST /api/v1/orders
 * @access  Private
 */
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = 'upi_manual', notes, couponCode } = req.body;

    const order = await runInTransaction(async (session) => {
      // Build order items with product details
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);

        if (!product) {
          throw {
            statusCode: 404,
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${item.productId} not found`,
          };
        }

        if (product.isDeleted || product.status === 'disabled') {
          throw {
            statusCode: 400,
            code: 'PRODUCT_UNAVAILABLE',
            message: `${product.title} is no longer available`,
          };
        }

        if (product.stockQuantity < item.quantity) {
          throw {
            statusCode: 400,
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${product.title}. Available: ${product.stockQuantity}`,
          };
        }

        // Calculate price (with discount if applicable)
        const unitPrice =
          product.discount > 0
            ? Math.round(product.price * (1 - product.discount / 100))
            : product.price;

        orderItems.push({
          product: product._id,
          title: product.title,
          price: unitPrice,
          quantity: item.quantity,
          image: product.images?.[0] || null,
        });

        subtotal += unitPrice * item.quantity;

        // Deduct stock using the proper instance method
        await product.adjustStock(-item.quantity);
        await product.save({ session });
      }

      // Calculate coupon discount
      let discount = 0;
      let coupon = null;
      if (couponCode) {
        coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          expiryDate: { $gt: new Date() },
        }).session(session);

        if (coupon) {
          if (subtotal >= coupon.minOrderAmount) {
            if (coupon.discountType === 'percentage') {
              discount = Math.round((subtotal * coupon.discountAmount) / 100);
              if (coupon.maxDiscountAmount) {
                discount = Math.min(discount, coupon.maxDiscountAmount);
              }
            } else {
              discount = coupon.discountAmount;
            }
            subtotal = Math.max(0, subtotal - discount);

            // Increment usage
            coupon.usedCount += 1;
            await coupon.save({ session });
          }
        }
      }

      // Calculate shipping (free above 1499)
      const shippingFee = subtotal >= 1499 ? 0 : 99;
      const total = subtotal + shippingFee;

      // Create order
      const newOrder = new Order({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        pricing: {
          subtotal,
          shippingFee,
          discount,
          total,
        },
        couponCode: coupon?.code,
        status: 'pending',
        payment: {
          method: paymentMethod,
          status: 'pending',
        },
        notes,
      });

      await newOrder.save({ session });
      return newOrder;
    });

    logger.info(`Order created: ${order.orderId} by user ${req.user.email}`);

    // Increment Prometheus counter
    ordersCreatedCounter.inc({ status: 'success' });

    // Send order confirmation email (if configured)
    try {
      const emailService = (await import('../services/emailService.js')).default;
      const toEmail = shippingAddress?.email;
      if (toEmail) {
        await emailService.sendOrderConfirmationEmail(toEmail, order.orderId, order.pricing.total);
      }
    } catch (emailErr) {
      logger.debug(`Order confirmation email skipped: ${emailErr.message}`);
    }

    // Send WhatsApp/SMS Notification
    notificationService.sendOrderConfirmation(order).catch(err =>
      logger.debug(`Order notification skipped: ${err.message}`)
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: {
          orderId: order.orderId,
          id: order._id,
          items: order.items,
          shippingAddress: order.shippingAddress,
          pricing: order.pricing,
          status: order.status,
          payment: order.payment,
          createdAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/v1/orders
 * @access  Private
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user._id };
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
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
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private (own orders only)
 */
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('items.product', 'title images');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order
 * @route   POST /api/v1/orders/:id/cancel
 * @access  Private (own orders only)
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
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

    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: `Cannot cancel order with status: ${order.status}`,
        },
      });
    }

    await order.cancelAndRestoreStock(reason);

    logger.info(`Order cancelled: ${order.orderId} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// ========== ADMIN METHODS ==========

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/v1/admin/orders
 * @access  Admin
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'fullName email phone')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
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
};

/**
 * @desc    Get single order (admin)
 * @route   GET /api/v1/admin/orders/:id
 * @access  Admin
 */
export const getOrderAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullName email phone')
      .populate('items.product', 'title images sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status (admin)
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @access  Admin
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Handle status-specific logic
    if (status === 'cancelled' && order.status !== 'cancelled') {
      await order.cancelAndRestoreStock(notes || 'Cancelled by admin');
    } else {
      order.status = status;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (notes) order.notes = notes;

      // If marking as paid
      if (status === 'paid' && order.payment.status !== 'success') {
        order.payment.status = 'success';
        order.payment.paidAt = new Date();
      }

      await order.save();

      // Send shipping notification if status is shipped
      if (status === 'shipped') {
        notificationService.sendShippingUpdate(order).catch(err =>
          logger.debug(`Shipping notification skipped: ${err.message}`)
        );
      }
    }

    logger.info(`Order ${order.orderId} status updated to ${status} by admin`);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark order payment as complete (admin)
 * @route   PATCH /api/v1/admin/orders/:id/payment
 * @access  Admin
 */
export const markPaymentComplete = async (req, res, next) => {
  try {
    const { transactionId } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    await order.markAsPaid(transactionId);

    logger.info(`Order ${order.orderId} marked as paid by admin`);

    res.json({
      success: true,
      message: 'Payment marked as complete',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
