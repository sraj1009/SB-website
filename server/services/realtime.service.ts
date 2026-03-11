import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Real-time event data interfaces
export interface OrderUpdateEvent {
  orderId: string;
  status: string;
  previousStatus?: string;
  updatedBy: string;
  timestamp: string;
  message?: string;
}

export interface StockAlertEvent {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
  severity: 'low' | 'medium' | 'critical';
}

export interface AdminNotificationEvent {
  type: 'order' | 'stock' | 'system' | 'security';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Real-time service
export class RealtimeService {
  private static instance: RealtimeService;
  private redis = redisClient;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Publish order status update
   */
  async publishOrderUpdate(event: OrderUpdateEvent): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.orderUpdates(event.orderId);
      const message = JSON.stringify(event);

      await this.redis.publish(channel, message);

      logger.info(`Order update published: ${event.orderId}`, {
        status: event.status,
        updatedBy: event.updatedBy,
      });
    } catch (error) {
      logger.error('Failed to publish order update:', error);
      throw error;
    }
  }

  /**
   * Subscribe to order updates
   */
  async subscribeToOrderUpdates(
    orderId: string,
    callback: (event: OrderUpdateEvent) => void
  ): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.orderUpdates(orderId);

      // Store callback for cleanup
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
      }
      this.subscribers.get(channel)!.add(callback);

      // Subscribe to Redis channel
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(channel, (message) => {
        try {
          const event = JSON.parse(message) as OrderUpdateEvent;
          callback(event);
        } catch (error) {
          logger.error('Failed to parse order update message:', error);
        }
      });

      logger.info(`Subscribed to order updates: ${orderId}`);
    } catch (error) {
      logger.error('Failed to subscribe to order updates:', error);
      throw error;
    }
  }

  /**
   * Publish stock alert
   */
  async publishStockAlert(event: StockAlertEvent): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.stockAlerts();
      const message = JSON.stringify(event);

      await this.redis.publish(channel, message);

      logger.info(`Stock alert published: ${event.productId}`, {
        currentStock: event.currentStock,
        severity: event.severity,
      });
    } catch (error) {
      logger.error('Failed to publish stock alert:', error);
      throw error;
    }
  }

  /**
   * Subscribe to stock alerts
   */
  async subscribeToStockAlerts(callback: (event: StockAlertEvent) => void): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.stockAlerts();

      // Store callback for cleanup
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
      }
      this.subscribers.get(channel)!.add(callback);

      // Subscribe to Redis channel
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(channel, (message) => {
        try {
          const event = JSON.parse(message) as StockAlertEvent;
          callback(event);
        } catch (error) {
          logger.error('Failed to parse stock alert message:', error);
        }
      });

      logger.info('Subscribed to stock alerts');
    } catch (error) {
      logger.error('Failed to subscribe to stock alerts:', error);
      throw error;
    }
  }

  /**
   * Publish admin notification
   */
  async publishAdminNotification(event: AdminNotificationEvent): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.adminNotifications();
      const message = JSON.stringify(event);

      await this.redis.publish(channel, message);

      logger.info(`Admin notification published: ${event.type}`, {
        title: event.title,
        priority: event.priority,
      });
    } catch (error) {
      logger.error('Failed to publish admin notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to admin notifications
   */
  async subscribeToAdminNotifications(
    callback: (event: AdminNotificationEvent) => void
  ): Promise<void> {
    try {
      const channel = RedisClient.getKeys.realtime.adminNotifications();

      // Store callback for cleanup
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, new Set());
      }
      this.subscribers.get(channel)!.add(callback);

      // Subscribe to Redis channel
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(channel, (message) => {
        try {
          const event = JSON.parse(message) as AdminNotificationEvent;
          callback(event);
        } catch (error) {
          logger.error('Failed to parse admin notification message:', error);
        }
      });

      logger.info('Subscribed to admin notifications');
    } catch (error) {
      logger.error('Failed to subscribe to admin notifications:', error);
      throw error;
    }
  }

  /**
   * Check and publish stock alerts for low stock products
   */
  async checkLowStockProducts(
    products: Array<{ _id: string; title: string; stockQuantity: number }>
  ): Promise<void> {
    const THRESHOLDS = {
      critical: 0,
      high: 5,
      medium: 10,
      low: 20,
    };

    for (const product of products) {
      const { _id, title, stockQuantity } = product;

      // Determine severity
      let severity: 'low' | 'medium' | 'critical';
      if (stockQuantity <= THRESHOLDS.critical) {
        severity = 'critical';
      } else if (stockQuantity <= THRESHOLDS.high) {
        severity = 'medium';
      } else if (stockQuantity <= THRESHOLDS.medium) {
        severity = 'low';
      } else {
        continue; // No alert needed
      }

      const alertEvent: StockAlertEvent = {
        productId: _id,
        productName: title,
        currentStock: stockQuantity,
        threshold: THRESHOLDS[severity],
        timestamp: new Date().toISOString(),
        severity,
      };

      await this.publishStockAlert(alertEvent);

      // Also publish admin notification for critical stock
      if (severity === 'critical') {
        await this.publishAdminNotification({
          type: 'stock',
          title: 'Critical Stock Alert',
          message: `${title} is out of stock! Immediate restocking required.`,
          data: alertEvent,
          timestamp: new Date().toISOString(),
          priority: 'critical',
        });
      }
    }
  }

  /**
   * Get active subscribers count
   */
  getActiveSubscribersCount(): number {
    return this.subscribers.size;
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    try {
      for (const [channel, callbacks] of this.subscribers) {
        const subscriber = this.redis.duplicate();
        await subscriber.unsubscribe(channel);
        callbacks.clear();
      }

      this.subscribers.clear();
      logger.info('Unsubscribed from all real-time channels');
    } catch (error) {
      logger.error('Failed to unsubscribe from channels:', error);
      throw error;
    }
  }

  /**
   * Get Redis pub/sub statistics
   */
  async getPubSubStats(): Promise<any> {
    try {
      const info = await this.redis.info('stats');
      const clients = await this.redis.info('clients');

      return {
        stats: this.parseRedisInfo(info),
        clients: this.parseRedisInfo(clients),
        activeSubscribers: this.getActiveSubscribersCount(),
      };
    } catch (error) {
      logger.error('Failed to get pub/sub stats:', error);
      return null;
    }
  }

  /**
   * Parse Redis info response
   */
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
}

// Export singleton instance
export const realtimeService = RealtimeService.getInstance();

export default realtimeService;
