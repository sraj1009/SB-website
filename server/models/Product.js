import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    date: { type: Date, default: Date.now }
}, { _id: true });

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Name cannot exceed 200 characters']
    },
    title: { // Kept as alias for legacy support during migration
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    author: {
        type: String,
        default: 'SINGGLEBEE',
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    stock: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: ['Fiction', 'Self-Help', 'Technology', 'Sci-Fi', 'Business', 'Mystery',
                'Biography', 'Foods', 'Stationeries', 'Books', 'Poem Book', 'Story Book', 'All'],
            message: 'Invalid category'
        }
    },
    images: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'out_of_stock', 'disabled'],
            message: 'Invalid status'
        },
        default: 'active'
    },
    bestseller: {
        type: Boolean,
        default: false
    },
    isComingSoon: {
        type: Boolean,
        default: false
    },
    isOutOfStock: {
        type: Boolean,
        default: false
    },
    language: {
        type: String,
        trim: true
    },
    pages: {
        type: Number,
        min: [1, 'Pages must be at least 1']
    },
    format: {
        type: String,
        enum: ['Hardcover', 'Paperback', 'Kindle', 'Box', 'Pack', 'Jar', 'Set']
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },
    reviews: [reviewSchema],
    isDeleted: {
        type: Boolean,
        default: false,
        select: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.__v;
            delete ret.isDeleted;
            return ret;
        }
    }
});

// Indexes for performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ bestseller: 1 });
productSchema.index({ rating: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' }, { language_override: 'none' });
productSchema.index({ price: 1 });
productSchema.index({ isDeleted: 1 });

// Auto-generate SKU if not provided
productSchema.pre('save', async function (next) {
    // Sync name/title
    if (this.name && !this.title) this.title = this.name;
    if (this.title && !this.name) this.name = this.title;

    // Auto-generate SKU if not provided
    if (!this.sku) {
        const prefix = this.category.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        this.sku = `SB-${prefix}-${timestamp}${random}`;
    }

    // Auto-update isOutOfStock based on stock
    this.isOutOfStock = this.stock <= 0;
    if (this.isOutOfStock && this.status === 'active') {
        this.status = 'out_of_stock';
    }

    next();
});

// Calculate discounted price
productSchema.virtual('discountedPrice').get(function () {
    if (this.discount > 0) {
        return Math.round(this.price * (1 - this.discount / 100));
    }
    return this.price;
});

// Legacy Aliases
productSchema.virtual('stockQuantity').get(function () { return this.stock; }).set(function (v) { this.stock = v; });
productSchema.virtual('countInStock').get(function () { return this.stock; }).set(function (v) { this.stock = v; });

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

// Adjust stock
productSchema.methods.adjustStock = async function (quantity) {
    const newStock = this.stock + quantity;

    if (newStock < 0) {
        throw new Error('Insufficient stock');
    }

    this.stock = newStock;
    this.isOutOfStock = newStock <= 0;
    this.status = newStock <= 0 ? 'out_of_stock' : 'active';

    await this.save();
    return this;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
