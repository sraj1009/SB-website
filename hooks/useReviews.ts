// React Query hooks for Reviews

import React from 'react';
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { reviewService } from '../services/review.service';
import { CreateReviewRequest, UpdateReviewRequest } from '../types/api';
import { toast } from 'react-toastify';

// Query keys
export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (productId: string, filters?: any) => [...reviewKeys.lists(), productId, filters] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
  user: () => [...reviewKeys.all, 'user'] as const,
  userReviews: (filters?: any) => [...reviewKeys.user(), filters] as const,
  stats: () => [...reviewKeys.all, 'stats'] as const,
  pending: () => [...reviewKeys.all, 'pending'] as const,
  summary: (productId: string) => [...reviewKeys.all, 'summary', productId] as const,
  eligibility: (productId: string) => [...reviewKeys.all, 'eligibility', productId] as const,
};

// Get reviews for a product
export function useReviews(productId: string, filters: {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';
  rating?: number;
  verifiedOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: reviewKeys.list(productId, filters),
    queryFn: () => reviewService.getReviews(productId, filters),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get infinite reviews
export function useInfiniteReviews(productId: string, filters: {
  sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful';
  rating?: number;
  verifiedOnly?: boolean;
} = {}) {
  return useInfiniteQuery({
    queryKey: reviewKeys.list(productId, filters),
    queryFn: ({ pageParam = 1 }) => 
      reviewService.getReviews(productId, { ...filters, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// Get single review by ID
export function useReview(reviewId: string) {
  return useQuery({
    queryKey: reviewKeys.detail(reviewId),
    queryFn: () => reviewService.getReviewById(reviewId),
    enabled: !!reviewId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// Create review mutation
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, reviewData }: { productId: string; reviewData: CreateReviewRequest }) => 
      reviewService.createReview(productId, reviewData),
    onSuccess: (data, variables) => {
      toast.success('Review submitted successfully! 🎉');
      
      // Invalidate review queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.list(variables.productId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.summary(variables.productId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.userReviews() });
    },
    onError: (error) => {
      const message = error.message || 'Failed to submit review';
      toast.error(message);
    },
  });
}

// Update review mutation
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reviewData }: { reviewId: string; reviewData: UpdateReviewRequest }) => 
      reviewService.updateReview(reviewId, reviewData),
    onSuccess: (data) => {
      toast.success('Review updated successfully!');
      
      // Invalidate review queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update review';
      toast.error(message);
    },
  });
}

// Delete review mutation
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewService.deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Review deleted successfully');
      
      // Invalidate review queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to delete review';
      toast.error(message);
    },
  });
}

// Mark review as helpful mutation
export function useMarkHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewService.markHelpful(reviewId),
    onSuccess: (data) => {
      toast.success('Marked as helpful! 👍');
      
      // Update the specific review in cache
      queryClient.setQueryData(reviewKeys.detail(data.id), data);
    },
    onError: (error) => {
      const message = error.message || 'Failed to mark as helpful';
      toast.error(message);
    },
  });
}

// Remove helpful vote mutation
export function useRemoveHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewService.removeHelpful(reviewId),
    onSuccess: (data) => {
      toast.success('Helpful vote removed');
      
      // Update the specific review in cache
      queryClient.setQueryData(reviewKeys.detail(data.id), data);
    },
    onError: (error) => {
      const message = error.message || 'Failed to remove helpful vote';
      toast.error(message);
    },
  });
}

// Report review mutation
export function useReportReview() {
  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) => 
      reviewService.reportReview(reviewId, reason),
    onSuccess: () => {
      toast.success('Review reported. Thank you for helping us maintain quality! 🙏');
    },
    onError: (error) => {
      const message = error.message || 'Failed to report review';
      toast.error(message);
    },
  });
}

