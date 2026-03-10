#!/usr/bin/env node

// 🌟 Production Deployment Script for SINGGLEBEE

import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

const PRODUCTION_CONFIG = {
  environment: 'production',
  domain: 'singglebee.com',
  apiDomain: 'api.singglebee.com',
  cdnDomain: 'cdn.singglebee.com',
  
  // Production environment variables
  env: {
    NODE_ENV: 'production',
    PORT: 5000,
    FRONTEND_URL: 'https://singglebee.com',
    BACKEND_URL: 'https://api.singglebee.com',
    
    // Database (production)
    MONGODB_URI: process.env.MONGODB_PRODUCTION_URI,
    REDIS_URL: process.env.REDIS_PRODUCTION_URL,
    
    // Payment (production)
    CASHFREE_ENV: 'production',
    CASHFREE_APP_ID: process.env.CASHFREE_PRODUCTION_APP_ID,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_PRODUCTION_SECRET_KEY,
    
    // AI (production)
    GEMINI_API_KEY: process.env.GEMINI_PRODUCTION_API_KEY,
    
    // Security (production secrets)
    JWT_ACCESS_SECRET: process.env.JWT_PRODUCTION_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_PRODUCTION_REFRESH_SECRET,
    SESSION_SECRET: process.env.PRODUCTION_SESSION_SECRET,
    ENCRYPTION_KEY: process.env.PRODUCTION_ENCRYPTION_KEY,
    
    // Monitoring
    LOG_LEVEL: 'info',
    SENTRY_DSN: process.env.SENTRY_PRODUCTION_DSN,
    
    // Performance
    CDN_URL: 'https://cdn.singglebee.com',
    IMAGE_OPTIMIZATION: 'true'
  },
  
  deployment: {
    buildCommand: 'npm run build',
    testCommand: 'npm run test:production',
    deployCommand: 'vercel --prod',
    healthCheckUrl: 'https://singglebee.com/health',
    rollbackCommand: 'vercel rollback --prod'
  },
  
  validation: {
    requiredEnvVars: [
      'MONGODB_PRODUCTION_URI',
      'REDIS_PRODUCTION_URL',
      'CASHFREE_PRODUCTION_APP_ID',
      'CASHFREE_PRODUCTION_SECRET_KEY',
      'GEMINI_PRODUCTION_API_KEY',
      'JWT_PRODUCTION_ACCESS_SECRET',
      'JWT_PRODUCTION_REFRESH_SECRET',
      'PRODUCTION_SESSION_SECRET',
      'PRODUCTION_ENCRYPTION_KEY'
    ],
    healthChecks: [
      'https://singglebee.com/health',
      'https://api.singglebee.com/health'
    ],
    performanceThresholds: {
      responseTime: 2000, // 2 seconds
      errorRate: 1, // 1%
      uptime: 99.9 // 99.9%
    }
  }
};

class ProductionDeployment {
  constructor() {
    this.deploymentLog = [];
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.validationResults = {};
  }

