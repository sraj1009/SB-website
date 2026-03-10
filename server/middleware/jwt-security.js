const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * Advanced JWT Security with comprehensive protection
 */
class JWTSecurity {
  constructor() {
    this.blacklist = new Set();
    this.refreshTokenStore = new Map();
    this.failedAttempts = new Map();
    this.keyRotationSchedule = new Map();
    
    // Initialize rate limiting for auth endpoints
    this.authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`,
      skipSuccessfulRequests: true
    });
  }

  // Generate secure JWT tokens with additional claims
  generateTokens(payload, options = {}) {
    const jwtPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // JWT ID for token tracking
      sid: crypto.randomUUID(), // Session ID
      iss: process.env.JWT_ISSUER || 'singglebee',
      aud: process.env.JWT_AUDIENCE || 'singglebee-users'
    };

    const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: options.accessTokenExpiry || '15m',
      algorithm: 'HS256',
      keyid: 'access-key-v1'
    });

    const refreshTokenPayload = {
      ...jwtPayload,
      type: 'refresh',
      tokenVersion: 1
    };

    const refreshToken = jwt.sign(refreshTokenPayload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: options.refreshTokenExpiry || '7d',
      algorithm: 'HS256',
      keyid: 'refresh-key-v1'
    });

    // Store refresh token for revocation
    this.refreshTokenStore.set(refreshTokenPayload.jti, {
      userId: payload.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      tokenVersion: 1,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      tokenType: 'Bearer'
    };
  }

  // Verify JWT token with comprehensive checks
  verifyToken(token, tokenType = 'access') {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/, '');
      
      // Check if token is blacklisted
      if (this.blacklist.has(cleanToken)) {
        throw new Error('Token has been revoked');
      }

      const secret = tokenType === 'refresh' ? 
        process.env.JWT_REFRESH_SECRET : 
        process.env.JWT_SECRET;

      const decoded = jwt.verify(cleanToken, secret, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER || 'singglebee',
        audience: process.env.JWT_AUDIENCE || 'singglebee-users'
      });

      // Additional security checks
      if (decoded.type && decoded.type !== tokenType) {
        throw new Error('Invalid token type');
      }

      // Check if user session is still valid
      if (tokenType === 'refresh') {
        const storedToken = this.refreshTokenStore.get(decoded.jti);
        if (!storedToken || storedToken.revoked) {
          throw new Error('Refresh token has been revoked');
        }
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token format');
      } else {
        throw error;
      }
    }
  }

  // Refresh access token
  refreshToken(refreshToken, ipAddress, userAgent) {
    try {
      const decoded = this.verifyToken(refreshToken, 'refresh');
      
      const storedToken = this.refreshTokenStore.get(decoded.jti);
      if (!storedToken) {
        throw new Error('Refresh token not found');
      }

      // Check for suspicious activity
      if (storedToken.ipAddress !== ipAddress) {
        console.warn('Refresh token used from different IP:', {
          userId: storedToken.userId,
          originalIP: storedToken.ipAddress,
          newIP: ipAddress,
          timestamp: new Date().toISOString()
        });
        
        // Optionally revoke token for IP change
        // this.revokeRefreshToken(decoded.jti);
        // throw new Error('Suspicious activity detected');
      }

      // Generate new tokens
      const newTokens = this.generateTokens({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }, {
        ipAddress,
        userAgent
      });

      // Revoke old refresh token
      this.revokeRefreshToken(decoded.jti);

      return newTokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Revoke refresh token
  revokeRefreshToken(tokenId) {
    const storedToken = this.refreshTokenStore.get(tokenId);
    if (storedToken) {
      storedToken.revoked = true;
      storedToken.revokedAt = new Date();
      storedToken.revokedReason = 'User logout';
    }
  }

  // Revoke all user tokens
  revokeAllUserTokens(userId) {
    for (const [tokenId, token] of this.refreshTokenStore.entries()) {
      if (token.userId === userId) {
        token.revoked = true;
        token.revokedAt = new Date();
        token.revokedReason = 'User session terminated';
      }
    }
  }

  // Add token to blacklist
  blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        this.blacklist.add(token);
        
        // Auto-remove from blacklist when token expires
        const expiryTime = decoded.exp * 1000 - Date.now();
        if (expiryTime > 0) {
          setTimeout(() => {
            this.blacklist.delete(token);
          }, expiryTime);
        }
      }
    } catch (error) {
      console.error('Failed to blacklist token:', error);
    }
  }

  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [tokenId, token] of this.refreshTokenStore.entries()) {
      if (token.expiresAt < now) {
        this.refreshTokenStore.delete(tokenId);
        cleanedCount++;
      }
    }

    // Clean up failed attempts older than 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (attempts.lastAttempt < oneHourAgo) {
        this.failedAttempts.delete(key);
      }
    }

    return cleanedCount;
  }

  // Check failed attempts for rate limiting
  checkFailedAttempts(identifier) {
    const attempts = this.failedAttempts.get(identifier) || {
      count: 0,
      lastAttempt: new Date(),
      lockedUntil: null
    };

    const now = new Date();
    
    // Check if account is locked
    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      const remainingTime = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
    }

    // Reset count if last attempt was more than 15 minutes ago
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      attempts.count = 0;
    }

    return attempts;
  }

  // Record failed attempt
  recordFailedAttempt(identifier) {
    const attempts = this.failedAttempts.get(identifier) || {
      count: 0,
      lastAttempt: new Date(),
      lockedUntil: null
    };

    attempts.count++;
    attempts.lastAttempt = new Date();

    // Lock account after 5 failed attempts
    if (attempts.count >= 5) {
      attempts.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      console.warn('Account locked due to multiple failed attempts:', {
        identifier,
        attempts: attempts.count,
        lockedUntil: attempts.lockedUntil
      });
    }

    this.failedAttempts.set(identifier, attempts);
  }

  // Get token statistics
  getTokenStats() {
    const now = new Date();
    const activeTokens = Array.from(this.refreshTokenStore.values())
      .filter(token => !token.revoked && token.expiresAt > now);

    return {
      totalRefreshTokens: this.refreshTokenStore.size,
      activeRefreshTokens: activeTokens.length,
      blacklistedTokens: this.blacklist.size,
      failedAttempts: this.failedAttempts.size,
      lockedAccounts: Array.from(this.failedAttempts.values())
        .filter(attempts => attempts.lockedUntil && attempts.lockedUntil > now).length
    };
  }
}

// Middleware functions
const jwtSecurity = new JWTSecurity();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwtSecurity.verifyToken(token, 'access');
    req.user = decoded;
    req.tokenId = decoded.jti;
    req.sessionId = decoded.sid;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    let statusCode = 401;
    let errorCode = 'INVALID_TOKEN';

    if (error.message.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message.includes('revoked')) {
      errorCode = 'TOKEN_REVOKED';
    }

    res.status(statusCode).json({
      error: error.message,
      code: errorCode
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwtSecurity.verifyToken(token, 'access');
      req.user = decoded;
      req.tokenId = decoded.jti;
      req.sessionId = decoded.sid;
    } catch (error) {
      // Don't fail the request, just don't set user
      console.warn('Optional auth failed:', error.message);
    }
  }

  next();
};

// Role-based authorization
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Rate limiting for authentication endpoints
const authRateLimit = jwtSecurity.authLimiter;

// Token refresh endpoint
const refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const newTokens = jwtSecurity.refreshToken(refreshToken, ipAddress, userAgent);

    res.json({
      success: true,
      data: newTokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: error.message,
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
};

// Logout endpoint
const logoutHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwtSecurity.blacklistToken(token);
    }

    // Revoke all user tokens if requested
    if (req.body.logoutAll && req.user) {
      jwtSecurity.revokeAllUserTokens(req.user.userId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

// Token statistics endpoint
const tokenStatsHandler = async (req, res) => {
  try {
    const stats = jwtSecurity.getTokenStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Token stats error:', error);
    res.status(500).json({
      error: 'Failed to get token statistics',
      code: 'STATS_ERROR'
    });
  }
};

// Cleanup expired tokens (run periodically)
const cleanupTokens = () => {
  const cleanedCount = jwtSecurity.cleanupExpiredTokens();
  console.log(`Cleaned up ${cleanedCount} expired tokens`);
};

// Run cleanup every hour
setInterval(cleanupTokens, 60 * 60 * 1000);

module.exports = {
  JWTSecurity,
  jwtSecurity,
  authenticateToken,
  optionalAuth,
  authorize,
  authRateLimit,
  refreshTokenHandler,
  logoutHandler,
  tokenStatsHandler,
  cleanupTokens
};
