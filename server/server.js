import config from './config/config.js';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { startWorker } from './utils/worker.js';
import seedAdmin from './utils/seedAdmin.js';
import seedProducts from './utils/seedProducts.js';

const PORT = config.port;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed admin user on first run (Manual run recommended for production)
    // await seedAdmin();
    // Check if products exist before seeding to prevent duplicates
    const Product = (await import('./models/Product.js')).default;
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await seedProducts();
      logger.info('Products seeded successfully');
    } else {
      logger.info(`Products already exist (${productCount} found). Skipping seed.`);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🐝 SINGGLEBEE API Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Start Background Workers
    await startWorker();

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `Port ${PORT} is already in use. Please close other instances or the hive will be blocked.`
        );
      } else {
        logger.error(`Server error: ${error.message}`);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('FATAL STARTUP ERROR:', error);
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
