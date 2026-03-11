import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { privacyComplianceService } from '../services/privacyCompliance.service.js';
import { securityLogger } from '../utils/securityLogger.js';
import { requirePermission, requireSelfOrAdmin } from '../middleware/rbac.middleware.js';
import { Permission } from '../middleware/rbac.middleware.js';

/**
 * Privacy Compliance Controller
 * Implements India DPDP Act 2023 requirements
 */
export class PrivacyController {
  /**
   * Record user consent
   */
  static async recordConsent(req: Request, res: Response, next: NextFunction) {
    try {
      const { consentType, granted, metadata } = req.body;
      const userId = req.user.id;

      // Validate consent type
      const validConsentTypes = ['personal_data', 'marketing', 'analytics', 'third_party'];
      if (!validConsentTypes.includes(consentType)) {
        return next(new AppError('Invalid consent type', 400, 'INVALID_CONSENT_TYPE'));
      }

      await privacyComplianceService.recordConsent(userId, consentType, granted, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        ...metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Consent recorded successfully',
        data: {
          userId,
          consentType,
          granted,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user consent summary
   */
  static async getConsentSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;

      const consentSummary = await privacyComplianceService.getConsentSummary(userId);

      securityLogger.logDataAccess(userId, 'consents', 'user_request', userId, req.ip);

      res.json({
        success: true,
        data: consentSummary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw user consent
   */
  static async withdrawConsent(req: Request, res: Response, next: NextFunction) {
    try {
      const { consentType, reason } = req.body;
      const userId = req.user.id;

      await privacyComplianceService.withdrawConsent(userId, consentType, reason);

      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
        data: {
          userId,
          consentType,
          withdrawnAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export user data (Right to Data Portability)
   */
  static async exportUserData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;

      const userData = await privacyComplianceService.exportUserData(userId);

      securityLogger.logDataAccess(userId, 'all_data', 'data_portability_request', userId, req.ip);

      // Set appropriate headers for data export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="singglebee_user_data_${userId}_${Date.now()}.json"`
      );

      res.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user data (Right to Erasure)
   */
  static async deleteUserData(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const userId = req.user.id;

      await privacyComplianceService.deleteUserData(userId, reason);

      securityLogger.logDataAccess(userId, 'all_data', 'data_deletion_request', userId, req.ip);

      res.json({
        success: true,
        message: 'User data deletion initiated successfully',
        data: {
          userId,
          requestedAt: new Date().toISOString(),
          reason,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get data access log (for user)
   */
  static async getDataAccessLog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      // This would typically query the database for access logs
      const accessLogs = {
        userId,
        logs: [], // Would contain actual access log entries
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      securityLogger.logDataAccess(userId, 'access_logs', 'user_request', userId, req.ip);

      res.json({
        success: true,
        data: accessLogs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get DPDP compliance report
   */
  static async getComplianceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await privacyComplianceService.generateComplianceReport();

      securityLogger.logDataAccess(
        'system',
        'compliance_report',
        'admin_request',
        req.user.id,
        req.ip
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get user consent data (for compliance monitoring)
   */
  static async getUserConsentData(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const consentData = await privacyComplianceService.getConsentSummary(userId);

      securityLogger.logDataAccess(
        userId,
        'consents',
        'admin_compliance_check',
        req.user.id,
        req.ip
      );

      res.json({
        success: true,
        data: consentData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Record data breach
   */
  static async recordDataBreach(req: Request, res: Response, next: NextFunction) {
    try {
      const { nature, impact, affectedUsers, measures, contact } = req.body;

      const breachRecord = {
        id: `breach_${Date.now()}`,
        nature,
        impact,
        affectedUsers,
        measures,
        contact,
        reportedAt: new Date().toISOString(),
        reportedBy: req.user.id,
        status: 'investigating',
      };

      // Store breach record (would typically go to database)
      securityLogger.logSystemEvent('data_breach_reported', 'critical', breachRecord);

      res.status(201).json({
        success: true,
        message: 'Data breach recorded successfully',
        data: breachRecord,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { marketing, analytics, thirdParty } = req.body;
      const userId = req.user.id;

      // Update consent for each preference
      if (marketing !== undefined) {
        await privacyComplianceService.recordConsent(userId, 'marketing', marketing, {
          purpose: 'marketing_preferences',
        });
      }

      if (analytics !== undefined) {
        await privacyComplianceService.recordConsent(userId, 'analytics', analytics, {
          purpose: 'analytics_preferences',
        });
      }

      if (thirdParty !== undefined) {
        await privacyComplianceService.recordConsent(userId, 'third_party', thirdParty, {
          purpose: 'third_party_preferences',
        });
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          userId,
          preferences: {
            marketing,
            analytics,
            thirdParty,
          },
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get privacy policy
   */
  static async getPrivacyPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const policy = {
        version: '1.0',
        lastUpdated: '2026-03-10',
        framework: 'India DPDP Act 2023',

        sections: [
          {
            title: 'Data Collection',
            content:
              'We collect personal data necessary for providing our services, including name, email, phone, and address information.',
          },
          {
            title: 'Data Usage',
            content:
              'Your data is used for order processing, customer support, and service improvement. We never sell your personal data.',
          },
          {
            title: 'Data Sharing',
            content:
              'We only share data with trusted service providers necessary for operations, and only with your consent.',
          },
          {
            title: 'Data Security',
            content:
              'We implement industry-standard security measures including encryption, access controls, and regular audits.',
          },
          {
            title: 'Your Rights',
            content:
              'You have the right to access, correct, delete, and export your personal data at any time.',
          },
          {
            title: 'Data Retention',
            content:
              'We retain your data only as long as necessary for legal and business purposes, typically up to 7 years.',
          },
          {
            title: 'Contact Information',
            content:
              'For privacy concerns, contact us at privacy@singglebee.com or call our privacy hotline.',
          },
        ],

        contact: {
          email: 'privacy@singglebee.com',
          phone: '+91-XXXX-XXXX-XXXX',
          address: 'Privacy Officer, SINGGLEBEE, Bangalore, India',
        },
      };

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cookie preferences
   */
  static async getCookiePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const preferences = {
        necessary: true, // Always required
        functional: false,
        analytics: false,
        marketing: false,
      };

      // If user is logged in, get their preferences
      if (userId) {
        const hasAnalyticsConsent = await privacyComplianceService.hasConsent(userId, 'analytics');
        const hasMarketingConsent = await privacyComplianceService.hasConsent(userId, 'marketing');

        preferences.analytics = hasAnalyticsConsent;
        preferences.marketing = hasMarketingConsent;
      }

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update cookie preferences
   */
  static async updateCookiePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { functional, analytics, marketing } = req.body;
      const userId = req.user?.id;

      if (userId) {
        // Update consent for analytics and marketing cookies
        if (analytics !== undefined) {
          await privacyComplianceService.recordConsent(userId, 'analytics', analytics, {
            purpose: 'analytics_cookies',
          });
        }

        if (marketing !== undefined) {
          await privacyComplianceService.recordConsent(userId, 'marketing', marketing, {
            purpose: 'marketing_cookies',
          });
        }
      }

      // Set cookie preferences in response
      const cookiePreferences = {
        necessary: true,
        functional: functional || false,
        analytics: analytics || false,
        marketing: marketing || false,
      };

      res.cookie('cookie_preferences', JSON.stringify(cookiePreferences), {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.json({
        success: true,
        message: 'Cookie preferences updated successfully',
        data: cookiePreferences,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PrivacyController;
