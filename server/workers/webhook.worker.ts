import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import { processWebhookJob } from '../queues/webhook.queue.js';
import logger from '../utils/logger.js';

// Create webhook worker
const webhookWorker = new Worker(
  'webhook-queue',
  processWebhookJob,
  {
    connection: redisClient,
    concurrency: 3, // Process 3 webhooks concurrently
    limiter: {
      max: 30, // Max 30 webhooks per minute
      duration: 60000, // 1 minute
    },
  }
);

// Worker event handlers
webhookWorker.on('completed', (job) => {
  logger.info(`Webhook job completed: ${job.id}`, {
    type: job.data.type,
    url: job.data.url,
  });
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`Webhook job failed: ${job.id}`, {
    type: job.data.type,
    url: job.data.url,
    error: err.message,
    attemptsMade: job.attemptsMade,
  });
});

webhookWorker.on('error', (err) => {
  logger.error('Webhook worker error:', err);
});

webhookWorker.on('stalled', (job) => {
  logger.warn(`Webhook job stalled: ${job.id}`, {
    type: job.data.type,
    url: job.data.url,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing webhook worker...');
  await webhookWorker.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing webhook worker...');
  await webhookWorker.close();
});

export default webhookWorker;
