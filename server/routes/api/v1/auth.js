import express from 'express';
import {
  signup,
  signin,
  refreshToken,
  logout,
  getMe,
  updateMe,
} from '../../../controllers/authController.js';
import {
  forgotPassword,
  resetPassword,
  changePassword,
} from '../../../controllers/passwordController.js';
import { authenticate } from '../../../middleware/auth.js';
import { authLimiter } from '../../../middleware/rateLimiter.js';
import { validateRequest } from '../../../middleware/zodValidate.js';
import {
  signupSchema,
  signinSchema,
  refreshTokenSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../../../schemas/authSchemas.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: {type: string}
 *               email: {type: string, format: email}
 *               password: {type: string, format: password}
 *               phone: {type: string}
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/signup', authLimiter, validateRequest(signupSchema), signup);

/**
 * @swagger
 * /api/v1/auth/signin:
 *   post:
 *     summary: Sign in user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: {type: string, format: email}
 *               password: {type: string}
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/signin', authLimiter, validateRequest(signinSchema), signin);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRequest(refreshTokenSchema), refreshToken);

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
router.put('/me', authenticate, validateRequest(updateProfileSchema), updateMe);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), resetPassword);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (logged in users)
 * @access  Private
 */
router.post('/change-password', authenticate, validateRequest(changePasswordSchema), changePassword);

export default router;
