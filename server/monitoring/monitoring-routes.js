const express = require('express');
const { comprehensiveMonitoring } = require('./comprehensive-monitoring');

const router = express.Router();

/**
 * Monitoring API Routes
 * Provides endpoints for accessing monitoring data and health status
 */

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await comprehensiveMonitoring.performHealthChecks();
    
    const overallHealth = healthStatus.get('overall');
    const statusCode = overallHealth === 'healthy' ? 200 : 
                     overallHealth === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      checks: Object.fromEntries(healthStatus),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      code: 'METRICS_ERROR'
    });
  }
});

// Alerts endpoint
router.get('/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = comprehensiveMonitoring.getAlerts(limit);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      code: 'ALERTS_ERROR'
    });
  }
});

// Clear alert endpoint
router.post('/alerts/:alertId/clear', (req, res) => {
  try {
    const { alertId } = req.params;
    comprehensiveMonitoring.clearAlert(alertId);
    
    res.json({
      success: true,
      message: `Alert ${alertId} cleared`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear alert error:', error);
    res.status(500).json({
      error: 'Failed to clear alert',
      code: 'CLEAR_ALERT_ERROR'
    });
  }
});

// Clear all alerts endpoint
router.post('/alerts/clear-all', (req, res) => {
  try {
    comprehensiveMonitoring.clearAllAlerts();
    
    res.json({
      success: true,
      message: 'All alerts cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clear all alerts error:', error);
    res.status(500).json({
      error: 'Failed to clear all alerts',
      code: 'CLEAR_ALL_ALERTS_ERROR'
    });
  }
});

// Errors endpoint
router.get('/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const errors = comprehensiveMonitoring.getErrors(limit);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: errors,
      count: errors.length
    });
  } catch (error) {
    console.error('Errors endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get errors',
      code: 'ERRORS_ERROR'
    });
  }
});

// Performance data endpoint
router.get('/performance', (req, res) => {
  try {
    const timeRange = req.query.timeRange || '1h';
    const performanceData = comprehensiveMonitoring.getPerformanceData(timeRange);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeRange,
      data: performanceData,
      count: performanceData.length
    });
  } catch (error) {
    console.error('Performance data error:', error);
    res.status(500).json({
      error: 'Failed to get performance data',
      code: 'PERFORMANCE_ERROR'
    });
  }
});

// System overview endpoint
router.get('/overview', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    const alerts = comprehensiveMonitoring.getAlerts(10);
    const errors = comprehensiveMonitoring.getErrors(10);
    const healthStatus = comprehensiveMonitoring.getHealthStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        metrics: {
          system: metrics.system,
          application: metrics.application,
          database: metrics.database,
          payments: metrics.payments,
          security: metrics.security
        },
        health: healthStatus,
        recentAlerts: alerts,
        recentErrors: errors,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({
      error: 'Failed to get overview',
      code: 'OVERVIEW_ERROR'
    });
  }
});

// Database metrics endpoint
router.get('/database', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.database
    });
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({
      error: 'Failed to get database metrics',
      code: 'DATABASE_METRICS_ERROR'
    });
  }
});

// Payment metrics endpoint
router.get('/payments', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.payments
    });
  } catch (error) {
    console.error('Payment metrics error:', error);
    res.status(500).json({
      error: 'Failed to get payment metrics',
      code: 'PAYMENT_METRICS_ERROR'
    });
  }
});

// Security metrics endpoint
router.get('/security', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.security
    });
  } catch (error) {
    console.error('Security metrics error:', error);
    res.status(500).json({
      error: 'Failed to get security metrics',
      code: 'SECURITY_METRICS_ERROR'
    });
  }
});

// System info endpoint
router.get('/system', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      resourceUsage: process.resourceUsage ? process.resourceUsage() : null
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        metrics: metrics.system,
        system: systemInfo
      }
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      error: 'Failed to get system info',
      code: 'SYSTEM_INFO_ERROR'
    });
  }
});

// Logs endpoint (simplified)
router.get('/logs', (req, res) => {
  try {
    const level = req.query.level || 'info';
    const limit = parseInt(req.query.limit) || 100;
    
    // This would integrate with your logging system
    // For now, return recent errors and alerts as logs
    
    const errors = comprehensiveMonitoring.getErrors(limit);
    const alerts = comprehensiveMonitoring.getAlerts(limit);
    
    const logs = [
      ...errors.map(error => ({
        level: 'error',
        message: error.message,
        timestamp: error.timestamp,
        source: error.source,
        context: error.context
      })),
      ...alerts.map(alert => ({
        level: alert.severity === 'critical' ? 'error' : 
               alert.severity === 'warning' ? 'warn' : 'info',
        message: alert.message,
        timestamp: alert.timestamp,
        source: 'monitoring',
        context: alert.data
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, limit);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Logs endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get logs',
      code: 'LOGS_ERROR'
    });
  }
});

// Status page endpoint
router.get('/status', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    const healthStatus = comprehensiveMonitoring.getHealthStatus();
    const recentAlerts = comprehensiveMonitoring.getAlerts(5);
    
    const status = {
      overall: healthStatus?.overall || 'unknown',
      system: metrics.system,
      application: metrics.application,
      uptime: process.uptime(),
      lastUpdated: new Date().toISOString()
    };

    // Determine status color
    let statusColor = 'green';
    if (status.overall === 'degraded') statusColor = 'yellow';
    if (status.overall === 'unhealthy') statusColor = 'red';
    if (status.system.cpu > 80 || status.system.memory > 85) statusColor = 'yellow';
    if (status.system.cpu > 95 || status.system.memory > 95) statusColor = 'red';

    res.json({
      status: status.overall,
      color: statusColor,
      timestamp: new Date().toISOString(),
      uptime: status.uptime,
      metrics: {
        system: status.system,
        application: status.application
      },
      health: healthStatus,
      recentAlerts: recentAlerts.map(alert => ({
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp
      }))
    });
  } catch (error) {
    console.error('Status page error:', error);
    res.status(500).json({
      status: 'error',
      color: 'red',
      error: 'Failed to get status',
      timestamp: new Date().toISOString()
    });
  }
});

