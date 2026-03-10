// Product Service for SINGGLEBEE Frontend

import apiClient from './api-client';
import { 
  ApiResponse, 
  PaginatedResponse, 
  ProductFilters, 
  ProductResponse,
  SearchRequest,
  SearchResponse,
  ChartDataPoint,
  RevenueChartData,
  CategoryChartData
} from '../types/api';
import { 
  NotFoundError, 
  ValidationError, 
  ErrorHandler,
  createError
} from '../utils/error-handler';

class ProductService {
  private static instance: ProductService;

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  // Get products with filters and pagination
  async getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<ProductResponse>> {
    try {
      const response = await apiClient.get<PaginatedResponse<ProductResponse>>('/products', {
        params: this.buildQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch products',
          response.error?.code || 'PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProducts');
    }
  }

  // Get single product by ID
  async getProductById(id: string): Promise<ProductResponse> {
    try {
      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get<ProductResponse>(`/products/${id}`);
      
      if (!response.success || !response.data) {
        throw new NotFoundError('Product', id);
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProductById');
    }
  }

  // Search products
  async searchProducts(query: string, filters: ProductFilters = {}): Promise<SearchResponse> {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query is required');
      }

      const searchRequest: SearchRequest = {
        query: query.trim(),
        filters: {
          ...filters,
          limit: filters.limit || 20
        }
      };

      const response = await apiClient.post<SearchResponse>('/products/search', searchRequest);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Search failed',
          response.error?.code || 'PRODUCT_SEARCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'searchProducts');
    }
  }

