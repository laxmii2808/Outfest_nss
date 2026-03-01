import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Configure backend URL - change this to your backend server URL
const BACKEND_URL = 'http://localhost:3000';

function App() {
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(null);
  const videoRefs = useRef({});
  const canvasRefs = useRef({});
  const socketRefs = useRef({});
  const streamRefs = useRef({});

  // Detect available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
          setError('No cameras found');
          return;
        }

        setCameras(videoDevices);
      } catch (err) {
        console.error('Error accessing cameras:', err);
        setError('Failed to access cameras: ' + err.message);
      }
    }

    getCameras();
  }, []);

  // Setup camera stream and WebSocket for each camera
  useEffect(() => {
    cameras.forEach(camera => {
      setupCamera(camera);
    });

    // Cleanup function
    return () => {
      cameras.forEach(camera => {
        cleanupCamera(camera.deviceId);
      });
    };
  }, [cameras]);

  const setupCamera = async (camera) => {
    try {
      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: camera.deviceId } }
      });

      // Set video element
      if (videoRefs.current[camera.deviceId]) {
        videoRefs.current[camera.deviceId].srcObject = stream;
        streamRefs.current[camera.deviceId] = stream;
      }

      // Create WebSocket connection for this camera
      const socket = io(BACKEND_URL, {
        query: {
          cameraId: camera.deviceId,
          cameraLabel: camera.label || `Camera ${camera.deviceId.slice(0, 8)}`
        }
      });

      socketRefs.current[camera.deviceId] = socket;

      socket.on('connect', () => {
        console.log(`WebSocket connected for camera: ${camera.label || camera.deviceId}`);

        // Start streaming frames
        startFrameCapture(camera.deviceId);
      });

      socket.on('disconnect', () => {
        console.log(`WebSocket disconnected for camera: ${camera.label || camera.deviceId}`);
      });

      socket.on('error', (err) => {
        console.error(`WebSocket error for camera ${camera.deviceId}:`, err);
      });

    } catch (err) {
      console.error(`Error setting up camera ${camera.deviceId}:`, err);
      setError(`Failed to setup camera: ${err.message}`);
    }
  };

  const startFrameCapture = (deviceId) => {
    const video = videoRefs.current[deviceId];
    const canvas = canvasRefs.current[deviceId];
    const socket = socketRefs.current[deviceId];

    if (!video || !canvas || !socket) return;

    const ctx = canvas.getContext('2d');

    // Capture and send frames at ~10 FPS
    const captureInterval = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and send via WebSocket
        canvas.toBlob((blob) => {
          if (blob && socket.connected) {
            blob.arrayBuffer().then(buffer => {
              socket.emit('video-frame', buffer);
            });
          }
        }, 'image/jpeg', 0.7); // JPEG with 70% quality
      }
    }, 100); // 10 FPS

    // Store interval ID for cleanup
    if (!socketRefs.current[deviceId].captureInterval) {
      socketRefs.current[deviceId].captureInterval = captureInterval;
    }
  };

  const cleanupCamera = (deviceId) => {
    // Stop video stream
    if (streamRefs.current[deviceId]) {
      streamRefs.current[deviceId].getTracks().forEach(track => track.stop());
      delete streamRefs.current[deviceId];
    }

    // Clear capture interval
    if (socketRefs.current[deviceId]?.captureInterval) {
      clearInterval(socketRefs.current[deviceId].captureInterval);
    }

    // Disconnect WebSocket
    if (socketRefs.current[deviceId]) {
      socketRefs.current[deviceId].disconnect();
      delete socketRefs.current[deviceId];
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Camera Streaming</h1>
        <p>Streaming {cameras.length} camera{cameras.length !== 1 ? 's' : ''}</p>
      </header>

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      <div className="camera-grid">
        {cameras.map((camera) => (
          <div key={camera.deviceId} className="camera-container">
            <div className="camera-header">
              <h3>{camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}</h3>
              <span className="status-indicator"></span>
            </div>
            <video
              ref={el => videoRefs.current[camera.deviceId] = el}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={el => canvasRefs.current[camera.deviceId] = el}
              style={{ display: 'none' }}
            />
          </div>
        ))}
      </div>

      {cameras.length === 0 && !error && (
        <div className="loading">
          <p>Detecting cameras...</p>
        </div>
      )}
    </div>
  );
}

export default App;
