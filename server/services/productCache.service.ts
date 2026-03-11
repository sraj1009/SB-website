import { RedisClient } from '../config/redis.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  language?: string;
  bestseller?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

interface ProductListResponse {
  products: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Product caching service using Cache-Aside pattern
 */
export class ProductCacheService {
  private static instance: ProductCacheService;
  private redis = RedisClient.getInstance().getClient();

  static getInstance(): ProductCacheService {
    if (!ProductCacheService.instance) {
      ProductCacheService.instance = new ProductCacheService();
    }
    return ProductCacheService.instance;
  }

  /**
   * Get products with caching
   */
  async getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const cacheKey = RedisClient.getKeys.products.listing(
      filters.page || 1,
      filters.limit || 20,
      filters
    );

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Products cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug(`Products cache miss: ${cacheKey}`);
      const products = await this.fetchProductsFromDB(filters);

      // Cache the result
      await this.redis.setex(cacheKey, RedisClient.TTL.products.listing, JSON.stringify(products));

      return products;
    } catch (error) {
      logger.error('Product cache service error:', error);
      // Fallback to database
      return this.fetchProductsFromDB(filters);
    }
  }

  /**
   * Get single product by ID with caching
   */
  async getProductById(id: string): Promise<any> {
    const cacheKey = RedisClient.getKeys.products.byId(id);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Product cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug(`Product cache miss: ${cacheKey}`);
      const product = await Product.findById(id);

      if (product) {
        // Cache the result
        await this.redis.setex(cacheKey, RedisClient.TTL.products.byId, JSON.stringify(product));
      }

      return product;
    } catch (error) {
      logger.error('Product cache service error:', error);
      // Fallback to database
      return Product.findById(id);
    }
  }

  /**
   * Get products by category with caching
   */
  async getProductsByCategory(category: string, limit: number = 10): Promise<any[]> {
    const cacheKey = RedisClient.getKeys.products.byCategory(category);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Category products cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug(`Category products cache miss: ${cacheKey}`);
      const products = await Product.find({
        category,
        isDeleted: { $ne: true },
        status: 'active',
      })
        .limit(limit)
        .sort({ createdAt: -1 });

      // Cache the result
      await this.redis.setex(
        cacheKey,
        RedisClient.TTL.products.byCategory,
        JSON.stringify(products)
      );

      return products;
    } catch (error) {
      logger.error('Product cache service error:', error);
      // Fallback to database
      return Product.find({
        category,
        isDeleted: { $ne: true },
        status: 'active',
      })
        .limit(limit)
        .sort({ createdAt: -1 });
    }
  }

  /**
   * Search products with caching
   */
  async searchProducts(query: string, limit: number = 20): Promise<any[]> {
    const cacheKey = RedisClient.getKeys.products.search(query);

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Search products cache hit: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Cache miss - fetch from database
      logger.debug(`Search products cache miss: ${cacheKey}`);
      const products = await Product.find({
        $and: [
          { isDeleted: { $ne: true } },
          { status: 'active' },
          {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } },
              { author: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { sku: { $regex: query, $options: 'i' } },
            ],
          },
        ],
      })
        .limit(limit)
        .sort({ rating: -1, createdAt: -1 });

      // Cache the result
      await this.redis.setex(cacheKey, RedisClient.TTL.products.search, JSON.stringify(products));

      return products;
    } catch (error) {
      logger.error('Product cache service error:', error);
      // Fallback to database
      return Product.find({
        $and: [
          { isDeleted: { $ne: true } },
          { status: 'active' },
          {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } },
              { author: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { sku: { $regex: query, $options: 'i' } },
            ],
          },
        ],
      })
        .limit(limit)
        .sort({ rating: -1, createdAt: -1 });
    }
  }

  /**
   * Invalidate product cache entries
   */
  async invalidateProductCache(productId?: string): Promise<void> {
    const patterns = [
      'singglebee:products:page:*', // All product listings
      'singglebee:products:category:*', // All category caches
      'singglebee:products:search:*', // All search caches
    ];

    if (productId) {
      // Also invalidate specific product
      await this.redis.del(RedisClient.getKeys.products.byId(productId));
    }

    // Invalidate pattern-based caches
    for (const pattern of patterns) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.debug(`Invalidated ${keys.length} product cache keys for pattern: ${pattern}`);
        }
      } catch (error) {
        logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Warm up product cache with popular data
   */
  async warmupCache(): Promise<void> {
    logger.info('Starting product cache warmup...');

    try {
      // Cache homepage products
      await this.getProducts({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

      // Cache products by category
      const categories = ['Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'];
      for (const category of categories) {
        await this.getProductsByCategory(category, 10);
      }

      // Cache bestsellers
      await this.getProducts({ bestseller: true, limit: 10 });

      logger.info('Product cache warmup completed');
    } catch (error) {
      logger.error('Product cache warmup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all product cache
   */
  async clearAllCache(): Promise<number> {
    const pattern = 'singglebee:products:*';

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        logger.info(`Cleared ${deleted} product cache entries`);
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Failed to clear product cache:', error);
      return 0;
    }
  }

  /**
   * Fetch products from database (private helper)
   */
  private async fetchProductsFromDB(filters: ProductFilters): Promise<ProductListResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      language,
      bestseller,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = filters;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = {};

    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (language) {
      filter.language = language;
    }

    if (bestseller !== undefined) {
      filter.bestseller = bestseller;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Parse Redis info response
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};

    for (const line of lines) {
      if (line.startsWith('#') || line === '') continue;

      const [key, value] = line.split(':');
      if (key && value) {
        // Convert numeric values
        const numValue = parseFloat(value);
        result[key] = isNaN(numValue) ? value : numValue;
      }
    }

    return result;
  }
}

// Export singleton instance
export const productCacheService = ProductCacheService.getInstance();

export default productCacheService;
