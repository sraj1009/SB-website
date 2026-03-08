import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Checks if the current MongoDB connection supports transactions (Replica Set).
 * @returns {Promise<boolean>}
 */
export const isReplicaSet = async () => {
    try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.command({ replSetGetStatus: 1 });
        return !!status.ok;
    } catch (error) {
        return false;
    }
};

/**
 * Runs a function within a transaction if supported by the environment,
 * otherwise runs it normally.
 * 
 * @param {Function} workFn - Function that takes a session as an argument: (session) => {}
 * @returns {Promise<any>}
 */
export const runInTransaction = async (workFn) => {
    const supportsTransactions = await isReplicaSet();

    if (!supportsTransactions) {
        logger.debug('Environment does not support transactions. Running without session.');
        return await workFn(null);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await workFn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
