import User from '../models/User.js';
import logger from './logger.js';

/**
 * Seed default admin user on first run
 * Only creates admin if no admin exists
 */
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@singglebee.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'CHANGE_THIS_IN_PRODUCTION_PROMPTLY_2026';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      logger.debug('Admin user already exists, skipping seed');
      return;
    }

    // Check if email is already in use
    const emailExists = await User.emailExists(adminEmail);
    if (emailExists) {
      // Upgrade existing user to admin
      await User.findOneAndUpdate({ email: adminEmail }, { role: 'admin' });
      logger.info(`Existing user ${adminEmail} upgraded to admin`);
      return;
    }

    // Create admin user (mustChangePassword forces change on first login)
    const admin = await User.create({
      name: 'SINGGLEBEE Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      mustChangePassword: true,
    });

    logger.info(`🔐 Admin user created: ${admin.email}`);
    logger.warn('⚠️  IMPORTANT: Change the default admin password immediately in production!');
  } catch (error) {
    logger.error(`Failed to seed admin user: ${error.message}`);
    // Don't throw - just log the error and continue
  }
};

export default seedAdmin;
