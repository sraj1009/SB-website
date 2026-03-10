import mongoose from 'mongoose';
import './Counter.js'; // Ensure Counter is registered

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    image: String,
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    street: { type: String, required: true },
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['cashfree', 'upi_manual', 'cod'],
      default: 'upi_manual',
    },
    transactionId: String,
    cashfreeOrderId: String,
    cashfreePaymentSessionId: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    paidAt: Date,
    failureReason: String,
    refundAmount: Number,
    refundedAt: Date,
    proofUploaded: {
      type: Boolean,
      default: false,
    },
    proofUrl: String,
    // Webhook verification
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    webhookSignature: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, 'Order must have at least one item'],
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        message: 'Invalid order status',
      },
      default: 'pending',
    },
    // Guest checkout support
    guestUser: {
      email: String,
      phone: String,
      firstName: String,
      lastName: String,
    },
    // Enterprise fields
    affiliateId: String,
    referralCode: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web',
    },
    // Shipping and tracking
    estimatedDelivery: Date,
    actualDelivery: Date,
    carrier: String,
    trackingUrl: String,
    // Audit fields
    ipAddress: String,
    userAgent: String,
    // Priority support
    priority: {
      type: String,
      enum: ['normal', 'express', 'priority'],
      default: 'normal',
    },
    payment: paymentSchema,
    paymentStatus: {
      // Alias for payment.status
      type: String,
      default: 'pending',
    },
    deliveryStatus: {
      // Alias for status
      type: String,
      default: 'pending',
    },
    totalAmount: {
      // Alias for pricing.total
      type: Number,
    },
    trackingNumber: String,
    couponCode: String,
    notes: String,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order ID and sync aliases before validation
orderSchema.pre('validate', async function (next) {
  // Sync aliases
  if (this.payment && this.payment.status) this.paymentStatus = this.payment.status;
  if (this.status) this.deliveryStatus = this.status;
  if (this.pricing && this.pricing.total) this.totalAmount = this.pricing.total;

  if (!this.orderId) {
    try {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

      // Use atomic findOneAndUpdate for sequence
      const counterId = `order_${dateStr}`;
      const counter = await mongoose
        .model('Counter')
        .findByIdAndUpdate(
          counterId,
          { $inc: { seq: 1 } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

      const sequence = String(counter.seq).padStart(5, '0');
      this.orderId = `SB-${dateStr}-${sequence}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to cancel order and restore stock
orderSchema.methods.cancelAndRestoreStock = async function (reason = '') {
  if (this.status === 'cancelled') {
    throw new Error('Order is already cancelled');
  }

  if (['shipped', 'delivered'].includes(this.status)) {
    throw new Error('Cannot cancel shipped or delivered orders');
  }

  const Product = mongoose.model('Product');

  // Restore stock for all items using atomic operations
  for (const item of this.items) {
    await Product.atomicStockUpdate(item.product, item.quantity, 'release');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;

  await this.save();
  return this;
};

// Order status workflow methods
orderSchema.methods.updateStatus = async function(newStatus, reason = '') {
  const validTransitions = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;

  // Handle status-specific logic
  switch (newStatus) {
    case 'paid':
      this.payment.status = 'success';
      this.payment.paidAt = new Date();
      // Deduct stock from inventory
      const Product = mongoose.model('Product');
      for (const item of this.items) {
        await Product.atomicStockUpdate(item.product, item.quantity, 'deduct');
      }
      break;
    case 'shipped':
      this.trackingNumber = this.trackingNumber || `TRACK-${Date.now()}`;
      this.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      break;
    case 'delivered':
      this.actualDelivery = new Date();
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      this.cancelReason = reason;
      break;
  }

  await this.save();
  return this;
};

// Payment verification method
orderSchema.methods.verifyWebhook = function(signature, payload) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('base64');

  const isValid = signature === expectedSignature;
  if (isValid) {
    this.payment.webhookVerified = true;
    this.payment.webhookSignature = signature;
  }

  return isValid;
};

// Static method for order analytics
orderSchema.statics.getOrderStats = async function(filter = {}) {
  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' }
      }
    }
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      totalRevenue: stat.totalRevenue,
      averageOrderValue: stat.averageOrderValue
    };
    return acc;
  }, {});
};

// Mark as paid
orderSchema.methods.markAsPaid = async function (transactionId = null) {
  this.status = 'paid';
  this.payment.status = 'success';
  this.payment.paidAt = new Date();
  if (transactionId) {
    this.payment.transactionId = transactionId;
  }
  await this.save();
  return this;
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
