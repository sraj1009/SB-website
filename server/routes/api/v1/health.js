import express from 'express';
import {
  getHealthCheck,
  getRedisHealth,
  getQueueHealth,
  getCacheStats,
  getRateLimitStats,
} from '../../controllers/health.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Comprehensive health check
 * @access  Public
 */
router.get('/', getHealthCheck);

/**
 * @route   GET /api/v1/health/redis
 * @desc    Redis health check
 * @access  Public
 */
router.get('/redis', getRedisHealth);

/**
 * @route   GET /api/v1/health/queues
 * @desc    Queue health check
 * @access  Public
 */
router.get('/queues', getQueueHealth);

/**
 * @route   GET /api/v1/health/cache
 * @desc    Cache statistics
 * @access  Public
 */
router.get('/cache', getCacheStats);

/**
 * @route   GET /api/v1/health/rate-limit
 * @desc    Rate limiting statistics
 * @access  Public
 */
router.get('/rate-limit', getRateLimitStats);

export default router;
