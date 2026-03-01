import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Send frame to ML model for weapon detection
 */
export async function detectWeapon(frameData, cameraId) {
    try {
        // Convert ArrayBuffer to Buffer if needed
        const buffer = Buffer.from(frameData);

        // Send frame to ML model endpoint
        const response = await axios.post(
            config.mlModel.url,
            buffer,
            {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'X-Camera-Id': cameraId,
                },
                timeout: config.mlModel.timeout,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            }
        );

        // Expected response format:
        // {
        //   detected: boolean,
        //   confidence: number,
        //   weaponType: string,
        //   boundingBoxes: array (optional)
        // }

        if (response.data.detected || response.data.plate || (response.data.suspicious && response.data.suspicious.length > 0)) {
            logger.info(`Detections found by ML model - Camera: ${cameraId}`);
            if (response.data.detected) logger.info(`- Weapon: ${response.data.weaponType} (${response.data.confidence})`);
            if (response.data.plate) logger.info(`- Plate: ${response.data.plate.text}`);
            if (response.data.suspicious && response.data.suspicious.length > 0) logger.info(`- Suspicious: ${response.data.suspicious.length} items`);
        }

        return {
            detected: response.data.detected || false,
            confidence: response.data.confidence || 0,
            weaponType: response.data.weaponType || 'unknown',
            plate: response.data.plate || null,
            suspicious: response.data.suspicious || [],
            metadata: response.data.boundingBoxes || {},
        };
    } catch (error) {
        // Don't throw error for ML service failures - log and continue
        if (error.code === 'ECONNREFUSED') {
            logger.warn(`ML model service not available: ${config.mlModel.url}`);
        } else if (error.code === 'ETIMEDOUT') {
            logger.warn(`ML model request timeout for camera: ${cameraId}`);
        } else {
            logger.error(`ML model error: ${error.message}`);
        }

        return {
            detected: false,
            confidence: 0,
            weaponType: 'unknown',
            plate: null,
            suspicious: [],
            metadata: {},
            error: error.message,
        };
    }
}

/**
 * Check ML model health
 */
export async function checkMLModelHealth() {
    try {
        const healthUrl = config.mlModel.url.replace('/detect', '/health');
        const response = await axios.get(healthUrl, {
            timeout: 3000,
        });

        return {
            available: true,
            status: response.data,
        };
    } catch (error) {
        return {
            available: false,
            error: error.message,
        };
    }
}
