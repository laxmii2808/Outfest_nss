# Outfest Dynamic Surveillance Backend

This backend handles dynamic camera surveillance using RTSP streams, 5-second segmentation via FFmpeg, ML inference integration, MongoDB logging, and real-time alerts using Socket.io.
## Architecture Overview

Frontend (Socket: addCamera)
        ↓
Node Backend
        ↓
FFmpeg (5-sec segmentation)
        ↓
Send segment to ML Service
        ↓
If ML = 1
    → Store clip
    → Save metadata in MongoDB
    → Emit socket alert
If ML = 0
    → Delete clip

---

## Project Structure

backend/
│
├── controllers/
│   └── cameraController.js
│
├── models/
│   └── Event.js
│
├── routes/
│   └── cameraRoutes.js
│
├── services/
│   ├── streamService.js
│   └── inferenceService.js
│
├── storage/
│   ├── temp/        (Temporary 5-sec segments)
│   └── events/      (Suspicious videos stored here)
│
├── server.js
└── package.json

---

## Requirements

- Node.js v18+
- MongoDB running locally
- FFmpeg installed and added to PATH

Verify FFmpeg:

npm install
Dependencies used:

- express
- mongoose
- socket.io
- fluent-ffmpeg
- chokidar
- axios
- cors
- form-data

---

## Setup MongoDB

Make sure MongoDB is running:
Default connection used:

mongodb://127.0.0.1:27017/surveillance
npm start


Development mode (auto restart):



npm run dev


Server runs on:
http://localhost:5000

## Adding Camera (Socket Method)

Frontend emits:

javascript
socket.emit("addCamera", {
  cameraId: "cam1",
  rtspUrl: "rtsp://username:password@ip:554/stream"
})
ML Integration
Backend sends each 5-second segment to ML:
POST http://localhost:8000/predict
ML must return:
{
  "label": 0 or 1,
  "confidence": 0.92
}


If label = 1:
Video moved to storage/events/
Metadata saved in MongoDB
Alert emitted via socket

If label = 0:
Segment deleted

Event Model
Stored fields:
cameraId
timestamp
confidence
label
duration
fileName
filePath
fileSize

Real-Time Alerts

Frontend listens:

socket.on("suspiciousAlert", (data) => {
  console.log("Suspicious Activity Detected:", data)
})

📂 Video Access

Suspicious videos available at:

http://localhost:5000/videos/<filename>

⚠️ Important Notes

Do not stream frames over socket (inefficient).

FFmpeg handles segmentation efficiently.

Redis is not required.

Backend does not perform ML logic.

ML service only returns prediction.

🔧 Future Improvements

Stop camera endpoint

Camera status tracking

Clip auto-cleanup

Multi-camera scaling optimization

Authentication layer

👩‍💻 Author

Laxmi
Dynamic Surveillance Backend


---

# 🎯 What This README Achieves

✔ Explains architecture  
✔ Explains folder structure  
✔ Explains how to run  
✔ Explains ML contract  
✔ Explains socket usage  
✔ Professional and clean  

---

Now do:

1. Create `README.md`
2. Paste this
3. Commit and push

If you want, I can also give a more “GitHub professional” version with badges and diagrams.
