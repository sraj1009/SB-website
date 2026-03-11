import logger from './logger.js';

// Security event types
export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  SYSTEM = 'system',
  NETWORK = 'network',
  MALICIOUS = 'malicious',
}

// Security severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  message: string;
  details?: any;
  timestamp: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Security Logger with PII masking and structured logging
 */
export class SecurityLogger {
  private static instance: SecurityLogger;

  // PII fields to mask in logs
  private readonly PII_FIELDS = [
    'password',
    'newPassword',
    'oldPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'email',
    'phone',
    'address',
    'secret',
    'apiKey',
    'privateKey',
  ];

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log security event with PII masking
   */
  logSecurityEvent(event: SecurityEvent): void {
    try {
      const maskedEvent = this.maskPII(event);

      // Use structured logging for SIEM integration
      logger.warn('SECURITY_EVENT', {
        ...maskedEvent,
        category: 'security',
        source: 'singglebee-api',
        environment: process.env.NODE_ENV || 'development',
      });

      // Additional handling for critical events
      if (event.severity === SecuritySeverity.CRITICAL) {
        this.handleCriticalEvent(maskedEvent);
      }
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  /**
   * Log authentication events
   */
  logAuthEvent(action: string, userId?: string, ip: string, success: boolean, details?: any): void {
    const event: SecurityEvent = {
      type: SecurityEventType.AUTHENTICATION,
      severity: success ? SecuritySeverity.LOW : SecuritySeverity.MEDIUM,
      userId,
      ip,
      message: `Authentication ${action}: ${success ? 'SUCCESS' : 'FAILURE'}`,
      details,
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(event);
  }

  /**
   * Log authorization events
   */
  logAuthzEvent(
    action: string,
    userId: string,
    resource: string,
    ip: string,
    success: boolean,
    details?: any
  ): void {
    const event: SecurityEvent = {
      type: SecurityEventType.AUTHORIZATION,
      severity: success ? SecuritySeverity.LOW : SecuritySeverity.HIGH,
      userId,
      ip,
      message: `Authorization ${action} for ${resource}: ${success ? 'GRANTED' : 'DENIED'}`,
      details: { ...details, resource },
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(event);
  }

  /**
   * Log data access events
   */
  logDataAccessEvent(
    action: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    ip: string,
    details?: any
  ): void {
    const event: SecurityEvent = {
      type: SecurityEventType.DATA_ACCESS,
      severity: SecuritySeverity.LOW,
      userId,
      ip,
      message: `Data access: ${action} on ${resourceType}:${resourceId}`,
      details: { ...details, resourceType, resourceId },
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(event);
  }

  /**
   * Log malicious activity
   */
  logMaliciousActivity(
    threat: string,
    ip: string,
    userAgent?: string,
    path?: string,
    details?: any
  ): void {
    const event: SecurityEvent = {
      type: SecurityEventType.MALICIOUS,
      severity: SecuritySeverity.HIGH,
      ip,
      userAgent,
      path,
      message: `Malicious activity detected: ${threat}`,
      details,
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(event);
  }

  /**
   * Log system security events
   */
  logSystemEvent(event: string, severity: SecuritySeverity, details?: any): void {
    const securityEvent: SecurityEvent = {
      type: SecurityEventType.SYSTEM,
      severity,
      ip: 'system',
      message: `System security event: ${event}`,
      details,
      timestamp: new Date().toISOString(),
    };

    this.logSecurityEvent(securityEvent);
  }

  /**
   * Mask PII data in objects
   */
  private maskPII(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskPII(item));
    }

    const masked: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (this.PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        // Mask sensitive data
        if (typeof value === 'string') {
          if (value.length <= 4) {
            masked[key] = '****';
          } else {
            masked[key] = value.substring(0, 2) + '****' + value.substring(value.length - 2);
          }
        } else {
          masked[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskPII(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Handle critical security events
   */
  private handleCriticalEvent(event: SecurityEvent): void {
    // In production, this would trigger alerts, notifications, etc.
    console.error('CRITICAL SECURITY EVENT:', {
      type: event.type,
      message: event.message,
      ip: event.ip,
      userId: event.userId,
      timestamp: event.timestamp,
    });

    // Future implementations could include:
    // - Send alerts to security team
    // - Trigger automated responses
    // - Create incident tickets
    // - Notify external monitoring systems
  }

  /**
   * Generate security metrics
   */
  async getSecurityMetrics(timeRange: string = '24h'): Promise<any> {
    // This would typically query a security analytics database
    // For now, return placeholder metrics
    return {
      timeRange,
      authentication: {
        totalAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        suspiciousIPs: 0,
      },
      authorization: {
        totalRequests: 0,
        granted: 0,
        denied: 0,
        privilegeEscalationAttempts: 0,
      },
      malicious: {
        totalThreats: 0,
        blockedIPs: 0,
        sqlInjectionAttempts: 0,
        xssAttempts: 0,
      },
      dataAccess: {
        totalReads: 0,
        totalWrites: 0,
        suspiciousAccess: 0,
      },
    };
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();

export default securityLogger;
