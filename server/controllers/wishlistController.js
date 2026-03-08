import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get user's wishlist
 * @route   GET /api/v1/wishlist
 * @access  Private
 */
export const getWishlist = async (req, res, next) => {
    try {
        const wishlist = await Wishlist.getOrCreate(req.user._id);

        // Populate product details
        await wishlist.populate({
            path: 'items.product',
            select: 'title price discount images rating reviewCount status isOutOfStock stock'
        });

        // Filter out deleted/unavailable products
        const validItems = wishlist.items.filter(item =>
            item.product && !item.product.isDeleted && item.product.status !== 'disabled'
        );

        res.json({
            success: true,
            data: {
                wishlist: {
                    id: wishlist._id,
                    items: validItems,
                    count: validItems.length
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Add product to wishlist
 * @route   POST /api/v1/wishlist/:productId
 * @access  Private
 */
export const addToWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;

        // Verify product exists
        const product = await Product.findOne({
            _id: productId,
            isDeleted: { $ne: true },
            status: { $ne: 'disabled' }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: 'Product not found or unavailable'
                }
            });
        }

        const wishlist = await Wishlist.getOrCreate(req.user._id);

        if (wishlist.hasProduct(productId)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_IN_WISHLIST',
                    message: 'Product is already in your wishlist'
                }
            });
        }

        await wishlist.addProduct(productId);

        logger.debug(`Product ${productId} added to wishlist for user ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'Product added to wishlist',
            data: {
                productId,
                wishlistCount: wishlist.items.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/v1/wishlist/:productId
 * @access  Private
 */
export const removeFromWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist || !wishlist.hasProduct(productId)) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_IN_WISHLIST',
                    message: 'Product not in wishlist'
                }
            });
        }

        await wishlist.removeProduct(productId);

        res.json({
            success: true,
            message: 'Product removed from wishlist',
            data: {
                wishlistCount: wishlist.items.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Clear wishlist
 * @route   DELETE /api/v1/wishlist
 * @access  Private
 */
export const clearWishlist = async (req, res, next) => {
    try {
        await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { items: [] }
        );

        res.json({
            success: true,
            message: 'Wishlist cleared'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Check if product is in wishlist
 * @route   GET /api/v1/wishlist/check/:productId
 * @access  Private
 */
export const checkWishlist = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });
        const inWishlist = wishlist ? wishlist.hasProduct(productId) : false;

        res.json({
            success: true,
            data: {
                productId,
                inWishlist
            }
        });
    } catch (error) {
        next(error);
    }
};
