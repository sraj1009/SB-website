#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Patterns that indicate secrets
const SECRET_PATTERNS = [
  /api[_-]?key[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /secret[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /password[_-]?=.*[a-zA-Z0-9]{8,}/i,
  /token[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /jwt[_-]?secret[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /cashfree[_-]?app[_-]?id[_-]?=.*[a-zA-Z0-9]{10,}/i,
  /cashfree[_-]?secret[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /gemini[_-]?api[_-]?key[_-]?=.*[a-zA-Z0-9]{20,}/i,
  /mongodb[_-]?uri[_-]?=.*mongodb[^\\s]+/i,
  /redis[_-]?url[_-]?=.*redis[^\\s]+/i,
  /[a-zA-Z0-9]{32,}=[a-zA-Z0-9]{32,}/,
  /sk_[a-zA-Z0-9]+_[a-f0-9]{32}/,
];

// Files to scan (excluding .gitignore patterns)
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.log$/,
  /coverage/,
  /\.env\.local$/,
  /\.env$/,
];

// Files that should contain secrets (but not real ones)
const ALLOWED_SECRET_FILES = [
  '.env.example',
  'SECURITY-PRODUCTION-SECRETS.md',
  'SECURITY-URGENT-ACTIONS.md',
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\\n');
    const findings = [];

    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach((pattern, patternIndex) => {
        const match = line.match(pattern);
        if (match) {
          // Check if this is in an allowed file
          const isAllowedFile = ALLOWED_SECRET_FILES.some(allowed => 
            filePath.includes(allowed)
          );
          
          // Check if it's just a template/example
          const isTemplate = line.includes('your_') || 
                           line.includes('example') || 
                           line.includes('placeholder') ||
                           line.includes('<') && line.includes('>');

          if (!isAllowedFile && !isTemplate) {
            findings.push({
              line: index + 1,
              pattern: patternIndex,
              match: match[0],
              content: line.trim()
            });
          }
        }
      });
    });

    return findings;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      // Skip excluded patterns
      if (EXCLUDED_PATTERNS.some(pattern => fullPath.match(pattern))) {
        continue;
      }
      
      if (stat.isDirectory()) {
        results.push(...scanDirectory(fullPath));
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.json') || item.endsWith('.md') || item.endsWith('.env') || item.endsWith('.yml') || item.endsWith('.yaml'))) {
        const findings = scanFile(fullPath);
        if (findings.length > 0) {
          results.push({
            file: fullPath,
            findings: findings
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return results;
}

function main() {
  console.log('🔍 Scanning for exposed secrets and API keys...\\n');
  
  const results = scanDirectory(rootDir);
  
  if (results.length === 0) {
    console.log('✅ No exposed secrets found!');
    process.exit(0);
  }
  
  console.log('🚨 CRITICAL: Exposed secrets detected!\\n');
  
  results.forEach(result => {
    console.log(`📁 File: ${result.file}`);
    result.findings.forEach(finding => {
      console.log(`   Line ${finding.line}: ${finding.content}`);
      console.log(`   Pattern: ${finding.match}`);
    });
    console.log('');
  });
  
  console.log('\\n🚨 IMMEDIATE ACTION REQUIRED:');
  console.log('1. Remove all exposed secrets from the code');
  console.log('2. Rotate all compromised API keys');
  console.log('3. Clean git history: git filter-repo --path .env --force');
  console.log('4. Update .gitignore to prevent future commits');
  
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