// Get user's reviews
export function useUserReviews(filters: {
  page?: number;
  limit?: number;
  productId?: string;
  rating?: number;
} = {}) {
  return useQuery({
    queryKey: reviewKeys.userReviews(filters),
    queryFn: () => reviewService.getUserReviews(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get review statistics (admin only)
export function useReviewStats(filters: {
  startDate?: string;
  endDate?: string;
  productId?: string;
} = {}) {
  return useQuery({
    queryKey: reviewKeys.stats(),
    queryFn: () => reviewService.getReviewStats(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Approve review mutation (admin only)
export function useApproveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewService.approveReview(reviewId),
    onSuccess: (data) => {
      toast.success('Review approved ✅');
      
      // Update review in cache
      queryClient.setQueryData(reviewKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: reviewKeys.pending() });
    },
    onError: (error) => {
      const message = error.message || 'Failed to approve review';
      toast.error(message);
    },
  });
}

// Reject review mutation (admin only)
export function useRejectReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) => 
      reviewService.rejectReview(reviewId, reason),
    onSuccess: (data) => {
      toast.success('Review rejected ❌');
      
      // Update review in cache
      queryClient.setQueryData(reviewKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: reviewKeys.pending() });
    },
    onError: (error) => {
      const message = error.message || 'Failed to reject review';
      toast.error(message);
    },
  });
}

// Respond to review mutation (admin/seller only)
export function useRespondToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) => 
      reviewService.respondToReview(reviewId, response),
    onSuccess: (data) => {
      toast.success('Response added successfully! 💬');
      
      // Update review in cache
      queryClient.setQueryData(reviewKeys.detail(data.id), data);
    },
    onError: (error) => {
      const message = error.message || 'Failed to add response';
      toast.error(message);
    },
  });
}

