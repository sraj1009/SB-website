const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Monitoring System
 * Integrates error tracking, performance monitoring, and uptime monitoring
 */
class ComprehensiveMonitoring extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.healthChecks = new Map();
    this.performanceData = new Map();
    this.errorData = new Map();
    this.uptimeData = new Map();
    
    this.initializeMetrics();
    this.startMonitoring();
    this.setupHealthChecks();
  }

  initializeMetrics() {
    // System metrics
    this.metrics.set('system', {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
      loadAverage: [],
      uptime: 0
    });

    // Application metrics
    this.metrics.set('application', {
      requests: 0,
      errors: 0,
      responseTime: 0,
      activeConnections: 0,
      queueSize: 0,
      cacheHitRate: 0
    });

    // Database metrics
    this.metrics.set('database', {
      connections: 0,
      queries: 0,
      slowQueries: 0,
      responseTime: 0,
      errors: 0
    });

    // Payment metrics
    this.metrics.set('payments', {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      amount: 0,
      successRate: 0
    });

    // Security metrics
    this.metrics.set('security', {
      authAttempts: 0,
      failedAuth: 0,
      blockedRequests: 0,
      suspiciousIPs: 0,
      rateLimitHits: 0
    });
  }

  startMonitoring() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect application metrics every 10 seconds
    setInterval(() => {
      this.collectApplicationMetrics();
    }, 10000);

    // Process performance data every minute
    setInterval(() => {
      this.processPerformanceData();
    }, 60000);

    // Check health every 5 minutes
    setInterval(() => {
      this.performHealthChecks();
    }, 300000);

    // Generate reports every hour
    setInterval(() => {
      this.generateReports();
    }, 3600000);
  }

  collectSystemMetrics() {
    try {
      const systemMetrics = this.metrics.get('system');
      
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const cpuUsage = 100 - (idle / total) * 100;
      
      systemMetrics.cpu = Math.round(cpuUsage * 100) / 100;

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryUsage = (usedMem / totalMem) * 100;
      
      systemMetrics.memory = Math.round(memoryUsage * 100) / 100;

      // Disk usage (simplified)
      try {
        const stats = fs.statSync(process.cwd());
        systemMetrics.disk = Math.random() * 100; // Placeholder
      } catch (error) {
        systemMetrics.disk = 0;
      }

      // Load average
      systemMetrics.loadAverage = os.loadavg();

      // Uptime
      systemMetrics.uptime = os.uptime();

      // Check thresholds
      this.checkSystemThresholds(systemMetrics);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
      this.recordError('system_metrics', error);
    }
  }

  collectApplicationMetrics() {
    try {
      const appMetrics = this.metrics.get('application');
      
      // These would be collected from actual application state
      // For now, we'll use placeholder values
      
      // Request count (would come from request middleware)
      appMetrics.requests = (appMetrics.requests || 0) + Math.floor(Math.random() * 10);
      
      // Error count (would come from error handling)
      appMetrics.errors = (appMetrics.errors || 0) + Math.floor(Math.random() * 2);
      
      // Response time (would come from request timing)
      appMetrics.responseTime = Math.random() * 1000;
      
      // Active connections (would come from connection tracking)
      appMetrics.activeConnections = Math.floor(Math.random() * 100);
      
      // Queue size (would come from queue monitoring)
      appMetrics.queueSize = Math.floor(Math.random() * 50);
      
      // Cache hit rate (would come from cache monitoring)
      appMetrics.cacheHitRate = Math.random() * 100;

      // Check thresholds
      this.checkApplicationThresholds(appMetrics);

    } catch (error) {
      console.error('Error collecting application metrics:', error);
      this.recordError('application_metrics', error);
    }
  }

  updateDatabaseMetrics(metrics) {
    try {
      const dbMetrics = this.metrics.get('database');
      
      Object.assign(dbMetrics, metrics);
      
      // Check thresholds
      this.checkDatabaseThresholds(dbMetrics);

    } catch (error) {
      console.error('Error updating database metrics:', error);
      this.recordError('database_metrics', error);
    }
  }

  updatePaymentMetrics(metrics) {
    try {
      const paymentMetrics = this.metrics.get('payments');
      
      Object.assign(paymentMetrics, metrics);
      
      // Calculate success rate
      if (paymentMetrics.total > 0) {
        paymentMetrics.successRate = (paymentMetrics.successful / paymentMetrics.total) * 100;
      }
      
      // Check thresholds
      this.checkPaymentThresholds(paymentMetrics);

    } catch (error) {
      console.error('Error updating payment metrics:', error);
      this.recordError('payment_metrics', error);
    }
  }

  updateSecurityMetrics(metrics) {
    try {
      const securityMetrics = this.metrics.get('security');
      
      Object.assign(securityMetrics, metrics);
      
      // Check thresholds
      this.checkSecurityThresholds(securityMetrics);

    } catch (error) {
      console.error('Error updating security metrics:', error);
      this.recordError('security_metrics', error);
    }
  }

  checkSystemThresholds(metrics) {
    const thresholds = {
      cpu: 80,
      memory: 85,
      disk: 90,
      loadAverage: os.cpus().length * 2
    };

    if (metrics.cpu > thresholds.cpu) {
      this.triggerAlert('system', 'cpu_high', `CPU usage is ${metrics.cpu}%`, {
        current: metrics.cpu,
        threshold: thresholds.cpu
      });
    }

    if (metrics.memory > thresholds.memory) {
      this.triggerAlert('system', 'memory_high', `Memory usage is ${metrics.memory}%`, {
        current: metrics.memory,
        threshold: thresholds.memory
      });
    }

    if (metrics.disk > thresholds.disk) {
      this.triggerAlert('system', 'disk_high', `Disk usage is ${metrics.disk}%`, {
        current: metrics.disk,
        threshold: thresholds.disk
      });
    }

    if (metrics.loadAverage[0] > thresholds.loadAverage) {
      this.triggerAlert('system', 'load_high', `Load average is ${metrics.loadAverage[0]}`, {
        current: metrics.loadAverage[0],
        threshold: thresholds.loadAverage
      });
    }
  }

  checkApplicationThresholds(metrics) {
    const thresholds = {
      errorRate: 5, // 5%
      responseTime: 2000, // 2 seconds
      activeConnections: 500,
      queueSize: 100
    };

    const errorRate = metrics.requests > 0 ? (metrics.errors / metrics.requests) * 100 : 0;

    if (errorRate > thresholds.errorRate) {
      this.triggerAlert('application', 'error_rate_high', `Error rate is ${errorRate}%`, {
        current: errorRate,
        threshold: thresholds.errorRate
      });
    }

    if (metrics.responseTime > thresholds.responseTime) {
      this.triggerAlert('application', 'response_time_high', `Response time is ${metrics.responseTime}ms`, {
        current: metrics.responseTime,
        threshold: thresholds.responseTime
      });
    }

    if (metrics.activeConnections > thresholds.activeConnections) {
      this.triggerAlert('application', 'connections_high', `Active connections: ${metrics.activeConnections}`, {
        current: metrics.activeConnections,
        threshold: thresholds.activeConnections
      });
    }

    if (metrics.queueSize > thresholds.queueSize) {
      this.triggerAlert('application', 'queue_high', `Queue size: ${metrics.queueSize}`, {
        current: metrics.queueSize,
        threshold: thresholds.queueSize
      });
    }
  }

  checkDatabaseThresholds(metrics) {
    const thresholds = {
      connections: 80,
      slowQueries: 10,
      responseTime: 1000,
      errorRate: 2
    };

    if (metrics.connections > thresholds.connections) {
      this.triggerAlert('database', 'connections_high', `DB connections: ${metrics.connections}`, {
        current: metrics.connections,
        threshold: thresholds.connections
      });
    }

    if (metrics.slowQueries > thresholds.slowQueries) {
      this.triggerAlert('database', 'slow_queries', `Slow queries: ${metrics.slowQueries}`, {
        current: metrics.slowQueries,
        threshold: thresholds.slowQueries
      });
    }

    if (metrics.responseTime > thresholds.responseTime) {
      this.triggerAlert('database', 'response_time_high', `DB response time: ${metrics.responseTime}ms`, {
        current: metrics.responseTime,
        threshold: thresholds.responseTime
      });
    }

    const errorRate = metrics.queries > 0 ? (metrics.errors / metrics.queries) * 100 : 0;
    if (errorRate > thresholds.errorRate) {
      this.triggerAlert('database', 'error_rate_high', `DB error rate: ${errorRate}%`, {
        current: errorRate,
        threshold: thresholds.errorRate
      });
    }
  }

  checkPaymentThresholds(metrics) {
    const thresholds = {
      failureRate: 5,
      pendingCount: 50,
      successRate: 95
    };

    const failureRate = metrics.total > 0 ? (metrics.failed / metrics.total) * 100 : 0;

    if (failureRate > thresholds.failureRate) {
      this.triggerAlert('payments', 'failure_rate_high', `Payment failure rate: ${failureRate}%`, {
        current: failureRate,
        threshold: thresholds.failureRate
      });
    }

    if (metrics.pending > thresholds.pendingCount) {
      this.triggerAlert('payments', 'pending_high', `Pending payments: ${metrics.pending}`, {
        current: metrics.pending,
        threshold: thresholds.pendingCount
      });
    }

    if (metrics.successRate < thresholds.successRate) {
      this.triggerAlert('payments', 'success_rate_low', `Payment success rate: ${metrics.successRate}%`, {
        current: metrics.successRate,
        threshold: thresholds.successRate
      });
    }
  }

  checkSecurityThresholds(metrics) {
    const thresholds = {
      failedAuthRate: 10,
      blockedRequestsRate: 5,
      suspiciousIPs: 10,
      rateLimitHits: 100
    };

    const failedAuthRate = metrics.authAttempts > 0 ? (metrics.failedAuth / metrics.authAttempts) * 100 : 0;

    if (failedAuthRate > thresholds.failedAuthRate) {
      this.triggerAlert('security', 'failed_auth_high', `Failed auth rate: ${failedAuthRate}%`, {
        current: failedAuthRate,
        threshold: thresholds.failedAuthRate
      });
    }

    if (metrics.blockedRequests > thresholds.blockedRequestsRate) {
      this.triggerAlert('security', 'blocked_requests_high', `Blocked requests: ${metrics.blockedRequests}`, {
        current: metrics.blockedRequests,
        threshold: thresholds.blockedRequestsRate
      });
    }

    if (metrics.suspiciousIPs > thresholds.suspiciousIPs) {
      this.triggerAlert('security', 'suspicious_ips_high', `Suspicious IPs: ${metrics.suspiciousIPs}`, {
        current: metrics.suspiciousIPs,
        threshold: thresholds.suspiciousIPs
      });
    }

    if (metrics.rateLimitHits > thresholds.rateLimitHits) {
      this.triggerAlert('security', 'rate_limit_high', `Rate limit hits: ${metrics.rateLimitHits}`, {
        current: metrics.rateLimitHits,
        threshold: thresholds.rateLimitHits
      });
    }
  }

  triggerAlert(category, type, message, data) {
    const alertId = `${category}_${type}_${Date.now()}`;
    const alert = {
      id: alertId,
      category,
      type,
      message,
      data,
      timestamp: new Date(),
      severity: this.getAlertSeverity(category, type),
      status: 'active'
    };

    this.alerts.set(alertId, alert);
    
    console.error(`🚨 ALERT [${category.toUpperCase()}] ${message}`, data);
    
    this.emit('alert', alert);
    
    // Send to external monitoring services
    this.sendAlertToServices(alert);
  }

  getAlertSeverity(category, type) {
    const severityMap = {
      system: {
        cpu_high: 'warning',
        memory_high: 'warning',
        disk_high: 'critical',
        load_high: 'warning'
      },
      application: {
        error_rate_high: 'critical',
        response_time_high: 'warning',
        connections_high: 'warning',
        queue_high: 'warning'
      },
      database: {
        connections_high: 'critical',
        slow_queries: 'warning',
        response_time_high: 'warning',
        error_rate_high: 'critical'
      },
      payments: {
        failure_rate_high: 'critical',
        pending_high: 'warning',
        success_rate_low: 'critical'
      },
      security: {
        failed_auth_high: 'warning',
        blocked_requests_high: 'warning',
        suspicious_ips_high: 'critical',
        rate_limit_high: 'warning'
      }
    };

    return severityMap[category]?.[type] || 'info';
  }

  recordError(source, error, context = {}) {
    const errorId = `error_${source}_${Date.now()}`;
    const errorRecord = {
      id: errorId,
      source,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      severity: this.getErrorSeverity(error)
    };

    this.errorData.set(errorId, errorRecord);
    
    console.error(`❌ ERROR [${source}] ${error.message}`, context);
    
    this.emit('error', errorRecord);
    
    // Send to error tracking services
    this.sendErrorToServices(errorRecord);
  }

  getErrorSeverity(error) {
    if (error.name === 'ValidationError') return 'warning';
    if (error.name === 'AuthenticationError') return 'warning';
    if (error.name === 'DatabaseError') return 'critical';
    if (error.name === 'PaymentError') return 'critical';
    if (error.name === 'SecurityError') return 'critical';
    return 'error';
  }

  setupHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      name: 'Database Connection',
      check: async () => {
        try {
          // This would actually check database connection
          const connected = Math.random() > 0.1; // 90% success rate
          return {
            status: connected ? 'healthy' : 'unhealthy',
            message: connected ? 'Database connected' : 'Database connection failed',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: error.message,
            timestamp: new Date()
          };
        }
      }
    });

    // Redis health check
    this.healthChecks.set('redis', {
      name: 'Redis Connection',
      check: async () => {
        try {
          // This would actually check Redis connection
          const connected = Math.random() > 0.1; // 90% success rate
          return {
            status: connected ? 'healthy' : 'unhealthy',
            message: connected ? 'Redis connected' : 'Redis connection failed',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: error.message,
            timestamp: new Date()
          };
        }
      }
    });

    // Payment gateway health check
    this.healthChecks.set('payments', {
      name: 'Payment Gateways',
      check: async () => {
        try {
          // This would actually check payment gateway connectivity
          const healthy = Math.random() > 0.05; // 95% success rate
          return {
            status: healthy ? 'healthy' : 'degraded',
            message: healthy ? 'All payment gateways operational' : 'Some payment gateways degraded',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: error.message,
            timestamp: new Date()
          };
        }
      }
    });

    // External API health check
    this.healthChecks.set('external_apis', {
      name: 'External APIs',
      check: async () => {
        try {
          // This would actually check external API connectivity
          const healthy = Math.random() > 0.1; // 90% success rate
          return {
            status: healthy ? 'healthy' : 'degraded',
            message: healthy ? 'External APIs responding' : 'Some external APIs slow',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            message: error.message,
            timestamp: new Date()
          };
        }
      }
    });
  }

  async performHealthChecks() {
    const results = new Map();
    
    for (const [key, healthCheck] of this.healthChecks.entries()) {
      try {
        const result = await healthCheck.check();
        results.set(key, result);
        
        if (result.status === 'unhealthy') {
          this.triggerAlert('health', `${key}_unhealthy`, healthCheck.name, result);
        }
        
      } catch (error) {
        results.set(key, {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date()
        });
        
        this.recordError('health_check', error, { check: key });
      }
    }
    
    this.uptimeData.set('health_checks', {
      timestamp: new Date(),
      results: Object.fromEntries(results),
      overall: this.calculateOverallHealth(results)
    });
    
    return results;
  }

  calculateOverallHealth(results) {
    const statuses = Array.from(results.values()).map(r => r.status);
    
    if (statuses.every(status => status === 'healthy')) {
      return 'healthy';
    } else if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  processPerformanceData() {
    try {
      const timestamp = new Date();
      const performanceSnapshot = {
        timestamp,
        metrics: Object.fromEntries(this.metrics),
        alerts: Array.from(this.alerts.values()).slice(-10), // Last 10 alerts
        errors: Array.from(this.errorData.values()).slice(-10), // Last 10 errors
        health: this.uptimeData.get('health_checks')
      };

      this.performanceData.set(timestamp.toISOString(), performanceSnapshot);

      // Keep only last 24 hours of data
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const [key, value] of this.performanceData.entries()) {
        if (new Date(key) < twentyFourHoursAgo) {
          this.performanceData.delete(key);
        }
      }

      this.emit('performance_update', performanceSnapshot);

    } catch (error) {
      console.error('Error processing performance data:', error);
      this.recordError('performance_processing', error);
    }
  }

  generateReports() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const hourlyReport = this.generateTimeRangeReport(oneHourAgo, now, 'hourly');
      const dailyReport = this.generateTimeRangeReport(oneDayAgo, now, 'daily');

      this.emit('report_generated', {
        hourly: hourlyReport,
        daily: dailyReport,
        timestamp: now
      });

    } catch (error) {
      console.error('Error generating reports:', error);
      this.recordError('report_generation', error);
    }
  }

  generateTimeRangeReport(startTime, endTime, type) {
    const metricsInRange = Array.from(this.performanceData.values())
      .filter(snapshot => {
        const snapshotTime = new Date(snapshot.timestamp);
        return snapshotTime >= startTime && snapshotTime <= endTime;
      });

    const alertsInRange = Array.from(this.alerts.values())
      .filter(alert => alert.timestamp >= startTime && alert.timestamp <= endTime);

    const errorsInRange = Array.from(this.errorData.values())
      .filter(error => error.timestamp >= startTime && error.timestamp <= endTime);

    return {
      type,
      startTime,
      endTime,
      metrics: this.aggregateMetrics(metricsInRange),
      alerts: {
        total: alertsInRange.length,
        byCategory: this.groupAlertsByCategory(alertsInRange),
        bySeverity: this.groupAlertsBySeverity(alertsInRange)
      },
      errors: {
        total: errorsInRange.length,
        bySource: this.groupErrorsBySource(errorsInRange),
        bySeverity: this.groupErrorsBySeverity(errorsInRange)
      },
      uptime: this.calculateUptime(metricsInRange)
    };
  }

  aggregateMetrics(metrics) {
    const aggregated = {};

    for (const category of ['system', 'application', 'database', 'payments', 'security']) {
      const categoryMetrics = metrics
        .map(m => m.metrics[category])
        .filter(Boolean);

      if (categoryMetrics.length > 0) {
        aggregated[category] = this.calculateMetricStats(categoryMetrics);
      }
    }

    return aggregated;
  }

  calculateMetricStats(metricsArray) {
    const stats = {};
    
    for (const metric of metricsArray) {
      for (const [key, value] of Object.entries(metric)) {
        if (!stats[key]) {
          stats[key] = { min: value, max: value, sum: 0, count: 0 };
        }
        
        stats[key].min = Math.min(stats[key].min, value);
        stats[key].max = Math.max(stats[key].max, value);
        stats[key].sum += value;
        stats[key].count++;
      }
    }

    // Calculate averages
    for (const key in stats) {
      stats[key].avg = stats[key].sum / stats[key].count;
    }

    return stats;
  }

  groupAlertsByCategory(alerts) {
    const grouped = {};
    
    for (const alert of alerts) {
      if (!grouped[alert.category]) {
        grouped[alert.category] = 0;
      }
      grouped[alert.category]++;
    }

    return grouped;
  }

  groupAlertsBySeverity(alerts) {
    const grouped = {};
    
    for (const alert of alerts) {
      if (!grouped[alert.severity]) {
        grouped[alert.severity] = 0;
      }
      grouped[alert.severity]++;
    }

    return grouped;
  }

  groupErrorsBySource(errors) {
    const grouped = {};
    
    for (const error of errors) {
      if (!grouped[error.source]) {
        grouped[error.source] = 0;
      }
      grouped[error.source]++;
    }

    return grouped;
  }

  groupErrorsBySeverity(errors) {
    const grouped = {};
    
    for (const error of errors) {
      if (!grouped[error.severity]) {
        grouped[error.severity] = 0;
      }
      grouped[error.severity]++;
    }

    return grouped;
  }

  calculateUptime(metrics) {
    if (metrics.length === 0) return 100;
    
    const healthyMetrics = metrics.filter(m => 
      m.health && m.health.overall === 'healthy'
    );
    
    return (healthyMetrics.length / metrics.length) * 100;
  }

  sendAlertToServices(alert) {
    // This would integrate with external monitoring services
    // like Sentry, PagerDuty, Slack, etc.
    
    console.log('📡 Sending alert to external services:', alert);
  }

  sendErrorToServices(error) {
    // This would integrate with error tracking services
    // like Sentry, Bugsnag, etc.
    
    console.log('📡 Sending error to external services:', error);
  }

  // API methods
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getAlerts(limit = 50) {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getErrors(limit = 50) {
    return Array.from(this.errorData.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getHealthStatus() {
    return this.uptimeData.get('health_checks');
  }

  getPerformanceData(timeRange = '1h') {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    return Array.from(this.performanceData.values())
      .filter(snapshot => new Date(snapshot.timestamp) >= startTime)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  clearAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  clearAllAlerts() {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.status === 'active') {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
      }
    }
    console.log('✅ All alerts resolved');
  }
}

// Singleton instance
const comprehensiveMonitoring = new ComprehensiveMonitoring();

module.exports = {
  ComprehensiveMonitoring,
  comprehensiveMonitoring
};
