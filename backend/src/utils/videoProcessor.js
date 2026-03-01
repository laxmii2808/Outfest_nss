import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

// Explicitly set FFmpeg path if provided
if (config.ffmpeg.path) {
    ffmpeg.setFfmpegPath(config.ffmpeg.path);
}

/**
 * Convert array of frame buffers to a video file
 */
export async function framesToVideo(frames, outputPath) {
    try {
        // Create temporary directory for frames
        const tempDir = path.join(process.cwd(), 'tmp', `frames_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        // Save frames as individual images
        const framePromises = frames.map(async (frame, index) => {
            const framePath = path.join(tempDir, `frame_${String(index).padStart(5, '0')}.jpg`);
            await fs.writeFile(framePath, Buffer.from(frame.data));
            return framePath;
        });

        await Promise.all(framePromises);

        // Convert frames to video using FFmpeg
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(path.join(tempDir, 'frame_%05d.jpg'))
                .inputFPS(config.video.fps)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-preset fast',
                    '-crf 23',
                ])
                .output(outputPath)
                .on('end', async () => {
                    logger.info(`Video created successfully: ${outputPath}`);
                    // Clean up temporary frames
                    try {
                        await fs.rm(tempDir, { recursive: true, force: true });
                    } catch (err) {
                        logger.warn(`Failed to clean up temp directory: ${err.message}`);
                    }
                    resolve(outputPath);
                })
                .on('error', async (err) => {
                    logger.error(`FFmpeg error: ${err.message}`);
                    // Clean up on error
                    try {
                        await fs.rm(tempDir, { recursive: true, force: true });
                    } catch (cleanupErr) {
                        logger.warn(`Failed to clean up temp directory: ${cleanupErr.message}`);
                    }
                    reject(err);
                })
                .run();
        });
    } catch (error) {
        logger.error(`Error in framesToVideo: ${error.message}`);
        throw error;
    }
}

/**
 * Ensure tmp directory exists
 */
export async function ensureTmpDir() {
    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    return tmpDir;
}

/**
 * Clean up old temporary files
 */
export async function cleanupOldFiles(directory, maxAgeMs = 3600000) {
    try {
        const files = await fs.readdir(directory);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > maxAgeMs) {
                await fs.unlink(filePath);
                logger.debug(`Cleaned up old file: ${file}`);
            }
        }
    } catch (error) {
        logger.error(`Error cleaning up old files: ${error.message}`);
    }
}
