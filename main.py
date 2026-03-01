import os
import cv2
import numpy as np
import torch
from flask import Flask, request, jsonify
from ultralytics import YOLO

os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

app = Flask(__name__)

device = "mps" if torch.backends.mps.is_available() else "cpu"
model_path = "best.pt"
if not os.path.exists(model_path):
    model_path = "yolo11n.pt"

print(f"Loading model: {model_path} on {device}")
model = YOLO(model_path)

@app.route('/detect', methods=['POST'])
def detect():
    try:
        file = request.data
        if not file:
            return jsonify({'error': 'No image data received'}), 400

        nparr = np.frombuffer(file, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400


        results = model(frame, device=device, verbose=False)

        detections = []
        detected = False
        max_conf = 0
        weapon_type = "unknown"

        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[class_id]
                if conf > 0.75:
                    detected = True
                    if conf > max_conf:
                        max_conf = conf
                        weapon_type = label
                    
                    detections.append({
                        'label': label,
                        'confidence': conf,
                        'box': box.xyxy[0].tolist() 
                    })

        return jsonify({
            'detected': detected,
            'confidence': max_conf,
            'weaponType': weapon_type,
            'boundingBoxes': detections
        })

    except Exception as e:
        print(f"Error during detection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model': model_path,
        'device': device
    })
    print("--- ML Model Service Running on http://localhost:3005 ---")
    app.run(host='0.0.0.0', port=3005)