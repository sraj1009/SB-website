import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class FeatureFlagService {
  constructor() {
    this.redis = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    this.defaultFlags = {
      // New features
      'ai-recommendations': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'AI-powered product recommendations',
        environments: ['development', 'staging'],
      },
      'new-checkout-flow': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Enhanced checkout experience',
        environments: ['development', 'staging'],
      },
      'social-login': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Google/Facebook social authentication',
        environments: ['development', 'staging', 'production'],
      },
      'express-shipping': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Express shipping options',
        environments: ['development', 'staging', 'production'],
      },
      'advanced-search': {
        enabled: false,
        rolloutPercentage: 10,
        description: 'Elasticsearch-powered search',
        environments: ['development', 'staging', 'production'],
      },
      'personalization-engine': {
        enabled: false,
        rolloutPercentage: 5,
        description: 'Real-time UI personalization',
        environments: ['development', 'staging'],
      },
      'multi-currency': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Multi-currency support',
        environments: ['development', 'staging'],
      },
      'loyalty-program': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Customer loyalty rewards',
        environments: ['development', 'staging'],
      },
      // Safety switches
      'payment-gateway-cashfree': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Cashfree payment gateway',
        environments: ['development', 'staging', 'production'],
        critical: true,
      },
      'payment-gateway-razorpay': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Razorpay payment gateway',
        environments: ['development', 'staging', 'production'],
      },
      'email-service': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Email notifications',
        environments: ['development', 'staging', 'production'],
        critical: true,
      },
      'sms-service': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'SMS notifications',
        environments: ['development', 'staging', 'production'],
      },
      // Performance features
      'edge-caching': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Edge-level caching',
        environments: ['staging', 'production'],
      },
      'database-read-replica': {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Read replica for database queries',
        environments: ['staging', 'production'],
      },
      'image-optimization': {
        enabled: true,
        rolloutPercentage: 100,
        description: 'Automatic image optimization',
        environments: ['development', 'staging', 'production'],
      },
    };
  }

  async initialize() {
    try {
      await this.redis.connect();
      
      // Initialize default flags if not exists
      for (const [flagName, flagConfig] of Object.entries(this.defaultFlags)) {
        const exists = await this.redis.exists(`feature:${flagName}`);
        if (!exists) {
          await this.redis.setex(
            `feature:${flagName}`,
            86400, // 24 hours TTL
            JSON.stringify(flagConfig)
          );
        }
      }
      
      logger.info('Feature flag service initialized');
    } catch (error) {
      logger.error('Failed to initialize feature flag service:', error);
    }
  }

  /**
   * Check if a feature is enabled for a specific user
   */
  async isEnabled(flagName, userId = null, context = {}) {
    try {
      const flag = await this.getFlag(flagName);
      
      if (!flag) {
        logger.warn(`Feature flag not found: ${flagName}`);
        return false;
      }

      // Check environment compatibility
      if (flag.environments && !flag.environments.includes(config.nodeEnv)) {
        return false;
      }

      // If flag is globally disabled
      if (!flag.enabled) {
        return false;
      }

      // If rollout is 100%, enable for everyone
      if (flag.rolloutPercentage >= 100) {
        return true;
      }

      // If rollout is 0%, disable for everyone
      if (flag.rolloutPercentage <= 0) {
        return false;
      }

      // If no user ID provided, use random rollout
      if (!userId) {
        const random = Math.random() * 100;
        return random < flag.rolloutPercentage;
      }

      // Consistent user-based rollout using hash
      const userHash = this.hashUserId(userId, flagName);
      const userPercentage = (userHash % 100);
      
      return userPercentage < flag.rolloutPercentage;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}:`, error);
      return false;
    }
  }

  /**
   * Get complete flag configuration
   */
  async getFlag(flagName) {
    try {
      const flagData = await this.redis.get(`feature:${flagName}`);
      return flagData ? JSON.parse(flagData) : null;
    } catch (error) {
      logger.error(`Error getting feature flag ${flagName}:`, error);
      return null;
    }
  }

  /**
   * Update feature flag
   */
  async updateFlag(flagName, updates) {
    try {
      const flag = await this.getFlag(flagName);
      if (!flag) {
        throw new Error(`Feature flag not found: ${flagName}`);
      }

      const updatedFlag = { ...flag, ...updates };
      
      // Add audit trail
      updatedFlag.updatedAt = new Date().toISOString();
      updatedFlag.updatedBy = updates.updatedBy || 'system';
      
      await this.redis.setex(
        `feature:${flagName}`,
        86400,
        JSON.stringify(updatedFlag)
      );

      logger.info(`Feature flag updated: ${flagName}`, updatedFlag);
      return updatedFlag;
    } catch (error) {
      logger.error(`Error updating feature flag ${flagName}:`, error);
      throw error;
    }
  }

  /**
   * Get all flags for a user
   */
  async getUserFlags(userId, context = {}) {
    const flags = {};
    
    for (const flagName of Object.keys(this.defaultFlags)) {
      flags[flagName] = await this.isEnabled(flagName, userId, context);
    }
    
    return flags;
  }

  /**
   * Emergency disable for critical features
   */
  async emergencyDisable(flagName, reason = 'Emergency shutdown') {
    try {
      const flag = await this.getFlag(flagName);
      if (!flag) {
        throw new Error(`Feature flag not found: ${flagName}`);
      }

      if (!flag.critical) {
        throw new Error(`Feature flag is not critical: ${flagName}`);
      }

      await this.updateFlag(flagName, {
        enabled: false,
        rolloutPercentage: 0,
        emergencyDisable: true,
        emergencyReason: reason,
        emergencyDisabledAt: new Date().toISOString(),
      });

      logger.error(`EMERGENCY: Feature flag disabled: ${flagName} - ${reason}`);
      
      // Send alert (would integrate with PagerDuty/Slack)
      this.sendEmergencyAlert(flagName, reason);
      
      return true;
    } catch (error) {
      logger.error(`Error emergency disabling feature flag ${flagName}:`, error);
      throw error;
    }
  }

  /**
   * Gradual rollout management
   */
  async gradualRollout(flagName, targetPercentage, durationMinutes = 30) {
    try {
      const flag = await this.getFlag(flagName);
      if (!flag) {
        throw new Error(`Feature flag not found: ${flagName}`);
      }

      const currentPercentage = flag.rolloutPercentage || 0;
      const steps = 10;
      const stepSize = (targetPercentage - currentPercentage) / steps;
      const stepDuration = (durationMinutes * 60 * 1000) / steps; // in milliseconds

      logger.info(`Starting gradual rollout for ${flagName}: ${currentPercentage}% → ${targetPercentage}%`);

      for (let i = 1; i <= steps; i++) {
        const newPercentage = Math.min(currentPercentage + (stepSize * i), targetPercentage);
        
        await this.updateFlag(flagName, {
          rolloutPercentage: Math.round(newPercentage),
        });

        logger.info(`Rollout step ${i}/${steps} for ${flagName}: ${Math.round(newPercentage)}%`);

        if (i < steps) {
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
      }

      logger.info(`Gradual rollout completed for ${flagName}: ${targetPercentage}%`);
      return true;
    } catch (error) {
      logger.error(`Error in gradual rollout for ${flagName}:`, error);
      throw error;
    }
  }

  /**
   * A/B testing support
   */
  async getVariant(flagName, userId = null, variants = ['A', 'B']) {
    try {
      const flag = await this.getFlag(flagName);
      if (!flag || !flag.enabled) {
        return null;
      }

      // Use user ID for consistent variant assignment
      if (userId) {
        const hash = this.hashUserId(userId, `variant:${flagName}`);
        const variantIndex = hash % variants.length;
        return variants[variantIndex];
      }

      // Random assignment for anonymous users
      return variants[Math.floor(Math.random() * variants.length)];
    } catch (error) {
      logger.error(`Error getting variant for ${flagName}:`, error);
      return null;
    }
  }

  /**
   * Hash user ID for consistent rollout
   */
  hashUserId(userId, salt = '') {
    let hash = 0;
    const str = `${userId}:${salt}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(flagName, reason) {
    // This would integrate with your alerting system
    logger.error(`🚨 EMERGENCY ALERT 🚨`, {
      flag: flagName,
      reason,
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });

    // Example: Send to Slack, PagerDuty, etc.
    // await slackClient.sendMessage(`#alerts`, `🚨 Feature flag ${flagName} emergency disabled: ${reason}`);
  }

  /**
   * Get flag usage statistics
   */
  async getFlagStats(flagName, timeRange = '1h') {
    try {
      // This would integrate with your metrics system
      const stats = {
        flagName,
        timeRange,
        enabled: await this.isEnabled(flagName),
        rolloutPercentage: (await this.getFlag(flagName))?.rolloutPercentage || 0,
        // Add more stats from your monitoring system
      };

      return stats;
    } catch (error) {
      logger.error(`Error getting stats for ${flagName}:`, error);
      return null;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    try {
      await this.redis.quit();
      logger.info('Feature flag service shut down');
    } catch (error) {
      logger.error('Error shutting down feature flag service:', error);
    }
  }
}

// Create singleton instance
const featureFlagService = new FeatureFlagService();

export default featureFlagService;
