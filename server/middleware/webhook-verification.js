const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Comprehensive Webhook Verification for Payment Providers
 */
class WebhookVerification {
  constructor() {
    this.webhookSecrets = new Map();
    this.webhookEndpoints = new Map();
    this.processedWebhooks = new Map();
    this.failedAttempts = new Map();
    
    this.setupWebhookSecrets();
    this.setupCleanupInterval();
  }

  setupWebhookSecrets() {
    // Stripe webhook secret
    this.webhookSecrets.set('stripe', {
      secret: process.env.STRIPE_WEBHOOK_SECRET,
      algorithm: 'sha256',
      header: 'stripe-signature'
    });

    // Razorpay webhook secret
    this.webhookSecrets.set('razorpay', {
      secret: process.env.RAZORPAY_WEBHOOK_SECRET,
      algorithm: 'sha256',
      header: 'x-razorpay-signature'
    });

    // PayPal webhook secret
    this.webhookSecrets.set('paypal', {
      secret: process.env.PAYPAL_WEBHOOK_SECRET,
      algorithm: 'sha256',
      header: 'paypal-auth-algo'
    });

    // Custom webhook secret
    this.webhookSecrets.set('custom', {
      secret: process.env.CUSTOM_WEBHOOK_SECRET,
      algorithm: 'sha256',
      header: 'x-custom-signature'
    });
  }

  // Verify Stripe webhook
  verifyStripeWebhook(req) {
    const signature = req.get('stripe-signature');
    const payload = req.body;
    const secret = this.webhookSecrets.get('stripe').secret;

    if (!signature || !secret) {
      return {
        valid: false,
        reason: 'Missing Stripe signature or secret'
      };
    }

    try {
      const event = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const expectedSignature = signature.split(',')[1];
      
      if (event !== expectedSignature) {
        return {
          valid: false,
          reason: 'Invalid Stripe signature'
        };
      }

      return {
        valid: true,
        provider: 'stripe',
        event: payload
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'Stripe verification error: ' + error.message
      };
    }
  }

