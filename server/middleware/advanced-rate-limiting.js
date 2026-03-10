const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const crypto = require('crypto');

/**
 * Advanced Rate Limiting with Redis backend and intelligent throttling
 */
class AdvancedRateLimiting {
  constructor() {
    this.redisClient = null;
    this.rateLimitConfigs = new Map();
    this.userLimits = new Map();
    this.ipLimits = new Map();
    this.globalLimits = new Map();
    
    this.initializeRedis();
    this.setupDefaultConfigs();
  }

  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });

      await this.redisClient.connect();
      console.log('✅ Redis connected for rate limiting');
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory-based rate limiting');
      this.redisClient = null;
    }
  }

  setupDefaultConfigs() {
    // Authentication endpoints
    this.rateLimitConfigs.set('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`,
      message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT',
        retryAfter: 900
      }
    });

    // API endpoints
    this.rateLimitConfigs.set('api', {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      keyGenerator: (req) => {
        if (req.user) {
          return `api:user:${req.user.userId}`;
        }
        return `api:ip:${req.ip}`;
      },
      message: {
        error: 'API rate limit exceeded',
        code: 'API_RATE_LIMIT',
        retryAfter: 60
      }
    });

    // Payment endpoints
    this.rateLimitConfigs.set('payment', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 3, // 3 payment attempts
      skipSuccessfulRequests: true,
      keyGenerator: (req) => {
        if (req.user) {
          return `payment:user:${req.user.userId}`;
        }
        return `payment:ip:${req.ip}`;
      },
      message: {
        error: 'Payment rate limit exceeded',
        code: 'PAYMENT_RATE_LIMIT',
        retryAfter: 300
      }
    });

    // Upload endpoints
    this.rateLimitConfigs.set('upload', {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 uploads per hour
      keyGenerator: (req) => {
        if (req.user) {
          return `upload:user:${req.user.userId}`;
        }
        return `upload:ip:${req.ip}`;
      },
      message: {
        error: 'Upload rate limit exceeded',
        code: 'UPLOAD_RATE_LIMIT',
        retryAfter: 3600
      }
    });

    // Search endpoints
    this.rateLimitConfigs.set('search', {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      keyGenerator: (req) => {
        if (req.user) {
          return `search:user:${req.user.userId}`;
        }
        return `search:ip:${req.ip}`;
      },
      message: {
        error: 'Search rate limit exceeded',
        code: 'SEARCH_RATE_LIMIT',
        retryAfter: 60
      }
    });

    // Global rate limit
    this.rateLimitConfigs.set('global', {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 1000, // 1000 requests per minute globally
      keyGenerator: () => 'global',
      message: {
        error: 'Server overloaded, please try again',
        code: 'GLOBAL_RATE_LIMIT',
        retryAfter: 60
      }
    });
  }

  // Create rate limiter with Redis backend
  createRateLimiter(configName) {
    const config = this.rateLimitConfigs.get(configName);
    if (!config) {
      throw new Error(`Rate limit config not found: ${configName}`);
    }

    if (this.redisClient) {
      return this.createRedisRateLimiter(config);
    } else {
      return this.createMemoryRateLimiter(config);
    }
  }

  createRedisRateLimiter(config) {
    return async (req, res, next) => {
      try {
        const key = config.keyGenerator(req);
        const now = Date.now();
        const windowStart = now - config.windowMs;

        // Clean up old entries
        await this.redisClient.zRemRangeByScore(key, 0, windowStart);

        // Get current count
        const currentCount = await this.redisClient.zCard(key);

        if (currentCount >= config.max) {
          const ttl = await this.redisClient.ttl(key);
          res.set('Retry-After', Math.ceil(ttl / 1000));
          
          return res.status(429).json({
            ...config.message,
            retryAfter: Math.ceil(ttl / 1000),
            limit: config.max,
            remaining: 0,
            reset: new Date(now + ttl * 1000).toISOString()
          });
        }

        // Add current request
        await this.redisClient.zAdd(key, [{ score: now, value: `${now}-${crypto.randomUUID()}` }]);
        await this.redisClient.expire(key, Math.ceil(config.windowMs / 1000));

        // Set rate limit headers
        const remaining = config.max - currentCount - 1;
        const resetTime = new Date(now + config.windowMs).toISOString();

        res.set('X-RateLimit-Limit', config.max);
        res.set('X-RateLimit-Remaining', Math.max(0, remaining));
        res.set('X-RateLimit-Reset', new Date(now + config.windowMs).getTime());

        next();
      } catch (error) {
        console.error('Redis rate limiting error:', error);
        // Fallback to memory-based limiting
        this.createMemoryRateLimiter(config)(req, res, next);
      }
    };
  }

  createMemoryRateLimiter(config) {
    const store = new Map();

    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message,
      keyGenerator: config.keyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      standardHeaders: true,
      legacyHeaders: false,
      store: {
        increment: async (key) => {
          const now = Date.now();
          const windowStart = now - config.windowMs;
          
          if (!store.has(key)) {
            store.set(key, []);
          }

          let timestamps = store.get(key);
          // Remove old timestamps
          timestamps = timestamps.filter(timestamp => timestamp > windowStart);
          
          timestamps.push(now);
          store.set(key, timestamps);

          return timestamps.length;
        },
        decrement: async (key) => {
          if (store.has(key)) {
            const timestamps = store.get(key);
            if (timestamps.length > 0) {
              timestamps.pop();
            }
          }
        },
        resetKey: async (key) => {
          store.delete(key);
        }
      }
    });
  }

  // Adaptive rate limiting based on server load
  createAdaptiveRateLimiter(baseConfig) {
    return async (req, res, next) => {
      try {
        const serverLoad = await this.getServerLoad();
        const adaptiveConfig = { ...baseConfig };

        // Adjust limits based on server load
        if (serverLoad.cpu > 80) {
          adaptiveConfig.max = Math.floor(baseConfig.max * 0.5); // 50% reduction
        } else if (serverLoad.cpu > 60) {
          adaptiveConfig.max = Math.floor(baseConfig.max * 0.7); // 30% reduction
        }

        // Use adaptive config
        const limiter = this.redisClient ? 
          this.createRedisRateLimiter(adaptiveConfig) :
          this.createMemoryRateLimiter(adaptiveConfig);

        limiter(req, res, next);
      } catch (error) {
        console.error('Adaptive rate limiting error:', error);
        next();
      }
    };
  }

  // User-specific rate limiting
  createUserRateLimiter(userId, customConfig) {
    const config = {
      windowMs: customConfig?.windowMs || 60 * 1000, // 1 minute
      max: customConfig?.max || 100, // 100 requests per minute
      keyGenerator: (req) => `user:${userId}:${req.path}`,
      message: {
        error: 'User rate limit exceeded',
        code: 'USER_RATE_LIMIT',
        retryAfter: 60
      }
    };

    return this.redisClient ? 
      this.createRedisRateLimiter(config) :
      this.createMemoryRateLimiter(config);
  }

  // IP-based rate limiting
  createIPRateLimiter(ip, customConfig) {
    const config = {
      windowMs: customConfig?.windowMs || 60 * 1000, // 1 minute
      max: customConfig?.max || 50, // 50 requests per minute
      keyGenerator: (req) => `ip:${ip}:${req.path}`,
      message: {
        error: 'IP rate limit exceeded',
        code: 'IP_RATE_LIMIT',
        retryAfter: 60
      }
    };

    return this.redisClient ? 
      this.createRedisRateLimiter(config) :
      this.createMemoryRateLimiter(config);
  }

  // Get server load metrics
  async getServerLoad() {
    try {
      const os = require('os');
      const cpus = os.cpus();
      
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - (totalIdle / totalTick) * 100;
      const memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;

      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        loadAverage: os.loadavg()
      };
    } catch (error) {
      return { cpu: 0, memory: 0, loadAverage: [0, 0, 0] };
    }
  }

  // Get rate limiting statistics
  async getRateLimitStats() {
    const stats = {
      totalConfigs: this.rateLimitConfigs.size,
      redisConnected: !!this.redisClient,
      userLimits: this.userLimits.size,
      ipLimits: this.ipLimits.size,
      serverLoad: await this.getServerLoad()
    };

    if (this.redisClient) {
      try {
        // Get Redis stats
        const redisInfo = await this.redisClient.info('memory');
        stats.redisMemory = redisInfo.split('\r\n')
          .find(line => line.startsWith('used_memory_human:'))
          ?.split(':')[1] || 'N/A';
      } catch (error) {
        stats.redisMemory = 'N/A';
      }
    }

    return stats;
  }

  // Reset user rate limits
  async resetUserLimits(userId) {
    const pattern = `*:user:${userId}:*`;
    
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error('Failed to reset user limits:', error);
      }
    }

    this.userLimits.delete(userId);
  }

  // Reset IP rate limits
  async resetIPLimits(ip) {
    const pattern = `*:ip:${ip}:*`;
    
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error('Failed to reset IP limits:', error);
      }
    }

    this.ipLimits.delete(ip);
  }
}

