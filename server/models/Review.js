import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    images: {
        type: [String],
        default: [],
        validate: [arr => arr.length <= 5, 'Maximum 5 images per review']
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    helpfulCount: {
        type: Number,
        default: 0,
        min: 0
    },
    helpfulVotes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        isHelpful: Boolean
    }],
    isApproved: {
        type: Boolean,
        default: true // Auto-approve, set to false if moderation needed
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    adminResponse: {
        message: String,
        respondedAt: Date
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.__v;
            delete ret.isDeleted;
            delete ret.helpfulVotes;
            return ret;
        }
    }
});

// Indexes
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ product: 1, isApproved: 1, isDeleted: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Verify if user purchased the product
reviewSchema.statics.verifyPurchase = async function (userId, productId) {
    const Order = mongoose.model('Order');

    const order = await Order.findOne({
        user: userId,
        'items.product': productId,
        status: { $in: ['paid', 'shipped', 'delivered'] }
    });

    return order;
};

// Update product rating after review changes
reviewSchema.statics.updateProductRating = async function (productId) {
    const Product = mongoose.model('Product');

    const stats = await this.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                isApproved: true,
                isDeleted: false
            }
        },
        {
            $group: {
                _id: '$product',
                avgRating: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            rating: Math.round(stats[0].avgRating * 10) / 10, // Round to 1 decimal
            reviewCount: stats[0].count
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            rating: 0,
            reviewCount: 0
        });
    }
};

// Post-save: Update product rating
reviewSchema.post('save', async function () {
    await this.constructor.updateProductRating(this.product);
});

// Post-remove: Update product rating
reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
    await this.constructor.updateProductRating(this.product);
});

// Vote helpful/not helpful
reviewSchema.methods.vote = async function (userId, isHelpful) {
    const existingVote = this.helpfulVotes.find(v =>
        v.user.toString() === userId.toString()
    );

    if (existingVote) {
        if (existingVote.isHelpful === isHelpful) {
            // Remove vote if same
            this.helpfulVotes = this.helpfulVotes.filter(v =>
                v.user.toString() !== userId.toString()
            );
        } else {
            // Change vote
            existingVote.isHelpful = isHelpful;
        }
    } else {
        // Add new vote
        this.helpfulVotes.push({ user: userId, isHelpful });
    }

    // Recalculate helpful count
    this.helpfulCount = this.helpfulVotes.filter(v => v.isHelpful).length;

    await this.save();
    return this;
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;
