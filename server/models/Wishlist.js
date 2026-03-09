import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast user lookup
// wishlistSchema.index({ user: 1 }, { unique: true }); // Already defined in schema path

// Add product to wishlist
wishlistSchema.methods.addProduct = async function (productId) {
  const exists = this.items.some((item) => item.product.toString() === productId.toString());

  if (!exists) {
    this.items.push({ product: productId });
    await this.save();
  }

  return this;
};

// Remove product from wishlist
wishlistSchema.methods.removeProduct = async function (productId) {
  this.items = this.items.filter((item) => item.product.toString() !== productId.toString());
  await this.save();
  return this;
};

// Check if product is in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.items.some((item) => item.product.toString() === productId.toString());
};

// Static: Get or create wishlist for user
wishlistSchema.statics.getOrCreate = async function (userId) {
  let wishlist = await this.findOne({ user: userId });

  if (!wishlist) {
    wishlist = await this.create({ user: userId, items: [] });
  }

  return wishlist;
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
