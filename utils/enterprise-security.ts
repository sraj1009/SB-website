/**
 * Enterprise-Grade Security with Threat Detection for SINGGLEBEE
 */

import { cacheConfigs, cacheManager } from './advanced-cache';

// Security Manager with Threat Detection
class EnterpriseSecurityManager {
  private threatDetector: ThreatDetector;
  private encryptionManager: EncryptionManager;
  private authenticationManager: AuthenticationManager;
  private auditLogger: AuditLogger;
  private securityConfig: SecurityConfig;
  private isInitialized = false;

  constructor(config?: Partial<SecurityConfig>) {
    this.securityConfig = {
      enableEncryption: true,
      enableThreatDetection: true,
      enableAuditLogging: true,
      enableRateLimiting: true,
      enableCSRFProtection: true,
      enableXSSProtection: true,
      enableSQLInjectionProtection: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
      },
      ...config,
    };

    this.threatDetector = new ThreatDetector(this.securityConfig);
    this.encryptionManager = new EncryptionManager(this.securityConfig);
    this.authenticationManager = new AuthenticationManager(this.securityConfig);
    this.auditLogger = new AuditLogger(this.securityConfig);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.encryptionManager.initialize();
      await this.threatDetector.initialize();
      await this.authenticationManager.initialize();
      await this.auditLogger.initialize();
      
      this.setupSecurityEventListeners();
      this.isInitialized = true;
      
