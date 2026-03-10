#!/usr/bin/env node

// 🚀 Staging Deployment Script for SINGGLEBEE

import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

const STAGING_CONFIG = {
  environment: 'staging',
  domain: 'staging.singglebee.com',
  apiDomain: 'api-staging.singglebee.com',
  cdnDomain: 'cdn-staging.singglebee.com',
  
  // Staging environment variables
  env: {
    NODE_ENV: 'staging',
    PORT: 3001,
    FRONTEND_URL: 'https://staging.singglebee.com',
    BACKEND_URL: 'https://api-staging.singglebee.com',
    
    // Database (staging)
    MONGODB_URI: 'mongodb+srv://staging-user:password@cluster.mongodb.net/singglebee-staging',
    REDIS_URL: 'redis://staging-user:password@redis-cluster:6379',
    
    // Payment (sandbox)
    CASHFREE_ENV: 'sandbox',
    CASHFREE_APP_ID: process.env.CASHFREE_SANDBOX_APP_ID,
    CASHFREE_SECRET_KEY: process.env.CASHFREE_SANDBOX_SECRET_KEY,
    
    // AI (staging)
    GEMINI_API_KEY: process.env.GEMINI_STAGING_API_KEY,
    
    // Security (staging secrets)
    JWT_ACCESS_SECRET: process.env.JWT_STAGING_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_STAGING_REFRESH_SECRET,
    SESSION_SECRET: process.env.STAGING_SESSION_SECRET,
    ENCRYPTION_KEY: process.env.STAGING_ENCRYPTION_KEY,
    
    // Monitoring
    LOG_LEVEL: 'debug',
    SENTRY_DSN: process.env.SENTRY_STAGING_DSN
  },
  
  deployment: {
    buildCommand: 'npm run build',
    testCommand: 'npm run test:staging',
    deployCommand: 'vercel --env staging',
    healthCheckUrl: 'https://staging.singglebee.com/health',
    rollbackCommand: 'vercel rollback --env staging'
  }
};

