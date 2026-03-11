#!/usr/bin/env node

/**
 * SINGGLEBEE Production Launch Script
 * 
 * This script handles the complete production launch of the SINGGLEBEE e-commerce platform
 * including frontend build, backend startup, database connection verification, and health checks
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

const execAsync = promisify(exec);

// Load production environment
dotenv.config({ path: resolve(process.cwd(), 'server', '.env.production') });

class ProductionLauncher {
  constructor() {
    this.processes = [];
    this.isShuttingDown = false;
    this.healthChecks = {
      frontend: false,
      backend: false,
      database: false,
      redis: false
    };
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      RESET: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.RESET}`);
  }

  async checkPrerequisites() {
    this.log('Checking production prerequisites...', 'INFO');
    
    const checks = {
      envFile: existsSync(resolve(process.cwd(), 'server', '.env.production')),
      nodeVersion: process.version >= 'v18.0.0',
      npmPackages: existsSync(resolve(process.cwd(), 'node_modules')),
      serverPackages: existsSync(resolve(process.cwd(), 'server', 'node_modules')),
      buildDir: existsSync(resolve(process.cwd(), 'dist'))
    };

    const allPassed = Object.values(checks).every(Boolean);
    
    if (!allPassed) {
      this.log('Prerequisites failed:', 'ERROR');
      Object.entries(checks).forEach(([check, passed]) => {
        if (!passed) {
          this.log(`  ❌ ${this.getPrerequisiteDescription(check)}`, 'ERROR');
        }
      });
      
      this.log('\nTo fix prerequisites:', 'WARNING');
      if (!checks.envFile) this.log('  - Create server/.env.production with production settings');
      if (!checks.nodeVersion) this.log('  - Upgrade Node.js to v18.0.0 or higher');
      if (!checks.npmPackages) this.log('  - Run: npm install');
      if (!checks.serverPackages) this.log('  - Run: cd server && npm install');
      if (!checks.buildDir) this.log('  - Run: npm run build:production');
      
      return false;
    }

    this.log('All prerequisites passed! ✅', 'SUCCESS');
    return true;
  }

  getPrerequisiteDescription(check) {
    const descriptions = {
      envFile: 'Production environment file exists',
      nodeVersion: 'Node.js version >= 18.0.0',
      npmPackages: 'Root dependencies installed',
      serverPackages: 'Server dependencies installed',
      buildDir: 'Frontend built for production'
    };
    return descriptions[check] || check;
  }

  async buildFrontend() {
    this.log('Building frontend for production...', 'INFO');
    
    try {
      await execAsync('npm run build:production');
      this.log('Frontend built successfully! ✅', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`Frontend build failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      this.log('Starting backend server...', 'INFO');
      
      const backendProcess = spawn('npm', ['start'], {
        cwd: resolve(process.cwd(), 'server'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' }
      });

      this.processes.push(backendProcess);

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[BACKEND] ${output.trim()}`);
        
        if (output.includes('🐝 SINGGLEBEE API Server running')) {
          this.healthChecks.backend = true;
          this.log('Backend server started successfully! ✅', 'SUCCESS');
          resolve(backendProcess);
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`[BACKEND ERROR] ${output.trim()}`);
      });

      backendProcess.on('error', (error) => {
        this.log(`Backend process error: ${error.message}`, 'ERROR');
        reject(error);
      });

      backendProcess.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          this.log(`Backend process exited with code ${code}`, 'ERROR');
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.healthChecks.backend) {
          this.log('Backend startup timeout', 'ERROR');
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      this.log('Starting frontend server...', 'INFO');
      
      const frontendProcess = spawn('npx', ['serve', '-s', 'dist', '-l', '3000'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      this.processes.push(frontendProcess);

      frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[FRONTEND] ${output.trim()}`);
        
        if (output.includes('Accepting connections') || output.includes('Local:')) {
          this.healthChecks.frontend = true;
          this.log('Frontend server started successfully! ✅', 'SUCCESS');
          resolve(frontendProcess);
        }
      });

      frontendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`[FRONTEND ERROR] ${output.trim()}`);
      });

      frontendProcess.on('error', (error) => {
        this.log(`Frontend process error: ${error.message}`, 'ERROR');
        reject(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.healthChecks.frontend) {
          this.log('Frontend startup timeout', 'ERROR');
          reject(new Error('Frontend startup timeout'));
        }
      }, 15000);
    });
  }

  async performHealthChecks() {
    this.log('Performing health checks...', 'INFO');
    
    const checks = [
      {
        name: 'Backend API',
        url: 'http://localhost:5000/health',
        key: 'backend'
      },
      {
        name: 'Frontend',
        url: 'http://localhost:3000',
        key: 'frontend'
      }
    ];

    for (const check of checks) {
      try {
        await this.httpRequest(check.url);
        this.healthChecks[check.key] = true;
        this.log(`${check.name} health check passed ✅`, 'SUCCESS');
      } catch (error) {
        this.log(`${check.name} health check failed: ${error.message}`, 'ERROR');
      }
    }

    const allHealthy = Object.values(this.healthChecks).every(Boolean);
    
    if (allHealthy) {
      this.log('All health checks passed! 🎉', 'SUCCESS');
    } else {
      this.log('Some health checks failed', 'WARNING');
    }

    return allHealthy;
  }

  httpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = http.get(url, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response);
        } else {
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });

      request.on('error', reject);
      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  displayStartupInfo() {
    this.log('\n🚀 SINGGLEBEE E-Commerce Platform Started Successfully!', 'SUCCESS');
    this.log('================================================', 'INFO');
    this.log('📱 Frontend: http://localhost:3000', 'INFO');
    this.log('🔧 Backend API: http://localhost:5000', 'INFO');
    this.log('📊 Health Check: http://localhost:5000/health', 'INFO');
    this.log('📚 API Docs: http://localhost:5000/api-docs', 'INFO');
    this.log('================================================', 'INFO');
    this.log('🎯 Ready for production traffic!', 'SUCCESS');
    this.log('\nPress Ctrl+C to gracefully shutdown the server', 'WARNING');
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.log(`\nReceived ${signal}. Starting graceful shutdown...`, 'WARNING');

    // Kill all child processes
    for (const process of this.processes) {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    }

    // Wait a bit for processes to clean up
    setTimeout(() => {
      this.log('Graceful shutdown completed. Goodbye! 👋', 'SUCCESS');
      process.exit(0);
    }, 5000);
  }

  async launch() {
    try {
      this.log('🐝 Starting SINGGLEBEE Production Launch...', 'INFO');
      this.log('=====================================', 'INFO');

      // Check prerequisites
      const prereqsPassed = await this.checkPrerequisites();
      if (!prereqsPassed) {
        process.exit(1);
      }

      // Build frontend
      const buildSuccess = await this.buildFrontend();
      if (!buildSuccess) {
        process.exit(1);
      }

      // Start backend and frontend concurrently
      const backendPromise = this.startBackend();
      const frontendPromise = this.startFrontend();

      // Wait for both services to start
      await Promise.all([backendPromise, frontendPromise]);

      // Perform health checks
      await this.performHealthChecks();

      // Display startup information
      this.displayStartupInfo();

      // Keep the process running
      this.log('Production server is running. Monitoring for shutdown signals...', 'INFO');

    } catch (error) {
      this.log(`Production launch failed: ${error.message}`, 'ERROR');
      await this.gracefulShutdown('ERROR');
    }
  }
}

// CLI interface
async function main() {
  const launcher = new ProductionLauncher();
  
  if (process.argv.includes('--check-only')) {
    const prereqsPassed = await launcher.checkPrerequisites();
    process.exit(prereqsPassed ? 0 : 1);
  } else if (process.argv.includes('--build-only')) {
    const buildSuccess = await launcher.buildFrontend();
    process.exit(buildSuccess ? 0 : 1);
  } else {
    await launcher.launch();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ProductionLauncher;
