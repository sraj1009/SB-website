#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budget configuration
const BUDGETS = {
  // JavaScript bundles (gzipped)
  'main.js': { max: 200 * 1024, description: 'Main application bundle' },
  'vendor.js': { max: 150 * 1024, description: 'Third-party dependencies' },
  'router.js': { max: 50 * 1024, description: 'React Router bundle' },
  'ui.js': { max: 75 * 1024, description: 'UI components bundle' },
  
  // CSS bundles (gzipped)
  'main.css': { max: 50 * 1024, description: 'Main styles' },
  
  // Individual assets
  'images/': { max: 100 * 1024, description: 'Individual images', perFile: true },
  'fonts/': { max: 250 * 1024, description: 'Font files', perFile: true },
  
  // Total budget
  'total': { max: 500 * 1024, description: 'Total bundle size' }
};

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content, { level: 9 });
    return gzipped.length;
  } catch (error) {
    console.error(colorize(`Error reading ${filePath}: ${error.message}`, 'red'));
    return 0;
  }
}

function analyzeBundleSize(distPath) {
  const results = [];
  let totalSize = 0;
  const buildDir = path.join(process.cwd(), distPath);

  if (!fs.existsSync(buildDir)) {
    console.error(colorize(`Build directory not found: ${buildDir}`, 'red'));
    process.exit(1);
  }

  // Analyze JavaScript files
  const jsFiles = fs.readdirSync(buildDir).filter(file => file.endsWith('.js'));
  for (const file of jsFiles) {
    const filePath = path.join(buildDir, file);
    const size = getGzippedSize(filePath);
    totalSize += size;
    
    const budget = BUDGETS[file.replace('.js', '.js')];
    const passed = budget ? size <= budget.max : true;
    
    results.push({
      file,
      size,
      budget: budget?.max || 'N/A',
      passed,
      description: budget?.description || 'Unknown file'
    });
  }

  // Analyze CSS files
  const cssFiles = fs.readdirSync(buildDir).filter(file => file.endsWith('.css'));
  for (const file of cssFiles) {
    const filePath = path.join(buildDir, file);
    const size = getGzippedSize(filePath);
    totalSize += size;
    
    const budget = BUDGETS[file.replace('.css', '.css')];
    const passed = budget ? size <= budget.max : true;
    
    results.push({
      file,
      size,
      budget: budget?.max || 'N/A',
      passed,
      description: budget?.description || 'Stylesheet'
    });
  }

  // Analyze assets directory
  const assetsDir = path.join(buildDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assetFiles = getAllFiles(assetsDir);
    
    for (const assetFile of assetFiles) {
      const relativePath = path.relative(assetsDir, assetFile);
      const category = relativePath.split('/')[0] + '/';
      const size = fs.statSync(assetFile).size;
      
      // Only count images and fonts towards budget
      if (category.match(/^(images|fonts)\//)) {
        const budget = BUDGETS[category];
        const passed = budget ? size <= budget.max : true;
        
        results.push({
          file: relativePath,
          size,
          budget: budget?.max || 'N/A',
          passed,
          description: budget?.description || 'Asset file'
        });
        
        if (!budget?.perFile) {
          totalSize += size;
        }
      }
    }
  }

  // Add total size result
  const totalBudget = BUDGETS.total;
  results.push({
    file: 'total',
    size: totalSize,
    budget: totalBudget?.max || 'N/A',
    passed: totalSize <= totalBudget?.max,
    description: totalBudget?.description || 'Total bundle size'
  });

  return results;
}

function getAllFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function displayResults(results) {
  console.log(colorize('\n📊 Bundle Size Analysis', 'blue'));
  console.log('─'.repeat(80));
  
  // Sort by size (largest first)
  results.sort((a, b) => b.size - a.size);
  
  let anyFailed = false;
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const statusColor = result.passed ? 'green' : 'red';
    const sizeStr = formatBytes(result.size);
    const budgetStr = result.budget !== 'N/A' ? formatBytes(result.budget) : 'N/A';
    
    console.log(`${status} ${result.file.padEnd(20)} ${sizeStr.padEnd(10)} ${budgetStr.padEnd(10)} ${result.description}`);
    
    if (!result.passed) {
      anyFailed = true;
      const overage = result.size - result.budget;
      console.log(colorize(`   ⚠️  Over budget by ${formatBytes(overage)}`, 'yellow'));
    }
  }
  
  console.log('─'.repeat(80));
  
  if (anyFailed) {
    console.log(colorize('\n❌ Bundle size budget FAILED!', 'red'));
    console.log(colorize('Please optimize bundles before merging.', 'red'));
  } else {
    console.log(colorize('\n✅ Bundle size budget PASSED!', 'green'));
  }
  
  return anyFailed;
}

function saveResults(results) {
  const resultsPath = path.join(process.cwd(), 'bundle-size-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(colorize(`\n📄 Results saved to: ${resultsPath}`, 'blue'));
}

function main() {
  const distPath = process.argv[2] || 'dist';
  
  console.log(colorize('🔍 Analyzing bundle sizes...', 'blue'));
  
  try {
    const results = analyzeBundleSize(distPath);
    const anyFailed = displayResults(results);
    saveResults(results);
    
    // Exit with error code if any budget failed
    if (anyFailed) {
      process.exit(1);
    }
  } catch (error) {
    console.error(colorize(`Error during analysis: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Run the analysis
main();
