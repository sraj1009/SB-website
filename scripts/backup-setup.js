#!/usr/bin/env node

// 🗄️ Database Backup Configuration for SINGGLEBEE

import fs from 'fs';
import { exec } from 'child_process';
import cron from 'node-cron';

const BACKUP_CONFIG = {
  // MongoDB Configuration
  mongodb: {
    host: process.env.MONGODB_URI || 'mongodb://localhost:27017/singglebee',
    backupDir: './backups/mongodb',
    retentionDays: 30,
    compression: true,
    schedule: '0 2 * * *' // Daily at 2 AM
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_URL || 'redis://localhost:6379',
    backupDir: './backups/redis',
    retentionDays: 7,
    schedule: '0 3 * * *' // Daily at 3 AM
  },
  
  // File Backup Configuration
  files: {
    sourceDirs: [
      './server/uploads',
      './logs',
      './config'
    ],
    backupDir: './backups/files',
    retentionDays: 14,
    schedule: '0 4 * * *' // Daily at 4 AM
  }
};

// Create backup directories
function createBackupDirectories() {
  Object.values(BACKUP_CONFIG).forEach(config => {
    if (config.backupDir) {
      if (!fs.existsSync(config.backupDir)) {
        fs.mkdirSync(config.backupDir, { recursive: true });
        console.log(`✅ Created backup directory: ${config.backupDir}`);
      }
    }
  });
}

// MongoDB Backup Function
async function backupMongoDB() {
  const { mongodb, backupDir, retentionDays, compression } = BACKUP_CONFIG.mongodb;
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = `${backupDir}/singglebee_mongodb_${timestamp}.gz`;
  
  try {
    console.log('🔄 Starting MongoDB backup...');
    
    // Create backup command
    let command = `mongodump --uri="${mongodb}" --gzip --out=${backupDir.replace('.gz', '')}`;
    if (compression) {
      command += ' --gzip';
    }
    
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ MongoDB backup failed:', error);
          reject(error);
        } else {
          console.log('✅ MongoDB backup completed:', backupFile);
          resolve(backupFile);
        }
      });
    });
    
    // Clean old backups
    await cleanOldBackups(backupDir, retentionDays);
    
  } catch (error) {
    console.error('❌ MongoDB backup error:', error);
    throw error;
  }
}

// Redis Backup Function
async function backupRedis() {
  const { redis, backupDir, retentionDays } = BACKUP_CONFIG.redis;
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = `${backupDir}/singglebee_redis_${timestamp}.rdb`;
  
  try {
    console.log('🔄 Starting Redis backup...');
    
    const command = `redis-cli --rdb ${backupFile}`;
    
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Redis backup failed:', error);
          reject(error);
        } else {
          console.log('✅ Redis backup completed:', backupFile);
          resolve(backupFile);
        }
      });
    });
    
    // Clean old backups
    await cleanOldBackups(backupDir, retentionDays);
    
  } catch (error) {
    console.error('❌ Redis backup error:', error);
    throw error;
  }
}

// File Backup Function
async function backupFiles() {
  const { sourceDirs, backupDir, retentionDays } = BACKUP_CONFIG.files;
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const backupFile = `${backupDir}/singglebee_files_${timestamp}.tar.gz`;
  
  try {
    console.log('🔄 Starting file backup...');
    
    // Create tar command
    const sourceList = sourceDirs.join(' ');
    const command = `tar -czf ${backupFile} ${sourceList}`;
    
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ File backup failed:', error);
          reject(error);
        } else {
          console.log('✅ File backup completed:', backupFile);
          resolve(backupFile);
        }
      });
    });
    
    // Clean old backups
    await cleanOldBackups(backupDir, retentionDays);
    
  } catch (error) {
    console.error('❌ File backup error:', error);
    throw error;
  }
}

// Clean Old Backups
async function cleanOldBackups(backupDir, retentionDays) {
  try {
    const files = fs.readdirSync(backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const file of files) {
      const filePath = `${backupDir}/${file}`;
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning old backups:', error);
  }
}

// Backup Verification
async function verifyBackup(backupFile) {
  try {
    const stats = fs.statSync(backupFile);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      throw new Error('Backup file is empty');
    }
    
    console.log(`✅ Backup verified: ${backupFile} (${fileSize} bytes)`);
    return true;
  } catch (error) {
    console.error('❌ Backup verification failed:', error);
    return false;
  }
}

