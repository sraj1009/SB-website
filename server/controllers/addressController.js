import AddressBook from '../models/AddressBook.js';
import logger from '../utils/logger.js';

/**
 * @desc    Get user's address book
 * @route   GET /api/v1/addresses
 * @access  Private
 */
export const getAddresses = async (req, res, next) => {
  try {
    const addressBook = await AddressBook.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: {
        addresses: addressBook.addresses,
        count: addressBook.addresses.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add new address
 * @route   POST /api/v1/addresses
 * @access  Private
 */
export const addAddress = async (req, res, next) => {
  try {
    const addressBook = await AddressBook.getOrCreate(req.user._id);
    const address = await addressBook.addAddress(req.body);

    logger.debug(`Address added for user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { address },
    });
  } catch (error) {
    if (error.message.includes('Maximum')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MAX_ADDRESSES',
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/v1/addresses/:addressId
 * @access  Private
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const addressBook = await AddressBook.findOne({ user: req.user._id });

    if (!addressBook) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address book not found',
        },
      });
    }

    const address = await addressBook.updateAddress(addressId, req.body);

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { address },
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found',
        },
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/v1/addresses/:addressId
 * @access  Private
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const addressBook = await AddressBook.findOne({ user: req.user._id });

    if (!addressBook) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address book not found',
        },
      });
    }

    await addressBook.removeAddress(addressId);

    res.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found',
        },
      });
    }
    next(error);
  }
};

/**
 * @desc    Set default address
 * @route   PATCH /api/v1/addresses/:addressId/default
 * @access  Private
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const addressBook = await AddressBook.findOne({ user: req.user._id });

    if (!addressBook) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address book not found',
        },
      });
    }

    const address = await addressBook.setDefault(addressId);

    res.json({
      success: true,
      message: 'Default address updated',
      data: { address },
    });
  } catch (error) {
    if (error.message === 'Address not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found',
        },
      });
    }
    next(error);
  }
};
