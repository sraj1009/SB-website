import User from '../models/User.js';
import Order from '../models/Order.js';
import AddressBook from '../models/AddressBook.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * @desc    Delete user data (Right to be Forgotten)
 * @route   DELETE /api/v1/users/me
 * @access  Private
 */
export const deleteUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Start a session for atomic operations
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Anonymize user data instead of hard delete (for data integrity)
      const anonymizedData = {
        name: 'Deleted User',
        email: `deleted_${userId}@deleted.com`,
        phone: '0000000000',
        address: {
          street: 'Deleted',
          city: 'Deleted',
          state: 'Deleted',
          zipCode: '00000',
          country: 'Deleted',
        },
        status: 'deleted',
        emailVerified: false,
        mustChangePassword: false,
        // Keep login history for audit but anonymize IP
        $set: {
          'loginHistory.$[].ip': 'anonymized',
          'loginHistory.$[].userAgent': 'anonymized',
        },
      };

      await User.findByIdAndUpdate(userId, anonymizedData, { session });

      // 2. Anonymize orders (keep for financial records but remove personal data)
      await Order.updateMany(
        { userId },
        {
          $set: {
            customerInfo: {
              name: 'Deleted User',
              email: `deleted_${userId}@deleted.com`,
              phone: '0000000000',
            },
            shippingAddress: {
              street: 'Deleted',
              city: 'Deleted',
              state: 'Deleted',
              zipCode: '00000',
              country: 'Deleted',
            },
            billingAddress: {
              street: 'Deleted',
              city: 'Deleted',
              state: 'Deleted',
              zipCode: '00000',
              country: 'Deleted',
            },
          },
        },
        { session }
      );

      // 3. Delete address book entries (personal data)
      await AddressBook.deleteMany({ userId }, { session });

      // 4. Delete refresh tokens
      await mongoose.connection.db
        .collection('refreshtokens')
        .deleteMany({ userId }, { session });

      // 5. Delete any other personal data collections
      // Add other collections here as needed

      await session.commitTransaction();
      session.endSession();

      logger.info(`User data deleted/anonymized for: ${user.email} (ID: ${userId})`);

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Your personal data has been successfully deleted in accordance with GDPR requirements',
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    logger.error('Data deletion error:', error);
    next(error);
  }
};

/**
 * @desc    Export user data (Data Portability)
 * @route   GET /api/v1/users/me/export
 * @access  Private
 */
export const exportUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Collect all user data
    const userData = {
      personalInfo: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        address: user.address,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
      },
      orders: await Order.find({ userId })
        .select('-__v')
        .sort({ createdAt: -1 }),
      addressBook: await AddressBook.find({ userId })
        .select('-__v')
        .sort({ createdAt: -1 }),
      loginHistory: user.loginHistory || [],
      metadata: {
        exportDate: new Date().toISOString(),
        exportFormat: 'JSON',
        version: '1.0',
      },
    };

    // Log the export for audit purposes
    logger.info(`User data exported for: ${user.email} (ID: ${userId})`);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="singglebee-data-export-${userId}-${Date.now()}.json"`
    );

    res.json(userData);
  } catch (error) {
    logger.error('Data export error:', error);
    next(error);
  }
};

/**
 * @desc    Get data processing activities
 * @route   GET /api/v1/users/me/data-activities
 * @access  Private
 */
export const getDataActivities = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Data processing activities as per GDPR Article 30
    const activities = {
      dataController: {
        name: 'SINGGLEBEE',
        contact: 'privacy@singglebee.com',
        representative: 'Data Protection Officer',
      },
      purposes: [
        {
          purpose: 'Order Processing',
          legalBasis: 'Contractual Necessity',
          dataCategories: ['Name', 'Email', 'Phone', 'Address', 'Order History'],
          retentionPeriod: '7 years after last order',
        },
        {
          purpose: 'Marketing Communications',
          legalBasis: 'Consent',
          dataCategories: ['Email', 'Name'],
          retentionPeriod: 'Until consent withdrawal',
        },
        {
          purpose: 'Analytics',
          legalBasis: 'Legitimate Interest',
          dataCategories: ['IP Address', 'Usage Patterns'],
          retentionPeriod: '2 years',
        },
        {
          purpose: 'Fraud Prevention',
          legalBasis: 'Legitimate Interest',
          dataCategories: ['IP Address', 'Login History', 'Order Patterns'],
          retentionPeriod: '5 years',
        },
      ],
      recipients: [
        {
          category: 'Payment Processors',
          entities: ['Cashfree', 'Razorpay'],
          purpose: 'Payment Processing',
        },
        {
          category: 'Shipping Partners',
          entities: ['Shiprocket', 'Delhivery'],
          purpose: 'Order Delivery',
        },
      ],
      rights: [
        'Right to Access',
        'Right to Rectification',
        'Right to Erasure',
        'Right to Portability',
        'Right to Object',
        'Right to Restrict Processing',
      ],
    };

    logger.info(`Data activities requested for: ${user.email} (ID: ${userId})`);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    logger.error('Data activities error:', error);
    next(error);
  }
};
