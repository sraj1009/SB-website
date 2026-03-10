const crypto = require('crypto');
const Redis = require('redis');

/**
 * Comprehensive Duplicate Order Protection System
 */
class DuplicateOrderProtection {
  constructor() {
    this.redisClient = null;
    this.orderFingerprints = new Map();
    this.pendingOrders = new Map();
    this.processedOrders = new Map();
    this.duplicateAttempts = new Map();
    
    this.initializeRedis();
    this.setupCleanupInterval();
  }

  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 1
      });

      await this.redisClient.connect();
      console.log('✅ Redis connected for duplicate order protection');
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory-based duplicate protection');
      this.redisClient = null;
    }
  }

  // Generate order fingerprint
  generateOrderFingerprint(orderData) {
    const {
      userId,
      items,
      totalAmount,
      shippingAddress,
      billingAddress,
      paymentMethod,
      currency = 'INR'
    } = orderData;

    // Normalize items for consistent fingerprinting
    const normalizedItems = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      variant: item.variant || null
    })).sort((a, b) => a.productId.localeCompare(b.productId));

    // Create fingerprint data
    const fingerprintData = {
      userId,
      items: normalizedItems,
      totalAmount: parseFloat(totalAmount).toFixed(2),
      shippingAddress: this.normalizeAddress(shippingAddress),
      billingAddress: this.normalizeAddress(billingAddress),
      paymentMethod,
      currency,
      timestamp: Math.floor(Date.now() / 60000) // Round to nearest minute
    };

    // Generate hash
    const fingerprintString = JSON.stringify(fingerprintData);
    const fingerprint = crypto.createHash('sha256')
      .update(fingerprintString)
      .digest('hex');

    return {
      fingerprint,
      data: fingerprintData
    };
  }

  // Normalize address for consistent comparison
  normalizeAddress(address) {
    if (!address) return null;

    return {
      line1: (address.line1 || '').toLowerCase().trim(),
      line2: (address.line2 || '').toLowerCase().trim(),
      city: (address.city || '').toLowerCase().trim(),
      state: (address.state || '').toLowerCase().trim(),
      postalCode: (address.postalCode || '').replace(/\s/g, ''),
      country: (address.country || '').toLowerCase().trim()
    };
  }

  // Check for duplicate order
  async checkDuplicateOrder(orderData) {
    try {
      const { fingerprint, data } = this.generateOrderFingerprint(orderData);
      const userId = orderData.userId;
      
      // Check Redis first
      if (this.redisClient) {
        return await this.checkRedisDuplicate(fingerprint, userId, data);
      } else {
        return this.checkMemoryDuplicate(fingerprint, userId, data);
      }
    } catch (error) {
      console.error('Error checking duplicate order:', error);
      return {
        isDuplicate: false,
        reason: 'Error during duplicate check',
        fingerprint: null
      };
    }
  }

  // Check duplicate in Redis
  async checkRedisDuplicate(fingerprint, userId, data) {
    const key = `order_fingerprint:${fingerprint}`;
    const userKey = `user_orders:${userId}`;
    
    // Check if fingerprint exists
    const existingOrder = await this.redisClient.get(key);
    
    if (existingOrder) {
      const orderInfo = JSON.parse(existingOrder);
      
      // Check if it's within the duplicate window (5 minutes)
      const now = Date.now();
      const orderTime = new Date(orderInfo.timestamp).getTime();
      const timeDiff = now - orderTime;
      
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        return {
          isDuplicate: true,
          reason: 'Duplicate order within time window',
          fingerprint,
          existingOrder: orderInfo,
          timeDifference: timeDiff
        };
      }
    }

    // Check user's recent orders
    const userOrders = await this.redisClient.lRange(userKey, 0, 9); // Last 10 orders
    const recentOrders = userOrders.map(order => JSON.parse(order));
    
    // Look for similar orders in the last 5 minutes
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    for (const recentOrder of recentOrders) {
      const orderTime = new Date(recentOrder.timestamp).getTime();
      
      if (orderTime > fiveMinutesAgo) {
        // Compare order details
        if (this.areOrdersSimilar(data, recentOrder.data)) {
          return {
            isDuplicate: true,
            reason: 'Similar order found in user history',
            fingerprint,
            existingOrder: recentOrder,
            timeDifference: now - orderTime
          };
        }
      }
    }

    return {
      isDuplicate: false,
      fingerprint
    };
  }

  // Check duplicate in memory
  checkMemoryDuplicate(fingerprint, userId, data) {
    // Check global fingerprints
    const existingFingerprint = this.orderFingerprints.get(fingerprint);
    
    if (existingFingerprint) {
      const now = Date.now();
      const timeDiff = now - existingFingerprint.timestamp.getTime();
      
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        return {
          isDuplicate: true,
          reason: 'Duplicate order within time window',
          fingerprint,
          existingOrder: existingFingerprint,
          timeDifference: timeDiff
        };
      }
    }

    // Check user's recent orders
    const userOrders = this.processedOrders.get(userId) || [];
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    for (const recentOrder of userOrders) {
      const orderTime = new Date(recentOrder.timestamp).getTime();
      
      if (orderTime > fiveMinutesAgo) {
        if (this.areOrdersSimilar(data, recentOrder.data)) {
          return {
            isDuplicate: true,
            reason: 'Similar order found in user history',
            fingerprint,
            existingOrder: recentOrder,
            timeDifference: now - orderTime
          };
        }
      }
    }

    return {
      isDuplicate: false,
      fingerprint
    };
  }

  // Compare orders for similarity
  areOrdersSimilar(order1, order2) {
    // Check basic criteria
    if (order1.userId !== order2.userId) return false;
    if (Math.abs(parseFloat(order1.totalAmount) - parseFloat(order2.totalAmount)) > 0.01) return false;
    if (order1.paymentMethod !== order2.paymentMethod) return false;
    if (order1.currency !== order2.currency) return false;
    
    // Check items
    if (order1.items.length !== order2.items.length) return false;
    
    for (let i = 0; i < order1.items.length; i++) {
      const item1 = order1.items[i];
      const item2 = order2.items[i];
      
      if (item1.productId !== item2.productId) return false;
      if (item1.quantity !== item2.quantity) return false;
      if (Math.abs(parseFloat(item1.price) - parseFloat(item2.price)) > 0.01) return false;
    }
    
    // Check addresses (optional, can be strict or relaxed)
    const addressesMatch = this.compareAddresses(order1.shippingAddress, order2.shippingAddress);
    
    return addressesMatch;
  }

  // Compare addresses
  compareAddresses(addr1, addr2) {
    if (!addr1 && !addr2) return true;
    if (!addr1 || !addr2) return false;
    
    return addr1.line1 === addr2.line1 &&
           addr1.city === addr2.city &&
           addr1.postalCode === addr2.postalCode &&
           addr1.country === addr2.country;
  }

  // Record order fingerprint
  async recordOrderFingerprint(orderData, orderId) {
    try {
      const { fingerprint, data } = this.generateOrderFingerprint(orderData);
      const userId = orderData.userId;
      const timestamp = new Date();
      
      const orderInfo = {
        orderId,
        userId,
        fingerprint,
        data,
        timestamp,
        status: 'pending'
      };

      if (this.redisClient) {
        await this.recordRedisFingerprint(fingerprint, userId, orderInfo);
      } else {
        this.recordMemoryFingerprint(fingerprint, userId, orderInfo);
      }

      return fingerprint;
    } catch (error) {
      console.error('Error recording order fingerprint:', error);
      throw error;
    }
  }

  // Record fingerprint in Redis
  async recordRedisFingerprint(fingerprint, userId, orderInfo) {
    const key = `order_fingerprint:${fingerprint}`;
    const userKey = `user_orders:${userId}`;
    
    // Store fingerprint with 5-minute expiration
    await this.redisClient.setEx(key, 300, JSON.stringify(orderInfo));
    
    // Add to user's order history (keep last 50)
    await this.redisClient.lPush(userKey, JSON.stringify(orderInfo));
    await this.redisClient.lTrim(userKey, 0, 49);
    
    // Set expiration on user key
    await this.redisClient.expire(userKey, 86400); // 24 hours
  }

  // Record fingerprint in memory
  recordMemoryFingerprint(fingerprint, userId, orderInfo) {
    // Store global fingerprint
    this.orderFingerprints.set(fingerprint, orderInfo);
    
    // Store in user's order history
    if (!this.processedOrders.has(userId)) {
      this.processedOrders.set(userId, []);
    }
    
    const userOrders = this.processedOrders.get(userId);
    userOrders.push(orderInfo);
    
    // Keep only last 50 orders per user
    if (userOrders.length > 50) {
      userOrders.shift();
    }
  }

  // Mark order as processed
  async markOrderProcessed(orderId, fingerprint, status = 'completed') {
    try {
      if (this.redisClient) {
        const key = `order_fingerprint:${fingerprint}`;
        const existingOrder = await this.redisClient.get(key);
        
        if (existingOrder) {
          const orderInfo = JSON.parse(existingOrder);
          orderInfo.status = status;
          orderInfo.processedAt = new Date();
          
          await this.redisClient.set(key, JSON.stringify(orderInfo));
        }
      } else {
        const existingOrder = this.orderFingerprints.get(fingerprint);
        
        if (existingOrder) {
          existingOrder.status = status;
          existingOrder.processedAt = new Date();
        }
      }
    } catch (error) {
      console.error('Error marking order as processed:', error);
    }
  }

  // Record duplicate attempt
  recordDuplicateAttempt(userId, fingerprint, reason) {
    const key = `${userId}:${fingerprint}`;
    const attempts = this.duplicateAttempts.get(key) || {
      count: 0,
      firstAttempt: new Date(),
      lastAttempt: new Date(),
      reasons: []
    };
    
    attempts.count++;
    attempts.lastAttempt = new Date();
    attempts.reasons.push(reason);
    
    this.duplicateAttempts.set(key, attempts);
    
    console.warn('Duplicate order attempt recorded:', {
      userId,
      fingerprint,
      reason,
      attempts: attempts.count,
      timestamp: new Date().toISOString()
    });
  }

  // Get duplicate order statistics
  async getDuplicateStats() {
    const stats = {
      totalFingerprints: this.orderFingerprints.size,
      pendingOrders: this.pendingOrders.size,
      processedOrders: this.processedOrders.size,
      duplicateAttempts: this.duplicateAttempts.size,
      topUsers: [],
      recentDuplicates: []
    };

    // Get top users with most duplicates
    for (const [key, attempts] of this.duplicateAttempts.entries()) {
      const [userId] = key.split(':');
      
      stats.topUsers.push({
        userId,
        attempts: attempts.count,
        lastAttempt: attempts.lastAttempt
      });
    }

    stats.topUsers.sort((a, b) => b.attempts - a.attempts);
    stats.topUsers = stats.topUsers.slice(0, 10);

    // Get recent duplicates
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    for (const [key, attempts] of this.duplicateAttempts.entries()) {
      if (attempts.lastAttempt.getTime() > oneHourAgo) {
        stats.recentDuplicates.push({
          key,
          attempts: attempts.count,
          lastAttempt: attempts.lastAttempt,
          reasons: attempts.reasons
        });
      }
    }

    return stats;
  }

  // Clean up old data
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    let cleanedCount = 0;

    // Clean up old fingerprints
    for (const [fingerprint, orderInfo] of this.orderFingerprints.entries()) {
      if (orderInfo.timestamp.getTime() < oneHourAgo) {
        this.orderFingerprints.delete(fingerprint);
        cleanedCount++;
      }
    }

    // Clean up old processed orders
    for (const [userId, orders] of this.processedOrders.entries()) {
      const filteredOrders = orders.filter(order => 
        order.timestamp.getTime() > oneHourAgo
      );
      
      if (filteredOrders.length !== orders.length) {
        this.processedOrders.set(userId, filteredOrders);
        cleanedCount += orders.length - filteredOrders.length;
      }
    }

    // Clean up old duplicate attempts
    for (const [key, attempts] of this.duplicateAttempts.entries()) {
      if (attempts.lastAttempt.getTime() < oneHourAgo) {
        this.duplicateAttempts.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Setup cleanup interval
  setupCleanupInterval() {
    // Clean up every 30 minutes
    setInterval(() => {
      const cleanedCount = this.cleanup();
      console.log('🧹 Cleaned up duplicate order protection data:', cleanedCount);
    }, 30 * 60 * 1000);
  }
}

// Singleton instance
const duplicateOrderProtection = new DuplicateOrderProtection();

// Middleware function
const duplicateOrderProtectionMiddleware = async (req, res, next) => {
  try {
    // Only apply to order creation endpoints
    if (!req.path.includes('/orders') || req.method !== 'POST') {
      return next();
    }

    const orderData = req.body;
    
    if (!orderData.userId || !orderData.items || !orderData.totalAmount) {
      return res.status(400).json({
        error: 'Invalid order data',
        code: 'INVALID_ORDER_DATA'
      });
    }

    // Check for duplicate order
    const duplicateCheck = await duplicateOrderProtection.checkDuplicateOrder(orderData);
    
    if (duplicateCheck.isDuplicate) {
      // Record duplicate attempt
      duplicateOrderProtection.recordDuplicateAttempt(
        orderData.userId,
        duplicateCheck.fingerprint,
        duplicateCheck.reason
      );

      console.warn('Duplicate order blocked:', {
        userId: orderData.userId,
        fingerprint: duplicateCheck.fingerprint,
        reason: duplicateCheck.reason,
        timeDifference: duplicateCheck.timeDifference,
        timestamp: new Date().toISOString()
      });

      return res.status(409).json({
        error: 'Duplicate order detected',
        code: 'DUPLICATE_ORDER',
        reason: duplicateCheck.reason,
        existingOrderId: duplicateCheck.existingOrder?.orderId,
        timeDifference: duplicateCheck.timeDifference
      });
    }

    // Add fingerprint to request for later use
    req.orderFingerprint = duplicateCheck.fingerprint;

    next();
  } catch (error) {
    console.error('Duplicate order protection error:', error);
    res.status(500).json({
      error: 'Order validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
};

// Order creation middleware
const orderCreationMiddleware = async (req, res, next) => {
  try {
    if (req.orderFingerprint && req.body.userId) {
      // Record the order fingerprint
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      await duplicateOrderProtection.recordOrderFingerprint(req.body, orderId);
      
      // Add order ID to request
      req.orderId = orderId;
    }

    next();
  } catch (error) {
    console.error('Order creation middleware error:', error);
    res.status(500).json({
      error: 'Order creation failed',
      code: 'CREATION_ERROR'
    });
  }
};

// Statistics endpoint
const duplicateStatsHandler = async (req, res) => {
  try {
    const stats = await duplicateOrderProtection.getDuplicateStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Duplicate stats error:', error);
    res.status(500).json({
      error: 'Failed to get duplicate statistics',
      code: 'STATS_ERROR'
    });
  }
};

module.exports = {
  DuplicateOrderProtection,
  duplicateOrderProtection,
  duplicateOrderProtectionMiddleware,
  orderCreationMiddleware,
  duplicateStatsHandler
};
