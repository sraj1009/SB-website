import crypto from 'crypto';
import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';
import jwtService from '../services/jwtService.js';
import logger from '../utils/logger.js';

/**
 * @desc    Request password reset
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'EMAIL_REQUIRED',
                    message: 'Email is required'
                }
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive password reset instructions.'
            });
        }

        // Invalidate any existing reset tokens
        await PasswordReset.invalidateAllForUser(user._id);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Store hashed token
        await PasswordReset.create({
            user: user._id,
            token: crypto.createHash('sha256').update(resetToken).digest('hex'),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        // Send email if configured (SMTP or SendGrid)
        if (process.env.SMTP_HOST || process.env.SENDGRID_API_KEY) {
            try {
                const emailService = await import('../services/emailService.js').then(m => m.default);
                await emailService.sendPasswordResetEmail(email, resetUrl);
            } catch (emailErr) {
                logger.error(`Failed to send password reset email: ${emailErr.message}`);
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'EMAIL_FAILED',
                        message: 'Could not send reset email. Please try again later.'
                    }
                });
            }
        } else if (process.env.NODE_ENV === 'development') {
            logger.info(`[DEV] Password reset link for ${email}: ${resetUrl}`);
            res.json({
                success: true,
                message: 'If an account exists with this email, you will receive password reset instructions.',
                devToken: resetToken
            });
            return;
        } else {
            logger.warn('Password reset requested but no email service configured. Set SMTP_HOST or SENDGRID_API_KEY.');
        }

        res.json({
            success: true,
            message: 'If an account exists with this email, you will receive password reset instructions.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Token and new password are required'
                }
            });
        }

        // Validate password strength
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordPattern.test(password)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'WEAK_PASSWORD',
                    message: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
                }
            });
        }

        // Hash the token to compare
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid reset token
        const resetRecord = await PasswordReset.findOne({
            token: hashedToken
        }).populate('user');

        if (!resetRecord || !resetRecord.isValid()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token'
                }
            });
        }

        const user = resetRecord.user;

        // Update password
        user.password = password;
        await user.save();

        // Mark token as used
        await resetRecord.markUsed();

        // Invalidate all user sessions (logout everywhere)
        await jwtService.invalidateAllUserTokens(user._id);

        logger.info(`Password reset successful for user ${user.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. Please login with your new password.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Change password (for logged-in users)
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Current password and new password are required'
                }
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_PASSWORD',
                    message: 'Current password is incorrect'
                }
            });
        }

        // Validate new password strength
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordPattern.test(newPassword)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'WEAK_PASSWORD',
                    message: 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
                }
            });
        }

        // Update password and clear force-change flag
        user.password = newPassword;
        if (user.mustChangePassword) {
            user.mustChangePassword = false;
        }
        await user.save();

        // Invalidate all refresh tokens (logout other devices)
        await jwtService.invalidateAllUserTokens(user._id);

        // Generate new tokens for current session
        const accessToken = jwtService.generateAccessToken(user);
        const refreshToken = await jwtService.generateRefreshToken(
            user,
            req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
            req.headers['user-agent']
        );

        logger.info(`Password changed for user ${user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully',
            data: {
                tokens: {
                    accessToken,
                    refreshToken
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
