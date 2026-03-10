const crypto = require('crypto');
const validator = require('validator');
const { encryptSensitiveData, decryptSensitiveData } = require('./security-hardening');

/**
 * Advanced Payment Validation and Security Middleware
 */

// Payment amount validation
const validatePaymentAmount = (amount) => {
  // Convert to number and validate
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    throw new Error('Invalid payment amount');
  }
  
  if (numAmount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  
  if (numAmount > 100000) { // Max ₹1,00,000
    throw new Error('Payment amount exceeds maximum limit');
  }
  
  // Check for suspicious decimal places
  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new Error('Invalid decimal places in payment amount');
  }
  
  return numAmount;
};

// Card validation
const validateCard = (cardData) => {
  const errors = [];
  
  // Card number validation
  if (!cardData.cardNumber) {
    errors.push('Card number is required');
  } else {
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    
    if (!validator.isCreditCard(cleanCardNumber)) {
      errors.push('Invalid card number');
    }
    
    // Luhn algorithm check
    if (!luhnCheck(cleanCardNumber)) {
      errors.push('Invalid card number format');
    }
    
    // Check for known test cards
    const testCards = ['4111111111111111', '4000000000000002', '5555555555554444'];
    if (testCards.includes(cleanCardNumber)) {
      errors.push('Test card numbers not allowed in production');
    }
  }
  
  // Expiry date validation
  if (!cardData.expiryMonth || !cardData.expiryYear) {
    errors.push('Expiry date is required');
  } else {
    const month = parseInt(cardData.expiryMonth);
    const year = parseInt(cardData.expiryYear);
    const now = new Date();
    const expiry = new Date(year, month, 0);
    
    if (month < 1 || month > 12) {
      errors.push('Invalid expiry month');
    }
    
    if (year < now.getFullYear() || year > now.getFullYear() + 10) {
      errors.push('Invalid expiry year');
    }
    
    if (expiry < now) {
      errors.push('Card has expired');
    }
  }
  
  // CVV validation
  if (!cardData.cvv) {
    errors.push('CVV is required');
  } else {
    if (!/^\d{3,4}$/.test(cardData.cvv)) {
      errors.push('Invalid CVV format');
    }
  }
  
  // Cardholder name validation
  if (!cardData.cardholderName) {
    errors.push('Cardholder name is required');
  } else {
    if (!validator.isLength(cardData.cardholderName, { min: 2, max: 50 })) {
      errors.push('Cardholder name must be 2-50 characters');
    }
    
    if (!/^[a-zA-Z\s'-]+$/.test(cardData.cardholderName)) {
      errors.push('Cardholder name contains invalid characters');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// UPI validation
const validateUPI = (upiData) => {
  const errors = [];
  
  // UPI ID validation
  if (!upiData.upiId) {
    errors.push('UPI ID is required');
  } else {
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    if (!upiPattern.test(upiData.upiId)) {
      errors.push('Invalid UPI ID format');
    }
    
    if (!validator.isLength(upiData.upiId, { min: 5, max: 50 })) {
      errors.push('UPI ID must be 5-50 characters');
    }
  }
  
  // UPI PIN validation (should never be stored or logged)
  if (upiData.upiPin) {
    console.error('SECURITY WARNING: UPI PIN should never be stored or transmitted');
    errors.push('UPI PIN should not be included in request');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// Net banking validation
const validateNetBanking = (bankingData) => {
  const errors = [];
  
  // Account number validation
  if (!bankingData.accountNumber) {
    errors.push('Account number is required');
  } else {
    if (!/^\d{9,18}$/.test(bankingData.accountNumber.replace(/\s/g, ''))) {
      errors.push('Invalid account number format');
    }
  }
  
  // IFSC code validation
  if (!bankingData.ifscCode) {
    errors.push('IFSC code is required');
  } else {
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(bankingData.ifscCode)) {
      errors.push('Invalid IFSC code format');
    }
  }
  
  // Bank name validation
  if (!bankingData.bankName) {
    errors.push('Bank name is required');
  } else {
    if (!validator.isLength(bankingData.bankName, { min: 2, max: 100 })) {
      errors.push('Bank name must be 2-100 characters');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// Wallet validation
const validateWallet = (walletData) => {
  const errors = [];
  
  // Wallet type validation
  const validWallets = ['paytm', 'phonepe', 'googlepay', 'amazonpay'];
  if (!walletData.walletType || !validWallets.includes(walletData.walletType.toLowerCase())) {
    errors.push('Invalid wallet type');
  }
  
  // Wallet number/ID validation
  if (!walletData.walletNumber) {
    errors.push('Wallet number/ID is required');
  } else {
    if (!/^\d{10}$/.test(walletData.walletNumber)) {
      errors.push('Invalid wallet number format');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// Luhn algorithm for card validation
const luhnCheck = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Payment fraud detection
const detectPaymentFraud = (paymentData, req) => {
  const fraudSignals = [];
  const riskScore = 0;
  
  // Check velocity (multiple payments in short time)
  const paymentVelocity = checkPaymentVelocity(req.ip, req.user?.id);
  if (paymentVelocity.count > 5 && paymentVelocity.timeWindow < 300) { // 5 payments in 5 minutes
    fraudSignals.push('High payment velocity detected');
    riskScore += 30;
  }
  
  // Check amount anomalies
  const avgOrderValue = getAverageOrderValue(req.user?.id);
  if (paymentData.amount > avgOrderValue * 5) { // 5x average
    fraudSignals.push('Unusually high payment amount');
    riskScore += 25;
  }
  
  // Check geographic anomalies
  const userLocation = getUserLocation(req.user?.id);
  const paymentLocation = getPaymentLocation(req.ip);
  if (userLocation && paymentLocation && calculateDistance(userLocation, paymentLocation) > 1000) { // 1000km
    fraudSignals.push('Geographic anomaly detected');
    riskScore += 20;
  }
  
  // Check device fingerprinting
  const deviceFingerprint = generateDeviceFingerprint(req);
  const knownDevices = getKnownDevices(req.user?.id);
  if (!knownDevices.includes(deviceFingerprint)) {
    fraudSignals.push('New device detected');
    riskScore += 15;
  }
  
  // Check time-based patterns
  const userPaymentTimes = getUserPaymentTimes(req.user?.id);
  const currentHour = new Date().getHours();
  if (userPaymentTimes.length > 0) {
    const userHours = userPaymentTimes.map(time => new Date(time).getHours());
    if (!userHours.includes(currentHour)) {
      fraudSignals.push('Unusual payment time');
      riskScore += 10;
    }
  }
  
  return {
    riskScore,
    fraudSignals,
    isHighRisk: riskScore > 50,
    requiresManualReview: riskScore > 30
  };
};

// Payment velocity checking
const checkPaymentVelocity = (ip, userId) => {
  // In production, use Redis or database for tracking
  const key = `payment_velocity:${userId || ip}`;
  const now = Date.now();
  const timeWindow = 300000; // 5 minutes in milliseconds
  
  // This would be stored in Redis in production
  const storedData = {
    count: 0,
    timestamps: []
  };
  
  // Filter recent payments
  const recentPayments = storedData.timestamps.filter(
    timestamp => now - timestamp < timeWindow
  );
  
  return {
    count: recentPayments.length,
    timeWindow: timeWindow / 1000 // in seconds
  };
};

// Helper functions (simplified for demo)
const getAverageOrderValue = (userId) => {
  // In production, fetch from database
  return 1500; // ₹1500 average
};

const getUserLocation = (userId) => {
  // In production, fetch from user profile or IP geolocation
  return { lat: 13.0827, lng: 80.2707 }; // Chennai
};

const getPaymentLocation = (ip) => {
  // In production, use IP geolocation service
  return { lat: 13.0827, lng: 80.2707 }; // Chennai
};

const calculateDistance = (loc1, loc2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1-a)
  );
  
  return R * c;
};

const generateDeviceFingerprint = (req) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  return crypto.createHash('sha256')
    .update(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
    .digest('hex');
};

const getKnownDevices = (userId) => {
  // In production, fetch from database
  return ['known_device_1', 'known_device_2'];
};

const getUserPaymentTimes = (userId) => {
  // In production, fetch from database
  return ['2024-03-10T10:00:00Z', '2024-03-10T14:30:00Z'];
};

// Payment validation middleware
const validatePayment = (req, res, next) => {
  try {
    const { paymentMethod, ...paymentData } = req.body;
    
    // Validate payment method
    if (!paymentMethod) {
      return res.status(400).json({
        error: 'Payment method is required',
        code: 'MISSING_PAYMENT_METHOD'
      });
    }
    
    // Validate payment amount
    const amount = validatePaymentAmount(paymentData.amount);
    
    // Method-specific validation
    switch (paymentMethod.toLowerCase()) {
      case 'card':
        validateCard(paymentData);
        break;
      case 'upi':
        validateUPI(paymentData);
        break;
      case 'netbanking':
        validateNetBanking(paymentData);
        break;
      case 'wallet':
        validateWallet(paymentData);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid payment method',
          code: 'INVALID_PAYMENT_METHOD'
        });
    }
    
    // Fraud detection
    const fraudCheck = detectPaymentFraud(paymentData, req);
    
    if (fraudCheck.isHighRisk) {
      console.warn('High-risk payment detected:', {
        userId: req.user?.id,
        ip: req.ip,
        amount: paymentData.amount,
        riskScore: fraudCheck.riskScore,
        signals: fraudCheck.fraudSignals
      });
      
      return res.status(403).json({
        error: 'Payment blocked due to security concerns',
        code: 'PAYMENT_BLOCKED',
        requiresManualReview: true
      });
    }
    
    // Add fraud check data to request
    req.fraudCheck = fraudCheck;
    req.validatedPaymentData = {
      ...paymentData,
      amount,
      paymentMethod: paymentMethod.toLowerCase()
    };
    
    next();
    
  } catch (error) {
    console.error('Payment validation error:', error);
    res.status(400).json({
      error: error.message,
      code: 'PAYMENT_VALIDATION_ERROR'
    });
  }
};

// Payment processing security
const securePaymentProcessing = (req, res, next) => {
  // Encrypt sensitive payment data
  if (req.validatedPaymentData) {
    const sensitiveFields = ['cardNumber', 'cvv', 'upiPin', 'accountNumber'];
    
    sensitiveFields.forEach(field => {
      if (req.validatedPaymentData[field]) {
        req.validatedPaymentData[field] = encryptSensitiveData(
          req.validatedPaymentData[field]
        );
      }
    });
  }
  
  next();
};

// Payment response security
const securePaymentResponse = (req, res, next) => {
  const originalSend = res.json;
  
  res.json = function(data) {
    // Remove sensitive data from response
    if (data.paymentDetails) {
      const sensitiveFields = ['cardNumber', 'cvv', 'upiPin', 'accountNumber'];
      
      sensitiveFields.forEach(field => {
        if (data.paymentDetails[field]) {
          delete data.paymentDetails[field];
        }
      });
      
      // Mark if data was encrypted
      if (data.paymentDetails.encrypted) {
        data.paymentDetails.encrypted = true;
        data.paymentDetails.fieldsEncrypted = sensitiveFields;
      }
    }
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    originalSend.call(res, data);
  };
  
  next();
};

// Payment webhook security
const validatePaymentWebhook = (req, res, next) => {
  const signature = req.get('x-signature');
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    return res.status(400).json({
      error: 'Missing webhook signature',
      code: 'MISSING_SIGNATURE'
    });
  }
  
  // Verify webhook signature (using HMAC-SHA256)
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.warn('Invalid webhook signature:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signature,
      expectedSignature,
      timestamp: new Date().toISOString()
    });
    
    return res.status(401).json({
      error: 'Invalid webhook signature',
      code: 'INVALID_SIGNATURE'
    });
  }
  
  // Rate limit webhooks
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100, // 100 webhooks per minute
    message: {
      error: 'Too many webhook requests',
      code: 'WEBHOOK_RATE_LIMIT'
    }
  });
  
  webhookLimiter(req, res, next);
};

module.exports = {
  validatePayment,
  securePaymentProcessing,
  securePaymentResponse,
  validatePaymentWebhook,
  validatePaymentAmount,
  validateCard,
  validateUPI,
  validateNetBanking,
  validateWallet,
  detectPaymentFraud
};
