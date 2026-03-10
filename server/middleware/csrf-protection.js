const crypto = require('crypto');
const cookie = require('cookie');

/**
 * Comprehensive CSRF Protection with double-submit cookies and tokens
 */
class CSRFProtection {
  constructor() {
    this.tokenStore = new Map();
    this.cookieStore = new Map();
    this.usedTokens = new Set();
    
    this.setupCleanupInterval();
  }

  // Generate CSRF token
  generateToken(sessionId, userAgent) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenData = {
      token,
      sessionId,
      userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      used: false
    };

    this.tokenStore.set(token, tokenData);
    
    return token;
  }

  // Validate CSRF token
  validateToken(token, sessionId, userAgent, method = 'POST') {
    if (!token) {
      return {
        valid: false,
        reason: 'Missing CSRF token'
      };
    }

    // Check if token has been used (prevent double submission)
    if (this.usedTokens.has(token)) {
      return {
        valid: false,
        reason: 'Token already used'
      };
    }

    const tokenData = this.tokenStore.get(token);
    
    if (!tokenData) {
      return {
        valid: false,
        reason: 'Invalid CSRF token'
      };
    }

    // Check if token has expired
    if (tokenData.expiresAt < new Date()) {
      this.tokenStore.delete(token);
      return {
        valid: false,
        reason: 'CSRF token expired'
      };
    }

    // Check session ID
    if (tokenData.sessionId !== sessionId) {
      return {
        valid: false,
        reason: 'Session mismatch'
      };
    }

    // Check user agent (optional, for additional security)
    if (tokenData.userAgent !== userAgent) {
      console.warn('CSRF token user agent mismatch:', {
        expected: tokenData.userAgent,
        actual: userAgent,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Don't fail for user agent mismatch, but log it
      // return {
      //   valid: false,
      //   reason: 'User agent mismatch'
      // };
    }

    // Mark token as used for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      this.usedTokens.add(token);
      tokenData.used = true;
    }

    return {
      valid: true,
      tokenData
    };
  }

  // Generate CSRF cookie
  generateCSRFCookie(sessionId) {
    const cookieValue = crypto.randomBytes(24).toString('base64');
    const cookieData = {
      value: cookieValue,
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };

    this.cookieStore.set(sessionId, cookieData);
    
    return cookieValue;
  }

  // Validate CSRF cookie
  validateCSRFCookie(sessionId, cookieValue) {
    const cookieData = this.cookieStore.get(sessionId);
    
    if (!cookieData) {
      return {
        valid: false,
        reason: 'No CSRF cookie found'
      };
    }

    // Check if cookie has expired
    if (cookieData.expiresAt < new Date()) {
      this.cookieStore.delete(sessionId);
      return {
        valid: false,
        reason: 'CSRF cookie expired'
      };
    }

    // Check cookie value
    if (cookieData.value !== cookieValue) {
      return {
        valid: false,
        reason: 'CSRF cookie mismatch'
      };
    }

    return {
      valid: true,
      cookieData
    };
  }

  // Double-submit cookie validation
  validateDoubleSubmit(req) {
    const sessionId = req.session?.id || req.sessionId;
    const userAgent = req.get('User-Agent') || '';
    
    // Get token from header or body
    const headerToken = req.get('x-csrf-token');
    const bodyToken = req.body?._csrf || req.body?.csrfToken;
    const token = headerToken || bodyToken;

    // Get token from cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    const cookieToken = cookies['x-csrf-token'];

    // Validate token
    const tokenValidation = this.validateToken(token, sessionId, userAgent, req.method);
    if (!tokenValidation.valid) {
      return {
        valid: false,
        reason: tokenValidation.reason
      };
    }

    // Validate cookie
    const cookieValidation = this.validateCSRFCookie(sessionId, cookieToken);
    if (!cookieValidation.valid) {
      return {
        valid: false,
        reason: cookieValidation.reason
      };
    }

    // Compare token and cookie (double-submit pattern)
    if (token !== cookieToken) {
      return {
        valid: false,
        reason: 'Token and cookie mismatch'
      };
    }

    return {
      valid: true,
      tokenValidation,
      cookieValidation
    };
  }

  // SameSite cookie validation
  validateSameSite(req) {
    const referer = req.get('Referer');
    const origin = req.get('Origin');
    const host = req.get('Host');
    
    // For state-changing requests, validate referer/origin
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      if (!referer && !origin) {
        return {
          valid: false,
          reason: 'Missing referer and origin headers'
        };
      }

      // Check if request is from same origin
      if (origin && !origin.includes(host)) {
        return {
          valid: false,
          reason: 'Cross-origin request detected'
        };
      }

      if (referer && !referer.includes(host)) {
        return {
          valid: false,
          reason: 'Cross-origin referer detected'
        };
      }
    }

    return {
      valid: true
    };
  }

  // Clean up expired tokens and cookies
  cleanup() {
    const now = new Date();
    let cleanedTokens = 0;
    let cleanedCookies = 0;

    // Clean up expired tokens
    for (const [token, tokenData] of this.tokenStore.entries()) {
      if (tokenData.expiresAt < now) {
        this.tokenStore.delete(token);
        cleanedTokens++;
      }
    }

    // Clean up expired cookies
    for (const [sessionId, cookieData] of this.cookieStore.entries()) {
      if (cookieData.expiresAt < now) {
        this.cookieStore.delete(sessionId);
        cleanedCookies++;
      }
    }

    // Clean up used tokens older than 1 hour
    const oneHourAgo = new Date(now.getTime() - 3600000);
    for (const usedToken of this.usedTokens) {
      const tokenData = this.tokenStore.get(usedToken);
      if (tokenData && tokenData.createdAt < oneHourAgo) {
        this.tokenStore.delete(usedToken);
        this.usedTokens.delete(usedToken);
        cleanedTokens++;
      }
    }

    return {
      cleanedTokens,
      cleanedCookies
    };
  }

  // Setup cleanup interval
  setupCleanupInterval() {
    // Clean up every 30 minutes
    setInterval(() => {
      const result = this.cleanup();
      console.log('🧹 CSRF cleanup:', result);
    }, 30 * 60 * 1000);
  }

  // Get CSRF statistics
  getStats() {
    return {
      activeTokens: this.tokenStore.size,
      activeCookies: this.cookieStore.size,
      usedTokens: this.usedTokens.size,
      timestamp: new Date().toISOString()
    };
  }

  // Revoke all tokens for a session
  revokeSessionTokens(sessionId) {
    let revokedCount = 0;

    // Remove tokens for this session
    for (const [token, tokenData] of this.tokenStore.entries()) {
      if (tokenData.sessionId === sessionId) {
        this.tokenStore.delete(token);
        this.usedTokens.delete(token);
        revokedCount++;
      }
    }

    // Remove cookie for this session
    this.cookieStore.delete(sessionId);

    return revokedCount;
  }
}

