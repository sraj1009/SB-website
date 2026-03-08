import express from 'express';
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    checkWishlist
} from '../../../controllers/wishlistController.js';
import { authenticate } from '../../../middleware/auth.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/', getWishlist);

/**
 * @route   POST /api/v1/wishlist/:productId
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/:productId', addToWishlist);

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/:productId', removeFromWishlist);

/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear entire wishlist
 * @access  Private
 */
router.delete('/', clearWishlist);

/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in wishlist
 * @access  Private
 */
router.get('/check/:productId', checkWishlist);

export default router;
