import { Server } from 'socket.io';
import { videoBufferService } from './videoBufferService.js';
import { detectWeapon } from './mlService.js';
import { handleDetection } from './detectionService.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize Socket.IO server and handle camera streams
 */
export function initializeSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*', // Configure this properly in production
            methods: ['GET', 'POST'],
        },
        maxHttpBufferSize: 5e6, // 5MB max buffer size for frames
    });

    io.on('connection', (socket) => {
        const { cameraId, cameraLabel } = socket.handshake.query;

        if (!cameraId) {
            logger.warn('Socket connection without cameraId');
            socket.disconnect();
            return;
        }

        logger.info(`Camera connected: ${cameraLabel || cameraId} (${socket.id})`);

        // Initialize video buffer for this camera
        videoBufferService.initBuffer(cameraId, cameraLabel || cameraId);

        // Track detection cooldown to prevent spam
        let lastDetectionTime = 0;
        const DETECTION_COOLDOWN = 10000; // 10 seconds between detections

        // Handle incoming video frames
        socket.on('video-frame', async (frameData) => {
            try {
                // Add frame to buffer
                videoBufferService.addFrame(cameraId, frameData);

                // Send frame to ML model for detection (async, don't wait)
                // We'll process detections in the background to avoid blocking frame reception
                detectWeapon(frameData, cameraId)
                    .then(async (result) => {
                        const hasWeapon = result.detected && result.confidence > 0.5;
                        const hasPlate = !!result.plate;
                        const hasSuspicious = result.suspicious && result.suspicious.length > 0;

                        if (hasWeapon || hasPlate || hasSuspicious) {
                            const now = Date.now();

                            // Check cooldown to prevent multiple detections in quick succession
                            // We might want different cooldowns for different types, but for now global is fine
                            if (now - lastDetectionTime > DETECTION_COOLDOWN) {
                                lastDetectionTime = now;

                                if (hasWeapon) logger.warn(`Weapon detected on camera ${cameraLabel}: ${result.weaponType} (${(result.confidence * 100).toFixed(2)}%)`);
                                if (hasPlate) logger.warn(`Plate detected on camera ${cameraLabel}: ${result.plate.text}`);
                                if (hasSuspicious) logger.warn(`Suspicious behaviour detected on camera ${cameraLabel}: ${result.suspicious.map(s => s.label).join(', ')}`);

                                // Handle detection (save video, upload, create DB record)
                                try {
                                    await handleDetection(cameraId, result);

                                    // Notify frontend
                                    socket.emit('detection-alert', {
                                        cameraId,
                                        cameraLabel,
                                        weaponType: result.weaponType,
                                        confidence: result.confidence,
                                        plate: result.plate,
                                        suspicious: result.suspicious,
                                        timestamp: new Date().toISOString(),
                                    });
                                } catch (error) {
                                    logger.error(`Error handling detection: ${error.message}`);
                                }
                            }
                        }
                    })
                    .catch((error) => {
                        // ML detection errors are already logged in mlService
                        // Don't propagate to avoid disrupting the stream
                    });

            } catch (error) {
                logger.error(`Error processing frame from ${cameraId}: ${error.message}`);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            logger.info(`Camera disconnected: ${cameraLabel || cameraId} (${socket.id})`);

            // Note: We don't clear the buffer immediately in case of reconnection
            // Buffer cleanup can be handled by a periodic cleanup job
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for camera ${cameraId}: ${error.message}`);
        });
    });

    // Periodic cleanup of inactive camera buffers (every 5 minutes)
    setInterval(() => {
        const activeCameras = videoBufferService.getActiveCameras();
        const connectedCameras = new Set();

        // Get all connected camera IDs
        io.sockets.sockets.forEach((socket) => {
            const { cameraId } = socket.handshake.query;
            if (cameraId) {
                connectedCameras.add(cameraId);
            }
        });

        // Clear buffers for disconnected cameras
        activeCameras.forEach((cameraId) => {
            if (!connectedCameras.has(cameraId)) {
                const stats = videoBufferService.getStats(cameraId);
                if (stats && stats.oldestFrameAge > 300000) { // 5 minutes
                    videoBufferService.clearBuffer(cameraId);
                    logger.info(`Cleared inactive buffer for camera: ${cameraId}`);
                }
            }
        });
    }, 300000); // 5 minutes

    logger.info('Socket.IO server initialized');

    return io;
}
