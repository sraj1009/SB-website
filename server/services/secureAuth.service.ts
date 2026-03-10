import bcrypt from 'bcrypt';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Security configuration
const SECURITY_CONFIG = {
  // Password hashing
  passwordHashing: {
    algorithm: 'argon2id', // Preferred over bcrypt
    argon2: {
      type: argon2.argon2id,
      memoryCost: 65536, // 64MB
      timeCost: 3, // 3 iterations
      parallelism: 4, // 4 threads
      hashLength: 32, // 32 bytes
    },
    bcrypt: {
      saltRounds: 12, // High cost for security
    },
  },
  
  // JWT configuration
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'singglebee.com',
    audience: 'singglebee-users',
    algorithm: 'HS256',
  },
  
  // Session management
  session: {
    maxConcurrentSessions: 5, // Max 5 devices per user
    sessionTimeout: 24 * 60 * 60, // 24 hours in seconds
  },
  
  // MFA configuration
  mfa: {
    issuer: 'SINGGLEBEE',
    window: 1, // Allow 1 step of clock drift for TOTP
    digits: 6,
  },
  
  // Rate limiting
  rateLimit: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60, // 15 minutes
    maxPasswordResetRequests: 3,
    passwordResetLockout: 60 * 60, // 1 hour
  },
};

/**
 * Secure Authentication Service
 * Implements zero-trust authentication with MFA and secure session management
 */
export class SecureAuthService {
  private static instance: SecureAuthService;
  private redis = redisClient;

