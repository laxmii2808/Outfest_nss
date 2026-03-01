import cron from 'node-cron';
import { Detection } from '../models/Detection.js';
import { sendDetectionEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function startDetectionMonitor() {
    logger.info(`Starting detection monitor cron job: ${config.cron.detectionSchedule}`);

    const task = cron.schedule(config.cron.detectionSchedule, async () => {
        try {
            const unprocessedDetections = await Detection.find({
                processed: false,
            }).sort({ timestamp: 1 });

            if (unprocessedDetections.length === 0) {
                logger.debug('No unprocessed detections found');
                return;
            }

            logger.info(`Processing ${unprocessedDetections.length} unprocessed detection(s)`);

            for (const detection of unprocessedDetections) {
                try {
                    if (!detection.notificationSent) {
                        await sendDetectionEmail(detection);
                        detection.notificationSent = true;
                        logger.info(`Email sent for detection: ${detection._id}`);
                    }

                    detection.processed = true;
                    await detection.save();

                    logger.info(`Detection processed: ${detection._id}`);
                } catch (error) {
                    logger.error(`Error processing detection ${detection._id}: ${error.message}`);

                    const hoursSinceDetection = (Date.now() - detection.timestamp.getTime()) / (1000 * 60 * 60);

                    if (hoursSinceDetection > 24) {
                        logger.warn(`Marking detection ${detection._id} as processed after 24 hours of failed attempts`);
                        detection.processed = true;
                        await detection.save();
                    }
                }
            }
        } catch (error) {
            logger.error(`Error in detection monitor cron job: ${error.message}`);
        }
    });

    task.start();

    logger.info('Detection monitor cron job started successfully');

    return task;
}


export async function processUnprocessedDetections() {
    try {
        const unprocessedDetections = await Detection.find({
            processed: false,
        }).sort({ timestamp: 1 });

        logger.info(`Manually processing ${unprocessedDetections.length} detection(s)`);

        for (const detection of unprocessedDetections) {
            if (!detection.notificationSent) {
                await sendDetectionEmail(detection);
                detection.notificationSent = true;
            }

            detection.processed = true;
            await detection.save();
        }

        return {
            processed: unprocessedDetections.length,
            success: true,
        };
    } catch (error) {
        logger.error(`Error in manual processing: ${error.message}`);
        throw error;
    }
}
