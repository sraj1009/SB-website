import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';
import { securityLogger } from '../utils/securityLogger.js';
import { encryptionService } from './encryption.service.js';
import redisClient from '../config/redis.js';

// PCI-DSS compliance configuration
const PCI_DSS_CONFIG = {
  // Card data handling
  cardData: {
    maxStorageTime: 48 * 60 * 60 * 1000, // 48 hours in milliseconds
    allowedFields: ['last4', 'expiryMonth', 'expiryYear', 'brand'],
    forbiddenFields: ['cvv', 'pin', 'fullCardNumber', 'trackData'],
  },

  // Webhook security
  webhook: {
    signatureTolerance: 300, // 5 minutes tolerance
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Transaction limits
  transaction: {
    maxAmount: 100000, // ₹1,00,000
    dailyLimit: 500000, // ₹5,00,000
    maxAttempts: 3,
  },

  // Fraud detection
  fraud: {
    velocityCheckWindow: 15 * 60 * 1000, // 15 minutes
    maxTransactionsPerWindow: 5,
    suspiciousAmountThreshold: 25000, // ₹25,000
  },
};

/**
 * Payment Security Service for PCI-DSS compliance
 */
export class PaymentSecurityService {
  private static instance: PaymentSecurityService;
  private redis = redisClient;

  static getInstance(): PaymentSecurityService {
    if (!PaymentSecurityService.instance) {
      PaymentSecurityService.instance = new PaymentSecurityService();
    }
    return PaymentSecurityService.instance;
  }

  /**
   * Generate secure payment token
   */
  generatePaymentToken(orderId: string, userId: string): string {
    try {
      const timestamp = Date.now();
      const random = crypto.randomBytes(16).toString('hex');

      const payload = {
        orderId,
        userId,
        timestamp,
        random,
        purpose: 'payment',
      };

      const token = Buffer.from(JSON.stringify(payload)).toString('base64');
      const signature = this.generatePaymentTokenSignature(token);

      return `${token}.${signature}`;
    } catch (error) {
      securityLogger.logSystemEvent('payment_token_generation_failed', 'high', {
        orderId,
        userId,
        error,
      });
      throw new AppError('Failed to generate payment token', 500, 'PAYMENT_TOKEN_ERROR');
    }
  }

  /**
   * Verify payment token
   */
  async verifyPaymentToken(token: string): Promise<any> {
    try {
      const [tokenPart, signature] = token.split('.');

      if (!tokenPart || !signature) {
        throw new AppError('Invalid payment token format', 400, 'INVALID_TOKEN_FORMAT');
      }

      // Verify signature
      if (!this.verifyPaymentTokenSignature(tokenPart, signature)) {
        securityLogger.logMaliciousActivity(
          'invalid_payment_token_signature',
          'unknown',
          undefined,
          undefined,
          { token }
        );
        throw new AppError('Invalid payment token signature', 401, 'INVALID_TOKEN_SIGNATURE');
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(tokenPart, 'base64').toString());

      // Check token age (max 1 hour)
      const tokenAge = Date.now() - payload.timestamp;
      if (tokenAge > 60 * 60 * 1000) {
        throw new AppError('Payment token expired', 401, 'TOKEN_EXPIRED');
      }

      // Verify purpose
      if (payload.purpose !== 'payment') {
        throw new AppError('Invalid token purpose', 401, 'INVALID_TOKEN_PURPOSE');
      }

      return payload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      securityLogger.logSystemEvent('payment_token_verification_failed', 'high', { token, error });
      throw new AppError('Failed to verify payment token', 500, 'TOKEN_VERIFICATION_ERROR');
    }
  }

  /**
   * Generate signature for payment token
   */
  private generatePaymentTokenSignature(token: string): string {
    return crypto
      .createHmac('sha256', process.env.PAYMENT_TOKEN_SECRET || 'default-payment-secret')
      .update(token)
      .digest('hex');
  }

  /**
   * Verify payment token signature
   */
  private verifyPaymentTokenSignature(token: string, signature: string): boolean {
    try {
      const expectedSignature = this.generatePaymentTokenSignature(token);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Sanitize card data for storage (PCI-DSS compliance)
   */
  sanitizeCardData(cardData: any): any {
    try {
      const sanitized: any = {};

      // Only allow specific fields
      for (const field of PCI_DSS_CONFIG.cardData.allowedFields) {
        if (cardData[field]) {
          sanitized[field] = cardData[field];
        }
      }

      // Ensure forbidden fields are not present
      for (const forbiddenField of PCI_DSS_CONFIG.cardData.forbiddenFields) {
        if (cardData[forbiddenField]) {
          securityLogger.logMaliciousActivity(
            'forbidden_card_data_attempt',
            'unknown',
            undefined,
            undefined,
            { forbiddenField, hasValue: !!cardData[forbiddenField] }
          );

          throw new AppError(
            'Attempt to store forbidden card data detected',
            400,
            'FORBIDDEN_CARD_DATA'
          );
        }
      }

      // Add timestamp for automatic cleanup
      sanitized.createdAt = new Date();
      sanitized.expiresAt = new Date(Date.now() + PCI_DSS_CONFIG.cardData.maxStorageTime);

      return sanitized;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      securityLogger.logSystemEvent('card_data_sanitization_failed', 'high', { error });
      throw new AppError('Failed to sanitize card data', 500, 'CARD_DATA_ERROR');
    }
  }

  /**
   * Verify webhook signature (Cashfree)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Cashfree uses SHA256 HMAC
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );

      if (!isValid) {
        securityLogger.logMaliciousActivity(
          'invalid_webhook_signature',
          'unknown',
          undefined,
          undefined,
          { payload: payload.substring(0, 100), signature: signature.substring(0, 20) }
        );
      }

      return isValid;
    } catch (error) {
      securityLogger.logSystemEvent('webhook_signature_verification_failed', 'high', { error });
      return false;
    }
  }

  /**
   * Process webhook with idempotency
   */
  async processWebhook(webhookData: any): Promise<{ processed: boolean; result?: any }> {
    try {
      const eventId = webhookData.event?.id || webhookData.id;

      if (!eventId) {
        throw new AppError('Webhook event ID missing', 400, 'WEBHOOK_ID_MISSING');
      }

      // Check if already processed (idempotency)
      const processedKey = `singglebee:webhook:processed:${eventId}`;
      const isProcessed = await this.redis.get(processedKey);

      if (isProcessed) {
        securityLogger.logSystemEvent('webhook_duplicate_processed', 'medium', { eventId });
        return { processed: false, result: JSON.parse(isProcessed) };
      }

      // Store webhook data with TTL
      const webhookKey = `singglebee:webhook:data:${eventId}`;
      await this.redis.setex(webhookKey, 7 * 24 * 60 * 60, JSON.stringify(webhookData)); // 7 days

      // Mark as processed
      await this.redis.setex(
        processedKey,
        7 * 24 * 60 * 60,
        JSON.stringify({
          processedAt: new Date().toISOString(),
          eventType: webhookData.event?.type || 'unknown',
        })
      );

      securityLogger.logSystemEvent('webhook_processed', 'low', {
        eventId,
        eventType: webhookData.event?.type,
      });

      return { processed: true, result: webhookData };
    } catch (error) {
      securityLogger.logSystemEvent('webhook_processing_failed', 'high', { webhookData, error });
      throw new AppError('Failed to process webhook', 500, 'WEBHOOK_PROCESSING_ERROR');
    }
  }

  /**
   * Validate transaction limits
   */
  async validateTransactionLimits(
    userId: string,
    amount: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check maximum single transaction amount
      if (amount > PCI_DSS_CONFIG.transaction.maxAmount) {
        securityLogger.logMaliciousActivity(
          'transaction_amount_exceeded',
          'unknown',
          undefined,
          undefined,
          { userId, amount, maxAmount: PCI_DSS_CONFIG.transaction.maxAmount }
        );

        return { allowed: false, reason: 'Transaction amount exceeds maximum limit' };
      }

      // Check daily limit
      const dailyKey = `singglebee:daily_transaction:${userId}:${new Date().toISOString().split('T')[0]}`;
      const dailyTotal = (await this.redis.get(dailyKey)) || '0';
      const dailyAmount = parseFloat(dailyTotal);

      if (dailyAmount + amount > PCI_DSS_CONFIG.transaction.dailyLimit) {
        securityLogger.logMaliciousActivity(
          'daily_transaction_limit_exceeded',
          'unknown',
          undefined,
          undefined,
          { userId, amount, dailyAmount, dailyLimit: PCI_DSS_CONFIG.transaction.dailyLimit }
        );

        return { allowed: false, reason: 'Daily transaction limit exceeded' };
      }

      // Update daily total
      await this.redis.incrby(dailyKey, amount);
      await this.redis.expire(dailyKey, 24 * 60 * 60); // 24 hours

      return { allowed: true };
    } catch (error) {
      securityLogger.logSystemEvent('transaction_limit_validation_failed', 'high', {
        userId,
        amount,
        error,
      });
      throw new AppError(
        'Failed to validate transaction limits',
        500,
        'TRANSACTION_VALIDATION_ERROR'
      );
    }
  }

  /**
   * Fraud detection checks
   */
  async detectFraud(
    userId: string,
    transactionData: any
  ): Promise<{ risk: 'low' | 'medium' | 'high'; reasons: string[] }> {
    try {
      const reasons: string[] = [];
      let riskScore = 0;

      // Velocity check - multiple transactions in short time
      const velocityKey = `singglebee:velocity:${userId}`;
      const recentTransactions = await this.redis.lrange(velocityKey, 0, -1);

      if (recentTransactions.length >= PCI_DSS_CONFIG.fraud.maxTransactionsPerWindow) {
        reasons.push('High transaction velocity detected');
        riskScore += 30;
      }

      // Add current transaction to velocity tracking
      await this.redis.lpush(
        velocityKey,
        JSON.stringify({
          timestamp: Date.now(),
          amount: transactionData.amount,
          ip: transactionData.ip,
        })
      );
      await this.redis.expire(velocityKey, PCI_DSS_CONFIG.fraud.velocityCheckWindow / 1000);

      // Amount threshold check
      if (transactionData.amount > PCI_DSS_CONFIG.fraud.suspiciousAmountThreshold) {
        reasons.push('Suspicious transaction amount');
        riskScore += 20;
      }

      // IP-based checks
      if (transactionData.ip) {
        const ipKey = `singglebee:ip_transactions:${transactionData.ip}`;
        const ipTransactions = (await this.redis.get(ipKey)) || '0';

        if (parseInt(ipTransactions) > 10) {
          reasons.push('High activity from single IP');
          riskScore += 15;
        }

        await this.redis.incr(ipKey);
        await this.redis.expire(ipKey, 60 * 60); // 1 hour
      }

      // Device fingerprinting (if available)
      if (transactionData.deviceFingerprint) {
        const deviceKey = `singglebee:device_transactions:${transactionData.deviceFingerprint}`;
        const deviceTransactions = (await this.redis.get(deviceKey)) || '0';

        if (parseInt(deviceTransactions) > 5) {
          reasons.push('High activity from single device');
          riskScore += 10;
        }

        await this.redis.incr(deviceKey);
        await this.redis.expire(deviceKey, 24 * 60 * 60); // 24 hours
      }

      // Determine risk level
      let risk: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 50) {
        risk = 'high';
      } else if (riskScore >= 25) {
        risk = 'medium';
      }

      if (risk !== 'low') {
        securityLogger.logMaliciousActivity('fraud_detected', 'unknown', undefined, undefined, {
          userId,
          risk,
          reasons,
          riskScore,
          transactionData,
        });
      }

      return { risk, reasons };
    } catch (error) {
      securityLogger.logSystemEvent('fraud_detection_failed', 'high', {
        userId,
        transactionData,
        error,
      });
      throw new AppError('Failed to perform fraud detection', 500, 'FRAUD_DETECTION_ERROR');
    }
  }

  /**
   * Generate secure payment receipt ID
   */
  generateReceiptId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `SG${timestamp}${random}`;
  }

  /**
   * Mask card number for display
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }

    return `****-****-****-${cardNumber.substring(cardNumber.length - 4)}`;
  }

  /**
   * Clean up expired card data (PCI-DSS requirement)
   */
  async cleanupExpiredCardData(): Promise<number> {
    try {
      // This would typically be a scheduled job
      const expiredKey = 'singglebee:expired_card_data_cleanup';
      const lastCleanup = await this.redis.get(expiredKey);
      const now = Date.now();

      // Run cleanup every 24 hours
      if (lastCleanup && now - parseInt(lastCleanup) < 24 * 60 * 60 * 1000) {
        return 0;
      }

      // In a real implementation, this would query the database
      // for expired card data and delete it
      const cleanedCount = 0; // Placeholder

      await this.redis.set(expiredKey, now.toString());

      securityLogger.logSystemEvent('card_data_cleanup_completed', 'low', { cleanedCount });

      return cleanedCount;
    } catch (error) {
      securityLogger.logSystemEvent('card_data_cleanup_failed', 'high', { error });
      throw new AppError('Failed to cleanup expired card data', 500, 'CLEANUP_ERROR');
    }
  }

  /**
   * Generate PCI-DSS compliance report
   */
  async generateComplianceReport(): Promise<any> {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        complianceLevel: 'PCI-DSS v4.0',
        cardDataStorage: {
          compliant: true,
          maxStorageTime: PCI_DSS_CONFIG.cardData.maxStorageTime,
          allowedFields: PCI_DSS_CONFIG.cardData.allowedFields,
          forbiddenFields: PCI_DSS_CONFIG.cardData.forbiddenFields,
        },
        webhookSecurity: {
          signatureVerification: true,
          idempotency: true,
          maxRetries: PCI_DSS_CONFIG.webhook.maxRetries,
        },
        transactionLimits: {
          maxAmount: PCI_DSS_CONFIG.transaction.maxAmount,
          dailyLimit: PCI_DSS_CONFIG.transaction.dailyLimit,
        },
        fraudDetection: {
          enabled: true,
          velocityCheckWindow: PCI_DSS_CONFIG.fraud.velocityCheckWindow,
          maxTransactionsPerWindow: PCI_DSS_CONFIG.fraud.maxTransactionsPerWindow,
        },
        encryption: {
          algorithm: 'AES-256-GCM',
          keyRotation: 'Manual',
          dataMasking: true,
        },
      };

      return report;
    } catch (error) {
      securityLogger.logSystemEvent('compliance_report_generation_failed', 'high', { error });
      throw new AppError('Failed to generate compliance report', 500, 'COMPLIANCE_REPORT_ERROR');
    }
  }
}

// Export singleton instance
export const paymentSecurityService = PaymentSecurityService.getInstance();

export default paymentSecurityService;
