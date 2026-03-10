import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/stats
 * @access  Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    const endDate = new Date();

    // Product stats
    const totalProducts = await Product.countDocuments({ isDeleted: { $ne: true } });
    const activeProducts = await Product.countDocuments({ 
      isDeleted: { $ne: true }, 
      status: 'active' 
    });
    const outOfStockProducts = await Product.countDocuments({ 
      isDeleted: { $ne: true }, 
      status: 'out_of_stock' 
    });
    const lowStockProducts = await Product.countDocuments({ 
      isDeleted: { $ne: true }, 
      stockQuantity: { $lt: 10, $gt: 0 } 
    });

    // Order stats
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const pendingOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'pending'
    });
    const verifiedOrders = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'verified'
    });

    // Revenue stats
    const revenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['verified', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const { totalRevenue = 0, averageOrderValue = 0 } = revenueData[0] || {};

    // User stats
    const totalUsers = await User.countDocuments();
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Category distribution for products
    const categoryData = await Product.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const stats = {
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        verified: verifiedOrders,
      },
      revenue: {
        total: totalRevenue,
        averageOrderValue: averageOrderValue,
      },
      users: {
        total: totalUsers,
        recent: recentUsers,
      },
      categoryDistribution: categoryData.map(cat => ({
        category: cat._id,
        count: cat.count
      })),
      period,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

/**
 * @desc    Get all products for admin (with pagination and filtering)
 * @route   GET /api/v1/admin/products
 * @access  Admin
 */
export const getAdminProducts = async (req, res, next) => {
  try {
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
      includeDeleted = false
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    let filter = {};
    
    if (includeDeleted !== 'true') {
      filter.isDeleted = { $ne: true };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
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
      filter.bestseller = bestseller === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching admin products:', error);
    next(error);
  }
};

/**
 * @desc    Get single product for admin
 * @route   GET /api/v1/admin/products/:id
 * @access  Admin
 */
export const getAdminProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    
    if (!product) {
      return next(new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404));
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    logger.error('Error fetching admin product:', error);
    next(error);
  }
};

/**
 * @desc    Create new product (admin)
 * @route   POST /api/v1/admin/products
 * @access  Admin
 */
export const createAdminProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    
    // Handle image upload if present
    if (req.file) {
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Add to images array
      if (!productData.images) {
        productData.images = [];
      }
      
      productData.images.push({
        url: imageUrl,
        alt: productData.title || 'Product image',
        isPrimary: true
      });
      
      // Set legacy image field for backward compatibility
      productData.image = imageUrl;
    }

    const product = await Product.create(productData);

    logger.info(`Product created by admin: ${product.title} (${product.sku})`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    logger.error('Error creating admin product:', error);
    next(error);
  }
};

/**
 * @desc    Update product (admin)
 * @route   PUT /api/v1/admin/products/:id
 * @access  Admin
 */
export const updateAdminProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findById(id);
    
    if (!product) {
      return next(new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404));
    }

    // Handle image upload if present
    if (req.file) {
      const imageUrl = `/uploads/${req.file.filename}`;
      
      // Add to images array or update existing
      if (!updateData.images) {
        updateData.images = product.images || [];
      }
      
      // Remove old primary image and set new one as primary
      updateData.images = updateData.images.map(img => ({ ...img, isPrimary: false }));
      updateData.images.push({
        url: imageUrl,
        alt: updateData.title || product.title || 'Product image',
        isPrimary: true
      });
      
      // Set legacy image field for backward compatibility
      updateData.image = imageUrl;
    }

    // Handle image array updates
    if (updateData.images && typeof updateData.images === 'string') {
      try {
        updateData.images = JSON.parse(updateData.images);
      } catch (e) {
        return next(new AppError('Invalid images format', 'INVALID_IMAGES', 400));
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info(`Product updated by admin: ${updatedProduct.title} (${updatedProduct.sku})`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    logger.error('Error updating admin product:', error);
    next(error);
  }
};

/**
 * @desc    Delete product (admin - soft delete)
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Admin
 */
export const deleteAdminProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    
    if (!product) {
      return next(new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404));
    }

    // Soft delete
    await product.softDelete();

    logger.info(`Product deleted by admin: ${product.title} (${product.sku})`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting admin product:', error);
    next(error);
  }
};

/**
 * @desc    Get all orders for admin (with pagination and filtering)
 * @route   GET /api/v1/admin/orders
 * @access  Admin
 */
export const getAdminOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (search) {
      filter.$or = [
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.fullName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate('user', 'email fullName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching admin orders:', error);
    next(error);
  }
};

/**
 * @desc    Verify/reject order
 * @route   PUT /api/v1/admin/orders/:id/verify
 * @access  Admin
 */
export const verifyOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, adminNotes } = req.body;

    const order = await Order.findById(id).populate('user');
    
    if (!order) {
      return next(new AppError('Order not found', 'ORDER_NOT_FOUND', 404));
    }

    if (order.status !== 'pending') {
      return next(new AppError('Order is no longer pending', 'ORDER_NOT_PENDING', 400));
    }

    order.status = status;
    
    if (status === 'cancelled' && rejectionReason) {
      order.rejectionReason = rejectionReason;
    }
    
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }

    order.verifiedBy = req.user._id;
    order.verifiedAt = new Date();

    await order.save();

    logger.info(`Order ${status} by admin: ${order.orderId}`);

    res.json({
      success: true,
      message: `Order ${status} successfully`,
      data: { order }
    });
  } catch (error) {
    logger.error('Error verifying order:', error);
    next(error);
  }
};

export default {
  getDashboardStats,
  getAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  verifyOrder,
};