  static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
  }

  /**
   * Hash password using Argon2id (preferred) or bcrypt as fallback
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Use Argon2id for best security
      return await argon2.hash(password, SECURITY_CONFIG.passwordHashing.argon2);
    } catch (error) {
      logger.warn('Argon2 hashing failed, falling back to bcrypt:', error);
      // Fallback to bcrypt
      return await bcrypt.hash(password, SECURITY_CONFIG.passwordHashing.bcrypt.saltRounds);
    }
  }

  /**
   * Verify password using appropriate algorithm
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Try Argon2 first
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      }
      // Fallback to bcrypt
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure JWT tokens with enhanced security
   */
  generateTokens(payload: any): { accessToken: string; refreshToken: string; jti: string } {
    const jti = crypto.randomUUID(); // JWT ID for token tracking
    
    // Access token (short-lived)
    const accessToken = jwt.sign(
      {
        ...payload,
        type: 'access',
        jti,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: SECURITY_CONFIG.jwt.accessTokenExpiry,
        issuer: SECURITY_CONFIG.jwt.issuer,
        audience: SECURITY_CONFIG.jwt.audience,
        algorithm: SECURITY_CONFIG.jwt.algorithm,
        subject: payload.userId.toString(),
      }
    );

    // Refresh token (long-lived, stored securely)
    const refreshToken = jwt.sign(
      {
        ...payload,
        type: 'refresh',
        jti,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: SECURITY_CONFIG.jwt.refreshTokenExpiry,
        issuer: SECURITY_CONFIG.jwt.issuer,
        audience: SECURITY_CONFIG.jwt.audience,
        algorithm: SECURITY_CONFIG.jwt.algorithm,
        subject: payload.userId.toString(),
      }
    );

    return { accessToken, refreshToken, jti };
  }

  /**
   * Verify JWT token with blacklist check
   */
  async verifyToken(token: string, type: 'access' | 'refresh'): Promise<any> {
    try {
      const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
      
      const decoded = jwt.verify(token, secret, {
        issuer: SECURITY_CONFIG.jwt.issuer,
        audience: SECURITY_CONFIG.jwt.audience,
        algorithms: [SECURITY_CONFIG.jwt.algorithm],
      }) as any;

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Verify token type
      if (decoded.type !== type) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Token verification error:', error);
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const blacklistKey = `singglebee:blacklist:${jti}`;
      const result = await this.redis.get(blacklistKey);
      return result !== null;
    } catch (error) {
      logger.error('Blacklist check error:', error);
      return false; // Fail open
    }
  }

  /**
   * Add token to blacklist
   */
  async blacklistToken(jti: string, expiresIn: number): Promise<void> {
    try {
      const blacklistKey = `singglebee:blacklist:${jti}`;
      await this.redis.setex(blacklistKey, expiresIn, JSON.stringify({
        blacklistedAt: new Date().toISOString(),
        reason: 'User logout or token refresh',
      }));
    } catch (error) {
      logger.error('Token blacklisting error:', error);
    }
  }

  /**
   * Generate MFA secret for user
   */
  generateMFASecret(userEmail: string): { secret: string; qrCodeUrl: string; backupCodes: string[] } {
    const secret = speakeasy.generateSecret({
      name: `SINGGLEBEE (${userEmail})`,
      issuer: SECURITY_CONFIG.mfa.issuer,
      length: 32,
    });

    // Generate QR code URL
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `SINGGLEBEE (${userEmail})`,
      issuer: SECURITY_CONFIG.mfa.issuer,
      algorithm: 'sha256',
      digits: SECURITY_CONFIG.mfa.digits,
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Generate QR code image
   */
  async generateQRCode(qrCodeUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrCodeUrl);
    } catch (error) {
      logger.error('QR code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token: string, secret: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: SECURITY_CONFIG.mfa.window,
        digits: SECURITY_CONFIG.mfa.digits,
      });
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const backupCodesKey = `singglebee:backup_codes:${userId}`;
      const storedCodes = await this.redis.get(backupCodesKey);
      
      if (!storedCodes) {
        return false;
      }

      const codes = JSON.parse(storedCodes);
      const codeIndex = codes.indexOf(code.toUpperCase());
      
      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      codes.splice(codeIndex, 1);
      await this.redis.set(backupCodesKey, JSON.stringify(codes));

      return true;
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return false;
    }
  }

  /**
   * Store backup codes for user
   */
  async storeBackupCodes(userId: string, backupCodes: string[]): Promise<void> {
    try {
      const backupCodesKey = `singglebee:backup_codes:${userId}`;
      await this.redis.set(backupCodesKey, JSON.stringify(backupCodes));
    } catch (error) {
      logger.error('Backup codes storage error:', error);
    }
  }

  /**
   * Manage user sessions
   */
  async manageSession(userId: string, jti: string, deviceInfo: any): Promise<void> {
    try {
      const sessionKey = `singglebee:sessions:${userId}`;
      const sessionData = {
        jti,
        deviceInfo,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      // Get current sessions
      const sessions = await this.redis.lrange(sessionKey, 0, -1);
      
      // Remove expired sessions
      const validSessions = sessions.filter(session => {
        try {
          const parsed = JSON.parse(session);
          const sessionAge = (Date.now() - new Date(parsed.lastActivity).getTime()) / 1000;
          return sessionAge < SECURITY_CONFIG.session.sessionTimeout;
        } catch {
          return false;
        }
      });

      // Add new session
      validSessions.push(JSON.stringify(sessionData));

      // Limit concurrent sessions
      if (validSessions.length > SECURITY_CONFIG.session.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSession = validSessions.shift();
        if (oldestSession) {
          const parsed = JSON.parse(oldestSession);
          await this.blacklistToken(parsed.jti, SECURITY_CONFIG.session.sessionTimeout);
        }
      }

      // Update sessions in Redis
      await this.redis.del(sessionKey);
      await this.redis.lpush(sessionKey, ...validSessions);
      await this.redis.expire(sessionKey, SECURITY_CONFIG.session.sessionTimeout);
    } catch (error) {
      logger.error('Session management error:', error);
    }
  }

  /**
   * Check login attempts and apply rate limiting
   */
  async checkLoginAttempts(identifier: string): Promise<{ allowed: boolean; remainingAttempts: number; lockoutTime?: number }> {
    try {
      const attemptsKey = `singglebee:login_attempts:${identifier}`;
      const lockoutKey = `singglebee:login_lockout:${identifier}`;

      // Check if user is locked out
      const lockoutData = await this.redis.get(lockoutKey);
      if (lockoutData) {
        const lockout = JSON.parse(lockoutData);
        const remainingTime = lockout.lockedUntil - Date.now();
        
        if (remainingTime > 0) {
          return {
            allowed: false,
            remainingAttempts: 0,
            lockoutTime: Math.ceil(remainingTime / 1000),
          };
        } else {
          // Lockout expired, remove it
          await this.redis.del(lockoutKey);
        }
      }

      // Get current attempts
      const attempts = await this.redis.get(attemptsKey) || '0';
      const attemptCount = parseInt(attempts);
      const remainingAttempts = Math.max(0, SECURITY_CONFIG.rateLimit.maxLoginAttempts - attemptCount - 1);

      if (remainingAttempts <= 0) {
        // Lock out the user
        const lockoutUntil = Date.now() + (SECURITY_CONFIG.rateLimit.lockoutDuration * 1000);
        await this.redis.setex(lockoutKey, SECURITY_CONFIG.rateLimit.lockoutDuration, JSON.stringify({
          lockedUntil,
          reason: 'Too many failed login attempts',
        }));
        
        // Clear attempts counter
        await this.redis.del(attemptsKey);

        return {
          allowed: false,
          remainingAttempts: 0,
          lockoutTime: SECURITY_CONFIG.rateLimit.lockoutDuration,
        };
      }

      return {
        allowed: true,
        remainingAttempts,
      };
    } catch (error) {
      logger.error('Login attempts check error:', error);
      return { allowed: true, remainingAttempts: SECURITY_CONFIG.rateLimit.maxLoginAttempts };
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(identifier: string): Promise<void> {
    try {
      const attemptsKey = `singglebee:login_attempts:${identifier}`;
      await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, SECURITY_CONFIG.rateLimit.lockoutDuration);
    } catch (error) {
      logger.error('Failed attempt recording error:', error);
    }
  }

  /**
   * Clear login attempts on successful login
   */
  async clearFailedAttempts(identifier: string): Promise<void> {
    try {
      const attemptsKey = `singglebee:login_attempts:${identifier}`;
      const lockoutKey = `singglebee:login_lockout:${identifier}`;
      
      await this.redis.del(attemptsKey);
      await this.redis.del(lockoutKey);
    } catch (error) {
      logger.error('Failed attempts clearing error:', error);
    }
  }

  /**
   * Logout user and invalidate all sessions
   */
  async logoutUser(userId: string, jti?: string): Promise<void> {
    try {
      // Blacklist specific token if provided
      if (jti) {
        await this.blacklistToken(jti, SECURITY_CONFIG.jwt.accessTokenExpiry);
      }

      // Get all user sessions
      const sessionKey = `singglebee:sessions:${userId}`;
      const sessions = await this.redis.lrange(sessionKey, 0, -1);

      // Blacklist all session tokens
      for (const session of sessions) {
        try {
          const parsed = JSON.parse(session);
          await this.blacklistToken(parsed.jti, SECURITY_CONFIG.jwt.refreshTokenExpiry);
        } catch (error) {
          logger.error('Session parsing error:', error);
        }
      }

      // Clear all sessions
      await this.redis.del(sessionKey);
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = await this.verifyToken(refreshToken, 'refresh');
      
      // Blacklist old refresh token
      await this.blacklistToken(decoded.jti, SECURITY_CONFIG.jwt.refreshTokenExpiry);
      
      // Generate new tokens
      const newTokens = this.generateTokens({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });

      return newTokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get session info for user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessionKey = `singglebee:sessions:${userId}`;
      const sessions = await this.redis.lrange(sessionKey, 0, -1);

      return sessions.map(session => {
        try {
          const parsed = JSON.parse(session);
          return {
            ...parsed,
            isCurrent: false, // Would need to compare with current token
          };
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      logger.error('Get sessions error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const secureAuthService = SecureAuthService.getInstance();

export default secureAuthService;