// Singleton instance
const rateLimiting = new AdvancedRateLimiting();

// Predefined rate limiters
const authLimiter = rateLimiting.createRateLimiter('auth');
const apiLimiter = rateLimiting.createRateLimiter('api');
const paymentLimiter = rateLimiting.createRateLimiter('payment');
const uploadLimiter = rateLimiting.createRateLimiter('upload');
const searchLimiter = rateLimiting.createRateLimiter('search');
const globalLimiter = rateLimiting.createRateLimiter('global');

// Middleware functions
const createRateLimiter = (configName) => rateLimiting.createRateLimiter(configName);
const createAdaptiveRateLimiter = (baseConfig) => rateLimiting.createAdaptiveRateLimiter(baseConfig);
const createUserRateLimiter = (userId, customConfig) => rateLimiting.createUserRateLimiter(userId, customConfig);
const createIPRateLimiter = (ip, customConfig) => rateLimiting.createIPRateLimiter(ip, customConfig);

// Rate limiting statistics endpoint
const rateLimitStatsHandler = async (req, res) => {
  try {
    const stats = await rateLimiting.getRateLimitStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({
      error: 'Failed to get rate limit statistics',
      code: 'STATS_ERROR'
    });
  }
};

// Reset user limits endpoint
const resetUserLimitsHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    await rateLimiting.resetUserLimits(userId);
    
    res.json({
      success: true,
      message: `Rate limits reset for user ${userId}`
    });
  } catch (error) {
    console.error('Reset user limits error:', error);
    res.status(500).json({
      error: 'Failed to reset user limits',
      code: 'RESET_ERROR'
    });
  }
};

// Reset IP limits endpoint
const resetIPLimitsHandler = async (req, res) => {
  try {
    const { ip } = req.params;
    
    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required',
        code: 'MISSING_IP'
      });
    }

    await rateLimiting.resetIPLimits(ip);
    
    res.json({
      success: true,
      message: `Rate limits reset for IP ${ip}`
    });
  } catch (error) {
    console.error('Reset IP limits error:', error);
    res.status(500).json({
      error: 'Failed to reset IP limits',
      code: 'RESET_ERROR'
    });
  }
};

module.exports = {
  AdvancedRateLimiting,
  rateLimiting,
  authLimiter,
  apiLimiter,
  paymentLimiter,
  uploadLimiter,
  searchLimiter,
  globalLimiter,
  createRateLimiter,
  createAdaptiveRateLimiter,
  createUserRateLimiter,
  createIPRateLimiter,
  rateLimitStatsHandler,
  resetUserLimitsHandler,
  resetIPLimitsHandler
};
