import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

export async function uploadVideo(filePath, options = {}) {
    try {
        logger.info(`Uploading video to Cloudinary: ${filePath}`);

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            folder: 'weapon-detections',
            public_id: options.publicId || undefined,
            overwrite: options.overwrite || false,
            notification_url: options.notificationUrl || undefined,
        });

        logger.info(`Video uploaded successfully: ${result.secure_url}`);

        return {
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
            format: result.format,
            bytes: result.bytes,
        };
    } catch (error) {
        logger.error(`Cloudinary upload error: ${error.message}`);
        throw new Error(`Failed to upload video: ${error.message}`);
    }
}


export async function deleteVideo(publicId) {
    try {
        logger.info(`Deleting video from Cloudinary: ${publicId}`);

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'video',
        });

        logger.info(`Video deleted: ${publicId}`);
        return result;
    } catch (error) {
        logger.error(`Cloudinary delete error: ${error.message}`);
        throw new Error(`Failed to delete video: ${error.message}`);
    }
}

export async function getVideoDetails(publicId) {
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: 'video',
        });
        return result;
    } catch (error) {
        logger.error(`Cloudinary get details error: ${error.message}`);
        throw new Error(`Failed to get video details: ${error.message}`);
    }
}
