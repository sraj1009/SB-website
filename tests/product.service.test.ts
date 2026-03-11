// Unit Tests for Product Service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { productService } from '../services/product.service';
import { apiClient } from '../services/api-client';
import { NotFoundError, ValidationError } from '../utils/error-handler';

// Mock the api client
vi.mock('../services/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
    download: vi.fn(),
  },
}));

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProducts', () => {
    it('should fetch products with filters', async () => {
      const filters = {
        category: 'books',
        page: 1,
        limit: 10,
        sortBy: 'price' as const,
        sortOrder: 'asc' as const,
      };

      const mockResponse = {
        success: true,
        data: {
          data: [
            {
              id: '1',
              title: 'Test Book',
              author: 'Test Author',
              price: 299,
              category: 'books',
            },
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProducts(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/products', {
        params: {
          category: 'books',
          page: 1,
          limit: 10,
          sortBy: 'price',
          sortOrder: 'asc',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle get products errors', async () => {
      const mockError = new Error('Failed to fetch products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProducts()).rejects.toThrow('Failed to fetch products');
    });

    it('should validate filters', async () => {
      const invalidFilters = {
        priceMin: 500,
        priceMax: 100, // Invalid: min > max
        rating: 6, // Invalid: rating > 5
        page: 0, // Invalid: page < 1
        limit: 100, // Invalid: limit > 50
        sortBy: 'invalid-field' as any,
        sortOrder: 'invalid-order' as any,
      };

      await expect(productService.getProducts(invalidFilters)).rejects.toThrow(ValidationError);
    });
  });

  describe('getProductById', () => {
    it('should fetch single product by ID', async () => {
      const productId = '1';
      const mockResponse = {
        success: true,
        data: {
          id: productId,
          title: 'Test Book',
          author: 'Test Author',
          price: 299,
          category: 'books',
          description: 'A great test book',
          images: ['test-image.jpg'],
          stock: 100,
          rating: 4.5,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProductById(productId);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/${productId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle product not found', async () => {
      const productId = 'nonexistent';
      const mockError = new Error('Product not found');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProductById(productId)).rejects.toThrow('Product not found');
    });

    it('should validate product ID', async () => {
      await expect(productService.getProductById('')).rejects.toThrow(ValidationError);
      await expect(productService.getProductById(null as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('searchProducts', () => {
    it('should search products with query', async () => {
      const query = 'Tamil books';
      const filters = {
        category: 'books',
        limit: 20,
      };

      const mockResponse = {
        success: true,
        data: {
          products: [
            {
              id: '1',
              title: 'Tamil Book 1',
              author: 'Author 1',
              price: 299,
            },
          ],
          categories: ['books', 'poems'],
          authors: ['Author 1', 'Author 2'],
          suggestions: ['Tamil literature', 'Tamil poetry'],
          totalResults: 1,
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await productService.searchProducts(query, filters);

      expect(apiClient.post).toHaveBeenCalledWith('/products/search', {
        query,
        filters: { ...filters, limit: 20 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate search query', async () => {
      await expect(productService.searchProducts('')).rejects.toThrow(ValidationError);
      await expect(productService.searchProducts('   ')).rejects.toThrow(ValidationError);
    });

    it('should handle search errors', async () => {
      const mockError = new Error('Search failed');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(productService.searchProducts('test')).rejects.toThrow('Search failed');
    });
  });

  describe('getCategories', () => {
    it('should fetch product categories', async () => {
      const mockResponse = {
        success: true,
        data: ['books', 'poems', 'stories', 'educational'],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getCategories();

      expect(apiClient.get).toHaveBeenCalledWith('/products/categories');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle categories fetch errors', async () => {
      const mockError = new Error('Failed to fetch categories');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getCategories()).rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('getBestsellers', () => {
    it('should fetch bestseller products', async () => {
      const limit = 10;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Bestseller Book',
            author: 'Popular Author',
            price: 399,
            bestseller: true,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getBestsellers(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/bestsellers', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle bestsellers fetch errors', async () => {
      const mockError = new Error('Failed to fetch bestsellers');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getBestsellers()).rejects.toThrow('Failed to fetch bestsellers');
    });
  });

  describe('getRelatedProducts', () => {
    it('should fetch related products', async () => {
      const productId = '1';
      const limit = 6;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '2',
            title: 'Related Book',
            author: 'Same Author',
            price: 299,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getRelatedProducts(productId, limit);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/${productId}/related`, {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate product ID for related products', async () => {
      await expect(productService.getRelatedProducts('')).rejects.toThrow(ValidationError);
    });

    it('should handle related products fetch errors', async () => {
      const mockError = new Error('Failed to fetch related products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getRelatedProducts('1')).rejects.toThrow(
        'Failed to fetch related products'
      );
    });
  });

  describe('getNewArrivals', () => {
    it('should fetch new arrivals', async () => {
      const limit = 10;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'New Arrival Book',
            author: 'New Author',
            price: 349,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getNewArrivals(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/new-arrivals', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle new arrivals fetch errors', async () => {
      const mockError = new Error('Failed to fetch new arrivals');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getNewArrivals()).rejects.toThrow('Failed to fetch new arrivals');
    });
  });

  describe('getFeaturedProducts', () => {
    it('should fetch featured products', async () => {
      const limit = 10;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Featured Book',
            author: 'Featured Author',
            price: 499,
            featured: true,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getFeaturedProducts(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/featured', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle featured products fetch errors', async () => {
      const mockError = new Error('Failed to fetch featured products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getFeaturedProducts()).rejects.toThrow(
        'Failed to fetch featured products'
      );
    });
  });

  describe('getRecommendations', () => {
    it('should fetch product recommendations', async () => {
      const limit = 6;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Recommended Book',
            author: 'Recommended Author',
            price: 299,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getRecommendations(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/recommendations', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle recommendations fetch errors', async () => {
      const mockError = new Error('Failed to fetch recommendations');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getRecommendations()).rejects.toThrow(
        'Failed to fetch recommendations'
      );
    });
  });

  describe('getProductsByCategory', () => {
    it('should fetch products by category', async () => {
      const category = 'books';
      const filters = {
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        success: true,
        data: {
          data: [
            {
              id: '1',
              title: 'Category Book',
              author: 'Category Author',
              price: 299,
              category: 'books',
            },
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProductsByCategory(category, filters);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/category/${category}`, {
        params: filters,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate category', async () => {
      await expect(productService.getProductsByCategory('')).rejects.toThrow(ValidationError);
    });

    it('should handle category products fetch errors', async () => {
      const mockError = new Error('Failed to fetch category products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProductsByCategory('books')).rejects.toThrow(
        'Failed to fetch category products'
      );
    });
  });

  describe('getProductsByAuthor', () => {
    it('should fetch products by author', async () => {
      const author = 'Test Author';
      const filters = {
        page: 1,
        limit: 10,
      };

      const mockResponse = {
        success: true,
        data: {
          data: [
            {
              id: '1',
              title: 'Author Book',
              author: author,
              price: 299,
            },
          ],
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProductsByAuthor(author, filters);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/author/${encodeURIComponent(author)}`, {
        params: filters,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate author name', async () => {
      await expect(productService.getProductsByAuthor('')).rejects.toThrow(ValidationError);
    });

    it('should handle author products fetch errors', async () => {
      const mockError = new Error('Failed to fetch author products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProductsByAuthor('Test Author')).rejects.toThrow(
        'Failed to fetch author products'
      );
    });
  });

  describe('getProductAnalytics', () => {
    it('should fetch product analytics', async () => {
      const productId = '1';
      const mockResponse = {
        success: true,
        data: {
          views: 1000,
          purchases: 50,
          revenue: 14950,
          rating: 4.5,
          reviewCount: 25,
          stockAlerts: false,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProductAnalytics(productId);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/${productId}/analytics`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate product ID for analytics', async () => {
      await expect(productService.getProductAnalytics('')).rejects.toThrow(ValidationError);
    });

    it('should handle analytics fetch errors', async () => {
      const mockError = new Error('Failed to fetch analytics');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProductAnalytics('1')).rejects.toThrow(
        'Failed to fetch analytics'
      );
    });
  });

  describe('getPopularSearches', () => {
    it('should fetch popular searches', async () => {
      const limit = 10;
      const mockResponse = {
        success: true,
        data: ['Tamil books', 'Children stories', 'Poetry collections'],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getPopularSearches(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/popular-searches', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle popular searches fetch errors', async () => {
      const mockError = new Error('Failed to fetch popular searches');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getPopularSearches()).rejects.toThrow(
        'Failed to fetch popular searches'
      );
    });
  });

  describe('getPriceHistory', () => {
    it('should fetch price history', async () => {
      const productId = '1';
      const days = 30;
      const mockResponse = {
        success: true,
        data: [
          { label: '2024-01-01', value: 299 },
          { label: '2024-01-02', value: 299 },
          { label: '2024-01-03', value: 349 },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getPriceHistory(productId, days);

      expect(apiClient.get).toHaveBeenCalledWith(`/products/${productId}/price-history`, {
        params: { days },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate product ID for price history', async () => {
      await expect(productService.getPriceHistory('')).rejects.toThrow(ValidationError);
    });

    it('should handle price history fetch errors', async () => {
      const mockError = new Error('Failed to fetch price history');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getPriceHistory('1')).rejects.toThrow(
        'Failed to fetch price history'
      );
    });
  });

  describe('checkAvailability', () => {
    it('should check product availability', async () => {
      const productIds = ['1', '2', '3'];
      const mockResponse = {
        success: true,
        data: {
          '1': { inStock: true, stock: 100, estimatedDelivery: '2-3 days' },
          '2': { inStock: false, stock: 0 },
          '3': { inStock: true, stock: 5, estimatedDelivery: '1-2 days' },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await productService.checkAvailability(productIds);

      expect(apiClient.post).toHaveBeenCalledWith('/products/check-availability', {
        productIds,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate product IDs for availability check', async () => {
      await expect(productService.checkAvailability([])).rejects.toThrow(ValidationError);
      await expect(productService.checkAvailability(null as any)).rejects.toThrow(ValidationError);
    });

    it('should handle availability check errors', async () => {
      const mockError = new Error('Failed to check availability');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(productService.checkAvailability(['1'])).rejects.toThrow(
        'Failed to check availability'
      );
    });
  });

  describe('compareProducts', () => {
    it('should compare products', async () => {
      const productIds = ['1', '2', '3'];
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Product 1',
            author: 'Author 1',
            price: 299,
          },
          {
            id: '2',
            title: 'Product 2',
            author: 'Author 2',
            price: 399,
          },
          {
            id: '3',
            title: 'Product 3',
            author: 'Author 3',
            price: 199,
          },
        ],
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await productService.compareProducts(productIds);

      expect(apiClient.post).toHaveBeenCalledWith('/products/compare', {
        productIds,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should validate product IDs for comparison', async () => {
      await expect(productService.compareProducts([])).rejects.toThrow(ValidationError);
      await expect(productService.compareProducts(['1'])).rejects.toThrow(ValidationError); // Less than 2
      await expect(productService.compareProducts(['1', '2', '3', '4', '5'])).rejects.toThrow(
        ValidationError
      ); // More than 4
    });

    it('should handle product comparison errors', async () => {
      const mockError = new Error('Failed to compare products');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(productService.compareProducts(['1', '2'])).rejects.toThrow(
        'Failed to compare products'
      );
    });
  });

  describe('getTrendingProducts', () => {
    it('should fetch trending products', async () => {
      const limit = 10;
      const mockResponse = {
        success: true,
        data: [
          {
            id: '1',
            title: 'Trending Book',
            author: 'Trending Author',
            price: 349,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getTrendingProducts(limit);

      expect(apiClient.get).toHaveBeenCalledWith('/products/trending', {
        params: { limit },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle trending products fetch errors', async () => {
      const mockError = new Error('Failed to fetch trending products');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getTrendingProducts()).rejects.toThrow(
        'Failed to fetch trending products'
      );
    });
  });

  describe('getProductStats', () => {
    it('should fetch product statistics', async () => {
      const mockResponse = {
        success: true,
        data: {
          totalProducts: 100,
          activeProducts: 95,
          outOfStock: 5,
          lowStock: 10,
          categories: 5,
          authors: 25,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await productService.getProductStats();

      expect(apiClient.get).toHaveBeenCalledWith('/products/stats');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle product stats fetch errors', async () => {
      const mockError = new Error('Failed to fetch product stats');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(productService.getProductStats()).rejects.toThrow(
        'Failed to fetch product stats'
      );
    });
  });

  describe('utility methods', () => {
    it('should format order ID correctly', () => {
      const orderId = 'ord-123';
      const result = (productService as any).formatOrderId(orderId);
      expect(result).toBe('ORD-123');
    });

    it('should get status color correctly', () => {
      expect((productService as any).getStatusColor('pending')).toBe('#F59E0B');
      expect((productService as any).getStatusColor('delivered')).toBe('#059669');
      expect((productService as any).getStatusColor('cancelled')).toBe('#EF4444');
      expect((productService as any).getStatusColor('invalid')).toBe('#6B7280');
    });

    it('should get payment method display name correctly', () => {
      expect((productService as any).getPaymentMethodDisplayName('UPI')).toBe('UPI');
      expect((productService as any).getPaymentMethodDisplayName('COD')).toBe('Cash on Delivery');
      expect((productService as any).getPaymentMethodDisplayName('Cashfree')).toBe(
        'Cashfree Payment Gateway'
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(productService.getProducts()).rejects.toThrow('Network Error');
    });

    it('should handle API errors with proper error codes', async () => {
      const apiError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'PRODUCTS_FETCH_FAILED',
              message: 'Failed to fetch products',
            },
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(apiError);

      await expect(productService.getProducts()).rejects.toThrow('Failed to fetch products');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      vi.mocked(apiClient.get).mockRejectedValue(timeoutError);

      await expect(productService.getProducts()).rejects.toThrow('Request timeout');
    });
  });
});
