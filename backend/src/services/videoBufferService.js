import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * VideoBufferService manages rolling video buffers for each camera
 * Maintains the last 5 seconds of frames to enable saving footage before detection
 */
class VideoBufferService {
    constructor() {
        this.buffers = new Map(); // cameraId -> circular buffer of frames
        this.bufferDuration = config.video.bufferDuration; // 5000ms
        this.fps = config.video.fps; // 10 fps
        this.maxFrames = Math.ceil((this.bufferDuration / 1000) * this.fps); // 50 frames
    }

    /**
     * Initialize buffer for a camera
     */
    initBuffer(cameraId, cameraLabel) {
        if (!this.buffers.has(cameraId)) {
            this.buffers.set(cameraId, {
                cameraLabel,
                frames: [],
                currentIndex: 0,
            });
            logger.info(`Initialized video buffer for camera: ${cameraLabel} (${cameraId})`);
        }
    }

    /**
     * Add a frame to the buffer (circular buffer implementation)
     */
    addFrame(cameraId, frameData) {
        const buffer = this.buffers.get(cameraId);
        if (!buffer) {
            logger.warn(`No buffer found for camera: ${cameraId}`);
            return;
        }

        const frame = {
            data: frameData,
            timestamp: Date.now(),
        };

        // Circular buffer: overwrite oldest frame when full
        if (buffer.frames.length < this.maxFrames) {
            buffer.frames.push(frame);
        } else {
            buffer.frames[buffer.currentIndex] = frame;
            buffer.currentIndex = (buffer.currentIndex + 1) % this.maxFrames;
        }
    }

    /**
     * Get the last N seconds of frames
     */
    getFrames(cameraId, durationMs = this.bufferDuration) {
        const buffer = this.buffers.get(cameraId);
        if (!buffer || buffer.frames.length === 0) {
            logger.warn(`No frames available for camera: ${cameraId}`);
            return [];
        }

        const now = Date.now();
        const cutoffTime = now - durationMs;

        // Get frames in chronological order
        const orderedFrames = [
            ...buffer.frames.slice(buffer.currentIndex),
            ...buffer.frames.slice(0, buffer.currentIndex),
        ];

        // Filter frames within the time window
        return orderedFrames
            .filter(frame => frame.timestamp >= cutoffTime)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get camera label
     */
    getCameraLabel(cameraId) {
        return this.buffers.get(cameraId)?.cameraLabel || cameraId;
    }

    /**
     * Clear buffer for a camera
     */
    clearBuffer(cameraId) {
        if (this.buffers.has(cameraId)) {
            this.buffers.delete(cameraId);
            logger.info(`Cleared buffer for camera: ${cameraId}`);
        }
    }

    /**
     * Get buffer statistics
     */
    getStats(cameraId) {
        const buffer = this.buffers.get(cameraId);
        if (!buffer) return null;

        return {
            cameraId,
            cameraLabel: buffer.cameraLabel,
            frameCount: buffer.frames.length,
            maxFrames: this.maxFrames,
            bufferDuration: this.bufferDuration,
            oldestFrameAge: buffer.frames.length > 0
                ? Date.now() - Math.min(...buffer.frames.map(f => f.timestamp))
                : 0,
        };
    }

    /**
     * Get all active cameras
     */
    getActiveCameras() {
        return Array.from(this.buffers.keys());
    }
}

// Singleton instance
export const videoBufferService = new VideoBufferService();
