import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { initializeSocketServer } from './services/socketService.js';
import { startDetectionMonitor } from './jobs/detectionMonitor.js';
import { verifyEmailConfig } from './services/emailService.js';
import { checkMLModelHealth } from './services/mlService.js';
import { getRecentDetections, getDetectionsByCamera } from './services/detectionService.js';
import { videoBufferService } from './services/videoBufferService.js';
import { processUnprocessedDetections } from './jobs/detectionMonitor.js';

// Create Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const mlHealth = await checkMLModelHealth();

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                mlModel: mlHealth.available ? 'available' : 'unavailable',
                email: config.email.user ? 'configured' : 'not configured',
            },
            activeCameras: videoBufferService.getActiveCameras().length,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
});

// Get recent detections
app.get('/api/detections', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const detections = await getRecentDetections(limit);

        res.json({
            success: true,
            count: detections.length,
            detections,
        });
    } catch (error) {
        logger.error(`Error fetching detections: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Get detections by camera
app.get('/api/detections/camera/:cameraId', async (req, res) => {
    try {
        const { cameraId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const detections = await getDetectionsByCamera(cameraId, limit);

        res.json({
            success: true,
            cameraId,
            count: detections.length,
            detections,
        });
    } catch (error) {
        logger.error(`Error fetching detections: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Get buffer stats for all cameras
app.get('/api/cameras/stats', (req, res) => {
    try {
        const cameras = videoBufferService.getActiveCameras();
        const stats = cameras.map(cameraId => videoBufferService.getStats(cameraId));

        res.json({
            success: true,
            count: cameras.length,
            cameras: stats,
        });
    } catch (error) {
        logger.error(`Error fetching camera stats: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// Manual trigger for processing detections (for testing)
app.post('/api/test/process-detections', async (req, res) => {
    try {
        const result = await processUnprocessedDetections();
        res.json(result);
    } catch (error) {
        logger.error(`Error processing detections: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});

// Initialize server
async function startServer() {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Verify email configuration
        const emailVerified = await verifyEmailConfig();
        if (!emailVerified) {
            logger.warn('Email configuration could not be verified. Notifications may not work.');
        }

        // Check ML model availability
        const mlHealth = await checkMLModelHealth();
        if (!mlHealth.available) {
            logger.warn('ML model service is not available. Detection will not work until ML service is started.');
        } else {
            logger.info('ML model service is available');
        }

        // Initialize Socket.IO
        initializeSocketServer(httpServer);

        // Start detection monitor cron job
        startDetectionMonitor();

        // Start HTTP server
        httpServer.listen(config.server.port, () => {
            logger.info(`Server running on port ${config.server.port}`);
            logger.info(`Environment: ${config.server.nodeEnv}`);
            logger.info(`WebSocket endpoint: ws://localhost:${config.server.port}`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();