// Singleton instance
const csrfProtection = new CSRFProtection();

// Middleware function
const csrfProtectionMiddleware = (req, res, next) => {
  try {
    // Skip CSRF protection for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip for API endpoints with other authentication methods
    if (req.path.startsWith('/api/') && req.get('Authorization')) {
      return next();
    }

    // Skip for webhook endpoints
    if (req.path.includes('/webhook') || req.path.includes('/hooks')) {
      return next();
    }

    // Get session ID
    const sessionId = req.session?.id || req.sessionId;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session required for CSRF protection',
        code: 'MISSING_SESSION'
      });
    }

    // Validate SameSite
    const sameSiteValidation = csrfProtection.validateSameSite(req);
    if (!sameSiteValidation.valid) {
      console.warn('CSRF SameSite validation failed:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        origin: req.get('Origin'),
        host: req.get('Host'),
        method: req.method,
        path: req.path,
        reason: sameSiteValidation.reason,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'Cross-origin request not allowed',
        code: 'CORS_VIOLATION'
      });
    }

    // Validate double-submit cookie
    const csrfValidation = csrfProtection.validateDoubleSubmit(req);
    if (!csrfValidation.valid) {
      console.warn('CSRF validation failed:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId,
        method: req.method,
        path: req.path,
        reason: csrfValidation.reason,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'CSRF validation failed',
        code: 'CSRF_VIOLATION',
        reason: csrfValidation.reason
      });
    }

    next();
  } catch (error) {
    console.error('CSRF protection error:', error);
    res.status(500).json({
      error: 'CSRF validation error',
      code: 'CSRF_ERROR'
    });
  }
};

// Token generation middleware
const csrfTokenMiddleware = (req, res, next) => {
  try {
    const sessionId = req.session?.id || req.sessionId;
    const userAgent = req.get('User-Agent') || '';

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session required for CSRF token',
        code: 'MISSING_SESSION'
      });
    }

    // Generate CSRF token
    const token = csrfProtection.generateToken(sessionId, userAgent);

    // Generate CSRF cookie
    const cookieValue = csrfProtection.generateCSRFCookie(sessionId);

    // Set CSRF cookie
    res.cookie('x-csrf-token', cookieValue, {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    // Add token to response
    res.locals.csrfToken = token;

    next();
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate CSRF token',
      code: 'TOKEN_GENERATION_ERROR'
    });
  }
};

// CSRF token endpoint
const csrfTokenHandler = (req, res) => {
  try {
    const sessionId = req.session?.id || req.sessionId;
    const userAgent = req.get('User-Agent') || '';

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session required for CSRF token',
        code: 'MISSING_SESSION'
      });
    }

    // Generate new CSRF token
    const token = csrfProtection.generateToken(sessionId, userAgent);

    // Generate new CSRF cookie
    const cookieValue = csrfProtection.generateCSRFCookie(sessionId);

    // Set CSRF cookie
    res.cookie('x-csrf-token', cookieValue, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
    });

    res.json({
      success: true,
      data: {
        csrfToken: token,
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    });
  } catch (error) {
    console.error('CSRF token endpoint error:', error);
    res.status(500).json({
      error: 'Failed to generate CSRF token',
      code: 'TOKEN_ERROR'
    });
  }
};

// CSRF statistics endpoint
const csrfStatsHandler = async (req, res) => {
  try {
    const stats = csrfProtection.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('CSRF stats error:', error);
    res.status(500).json({
      error: 'Failed to get CSRF statistics',
      code: 'STATS_ERROR'
    });
  }
};

// Revoke session tokens endpoint
const revokeSessionTokensHandler = async (req, res) => {
  try {
    const sessionId = req.session?.id || req.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    const revokedCount = csrfProtection.revokeSessionTokens(sessionId);
    
    res.json({
      success: true,
      data: {
        revokedCount,
        sessionId
      }
    });
  } catch (error) {
    console.error('Revoke session tokens error:', error);
    res.status(500).json({
      error: 'Failed to revoke session tokens',
      code: 'REVOKE_ERROR'
    });
  }
};

module.exports = {
  CSRFProtection,
  csrfProtection,
  csrfProtectionMiddleware,
  csrfTokenMiddleware,
  csrfTokenHandler,
  csrfStatsHandler,
  revokeSessionTokensHandler
};
