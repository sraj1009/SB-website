const validator = require('validator');
const crypto = require('crypto');

/**
 * Comprehensive XSS Protection with content filtering and sanitization
 */
class XSSProtection {
  constructor() {
    this.xssPatterns = this.getXSSPatterns();
    this.htmlTags = this.getHTMLTags();
    this.allowedAttributes = this.getAllowedAttributes();
    this.sanitizedCache = new Map();
    this.suspiciousRequests = new Map();
    
    this.setupCleanupInterval();
  }

  getXSSPatterns() {
    return [
      // Script injection patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>)/gi,
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /data:application\/javascript/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>)/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*<\/object>)/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*<\/embed>)/gi,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*<\/link>)/gi,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*<\/meta>)/gi,
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*<\/style>)/gi,
      /<img\b[^>]*src[^>]*javascript:/gi,
      /<body\b[^>]*onload/gi,
      /<div\b[^>]*onmouseover/gi,
      /<a\b[^>]*onclick/gi,
      /<input\b[^>]*onfocus/gi,
      /<form\b[^>]*onsubmit/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /Function\s*\(/gi,
      /document\.(write|writeln)/gi,
      /window\.location/gi,
      /document\.cookie/gi,
      /document\.domain/gi,
      /localStorage\./gi,
      /sessionStorage\./gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi,
      /expression\s*\(/gi,
      /@import/gi,
      /binding:/gi,
      /behavior:/gi,
      /-moz-binding/gi,
      /<\s*\/?\s*(script|iframe|object|embed|link|meta|style|img|body|div|a|input|form)\b/gi,
      /<\s*!\[CDATA\[/gi,
      /<\s*!\-\-/gi,
      /\-\-\s*>/gi,
      /<\s*!\-\-.*?\-\-\s*>/gis,
      /<\s*!\[CDATA\[.*?\]\]\s*>/gis
    ];
  }

  getHTMLTags() {
    return {
      allowed: [
        'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'code', 'pre',
        'a', 'img'
      ],
      forbidden: [
        'script', 'iframe', 'object', 'embed', 'link', 'meta',
        'style', 'form', 'input', 'button', 'select', 'textarea',
        'canvas', 'svg', 'math', 'video', 'audio', 'source',
        'track', 'map', 'area', 'base', 'basefont', 'bgsound',
        'blink', 'command', 'content', 'details', 'dialog',
        'element', 'fieldset', 'figcaption', 'figure', 'font',
        'frame', 'frameset', 'head', 'header', 'hr', 'html',
        'isindex', 'keygen', 'legend', 'marquee', 'menu',
        'menuitem', 'meter', 'nav', 'noframes', 'noscript',
        'optgroup', 'option', 'output', 'param', 'progress',
        'rp', 'rt', 'ruby', 's', 'samp', 'section', 'small',
        'strike', 'summary', 'template', 'time', 'title', 'tr',
        'tt', 'var', 'wbr', 'xmp'
      ]
    };
  }

  getAllowedAttributes() {
    return {
      global: ['id', 'class', 'style', 'title', 'lang', 'dir'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'title'],
      table: ['border', 'cellpadding', 'cellspacing'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope']
    };
  }

  // Check for XSS patterns
  checkXSS(input) {
    if (typeof input !== 'string') return false;
    
    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  // Deep scan object for XSS
  deepScanObject(obj, path = '') {
    const results = {
      xss: false,
      suspiciousFields: []
    };

    const scanValue = (value, currentPath) => {
      if (typeof value === 'string') {
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

  // Sanitize HTML content
  sanitizeHTML(html) {
    if (typeof html !== 'string') return html;

    // Check cache first
    const cacheKey = crypto.createHash('md5').update(html).digest('hex');
    if (this.sanitizedCache.has(cacheKey)) {
      return this.sanitizedCache.get(cacheKey);
    }

    let sanitized = html;

    // Remove all XSS patterns
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove forbidden HTML tags
    this.htmlTags.forbidden.forEach(tag => {
      const regex = new RegExp(`<\\s*\\/?\\s*${tag}[^>]*>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Sanitize allowed tags
    sanitized = this.sanitizeAllowedTags(sanitized);

    // Additional security measures
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    sanitized = sanitized.replace(/data:application\/javascript/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Cache the result
    this.sanitizedCache.set(cacheKey, sanitized);

    return sanitized;
  }

  // Sanitize allowed HTML tags
  sanitizeAllowedTags(html) {
    const allowedTags = this.htmlTags.allowed.join('|');
    const tagRegex = new RegExp(`<\\s*\\/?\\s*(${allowedTags})\\b([^>]*)>`, 'gi');

    return html.replace(tagRegex, (match, tagName, attributes) => {
      // Sanitize attributes
      const sanitizedAttributes = this.sanitizeAttributes(tagName, attributes);
      
      return `<${tagName}${sanitizedAttributes}>`;
    });
  }

  // Sanitize HTML attributes
  sanitizeAttributes(tagName, attributes) {
    if (!attributes) return '';

    const allowedAttrs = this.allowedAttributes.global.concat(
      this.allowedAttributes[tagName] || []
    );

    const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
    let sanitizedAttrs = '';

    let match;
    while ((match = attrRegex.exec(attributes)) !== null) {
      const attrName = match[1].toLowerCase();
      const attrValue = match[2];

      if (allowedAttrs.includes(attrName)) {
        // Additional checks for specific attributes
        if (attrName === 'href') {
          // Allow only safe protocols
          const safeProtocols = ['http', 'https', 'mailto', 'tel'];
          const protocol = attrValue.split(':')[0];
          
          if (safeProtocols.includes(protocol)) {
            sanitizedAttrs += ` ${attrName}="${validator.escape(attrValue)}"`;
          }
        } else if (attrName === 'src') {
          // Allow only safe protocols for images
          const safeProtocols = ['http', 'https', 'data'];
          const protocol = attrValue.split(':')[0];
          
          if (safeProtocols.includes(protocol)) {
            sanitizedAttrs += ` ${attrName}="${validator.escape(attrValue)}"`;
          }
        } else if (attrName === 'style') {
          // Basic CSS sanitization
          const sanitizedCSS = this.sanitizeCSS(attrValue);
          sanitizedAttrs += ` ${attrName}="${sanitizedCSS}"`;
        } else {
          sanitizedAttrs += ` ${attrName}="${validator.escape(attrValue)}"`;
        }
      }
    }

    return sanitizedAttrs;
  }

  // Sanitize CSS
  sanitizeCSS(css) {
    if (typeof css !== 'string') return '';

    // Remove dangerous CSS properties
    const dangerousProps = [
      'expression', 'behavior', 'binding', '-moz-binding',
      'javascript', 'vbscript', 'data:', 'url('
    ];

    let sanitized = css;

    dangerousProps.forEach(prop => {
      const regex = new RegExp(prop, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove @import
    sanitized = sanitized.replace(/@import/gi, '');

    return validator.escape(sanitized);
  }

  // Sanitize text content
  sanitizeText(text) {
    if (typeof text !== 'string') return text;

    return validator.escape(text);
  }

  // Sanitize object recursively
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
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
      /node/i
    ];

    if (suspiciousAgents.some(agent => agent.test(userAgent))) {
      suspiciousActivity.isSuspicious = true;
      suspiciousActivity.reasons.push('Suspicious user agent');
      suspiciousActivity.riskScore += 20;
    }

    // Check request size
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1048576) { // 1MB
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

    if (recentRequests.length > 50) { // More than 50 requests per minute
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
      if (this.suspiciousRequests.has(ip)) {
        const history = this.suspiciousRequests.get(ip);
        history.blocked = false;
        history.blockedUntil = null;
      }
    }, duration);
  }

  // Get XSS protection statistics
  getStats() {
    const now = Date.now();
    const stats = {
      sanitizedCache: this.sanitizedCache.size,
      suspiciousRequests: this.suspiciousRequests.size,
      currentlyBlocked: 0,
      topOffenders: []
    };

    for (const [ip, history] of this.suspiciousRequests.entries()) {
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

      // Clean up cache (keep only last 1000 entries)
      if (this.sanitizedCache.size > 1000) {
        const entries = Array.from(this.sanitizedCache.entries());
        this.sanitizedCache.clear();
        
        // Keep the most recent 1000 entries
        entries.slice(-1000).forEach(([key, value]) => {
          this.sanitizedCache.set(key, value);
        });
      }

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

      console.log('🧹 Cleaned up XSS protection data');
    }, 3600000); // Every hour
  }
}

// Singleton instance
const xssProtection = new XSSProtection();

// Middleware function
const xssProtectionMiddleware = (req, res, next) => {
  try {
    // Check request for suspicious activity
    const suspiciousCheck = xssProtection.checkRequest(req);
    
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

    // Deep scan request body for XSS
    if (req.body) {
      const scanResults = xssProtection.deepScanObject(req.body);
      
      if (scanResults.xss) {
        console.warn('XSS attempt detected:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          suspiciousFields: scanResults.suspiciousFields,
          timestamp: new Date().toISOString()
        });

        // Block the IP temporarily
        xssProtection.blockIP(req.ip, 3600000); // 1 hour

        return res.status(400).json({
          error: 'Invalid request detected',
          code: 'XSS_ATTEMPT',
          suspiciousFields: scanResults.suspiciousFields
        });
      }

      // Sanitize request body
      req.body = xssProtection.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = xssProtection.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = xssProtection.sanitizeObject(req.params);
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.stripe.com https://api.razorpay.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );

    next();
  } catch (error) {
    console.error('XSS protection error:', error);
    res.status(500).json({
      error: 'Security validation failed',
      code: 'SECURITY_ERROR'
    });
  }
};

// HTML sanitization middleware
const htmlSanitizationMiddleware = (req, res, next) => {
  try {
    // Sanitize HTML content in specific fields
    if (req.body) {
      const htmlFields = ['description', 'content', 'bio', 'message', 'comment', 'review'];
      
      htmlFields.forEach(field => {
        if (req.body[field]) {
          req.body[field] = xssProtection.sanitizeHTML(req.body[field]);
        }
      });
    }

    next();
  } catch (error) {
    console.error('HTML sanitization error:', error);
    res.status(500).json({
      error: 'HTML sanitization failed',
      code: 'SANITIZATION_ERROR'
    });
  }
};

// Statistics endpoint
const xssStatsHandler = async (req, res) => {
  try {
    const stats = xssProtection.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('XSS stats error:', error);
    res.status(500).json({
      error: 'Failed to get XSS statistics',
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
    xssProtection.blockIP(ip, blockDuration);
    
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
  XSSProtection,
  xssProtection,
  xssProtectionMiddleware,
  htmlSanitizationMiddleware,
  xssStatsHandler,
  blockIPHandler
};
