// 🔐 Webhook Security Middleware for Payment Processing

const crypto = require('crypto');

/**
 * Verify Cashfree webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Webhook-Signature header
 * @param {string} secret - Cashfree secret key
 * @returns {boolean} - Whether signature is valid
 */
function verifyCashfreeSignature(payload, signature, secret) {
  try {
    if (!payload || !signature || !secret) {
      return false;
    }
    
    // Cashfree uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Middleware to verify webhook signatures
 */
const webhookSecurity = (req, res, next) => {
  // Only apply to webhook endpoints
  if (!req.path.includes('/webhook')) {
    return next();
  }
  
  const signature = req.get('x-webhook-signature') || req.get('X-Webhook-Signature');
  const payload = req.rawBody || req.body;
  const secret = process.env.CASHFREE_SECRET_KEY;
  
  if (!signature) {
    console.warn('🚨 Webhook missing signature:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({
      error: 'Missing webhook signature',
      code: 'WEBHOOK_MISSING_SIGNATURE'
    });
  }
  
  if (!secret) {
    console.error('🚨 Cashfree secret key not configured');
    return res.status(500).json({
      error: 'Webhook verification not configured',
      code: 'WEBHOOK_NOT_CONFIGURED'
    });
  }
  
  // Verify signature
  const isValidSignature = verifyCashfreeSignature(
    typeof payload === 'string' ? payload : JSON.stringify(payload),
    signature,
    secret
  );
  
  if (!isValidSignature) {
    console.warn('🚨 Invalid webhook signature:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signature: signature.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({
      error: 'Invalid webhook signature',
      code: 'WEBHOOK_INVALID_SIGNATURE'
    });
  }
  
  // Log successful webhook verification
  console.log('✅ Webhook signature verified:', {
    ip: req.ip,
    timestamp: new Date().toISOString(),
    eventType: req.body?.type || 'unknown'
  });
  
  next();
};

/**
 * Middleware to preserve raw body for webhook verification
 * Must be used BEFORE express.json() for webhook routes
 */
const preserveRawBody = (req, res, buf, encoding) => {
  // Store raw body for webhook signature verification
  req.rawBody = buf;
};

/**
 * Rate limiting specifically for webhooks
 */
const webhookRateLimit = (req, res, next) => {
  const clientIP = req.ip;
  const webhookKey = `webhook:${clientIP}`;
  
  // Simple in-memory rate limiting (use Redis in production)
  const webhookAttempts = global.webhookAttempts || new Map();
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 10;
  
  if (!webhookAttempts.has(webhookKey)) {
    webhookAttempts.set(webhookKey, { count: 0, resetTime: now + windowMs });
  }
  
  const attempts = webhookAttempts.get(webhookKey);
  
  // Reset if window expired
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }
  
  attempts.count++;
  
  if (attempts.count > maxAttempts) {
    console.warn('🚨 Webhook rate limit exceeded:', {
      ip: clientIP,
      attempts: attempts.count,
      timestamp: new Date().toISOString()
    });
    
    return res.status(429).json({
      error: 'Too many webhook requests',
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, data] of webhookAttempts.entries()) {
      if (now > data.resetTime) {
        webhookAttempts.delete(key);
      }
    }
  }
  
  next();
};

/**
 * Webhook event validation
 */
const validateWebhookEvent = (req, res, next) => {
  const event = req.body;
  
  // Validate required fields
  if (!event || typeof event !== 'object') {
    return res.status(400).json({
      error: 'Invalid webhook payload',
      code: 'WEBHOOK_INVALID_PAYLOAD'
    });
  }
  
  // Validate event type
  const validEventTypes = [
    'payment.success',
    'payment.failed',
    'payment.pending',
    'order.created',
    'order.updated',
    'refund.initiated',
    'refund.processed'
  ];
  
  if (event.type && !validEventTypes.includes(event.type)) {
    console.warn('🚨 Unknown webhook event type:', {
      eventType: event.type,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Unknown event type',
      code: 'WEBHOOK_UNKNOWN_EVENT',
      eventType: event.type
    });
  }
  
  // Validate order ID if present
  if (event.data && event.data.orderId) {
    if (typeof event.data.orderId !== 'string' || event.data.orderId.length < 3) {
      return res.status(400).json({
        error: 'Invalid order ID',
        code: 'WEBHOOK_INVALID_ORDER_ID'
      });
    }
  }
  
  next();
};

module.exports = {
  webhookSecurity,
  preserveRawBody,
  webhookRateLimit,
  validateWebhookEvent,
  verifyCashfreeSignature
};