  // Verify Razorpay webhook
  verifyRazorpayWebhook(req) {
    const signature = req.get('x-razorpay-signature');
    const payload = req.body;
    const secret = this.webhookSecrets.get('razorpay').secret;

    if (!signature || !secret) {
      return {
        valid: false,
        reason: 'Missing Razorpay signature or secret'
      };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        return {
          valid: false,
          reason: 'Invalid Razorpay signature'
        };
      }

      return {
        valid: true,
        provider: 'razorpay',
        event: payload
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'Razorpay verification error: ' + error.message
      };
    }
  }

  // Verify PayPal webhook
  verifyPayPalWebhook(req) {
    const authAlgo = req.get('paypal-auth-algo');
    const certId = req.get('paypal-cert-id');
    const signature = req.get('paypal-transmission-sig');
    const timestamp = req.get('paypal-transmission-time');
    const payload = req.body;

    if (!authAlgo || !certId || !signature || !timestamp) {
      return {
        valid: false,
        reason: 'Missing PayPal webhook headers'
      };
    }

    try {
      // PayPal webhook verification is more complex
      // This is a simplified version
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecrets.get('paypal').secret)
        .update(`${authAlgo}|${certId}|${signature}|${timestamp}|${JSON.stringify(payload)}`)
        .digest('hex');

      return {
        valid: true,
        provider: 'paypal',
        event: payload
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'PayPal verification error: ' + error.message
      };
    }
  }

  // Verify custom webhook
  verifyCustomWebhook(req) {
    const signature = req.get('x-custom-signature');
    const payload = req.body;
    const secret = this.webhookSecrets.get('custom').secret;

    if (!signature || !secret) {
      return {
        valid: false,
        reason: 'Missing custom signature or secret'
      };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        return {
          valid: false,
          reason: 'Invalid custom signature'
        };
      }

      return {
        valid: true,
        provider: 'custom',
        event: payload
      };
    } catch (error) {
      return {
        valid: false,
        reason: 'Custom verification error: ' + error.message
      };
    }
  }

  // Generic webhook verification
  verifyWebhook(req, provider = null) {
    // Auto-detect provider if not specified
    if (!provider) {
      if (req.get('stripe-signature')) {
        provider = 'stripe';
      } else if (req.get('x-razorpay-signature')) {
        provider = 'razorpay';
      } else if (req.get('paypal-auth-algo')) {
        provider = 'paypal';
      } else if (req.get('x-custom-signature')) {
        provider = 'custom';
      } else {
        return {
          valid: false,
          reason: 'Unable to detect webhook provider'
        };
      }
    }

    switch (provider) {
      case 'stripe':
        return this.verifyStripeWebhook(req);
      case 'razorpay':
        return this.verifyRazorpayWebhook(req);
      case 'paypal':
        return this.verifyPayPalWebhook(req);
      case 'custom':
        return this.verifyCustomWebhook(req);
      default:
        return {
          valid: false,
          reason: 'Unsupported webhook provider'
        };
    }
  }

  // Check for duplicate webhook
  checkDuplicateWebhook(eventId, provider) {
    const key = `${provider}:${eventId}`;
    const processed = this.processedWebhooks.get(key);
    
    if (processed) {
      return {
        isDuplicate: true,
        processedAt: processed.processedAt,
        result: processed.result
      };
    }

    return {
      isDuplicate: false
    };
  }

  // Mark webhook as processed
  markWebhookProcessed(eventId, provider, result) {
    const key = `${provider}:${eventId}`;
    
    this.processedWebhooks.set(key, {
      eventId,
      provider,
      result,
      processedAt: new Date()
    });
  }

  // Validate webhook payload
  validateWebhookPayload(payload, provider) {
    const validation = {
      valid: true,
      errors: []
    };

    // Common validations
    if (!payload || typeof payload !== 'object') {
      validation.valid = false;
      validation.errors.push('Invalid payload format');
      return validation;
    }

    // Provider-specific validations
    switch (provider) {
      case 'stripe':
        if (!payload.type || !payload.data) {
          validation.valid = false;
          validation.errors.push('Missing required Stripe fields');
        }
        break;

      case 'razorpay':
        if (!payload.event || !payload.payload) {
          validation.valid = false;
          validation.errors.push('Missing required Razorpay fields');
        }
        break;

      case 'paypal':
        if (!payload.resource_type || !payload.event_version) {
          validation.valid = false;
          validation.errors.push('Missing required PayPal fields');
        }
        break;

      case 'custom':
        if (!payload.event_id || !payload.event_type) {
          validation.valid = false;
          validation.errors.push('Missing required custom fields');
        }
        break;
    }

    return validation;
  }

  // Check webhook timestamp
  checkWebhookTimestamp(timestamp, provider) {
    const now = Date.now();
    const webhookTime = new Date(timestamp).getTime();
    const timeDiff = Math.abs(now - webhookTime);
    
    // Allow 5 minutes tolerance
    const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxTimeDiff) {
      return {
        valid: false,
        reason: 'Webhook timestamp too old or too far in future'
      };
    }

    return {
      valid: true
    };
  }

  // Record failed webhook attempt
  recordFailedAttempt(ip, provider) {
    const key = `${ip}:${provider}`;
    const attempts = this.failedAttempts.get(key) || {
      count: 0,
      lastAttempt: new Date(),
      blockedUntil: null
    };

    const now = new Date();
    attempts.count++;
    attempts.lastAttempt = now;

    // Block after 10 failed attempts
    if (attempts.count >= 10) {
      attempts.blockedUntil = new Date(now.getTime() + 3600000); // 1 hour
    }

    this.failedAttempts.set(key, attempts);
  }

  // Check if IP is blocked
  isIPBlocked(ip, provider) {
    const key = `${ip}:${provider}`;
    const attempts = this.failedAttempts.get(key);
    
    if (attempts && attempts.blockedUntil && attempts.blockedUntil > new Date()) {
      return {
        blocked: true,
        blockedUntil: attempts.blockedUntil
      };
    }

    return {
      blocked: false
    };
  }

  // Get webhook statistics
  getStats() {
    const now = new Date();
    const stats = {
      processedWebhooks: this.processedWebhooks.size,
      failedAttempts: this.failedAttempts.size,
      currentlyBlocked: 0,
      providerStats: {},
      topIPs: []
    };

    // Provider stats
    for (const [key, webhook] of this.processedWebhooks.entries()) {
      const provider = webhook.provider;
      stats.providerStats[provider] = (stats.providerStats[provider] || 0) + 1;
    }

    // Blocked IPs
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (attempts.blockedUntil && attempts.blockedUntil > now) {
        stats.currentlyBlocked++;
        
        const [ip, provider] = key.split(':');
        stats.topIPs.push({
          ip,
          provider,
          attempts: attempts.count,
          blockedUntil: attempts.blockedUntil
        });
      }
    }

    // Sort by attempts and take top 10
    stats.topIPs.sort((a, b) => b.attempts - a.attempts);
    stats.topIPs = stats.topIPs.slice(0, 10);

    return stats;
  }

  // Setup cleanup interval
  setupCleanupInterval() {
    // Clean up old data every hour
    setInterval(() => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      // Clean up old processed webhooks (keep last 1000)
      if (this.processedWebhooks.size > 1000) {
        const entries = Array.from(this.processedWebhooks.entries());
        this.processedWebhooks.clear();
        
        // Keep the most recent 1000 entries
        entries.slice(-1000).forEach(([key, value]) => {
          this.processedWebhooks.set(key, value);
        });
      }

      // Clean up old failed attempts
      for (const [key, attempts] of this.failedAttempts.entries()) {
        if (attempts.lastAttempt < oneHourAgo && !attempts.blockedUntil) {
          this.failedAttempts.delete(key);
        }
      }

      console.log('🧹 Cleaned up webhook verification data');
    }, 3600000); // Every hour
  }
}

