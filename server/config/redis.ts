import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  connectTimeout: number;
  commandTimeout: number;
}

// Redis singleton class
class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  private constructor() {
    this.client = this.createClient();
    this.setupEventHandlers();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private createClient(): Redis {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    };

    return new Redis(config);
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected successfully');
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      // Don't crash the server on Redis errors
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', (delay) => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max Redis reconnection attempts reached. Giving up.');
      }
    });

    this.client.on('end', () => {
      logger.warn('Redis client connection ended');
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client disconnected gracefully');
    } catch (error) {
      logger.error('Error disconnecting Redis client:', error);
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  // Health check
  public async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get Redis info
  public async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      logger.error('Failed to get Redis info:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): any {
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

  // Cache key helpers
  public static getKeys = {
    products: {
      listing: (page: number, limit: number, filters: any) => {
        const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
        return `singglebee:products:page:${page}:limit:${limit}:filters:${filterHash}`;
      },
      byId: (id: string) => `singglebee:products:${id}`,
      byCategory: (category: string) => `singglebee:products:category:${category}`,
      search: (query: string) => `singglebee:products:search:${query}`,
    },
    orders: {
      byId: (id: string) => `singglebee:orders:${id}`,
      byUser: (userId: string) => `singglebee:orders:user:${userId}`,
      byStatus: (status: string) => `singglebee:orders:status:${status}`,
    },
    users: {
      byId: (id: string) => `singglebee:users:${id}`,
      byEmail: (email: string) => `singglebee:users:email:${email}`,
    },
    auth: {
      blacklist: (jti: string) => `singglebee:blacklist:${jti}`,
      session: (sessionId: string) => `singglebee:session:${sessionId}`,
    },
    rateLimit: {
      endpoint: (endpoint: string, identifier: string) => `singglebee:ratelimit:${endpoint}:${identifier}`,
    },
    config: {
      site: () => `singglebee:config:site`,
      categories: () => `singglebee:config:categories`,
    },
    cart: {
      byUser: (userId: string) => `singglebee:cart:${userId}`,
    },
    realtime: {
      orderUpdates: (orderId: string) => `singglebee:orders:${orderId}`,
      stockAlerts: () => `singglebee:alerts:stock`,
      adminNotifications: () => `singglebee:notifications:admin`,
    },
  };

  // Cache TTL constants (in seconds)
  public static TTL = {
    products: {
      listing: 300, // 5 minutes
      byId: 600, // 10 minutes
      byCategory: 900, // 15 minutes
      search: 180, // 3 minutes
    },
    orders: {
      byId: 3600, // 1 hour
      byUser: 300, // 5 minutes
      byStatus: 180, // 3 minutes
    },
    users: {
      byId: 3600, // 1 hour
      byEmail: 3600, // 1 hour
    },
    auth: {
      blacklist: 900, // 15 minutes (matches JWT expiry)
      session: 86400, // 24 hours
    },
    rateLimit: {
      endpoint: 900, // 15 minutes
    },
    config: {
      site: 3600, // 1 hour
      categories: 3600, // 1 hour
    },
    cart: {
      byUser: 86400, // 24 hours
    },
  };
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

// Export the Redis client for direct use
export default redisClient.getClient();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connection...');
  await redisClient.disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connection...');
  await redisClient.disconnect();
});
