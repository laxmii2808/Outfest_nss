import dotenv from 'dotenv';

dotenv.config();

export const config = {
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/weapon-detection',
    },

    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },

    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM,
        recipients: process.env.EMAIL_RECIPIENTS?.split(',') || [],
    },

    mlModel: {
        url: process.env.ML_MODEL_URL || 'http://localhost:3005/detect',
        timeout: parseInt(process.env.ML_MODEL_TIMEOUT || '5000'),
    },

    video: {
        bufferDuration: parseInt(process.env.VIDEO_BUFFER_DURATION || '5000'), // 5 seconds
        fps: parseInt(process.env.VIDEO_FPS || '10'),
        quality: parseFloat(process.env.VIDEO_QUALITY || '0.7'),
    },

    cron: {
        detectionSchedule: process.env.DETECTION_CRON_SCHEDULE || '* * * * *', // Every minute
    },
    ffmpeg: {
        path: process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg',
    },
};
