// React Query hooks for Products

import React from 'react';
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productService } from '../services/product.service';
import { ProductFilters, ProductResponse, SearchRequest } from '../types/api';
import { toast } from 'react-toastify';

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  bestsellers: () => [...productKeys.all, 'bestsellers'] as const,
  related: (id: string) => [...productKeys.all, 'related', id] as const,
  newArrivals: () => [...productKeys.all, 'new-arrivals'] as const,
  featured: () => [...productKeys.all, 'featured'] as const,
  trending: () => [...productKeys.all, 'trending'] as const,
  recommendations: () => [...productKeys.all, 'recommendations'] as const,
};

// Get products with filters
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get infinite products (for infinite scroll)
export function useInfiniteProducts(filters: ProductFilters = {}) {
  return useInfiniteQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => productService.getProducts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// Get single product by ID
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

// Search products
export function useSearchProducts(query: string, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productService.searchProducts(query, filters),
    enabled: !!query && query.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

// Get product categories
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => productService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

// Get bestseller products
export function useBestsellers(limit: number = 10) {
  return useQuery({
    queryKey: productKeys.bestsellers(),
    queryFn: () => productService.getBestsellers(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Get related products
export function useRelatedProducts(id: string, limit: number = 6) {
  return useQuery({
    queryKey: productKeys.related(id),
    queryFn: () => productService.getRelatedProducts(id, limit),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });
}

// Get new arrivals
export function useNewArrivals(limit: number = 10) {
  return useQuery({
    queryKey: productKeys.newArrivals(),
    queryFn: () => productService.getNewArrivals(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

// Get featured products
export function useFeaturedProducts(limit: number = 10) {
  return useQuery({
    queryKey: productKeys.featured(),
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
}

// Get trending products
export function useTrendingProducts(limit: number = 10) {
  return useQuery({
    queryKey: productKeys.trending(),
    queryFn: () => productService.getTrendingProducts(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}

// Get product recommendations
export function useRecommendations(limit: number = 6) {
  return useQuery({
    queryKey: productKeys.recommendations(),
    queryFn: () => productService.getRecommendations(limit),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });
}

// Get products by category
export function useProductsByCategory(category: string, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list({ ...filters, category }),
    queryFn: () => productService.getProductsByCategory(category, filters),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get products by author
export function useProductsByAuthor(author: string, filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list({ ...filters, author }),
    queryFn: () => productService.getProductsByAuthor(author, filters),
    enabled: !!author,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get product analytics (admin only)
export function useProductAnalytics(productId: string) {
  return useQuery({
    queryKey: [...productKeys.detail(productId), 'analytics'],
    queryFn: () => productService.getProductAnalytics(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

// Get popular searches
export function usePopularSearches(limit: number = 10) {
  return useQuery({
    queryKey: [...productKeys.all, 'popular-searches'],
    queryFn: () => productService.getPopularSearches(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}

// Get price history
export function usePriceHistory(productId: string, days: number = 30) {
  return useQuery({
    queryKey: [...productKeys.detail(productId), 'price-history', days],
    queryFn: () => productService.getPriceHistory(productId, days),
    enabled: !!productId,
    staleTime: 24 * 60 * 1000, // 24 hours
    retry: 1,
  });
}

// Check availability
export function useCheckAvailability(productIds: string[]) {
  return useQuery({
    queryKey: [...productKeys.all, 'availability', productIds],
    queryFn: () => productService.checkAvailability(productIds),
    enabled: !!productIds && productIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

// Compare products mutation
export function useCompareProducts() {
  return useMutation({
    mutationFn: (productIds: string[]) => productService.compareProducts(productIds),
    onError: (error) => {
      const message = error.message || 'Failed to compare products';
      toast.error(message);
    },
  });
}

// Get product statistics (admin only)
export function useProductStats() {
  return useQuery({
    queryKey: [...productKeys.all, 'stats'],
    queryFn: () => productService.getProductStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Custom hook for product search with debouncing
export function useProductSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState<ProductFilters>({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  const searchResults = useSearchProducts(debouncedQuery, filters);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    searchResults,
    isLoading: searchResults.isLoading,
    data: searchResults.data,
    error: searchResults.error,
  };
}

// Custom hook for product filters
export function useProductFilters(initialFilters: ProductFilters = {}) {
  const [filters, setFilters] = React.useState<ProductFilters>(initialFilters);

  const updateFilter = React.useCallback((key: keyof ProductFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

// Custom hook for product comparison
export function useProductComparison() {
  const [compareList, setCompareList] = React.useState<string[]>([]);

  const addToCompare = React.useCallback((productId: string) => {
    setCompareList((prev) => {
      if (prev.includes(productId)) return prev;
      if (prev.length >= 4) {
        toast.warning('You can compare up to 4 products at a time');
        return prev;
      }
      return [...prev, productId];
    });
  }, []);

  const removeFromCompare = React.useCallback((productId: string) => {
    setCompareList((prev) => prev.filter((id) => id !== productId));
  }, []);

  const clearCompare = React.useCallback(() => {
    setCompareList([]);
  }, []);

  const compareMutation = useCompareProducts();

  return {
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
    compareMutation,
    canCompare: compareList.length >= 2 && compareList.length <= 4,
    isMaxReached: compareList.length >= 4,
  };
}

// Custom hook for product wishlist
export function useProductWishlist() {
  const queryClient = useQueryClient();

  const addToWishlist = useMutation({
    mutationFn: async (productId: string) => {
      // This would call a wishlist service
      // For now, we'll just show a toast
      toast.success('Added to wishlist! ❤️');
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (productId: string) => {
      // This would call a wishlist service
      toast.success('Removed from wishlist');
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  return {
    addToWishlist: addToWishlist.mutate,
    removeFromWishlist: removeFromWishlist.mutate,
    isAdding: addToWishlist.isPending,
    isRemoving: removeFromWishlist.isPending,
  };
}

// Utility hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for product availability
export function useProductAvailability(productId: string) {
  const availability = useCheckAvailability([productId]);

  return {
    isAvailable: availability.data?.[productId]?.inStock || false,
    stock: availability.data?.[productId]?.stock || 0,
    estimatedDelivery: availability.data?.[productId]?.estimatedDelivery,
    isLoading: availability.isLoading,
    error: availability.error,
    refetch: availability.refetch,
  };
}

// Custom hook for product recommendations
export function usePersonalizedRecommendations() {
  return useQuery({
    queryKey: [...productKeys.recommendations(), 'personalized'],
    queryFn: () => productService.getRecommendations(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });
}

// Custom hook for product insights
export function useProductInsights(productId: string) {
  const analytics = useProductAnalytics(productId);
  const priceHistory = usePriceHistory(productId);

  return {
    analytics: analytics.data,
    priceHistory: priceHistory.data,
    isLoading: analytics.isLoading || priceHistory.isLoading,
    error: analytics.error || priceHistory.error,
    refetch: () => {
      analytics.refetch();
      priceHistory.refetch();
    },
  };
}
