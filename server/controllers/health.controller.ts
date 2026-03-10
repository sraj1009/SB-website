import { Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { EmailQueueService } from '../queues/email.queue.js';
import { WebhookQueueService } from '../queues/webhook.queue.js';
import { jwtBlacklistService } from '../services/jwtBlacklist.service.js';
import { realtimeService } from '../services/realtime.service.js';
import logger from '../utils/logger.js';

// Health check response interface
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    redis: {
      status: 'up' | 'down';
      latency: number;
      memory: any;
      connections: number;
    };
    emailQueue: {
      status: 'up' | 'down';
      waiting: number;
      active: number;
      failed: number;
    };
    webhookQueue: {
      status: 'up' | 'down';
      waiting: number;
      active: number;
      failed: number;
    };
    database: {
      status: 'up' | 'down';
      latency: number;
    };
  };
  metrics: {
    totalRequests: number;
    activeConnections: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Comprehensive health check endpoint
 */
export const getHealthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check Redis health
    const redisHealth = await checkRedisHealth();
    
    // Check queue health
    const emailQueueHealth = await checkEmailQueueHealth();
    const webhookQueueHealth = await checkWebhookQueueHealth();
    
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Get system metrics
    const metrics = getSystemMetrics();
    
    // Determine overall status
    const overallStatus = determineOverallStatus([
      redisHealth.status,
      emailQueueHealth.status,
      webhookQueueHealth.status,
      dbHealth.status,
    ]);

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisHealth,
        emailQueue: emailQueueHealth,
        webhookQueue: webhookQueueHealth,
        database: dbHealth,
      },
      metrics,
    };

    const duration = Date.now() - startTime;
    
    // Log health check
    logger.info(`Health check completed in ${duration}ms`, {
      status: overallStatus,
      redis: redisHealth.status,
      emailQueue: emailQueueHealth.status,
      webhookQueue: webhookQueueHealth.status,
      database: dbHealth.status,
    });

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

/**
 * Redis-specific health check
 */
export const getRedisHealth = async (req: Request, res: Response) => {
  try {
    const redisHealth = await checkRedisHealth();
    
    res.status(redisHealth.status === 'up' ? 200 : 503).json(redisHealth);
  } catch (error) {
    logger.error('Redis health check failed:', error);
    res.status(503).json({
      status: 'down',
      error: error.message,
    });
  }
};

/**
 * Queue health check
 */
export const getQueueHealth = async (req: Request, res: Response) => {
  try {
    const emailQueueHealth = await checkEmailQueueHealth();
    const webhookQueueHealth = await checkWebhookQueueHealth();
    
    res.json({
      emailQueue: emailQueueHealth,
      webhookQueue: webhookQueueHealth,
    });
  } catch (error) {
    logger.error('Queue health check failed:', error);
    res.status(503).json({
      error: error.message,
    });
  }
};

/**
 * Cache statistics
 */
export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const redisInfo = await redisClient.info();
    const keyspace = await redisClient.info('keyspace');
    
    const stats = {
      info: parseRedisInfo(redisInfo),
      keyspace: parseRedisInfo(keyspace),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(503).json({
      error: error.message,
    });
  }
};

/**
 * Rate limiting statistics
 */
export const getRateLimitStats = async (req: Request, res: Response) => {
  try {
    const pattern = 'singglebee:ratelimit:*';
    const keys = await redisClient.keys(pattern);
    
    let totalKeys = keys.length;
    let totalRequests = 0;
    const endpointCounts: Record<string, number> = {};

    for (const key of keys) {
      const requests = await redisClient.get(key);
      const count = requests ? parseInt(requests) : 0;
      totalRequests += count;

      // Extract endpoint from key
      const parts = key.split(':');
      if (parts.length >= 4) {
        const endpoint = parts[3];
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
      }
    }

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, requests]) => ({ endpoint, requests }));

    res.json({
      totalKeys,
      totalRequests,
      topEndpoints,
    });
  } catch (error) {
    logger.error('Failed to get rate limit stats:', error);
    res.status(503).json({
      error: error.message,
    });
  }
};

// Helper functions

async function checkRedisHealth(): Promise<any> {
  try {
    const startTime = Date.now();
    await redisClient.ping();
    const latency = Date.now() - startTime;
    
    const info = await redisClient.info('memory');
    const clients = await redisClient.info('clients');
    
    return {
      status: 'up',
      latency,
      memory: parseRedisInfo(info),
      connections: parseInt(parseRedisInfo(clients).connected_clients || '0'),
    };
  } catch (error) {
    return {
      status: 'down',
      latency: -1,
      error: error.message,
    };
  }
}

async function checkEmailQueueHealth(): Promise<any> {
  try {
    const stats = await EmailQueueService.getQueueStats();
    
    return {
      status: stats ? 'up' : 'down',
      waiting: stats?.waiting || 0,
      active: stats?.active || 0,
      failed: stats?.failed || 0,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

async function checkWebhookQueueHealth(): Promise<any> {
  try {
    const stats = await WebhookQueueService.getQueueStats();
    
    return {
      status: stats ? 'up' : 'down',
      waiting: stats?.waiting || 0,
      active: stats?.active || 0,
      failed: stats?.failed || 0,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
}

async function checkDatabaseHealth(): Promise<any> {
  try {
    // Import mongoose dynamically to avoid circular dependencies
    const mongoose = await import('mongoose');
    
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - startTime;
    
    return {
      status: 'up',
      latency,
    };
  } catch (error) {
    return {
      status: 'down',
      latency: -1,
      error: error.message,
    };
  }
}

function getSystemMetrics(): any {
  return {
    totalRequests: 0, // Would be tracked by middleware
    activeConnections: 0, // Would be tracked by server
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };
}

function determineOverallStatus(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
  const downCount = statuses.filter(s => s === 'down').length;
  
  if (downCount === 0) return 'healthy';
  if (downCount <= statuses.length / 2) return 'degraded';
  return 'unhealthy';
}

function parseRedisInfo(info: string): any {
  const lines = info.split('\r\n');
  const result: any = {};

  for (const line of lines) {
    if (line.startsWith('#') || line === '') continue;
    
    const [key, value] = line.split(':');
    if (key && value) {
      // Convert numeric values
      const numValue = parseFloat(value);
      result[key] = isNaN(numValue) ? value : numValue;
    }
  }

  return result;
}

export default {
  getHealthCheck,
  getRedisHealth,
  getQueueHealth,
  getCacheStats,
  getRateLimitStats,
};
