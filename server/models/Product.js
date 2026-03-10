import mongoose from 'mongoose';
import apiCache from '../utils/cache.js';

const reviewSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    // Required fields
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      default: 'SINGGLEBEE',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'],
        message: 'Invalid category',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    
    // Optional fields
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: function(value) {
          return Number.isInteger(value);
        },
        message: 'Stock quantity must be an integer'
      }
    },
    // Stock tracking for enterprise features
    stockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Stock threshold cannot be negative'],
      description: 'Low stock alert threshold'
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
      description: 'Stock reserved in pending orders'
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    
    // Enhanced images array with structure
    images: [{
      url: {
        type: String,
        required: true,
        trim: true,
      },
      alt: {
        type: String,
        trim: true,
        default: '',
      },
      isPrimary: {
        type: Boolean,
        default: false,
      },
    }],
    
    // Legacy single image field for backward compatibility
    image: {
      type: String,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'out_of_stock'],
        message: 'Invalid status',
      },
      default: 'active',
    },
    bestseller: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: {
        values: ['Tamil', 'English', 'Bilingual'],
        message: 'Invalid language',
      },
      default: 'English',
    },
    pages: {
      type: Number,
      min: [1, 'Pages must be at least 1'],
    },
    format: {
      type: String,
      enum: ['Hardcover', 'Paperback', 'Digital', 'Box', 'Pack', 'Jar', 'Set'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviews: [reviewSchema],
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    
    // Admin-only fields
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Admin notes cannot exceed 500 characters'],
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

// Indexes for performance
productSchema.index({ category: 1, price: 1, status: 1 }); // Compound index for filtering
productSchema.index({ bestseller: 1 });
productSchema.index({ rating: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' }, { language_override: 'none' });
productSchema.index({ price: 1 });
productSchema.index({ isDeleted: 1 });

// Auto-generate SKU if not provided
productSchema.pre('save', async function (next) {
  // Sync name/title for backward compatibility
  if (this.name && !this.title) this.title = this.name;
  if (this.title && !this.name) this.name = this.title;

  // Auto-generate SKU if not provided
  if (!this.sku) {
    const prefix = this.category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.sku = `SB-${prefix}-${timestamp}${random}`;
  }

  // Auto-update status based on stock
  const availableStock = this.stockQuantity - this.reservedStock;
  if (availableStock <= 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  } else if (availableStock > 0 && this.status === 'out_of_stock') {
    this.status = 'active';
  }

  // Sync legacy image field with images array
  if (this.images && this.images.length > 0 && !this.image) {
    const primaryImage = this.images.find(img => img.isPrimary) || this.images[0];
    this.image = primaryImage.url;
  }

  next();
});

// Cache invalidation hooks
const invalidateCache = () => {
  apiCache.invalidateByPrefix('products:');
};

productSchema.post('save', invalidateCache);
productSchema.post('remove', invalidateCache);
productSchema.post('findOneAndUpdate', invalidateCache);
productSchema.post('findOneAndDelete', invalidateCache);

// Calculate discounted price
productSchema.virtual('discountedPrice').get(function () {
  if (this.discount > 0) {
    return Math.round(this.price * (1 - this.discount / 100));
  }
  return this.price;
});

// Virtual for 'image' (returns first in array)
productSchema.virtual('image').get(function () {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Virtual for 'stock' backward compatibility
productSchema
  .virtual('stock')
  .get(function () {
    return this.stockQuantity;
  })
  .set(function (v) {
    this.stockQuantity = v;
  });

// Legacy Aliases
productSchema
  .virtual('countInStock')
  .get(function () {
    return this.stockQuantity;
  })
  .set(function (v) {
    this.stockQuantity = v;
  });

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Soft delete method
productSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.status = 'disabled';
  await this.save();
};

// Static method to find active products
productSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false, status: { $ne: 'disabled' } });
};

// Virtual for available stock
productSchema.virtual('availableStock').get(function () {
  return this.stockQuantity - this.reservedStock;
});

// Virtual for low stock warning
productSchema.virtual('isLowStock').get(function () {
  return this.availableStock <= this.stockThreshold && this.availableStock > 0;
});

// Static method for atomic stock operations
productSchema.statics.atomicStockUpdate = async function(productId, quantity, operation = 'reserve') {
  const updateField = operation === 'reserve' ? 'reservedStock' : 'stockQuantity';
  const modifier = operation === 'reserve' ? quantity : -quantity;
  
  const product = await this.findByIdAndUpdate(
    productId,
    { 
      $inc: { [updateField]: modifier },
      $set: { updatedAt: new Date() }
    },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new Error('Product not found');
  }

  // Auto-update status
  const availableStock = product.stockQuantity - product.reservedStock;
  if (availableStock <= 0 && product.status === 'active') {
    product.status = 'out_of_stock';
    await product.save();
  } else if (availableStock > 0 && product.status === 'out_of_stock') {
    product.status = 'active';
    await product.save();
  }

  return product;
};

// Instance method for stock reservation
productSchema.methods.reserveStock = async function(quantity) {
  if (quantity > this.availableStock) {
    throw new Error('Insufficient stock available');
  }

  this.reservedStock += quantity;
  await this.save();
  return this;
};

// Instance method for stock release
productSchema.methods.releaseStock = async function(quantity) {
  if (quantity > this.reservedStock) {
    throw new Error('Cannot release more stock than reserved');
  }

  this.reservedStock -= quantity;
  await this.save();
  return this;
};

// Instance method for final stock deduction
productSchema.methods.deductStock = async function(quantity) {
  if (quantity > this.reservedStock) {
    throw new Error('Cannot deduct more stock than reserved');
  }

  this.reservedStock -= quantity;
  this.stockQuantity -= quantity;
  
  // Auto-update status
  const availableStock = this.stockQuantity - this.reservedStock;
  if (availableStock <= 0) {
    this.status = 'out_of_stock';
  }
  
  await this.save();
  return this;
};

const Product = mongoose.model('Product', productSchema);
export default Product;
