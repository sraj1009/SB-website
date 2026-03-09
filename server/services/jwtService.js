import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

/**
 * JWT Service for token generation and verification
 */
class JWTService {
  constructor() {
    this.accessSecret = config.jwt.accessSecret;
    this.refreshSecret = config.jwt.refreshSecret;
    this.accessExpiresIn = config.jwt.accessExpiration;
    this.refreshExpiresIn = config.jwt.refreshExpiration;
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @returns {string} JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      issuer: 'singglebee-api',
      audience: 'singglebee-client',
    });
  }

  /**
   * Generate refresh token and store in database
   * @param {Object} user - User object
   * @param {string} ip - Client IP
   * @param {string} userAgent - Client user agent
   * @returns {Promise<string>} Refresh token
   */
  async generateRefreshToken(user, ip = null, userAgent = null) {
    // Generate a random token
    const tokenValue = crypto.randomBytes(64).toString('hex');

    // Calculate expiry
    const expiresAt = this.calculateExpiry(this.refreshExpiresIn);

    // Create token in database
    const refreshToken = await RefreshToken.create({
      token: tokenValue,
      user: user._id,
      expiresAt,
      ip,
      userAgent,
    });

    logger.debug(`Refresh token created for user ${user.email}`);
    return refreshToken.token;
  }

  /**
   * Verify access token
   * @param {string} token - JWT access token
   * @returns {Object} Decoded payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessSecret, {
        issuer: 'singglebee-api',
        audience: 'singglebee-client',
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const err = new Error('Access token has expired');
        err.name = 'TokenExpiredError';
        throw err;
      }
      const err = new Error('Invalid access token');
      err.name = 'JsonWebTokenError';
      throw err;
    }
  }

  /**
   * Verify and rotate refresh token
   * @param {string} token - Refresh token
   * @param {string} ip - Client IP
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object>} New tokens and user
   */
  async rotateRefreshToken(token, ip = null, userAgent = null) {
    // Find the token in database
    const refreshToken = await RefreshToken.findOne({ token }).populate('user');

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    // Check if token is valid
    if (!refreshToken.isValid()) {
      // If token was already used, this might be a replay attack
      // Revoke all tokens for this user for security
      if (refreshToken.isRevoked) {
        logger.warn(`Potential token reuse detected for user ${refreshToken.user._id}`);
        await RefreshToken.revokeAllForUser(refreshToken.user._id);
      }
      throw new Error('Refresh token is invalid or expired');
    }

    // Check if user can still login
    const user = refreshToken.user;
    if (!user || !user.canLogin()) {
      await refreshToken.revoke();
      throw new Error('User account is not active');
    }

    // Generate new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user, ip, userAgent);

    // Revoke old refresh token (rotation)
    await refreshToken.revoke(newRefreshToken);

    logger.debug(`Tokens rotated for user ${user.email}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Invalidate refresh token (logout)
   * @param {string} token - Refresh token
   */
  async invalidateRefreshToken(token) {
    const refreshToken = await RefreshToken.findOne({ token });

    if (refreshToken) {
      await refreshToken.revoke();
      logger.debug('Refresh token invalidated');
    }
  }

  /**
   * Invalidate all tokens for a user (logout from all devices)
   * @param {string} userId - User ID
   */
  async invalidateAllUserTokens(userId) {
    await RefreshToken.revokeAllForUser(userId);
    logger.debug(`All tokens revoked for user ${userId}`);
  }

  /**
   * Calculate expiry date from string like '15m', '7d', '1h'
   * @param {string} expiresIn - Expiry string
   * @returns {Date} Expiry date
   */
  calculateExpiry(expiresIn) {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      // Default to 7 days if parsing fails
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now.getTime() + value * (multipliers[unit] || multipliers.d));
  }
}

// Export singleton instance
export default new JWTService();
