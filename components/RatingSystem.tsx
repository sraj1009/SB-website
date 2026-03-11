import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  notHelpful: number;
  verified: boolean;
  createdAt: string;
  images?: string[];
}

interface RatingSystemProps {
  productId: string;
  productName: string;
  averageRating?: number;
  totalReviews?: number;
  onReviewSubmit?: (review: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'notHelpful'>) => void;
}

const RatingSystem: React.FC<RatingSystemProps> = ({
  productId,
  productName,
  averageRating = 0,
  totalReviews = 0,
  onReviewSubmit,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Load reviews from API
  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (!userRating || !reviewTitle.trim() || !reviewContent.trim()) {
      return;
    }

    const newReview: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'notHelpful'> = {
      userId: 'current-user', // Replace with actual user ID
      userName: 'Current User', // Replace with actual user name
      rating: userRating,
      title: reviewTitle,
      content: reviewContent,
      verified: true,
    };

    try {
      const response = await fetch(`/api/v1/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newReview),
      });

      if (response.ok) {
        const savedReview = await response.json();
        setReviews([savedReview, ...reviews]);
        setShowReviewForm(false);
        setReviewTitle('');
        setReviewContent('');
        setUserRating(0);
        onReviewSubmit?.(newReview);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleHelpfulClick = async (reviewId: string, helpful: boolean) => {
    try {
      const response = await fetch(`/api/v1/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ helpful }),
      });

      if (response.ok) {
        setReviews(
          reviews.map((review) =>
            review.id === reviewId
              ? {
                  ...review,
                  helpful: helpful ? review.helpful + 1 : review.helpful,
                  notHelpful: !helpful ? review.notHelpful + 1 : review.notHelpful,
                }
              : review
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark review helpful:', error);
    }
  };

  const filteredAndSortedReviews = reviews
    .filter((review) => filter === 'all' || review.rating === parseInt(filter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const renderStars = (rating: number, interactive = false, size = 'sm') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && setUserRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100
        : 0,
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Overall Rating */}
          <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-yellow-500 mb-2">
              {averageRating.toFixed(1)}
            </div>
            {renderStars(Math.round(averageRating), false, 'lg')}
            <div className="text-gray-600 mt-2">
              {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm">{rating}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 w-12 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Write Review Button */}
        <button
          onClick={() => setShowReviewForm(true)}
          className="mt-6 bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
        >
          Write a Review
        </button>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Review {productName}</h3>

            {/* Rating Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating *</label>
              <div className="flex gap-2">{renderStars(hoverRating || userRating, true, 'lg')}</div>
            </div>

            {/* Review Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Review Title *</label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Summarize your review"
                maxLength={100}
              />
            </div>

            {/* Review Content */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Review *</label>
              <textarea
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                rows={4}
                placeholder="Share your experience with this product"
                maxLength={1000}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={!userRating || !reviewTitle.trim() || !reviewContent.trim()}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Rating</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredAndSortedReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No reviews yet. Be the first to review!'
                : `No ${filter}-star reviews yet.`}
            </p>
          </div>
        ) : (
          filteredAndSortedReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-sm p-6">
              {/* Review Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{review.userName}</span>
                    {review.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {renderStars(review.rating, false, 'sm')}
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">{review.title}</h4>
                <p className="text-gray-700">{review.content}</p>
              </div>

              {/* Review Actions */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <button
                  onClick={() => handleHelpfulClick(review.id, true)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-yellow-500"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful ({review.helpful})
                </button>
                <button
                  onClick={() => handleHelpfulClick(review.id, false)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-500"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Not Helpful ({review.notHelpful})
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RatingSystem;