class StagingDeployment {
  constructor() {
    this.deploymentLog = [];
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
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

  // Pre-deployment checks
  async preDeploymentChecks() {
    this.log('🔍 Starting pre-deployment checks...');
    
    try {
      // Check if all required environment variables are set
      const requiredEnvVars = [
        'CASHFREE_SANDBOX_APP_ID',
        'CASHFREE_SANDBOX_SECRET_KEY',
        'GEMINI_STAGING_API_KEY',
        'JWT_STAGING_ACCESS_SECRET',
        'JWT_STAGING_REFRESH_SECRET',
        'STAGING_SESSION_SECRET',
        'STAGING_ENCRYPTION_KEY'
      ];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          this.errors.push(`Missing environment variable: ${envVar}`);
          this.log(`❌ Missing environment variable: ${envVar}`, 'error');
        }
      }
      
      if (this.errors.length > 0) {
        throw new Error('Pre-deployment checks failed');
      }
      
      // Check if working directory is clean
      try {
        await this.executeCommand('git status --porcelain');
        const gitStatus = await this.executeCommand('git status --porcelain');
        if (gitStatus.trim()) {
          this.warnings.push('Working directory not clean');
          this.log('⚠️ Working directory has uncommitted changes', 'warning');
        }
      } catch (error) {
        this.log(`⚠️ Git status check failed: ${error.message}`, 'warning');
      }
      
      // Check dependencies
      this.log('📦 Checking dependencies...');
      await this.executeCommand('npm ci');
      
      // Run tests
      this.log('🧪 Running tests...');
      await this.executeCommand(STAGING_CONFIG.deployment.testCommand);
      
      this.log('✅ Pre-deployment checks completed');
      
    } catch (error) {
      this.errors.push(`Pre-deployment check failed: ${error.message}`);
      this.log(`❌ Pre-deployment check failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Build application
  async buildApplication() {
    this.log('🏗️ Building application for staging...');
    
    try {
      // Clean previous build
      this.log('🧹 Cleaning previous build...');
      await this.executeCommand('rm -rf dist');
      
      // Build frontend
      this.log('📱 Building frontend...');
      await this.executeCommand(STAGING_CONFIG.deployment.buildCommand);
      
      // Verify build
      if (!fs.existsSync('./dist')) {
        throw new Error('Build failed - dist directory not created');
      }
      
      const distFiles = fs.readdirSync('./dist');
      if (distFiles.length === 0) {
        throw new Error('Build failed - dist directory is empty');
      }
      
      this.log('✅ Application build completed');
      
    } catch (error) {
      this.errors.push(`Build failed: ${error.message}`);
      this.log(`❌ Build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Deploy to staging
  async deployToStaging() {
    this.log('🚀 Deploying to staging environment...');
    
    try {
      // Deploy frontend
      this.log('📱 Deploying frontend to Vercel staging...');
      await this.executeCommand(STAGING_CONFIG.deployment.deployCommand);
      
      this.log('✅ Frontend deployed to staging');
      
      // Deploy backend (if applicable)
      if (process.env.DEPLOY_BACKEND === 'true') {
        this.log('🖥️ Deploying backend to staging...');
        await this.executeCommand('cd server && npm run deploy:staging');
        this.log('✅ Backend deployed to staging');
      }
      
    } catch (error) {
      this.errors.push(`Deployment failed: ${error.message}`);
      this.log(`❌ Deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Post-deployment verification
  async postDeploymentVerification() {
    this.log('🔍 Starting post-deployment verification...');
    
    try {
      // Wait for deployment to be ready
      this.log('⏳ Waiting for deployment to be ready...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      
      // Health check
      this.log('🏥️ Performing health check...');
      const healthCheck = await this.performHealthCheck();
      
      if (!healthCheck.healthy) {
        throw new Error(`Health check failed: ${healthCheck.error}`);
      }
      
      // Functionality tests
      this.log('🧪 Running functionality tests...');
      await this.runFunctionalityTests();
      
      // Performance tests
      this.log('📊 Running performance tests...');
      await this.runPerformanceTests();
      
      // Security tests
      this.log('🔒 Running security tests...');
      await this.runSecurityTests();
      
      this.log('✅ Post-deployment verification completed');
      
    } catch (error) {
      this.errors.push(`Post-deployment verification failed: ${error.message}`);
      this.log(`❌ Post-deployment verification failed: ${error.message}`, 'error');
      
      // Attempt rollback
      this.log('🔄 Attempting rollback due to verification failures...');
      await this.performRollback();
      
      throw error;
    }
  }

  // Health check
  async performHealthCheck() {
    try {
      const response = await fetch(STAGING_CONFIG.deployment.healthCheckUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Staging-Deployment-Checker/1.0'
        }
      });
      
      if (response.ok) {
        const healthData = await response.json();
        this.log(`✅ Health check passed: ${healthData.status}`);
        return { healthy: true, data: healthData };
      } else {
        return { 
          healthy: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message 
      };
    }
  }

  // Functionality tests
  async runFunctionalityTests() {
    const testCases = [
      {
        name: 'Homepage Load',
        url: 'https://staging.singglebee.com/',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'API Health Check',
        url: 'https://api-staging.singglebee.com/health',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'Product Listing',
        url: 'https://staging.singglebee.com/products',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'User Registration',
        url: 'https://api-staging.singglebee.com/api/v1/auth/register',
        method: 'POST',
        data: { email: 'test@staging.com', password: 'test123' },
        expectedStatus: [200, 400], // Either success or validation error
        timeout: 5000
      }
    ];
    
    for (const testCase of testCases) {
      try {
        this.log(`🧪 Testing: ${testCase.name}`);
        
        const response = await fetch(testCase.url, {
          method: testCase.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Staging-Functionality-Test/1.0'
          },
          body: testCase.data ? JSON.stringify(testCase.data) : undefined,
          timeout: testCase.timeout
        });
        
        const expectedStatuses = Array.isArray(testCase.expectedStatus) 
          ? testCase.expectedStatus 
          : [testCase.expectedStatus];
        
        if (expectedStatuses.includes(response.status)) {
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

  // Performance tests
  async runPerformanceTests() {
    const performanceTests = [
      {
        name: 'Homepage Load Time',
        url: 'https://staging.singglebee.com/',
        maxLoadTime: 3000 // 3 seconds
      },
      {
        name: 'API Response Time',
        url: 'https://api-staging.singglebee.com/api/v1/products',
        maxLoadTime: 1000 // 1 second
      }
    ];
    
    for (const test of performanceTests) {
      try {
        this.log(`📊 Testing: ${test.name}`);
        
        const startTime = Date.now();
        const response = await fetch(test.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Staging-Performance-Test/1.0'
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

  // Security tests
  async runSecurityTests() {
    const securityTests = [
      {
        name: 'HTTPS Enforcement',
        url: 'http://staging.singglebee.com/',
        expectRedirect: true,
        redirectTo: 'https://staging.singglebee.com/'
      },
      {
        name: 'Security Headers',
        url: 'https://staging.singglebee.com/',
        checkHeaders: [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection',
          'strict-transport-security'
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

  // Rollback deployment
  async performRollback() {
    this.log('🔄 Starting deployment rollback...');
    
    try {
      await this.executeCommand(STAGING_CONFIG.deployment.rollbackCommand);
      this.log('✅ Rollback completed');
      
      // Verify rollback
      await new Promise(resolve => setTimeout(resolve, 10000));
      const healthCheck = await this.performHealthCheck();
      
      if (healthCheck.healthy) {
        this.log('✅ Rollback verification passed');
      } else {
        this.log('⚠️ Rollback verification failed - manual intervention required');
      }
      
    } catch (error) {
      this.errors.push(`Rollback failed: ${error.message}`);
      this.log(`❌ Rollback failed: ${error.message}`, 'error');
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

  // Generate deployment report
  generateDeploymentReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      deployment: {
        environment: STAGING_CONFIG.environment,
        domain: STAGING_CONFIG.domain,
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
      urls: {
        frontend: `https://${STAGING_CONFIG.domain}`,
        api: `https://${STAGING_CONFIG.apiDomain}`,
        cdn: `https://${STAGING_CONFIG.cdnDomain}`
      }
    };
    
    // Save JSON report
    fs.writeFileSync('./staging-deployment-report.json', JSON.stringify(report, null, 2));
    
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
    <title>SINGGLEBEE Staging Deployment Report</title>
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
        <h1>🚀 Staging Deployment Report</h1>
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
    
    <h2>📱 Deployment URLs</h2>
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
    
    fs.writeFileSync('./staging-deployment-report.html', html);
  }

  // Main deployment process
  async deploy() {
    this.log('🚀 Starting SINGGLEBEE staging deployment...');
    
    try {
      await this.preDeploymentChecks();
      await this.buildApplication();
      await this.deployToStaging();
      await this.postDeploymentVerification();
      
      this.log('✅ Staging deployment completed successfully');
      
    } catch (error) {
      this.log(`❌ Staging deployment failed: ${error.message}`, 'error');
    }
    
    const report = this.generateDeploymentReport();
    
    if (report.summary.success) {
      console.log('\n🎉 Staging deployment completed successfully!');
      console.log(`📱 Frontend: ${report.urls.frontend}`);
      console.log(`🖥️ API: ${report.urls.api}`);
      console.log(`📄 Report: staging-deployment-report.html`);
    } else {
      console.log('\n❌ Staging deployment failed!');
      console.log(`📄 Report: staging-deployment-report.html`);
      console.log(`🔄 Rollback: ${this.errors.length > 0 ? 'Attempted' : 'Not required'}`);
    }
    
    return report;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('🚀 SINGGLEBEE Staging Deployment Tool');
    console.log('\nUsage: node deploy-staging.js <command>');
    console.log('\nCommands:');
    console.log('  deploy     - Deploy to staging environment');
    console.log('  verify     - Verify staging deployment');
    console.log('  rollback   - Rollback staging deployment');
    console.log('  health     - Check staging health');
    return;
  }
  
  const deployment = new StagingDeployment();
  
  try {
    switch (command) {
      case 'deploy':
        await deployment.deploy();
        break;
      case 'verify':
        await deployment.postDeploymentVerification();
        break;
      case 'rollback':
        await deployment.performRollback();
        break;
      case 'health':
        const health = await deployment.performHealthCheck();
        console.log(health);
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

export { StagingDeployment };
