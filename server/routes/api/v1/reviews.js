import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  voteReview,
  getMyReviews,
} from '../../../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../../../middleware/auth.js';
import validate from '../../../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// Review validation schema
const createReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().trim().max(100).optional(),
  comment: Joi.string().trim().max(1000).optional(),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).optional(),
  title: Joi.string().trim().max(100).optional().allow(''),
  comment: Joi.string().trim().max(1000).optional().allow(''),
  images: Joi.array().items(Joi.string().uri()).max(5).optional(),
}).min(1);

// ============ PRODUCT REVIEW ROUTES ============

/**
 * @route   GET /api/v1/products/:productId/reviews
 * @desc    Get reviews for a product
 * @access  Public
 */
router.get('/products/:productId/reviews', getProductReviews);

/**
 * @route   POST /api/v1/products/:productId/reviews
 * @desc    Create review for a product
 * @access  Private
 */
router.post(
  '/products/:productId/reviews',
  authenticate,
  validate(createReviewSchema),
  createReview
);

// ============ USER REVIEW ROUTES ============

/**
 * @route   GET /api/v1/reviews/my
 * @desc    Get current user's reviews
 * @access  Private
 */
router.get('/my', authenticate, getMyReviews);

/**
 * @route   PUT /api/v1/reviews/:reviewId
 * @desc    Update own review
 * @access  Private
 */
router.put('/:reviewId', authenticate, validate(updateReviewSchema), updateReview);

/**
 * @route   DELETE /api/v1/reviews/:reviewId
 * @desc    Delete own review
 * @access  Private
 */
router.delete('/:reviewId', authenticate, deleteReview);

/**
 * @route   POST /api/v1/reviews/:reviewId/vote
 * @desc    Vote review as helpful/not helpful
 * @access  Private
 */
router.post('/:reviewId/vote', authenticate, voteReview);

export default router;