  // Get product categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>('/products/categories');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch categories',
          response.error?.code || 'CATEGORIES_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getCategories');
    }
  }

  // Get bestseller products
  async getBestsellers(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const response = await apiClient.get<ProductResponse[]>('/products/bestsellers', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch bestsellers',
          response.error?.code || 'BESTSELLERS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getBestsellers');
    }
  }

  // Get related products
  async getRelatedProducts(id: string, limit: number = 6): Promise<ProductResponse[]> {
    try {
      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get<ProductResponse[]>(`/products/${id}/related`, {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch related products',
          response.error?.code || 'RELATED_PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getRelatedProducts');
    }
  }

  // Get new arrivals
  async getNewArrivals(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const response = await apiClient.get<ProductResponse[]>('/products/new-arrivals', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch new arrivals',
          response.error?.code || 'NEW_ARRIVALS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getNewArrivals');
    }
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const response = await apiClient.get<ProductResponse[]>('/products/featured', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch featured products',
          response.error?.code || 'FEATURED_PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getFeaturedProducts');
    }
  }

  // Get products by category
  async getProductsByCategory(category: string, filters: ProductFilters = {}): Promise<PaginatedResponse<ProductResponse>> {
    try {
      if (!category) {
        throw new ValidationError('Category is required');
      }

      const response = await apiClient.get<PaginatedResponse<ProductResponse>>(`/products/category/${category}`, {
        params: this.buildQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || `Failed to fetch products in category: ${category}`,
          response.error?.code || 'CATEGORY_PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProductsByCategory');
    }
  }

  // Get products by author
  async getProductsByAuthor(author: string, filters: ProductFilters = {}): Promise<PaginatedResponse<ProductResponse>> {
    try {
      if (!author) {
        throw new ValidationError('Author name is required');
      }

      const response = await apiClient.get<PaginatedResponse<ProductResponse>>(`/products/author/${encodeURIComponent(author)}`, {
        params: this.buildQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || `Failed to fetch products by author: ${author}`,
          response.error?.code || 'AUTHOR_PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProductsByAuthor');
    }
  }

  // Get product recommendations for user
  async getRecommendations(limit: number = 6): Promise<ProductResponse[]> {
    try {
      const response = await apiClient.get<ProductResponse[]>('/products/recommendations', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch recommendations',
          response.error?.code || 'RECOMMENDATIONS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getRecommendations');
    }
  }

  // Get product analytics data
  async getProductAnalytics(productId: string): Promise<{
    views: number;
    purchases: number;
    revenue: number;
    rating: number;
    reviewCount: number;
    stockAlerts: boolean;
  }> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get(`/products/${productId}/analytics`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch product analytics',
          response.error?.code || 'PRODUCT_ANALYTICS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProductAnalytics');
    }
  }

  // Get popular searches
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>('/products/popular-searches', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch popular searches',
          response.error?.code || 'POPULAR_SEARCHES_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getPopularSearches');
    }
  }

  // Get product price history
  async getPriceHistory(productId: string, days: number = 30): Promise<ChartDataPoint[]> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.get<ChartDataPoint[]>(`/products/${productId}/price-history`, {
        params: { days }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch price history',
          response.error?.code || 'PRICE_HISTORY_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getPriceHistory');
    }
  }

  // Check product availability
  async checkAvailability(productIds: string[]): Promise<Record<string, {
    inStock: boolean;
    stock: number;
    estimatedDelivery?: string;
  }>> {
    try {
      if (!productIds || productIds.length === 0) {
        throw new ValidationError('Product IDs are required');
      }

      const response = await apiClient.post('/products/check-availability', {
        productIds
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to check availability',
          response.error?.code || 'AVAILABILITY_CHECK_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'checkAvailability');
    }
  }

  // Build query parameters from filters
  private buildQueryParams(filters: ProductFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.category) params.category = filters.category;
    if (filters.priceMin !== undefined) params.priceMin = filters.priceMin;
    if (filters.priceMax !== undefined) params.priceMax = filters.priceMax;
    if (filters.rating !== undefined) params.rating = filters.rating;
    if (filters.language) params.language = filters.language;
    if (filters.inStock !== undefined) params.inStock = filters.inStock;
    if (filters.bestseller !== undefined) params.bestseller = filters.bestseller;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(50, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Validate product filters
  validateFilters(filters: ProductFilters): void {
    const errors: string[] = [];

    if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
      if (filters.priceMin >= filters.priceMax) {
        errors.push('Minimum price must be less than maximum price');
      }
    }

    if (filters.rating !== undefined && (filters.rating < 1 || filters.rating > 5)) {
      errors.push('Rating must be between 1 and 5');
    }

    if (filters.page !== undefined && filters.page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (filters.limit !== undefined && (filters.limit < 1 || filters.limit > 50)) {
      errors.push('Limit must be between 1 and 50');
    }

    if (filters.sortBy && !['price', 'rating', 'createdAt', 'title', 'bestseller'].includes(filters.sortBy)) {
      errors.push('Invalid sort field');
    }

    if (filters.sortOrder && !['asc', 'desc'].includes(filters.sortOrder)) {
      errors.push('Sort order must be either asc or desc');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Get product comparison data
  async compareProducts(productIds: string[]): Promise<ProductResponse[]> {
    try {
      if (!productIds || productIds.length < 2 || productIds.length > 4) {
        throw new ValidationError('Please select 2 to 4 products to compare');
      }

      const response = await apiClient.post<ProductResponse[]>('/products/compare', {
        productIds
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to compare products',
          response.error?.code || 'PRODUCT_COMPARISON_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'compareProducts');
    }
  }

  // Get product trending data
  async getTrendingProducts(limit: number = 10): Promise<ProductResponse[]> {
    try {
      const response = await apiClient.get<ProductResponse[]>('/products/trending', {
        params: { limit }
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch trending products',
          response.error?.code || 'TRENDING_PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getTrendingProducts');
    }
  }

  // Get product statistics
  async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    lowStock: number;
    categories: number;
    authors: number;
  }> {
    try {
      const response = await apiClient.get('/products/stats');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch product statistics',
          response.error?.code || 'PRODUCT_STATS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getProductStats');
    }
  }
}

// Export singleton instance
export const productService = ProductService.getInstance();

// Export default
export default productService;
