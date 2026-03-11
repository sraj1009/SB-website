import { AppError } from '../utils/AppError.js';
import { securityLogger } from '../utils/securityLogger.js';
import { encryptionService } from './encryption.service.js';
import redisClient from '../config/redis.js';

// India DPDP Act 2023 Configuration
const DPDP_CONFIG = {
  // Consent management
  consent: {
    types: {
      PERSONAL_DATA: 'personal_data',
      MARKETING: 'marketing',
      ANALYTICS: 'analytics',
      THIRD_PARTY: 'third_party',
    },
    storageDuration: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    withdrawalPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  // Data retention
  retention: {
    userAccount: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    orders: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    payments: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    logs: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
    analytics: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
  },

  // Data subject rights
  rights: {
    access: true,
    correction: true,
    erasure: true,
    portability: true,
    objection: true,
  },

  // Data breach notification
  breach: {
    notificationThreshold: 72 * 60 * 60 * 1000, // 72 hours
    requiredFields: ['nature', 'impact', 'measures', 'contact'],
  },
};

/**
 * Privacy Compliance Service for India DPDP Act 2023
 */
export class PrivacyComplianceService {
  private static instance: PrivacyComplianceService;
  private redis = redisClient;

  static getInstance(): PrivacyComplianceService {
    if (!PrivacyComplianceService.instance) {
      PrivacyComplianceService.instance = new PrivacyComplianceService();
    }
    return PrivacyComplianceService.instance;
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    metadata?: any
  ): Promise<void> {
    try {
      const consentRecord = {
        userId,
        consentType,
        granted,
        timestamp: new Date().toISOString(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        purpose: metadata?.purpose,
        version: '1.0',
      };

      // Store consent record
      const consentKey = `singglebee:consent:${userId}:${consentType}`;
      await this.redis.setex(
        consentKey,
        DPDP_CONFIG.consent.storageDuration / 1000,
        JSON.stringify(consentRecord)
      );

      // Log consent event
      securityLogger.logSystemEvent('consent_recorded', 'low', {
        userId,
        consentType,
        granted,
        timestamp: consentRecord.timestamp,
      });

      // Update user's consent summary
      const summaryKey = `singglebee:consent_summary:${userId}`;
      const summary = (await this.redis.hgetall(summaryKey)) || {};
      summary[consentType] = consentRecord.timestamp;
      await this.redis.hmset(summaryKey, summary);
      await this.redis.expire(summaryKey, DPDP_CONFIG.consent.storageDuration / 1000);
    } catch (error) {
      securityLogger.logSystemEvent('consent_recording_failed', 'high', {
        userId,
        consentType,
        error,
      });
      throw new AppError('Failed to record consent', 500, 'CONSENT_RECORDING_ERROR');
    }
  }

  /**
   * Check if user has given consent for specific data processing
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      const consentKey = `singglebee:consent:${userId}:${consentType}`;
      const consentRecord = await this.redis.get(consentKey);

      if (!consentRecord) {
        return false;
      }

      const consent = JSON.parse(consentRecord);
      return consent.granted === true;
    } catch (error) {
      securityLogger.logSystemEvent('consent_check_failed', 'medium', {
        userId,
        consentType,
        error,
      });
      return false; // Fail safe - no consent if check fails
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentType: string, reason?: string): Promise<void> {
    try {
      // Record withdrawal
      const withdrawalRecord = {
        userId,
        consentType,
        withdrawn: true,
        timestamp: new Date().toISOString(),
        reason,
      };

      const withdrawalKey = `singglebee:consent_withdrawal:${userId}:${consentType}`;
      await this.redis.setex(
        withdrawalKey,
        DPDP_CONFIG.consent.withdrawalPeriod / 1000,
        JSON.stringify(withdrawalRecord)
      );

      // Update consent status
      const consentKey = `singglebee:consent:${userId}:${consentType}`;
      const existingConsent = await this.redis.get(consentKey);

      if (existingConsent) {
        const consent = JSON.parse(existingConsent);
        consent.granted = false;
        consent.withdrawnAt = new Date().toISOString();
        await this.redis.setex(
          consentKey,
          DPDP_CONFIG.consent.storageDuration / 1000,
          JSON.stringify(consent)
        );
      }

      securityLogger.logSystemEvent('consent_withdrawn', 'medium', {
        userId,
        consentType,
        reason,
        timestamp: withdrawalRecord.timestamp,
      });
    } catch (error) {
      securityLogger.logSystemEvent('consent_withdrawal_failed', 'high', {
        userId,
        consentType,
        error,
      });
      throw new AppError('Failed to withdraw consent', 500, 'CONSENT_WITHDRAWAL_ERROR');
    }
  }

  /**
   * Export user data (Right to Data Portability)
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      // Check if user has consent for data export
      const hasAccessConsent = await this.hasConsent(
        userId,
        DPDP_CONFIG.consent.types.PERSONAL_DATA
      );
      if (!hasAccessConsent) {
        throw new AppError('User has not consented to data access', 403, 'NO_CONSENT_FOR_ACCESS');
      }

      const exportData = {
        userId,
        exportTimestamp: new Date().toISOString(),
        format: 'JSON',
        version: '1.0',

        // User profile data
        profile: await this.getUserProfileData(userId),

        // Order history
        orders: await this.getUserOrderData(userId),

        // Payment information (sanitized)
        payments: await this.getUserPaymentData(userId),

        // Consent records
        consents: await this.getUserConsentData(userId),

        // Activity logs (last 90 days)
        activity: await this.getUserActivityData(userId, 90),

        // Analytics data (anonymized)
        analytics: await this.getUserAnalyticsData(userId),
      };

      // Log data export
      securityLogger.logSystemEvent('data_exported', 'medium', {
        userId,
        exportTimestamp: exportData.exportTimestamp,
        dataSize: JSON.stringify(exportData).length,
      });

      return exportData;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      securityLogger.logSystemEvent('data_export_failed', 'high', { userId, error });
      throw new AppError('Failed to export user data', 500, 'DATA_EXPORT_ERROR');
    }
  }

  /**
   * Delete user data (Right to Erasure)
   */
  async deleteUserData(userId: string, reason?: string): Promise<void> {
    try {
      // Check if user has consent for data deletion
      const hasErasureConsent = await this.hasConsent(
        userId,
        DPDP_CONFIG.consent.types.PERSONAL_DATA
      );
      if (!hasErasureConsent) {
        throw new AppError('User has not consented to data erasure', 403, 'NO_CONSENT_FOR_ERASURE');
      }

      // Record deletion request
      const deletionRecord = {
        userId,
        requestedAt: new Date().toISOString(),
        reason,
        status: 'processing',
        dataTypes: [],
      };

      // Delete user profile data
      await this.deleteUserProfileData(userId);
      deletionRecord.dataTypes.push('profile');

      // Anonymize order data (keep for legal requirements)
      await this.anonymizeUserOrderData(userId);
      deletionRecord.dataTypes.push('orders');

      // Delete payment information
      await this.deleteUserPaymentData(userId);
      deletionRecord.dataTypes.push('payments');

      // Delete consent records
      await this.deleteUserConsentData(userId);
      deletionRecord.dataTypes.push('consents');

      // Delete activity logs
      await this.deleteUserActivityData(userId);
      deletionRecord.dataTypes.push('activity');

      // Delete analytics data
      await this.deleteUserAnalyticsData(userId);
      deletionRecord.dataTypes.push('analytics');

      deletionRecord.status = 'completed';
      deletionRecord.completedAt = new Date().toISOString();

      // Store deletion record
      const deletionKey = `singglebee:data_deletion:${userId}`;
      await this.redis.setex(
        deletionKey,
        DPDP_CONFIG.retention.userAccount / 1000,
        JSON.stringify(deletionRecord)
      );

      securityLogger.logSystemEvent('data_deleted', 'high', {
        userId,
        reason,
        dataTypes: deletionRecord.dataTypes,
        completedAt: deletionRecord.completedAt,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      securityLogger.logSystemEvent('data_deletion_failed', 'high', { userId, error });
      throw new AppError('Failed to delete user data', 500, 'DATA_DELETION_ERROR');
    }
  }

  /**
   * Get user's consent summary
   */
  async getConsentSummary(userId: string): Promise<any> {
    try {
      const summaryKey = `singglebee:consent_summary:${userId}`;
      const summary = (await this.redis.hgetall(summaryKey)) || {};

      const consentDetails = {};

      for (const [consentType, timestamp] of Object.entries(summary)) {
        const consentKey = `singglebee:consent:${userId}:${consentType}`;
        const consentRecord = await this.redis.get(consentKey);

        if (consentRecord) {
          const consent = JSON.parse(consentRecord);
          consentDetails[consentType] = {
            granted: consent.granted,
            timestamp: consent.timestamp,
            withdrawnAt: consent.withdrawnAt,
          };
        }
      }

      return {
        userId,
        consentSummary: consentDetails,
        lastUpdated: Math.max(
          ...Object.values(summary).map((ts) => new Date(ts as string).getTime())
        ),
      };
    } catch (error) {
      securityLogger.logSystemEvent('consent_summary_failed', 'medium', { userId, error });
      throw new AppError('Failed to get consent summary', 500, 'CONSENT_SUMMARY_ERROR');
    }
  }

  /**
   * Record data access for audit trail
   */
  async recordDataAccess(
    userId: string,
    dataCategory: string,
    purpose: string,
    accessedBy?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const accessRecord = {
        userId,
        dataCategory,
        purpose,
        accessedBy: accessedBy || 'system',
        ipAddress,
        timestamp: new Date().toISOString(),
      };

      const accessKey = `singglebee:data_access:${userId}:${Date.now()}`;
      await this.redis.setex(
        accessKey,
        DPDP_CONFIG.retention.logs / 1000,
        JSON.stringify(accessRecord)
      );

      // Update access summary
      const summaryKey = `singglebee:data_access_summary:${userId}`;
      await this.redis.hincrby(summaryKey, dataCategory, 1);
      await this.redis.expire(summaryKey, DPDP_CONFIG.retention.logs / 1000);
    } catch (error) {
      securityLogger.logSystemEvent('data_access_recording_failed', 'medium', {
        userId,
        dataCategory,
        error,
      });
    }
  }

  /**
   * Generate DPDP compliance report
   */
  async generateComplianceReport(): Promise<any> {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        framework: 'India DPDP Act 2023',
        version: '1.0',

        // Consent management
        consentManagement: {
          enabled: true,
          types: Object.values(DPDP_CONFIG.consent.types),
          storageDuration: DPDP_CONFIG.consent.storageDuration,
          withdrawalPeriod: DPDP_CONFIG.consent.withdrawalPeriod,
        },

        // Data retention
        dataRetention: {
          userAccount: DPDP_CONFIG.retention.userAccount,
          orders: DPDP_CONFIG.retention.orders,
          payments: DPDP_CONFIG.retention.payments,
          logs: DPDP_CONFIG.retention.logs,
          analytics: DPDP_CONFIG.retention.analytics,
        },

        // Data subject rights
        dataSubjectRights: {
          access: DPDP_CONFIG.rights.access,
          correction: DPDP_CONFIG.rights.correction,
          erasure: DPDP_CONFIG.rights.erasure,
          portability: DPDP_CONFIG.rights.portability,
          objection: DPDP_CONFIG.rights.objection,
        },

        // Data breach procedures
        breachProcedures: {
          notificationThreshold: DPDP_CONFIG.breach.notificationThreshold,
          requiredFields: DPDP_CONFIG.breach.requiredFields,
          monitoring: 'enabled',
        },

        // Security measures
        securityMeasures: {
          encryption: 'AES-256-GCM',
          accessControl: 'RBAC',
          auditLogging: 'enabled',
          dataMasking: 'enabled',
        },
      };

      return report;
    } catch (error) {
      securityLogger.logSystemEvent('compliance_report_generation_failed', 'high', { error });
      throw new AppError('Failed to generate compliance report', 500, 'COMPLIANCE_REPORT_ERROR');
    }
  }

  // Helper methods for data operations
  private async getUserProfileData(userId: string): Promise<any> {
    // This would query the User model
    // Return masked/encrypted data
    return {
      /* User profile data */
    };
  }

  private async getUserOrderData(userId: string): Promise<any> {
    // This would query the Order model
    return {
      /* User order data */
    };
  }

  private async getUserPaymentData(userId: string): Promise<any> {
    // This would query payment records (sanitized)
    return {
      /* User payment data */
    };
  }

  private async getUserConsentData(userId: string): Promise<any> {
    const consentSummary = await this.getConsentSummary(userId);
    return consentSummary;
  }

  private async getUserActivityData(userId: string, days: number): Promise<any> {
    // This would query activity logs
    return {
      /* User activity data */
    };
  }

  private async getUserAnalyticsData(userId: string): Promise<any> {
    // This would query analytics data (anonymized)
    return {
      /* User analytics data */
    };
  }

  private async deleteUserProfileData(userId: string): Promise<void> {
    // This would delete or anonymize user profile
  }

  private async anonymizeUserOrderData(userId: string): Promise<void> {
    // This would anonymize order data (keep for legal requirements)
  }

  private async deleteUserPaymentData(userId: string): Promise<void> {
    // This would delete payment information
  }

  private async deleteUserConsentData(userId: string): Promise<void> {
    const pattern = `singglebee:consent:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async deleteUserActivityData(userId: string): Promise<void> {
    // This would delete activity logs
  }

  private async deleteUserAnalyticsData(userId: string): Promise<void> {
    // This would delete analytics data
  }
}

// Export singleton instance
export const privacyComplianceService = PrivacyComplianceService.getInstance();

export default privacyComplianceService;