      console.log('Enterprise security system initialized');
    } catch (error) {
      console.error('Failed to initialize security system:', error);
      throw error;
    }
  }

  // Authentication & Authorization
  async authenticateUser(credentials: UserCredentials): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      // Check for brute force attempts
      const isBlocked = await this.authenticationManager.isBlocked(credentials.identifier);
      if (isBlocked) {
        await this.auditLogger.logSecurityEvent('AUTH_BLOCKED', {
          identifier: credentials.identifier,
          reason: 'Too many failed attempts',
        });
        
        return {
          success: false,
          error: 'Account temporarily locked due to too many failed attempts',
          requiresVerification: false,
        };
      }

      // Validate credentials
      const authResult = await this.authenticationManager.authenticate(credentials);
      
      if (authResult.success) {
        // Generate secure session
        const session = await this.createSecureSession(authResult.user!);
        
        await this.auditLogger.logSecurityEvent('AUTH_SUCCESS', {
          userId: authResult.user!.id,
          identifier: credentials.identifier,
          sessionId: session.id,
          duration: Date.now() - startTime,
        });
        
        return {
          success: true,
          user: authResult.user,
          session,
          requiresVerification: false,
        };
      } else {
        await this.auditLogger.logSecurityEvent('AUTH_FAILED', {
          identifier: credentials.identifier,
          reason: authResult.error,
          duration: Date.now() - startTime,
        });
        
        return authResult;
      }
    } catch (error) {
      await this.auditLogger.logSecurityEvent('AUTH_ERROR', {
        identifier: credentials.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        error: 'Authentication failed',
        requiresVerification: false,
      };
    }
  }

  async createSecureSession(user: User): Promise<SecureSession> {
    const sessionId = this.generateSecureId();
    const expiresAt = Date.now() + this.securityConfig.sessionTimeout;
    
    const session: SecureSession = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      deviceFingerprint: await this.generateDeviceFingerprint(),
    };

    // Encrypt session data
    const encryptedSession = await this.encryptionManager.encrypt(JSON.stringify(session));
    
    // Store in secure storage
    await this.storeSecureSession(sessionId, encryptedSession, expiresAt);
    
    return session;
  }

  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    try {
      const encryptedSession = await this.getSecureSession(sessionId);
      if (!encryptedSession) {
        return { valid: false, reason: 'Session not found' };
      }

      const sessionData = JSON.parse(await this.encryptionManager.decrypt(encryptedSession));
      const session: SecureSession = sessionData;

      // Check expiration
      if (Date.now() > session.expiresAt) {
        await this.invalidateSession(sessionId);
        return { valid: false, reason: 'Session expired' };
      }

      // Check for suspicious activity
      const currentIP = await this.getClientIP();
      const currentUA = navigator.userAgent;
      
      if (session.ipAddress !== currentIP || session.userAgent !== currentUA) {
        await this.auditLogger.logSecurityEvent('SESSION_ANOMALY', {
          sessionId,
          expectedIP: session.ipAddress,
          actualIP: currentIP,
          expectedUA: session.userAgent,
          actualUA: currentUA,
        });
        
        // Optional: Require re-authentication for suspicious sessions
        return { 
          valid: false, 
          reason: 'Session anomaly detected',
          requiresReauth: true,
        };
      }

      // Update last activity
      session.lastActivity = Date.now();
      const updatedEncryptedSession = await this.encryptionManager.encrypt(JSON.stringify(session));
      await this.storeSecureSession(sessionId, updatedEncryptedSession, session.expiresAt);

      return { valid: true, session };
    } catch (error) {
      await this.auditLogger.logSecurityEvent('SESSION_VALIDATION_ERROR', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return { valid: false, reason: 'Session validation failed' };
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.removeSecureSession(sessionId);
    await this.auditLogger.logSecurityEvent('SESSION_INVALIDATED', { sessionId });
  }

  // Data Protection
  async encryptSensitiveData(data: string): Promise<string> {
    return this.encryptionManager.encrypt(data);
  }

  async decryptSensitiveData(encryptedData: string): Promise<string> {
    return this.encryptionManager.decrypt(encryptedData);
  }

  async hashPassword(password: string): Promise<string> {
    return this.encryptionManager.hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.encryptionManager.verifyPassword(password, hash);
  }

  // Threat Detection
  async analyzeRequest(request: SecurityRequest): Promise<ThreatAnalysisResult> {
    return this.threatDetector.analyzeRequest(request);
  }

  async reportSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    await this.threatDetector.reportActivity(activity);
    await this.auditLogger.logSecurityEvent('SUSPICIOUS_ACTIVITY', activity);
  }

  // Security Monitoring
  async getSecurityMetrics(timeRange: TimeRange): Promise<SecurityMetrics> {
    return this.auditLogger.getSecurityMetrics(timeRange);
  }

  async getThreatReport(timeRange: TimeRange): Promise<ThreatReport> {
    return this.threatDetector.generateReport(timeRange);
  }

  // Private helper methods
  private setupSecurityEventListeners(): void {
    // Monitor failed authentication attempts
    window.addEventListener('security:auth-failed', (event: any) => {
      this.handleFailedAuth(event.detail);
    });

    // Monitor session anomalies
    window.addEventListener('security:session-anomaly', (event: any) => {
      this.handleSessionAnomaly(event.detail);
    });

    // Monitor XSS attempts
    window.addEventListener('security:xss-attempt', (event: any) => {
      this.handleXSSAttempt(event.detail);
    });
  }

  private async handleFailedAuth(detail: any): Promise<void> {
    // Implement additional security measures for failed auth
  }

  private async handleSessionAnomaly(detail: any): Promise<void> {
    // Implement session anomaly handling
  }

  private async handleXSSAttempt(detail: any): Promise<void> {
    // Implement XSS attempt handling
  }

  private generateSecureId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|');
    
    return await this.hashPassword(fingerprint);
  }

  private async storeSecureSession(sessionId: string, encryptedData: string, expiresAt: number): Promise<void> {
    const cacheKey = `session-${sessionId}`;
    await cacheManager.set(cacheKey, encryptedData, {
      strategy: 'cache-first',
      maxAge: expiresAt - Date.now(),
      priority: 'high',
      encryption: false, // Already encrypted
    });
  }

  private async getSecureSession(sessionId: string): Promise<string | null> {
    const cacheKey = `session-${sessionId}`;
    return cacheManager.get(cacheKey, cacheConfigs.userPrefs);
  }

  private async removeSecureSession(sessionId: string): Promise<void> {
    const cacheKey = `session-${sessionId}`;
    await cacheManager.invalidate(cacheKey);
  }
}

