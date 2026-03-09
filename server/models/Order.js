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
    total: { type: Number, required: true },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['cashfree', 'upi_manual'],
      default: 'upi_manual',
    },
    transactionId: String,
    cashfreeOrderId: String,
    cashfreePaymentSessionId: String,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    paidAt: Date,
    proofUploaded: {
      type: Boolean,
      default: false,
    },
    proofUrl: String,
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
        values: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Invalid order status',
      },
      default: 'pending',
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

  // Restore stock for all items
  for (const item of this.items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stockQuantity += item.quantity;
      product.isOutOfStock = false;
      if (product.status === 'out_of_stock') {
        product.status = 'active';
      }
      await product.save();
    }
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;

  await this.save();
  return this;
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
