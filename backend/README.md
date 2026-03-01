# Weapon Detection Backend

Node.js backend server for real-time weapon detection system with camera streaming, ML model integration, video storage, and automated notifications.

## Features

- 🎥 **WebSocket Camera Streaming** - Real-time video frame reception from multiple cameras
- 🧠 **ML Model Integration** - Automatic weapon detection using external ML service
- 💾 **Video Buffer System** - Maintains 5-second rolling buffer per camera for pre-detection footage
- ☁️ **Cloud Storage** - Automatic video upload to Cloudinary
- 📧 **Email Notifications** - Automated alerts to authorities via Gmail SMTP
- 🗄️ **MongoDB Storage** - Persistent storage of detection events
- ⏰ **Cron Job Monitoring** - Continuous detection processing and notification delivery
- 📊 **REST API** - Endpoints for detection history and system status

## Prerequisites

- Node.js 18+ (with ES modules support)
- MongoDB (local or Atlas)
- FFmpeg (for video processing)
- Cloudinary account
- Gmail account with App Password
- ML model service (separate Python service recommended)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install FFmpeg:**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - MongoDB URI
   - Cloudinary credentials
   - Gmail SMTP settings
   - ML model endpoint
   - Email recipients

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/weapon-detection |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `EMAIL_USER` | Gmail address | - |
| `EMAIL_PASSWORD` | Gmail App Password | - |
| `EMAIL_RECIPIENTS` | Comma-separated recipient emails | - |
| `ML_MODEL_URL` | ML model endpoint | http://localhost:3005/detect |

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account → Security → 2-Step Verification → App passwords
3. Generate an app password for "Mail"
4. Use this password in `EMAIL_PASSWORD` (not your regular password)

### Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard
3. Add to `.env` file

## Usage

### Development Mode

```bash
npm run dev
```

This uses Node.js `--watch` flag for auto-restart on file changes.

### Production Mode

```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and service availability.

### Get Recent Detections
```
GET /api/detections?limit=10
```
Returns recent weapon detections.

### Get Detections by Camera
```
GET /api/detections/camera/:cameraId?limit=10
```
Returns detections for a specific camera.

### Get Camera Statistics
```
GET /api/cameras/stats
```
Returns buffer statistics for all active cameras.

### Manual Detection Processing (Testing)
```
POST /api/test/process-detections
```
Manually trigger detection processing and email sending.

## Architecture

### Video Buffer System

Each camera maintains a circular buffer of the last 5 seconds of frames:
- Frames stored: ~50 (at 10 FPS)
- When weapon detected: extracts last 5 seconds
- Converts frames to MP4 using FFmpeg
- Uploads to Cloudinary
- Stores URL in MongoDB

### Detection Flow

1. **Frame Reception** → WebSocket receives JPEG frames from frontend
2. **Buffer Storage** → Frame added to circular buffer
3. **ML Detection** → Frame sent to ML model service
4. **Weapon Detected** → If confidence > 50%:
   - Extract 5-second video from buffer
   - Convert frames to MP4
   - Upload to Cloudinary
   - Save detection record to MongoDB
5. **Cron Job** → Every minute, checks for unprocessed detections
6. **Email Notification** → Sends alert with video URL to authorities

### Cooldown System

To prevent spam:
- 10-second cooldown between detections per camera
- Prevents multiple alerts for the same incident

## ML Model Integration

The backend expects an ML model service with the following API:

**Endpoint:** `POST /detect`

**Request:**
- Headers: `Content-Type: image/jpeg`
- Body: JPEG image data

**Response:**
```json
{
  "detected": true,
  "confidence": 0.87,
  "weaponType": "handgun",
  "boundingBoxes": [...]
}
```

### Example Python ML Service (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/detect', methods=['POST'])
def detect():
    image_data = request.data
    # Run your ML model here
    result = your_model.predict(image_data)
    
    return jsonify({
        'detected': result.has_weapon,
        'confidence': result.confidence,
        'weaponType': result.weapon_type
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(port=5000)
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── index.js          # Configuration loader
│   │   └── database.js       # MongoDB connection
│   ├── models/
│   │   └── Detection.js      # Detection schema
│   ├── services/
│   │   ├── socketService.js  # WebSocket handler
│   │   ├── videoBufferService.js  # Video buffer management
│   │   ├── mlService.js      # ML model communication
│   │   ├── detectionService.js    # Detection processing
│   │   ├── cloudinaryService.js   # Video upload
│   │   └── emailService.js   # Email notifications
│   ├── jobs/
│   │   └── detectionMonitor.js    # Cron job
│   ├── utils/
│   │   ├── logger.js         # Winston logger
│   │   └── videoProcessor.js # FFmpeg utilities
│   └── server.js             # Main entry point
├── logs/                     # Log files
├── tmp/                      # Temporary video files
├── .env                      # Environment variables
├── .env.example              # Environment template
├── package.json
└── README.md
```

## Troubleshooting

### FFmpeg Not Found
```
Error: Cannot find ffmpeg
```
**Solution:** Install FFmpeg (see Installation section)

### ML Model Not Available
```
ML model service not available
```
**Solution:** Start your ML model service on the configured port (default: 5000)

### Email Not Sending
```
Email configuration error
```
**Solution:** 
- Verify Gmail App Password is correct
- Check 2FA is enabled
- Ensure `EMAIL_RECIPIENTS` is configured

### MongoDB Connection Failed
```
MongoDB connection error
```
**Solution:**
- Ensure MongoDB is running
- Check `MONGODB_URI` is correct
- For Atlas, verify network access settings

## Development

### Logs

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Testing Email

After starting the server, you can test email configuration:
```javascript
import { sendTestEmail } from './src/services/emailService.js';
await sendTestEmail();
```

## License

ISC
