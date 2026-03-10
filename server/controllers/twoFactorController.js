import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * @desc    Setup 2FA for admin account
 * @route   POST /api/v1/admin/2fa/setup
 * @access  Private (Admin only)
 */
export const setup2FA = async (req, res, next) => {
  try {
    // Only allow admins to setup 2FA
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can setup 2FA',
        },
      });
    }

    const user = await User.findById(req.user._id);
    
    // Generate secret key
    const secret = speakeasy.generateSecret({
      name: `SINGGLEBEE Admin (${user.email})`,
      issuer: 'SINGGLEBEE',
      length: 32,
    });

    // Generate QR code for easy setup
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store temporary secret (not verified yet)
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false; // Will be enabled after verification
    await user.save();

    logger.info(`2FA setup initiated for admin: ${user.email}`);

    res.json({
      success: true,
      message: '2FA setup initiated. Please verify with your authenticator app.',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
      },
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    next(error);
  }
};

/**
 * @desc    Verify 2FA setup
 * @route   POST /api/v1/admin/2fa/verify
 * @access  Private (Admin only)
 */
export const verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Verification token is required',
        },
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can verify 2FA',
        },
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_2FA_SETUP',
          message: '2FA setup not initiated. Please setup 2FA first.',
        },
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps for clock drift
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid verification token',
        },
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    logger.info(`2FA enabled for admin: ${user.email}`);

    res.json({
      success: true,
      message: '2FA successfully enabled for your account',
      data: {
        twoFactorEnabled: true,
      },
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    next(error);
  }
};

/**
 * @desc    Disable 2FA
 * @route   POST /api/v1/admin/2fa/disable
 * @access  Private (Admin only)
 */
export const disable2FA = async (req, res, next) => {
  try {
    const { password, token } = req.body;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Password and 2FA token are required',
        },
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only administrators can disable 2FA',
        },
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        },
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: '2FA_NOT_ENABLED',
          message: '2FA is not enabled for this account',
        },
      });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid 2FA token',
        },
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    logger.info(`2FA disabled for admin: ${user.email}`);

    res.json({
      success: true,
      message: '2FA successfully disabled for your account',
      data: {
        twoFactorEnabled: false,
      },
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    next(error);
  }
};

/**
 * @desc    Verify 2FA token for login
 * @route   POST /api/v1/admin/2fa/verify-login
 * @access  Public
 */
export const verify2FALogin = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and 2FA token are required',
        },
      });
    }

    const user = await User.findOne({ email });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials',
        },
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: '2FA_NOT_ENABLED',
          message: '2FA is not enabled for this account',
        },
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid 2FA token',
        },
      });
    }

    logger.info(`2FA login verified for admin: ${user.email}`);

    res.json({
      success: true,
      message: '2FA token verified successfully',
    });
  } catch (error) {
    logger.error('2FA login verification error:', error);
    next(error);
  }
};
