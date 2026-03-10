#!/usr/bin/env node

const crypto = require('crypto');

// Generate cryptographically secure secrets
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generating Secure Secrets for SINGGLEBEE\n');

// Generate JWT secrets
const jwtAccessSecret = generateSecureSecret();
const jwtRefreshSecret = generateSecureSecret();

// Generate other secrets
const sessionSecret = generateSecureSecret(32);
const encryptionKey = generateSecureSecret(32);

console.log('🚨 COPY THESE SECRETS TO YOUR PRODUCTION ENVIRONMENT 🚨\n');
console.log('=====================================');
console.log('JWT Configuration:');
console.log(`JWT_ACCESS_SECRET=${jwtAccessSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log(`JWT_ACCESS_EXPIRES_IN=15m`);
console.log(`JWT_REFRESH_EXPIRES_IN=7d`);
console.log('\nSession Configuration:');
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('\nEncryption Configuration:');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('=====================================\n');

console.log('📋 Instructions:');
console.log('1. Copy these secrets to your production environment variables');
console.log('2. NEVER commit these secrets to git');
console.log('3. Store them securely (AWS Secrets Manager, Vercel Env, etc.)');
console.log('4. Rotate these secrets periodically (every 90 days)');
console.log('5. Delete this file after use\n');

console.log('⚠️  SECURITY WARNING:');
console.log('- These secrets are now in your terminal history');
console.log('- Clear your terminal history after storing these securely');
console.log('- Use environment-specific secrets (dev vs prod)');

// Save to .env.local for development (gitignored)
const fs = require('fs');
const envContent = `
# Development Environment Variables
# DO NOT COMMIT TO GIT - Already in .gitignore

# JWT Secrets
JWT_ACCESS_SECRET=${jwtAccessSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=${sessionSecret}

# Encryption Key
ENCRYPTION_KEY=${encryptionKey}

# Development URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Database (Development)
MONGODB_URI=mongodb://localhost:27017/singglebee_dev
REDIS_URL=redis://localhost:6379

# Development Flags
NODE_ENV=development
DEBUG=singglebee:*
`;

try {
  fs.writeFileSync('.env.local', envContent.trim());
  console.log('✅ Development secrets saved to .env.local');
  console.log('⚠️  This file is gitignored and safe for development use');
} catch (error) {
  console.log('❌ Could not save .env.local file');
}

console.log('\n🎉 Secure secrets generated successfully!');