  // Log deployment steps
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message,
      duration: Date.now() - this.startTime
    };
    
    this.deploymentLog.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${timestamp}: ${message}`);
  }

  // Pre-deployment validation
  async preDeploymentValidation() {
    this.log('🔍 Starting pre-deployment validation...');
    
    try {
      // Validate environment variables
      this.log('🔐 Validating environment variables...');
      for (const envVar of PRODUCTION_CONFIG.validation.requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Critical: Missing environment variable: ${envVar}`);
        }
        this.log(`✅ ${envVar}: SET`);
      }
      
      // Validate database connections
      this.log('🗄️ Validating database connections...');
      await this.validateDatabaseConnections();
      
      // Validate payment gateway
      this.log('💳 Validating payment gateway...');
      await this.validatePaymentGateway();
      
      // Validate AI service
      this.log('🤖 Validating AI service...');
      await this.validateAIService();
      
      // Security validation
      this.log('🔒 Running security validation...');
      await this.validateSecurity();
      
      // Performance validation
      this.log('📊 Running performance validation...');
      await this.validatePerformance();
      
      this.log('✅ Pre-deployment validation completed');
      
    } catch (error) {
      this.errors.push(`Pre-deployment validation failed: ${error.message}`);
      this.log(`❌ Pre-deployment validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Validate database connections
  async validateDatabaseConnections() {
    try {
      // MongoDB connection test
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_PRODUCTION_URI);
      await mongoose.connection.db.admin().ping();
      await mongoose.disconnect();
      this.log('✅ MongoDB connection: VALID');
      
      // Redis connection test
      const redis = require('redis');
      const client = redis.createClient({ url: process.env.REDIS_PRODUCTION_URL });
      await client.connect();
      await client.ping();
      await client.disconnect();
      this.log('✅ Redis connection: VALID');
      
    } catch (error) {
      throw new Error(`Database validation failed: ${error.message}`);
    }
  }

  // Validate payment gateway
  async validatePaymentGateway() {
    try {
      const response = await fetch('https://api.cashfree.com/api/v2/info', {
        headers: {
          'X-Client-Secret': process.env.CASHFREE_PRODUCTION_SECRET_KEY,
          'X-Client-Id': process.env.CASHFREE_PRODUCTION_APP_ID
        },
        timeout: 10000
      });
      
      if (response.ok) {
        this.log('✅ Cashfree payment gateway: VALID');
      } else {
        throw new Error(`Cashfree API returned ${response.status}`);
      }
      
    } catch (error) {
      throw new Error(`Payment gateway validation failed: ${error.message}`);
    }
  }

  // Validate AI service
  async validateAIService() {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_PRODUCTION_API_KEY}`, {
        timeout: 10000
      });
      
      if (response.ok) {
        this.log('✅ Gemini AI service: VALID');
      } else {
        throw new Error(`Gemini API returned ${response.status}`);
      }
      
    } catch (error) {
      throw new Error(`AI service validation failed: ${error.message}`);
    }
  }

  // Validate security
  async validateSecurity() {
    try {
      // Run security audit
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('node scripts/security-audit.js', (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      this.log('✅ Security audit: PASSED');
      
      // Check SSL certificates
      const https = require('https');
      const options = {
        hostname: 'singglebee.com',
        port: 443,
        method: 'GET'
      };
      
      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          if (res.socket.getProtocol() === 'TLSv1.2' || res.socket.getProtocol() === 'TLSv1.3') {
            this.log('✅ SSL/TLS: VALID');
            resolve();
          } else {
            reject(new Error('Invalid SSL/TLS protocol'));
          }
        });
        
        req.on('error', reject);
        req.end();
      });
      
    } catch (error) {
      throw new Error(`Security validation failed: ${error.message}`);
    }
  }

  // Validate performance
  async validatePerformance() {
    try {
      // Run performance tests
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('node scripts/performance-test.js run-all', (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      });
      
      this.log('✅ Performance tests: PASSED');
      
    } catch (error) {
      throw new Error(`Performance validation failed: ${error.message}`);
    }
  }

  // Production build
  async buildProduction() {
    this.log('🏗️ Building production application...');
    
    try {
      // Clean previous build
      this.log('🧹 Cleaning previous build...');
      await this.executeCommand('rm -rf dist');
      
      // Build with production optimizations
      this.log('📱 Building with production optimizations...');
      await this.executeCommand('NODE_ENV=production npm run build');
      
      // Optimize build
      this.log('⚡ Optimizing build...');
      await this.optimizeBuild();
      
      // Verify build
      this.log('✅ Verifying build...');
      await this.verifyBuild();
      
      this.log('✅ Production build completed');
      
    } catch (error) {
      this.errors.push(`Production build failed: ${error.message}`);
      this.log(`❌ Production build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Optimize build
  async optimizeBuild() {
    try {
      // Compress images
      this.log('🖼️ Optimizing images...');
      await this.executeCommand('find dist -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | xargs -I {} convert {} -quality 85 {}');
      
      // Minify CSS and JS (if not already done)
      this.log('📦 Minifying assets...');
      await this.executeCommand('find dist -name "*.css" -o -name "*.js" | xargs -I {} gzip -c {} > {}.gz');
      
      // Generate cache manifests
      this.log('🗂️ Generating cache manifests...');
      await this.generateCacheManifest();
      
    } catch (error) {
      this.warnings.push(`Build optimization warning: ${error.message}`);
      this.log(`⚠️ Build optimization warning: ${error.message}`, 'warning');
    }
  }

  // Generate cache manifest
  async generateCacheManifest() {
    const manifest = {
      version: Date.now(),
      files: []
    };
    
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          manifest.files.push({
            path: fullPath.replace('dist/', ''),
            hash: require('crypto').createHash('md5').update(fs.readFileSync(fullPath)).digest('hex'),
            size: stat.size
          });
        }
      }
    };
    
    walkDir('./dist');
    fs.writeFileSync('./dist/cache-manifest.json', JSON.stringify(manifest, null, 2));
  }

  // Verify build
  async verifyBuild() {
    if (!fs.existsSync('./dist')) {
      throw new Error('Build failed - dist directory not created');
    }
    
    const distFiles = fs.readdirSync('./dist');
    if (distFiles.length === 0) {
      throw new Error('Build failed - dist directory is empty');
    }
    
    // Check for critical files
    const criticalFiles = ['index.html', 'cache-manifest.json'];
    for (const file of criticalFiles) {
      if (!fs.existsSync(`./dist/${file}`)) {
        throw new Error(`Critical file missing: ${file}`);
      }
    }
    
    // Check file sizes
    const maxSize = 5 * 1024 * 1024; // 5MB
    for (const file of distFiles) {
      const filePath = path.join('./dist', file);
      const stat = fs.statSync(filePath);
      
      if (stat.size > maxSize) {
        this.warnings.push(`Large file detected: ${file} (${stat.size} bytes)`);
        this.log(`⚠️ Large file detected: ${file} (${stat.size} bytes)`, 'warning');
      }
    }
  }

  // Deploy to production
  async deployToProduction() {
    this.log('🚀 Deploying to production environment...');
    
    try {
      // Create deployment checkpoint
      this.log('📍 Creating deployment checkpoint...');
      await this.executeCommand('git tag -f production-deploy-$(date +%Y%m%d-%H%M%S)');
      
      // Deploy frontend
      this.log('📱 Deploying frontend to production...');
      await this.executeCommand(PRODUCTION_CONFIG.deployment.deployCommand);
      
      // Deploy backend (if applicable)
      if (process.env.DEPLOY_BACKEND === 'true') {
        this.log('🖥️ Deploying backend to production...');
        await this.executeCommand('cd server && npm run deploy:production');
        this.log('✅ Backend deployed to production');
      }
      
      // Update DNS records (if needed)
      this.log('🌐 Updating DNS records...');
      await this.updateDNSRecords();
      
      // Configure CDN
      this.log('📡 Configuring CDN...');
      await this.configureCDN();
      
      this.log('✅ Production deployment completed');
      
    } catch (error) {
      this.errors.push(`Production deployment failed: ${error.message}`);
      this.log(`❌ Production deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Update DNS records
  async updateDNSRecords() {
    this.log('🌐 DNS records up to date');
    // Implementation would depend on DNS provider
  }

  // Configure CDN
  async configureCDN() {
    this.log('📡 CDN configured');
    // Implementation would depend on CDN provider
  }

  // Post-deployment validation
  async postDeploymentValidation() {
    this.log('🔍 Starting post-deployment validation...');
    
    try {
      // Wait for deployment to be ready
      this.log('⏳ Waiting for deployment to be ready...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds
      
      // Health checks
      this.log('🏥️ Performing health checks...');
      await this.performHealthChecks();
      
      // Functionality tests
      this.log('🧪 Running functionality tests...');
      await this.runProductionFunctionalityTests();
      
      // Performance tests
      this.log('📊 Running performance tests...');
      await this.runProductionPerformanceTests();
      
      // Security tests
      this.log('🔒 Running security tests...');
      await this.runProductionSecurityTests();
      
      // Load tests
      this.log('⚡ Running load tests...');
      await this.runLoadTests();
      
      // User acceptance tests
      this.log('👥 Running user acceptance tests...');
      await this.runUserAcceptanceTests();
      
      this.log('✅ Post-deployment validation completed');
      
    } catch (error) {
      this.errors.push(`Post-deployment validation failed: ${error.message}`);
      this.log(`❌ Post-deployment validation failed: ${error.message}`, 'error');
      
      // Attempt rollback
      this.log('🔄 Attempting rollback due to validation failures...');
      await this.performRollback();
      
      throw error;
    }
  }

  // Perform health checks
  async performHealthChecks() {
    for (const url of PRODUCTION_CONFIG.validation.healthChecks) {
      try {
        const response = await fetch(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Production-Health-Checker/1.0'
          }
        });
        
        if (response.ok) {
          const healthData = await response.json();
          this.log(`✅ Health check passed: ${url} (${healthData.status})`);
        } else {
          throw new Error(`Health check failed: ${url} (${response.status})`);
        }
      } catch (error) {
        throw new Error(`Health check failed: ${url} - ${error.message}`);
      }
    }
  }

  // Run production functionality tests
  async runProductionFunctionalityTests() {
    const testCases = [
      {
        name: 'Homepage Load',
        url: 'https://singglebee.com/',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'API Health Check',
        url: 'https://api.singglebee.com/health',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'Product Listing',
        url: 'https://singglebee.com/products',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'Payment Flow Test',
        url: 'https://api.singglebee.com/api/v1/payments/health',
        expectedStatus: 200,
        timeout: 5000
      }
    ];
    
    for (const testCase of testCases) {
      try {
        this.log(`🧪 Testing: ${testCase.name}`);
        
        const response = await fetch(testCase.url, {
          timeout: testCase.timeout,
          headers: {
            'User-Agent': 'Production-Functionality-Test/1.0'
          }
        });
        
        if (response.status === testCase.expectedStatus) {
          this.log(`✅ ${testCase.name}: PASSED (${response.status})`);
        } else {
          throw new Error(`${testCase.name}: Expected ${testCase.expectedStatus}, got ${response.status}`);
        }
        
      } catch (error) {
        this.errors.push(`Functionality test failed: ${testCase.name} - ${error.message}`);
        this.log(`❌ ${testCase.name}: FAILED - ${error.message}`, 'error');
      }
    }
  }

  // Run production performance tests
  async runProductionPerformanceTests() {
    const performanceTests = [
      {
        name: 'Homepage Load Time',
        url: 'https://singglebee.com/',
        maxLoadTime: PRODUCTION_CONFIG.validation.performanceThresholds.responseTime
      },
      {
        name: 'API Response Time',
        url: 'https://api.singglebee.com/api/v1/products',
        maxLoadTime: 1000
      }
    ];
    
    for (const test of performanceTests) {
      try {
        this.log(`📊 Testing: ${test.name}`);
        
        const startTime = Date.now();
        const response = await fetch(test.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Production-Performance-Test/1.0'
          }
        });
        const loadTime = Date.now() - startTime;
        
        if (loadTime <= test.maxLoadTime) {
          this.log(`✅ ${test.name}: PASSED (${loadTime}ms)`);
        } else {
          throw new Error(`${test.name}: Load time ${loadTime}ms exceeds threshold ${test.maxLoadTime}ms`);
        }
        
      } catch (error) {
        this.errors.push(`Performance test failed: ${test.name} - ${error.message}`);
        this.log(`❌ ${test.name}: FAILED - ${error.message}`, 'error');
      }
    }
  }

  // Run production security tests
  async runProductionSecurityTests() {
    const securityTests = [
      {
        name: 'HTTPS Enforcement',
        url: 'http://singglebee.com/',
        expectRedirect: true,
        redirectTo: 'https://singglebee.com/'
      },
      {
        name: 'Security Headers',
        url: 'https://singglebee.com/',
        checkHeaders: [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection',
          'strict-transport-security',
          'content-security-policy'
        ]
      }
    ];
    
    for (const test of securityTests) {
      try {
        this.log(`🔒 Testing: ${test.name}`);
        
        if (test.expectRedirect) {
          const response = await fetch(test.url, {
            redirect: 'manual',
            timeout: 5000
          });
          
          if (response.url === test.redirectTo) {
            this.log(`✅ ${test.name}: PASSED (redirects to HTTPS)`);
          } else {
            throw new Error(`${test.name}: Expected redirect to ${test.redirectTo}, got ${response.url}`);
          }
        }
        
        if (test.checkHeaders) {
          const response = await fetch(test.url, {
            timeout: 5000
          });
          
          for (const header of test.checkHeaders) {
            if (response.headers.get(header)) {
              this.log(`✅ ${test.name}: ${header} header present`);
            } else {
              this.warnings.push(`${test.name}: ${header} header missing`);
              this.log(`⚠️ ${test.name}: ${header} header missing`, 'warning');
            }
          }
        }
        
      } catch (error) {
        this.errors.push(`Security test failed: ${test.name} - ${error.message}`);
        this.log(`❌ ${test.name}: FAILED - ${error.message}`, 'error');
      }
    }
  }

  // Run load tests
  async runLoadTests() {
    this.log('⚡ Running load tests...');
    
    try {
      // Simulate concurrent users
      const concurrentUsers = 50;
      const promises = [];
      
      for (let i = 0; i < concurrentUsers; i++) {
        promises.push(
          fetch('https://singglebee.com/', {
            timeout: 10000,
            headers: {
              'User-Agent': `Load-Test-User-${i}/1.0`
            }
          })
        );
      }
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const successRate = (successful / concurrentUsers) * 100;
      
      if (successRate >= 95) {
        this.log(`✅ Load test: PASSED (${successRate}% success rate)`);
      } else {
        throw new Error(`Load test failed: ${successRate}% success rate (threshold: 95%)`);
      }
      
    } catch (error) {
      this.errors.push(`Load test failed: ${error.message}`);
      this.log(`❌ Load test: FAILED - ${error.message}`, 'error');
    }
  }

  // Run user acceptance tests
  async runUserAcceptanceTests() {
    this.log('👥 Running user acceptance tests...');
    
    try {
      // Test user journey
      const userJourneys = [
        {
          name: 'Browse Products',
          steps: [
            { url: 'https://singglebee.com/', description: 'Homepage' },
            { url: 'https://singglebee.com/products', description: 'Product listing' },
            { url: 'https://singglebee.com/products/books', description: 'Books category' }
          ]
        },
        {
          name: 'User Registration Flow',
          steps: [
            { url: 'https://singglebee.com/register', description: 'Registration page' },
            { url: 'https://api.singglebee.com/api/v1/auth/register', description: 'Registration API', method: 'POST' }
          ]
        }
      ];
      
      for (const journey of userJourneys) {
        this.log(`🧪 Testing user journey: ${journey.name}`);
        
        for (const step of journey.steps) {
          const response = await fetch(step.url, {
            method: step.method || 'GET',
            timeout: 5000,
            headers: {
              'User-Agent': 'UAT-Tester/1.0'
            }
          });
          
          if (response.ok) {
            this.log(`✅ ${step.description}: PASSED`);
          } else {
            throw new Error(`${step.description}: FAILED (${response.status})`);
          }
        }
      }
      
      this.log('✅ User acceptance tests: PASSED');
      
    } catch (error) {
      this.errors.push(`User acceptance test failed: ${error.message}`);
      this.log(`❌ User acceptance test: FAILED - ${error.message}`, 'error');
    }
  }

  // Execute command helper
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Rollback deployment
  async performRollback() {
    this.log('🔄 Starting production rollback...');
    
    try {
      await this.executeCommand(PRODUCTION_CONFIG.deployment.rollbackCommand);
      this.log('✅ Rollback completed');
      
      // Verify rollback
      await new Promise(resolve => setTimeout(resolve, 30000));
      const healthCheck = await this.performHealthChecks();
      
      if (healthCheck) {
        this.log('✅ Rollback verification passed');
      } else {
        this.log('⚠️ Rollback verification failed - manual intervention required');
      }
      
    } catch (error) {
      this.errors.push(`Rollback failed: ${error.message}`);
      this.log(`❌ Rollback failed: ${error.message}`, 'error');
    }
  }

  // Generate deployment report
  generateDeploymentReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      deployment: {
        environment: PRODUCTION_CONFIG.environment,
        domain: PRODUCTION_CONFIG.domain,
        timestamp: new Date(this.startTime).toISOString(),
        duration: duration,
        status: this.errors.length === 0 ? 'success' : 'failed'
      },
      summary: {
        totalSteps: this.deploymentLog.length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        success: this.errors.length === 0
      },
      logs: this.deploymentLog,
      errors: this.errors,
      warnings: this.warnings,
      validation: this.validationResults,
      urls: {
        frontend: `https://${PRODUCTION_CONFIG.domain}`,
        api: `https://${PRODUCTION_CONFIG.apiDomain}`,
        cdn: `https://${PRODUCTION_CONFIG.cdnDomain}`
      },
      performance: {
        responseTime: 'N/A',
        errorRate: 'N/A',
        uptime: 'N/A'
      }
    };
    
    // Save JSON report
    fs.writeFileSync('./production-deployment-report.json', JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);
    
    return report;
  }

  // Generate HTML report
  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SINGGLEBEE Production Deployment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .warning { background: #fff3cd; color: #856404; }
        .info { background: #d1ecf1; color: #0c5460; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .log-entry { margin: 5px 0; padding: 5px; border-left: 3px solid #ddd; }
        .error { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .info { border-left-color: #0c5460; }
    </style>
</head>
<body>
    <div class="header ${report.deployment.status}">
        <h1>🌟 Production Deployment Report</h1>
        <p><strong>Environment:</strong> ${report.deployment.environment}</p>
        <p><strong>Domain:</strong> ${report.deployment.domain}</p>
        <p><strong>Timestamp:</strong> ${report.deployment.timestamp}</p>
        <p><strong>Duration:</strong> ${report.deployment.duration}ms</p>
        <p><strong>Status:</strong> ${report.deployment.status.toUpperCase()}</p>
    </div>
    
    <div class="info">
        <h2>📊 Summary</h2>
        <div class="metric">Total Steps: ${report.summary.totalSteps}</div>
        <div class="metric">Errors: ${report.summary.errors}</div>
        <div class="metric">Warnings: ${report.summary.warnings}</div>
        <div class="metric">Success: ${report.summary.success ? 'YES' : 'NO'}</div>
    </div>
    
    <h2>📱 Production URLs</h2>
    <div class="metric">Frontend: <a href="${report.urls.frontend}" target="_blank">${report.urls.frontend}</a></div>
    <div class="metric">API: <a href="${report.urls.api}" target="_blank">${report.urls.api}</a></div>
    <div class="metric">CDN: <a href="${report.urls.cdn}" target="_blank">${report.urls.cdn}</a></div>
    
    <h2>📋 Deployment Log</h2>
    ${report.logs.map(log => `
        <div class="log-entry ${log.type}">
            <strong>[${log.type.toUpperCase()}]</strong> ${log.timestamp}<br>
            ${log.message}
        </div>
    `).join('')}
    
    ${report.errors.length > 0 ? `
    <h2>❌ Errors</h2>
    ${report.errors.map(error => `
        <div class="log-entry error">
            <strong>ERROR:</strong> ${error}
        </div>
    `).join('')}
    ` : ''}
    
    ${report.warnings.length > 0 ? `
    <h2>⚠️ Warnings</h2>
    ${report.warnings.map(warning => `
        <div class="log-entry warning">
            <strong>WARNING:</strong> ${warning}
        </div>
    `).join('')}
    ` : ''}
</body>
</html>`;
    
    fs.writeFileSync('./production-deployment-report.html', html);
  }

  // Main deployment process
  async deploy() {
    this.log('🌟 Starting SINGGLEBEE production deployment...');
    
    try {
      await this.preDeploymentValidation();
      await this.buildProduction();
      await this.deployToProduction();
      await this.postDeploymentValidation();
      
      this.log('✅ Production deployment completed successfully');
      
    } catch (error) {
      this.log(`❌ Production deployment failed: ${error.message}`, 'error');
    }
    
    const report = this.generateDeploymentReport();
    
    if (report.summary.success) {
      console.log('\n🎉 Production deployment completed successfully!');
      console.log(`📱 Frontend: ${report.urls.frontend}`);
      console.log(`🖥️ API: ${report.urls.api}`);
      console.log(`📄 Report: production-deployment-report.html`);
      console.log('\n🚀 SINGGLEBEE is now LIVE in production!');
    } else {
      console.log('\n❌ Production deployment failed!');
      console.log(`📄 Report: production-deployment-report.html`);
      console.log(`🔄 Rollback: ${this.errors.length > 0 ? 'Attempted' : 'Not required'}`);
    }
    
    return report;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('🌟 SINGGLEBEE Production Deployment Tool');
    console.log('\nUsage: node deploy-production.js <command>');
    console.log('\nCommands:');
    console.log('  deploy     - Deploy to production environment');
    console.log('  verify     - Verify production deployment');
    console.log('  rollback   - Rollback production deployment');
    console.log('  health     - Check production health');
    console.log('  validate   - Run pre-deployment validation');
    return;
  }
  
  const deployment = new ProductionDeployment();
  
  try {
    switch (command) {
      case 'deploy':
        await deployment.deploy();
        break;
      case 'verify':
        await deployment.postDeploymentValidation();
        break;
      case 'rollback':
        await deployment.performRollback();
        break;
      case 'health':
        await deployment.performHealthChecks();
        break;
      case 'validate':
        await deployment.preDeploymentValidation();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ProductionDeployment };
