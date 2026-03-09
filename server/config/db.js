import mongoose from 'mongoose';
import config from './config.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/**
 * Connect to MongoDB with exponential backoff retry.
 * Lets the orchestrator (Docker/K8s) decide when to hard-kill the process
 * instead of exiting immediately on the first failure.
 */
const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(config.mongoose.url, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle post-connect events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Mongoose will attempt automatic reconnection.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s

    if (attempt >= MAX_RETRIES) {
      logger.error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${error.message}`);
      // Allow orchestrators (Docker/K8s) to detect the failure and restart
      process.exit(1);
    }

    logger.warn(
      `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed. ` +
      `Retrying in ${delay / 1000}s... (${error.message})`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDB(attempt + 1);
  }
};

export default connectDB;