// Get pending reviews (admin only)
export function usePendingReviews(filters: {
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: reviewKeys.pending(),
    queryFn: () => reviewService.getPendingReviews(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Check if user can review product
export function useCanReviewProduct(productId: string) {
  return useQuery({
    queryKey: reviewKeys.eligibility(productId),
    queryFn: () => reviewService.canReviewProduct(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

// Get review summary for product
export function useReviewSummary(productId: string) {
  return useQuery({
    queryKey: reviewKeys.summary(productId),
    queryFn: () => reviewService.getReviewSummary(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Custom hook for review management
export function useReviewManager() {
  const queryClient = useQueryClient();
  
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const markHelpful = useMarkHelpful();
  const removeHelpful = useRemoveHelpful();
  const reportReview = useReportReview();
  
  return {
    // Mutations
    createReview: createReview.mutateAsync,
    updateReview: updateReview.mutateAsync,
    deleteReview: deleteReview.mutateAsync,
    markHelpful: markHelpful.mutateAsync,
    removeHelpful: removeHelpful.mutateAsync,
    reportReview: reportReview.mutateAsync,
    
    // Loading states
    isCreating: createReview.isPending,
    isUpdating: updateReview.isPending,
    isDeleting: deleteReview.isPending,
    isMarkingHelpful: markHelpful.isPending,
    isRemovingHelpful: removeHelpful.isPending,
    isReporting: reportReview.isPending,
    
    // Error states
    createError: createReview.error,
    updateError: updateReview.error,
    deleteError: deleteReview.error,
    markHelpfulError: markHelpful.error,
    removeHelpfulError: removeHelpful.error,
    reportError: reportReview.error,
  };
}

// Custom hook for review moderation (admin)
export function useReviewModeration() {
  const queryClient = useQueryClient();
  
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const respondToReview = useRespondToReview();
  
  return {
    approveReview: approveReview.mutateAsync,
    rejectReview: rejectReview.mutateAsync,
    respondToReview: respondToReview.mutateAsync,
    
    isApproving: approveReview.isPending,
    isRejecting: rejectReview.isPending,
    isResponding: respondToReview.isPending,
    
    approveError: approveReview.error,
    rejectError: rejectReview.error,
    respondError: respondToReview.error,
  };
}

// Custom hook for review filters
export function useReviewFilters(initialFilters: any = {}) {
  const [filters, setFilters] = React.useState(initialFilters);
  
  const updateFilter = React.useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const clearFilters = React.useCallback(() => {
    setFilters({});
  }, []);
  
  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);
  
  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    resetFilters,
  };
}

// Custom hook for review rating breakdown
export function useReviewRatingBreakdown(productId: string) {
  const reviews = useReviews(productId);
  
  const ratingBreakdown = React.useMemo(() => {
    if (!reviews.data?.summary) return null;
    
    const { ratingDistribution, totalReviews } = reviews.data.summary;
    
    return Object.entries(ratingDistribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    })).sort((a, b) => b.rating - a.rating);
  }, [reviews.data]);
  
  return {
    ratingBreakdown,
    isLoading: reviews.isLoading,
    error: reviews.error,
  };
}

// Custom hook for review helpful voting
export function useReviewHelpful(reviewId: string) {
  const review = useReview(reviewId);
  const markHelpful = useMarkHelpful();
  const removeHelpful = useRemoveHelpful();
  
  const isHelpful = React.useMemo(() => {
    // This would need to be tracked in user state/localStorage
    return false; // Placeholder
  }, [reviewId]);
  
  const handleToggleHelpful = React.useCallback(() => {
    if (isHelpful) {
      removeHelpful.mutate(reviewId);
    } else {
      markHelpful.mutate(reviewId);
    }
  }, [isHelpful, reviewId, markHelpful, removeHelpful]);
  
  return {
    isHelpful,
    helpfulCount: review.data?.helpfulCount || 0,
    toggleHelpful: handleToggleHelpful,
    isLoading: markHelpful.isPending || removeHelpful.isPending,
    error: markHelpful.error || removeHelpful.error,
  };
}

// Custom hook for review form validation
export function useReviewForm() {
  const [formData, setFormData] = React.useState<CreateReviewRequest>({
    rating: 0,
    title: '',
    comment: '',
  });
  
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const validateForm = React.useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Rating is required';
    }
    
    if (!formData.comment || formData.comment.trim().length < 10) {
      newErrors.comment = 'Review must be at least 10 characters';
    }
    
    if (formData.comment && formData.comment.trim().length > 1000) {
      newErrors.comment = 'Review must be less than 1000 characters';
    }
    
    if (formData.title && formData.title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  const updateField = React.useCallback((field: keyof CreateReviewRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);
  
  const resetForm = React.useCallback(() => {
    setFormData({
      rating: 0,
      title: '',
      comment: '',
    });
    setErrors({});
  }, []);
  
  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    isValid: Object.keys(errors).length === 0,
  };
}

// Custom hook for review analytics
export function useReviewAnalytics() {
  const stats = useReviewStats();
  
  const analytics = React.useMemo(() => {
    if (!stats.data) return null;
    
    return {
      totalReviews: stats.data.totalReviews,
      averageRating: stats.data.averageRating,
      ratingDistribution: stats.data.ratingDistribution,
      reviewsByDay: stats.data.reviewsByDay,
      topRatedProducts: stats.data.topRatedProducts,
      recentReviews: stats.data.recentReviews,
    };
  }, [stats.data]);
  
  return {
    analytics,
    isLoading: stats.isLoading,
    error: stats.error,
    refetch: stats.refetch,
  };
}

// Custom hook for review notifications
export function useReviewNotifications() {
  const pendingReviews = usePendingReviews({ limit: 10 });
  
  // Show notification for pending reviews
  React.useEffect(() => {
    if (pendingReviews.data?.reviews && pendingReviews.data.reviews.length > 0) {
      const pendingCount = pendingReviews.data.reviews.length;
      if (pendingCount > 0) {
        console.log(`You have ${pendingCount} reviews pending moderation`);
        // You could implement a notification system here
      }
    }
  }, [pendingReviews.data]);
  
  return {
    pendingReviews: pendingReviews.data?.reviews || [],
    pendingCount: pendingReviews.data?.reviews?.length || 0,
    isLoading: pendingReviews.isLoading,
  };
}
