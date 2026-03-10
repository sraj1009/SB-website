// 📊 Production Monitoring for SINGGLEBEE

import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Winston Logger Configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'singglebee-api' },
  transports: [
    // File transport for logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 3,
      tailable: true
    }),
    
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Performance Monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: []
    };
    this.startTime = Date.now();
  }
  
  // Track request metrics
  trackRequest(req, res, responseTime) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
    
    // Log slow requests
    if (responseTime > 3000) {
      logger.warn('Slow request detected', {
        url: req.url,
        method: req.method,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      this.metrics.errors++;
      logger.error('HTTP Error', {
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: res.error || 'Unknown error'
      });
    }
  }
  
  // Track system metrics
  trackSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.memoryUsage.push({
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    });
    
    this.metrics.cpuUsage.push({
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 metrics
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
  }
  
  // Get performance summary
  getPerformanceSummary() {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    const errorRate = this.metrics.requests > 0 
      ? (this.metrics.errors / this.metrics.requests) * 100 
      : 0;
    
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: errorRate.toFixed(2) + '%',
      avgResponseTime: Math.round(avgResponseTime) + 'ms',
      memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || {},
      cpuUsage: this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1] || {}
    };
  }
}

// Health Check System
class HealthChecker {
  constructor() {
    this.services = {
      database: { status: 'unknown', lastCheck: null },
      redis: { status: 'unknown', lastCheck: null },
      payment: { status: 'unknown', lastCheck: null },
      email: { status: 'unknown', lastCheck: null }
    };
  }
  
  // Check database connectivity
  async checkDatabase() {
    try {
      // This would be your actual database connection check
      const mongoose = require('mongoose');
      await mongoose.connection.db.admin().ping();
      
      this.services.database = {
        status: 'healthy',
        lastCheck: new Date().toISOString()
      };
      
      return true;
    } catch (error) {
      this.services.database = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
      
      logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }
  
  // Check Redis connectivity
  async checkRedis() {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL
      });
      
      await client.ping();
      
      this.services.redis = {
        status: 'healthy',
        lastCheck: new Date().toISOString()
      };
      
      return true;
    } catch (error) {
      this.services.redis = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
      
      logger.error('Redis health check failed', { error: error.message });
      return false;
    }
  }
  
  // Check payment gateway
  async checkPaymentGateway() {
    try {
      // This would be your actual payment gateway health check
      const response = await fetch('https://api.cashfree.com/health', {
        timeout: 5000
      });
      
      if (response.ok) {
        this.services.payment = {
          status: 'healthy',
          lastCheck: new Date().toISOString()
        };
        return true;
      } else {
        throw new Error(`Payment gateway returned ${response.status}`);
      }
    } catch (error) {
      this.services.payment = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
      
      logger.error('Payment gateway health check failed', { error: error.message });
      return false;
    }
  }
  
  // Check email service
  async checkEmailService() {
    try {
      // This would be your actual email service check
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      await transporter.verify();
      
      this.services.email = {
        status: 'healthy',
        lastCheck: new Date().toISOString()
      };
      
      return true;
    } catch (error) {
      this.services.email = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error.message
      };
      
      logger.error('Email service health check failed', { error: error.message });
      return false;
    }
  }
  
  // Get overall health status
  async getHealthStatus() {
    await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkPaymentGateway(),
      this.checkEmailService()
    ]);
    
    const allHealthy = Object.values(this.services)
      .every(service => service.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: this.services,
      uptime: process.uptime()
    };
  }
}

// Alert System
class AlertSystem {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      errorRate: 5, // 5% error rate threshold
      responseTime: 3000, // 3 seconds response time threshold
      memoryUsage: 90, // 90% memory usage threshold
      cpuUsage: 80 // 80% CPU usage threshold
    };
  }
  
  // Check for alerts
  checkAlerts(performanceSummary, healthStatus) {
    const alerts = [];
    
    // Error rate alert
    if (parseFloat(performanceSummary.errorRate) > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate (${performanceSummary.errorRate}) exceeds threshold (${this.thresholds.errorRate}%)`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Response time alert
    if (parseInt(performanceSummary.avgResponseTime) > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `Average response time (${performanceSummary.avgResponseTime}) exceeds threshold (${this.thresholds.responseTime}ms)`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Memory usage alert
    if (performanceSummary.memoryUsage.heapUsed) {
      const memoryUsagePercent = (performanceSummary.memoryUsage.heapUsed / performanceSummary.memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > this.thresholds.memoryUsage) {
        alerts.push({
          type: 'memory_usage',
          severity: 'high',
          message: `Memory usage (${memoryUsagePercent.toFixed(1)}%) exceeds threshold (${this.thresholds.memoryUsage}%)`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Service health alerts
    Object.entries(healthStatus.services).forEach(([service, status]) => {
      if (status.status === 'unhealthy') {
        alerts.push({
          type: 'service_health',
          severity: 'critical',
          message: `${service} service is unhealthy: ${status.error || 'Unknown error'}`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Send alerts
    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
    
    return alerts;
  }
  
  // Send alerts (would integrate with email/SMS/webhook)
  async sendAlerts(alerts) {
    for (const alert of alerts) {
      logger.error('ALERT', alert);
      
      // Here you would integrate with your alert system
      // Examples: email, Slack, Discord, webhook, etc.
      
      if (alert.severity === 'critical') {
        // Immediate notification for critical alerts
        console.log(`🚨 CRITICAL ALERT: ${alert.message}`);
      }
    }
  }
}

// Initialize monitoring systems
const performanceMonitor = new PerformanceMonitor();
const healthChecker = new HealthChecker();
const alertSystem = new AlertSystem();

// Express middleware for monitoring
const monitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Track response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.trackRequest(req, res, responseTime);
  });
  
  next();
};

// System metrics collection
setInterval(() => {
  performanceMonitor.trackSystemMetrics();
}, 60000); // Every minute

// Health check interval
setInterval(async () => {
  const healthStatus = await healthChecker.getHealthStatus();
  const performanceSummary = performanceMonitor.getPerformanceSummary();
  alertSystem.checkAlerts(performanceSummary, healthStatus);
}, 300000); // Every 5 minutes

// API endpoints for monitoring
const monitoringRoutes = {
  // Health check endpoint
  '/health': async (req, res) => {
    try {
      const healthStatus = await healthChecker.getHealthStatus();
      res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message
      });
    }
  },
  
  // Metrics endpoint
  '/metrics': async (req, res) => {
    try {
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      res.json({
        timestamp: new Date().toISOString(),
        performance: performanceSummary,
        health: await healthChecker.getHealthStatus()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Metrics collection failed',
        error: error.message
      });
    }
  },
  
  // Alerts endpoint
  '/alerts': async (req, res) => {
    try {
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      const healthStatus = await healthChecker.getHealthStatus();
      const alerts = alertSystem.checkAlerts(performanceSummary, healthStatus);
      
      res.json({
        timestamp: new Date().toISOString(),
        alerts,
        count: alerts.length
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Alert collection failed',
        error: error.message
      });
    }
  }
};

export {
  logger,
  performanceMonitor,
  healthChecker,
  alertSystem,
  monitoringMiddleware,
  monitoringRoutes
};
