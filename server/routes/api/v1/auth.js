import express from 'express';
import { signup, signin, refreshToken, logout, getMe, updateMe } from '../../../controllers/authController.js';
import { forgotPassword, resetPassword, changePassword } from '../../../controllers/passwordController.js';
import { authenticate } from '../../../middleware/auth.js';
import { authLimiter } from '../../../middleware/rateLimiter.js';
import validate from '../../../middleware/validate.js';
import { signupSchema, signinSchema, refreshTokenSchema, updateProfileSchema } from '../../../validators/authValidators.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authLimiter, validate(signupSchema), signup);

/**
 * @route   POST /api/v1/auth/signin
 * @desc    Sign in user
 * @access  Public
 */
router.post('/signin', authLimiter, validate(signinSchema), signin);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, validate(updateProfileSchema), updateMe);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authLimiter, resetPassword);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (logged in users)
 * @access  Private
 */
router.post('/change-password', authenticate, changePassword);

export default router;

