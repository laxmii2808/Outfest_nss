import mongoose from 'mongoose';

const detectionSchema = new mongoose.Schema({
    cameraId: {
        type: String,
        required: true,
        index: true,
    },
    cameraLabel: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    videoUrl: {
        type: String,
        required: true,
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
    },
    weaponType: {
        type: String,
        default: 'unknown',
    },
    notificationSent: {
        type: Boolean,
        default: false,
        index: true,
    },
    processed: {
        type: Boolean,
        default: false,
        index: true,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});


detectionSchema.index({ processed: 1, notificationSent: 1 });

export const Detection = mongoose.model('Detection', detectionSchema);
