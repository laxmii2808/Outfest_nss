import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
    try {
        await mongoose.connect(config.database.uri);
        logger.info('MongoDB connected successfully');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (error) => {
    logger.error('MongoDB error:', error);
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
});
