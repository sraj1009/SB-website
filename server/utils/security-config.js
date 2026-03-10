// 🔐 Security Configuration Utilities

const crypto = require('crypto');

/**
 * Generate secure random string
 * @param {number} length - Length of the string
 * @returns {string} - Secure random string
 */
function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate JWT secret (64 characters base64)
 * @returns {string} - Secure JWT secret
 */
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('base64');
}

/**
 * Hash password using bcrypt (placeholder - install bcrypt)
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password
 */
function hashPassword(password) {
  // In production, use: const bcrypt = require('bcrypt');
  // return bcrypt.hash(password, 12);
  
  // Temporary hashing (NOT SECURE - replace with bcrypt)
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Compare password with hash (placeholder - install bcrypt)
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} - Whether password matches
 */
function comparePassword(password, hash) {
  // In production, use: const bcrypt = require('bcrypt');
  // return bcrypt.compare(password, hash);
  
  // Temporary comparison (NOT SECURE - replace with bcrypt)
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  return hashedPassword === hash;
}

/**
 * Generate secure session token
 * @returns {string} - Secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt sensitive data (AES-256-GCM)
 * @param {string} text - Plain text to encrypt
 * @param {string} key - Encryption key (32 bytes)
 * @returns {object} - Encrypted data with IV and tag
 */
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', Buffer.from(key, 'base64'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt sensitive data (AES-256-GCM)
 * @param {object} encryptedData - Encrypted data object
 * @param {string} key - Encryption key (32 bytes)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedData, key) {
  try {
    const decipher = crypto.createDecipher('aes-256-gcm', Buffer.from(key, 'base64'));
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
function validatePasswordStrength(password) {
  const result = {
    isValid: true,
    errors: [],
    score: 0
  };
  
  // Length check
  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('Password must be at least 8 characters long');
  } else {
    result.score += 1;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    result.errors.push('Password must contain at least one uppercase letter');
  } else {
    result.score += 1;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    result.errors.push('Password must contain at least one lowercase letter');
  } else {
    result.score += 1;
  }
  
  // Number check
  if (!/[0-9]/.test(password)) {
    result.errors.push('Password must contain at least one number');
  } else {
    result.score += 1;
  }
  
  // Special character check
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.errors.push('Password must contain at least one special character');
  } else {
    result.score += 1;
  }
  
  // Common password check
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'singglebee'];
  if (commonPasswords.includes(password.toLowerCase())) {
    result.isValid = false;
    result.errors.push('Password is too common');
  }
  
  return result;
}

/**
 * Generate secure API key
 * @returns {string} - Secure API key
 */
function generateAPIKey() {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `sk_${timestamp}_${randomPart}`;
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Whether API key is valid format
 */
function validateAPIKey(apiKey) {
  return /^sk_[a-z0-9]+_[a-f0-9]{32}$/.test(apiKey);
}

/**
 * Sanitize user input (XSS prevention)
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure reset token
 * @returns {object} - Token with expiry
 */
function generateResetToken() {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiry: new Date(Date.now() + 3600000) // 1 hour
  };
}

/**
 * Check if token is expired
 * @param {Date} expiry - Token expiry date
 * @returns {boolean} - Whether token is expired
 */
function isTokenExpired(expiry) {
  return new Date() > expiry;
}

module.exports = {
  generateSecureString,
  generateJWTSecret,
  hashPassword,
  comparePassword,
  generateSessionToken,
  encrypt,
  decrypt,
  validatePasswordStrength,
  generateAPIKey,
  validateAPIKey,
  sanitizeInput,
  validateEmail,
  generateResetToken,
  isTokenExpired
};
