#!/usr/bin/env node

/**
 * MongoDB Atlas Security Setup Helper
 * 
 * This script helps verify your Atlas security configuration
 * Run this script after setting up your Atlas cluster
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

const SECURITY_CHECKS = {
  // Connection security checks
  async checkConnectionSecurity(uri) {
    console.log('\n🔒 Checking Connection Security...');
    
    const checks = {
      hasSSL: uri.includes('ssl=true') || uri.includes('mongodb+srv://'),
      hasRetryWrites: uri.includes('retryWrites=true'),
      hasWriteConcern: uri.includes('w=majority'),
      hasAuthSource: uri.includes('authSource=admin'),
      notUsingAdminUser: !uri.includes('admin:') && !uri.includes('root:'),
      isNotLocalhost: !uri.includes('localhost') && !uri.includes('127.0.0.1')
    };

    console.log('Connection Security Results:');
    Object.entries(checks).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const description = this.getCheckDescription(check);
      console.log(`  ${status} ${description}`);
    });

    return Object.values(checks).every(Boolean);
  },

  getCheckDescription(check) {
    const descriptions = {
      hasSSL: 'SSL/TLS encryption enabled',
      hasRetryWrites: 'Retryable writes enabled',
      hasWriteConcern: 'Write concern set to majority',
      hasAuthSource: 'Authentication source specified',
      notUsingAdminUser: 'Not using admin/root user',
      isNotLocalhost: 'Not connecting to localhost'
    };
    return descriptions[check] || check;
  },

  // Test database connection
  async testConnection(uri) {
    console.log('\n🔗 Testing Database Connection...');
    
    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });

      await client.connect();
      const db = client.db();
      
      // Test basic operations
      await db.admin().ping();
      
      // Test authentication
      const authResult = await db.admin().command({ connectionStatus: 1 });
      
      console.log('✅ Connection successful');
      console.log(`✅ Authentication successful`);
      console.log(`✅ Server: ${authResult.authInfo.authenticatedUser}`);
      
      await client.close();
      return true;
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      return false;
    }
  },

  // Check environment file security
  checkEnvironmentSecurity() {
    console.log('\n🛡️  Checking Environment Security...');
    
    const envFiles = ['.env', '.env.production', '.env.staging'];
    const results = [];

    envFiles.forEach(file => {
      try {
        const filePath = resolve(process.cwd(), 'server', file);
        const content = readFileSync(filePath, 'utf8');
        
        const checks = {
          hasMongoURI: content.includes('MONGODB_URI='),
          notCommittedPassword: !content.includes('singglebee-prod:PASSWORD'),
          hasStrongJWT: content.includes('JWT_') && content.length > 30,
          notUsingDefaultAdmin: !content.includes('admin@singglebee.com') || file === '.env'
        };

        const passed = Object.values(checks).every(Boolean);
        results.push({ file, passed, checks });
        
        console.log(`\n📄 ${file}:`);
        Object.entries(checks).forEach(([check, passed]) => {
          const status = passed ? '✅' : '❌';
          console.log(`  ${status} ${this.getEnvCheckDescription(check)}`);
        });
        
      } catch (error) {
        console.log(`⚠️  Could not read ${file}: ${error.message}`);
      }
    });

    return results;
  },

  getEnvCheckDescription(check) {
    const descriptions = {
      hasMongoURI: 'MongoDB URI configured',
      notCommittedPassword: 'Default password replaced',
      hasStrongJWT: 'JWT secrets configured',
      notUsingDefaultAdmin: 'Not using default admin credentials'
    };
    return descriptions[check] || check;
  },

  // Generate secure password
  generateSecurePassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  },

  // Main security audit
  async runSecurityAudit() {
    console.log('🚀 MongoDB Atlas Security Audit');
    console.log('=====================================');

    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.log('❌ MONGODB_URI not found in environment variables');
      return false;
    }

    const results = {
      connectionSecurity: await this.checkConnectionSecurity(mongoURI),
      connectionTest: await this.testConnection(mongoURI),
      environmentSecurity: this.checkEnvironmentSecurity()
    };

    console.log('\n📊 Security Audit Summary');
    console.log('==========================');
    
    const overallScore = [
      results.connectionSecurity,
      results.connectionTest,
      results.environmentSecurity.every(r => r.passed)
    ].filter(Boolean).length;

    console.log(`Overall Security Score: ${overallScore}/3`);
    
    if (overallScore === 3) {
      console.log('🎉 Excellent! Your Atlas configuration is secure.');
    } else if (overallScore >= 2) {
      console.log('⚠️  Good, but some improvements needed.');
    } else {
      console.log('🚨 Security issues detected. Please review and fix.');
    }

    return overallScore === 3;
  }
};

// CLI interface
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'audit':
      await SECURITY_CHECKS.runSecurityAudit();
      break;
      
    case 'test':
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        console.error('❌ MONGODB_URI not found');
        process.exit(1);
      }
      await SECURITY_CHECKS.testConnection(uri);
      break;
      
    case 'generate-password':
      const password = SECURITY_CHECKS.generateSecurePassword();
      console.log(`🔐 Generated secure password: ${password}`);
      console.log('⚠️  Store this password securely and update your Atlas user immediately.');
      break;
      
    default:
      console.log('MongoDB Atlas Security Helper');
      console.log('Usage:');
      console.log('  node setup-atlas-security.js audit     - Run full security audit');
      console.log('  node setup-atlas-security.js test      - Test database connection');
      console.log('  node setup-atlas-security.js generate-password - Generate secure password');
      process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SECURITY_CHECKS;
