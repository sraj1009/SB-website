import jwt from 'jsonwebtoken';
import redisClient, { RedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

// JWT blacklist service
export class JWTBlacklistService {
  private static instance: JWTBlacklistService;
  private redis = redisClient;

  static getInstance(): JWTBlacklistService {
    if (!JWTBlacklistService.instance) {
      JWTBlacklistService.instance = new JWTBlacklistService();
    }
    return JWTBlacklistService.instance;
  }

  /**
   * Add JWT to blacklist
   */
  async addToBlacklist(token: string, reason?: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.jti) {
        throw new Error('Invalid JWT token or missing jti claim');
      }

      const jti = decoded.jti;
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiresIn <= 0) {
        logger.info(`Token ${jti} already expired, not adding to blacklist`);
        return;
      }

      const blacklistData = {
        jti,
        reason: reason || 'User logout',
        blacklistedAt: new Date().toISOString(),
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        userId: decoded.userId,
      };

      // Add to Redis with TTL matching token expiration
      await this.redis.setex(
        RedisClient.getKeys.auth.blacklist(jti),
        expiresIn,
        JSON.stringify(blacklistData)
      );

      logger.info(`JWT ${jti} added to blacklist`, {
        reason,
        expiresIn,
        userId: decoded.userId,
      });
    } catch (error) {
      logger.error('Failed to add JWT to blacklist:', error);
      throw error;
    }
  }

  /**
   * Check if JWT is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.jti) {
        return false; // Invalid token, but not blacklisted
      }

      const jti = decoded.jti;
      const blacklistEntry = await this.redis.get(RedisClient.getKeys.auth.blacklist(jti));
      
      return blacklistEntry !== null;
    } catch (error) {
      logger.error('Failed to check JWT blacklist status:', error);
      return false; // Fail open - allow request if Redis fails
    }
  }

  /**
   * Get blacklist entry details
   */
  async getBlacklistEntry(jti: string): Promise<any> {
    try {
      const entry = await this.redis.get(RedisClient.getKeys.auth.blacklist(jti));
      
      if (!entry) {
        return null;
      }

      return JSON.parse(entry);
    } catch (error) {
      logger.error(`Failed to get blacklist entry for ${jti}:`, error);
      return null;
    }
  }

  /**
   * Remove JWT from blacklist (if needed)
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    try {
      await this.redis.del(RedisClient.getKeys.auth.blacklist(jti));
      logger.info(`JWT ${jti} removed from blacklist`);
    } catch (error) {
      logger.error(`Failed to remove JWT ${jti} from blacklist:`, error);
      throw error;
    }
  }

  /**
   * Clear all blacklist entries
   */
  async clearBlacklist(): Promise<number> {
    try {
      const pattern = 'singglebee:blacklist:*';
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        logger.info(`Cleared ${deleted} blacklist entries`);
        return deleted;
      }
      
      return 0;
    } catch (error) {
      logger.error('Failed to clear JWT blacklist:', error);
      return 0;
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<any> {
    try {
      const pattern = 'singglebee:blacklist:*';
      const keys = await this.redis.keys(pattern);
      
      let totalEntries = keys.length;
      let expiredEntries = 0;
      let recentEntries = 0;
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      for (const key of keys) {
        try {
          const entry = await this.redis.get(key);
          if (entry) {
            const data = JSON.parse(entry);
            
            // Check if expired
            if (new Date(data.expiresAt).getTime() < Date.now()) {
              expiredEntries++;
            }
            
            // Check if recent (within last hour)
            if (new Date(data.blacklistedAt).getTime() > oneHourAgo) {
              recentEntries++;
            }
          }
        } catch (error) {
          logger.error(`Failed to parse blacklist entry: ${key}`);
        }
      }

      return {
        totalEntries,
        expiredEntries,
        recentEntries,
        activeEntries: totalEntries - expiredEntries,
      };
    } catch (error) {
      logger.error('Failed to get blacklist stats:', error);
      return null;
    }
  }

  /**
   * Clean up expired blacklist entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const pattern = 'singglebee:blacklist:*';
      const keys = await this.redis.keys(pattern);
      
      let cleaned = 0;
      const now = Date.now();

      for (const key of keys) {
        try {
          const entry = await this.redis.get(key);
          if (entry) {
            const data = JSON.parse(entry);
            
            // Check if expired
            if (new Date(data.expiresAt).getTime() < now) {
              await this.redis.del(key);
              cleaned++;
            }
          }
        } catch (error) {
          logger.error(`Failed to check blacklist entry: ${key}`);
        }
      }

      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} expired blacklist entries`);
      }

      return cleaned;
    } catch (error) {
      logger.error('Failed to cleanup expired blacklist entries:', error);
      return 0;
    }
  }

  /**
   * Add multiple tokens to blacklist (batch operation)
   */
  async addToBlacklistBatch(tokens: Array<{ token: string; reason?: string }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    const now = Date.now();

    for (const { token, reason } of tokens) {
      try {
        const decoded = jwt.decode(token) as any;
        
        if (decoded && decoded.jti) {
          const jti = decoded.jti;
          const expiresIn = decoded.exp - Math.floor(now / 1000);
          
          if (expiresIn > 0) {
            const blacklistData = {
              jti,
              reason: reason || 'Batch logout',
              blacklistedAt: new Date().toISOString(),
              expiresAt: new Date(decoded.exp * 1000).toISOString(),
              userId: decoded.userId,
            };

            pipeline.setex(
              RedisClient.getKeys.auth.blacklist(jti),
              expiresIn,
              JSON.stringify(blacklistData)
            );
          }
        }
      } catch (error) {
        logger.error('Failed to process token for batch blacklist:', error);
      }
    }

    try {
      await pipeline.exec();
      logger.info(`Added ${tokens.length} tokens to blacklist in batch`);
    } catch (error) {
      logger.error('Failed to execute batch blacklist operation:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const jwtBlacklistService = JWTBlacklistService.getInstance();

export default jwtBlacklistService;
