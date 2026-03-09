import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get all users (admin)
 * @route   GET /api/v1/admin/users
 * @access  Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (role) filter.role = role;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort(sort).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * @desc    Get single user (admin)
 * @route   GET /api/v1/admin/users/:id
 * @access  Admin
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+loginHistory');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user status (ban/unban/suspend)
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Admin
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'banned', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be active, banned, or suspended',
        },
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Prevent admin from banning themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_BAN',
          message: 'You cannot change your own status',
        },
      });
    }

    // Prevent banning other admins (optional security measure)
    if (user.role === 'admin' && status !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ADMIN_PROTECTED',
          message: 'Cannot ban or suspend admin users',
        },
      });
    }

    // Use findByIdAndUpdate to avoid full-document re-validation
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    logger.info(`User ${updatedUser.email} status changed to ${status} by admin ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : status}`,
      data: {
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          status: updatedUser.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard stats (admin)
 * @route   GET /api/v1/admin/stats
 * @access  Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const Order = (await import('../models/Order.js')).default;
    const Product = (await import('../models/Product.js')).default;

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      recentOrders,
      lowStockProducts,
      orderStats,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isDeleted: { $ne: true } }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'fullName email').lean(),
      Product.find({ stockQuantity: { $lte: 5 }, isDeleted: { $ne: true } })
        .select('title sku stockQuantity status')
        .limit(10)
        .lean(),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.total' },
          },
        },
      ]),
    ]);

    // Calculate total revenue from paid orders
    const paidOrders = orderStats.find((s) => s._id === 'paid') || { totalRevenue: 0 };
    const deliveredOrders = orderStats.find((s) => s._id === 'delivered') || { totalRevenue: 0 };
    const totalRevenue = paidOrders.totalRevenue + deliveredOrders.totalRevenue;

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          pendingOrders,
          totalRevenue,
        },
        ordersByStatus: orderStats.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {}),
        recentOrders,
        lowStockProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