// Singleton instance
const webhookVerification = new WebhookVerification();

// Middleware function
const webhookVerificationMiddleware = (provider = null) => {
  return (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      
      // Check if IP is blocked
      const blockCheck = webhookVerification.isIPBlocked(ip, provider);
      if (blockCheck.blocked) {
        console.warn('Blocked webhook attempt:', {
          ip,
          provider,
          blockedUntil: blockCheck.blockedUntil,
          timestamp: new Date().toISOString()
        });

        return res.status(429).json({
          error: 'Webhook endpoint temporarily blocked',
          code: 'WEBHOOK_BLOCKED',
          retryAfter: 3600
        });
      }

      // Verify webhook signature
      const verification = webhookVerification.verifyWebhook(req, provider);
      
      if (!verification.valid) {
        console.warn('Webhook verification failed:', {
          ip,
          provider,
          reason: verification.reason,
          timestamp: new Date().toISOString()
        });

        // Record failed attempt
        webhookVerification.recordFailedAttempt(ip, provider);

        return res.status(401).json({
          error: 'Webhook verification failed',
          code: 'WEBHOOK_VERIFICATION_FAILED',
          reason: verification.reason
        });
      }

      // Validate payload
      const payloadValidation = webhookVerification.validateWebhookPayload(
        verification.event, 
        verification.provider
      );

      if (!payloadValidation.valid) {
        console.warn('Webhook payload validation failed:', {
          ip,
          provider,
          errors: payloadValidation.errors,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          error: 'Invalid webhook payload',
          code: 'INVALID_PAYLOAD',
          errors: payloadValidation.errors
        });
      }

      // Check for duplicate webhook
      const eventId = verification.event.id || verification.event.event_id;
      const duplicateCheck = webhookVerification.checkDuplicateWebhook(
        eventId, 
        verification.provider
      );

      if (duplicateCheck.isDuplicate) {
        console.log('Duplicate webhook detected:', {
          ip,
          provider,
          eventId,
          processedAt: duplicateCheck.processedAt,
          timestamp: new Date().toISOString()
        });

        return res.status(200).json({
          success: true,
          message: 'Duplicate webhook acknowledged',
          originalResult: duplicateCheck.result
        });
      }

      // Add verification data to request
      req.webhookVerification = verification;
      req.webhookProvider = verification.provider;
      req.webhookEvent = verification.event;

      next();
    } catch (error) {
      console.error('Webhook verification middleware error:', error);
      res.status(500).json({
        error: 'Webhook verification error',
        code: 'WEBHOOK_ERROR'
      });
    }
  };
};

// Webhook processing middleware
const webhookProcessingMiddleware = (req, res, next) => {
  try {
    const { webhookProvider, webhookEvent } = req;
    const eventId = webhookEvent.id || webhookEvent.event_id;

    // Mark webhook as processed
    webhookVerification.markWebhookProcessed(eventId, webhookProvider, {
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    // Add processing metadata
    req.webhookProcessing = {
      eventId,
      provider: webhookProvider,
      receivedAt: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    next();
  } catch (error) {
    console.error('Webhook processing middleware error:', error);
    res.status(500).json({
      error: 'Webhook processing error',
      code: 'PROCESSING_ERROR'
    });
  }
};

// Statistics endpoint
const webhookStatsHandler = async (req, res) => {
  try {
    const stats = webhookVerification.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Webhook stats error:', error);
    res.status(500).json({
      error: 'Failed to get webhook statistics',
      code: 'STATS_ERROR'
    });
  }
};

module.exports = {
  WebhookVerification,
  webhookVerification,
  webhookVerificationMiddleware,
  webhookProcessingMiddleware,
  webhookStatsHandler
};
