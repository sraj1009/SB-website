// Review Service for SINGGLEBEE Frontend

import apiClient from './api-client';
import { ApiResponse, Review, CreateReviewRequest, UpdateReviewRequest } from '../types/api';
import { NotFoundError, ValidationError, ErrorHandler, createError } from '../utils/error-handler';

class ReviewService {
  private static instance: ReviewService;

  static getInstance(): ReviewService {
    if (!ReviewService.instance) {
      ReviewService.instance = new ReviewService();
    }
    return ReviewService.instance;
  }

  // Get reviews for a product
  async getReviews(
    productId: string,
    filters: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';
      rating?: number;
      verifiedOnly?: boolean;
    } = {}
  ): Promise<{
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<number, number>;
      verifiedPurchasePercentage: number;
    };
  }> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get(`/products/${productId}/reviews`, {
        params: this.buildReviewQueryParams(filters),
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch reviews',
          response.error?.code || 'REVIEWS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getReviews');
    }
  }

  // Create a new review
  async createReview(productId: string, reviewData: CreateReviewRequest): Promise<Review> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      this.validateCreateReviewRequest(reviewData);

      const response = await apiClient.post<Review>(`/products/${productId}/reviews`, reviewData);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to create review',
          response.error?.code || 'REVIEW_CREATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'createReview');
    }
  }

  // Update an existing review
  async updateReview(reviewId: string, reviewData: UpdateReviewRequest): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      this.validateUpdateReviewRequest(reviewData);

      const response = await apiClient.patch<Review>(`/reviews/${reviewId}`, reviewData);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update review',
          response.error?.code || 'REVIEW_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateReview');
    }
  }

  // Delete a review
  async deleteReview(reviewId: string): Promise<void> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      const response = await apiClient.delete(`/reviews/${reviewId}`);

      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to delete review',
          response.error?.code || 'REVIEW_DELETE_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'deleteReview');
    }
  }

  // Mark review as helpful
  async markHelpful(reviewId: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      const response = await apiClient.post<Review>(`/reviews/${reviewId}/helpful`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to mark review as helpful',
          response.error?.code || 'REVIEW_HELPFUL_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'markHelpful');
    }
  }

  // Remove helpful vote
  async removeHelpful(reviewId: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      const response = await apiClient.delete<Review>(`/reviews/${reviewId}/helpful`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to remove helpful vote',
          response.error?.code || 'REVIEW_HELPFUL_REMOVE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'removeHelpful');
    }
  }

  // Report review
  async reportReview(reviewId: string, reason: string): Promise<void> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Report reason is required');
      }

      const response = await apiClient.post(`/reviews/${reviewId}/report`, {
        reason: reason.trim(),
      });

      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to report review',
          response.error?.code || 'REVIEW_REPORT_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'reportReview');
    }
  }

  // Get user's reviews
  async getUserReviews(
    filters: {
      page?: number;
      limit?: number;
      productId?: string;
      rating?: number;
    } = {}
  ): Promise<{
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await apiClient.get('/user/reviews', {
        params: this.buildUserReviewQueryParams(filters),
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch user reviews',
          response.error?.code || 'USER_REVIEWS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getUserReviews');
    }
  }

  // Get review by ID
  async getReviewById(reviewId: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      const response = await apiClient.get<Review>(`/reviews/${reviewId}`);

      if (!response.success || !response.data) {
        throw new NotFoundError('Review', reviewId);
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getReviewById');
    }
  }

  // Get review statistics for admin
  async getReviewStats(
    filters: {
      startDate?: string;
      endDate?: string;
      productId?: string;
    } = {}
  ): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    reviewsByDay: Array<{
      date: string;
      count: number;
      averageRating: number;
    }>;
    topRatedProducts: Array<{
      productId: string;
      title: string;
      averageRating: number;
      reviewCount: number;
    }>;
    recentReviews: Review[];
  }> {
    try {
      const response = await apiClient.get('/admin/reviews/stats', {
        params: filters,
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch review statistics',
          response.error?.code || 'REVIEW_STATS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getReviewStats');
    }
  }

  // Approve review (admin only)
  async approveReview(reviewId: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      const response = await apiClient.post<Review>(`/admin/reviews/${reviewId}/approve`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to approve review',
          response.error?.code || 'REVIEW_APPROVE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'approveReview');
    }
  }

  // Reject review (admin only)
  async rejectReview(reviewId: string, reason: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Rejection reason is required');
      }

      const response = await apiClient.post<Review>(`/admin/reviews/${reviewId}/reject`, {
        reason: reason.trim(),
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to reject review',
          response.error?.code || 'REVIEW_REJECT_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'rejectReview');
    }
  }

  // Respond to review (admin/seller only)
  async respondToReview(reviewId: string, response: string): Promise<Review> {
    try {
      if (!reviewId) {
        throw new ValidationError('Review ID is required');
      }

      if (!response || response.trim().length === 0) {
        throw new ValidationError('Response text is required');
      }

      if (response.trim().length > 500) {
        throw new ValidationError('Response must be less than 500 characters');
      }

      const apiResponse = await apiClient.post<Review>(`/admin/reviews/${reviewId}/respond`, {
        response: response.trim(),
      });

      if (!apiResponse.success || !apiResponse.data) {
        throw createError(
          apiResponse.error?.message || 'Failed to respond to review',
          apiResponse.error?.code || 'REVIEW_RESPONSE_FAILED',
          400
        );
      }

      return apiResponse.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'respondToReview');
    }
  }

  // Get pending reviews (admin only)
  async getPendingReviews(
    filters: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    reviews: Review[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await apiClient.get('/admin/reviews/pending', {
        params: {
          page: filters.page || 1,
          limit: filters.limit || 20,
        },
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch pending reviews',
          response.error?.code || 'PENDING_REVIEWS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getPendingReviews');
    }
  }

  // Build query parameters for reviews
  private buildReviewQueryParams(filters: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(50, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.rating) params.rating = filters.rating;
    if (filters.verifiedOnly !== undefined) params.verifiedOnly = filters.verifiedOnly;

    return params;
  }

  // Build query parameters for user reviews
  private buildUserReviewQueryParams(filters: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(50, Math.max(1, filters.limit));
    if (filters.productId) params.productId = filters.productId;
    if (filters.rating) params.rating = filters.rating;

    return params;
  }

  // Validate create review request
  private validateCreateReviewRequest(reviewData: CreateReviewRequest): void {
    const errors: string[] = [];

    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    if (!reviewData.comment || reviewData.comment.trim().length === 0) {
      errors.push('Review comment is required');
    }

    if (reviewData.comment && reviewData.comment.trim().length < 10) {
      errors.push('Review comment must be at least 10 characters long');
    }

    if (reviewData.comment && reviewData.comment.trim().length > 1000) {
      errors.push('Review comment must be less than 1000 characters');
    }

    if (reviewData.title && reviewData.title.trim().length > 100) {
      errors.push('Review title must be less than 100 characters');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate update review request
  private validateUpdateReviewRequest(reviewData: UpdateReviewRequest): void {
    const errors: string[] = [];

    if (reviewData.rating !== undefined && (reviewData.rating < 1 || reviewData.rating > 5)) {
      errors.push('Rating must be between 1 and 5');
    }

    if (reviewData.comment !== undefined) {
      if (reviewData.comment.trim().length === 0) {
        errors.push('Review comment cannot be empty');
      }
      if (reviewData.comment.trim().length < 10) {
        errors.push('Review comment must be at least 10 characters long');
      }
      if (reviewData.comment.trim().length > 1000) {
        errors.push('Review comment must be less than 1000 characters');
      }
    }

    if (reviewData.title !== undefined && reviewData.title.trim().length > 100) {
      errors.push('Review title must be less than 100 characters');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Check if user can review product
  async canReviewProduct(productId: string): Promise<{
    canReview: boolean;
    reason?: string;
    verifiedPurchase?: boolean;
  }> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get(`/products/${productId}/can-review`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to check review eligibility',
          response.error?.code || 'REVIEW_ELIGIBILITY_CHECK_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'canReviewProduct');
    }
  }

  // Get review summary for product
  async getReviewSummary(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    verifiedPurchasePercentage: number;
    recentReviews: Review[];
  }> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get(`/products/${productId}/review-summary`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch review summary',
          response.error?.code || 'REVIEW_SUMMARY_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getReviewSummary');
    }
  }

  // Format rating display
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  // Get rating stars display
  getRatingStars(rating: number): {
    full: number;
    half: number;
    empty: number;
  } {
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const half = hasHalf ? 1 : 0;
    const empty = 5 - full - half;

    return { full, half, empty };
  }

  // Get rating color
  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#10B981'; // green-500
    if (rating >= 3.5) return '#F59E0B'; // amber-500
    if (rating >= 2.5) return '#F97316'; // orange-500
    return '#EF4444'; // red-500
  }

  // Get review time ago
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  // Check if review is verified purchase
  isVerifiedPurchase(review: Review): boolean {
    return review.verifiedPurchase;
  }

  // Get helpful percentage
  getHelpfulPercentage(review: Review): number {
    if (review.helpfulCount === 0) return 0;
    // This would need total votes count from API
    return Math.min(
      100,
      Math.round((review.helpfulCount / Math.max(1, review.helpfulCount)) * 100)
    );
  }
}

// Export singleton instance
export const reviewService = ReviewService.getInstance();

// Export default
export default reviewService;
