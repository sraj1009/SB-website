const validator = require('validator');
const crypto = require('crypto');

/**
 * Comprehensive SQL/NoSQL Injection Protection
 */
class InjectionProtection {
  constructor() {
    this.sqlPatterns = this.getSQLPatterns();
    this.nosqlPatterns = this.getNoSQLPatterns();
    this.xssPatterns = this.getXSSPatterns();
    this.suspiciousRequests = new Map();
    this.blockedIPs = new Set();
    
    this.setupCleanupInterval();
  }

  getSQLPatterns() {
    return [
      // Basic SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|;|\/\*|\*\/|@@|@|CHAR|NCHAR|VARCHAR|NVARCHAR|ALTER|BEGIN|CAST|CREATE|CURSOR|DECLARE|DELETE|DENY|DROP|EXECUTE|FETCH|INSERT|KILL|OPEN|REVOKE|SET|UNION|UPDATE|WHERE)/i,
      /(\bOR\b.*=.*\bOR\b|\bAND\b.*=.*\bAND\b)/i,
      /(\bOR\b.*'[^']*'=|'[^']*'.*=\bOR\b)/i,
      /(\bAND\b.*'[^']*'=|'[^']*'.*=\bAND\b)/i,
      /(\bOR\b.*\d+=\d+|\d+=.*\bOR\b)/i,
      /(\bAND\b.*\d+=\d+|\d+=.*\bAND\b)/i,
      /(\bWAITFOR\b.*\bDELAY\b|\bWAITFOR\b.*\bTIME\b)/i,
      /(\bBENCHMARK\b\s*\(|\bSLEEP\b\s*\(|\bPG_SLEEP\s*\()/i,
      /(\bCONCAT\s*\(|\bGROUP_CONCAT\s*\(|\bSTRING_AGG\s*\()/i,
      /(\bSUBSTRING\s*\(|\bSUBSTR\s*\(|\bMID\s*\()/i,
      /(\bHEX\s*\(|\bUNHEX\s*\(|\bASCII\s*\(|\bCHAR\s*\()/i,
      /(\bLOAD_FILE\s*\(|\bINTO\s+OUTFILE|INTO\s+DUMPFILE)/i,
      /(\bINFORMATION_SCHEMA\b|\bSYS\b|\bMASTER\b|\bMSDB\b)/i,
      /(\bXP_CMDSHELL\b|\bSP_OACREATE\b|\bSP_EXECUTESQL\b)/i
    ];
  }

  getNoSQLPatterns() {
    return [
      // NoSQL injection patterns
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$gte/i,
      /\$lte/i,
      /\$in/i,
      /\$nin/i,
      /\$regex/i,
      /\$expr/i,
      /\$jsonSchema/i,
      /\$text/i,
      /\$search/i,
      /\$or/i,
      /\$and/i,
      /\$not/i,
      /\$nor/i,
      /\$exists/i,
      /\$type/i,
      /\$mod/i,
      /\$size/i,
      /\$all/i,
      /\$elemMatch/i,
      /\$slice/i,
      /\$sort/i,
      /\$push/i,
      /\$pull/i,
      /\$pop/i,
      /\$addToSet/i,
      /\$each/i,
      /\$position/i,
      /\$bit/i,
      /\$unset/i,
      /\$inc/i,
      /\$mul/i,
      /\$min/i,
      /\$max/i,
      /\$currentDate/i,
      /\$timestamp/i,
      /\$dateToString/i,
      /\$dateFromString/i,
      /\$isoWeek/i,
      /\$isoDayOfWeek/i,
      /\$isoYear/i,
      /\$week/i,
      /\$year/i,
      /\$month/i,
      /\$dayOfMonth/i,
      /\$hour/i,
      /\$minute/i,
      /\$second/i,
      /\$millisecond/i
    ];
  }

  getXSSPatterns() {
    return [
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>)/i,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>)/i,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*<\/object>)/i,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*<\/embed>)/i,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*<\/link>)/i,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*<\/meta>)/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /<img\b[^>]*src[^>]*javascript:/i,
      /<body\b[^>]*onload/i,
      /<div\b[^>]*onmouseover/i,
      /<a\b[^>]*onclick/i,
      /<input\b[^>]*onfocus/i,
      /<form\b[^>]*onsubmit/i,
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /Function\s*\(/i,
      /document\.(write|writeln)/i,
      /window\.location/i,
      /document\.cookie/i,
      /document\.domain/i,
      /localStorage\./i,
      /sessionStorage\./i,
      /alert\s*\(/i,
      /confirm\s*\(/i,
      /prompt\s*\(/i
    ];
  }

  // Check for SQL injection
  checkSQLInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.sqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for NoSQL injection
  checkNoSQLInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.nosqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for XSS
  checkXSS(input) {
    if (typeof input !== 'string') return false;
    
    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  // Deep scan object for injection attempts
  deepScanObject(obj, path = '') {
    const results = {
      sqlInjection: false,
      nosqlInjection: false,
      xss: false,
      suspiciousFields: []
    };

    const scanValue = (value, currentPath) => {
      if (typeof value === 'string') {
        if (this.checkSQLInjection(value)) {
          results.sqlInjection = true;
          results.suspiciousFields.push({
            path: currentPath,
            value: value.substring(0, 100),
            type: 'SQL Injection'
          });
        }

        if (this.checkNoSQLInjection(value)) {
          results.nosqlInjection = true;
          results.suspiciousFields.push({
            path: currentPath,
            value: value.substring(0, 100),
            type: 'NoSQL Injection'
          });
        }

        if (this.checkXSS(value)) {
          results.xss = true;
          results.suspiciousFields.push({
            path: currentPath,
            value: value.substring(0, 100),
            type: 'XSS'
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          scanValue(item, `${currentPath}[${index}]`);
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, val]) => {
          scanValue(val, `${currentPath}.${key}`);
        });
      }
    };

    scanValue(obj, path);
    return results;
  }

  // Sanitize input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove potential injection patterns
    let sanitized = input;

    // Remove SQL injection patterns
    this.sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove NoSQL injection patterns
    this.nosqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove XSS patterns
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Additional sanitization
    sanitized = validator.escape(sanitized);
    sanitized = sanitized.replace(/['"\\]/g, '');
    sanitized = sanitized.trim();

    return sanitized;
  }

  // Sanitize object recursively
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return this.sanitizeInput(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      Object.entries(obj).forEach(([key, value]) => {
        sanitized[key] = this.sanitizeObject(value);
      });
      return sanitized;
    }
    return obj;
  }

  // Check request for suspicious activity
  checkRequest(req) {
    const suspiciousActivity = {
      isSuspicious: false,
      reasons: [],
      riskScore: 0,
      shouldBlock: false
    };

    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    // Check IP against blocked list
    if (this.blockedIPs.has(clientIP)) {
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('Blocked IP address');
      suspiciousActivity.riskScore += 100;
      suspiciousActivity.shouldBlock = true;
    }

    // Check for suspicious user agents
    const suspiciousAgents = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /node/i,
      /perl/i,
      /php/i
    ];

    if (suspiciousAgents.some(agent => agent.test(userAgent))) {
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('Suspicious user agent');
      suspiciousActivity.riskScore += 20;
    }

    // Check request size
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 10485760) { // 10MB
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('Large request payload');
      suspiciousActivity.riskScore += 30;
    }

    // Check request frequency
    const now = Date.now();
    const clientHistory = this.suspiciousRequests.get(clientIP) || {
      requests: [],
      blocked: false,
      blockedUntil: null
    };

    // Clean old requests (older than 1 hour)
    clientHistory.requests = clientHistory.requests.filter(
      timestamp => now - timestamp < 3600000
    );

    // Add current request
    clientHistory.requests.push(now);

    // Check request frequency
    const recentRequests = clientHistory.requests.filter(
      timestamp => now - timestamp < 60000 // Last minute
    );

    if (recentRequests.length > 100) { // More than 100 requests per minute
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('High request frequency');
      suspiciousActivity.riskScore += 40;
    }

    // Check if client is currently blocked
    if (clientHistory.blockedUntil && clientHistory.blockedUntil > now) {
      suspiciousActivity.shouldBlock = true;
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('Temporarily blocked');
      suspiciousActivity.riskScore += 200;
    }

    // Update client history
    this.suspiciousRequests.set(clientIP, clientHistory);

    return suspiciousActivity;
  }

  // Block IP address
  blockIP(ip, duration = 3600000) { // 1 hour default
    this.blockedIPs.add(ip);
    
    const clientHistory = this.suspiciousRequests.get(ip) || {
      requests: [],
      blocked: false,
      blockedUntil: null
    };

    clientHistory.blocked = true;
    clientHistory.blockedUntil = Date.now() + duration;
    
    this.suspiciousRequests.set(ip, clientHistory);

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      if (this.suspiciousRequests.has(ip)) {
        const history = this.suspiciousRequests.get(ip);
        history.blocked = false;
        history.blockedUntil = null;
      }
    }, duration);
  }

  // Get suspicious activity statistics
  getSuspiciousStats() {
    const now = Date.now();
    const stats = {
      blockedIPs: this.blockedIPs.size,
      totalSuspiciousRequests: 0,
      currentlyBlocked: 0,
      topOffenders: []
    };

    for (const [ip, history] of this.suspiciousRequests.entries()) {
      stats.totalSuspiciousRequests += history.requests.length;
      
      if (history.blockedUntil && history.blockedUntil > now) {
        stats.currentlyBlocked++;
      }

      stats.topOffenders.push({
        ip,
        requestCount: history.requests.length,
        blocked: history.blocked,
        blockedUntil: history.blockedUntil
      });
    }

    // Sort by request count and take top 10
    stats.topOffenders.sort((a, b) => b.requestCount - a.requestCount);
    stats.topOffenders = stats.topOffenders.slice(0, 10);

    return stats;
  }

  // Setup cleanup interval
  setupCleanupInterval() {
    // Clean up old data every hour
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      // Clean up old suspicious requests
      for (const [ip, history] of this.suspiciousRequests.entries()) {
        history.requests = history.requests.filter(
          timestamp => timestamp > oneHourAgo
        );

        // Remove entry if no recent requests and not blocked
        if (history.requests.length === 0 && !history.blocked) {
          this.suspiciousRequests.delete(ip);
        }
      }

      console.log('🧹 Cleaned up injection protection data');
    }, 3600000); // Every hour
  }
}

// Singleton instance
const injectionProtection = new InjectionProtection();

// Middleware function
const injectionProtectionMiddleware = (req, res, next) => {
  try {
    // Check request for suspicious activity
    const suspiciousCheck = injectionProtection.checkRequest(req);
    
    if (suspiciousCheck.shouldBlock) {
      console.warn('Request blocked due to suspicious activity:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reasons: suspiciousCheck.reasons,
        riskScore: suspiciousCheck.riskScore,
        timestamp: new Date().toISOString()
      });

      return res.status(429).json({
        error: 'Request blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY',
        reasons: suspiciousCheck.reasons,
        retryAfter: 3600
      });
    }

    // Deep scan request body
    if (req.body) {
      const scanResults = injectionProtection.deepScanObject(req.body);
      
      if (scanResults.sqlInjection || scanResults.nosqlInjection || scanResults.xss) {
        console.warn('Injection attempt detected:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          suspiciousFields: scanResults.suspiciousFields,
          timestamp: new Date().toISOString()
        });

        // Block the IP temporarily
        injectionProtection.blockIP(req.ip, 3600000); // 1 hour

        return res.status(400).json({
          error: 'Invalid request detected',
          code: 'INJECTION_ATTEMPT',
          suspiciousFields: scanResults.suspiciousFields
        });
      }

      // Sanitize request body
      req.body = injectionProtection.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = injectionProtection.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = injectionProtection.sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Injection protection error:', error);
    res.status(500).json({
      error: 'Security validation failed',
      code: 'SECURITY_ERROR'
    });
  }
};

// Statistics endpoint
const injectionStatsHandler = async (req, res) => {
  try {
    const stats = injectionProtection.getSuspiciousStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Injection stats error:', error);
    res.status(500).json({
      error: 'Failed to get injection statistics',
      code: 'STATS_ERROR'
    });
  }
};

// Block IP endpoint
const blockIPHandler = async (req, res) => {
  try {
    const { ip, duration } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required',
        code: 'MISSING_IP'
      });
    }

    const blockDuration = duration || 3600000; // 1 hour default
    injectionProtection.blockIP(ip, blockDuration);
    
    res.json({
      success: true,
      message: `IP ${ip} blocked for ${blockDuration / 1000} seconds`
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      error: 'Failed to block IP',
      code: 'BLOCK_ERROR'
    });
  }
};

module.exports = {
  InjectionProtection,
  injectionProtection,
  injectionProtectionMiddleware,
  injectionStatsHandler,
  blockIPHandler
};
