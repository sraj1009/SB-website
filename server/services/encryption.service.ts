import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import mongoose from 'mongoose';
import { fieldEncryption } from 'mongoose-field-encryption';
import logger from '../utils/logger.js';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  // AES-256-GCM for sensitive data
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  tagLength: 16, // 128 bits

  // For mongoose-field-encryption
  secret: process.env.ENCRYPTION_SECRET || crypto.randomBytes(32).toString('hex'),
  saltLength: 16,

  // Fields to encrypt
  sensitiveFields: [
    'email',
    'phoneNumber',
    'shippingAddress',
    'billingAddress',
    'creditCardNumber',
    'cvv',
    'ssn',
    'bankAccount',
    'ifscCode',
    'panCard',
    'aadhaarNumber',
  ],
};

/**
 * Encryption Service for field-level encryption and data protection
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private masterKey: Buffer;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  constructor() {
    // Initialize master key from environment or generate
    this.masterKey = this.getMasterKey();
  }

  /**
   * Get or generate master encryption key
   */
  private getMasterKey(): Buffer {
    const envKey = process.env.MASTER_ENCRYPTION_KEY;

    if (envKey) {
      // Use environment key (base64 encoded)
      return Buffer.from(envKey, 'base64');
    }

    // Generate new key (in production, this should come from secure key management)
    logger.warn('No master encryption key found in environment, generating temporary key');
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encryptSensitiveData(data: string): { encrypted: string; iv: string; tag: string } {
    try {
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, this.masterKey);
      cipher.setAAD(Buffer.from('singglebee', 'utf8'));

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      logger.error('Data encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  decryptSensitiveData(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');

      const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, this.masterKey);
      decipher.setAAD(Buffer.from('singglebee', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Data decryption error:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Encrypt data for mongoose-field-encryption
   */
  encryptForMongoose(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, ENCRYPTION_CONFIG.secret).toString();
    } catch (error) {
      logger.error('Mongoose encryption error:', error);
      throw new Error('Failed to encrypt data for storage');
    }
  }

  /**
   * Decrypt data from mongoose-field-encryption
   */
  decryptFromMongoose(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_CONFIG.secret);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      logger.error('Mongoose decryption error:', error);
      throw new Error('Failed to decrypt data from storage');
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  generateDataHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyDataIntegrity(data: string, hash: string): boolean {
    const computedHash = this.generateDataHash(data);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive encryption key from password
   */
  deriveKeyFromPassword(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  /**
   * Create encryption plugin for Mongoose schemas
   */
  createEncryptionPlugin(fields: string[]) {
    return fieldEncryption({
      fields,
      secret: ENCRYPTION_CONFIG.secret,
      saltLength: ENCRYPTION_CONFIG.saltLength,
      encryptMethod: (data: string, secret: string) => {
        return this.encryptForMongoose(data);
      },
      decryptMethod: (data: string, secret: string) => {
        return this.decryptFromMongoose(data);
      },
    });
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };

    for (const field of ENCRYPTION_CONFIG.sensitiveFields) {
      if (masked[field]) {
        const value = String(masked[field]);
        if (value.length <= 4) {
          masked[field] = '****';
        } else {
          masked[field] = value.substring(0, 2) + '****' + value.substring(value.length - 2);
        }
      }
    }

    return masked;
  }

  /**
   * Encrypt backup data
   */
  encryptBackupData(data: any): { encrypted: string; key: string; iv: string } {
    try {
      const backupKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, backupKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        key: backupKey.toString('hex'),
        iv: iv.toString('hex'),
      };
    } catch (error) {
      logger.error('Backup encryption error:', error);
      throw new Error('Failed to encrypt backup data');
    }
  }

  /**
   * Decrypt backup data
   */
  decryptBackupData(backupData: { encrypted: string; key: string; iv: string }): any {
    try {
      const backupKey = Buffer.from(backupData.key, 'hex');
      const iv = Buffer.from(backupData.iv, 'hex');

      const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, backupKey);
      let decrypted = decipher.update(backupData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Backup decryption error:', error);
      throw new Error('Failed to decrypt backup data');
    }
  }

  /**
   * Generate secure token for API keys
   */
  generateSecureToken(prefix: string = 'sg'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Verify API token signature
   */
  verifyTokenSignature(token: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.masterKey)
        .update(token)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Token signature verification error:', error);
      return false;
    }
  }

  /**
   * Generate HMAC signature for webhooks
   */
  generateWebhookSignature(payload: string): string {
    return crypto.createHmac('sha256', this.masterKey).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = this.generateWebhookSignature(payload);

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Rotate encryption keys (for key rotation strategy)
   */
  async rotateEncryptionKey(): Promise<{ newKey: string; oldKey: string }> {
    try {
      const oldKey = this.masterKey.toString('hex');
      const newKey = crypto.randomBytes(32);

      // Update master key
      this.masterKey = newKey;

      logger.info('Encryption key rotated successfully');

      return {
        newKey: newKey.toString('hex'),
        oldKey,
      };
    } catch (error) {
      logger.error('Key rotation error:', error);
      throw new Error('Failed to rotate encryption key');
    }
  }

  /**
   * Get encryption configuration
   */
  getConfig() {
    return {
      algorithm: ENCRYPTION_CONFIG.algorithm,
      keyLength: ENCRYPTION_CONFIG.keyLength,
      ivLength: ENCRYPTION_CONFIG.ivLength,
      sensitiveFields: ENCRYPTION_CONFIG.sensitiveFields,
      // Don't expose the actual secret key
      hasSecret: !!ENCRYPTION_CONFIG.secret,
    };
  }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();

// Export encryption plugin for Mongoose schemas
export const encryptionPlugin = encryptionService.createEncryptionPlugin(
  ENCRYPTION_CONFIG.sensitiveFields
);

export default encryptionService;
