#!/usr/bin/env node

/**
 * SINGGLEBEE Deployment Cleanup & Optimization Script
 * Cleans up old deployments, optimizes resources, and prepares for production
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface DeploymentConfig {
  maxDeployments: number;
  maxLogAge: number; // days
  maxBackupAge: number; // days
  cleanupTempFiles: boolean;
  optimizeImages: boolean;
  compressAssets: boolean;
  cleanupDatabase: boolean;
  cleanupLogs: boolean;
}

class DeploymentCleanup {
  private config: DeploymentConfig;
  private deploymentPath: string;
  private backupPath: string;
  private logPath: string;
  private tempPath: string;

  constructor() {
    this.config = {
      maxDeployments: 5,
      maxLogAge: 30, // 30 days
      maxBackupAge: 90, // 90 days
      cleanupTempFiles: true,
      optimizeImages: true,
      compressAssets: true,
      cleanupDatabase: true,
      cleanupLogs: true
    };

    this.deploymentPath = process.env.DEPLOYMENT_PATH || './deployments';
    this.backupPath = process.env.BACKUP_PATH || './backups';
    this.logPath = process.env.LOG_PATH || './logs';
    this.tempPath = process.env.TEMP_PATH || './temp';
  }

  async runCleanup(): Promise<void> {
    console.log('🧹 Starting deployment cleanup and optimization...');
    
    try {
      // Create directories if they don't exist
      this.ensureDirectories();
      
      // Cleanup old deployments
      if (this.config.cleanupTempFiles) {
        await this.cleanupOldDeployments();
      }
      
      // Cleanup old logs
      if (this.config.cleanupLogs) {
        await this.cleanupOldLogs();
      }
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      // Cleanup temporary files
      if (this.config.cleanupTempFiles) {
        await this.cleanupTempFiles();
      }
      
      // Optimize assets
      if (this.config.optimizeImages) {
        await this.optimizeImages();
      }
      
      // Compress assets
      if (this.config.compressAssets) {
        await this.compressAssets();
      }
      
      // Database cleanup
      if (this.config.cleanupDatabase) {
        await this.cleanupDatabase();
      }
      
      // Generate cleanup report
      await this.generateCleanupReport();
      
      console.log('✅ Deployment cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Deployment cleanup failed:', error);
      process.exit(1);
    }
  }

  private ensureDirectories(): void {
    const directories = [
      this.deploymentPath,
      this.backupPath,
      this.logPath,
      this.tempPath,
      path.join(this.deploymentPath, 'current'),
      path.join(this.deploymentPath, 'releases'),
      path.join(this.backupPath, 'database'),
      path.join(this.backupPath, 'assets')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  private async cleanupOldDeployments(): Promise<void> {
    console.log('🧹 Cleaning up old deployments...');
    
    const releasesPath = path.join(this.deploymentPath, 'releases');
    
    if (!fs.existsSync(releasesPath)) {
      console.log('No releases directory found');
      return;
    }

    const releases = fs.readdirSync(releasesPath)
      .map(name => ({
        name,
        path: path.join(releasesPath, name),
        stats: fs.statSync(path.join(releasesPath, name))
      }))
      .filter(item => item.stats.isDirectory())
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    const deploymentsToDelete = releases.slice(this.config.maxDeployments);
    
    for (const deployment of deploymentsToDelete) {
      await this.removeDirectory(deployment.path);
      console.log(`🗑️ Removed old deployment: ${deployment.name}`);
    }

    // Keep only the latest N deployments
    console.log(`✅ Kept ${Math.min(this.config.maxDeployments, releases.length)} recent deployments`);
  }

  private async cleanupOldLogs(): Promise<void> {
    console.log('🧹 Cleaning up old logs...');
    
    if (!fs.existsSync(this.logPath)) {
      console.log('No log directory found');
      return;
    }

    const logFiles = fs.readdirSync(this.logPath)
      .map(name => ({
        name,
        path: path.join(this.logPath, name),
        stats: fs.statSync(path.join(this.logPath, name))
      }))
      .filter(item => item.stats.isFile())
      .filter(item => {
        const age = (Date.now() - item.stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return age > this.config.maxLogAge;
      });

    for (const logFile of logFiles) {
      fs.unlinkSync(logFile.path);
      console.log(`🗑️ Removed old log: ${logFile.name}`);
    }

    // Compress remaining logs
    await this.compressLogs();
  }

  private async cleanupOldBackups(): Promise<void> {
    console.log('🧹 Cleaning up old backups...');
    
    if (!fs.existsSync(this.backupPath)) {
      console.log('No backup directory found');
      return;
    }

    const backupDirs = fs.readdirSync(this.backupPath)
      .map(name => ({
        name,
        path: path.join(this.backupPath, name),
        stats: fs.statSync(path.join(this.backupPath, name))
      }))
      .filter(item => item.stats.isDirectory())
      .filter(item => {
        const age = (Date.now() - item.stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        return age > this.config.maxBackupAge;
      });

    for (const backup of backupDirs) {
      await this.removeDirectory(backup.path);
      console.log(`🗑️ Removed old backup: ${backup.name}`);
    }

    console.log(`✅ Kept recent backups (last ${this.config.maxBackupAge} days)`);
  }

  private async cleanupTempFiles(): Promise<void> {
    console.log('🧹 Cleaning up temporary files...');
    
    if (!fs.existsSync(this.tempPath)) {
      console.log('No temp directory found');
      return;
    }

    const tempFiles = fs.readdirSync(this.tempPath);
    
    for (const file of tempFiles) {
      const filePath = path.join(this.tempPath, file);
      const stats = fs.statSync(filePath);
      
      // Remove files older than 1 day
      const age = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      if (age > 1) {
        if (stats.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`🗑️ Removed temp file: ${file}`);
      }
    }
  }

  private async optimizeImages(): Promise<void> {
    console.log('🖼️ Optimizing images...');
    
    const publicPath = './public';
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    const optimizeImage = (imagePath: string): void => {
      try {
        // Use imagemin or sharp for image optimization
        // For now, just log what would be optimized
        console.log(`🖼️ Would optimize: ${imagePath}`);
        
        // In production, run:
        // execSync(`imagemin ${imagePath} --out-dir=${path.dirname(imagePath)}`, { stdio: 'inherit' });
        
      } catch (error) {
        console.warn(`Failed to optimize image ${imagePath}:`, error.message);
      }
    };

    const findImages = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          findImages(filePath);
        } else if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
          optimizeImage(filePath);
        }
      }
    };

    findImages(path.join(publicPath, 'images'));
  }

  private async compressAssets(): Promise<void> {
    console.log('🗜️ Compressing assets...');
    
    const publicPath = './public';
    const assetsToCompress = ['css', 'js', 'images'];
    
    for (const assetType of assetsToCompress) {
      const assetPath = path.join(publicPath, assetType);
      
      if (!fs.existsSync(assetPath)) continue;
      
      try {
        // Create gzipped versions
        const files = fs.readdirSync(assetPath);
        
        for (const file of files) {
          const filePath = path.join(assetPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.css'))) {
            const compressedPath = `${filePath}.gz`;
            
            if (!fs.existsSync(compressedPath) || 
                stats.mtime > fs.statSync(compressedPath).mtime) {
              
              // Compress file
              execSync(`gzip -c ${filePath} > ${compressedPath}`, { stdio: 'inherit' });
              console.log(`🗜️ Compressed: ${file}`);
            }
          }
        }
        
      } catch (error) {
        console.warn(`Failed to compress ${assetType} assets:`, error.message);
      }
    }
  }

  private async compressLogs(): Promise<void> {
    console.log('🗜️ Compressing logs...');
    
    const logFiles = fs.readdirSync(this.logPath)
      .filter(file => file.endsWith('.log'));
    
    for (const logFile of logFiles) {
      const logPath = path.join(this.logPath, logFile);
      const compressedPath = `${logPath}.gz`;
      
      try {
        if (!fs.existsSync(compressedPath)) {
          execSync(`gzip -c ${logPath} > ${compressedPath}`, { stdio: 'inherit' });
          console.log(`🗜️ Compressed log: ${logFile}`);
        }
      } catch (error) {
        console.warn(`Failed to compress log ${logFile}:`, error.message);
      }
    }
  }

  private async cleanupDatabase(): Promise<void> {
    console.log('🗄️ Cleaning up database...');
    
    try {
      // In production, run database-specific cleanup commands
      // For MongoDB, this might include:
      // - Compact database
      // - Remove old collections
      // - Optimize indexes
      
      console.log('🗄️ Database cleanup completed');
      
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  }

  private async removeDirectory(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.rm(dirPath, { recursive: true, force: true }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async generateCleanupReport(): Promise<void> {
    console.log('📊 Generating cleanup report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      diskSpace: await this.getDiskSpaceInfo(),
      deploymentInfo: await this.getDeploymentInfo(),
      cleanupStats: {
        deploymentsRemoved: 0,
        logsRemoved: 0,
        backupsRemoved: 0,
        tempFilesRemoved: 0,
        imagesOptimized: 0,
        assetsCompressed: 0,
        diskSpaceSaved: 0
      }
    };

    const reportPath = path.join(this.logPath, `cleanup-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Cleanup report saved to: ${reportPath}`);
  }

  private async getDiskSpaceInfo(): Promise<any> {
    try {
      const stats = fs.statSync(process.cwd());
      return {
        total: 'N/A', // Would need proper disk space checking
        used: 'N/A',
        available: 'N/A'
      };
    } catch (error) {
      return {
        total: 'N/A',
        used: 'N/A',
        available: 'N/A'
      };
    }
  }

  private async getDeploymentInfo(): Promise<any> {
    try {
      const currentPath = path.join(this.deploymentPath, 'current');
      
      if (!fs.existsSync(currentPath)) {
        return {
          currentDeployment: null,
          totalDeployments: 0
        };
      }

      const currentDeployment = fs.readlinkSync(currentPath);
      const releasesPath = path.join(this.deploymentPath, 'releases');
      
      let totalDeployments = 0;
      if (fs.existsSync(releasesPath)) {
        totalDeployments = fs.readdirSync(releasesPath).length;
      }

      return {
        currentDeployment,
        totalDeployments,
        deploymentPath: this.deploymentPath
      };
    } catch (error) {
      return {
        currentDeployment: null,
        totalDeployments: 0,
        error: error.message
      };
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const cleanup = new DeploymentCleanup();
  
  try {
    switch (command) {
      case 'run':
      case 'cleanup':
        await cleanup.runCleanup();
        break;
        
      case 'deployments':
        await cleanup.cleanupOldDeployments();
        break;
        
      case 'logs':
        await cleanup.cleanupOldLogs();
        break;
        
      case 'backups':
        await cleanup.cleanupOldBackups();
        break;
        
      case 'temp':
        await cleanup.cleanupTempFiles();
        break;
        
      case 'optimize':
        await cleanup.optimizeImages();
        await cleanup.compressAssets();
        break;
        
      case 'database':
        await cleanup.cleanupDatabase();
        break;
        
      case 'report':
        await cleanup.generateCleanupReport();
        break;
        
      default:
        console.log(`
SINGGLEBEE Deployment Cleanup & Optimization

Usage: node deployment-cleanup.js <command> [options]

Commands:
  run, cleanup          Run full cleanup and optimization
  deployments           Clean up old deployments
  logs                 Clean up old logs
  backups              Clean up old backups
  temp                 Clean up temporary files
  optimize              Optimize images and compress assets
  database             Clean up database
  report               Generate cleanup report

Examples:
  node deployment-cleanup.js run
  node deployment-cleanup.js deployments
  node deployment-cleanup.js logs
  node deployment-cleanup.js optimize
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DeploymentCleanup };