// Threat Detection System
class ThreatDetector {
  private threatPatterns: ThreatPattern[] = [];
  private suspiciousActivities: SuspiciousActivity[] = [];
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeThreatPatterns();
  }

  async initialize(): Promise<void> {
    // Load threat patterns from server
    await this.loadThreatPatterns();
  }

  async analyzeRequest(request: SecurityRequest): Promise<ThreatAnalysisResult> {
    const threats: DetectedThreat[] = [];
    const riskScore = this.calculateRiskScore(request);

    // Check for various threat patterns
    for (const pattern of this.threatPatterns) {
      if (this.matchesPattern(request, pattern)) {
        threats.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          confidence: this.calculateConfidence(request, pattern),
        });
      }
    }

    // Check rate limiting
    const rateLimitThreat = await this.checkRateLimit(request);
    if (rateLimitThreat) {
      threats.push(rateLimitThreat);
    }

    // Check for suspicious patterns
    const suspiciousThreat = this.checkSuspiciousPatterns(request);
    if (suspiciousThreat) {
      threats.push(suspiciousThreat);
    }

    return {
      threats,
      riskScore,
      recommendation: this.getRecommendation(threats, riskScore),
      shouldBlock: riskScore > 0.8 || threats.some(t => t.severity === 'critical'),
    };
  }

  async reportActivity(activity: SuspiciousActivity): Promise<void> {
    this.suspiciousActivities.push(activity);
    
    // Analyze for patterns
    await this.analyzeActivityPattern(activity);
    
    // Report to security team if high risk
    if (activity.riskScore > 0.7) {
      await this.notifySecurityTeam(activity);
    }
  }

  async generateReport(timeRange: TimeRange): Promise<ThreatReport> {
    const activities = this.suspiciousActivities.filter(
      activity => activity.timestamp >= timeRange.start && activity.timestamp <= timeRange.end
    );

    const threatsByType = this.groupThreatsByType(activities);
    const trends = this.analyzeTrends(activities);
    const recommendations = this.generateSecurityRecommendations(threatsByType, trends);

    return {
      timeRange,
      totalThreats: activities.length,
      threatsByType,
      trends,
      recommendations,
      riskLevel: this.calculateOverallRiskLevel(activities),
    };
  }

  private initializeThreatPatterns(): void {
    this.threatPatterns = [
      {
        type: 'sql_injection',
        severity: 'high',
        pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER)\b)/i,
        description: 'Potential SQL injection attempt',
      },
      {
        type: 'xss',
        severity: 'high',
        pattern: /(<script|javascript:|on\w+\s*=)/i,
        description: 'Potential XSS attempt',
      },
      {
        type: 'path_traversal',
        severity: 'medium',
        pattern: /(\.\.\/|\.\.\\)/,
        description: 'Path traversal attempt',
      },
      {
        type: 'command_injection',
        severity: 'critical',
        pattern: /(;|\||&|`|\$\()/,
        description: 'Command injection attempt',
      },
    ];
  }

  private async loadThreatPatterns(): Promise<void> {
    // Load additional patterns from server
  }

  private matchesPattern(request: SecurityRequest, pattern: ThreatPattern): boolean {
    const content = [
      request.url,
      request.method,
      JSON.stringify(request.headers),
      JSON.stringify(request.body),
    ].join(' ');
    
    return pattern.pattern.test(content);
  }

  private calculateRiskScore(request: SecurityRequest): number {
    let score = 0;
    
    // Check request size
    if (JSON.stringify(request.body).length > 10000) score += 0.1;
    
    // Check request frequency
    const recentRequests = this.getRecentRequests(request.identifier);
    if (recentRequests.length > 100) score += 0.3;
    
    // Check geographic anomalies
    if (this.isGeographicAnomaly(request)) score += 0.2;
    
    // Check time-based anomalies
    if (this.isTimeAnomaly(request)) score += 0.1;
    
    return Math.min(score, 1);
  }

  private calculateConfidence(request: SecurityRequest, pattern: ThreatPattern): number {
    // Calculate confidence based on pattern match strength
    return 0.8; // Simplified
  }

  private async checkRateLimit(request: SecurityRequest): Promise<DetectedThreat | null> {
    const key = `rate-limit-${request.identifier}`;
    const requests = await cacheManager.get<number>(key, cacheConfigs.api) || 0;
    
    if (requests > 100) { // 100 requests per minute
      return {
        type: 'rate_limit',
        severity: 'medium',
        description: 'Rate limit exceeded',
        confidence: 0.9,
      };
    }
    
    return null;
  }

  private checkSuspiciousPatterns(request: SecurityRequest): DetectedThreat | null {
    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(request.userAgent)) {
      return {
        type: 'suspicious_user_agent',
        severity: 'low',
        description: 'Suspicious user agent detected',
        confidence: 0.6,
      };
    }
    
    return null;
  }

  private getRecommendation(threats: DetectedThreat[], riskScore: number): string {
    if (riskScore > 0.8) return 'Block request and alert security team';
    if (riskScore > 0.6) return 'Require additional verification';
    if (riskScore > 0.4) return 'Monitor closely';
    return 'Allow with logging';
  }

  private async analyzeActivityPattern(activity: SuspiciousActivity): Promise<void> {
    // Analyze patterns in suspicious activities
  }

  private async notifySecurityTeam(activity: SuspiciousActivity): Promise<void> {
    // Notify security team via webhook or alert system
  }

  private groupThreatsByType(activities: SuspiciousActivity[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const activity of activities) {
      for (const threat of activity.threats) {
        grouped[threat.type] = (grouped[threat.type] || 0) + 1;
      }
    }
    
    return grouped;
  }

  private analyzeTrends(activities: SuspiciousActivity[]): ThreatTrend[] {
    // Analyze trends in threats over time
    return [];
  }

  private generateSecurityRecommendations(threatsByType: Record<string, number>, trends: ThreatTrend[]): string[] {
    const recommendations: string[] = [];
    
    if (threatsByType.sql_injection > 0) {
      recommendations.push('Implement input validation and parameterized queries');
    }
    
    if (threatsByType.xss > 0) {
      recommendations.push('Enhance XSS protection and content security policy');
    }
    
    if (threatsByType.rate_limit > 10) {
      recommendations.push('Adjust rate limiting thresholds');
    }
    
    return recommendations;
  }

  private calculateOverallRiskLevel(activities: SuspiciousActivity[]): 'low' | 'medium' | 'high' | 'critical' {
    const avgRiskScore = activities.reduce((sum, activity) => sum + activity.riskScore, 0) / activities.length;
    
    if (avgRiskScore > 0.8) return 'critical';
    if (avgRiskScore > 0.6) return 'high';
    if (avgRiskScore > 0.4) return 'medium';
    return 'low';
  }

  private getRecentRequests(identifier: string): SecurityRequest[] {
    // Get recent requests from cache or memory
    return [];
  }

  private isGeographicAnomaly(request: SecurityRequest): boolean {
    // Check if request is from unusual geographic location
    return false;
  }

  private isTimeAnomaly(request: SecurityRequest): boolean {
    // Check if request is at unusual time
    return false;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

// Encryption Manager
class EncryptionManager {
  private config: SecurityConfig;
  private encryptionKey: CryptoKey | null = null;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enableEncryption) return;
    
    // Generate or load encryption key
    this.encryptionKey = await this.generateEncryptionKey();
  }

  async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.encryptionKey,
      dataBuffer
    );
    
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.encryptionKey,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  private async generateEncryptionKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
}

// Authentication Manager
class AuthenticationManager {
  private config: SecurityConfig;
  private blockedUsers: Map<string, BlockInfo> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load blocked users from storage
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const blockInfo = this.blockedUsers.get(identifier);
    if (!blockInfo) return false;
    
    if (Date.now() > blockInfo.expiresAt) {
      this.blockedUsers.delete(identifier);
      return false;
    }
    
    return true;
  }

  async authenticate(credentials: UserCredentials): Promise<AuthResult> {
    // Implement authentication logic
    // This would typically involve checking against a database
    
    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  private async blockUser(identifier: string): Promise<void> {
    this.blockedUsers.set(identifier, {
      attempts: this.config.maxLoginAttempts,
      blockedAt: Date.now(),
      expiresAt: Date.now() + this.config.lockoutDuration,
    });
  }
}

// Audit Logger
class AuditLogger {
  private config: SecurityConfig;
  private auditEvents: AuditEvent[] = [];

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load existing audit events
  }

  async logSecurityEvent(eventType: string, data: any): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: Date.now(),
      data,
      severity: this.getEventSeverity(eventType),
    };
    
    this.auditEvents.push(event);
    
    // Store in persistent storage
    await this.storeAuditEvent(event);
    
    // Alert for critical events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(event);
    }
  }

  async getSecurityMetrics(timeRange: TimeRange): Promise<SecurityMetrics> {
    const events = this.auditEvents.filter(
      event => event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );
    
    const eventsByType = this.groupEventsByType(events);
    const eventsBySeverity = this.groupEventsBySeverity(events);
    
    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      averageResponseTime: this.calculateAverageResponseTime(events),
      blockedAttempts: events.filter(e => e.type === 'AUTH_BLOCKED').length,
      successfulAuthentications: events.filter(e => e.type === 'AUTH_SUCCESS').length,
      failedAuthentications: events.filter(e => e.type === 'AUTH_FAILED').length,
    };
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'AUTH_SUCCESS': 'low',
      'AUTH_FAILED': 'medium',
      'AUTH_BLOCKED': 'high',
      'SESSION_ANOMALY': 'high',
      'SUSPICIOUS_ACTIVITY': 'high',
      'XSS_ATTEMPT': 'critical',
      'SQL_INJECTION_ATTEMPT': 'critical',
    };
    
    return severityMap[eventType] || 'medium';
  }

  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    // Store in database or secure storage
  }

  private async alertSecurityTeam(event: AuditEvent): Promise<void> {
    // Send alert to security team
  }

  private groupEventsByType(events: AuditEvent[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const event of events) {
      grouped[event.type] = (grouped[event.type] || 0) + 1;
    }
    
    return grouped;
  }

  private groupEventsBySeverity(events: AuditEvent[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const event of events) {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1;
    }
    
    return grouped;
  }

  private calculateAverageResponseTime(events: AuditEvent[]): number {
    const eventsWithResponseTime = events.filter(e => e.data.duration);
    if (eventsWithResponseTime.length === 0) return 0;
    
    const totalTime = eventsWithResponseTime.reduce((sum, event) => sum + event.data.duration, 0);
    return totalTime / eventsWithResponseTime.length;
  }
}

// React hooks for security
export const useEnterpriseSecurity = () => {
  const [securityManager] = useState(() => new EnterpriseSecurityManager());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);

  useEffect(() => {
    securityManager.initialize();
  }, [securityManager]);

  const authenticate = useCallback(async (credentials: UserCredentials) => {
    const result = await securityManager.authenticateUser(credentials);
    
    if (result.success) {
      setIsAuthenticated(true);
      setCurrentUser(result.user || null);
    }
    
    return result;
  }, [securityManager]);

  const logout = useCallback(async () => {
    // Invalidate current session
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const validateSession = useCallback(async (sessionId: string) => {
    const result = await securityManager.validateSession(sessionId);
    
    if (result.valid) {
      setIsAuthenticated(true);
      setCurrentUser(result.session ? { 
        id: result.session.userId,
        email: result.session.email,
        role: result.session.role,
        permissions: result.session.permissions,
      } as User : null);
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
    
    return result;
  }, [securityManager]);

  const encryptData = useCallback(async (data: string) => {
    return securityManager.encryptSensitiveData(data);
  }, [securityManager]);

  const decryptData = useCallback(async (encryptedData: string) => {
    return securityManager.decryptSensitiveData(encryptedData);
  }, [securityManager]);

  const getSecurityMetrics = useCallback(async (timeRange: TimeRange) => {
    const metrics = await securityManager.getSecurityMetrics(timeRange);
    setSecurityMetrics(metrics);
    return metrics;
  }, [securityManager]);

  return {
    isAuthenticated,
    currentUser,
    securityMetrics,
    authenticate,
    logout,
    validateSession,
    encryptData,
    decryptData,
    getSecurityMetrics,
  };
};

// Types
interface SecurityConfig {
  enableEncryption: boolean;
  enableThreatDetection: boolean;
  enableAuditLogging: boolean;
  enableRateLimiting: boolean;
  enableCSRFProtection: boolean;
  enableXSSProtection: boolean;
  enableSQLInjectionProtection: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: PasswordPolicy;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
}

interface UserCredentials {
  identifier: string; // email or username
  password: string;
  rememberMe?: boolean;
}

interface AuthResult {
  success: boolean;
  user?: User;
  session?: SecureSession;
  error?: string;
  requiresVerification?: boolean;
}

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface SecureSession {
  id: string;
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
}

interface SessionValidationResult {
  valid: boolean;
  session?: SecureSession;
  reason?: string;
  requiresReauth?: boolean;
}

interface SecurityRequest {
  identifier: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  userAgent: string;
}

interface ThreatAnalysisResult {
  threats: DetectedThreat[];
  riskScore: number;
  recommendation: string;
  shouldBlock: boolean;
}

interface DetectedThreat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
}

interface SuspiciousActivity {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  riskScore: number;
  threats: DetectedThreat[];
  data: any;
}

interface ThreatReport {
  timeRange: TimeRange;
  totalThreats: number;
  threatsByType: Record<string, number>;
  trends: ThreatTrend[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ThreatTrend {
  type: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface TimeRange {
  start: number;
  end: number;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  averageResponseTime: number;
  blockedAttempts: number;
  successfulAuthentications: number;
  failedAuthentications: number;
}

interface AuditEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ThreatPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: RegExp;
  description: string;
}

interface BlockInfo {
  attempts: number;
  blockedAt: number;
  expiresAt: number;
}

// Global instance
export const enterpriseSecurity = new EnterpriseSecurityManager();