// Backup Health Check
async function backupHealthCheck() {
  const healthReport = {
    timestamp: new Date().toISOString(),
    mongodb: { status: 'unknown', lastBackup: null, size: null },
    redis: { status: 'unknown', lastBackup: null, size: null },
    files: { status: 'unknown', lastBackup: null, size: null }
  };
  
  try {
    // Check MongoDB backups
    const mongoBackupDir = BACKUP_CONFIG.mongodb.backupDir;
    if (fs.existsSync(mongoBackupDir)) {
      const mongoFiles = fs.readdirSync(mongoBackupDir)
        .filter(file => file.endsWith('.gz'))
        .sort()
        .reverse();
      
      if (mongoFiles.length > 0) {
        const lastMongoBackup = mongoFiles[0];
        const mongoStats = fs.statSync(`${mongoBackupDir}/${lastMongoBackup}`);
        healthReport.mongodb = {
          status: 'healthy',
          lastBackup: lastMongoBackup,
          size: mongoStats.size
        };
      }
    }
    
    // Check Redis backups
    const redisBackupDir = BACKUP_CONFIG.redis.backupDir;
    if (fs.existsSync(redisBackupDir)) {
      const redisFiles = fs.readdirSync(redisBackupDir)
        .filter(file => file.endsWith('.rdb'))
        .sort()
        .reverse();
      
      if (redisFiles.length > 0) {
        const lastRedisBackup = redisFiles[0];
        const redisStats = fs.statSync(`${redisBackupDir}/${lastRedisBackup}`);
        healthReport.redis = {
          status: 'healthy',
          lastBackup: lastRedisBackup,
          size: redisStats.size
        };
      }
    }
    
    // Check file backups
    const filesBackupDir = BACKUP_CONFIG.files.backupDir;
    if (fs.existsSync(filesBackupDir)) {
      const fileBackups = fs.readdirSync(filesBackupDir)
        .filter(file => file.endsWith('.tar.gz'))
        .sort()
        .reverse();
      
      if (fileBackups.length > 0) {
        const lastFileBackup = fileBackups[0];
        const fileStats = fs.statSync(`${filesBackupDir}/${lastFileBackup}`);
        healthReport.files = {
          status: 'healthy',
          lastBackup: lastFileBackup,
          size: fileStats.size
        };
      }
    }
    
    // Save health report
    fs.writeFileSync('./backups/health-report.json', JSON.stringify(healthReport, null, 2));
    console.log('📊 Backup health report saved');
    
  } catch (error) {
    console.error('❌ Backup health check failed:', error);
  }
  
  return healthReport;
}

// Restore Function
async function restoreFromBackup(backupType, backupFile) {
  try {
    console.log(`🔄 Starting restore from ${backupType} backup: ${backupFile}`);
    
    let command;
    switch (backupType) {
      case 'mongodb':
        command = `mongorestore --uri="${BACKUP_CONFIG.mongodb.host}" --gzip --drop ${backupFile}`;
        break;
      case 'redis':
        command = `redis-cli --rdb ${backupFile} --pipe | redis-cli --pipe`;
        break;
      case 'files':
        command = `tar -xzf ${backupFile} -C ./`;
        break;
      default:
        throw new Error(`Unknown backup type: ${backupType}`);
    }
    
    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Restore failed:', error);
          reject(error);
        } else {
          console.log('✅ Restore completed successfully');
          resolve(stdout);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Restore error:', error);
    throw error;
  }
}

// Schedule Backups
function scheduleBackups() {
  console.log('⏰ Scheduling automated backups...');
  
  // MongoDB Backup Schedule
  cron.schedule(BACKUP_CONFIG.mongodb.schedule, async () => {
    try {
      await backupMongoDB();
      await backupHealthCheck();
    } catch (error) {
      console.error('❌ Scheduled MongoDB backup failed:', error);
    }
  });
  
  // Redis Backup Schedule
  cron.schedule(BACKUP_CONFIG.redis.schedule, async () => {
    try {
      await backupRedis();
      await backupHealthCheck();
    } catch (error) {
      console.error('❌ Scheduled Redis backup failed:', error);
    }
  });
  
  // File Backup Schedule
  cron.schedule(BACKUP_CONFIG.files.schedule, async () => {
    try {
      await backupFiles();
      await backupHealthCheck();
    } catch (error) {
      console.error('❌ Scheduled file backup failed:', error);
    }
  });
  
  console.log('✅ Backup schedules configured');
}

// CLI Commands
const commands = {
  'backup-mongo': backupMongoDB,
  'backup-redis': backupRedis,
  'backup-files': backupFiles,
  'backup-all': async () => {
    await backupMongoDB();
    await backupRedis();
    await backupFiles();
  },
  'restore': restoreFromBackup,
  'health': backupHealthCheck,
  'schedule': scheduleBackups
};

// Main execution
async function main() {
  const command = process.argv[2];
  
  if (!command || !commands[command]) {
    console.log('🗄️ SINGGLEBEE Backup System');
    console.log('\nAvailable commands:');
    Object.keys(commands).forEach(cmd => {
      console.log(`  ${cmd}`);
    });
    console.log('\nUsage: node backup-setup.js <command>');
    console.log('\nExamples:');
    console.log('  node backup-setup.js backup-all');
    console.log('  node backup-setup.js restore mongodb backup_file.gz');
    console.log('  node backup-setup.js health');
    return;
  }
  
  // Initialize backup directories
  createBackupDirectories();
  
  // Execute command
  try {
    if (command === 'restore') {
      const backupType = process.argv[3];
      const backupFile = process.argv[4];
      await commands[command](backupType, backupFile);
    } else {
      await commands[command]();
    }
  } catch (error) {
    console.error('❌ Command execution failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backupMongoDB, backupRedis, backupFiles, restoreFromBackup, backupHealthCheck, scheduleBackups };