// Prometheus metrics endpoint
router.get('/prometheus', (req, res) => {
  try {
    const metrics = comprehensiveMonitoring.getMetrics();
    
    let prometheusMetrics = '';
    
    // System metrics
    prometheusMetrics += `# HELP system_cpu_usage CPU usage percentage\n`;
    prometheusMetrics += `# TYPE system_cpu_usage gauge\n`;
    prometheusMetrics += `system_cpu_usage ${metrics.system.cpu}\n\n`;
    
    prometheusMetrics += `# HELP system_memory_usage Memory usage percentage\n`;
    prometheusMetrics += `# TYPE system_memory_usage gauge\n`;
    prometheusMetrics += `system_memory_usage ${metrics.system.memory}\n\n`;
    
    prometheusMetrics += `# HELP system_uptime System uptime in seconds\n`;
    prometheusMetrics += `# TYPE system_uptime counter\n`;
    prometheusMetrics += `system_uptime ${metrics.system.uptime}\n\n`;
    
    // Application metrics
    prometheusMetrics += `# HELP app_requests_total Total number of requests\n`;
    prometheusMetrics += `# TYPE app_requests_total counter\n`;
    prometheusMetrics += `app_requests_total ${metrics.application.requests}\n\n`;
    
    prometheusMetrics += `# HELP app_errors_total Total number of errors\n`;
    prometheusMetrics += `# TYPE app_errors_total counter\n`;
    prometheusMetrics += `app_errors_total ${metrics.application.errors}\n\n`;
    
    prometheusMetrics += `# HELP app_response_time Average response time in milliseconds\n`;
    prometheusMetrics += `# TYPE app_response_time gauge\n`;
    prometheusMetrics += `app_response_time ${metrics.application.responseTime}\n\n`;
    
    prometheusMetrics += `# HELP app_active_connections Number of active connections\n`;
    prometheusMetrics += `# TYPE app_active_connections gauge\n`;
    prometheusMetrics += `app_active_connections ${metrics.application.activeConnections}\n\n`;
    
    // Database metrics
    prometheusMetrics += `# HELP db_connections Number of database connections\n`;
    prometheusMetrics += `# TYPE db_connections gauge\n`;
    prometheusMetrics += `db_connections ${metrics.database.connections}\n\n`;
    
    prometheusMetrics += `# HELP db_queries_total Total number of database queries\n`;
    prometheusMetrics += `# TYPE db_queries_total counter\n`;
    prometheusMetrics += `db_queries_total ${metrics.database.queries}\n\n`;
    
    prometheusMetrics += `# HELP db_slow_queries Number of slow database queries\n`;
    prometheusMetrics += `# TYPE db_slow_queries counter\n`;
    prometheusMetrics += `db_slow_queries ${metrics.database.slowQueries}\n\n`;
    
    // Payment metrics
    prometheusMetrics += `# HELP payments_total Total number of payments\n`;
    prometheusMetrics += `# TYPE payments_total counter\n`;
    prometheusMetrics += `payments_total ${metrics.payments.total}\n\n`;
    
    prometheusMetrics += `# HELP payments_successful Total number of successful payments\n`;
    prometheusMetrics += `# TYPE payments_successful counter\n`;
    prometheusMetrics += `payments_successful ${metrics.payments.successful}\n\n`;
    
    prometheusMetrics += `# HELP payments_failed Total number of failed payments\n`;
    prometheusMetrics += `# TYPE payments_failed counter\n`;
    prometheusMetrics += `payments_failed ${metrics.payments.failed}\n\n`;
    
    prometheusMetrics += `# HELP payments_success_rate Payment success rate percentage\n`;
    prometheusMetrics += `# TYPE payments_success_rate gauge\n`;
    prometheusMetrics += `payments_success_rate ${metrics.payments.successRate}\n\n`;
    
    // Security metrics
    prometheusMetrics += `# HELP security_auth_attempts_total Total authentication attempts\n`;
    prometheusMetrics += `# TYPE security_auth_attempts_total counter\n`;
    prometheusMetrics += `security_auth_attempts_total ${metrics.security.authAttempts}\n\n`;
    
    prometheusMetrics += `# HELP security_failed_auth_total Total failed authentication attempts\n`;
    prometheusMetrics += `# TYPE security_failed_auth_total counter\n`;
    prometheusMetrics += `security_failed_auth_total ${metrics.security.failedAuth}\n\n`;
    
    prometheusMetrics += `# HELP security_blocked_requests_total Total blocked requests\n`;
    prometheusMetrics += `# TYPE security_blocked_requests_total counter\n`;
    prometheusMetrics += `security_blocked_requests_total ${metrics.security.blockedRequests}\n\n`;
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  } catch (error) {
    console.error('Prometheus metrics error:', error);
    res.status(500).send('# Error generating metrics');
  }
});

module.exports = router;
