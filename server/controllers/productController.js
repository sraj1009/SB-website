import Product from '../models/Product.js';
import logger from '../utils/logger.js';
import apiCache from '../utils/cache.js';

/**
 * @desc    Get all products (with pagination, filtering, search)
 * @route   GET /api/v1/products
 * @access  Public
 */
export const getProducts = async (req, res, next) => {
  try {
    // Generate cache key
    const cacheKey = apiCache.generateKey('products', req.query);

    // Check cache
    const cachedData = await apiCache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.json({
        success: true,
        ...cachedData,
        fromCache: true,
      });
    }

    const {
      page = 1,
      limit = 12,
      category,
      status = 'active',
      bestseller,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      language,
    } = req.query;

    // Build filter
    const filter = { isDeleted: false }; // Consistent with findActive

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    } else {
      // Default: show only active and out_of_stock
      filter.status = { $in: ['active', 'out_of_stock'] };
    }

    if (bestseller !== undefined) {
      filter.bestseller = bestseller === 'true';
    }

    if (language) {
      filter.language = language;
    }

    // Price range filter
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min) || !isNaN(max)) {
      filter.price = {};
      if (!isNaN(min)) filter.price.$gte = min;
      if (!isNaN(max)) filter.price.$lte = max;
    }

    // Advanced search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { author: searchRegex },
        { sku: searchRegex }
      ];
    }

    // Build sort
    const validSortFields = ['createdAt', 'price', 'rating', 'name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query with pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.set('X-Total-Count', total.toString());
    res.set('X-Total-Pages', totalPages.toString());

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasMore: pageNum < totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/v1/products/:id
 * @access  Public
 */
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/v1/products
 * @access  Admin
 */
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    logger.info(`Product created: ${product.title} (${product.sku})`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/v1/products/:id
 * @access  Admin
 */
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    logger.info(`Product updated: ${product.title} (${product.sku})`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Adjust product stock
 * @route   PATCH /api/v1/products/:id/stock
 * @access  Admin
 */
export const adjustStock = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    const oldStock = product.stockQuantity;

    try {
      await product.adjustStock(quantity);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: err.message,
        },
      });
    }

    logger.info(
      `Stock adjusted for ${product.title}: ${oldStock} -> ${product.stockQuantity} (${quantity >= 0 ? '+' : ''}${quantity}). Reason: ${reason || 'Not specified'}`
    );

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        product: {
          id: product._id,
          title: product.title,
          sku: product.sku,
          previousStock: oldStock,
          newStock: product.stockQuantity,
          adjustment: quantity,
          status: product.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/v1/products/:id
 * @access  Admin
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    await product.softDelete();

    logger.info(`Product soft deleted: ${product.title} (${product.sku})`);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products (including deleted) for admin
 * @route   GET /api/v1/admin/products
 * @access  Admin
 */
export const getAllProductsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, includeDeleted = 'false' } = req.query;

    const filter = {};
    if (includeDeleted !== 'true') {
      filter.isDeleted = { $ne: true };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('+isDeleted')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const result = {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get related products (same category or language)
 * @route   GET /api/v1/products/:id/related
 * @access  Public
 */
export const getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      isDeleted: false,
      status: 'active',
      $or: [{ category: product.category }, { language: product.language }],
    })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: { products: relatedProducts },
    });
  } catch (error) {
    next(error);
  }
};
