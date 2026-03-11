import { Queue, Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Email job data interface
export interface EmailJobData {
  type: 'order_confirmation' | 'password_reset' | 'shipping_update' | 'admin_notification';
  to: string;
  subject: string;
  template?: string;
  data?: any;
  priority?: number;
  delay?: number;
  attempts?: number;
}

// Create email queue
export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Email queue processor
export const processEmailJob = async (job: { data: EmailJobData; id: string }) => {
  const { data } = job;
  const startTime = Date.now();

  try {
    logger.info(`Processing email job ${job.id}: ${data.type}`, {
      to: data.to,
      subject: data.subject,
    });

    // Simulate email sending (replace with actual email service)
    await sendEmail(data);

    const duration = Date.now() - startTime;
    logger.info(`Email job ${job.id} completed successfully`, {
      duration: `${duration}ms`,
      type: data.type,
    });

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Email job ${job.id} failed`, {
      error: error.message,
      duration: `${duration}ms`,
      type: data.type,
      attempt: job.attemptsMade,
    });

    throw error;
  }
};

// Mock email sending function (replace with actual implementation)
async function sendEmail(data: EmailJobData): Promise<void> {
  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

  // Here you would integrate with your email service (SendGrid, Nodemailer, etc.)
  logger.info(`Email sent to ${data.to} with subject: ${data.subject}`, {
    type: data.type,
    template: data.template,
  });

  // Simulate occasional failures for testing retry logic
  if (Math.random() < 0.1) {
    throw new Error('Simulated email sending failure');
  }
}

// Email queue utilities
export class EmailQueueService {
  /**
   * Add email job to queue
   */
  static async addEmailJob(data: EmailJobData): Promise<string> {
    try {
      const job = await emailQueue.add(`email-${data.type}`, data, {
        priority: data.priority || 0,
        delay: data.delay || 0,
        attempts: data.attempts || 3,
      });

      logger.info(`Email job added to queue: ${job.id}`, {
        type: data.type,
        to: data.to,
      });

      return job.id;
    } catch (error) {
      logger.error('Failed to add email job to queue:', error);
      throw error;
    }
  }

  /**
   * Add order confirmation email
   */
  static async sendOrderConfirmation(orderData: any): Promise<string> {
    return this.addEmailJob({
      type: 'order_confirmation',
      to: orderData.user.email,
      subject: `Order Confirmation - ${orderData.orderId}`,
      template: 'order_confirmation',
      data: orderData,
      priority: 1, // High priority
    });
  }

  /**
   * Add password reset email
   */
  static async sendPasswordReset(resetData: any): Promise<string> {
    return this.addEmailJob({
      type: 'password_reset',
      to: resetData.email,
      subject: 'Password Reset Request',
      template: 'password_reset',
      data: resetData,
      priority: 2, // Medium priority
    });
  }

  /**
   * Add shipping update email
   */
  static async sendShippingUpdate(shippingData: any): Promise<string> {
    return this.addEmailJob({
      type: 'shipping_update',
      to: shippingData.user.email,
      subject: `Shipping Update - Order ${shippingData.orderId}`,
      template: 'shipping_update',
      data: shippingData,
      priority: 1, // High priority
    });
  }

  /**
   * Add admin notification email
   */
  static async sendAdminNotification(notificationData: any): Promise<string> {
    return this.addEmailJob({
      type: 'admin_notification',
      to: notificationData.adminEmail,
      subject: notificationData.subject,
      template: 'admin_notification',
      data: notificationData,
      priority: 0, // Normal priority
    });
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<any> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        emailQueue.getWaiting(),
        emailQueue.getActive(),
        emailQueue.getCompleted(),
        emailQueue.getFailed(),
        emailQueue.getDelayed(),
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
      logger.error('Failed to get email queue stats:', error);
      return null;
    }
  }

  /**
   * Pause email queue
   */
  static async pauseQueue(): Promise<void> {
    try {
      await emailQueue.pause();
      logger.info('Email queue paused');
    } catch (error) {
      logger.error('Failed to pause email queue:', error);
      throw error;
    }
  }

  /**
   * Resume email queue
   */
  static async resumeQueue(): Promise<void> {
    try {
      await emailQueue.resume();
      logger.info('Email queue resumed');
    } catch (error) {
      logger.error('Failed to resume email queue:', error);
      throw error;
    }
  }

  /**
   * Clear all jobs from queue
   */
  static async clearQueue(): Promise<void> {
    try {
      await emailQueue.clean(0, 0, 'completed');
      await emailQueue.clean(0, 0, 'failed');
      logger.info('Email queue cleared');
    } catch (error) {
      logger.error('Failed to clear email queue:', error);
      throw error;
    }
  }

  /**
   * Get job details
   */
  static async getJob(jobId: string): Promise<any> {
    try {
      const job = await emailQueue.getJob(jobId);
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
      logger.error(`Failed to get email job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Retry failed job
   */
  static async retryJob(jobId: string): Promise<void> {
    try {
      const job = await emailQueue.getJob(jobId);
      if (job) {
        await job.retry();
        logger.info(`Email job ${jobId} retried`);
      }
    } catch (error) {
      logger.error(`Failed to retry email job ${jobId}:`, error);
      throw error;
    }
  }
}

export default EmailQueueService;
