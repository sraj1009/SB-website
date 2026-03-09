import Review from '../models/Review.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get reviews for a product
 * @route   GET /api/v1/products/:productId/reviews
 * @access  Public
 */
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const filter = {
      product: productId,
      isApproved: true,
      isDeleted: false,
    };

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'fullName')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);

    // Calculate rating distribution
    const ratingStats = await Review.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      const found = ratingStats.find((s) => s._id === i);
      ratingDistribution[i] = found ? found.count : 0;
    }

    res.json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          ...r,
          userName: r.user?.fullName || 'Anonymous',
        })),
        ratingDistribution,
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
 * @desc    Create review for a product
 * @route   POST /api/v1/products/:productId/reviews
 * @access  Private
 */
export const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, images } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
      isDeleted: false,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_REVIEWED',
          message: 'You have already reviewed this product',
        },
      });
    }

    // Check for verified purchase
    const order = await Review.verifyPurchase(req.user._id, productId);

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      order: order?._id,
      rating,
      title,
      comment,
      images: images || [],
      isVerifiedPurchase: !!order,
    });

    logger.info(`Review created for product ${productId} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review: {
          id: review._id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          isVerifiedPurchase: review.isVerifiedPurchase,
          createdAt: review.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update own review
 * @route   PUT /api/v1/reviews/:reviewId
 * @access  Private
 */
export const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;

    const review = await Review.findOne({
      _id: reviewId,
      user: req.user._id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (images) review.images = images;

    await review.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete own review
 * @route   DELETE /api/v1/reviews/:reviewId
 * @access  Private
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOne({
      _id: reviewId,
      user: req.user._id,
      isDeleted: false,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    review.isDeleted = true;
    await review.save();

    // Update product rating
    await Review.updateProductRating(review.product);

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vote review as helpful/not helpful
 * @route   POST /api/v1/reviews/:reviewId/vote
 * @access  Private
 */
export const voteReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { isHelpful } = req.body;

    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VOTE',
          message: 'isHelpful must be true or false',
        },
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      isDeleted: false,
      isApproved: true,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    // Can't vote on own review
    if (review.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_VOTE_OWN',
          message: 'You cannot vote on your own review',
        },
      });
    }

    await review.vote(req.user._id, isHelpful);

    res.json({
      success: true,
      message: isHelpful ? 'Marked as helpful' : 'Vote recorded',
      data: {
        helpfulCount: review.helpfulCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's reviews
 * @route   GET /api/v1/reviews/my
 * @access  Private
 */
export const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      user: req.user._id,
      isDeleted: false,
    })
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// ========== ADMIN METHODS ==========

/**
 * @desc    Get all reviews (admin)
 * @route   GET /api/v1/admin/reviews
 * @access  Admin
 */
export const getAllReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isApproved, rating } = req.query;

    const filter = { isDeleted: false };
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    if (rating) filter.rating = Number(rating);

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'fullName email')
        .populate('product', 'title sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
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
 * @desc    Approve/reject review (admin)
 * @route   PATCH /api/v1/admin/reviews/:reviewId/approve
 * @access  Admin
 */
export const moderateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { isApproved, adminResponse } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    review.isApproved = isApproved;

    if (adminResponse) {
      review.adminResponse = {
        message: adminResponse,
        respondedAt: new Date(),
      };
    }

    await review.save();

    logger.info(
      `Review ${reviewId} ${isApproved ? 'approved' : 'rejected'} by admin ${req.user.email}`
    );

    res.json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'rejected'}`,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};
