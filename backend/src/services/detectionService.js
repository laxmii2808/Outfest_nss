import path from 'path';
import fs from 'fs/promises';
import { Detection } from '../models/Detection.js';
import { videoBufferService } from './videoBufferService.js';
import { uploadVideo } from './cloudinaryService.js';
import { framesToVideo, ensureTmpDir } from '../utils/videoProcessor.js';
import { logger } from '../utils/logger.js';


export async function handleDetection(cameraId, detectionData) {
    let videoPath = null;

    try {
        logger.info(`Processing detection for camera: ${cameraId}`);

        const cameraLabel = videoBufferService.getCameraLabel(cameraId);

        const frames = videoBufferService.getFrames(cameraId);

        if (frames.length === 0) {
            throw new Error('No frames available in buffer');
        }

        logger.info(`Retrieved ${frames.length} frames from buffer`);

        const tmpDir = await ensureTmpDir();
        const timestamp = Date.now();
        videoPath = path.join(tmpDir, `detection_${cameraId}_${timestamp}.mp4`);


        await framesToVideo(frames, videoPath);

        const uploadResult = await uploadVideo(videoPath, {
            publicId: `detection_${cameraId}_${timestamp}`,
        });

        const detection = new Detection({
            cameraId,
            cameraLabel,
            timestamp: new Date(),
            videoUrl: uploadResult.url,
            confidence: detectionData.confidence,
            weaponType: detectionData.weaponType || (detectionData.plate ? 'plate' : (detectionData.suspicious?.length > 0 ? 'suspicious' : 'unknown')),
            notificationSent: false,
            processed: false,
            metadata: {
                ...detectionData.metadata,
                plate: detectionData.plate,
                suspicious: detectionData.suspicious,
                videoPublicId: uploadResult.publicId,
                videoDuration: uploadResult.duration,
                videoFormat: uploadResult.format,
                frameCount: frames.length,
            },
        });

        await detection.save();

        logger.info(`Detection saved to database: ${detection._id}`);

        try {
            await fs.unlink(videoPath);
            logger.debug(`Cleaned up temporary video: ${videoPath}`);
        } catch (err) {
            logger.warn(`Failed to delete temporary video: ${err.message}`);
        }

        return detection;
    } catch (error) {
        logger.error(`Error handling detection: ${error.message}`);

        if (videoPath) {
            try {
                await fs.unlink(videoPath);
            } catch (err) {

            }
        }

        throw error;
    }
}


export async function getRecentDetections(limit = 10) {
    try {
        const detections = await Detection.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return detections;
    } catch (error) {
        logger.error(`Error fetching recent detections: ${error.message}`);
        throw error;
    }
}


export async function getDetectionsByCamera(cameraId, limit = 10) {
    try {
        const detections = await Detection.find({ cameraId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return detections;
    } catch (error) {
        logger.error(`Error fetching detections for camera ${cameraId}: ${error.message}`);
        throw error;
    }
}
