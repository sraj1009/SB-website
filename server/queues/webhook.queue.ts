import { Queue, Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Webhook job data interface
export interface WebhookJobData {
  type: 'payment_verification' | 'order_status_update' | 'inventory_update';
  url: string;
  payload: any;
  signature?: string;
  retries?: number;
  timeout?: number;
  priority?: number;
  delay?: number;
}

// Create webhook queue
export const webhookQueue = new Queue<WebhookJobData>('webhook-queue', {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Webhook queue processor
export const processWebhookJob = async (job: { data: WebhookJobData; id: string }) => {
  const { data } = job;
  const startTime = Date.now();

  try {
    logger.info(`Processing webhook job ${job.id}: ${data.type}`, {
      url: data.url,
      type: data.type,
    });

    // Process webhook
    const result = await sendWebhook(data);

    const duration = Date.now() - startTime;
    logger.info(`Webhook job ${job.id} completed successfully`, {
      duration: `${duration}ms`,
      type: data.type,
      url: data.url,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Webhook job ${job.id} failed`, {
      error: error.message,
      duration: `${duration}ms`,
      type: data.type,
      url: data.url,
      attempt: job.attemptsMade,
    });

    throw error;
  }
};

// Webhook sending function
async function sendWebhook(data: WebhookJobData): Promise<any> {
  const { url, payload, signature, timeout = 10000 } = data;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SINGGLEBEE-Webhook/1.0',
      'X-Singglebee-Event': data.type,
    };

    // Add signature if provided
    if (signature) {
      headers['X-Singglebee-Signature'] = signature;
    }

    // Send webhook
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();

    logger.info(`Webhook delivered successfully`, {
      url,
      type: data.type,
      status: response.status,
    });

    return {
      success: true,
      status: response.status,
      data: responseData,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Webhook timeout after ${timeout}ms`);
    }

    throw error;
  }
}

// Webhook queue utilities
export class WebhookQueueService {
  /**
   * Add webhook job to queue
   */
  static async addWebhookJob(data: WebhookJobData): Promise<string> {
    try {
      const job = await webhookQueue.add(`webhook-${data.type}`, data, {
        priority: data.priority || 0,
        delay: data.delay || 0,
        attempts: data.retries || 5,
      });

      logger.info(`Webhook job added to queue: ${job.id}`, {
        type: data.type,
        url: data.url,
      });

      return job.id;
    } catch (error) {
      logger.error('Failed to add webhook job to queue:', error);
      throw error;
    }
  }

  /**
   * Add payment verification webhook
   */
  static async sendPaymentVerification(paymentData: any): Promise<string> {
    return this.addWebhookJob({
      type: 'payment_verification',
      url: paymentData.webhookUrl,
      payload: {
        orderId: paymentData.orderId,
        paymentId: paymentData.paymentId,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
        timestamp: new Date().toISOString(),
      },
      signature: this.generateSignature(paymentData),
      priority: 1, // High priority
    });
  }

  /**
   * Add order status update webhook
   */
  static async sendOrderStatusUpdate(orderData: any): Promise<string> {
    return this.addWebhookJob({
      type: 'order_status_update',
      url: orderData.webhookUrl,
      payload: {
        orderId: orderData.orderId,
        status: orderData.status,
        previousStatus: orderData.previousStatus,
        timestamp: new Date().toISOString(),
        updatedBy: orderData.updatedBy,
      },
      priority: 1, // High priority
    });
  }

  /**
   * Add inventory update webhook
   */
  static async sendInventoryUpdate(inventoryData: any): Promise<string> {
    return this.addWebhookJob({
      type: 'inventory_update',
      url: inventoryData.webhookUrl,
      payload: {
        productId: inventoryData.productId,
        sku: inventoryData.sku,
        previousStock: inventoryData.previousStock,
        newStock: inventoryData.newStock,
        timestamp: new Date().toISOString(),
      },
      priority: 0, // Normal priority
    });
  }

  /**
   * Generate webhook signature (simplified implementation)
   */
  private static generateSignature(data: any): string {
    // In a real implementation, you would use HMAC-SHA256 with a secret key
    const payload = JSON.stringify(data);
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<any> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        webhookQueue.getWaiting(),
        webhookQueue.getActive(),
        webhookQueue.getCompleted(),
        webhookQueue.getFailed(),
        webhookQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    } catch (error) {
      logger.error('Failed to get webhook queue stats:', error);
      return null;
    }
  }

  /**
   * Pause webhook queue
   */
  static async pauseQueue(): Promise<void> {
    try {
      await webhookQueue.pause();
      logger.info('Webhook queue paused');
    } catch (error) {
      logger.error('Failed to pause webhook queue:', error);
      throw error;
    }
  }

  /**
   * Resume webhook queue
   */
  static async resumeQueue(): Promise<void> {
    try {
      await webhookQueue.resume();
      logger.info('Webhook queue resumed');
    } catch (error) {
      logger.error('Failed to resume webhook queue:', error);
      throw error;
    }
  }

  /**
   * Clear all jobs from queue
   */
  static async clearQueue(): Promise<void> {
    try {
      await webhookQueue.clean(0, 0, 'completed');
      await webhookQueue.clean(0, 0, 'failed');
      logger.info('Webhook queue cleared');
    } catch (error) {
      logger.error('Failed to clear webhook queue:', error);
      throw error;
    }
  }

  /**
   * Get job details
   */
  static async getJob(jobId: string): Promise<any> {
    try {
      const job = await webhookQueue.getJob(jobId);
      if (!job) return null;

      return {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
        attemptsMade: job.attemptsMade,
      };
    } catch (error) {
      logger.error(`Failed to get webhook job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Retry failed job
   */
  static async retryJob(jobId: string): Promise<void> {
    try {
      const job = await webhookQueue.getJob(jobId);
      if (job) {
        await job.retry();
        logger.info(`Webhook job ${jobId} retried`);
      }
    } catch (error) {
      logger.error(`Failed to retry webhook job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get failed jobs for retry
   */
  static async getFailedJobs(limit: number = 50): Promise<any[]> {
    try {
      const failed = await webhookQueue.getFailed(0, limit - 1);
      return failed.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));
    } catch (error) {
      logger.error('Failed to get failed webhook jobs:', error);
      return [];
    }
  }
}

export default WebhookQueueService;
