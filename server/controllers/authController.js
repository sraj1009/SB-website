import User from '../models/User.js';
import jwtService from '../services/jwtService.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

/**
 * Helper to set cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.env === 'production' || process.env.NODE_ENV === 'production',
    sameSite: 'none', // Required for cross-site auth (e.g. if frontend and backend are on different domains)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matching refresh token)
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie('refreshToken', refreshToken, cookieOptions);
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, address } = req.body;

    // Check if email already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    // Create user (map fullName to name for schema)
    const user = await User.create({
      name: fullName,
      email,
      password,
      phone,
      address,
    });

    // Generate tokens
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    const accessToken = jwtService.generateAccessToken(user);
    const refreshToken = await jwtService.generateRefreshToken(user, ip, userAgent);

    // Record login
    await user.recordLogin(ip, userAgent);

    logger.info(`New user registered: ${email}`);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sign in user
 * @route   POST /api/v1/auth/signin
 * @access  Public
 */
export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password +loginHistory');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Check if user can login
    if (!user.canLogin()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: `Your account is ${user.status}. Please contact support.`,
        },
      });
    }

    // Generate tokens
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    const accessToken = jwtService.generateAccessToken(user);
    const refreshToken = await jwtService.generateRefreshToken(user, ip, userAgent);

    // Record login
    await user.recordLogin(ip, userAgent);

    logger.info(`User signed in: ${email}`);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Signed in successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName || user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public (requires valid refresh token)
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    // Rotate tokens
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await jwtService.rotateRefreshToken(token, ip, userAgent);

    // Set cookies
    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.debug(`Token refresh failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token. Please sign in again.',
      },
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Public
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (token) {
      await jwtService.invalidateRefreshToken(token);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName || user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          address: user.address,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
export const updateMe = async (req, res, next) => {
  try {
    const { fullName, phone, address } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = { ...req.user.address, ...address };

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
