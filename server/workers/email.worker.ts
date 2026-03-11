import { Worker } from 'bullmq';
import redisClient from '../config/redis.js';
import { processEmailJob } from '../queues/email.queue.js';
import logger from '../utils/logger.js';

// Create email worker
const emailWorker = new Worker('email-queue', processEmailJob, {
  connection: redisClient,
  concurrency: 5, // Process 5 emails concurrently
  limiter: {
    max: 20, // Max 20 emails per minute
    duration: 60000, // 1 minute
  },
});

// Worker event handlers
emailWorker.on('completed', (job) => {
  logger.info(`Email job completed: ${job.id}`, {
    type: job.data.type,
    to: job.data.to,
  });
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job failed: ${job.id}`, {
    type: job.data.type,
    to: job.data.to,
    error: err.message,
    attemptsMade: job.attemptsMade,
  });
});

emailWorker.on('error', (err) => {
  logger.error('Email worker error:', err);
});

emailWorker.on('stalled', (job) => {
  logger.warn(`Email job stalled: ${job.id}`, {
    type: job.data.type,
    to: job.data.to,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing email worker...');
  await emailWorker.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing email worker...');
  await emailWorker.close();
});

export default emailWorker;
