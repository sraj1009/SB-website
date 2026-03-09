import Agenda from 'agenda';
import mongoose from 'mongoose';
import logger from './logger.js';
import PaymentSession from '../models/PaymentSession.js';

const agenda = new Agenda({
    db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' },
    defaultLockLifetime: 30000, // 30 seconds
    maxConcurrency: 5,
});

// Define Jobs
agenda.define('release-expired-locks', async (job) => {
    try {
        const expiredSessions = await PaymentSession.find({
            status: 'pending',
            expiresAt: { $lt: new Date() },
        });

        if (expiredSessions.length === 0) return;

        const Product = mongoose.model('Product');
        for (const session of expiredSessions) {
            session.status = 'expired';
            await session.save();

            for (const item of session.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stockQuantity: item.quantity },
                });
            }
            logger.info(`Agenda: Released expired stock locks for session ${session.sessionId}`);
        }
    } catch (err) {
        logger.error(`Agenda Job Error (release-expired-locks): ${err.message}`);
    }
});

// Start Agenda
export const startWorker = async () => {
    await agenda.start();
    await agenda.every('15 minutes', 'release-expired-locks');
    logger.info('Agenda background worker started successfully');
};

export default agenda;
