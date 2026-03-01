import os
import cv2
import csv
import time
import numpy as np
import torch
from datetime import datetime
from flask import Flask, request, jsonify
from ultralytics import YOLO

# ---------- OPTIONAL OCR ----------
USE_OCR = True
try:
    import easyocr
except:
    USE_OCR = False
    print("EasyOCR not installed -> Plate text disabled")

os.environ["KMP_DUPLICATE_LIB_OK"] = "True"
app = Flask(__name__)

# ---------- DEVICE ----------
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Running on: {device}")

# ---------- MODEL PATHS ----------
WEAPONS_MODEL_PATH = "weapons_best.pt"
PLATE_MODEL_PATH = "license_plate_best.pt"
SUSPICION_MODEL_PATH = "violence_non_violence.pt"

# ---------- LOAD MODELS ----------
def load_model(path, name):
    if not os.path.exists(path):
        print(f"{name} NOT FOUND -> Disabled")
        return None
    print(f"Loading {name}: {path}")
    return YOLO(path)

weapons_model = load_model(WEAPONS_MODEL_PATH, "Weapons")
plate_model = load_model(PLATE_MODEL_PATH, "Plate")
suspicion_model = load_model(SUSPICION_MODEL_PATH, "Behaviour")

# ---------- OCR ----------
ocr_reader = None
if USE_OCR and plate_model:
    try:
        ocr_reader = easyocr.Reader(["en"], gpu=False)
        print("EasyOCR loaded")
    except:
        print("EasyOCR failed -> Plate text disabled")
        ocr_reader = None

# ---------- THRESHOLDS ----------
WEAPON_CONF = 0.9
PLATE_CONF = 0.70
BEHAV_CONF = 0.80

# ---------- CSV ----------
CSV_FILE = "incidents.csv"
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline="") as f:
        csv.writer(f).writerow(["Time","Type","Label","Conf","x1","y1","x2","y2"])

def log_event(t, label, conf, box):
    with open(CSV_FILE, "a", newline="") as f:
        csv.writer(f).writerow([datetime.now(), t, label, conf, *box])

@app.route("/detect", methods=["POST"])
def detect():
    try:
        file = request.data
        frame = cv2.imdecode(np.frombuffer(file, np.uint8), cv2.IMREAD_COLOR)
        H, W = frame.shape[:2]

        # ================= WEAPONS =================
        weapon_boxes = []
        detected = False
        max_conf = 0
        weapon_type = "unknown"

        if weapons_model:
            results = weapons_model(frame, device=device, verbose=False)

            for r in results:
                names = r.names if hasattr(r, "names") else weapons_model.names
                for b in r.boxes:
                    conf = float(b.conf[0])
                    if conf < WEAPON_CONF:
                        continue

                    cls = int(b.cls[0])
                    label = names[cls]

                    detected = True
                    if conf > max_conf:
                        max_conf = conf
                        weapon_type = label

                    box = b.xyxy[0].tolist()
                    weapon_boxes.append({"label": label, "confidence": conf, "box": box})
                    log_event("WEAPON", label, conf, box)

        # ================= PLATE =================
        plate_payload = None
        if plate_model:
            plate_results = plate_model(frame, device=device, verbose=False)

            best = None
            for r in plate_results:
                for b in r.boxes:
                    conf = float(b.conf[0])
                    if conf < PLATE_CONF:
                        continue

                    box = [int(x) for x in b.xyxy[0].tolist()]
                    crop = frame[box[1]:box[3], box[0]:box[2]]

                    text = "DETECTED"
                    if ocr_reader and crop.size > 0:
                        try:
                            o = ocr_reader.readtext(crop)
                            if o:
                                text = o[0][1]
                        except:
                            pass

                    if not best or conf > best[0]:
                        best = (conf, box, text)

            if best:
                plate_payload = {"text": best[2], "confidence": best[0], "box": best[1]}
                print("Plate detected:", plate_payload)
                log_event("PLATE", best[2], best[0], best[1])

        # ================= BEHAVIOUR =================
        suspicious_payload = []
        if suspicion_model:
            beh_results = suspicion_model(frame, device=device, verbose=False)

            for r in beh_results:
                names = r.names if hasattr(r, "names") else suspicion_model.names

                for b in r.boxes:
                    conf = float(b.conf[0])
                    if conf < BEHAV_CONF:
                        continue

                    cls = int(b.cls[0])
                    label = str(names[cls]).lower()

                    # Ignore normal
                    if label == "normal":
                        continue

                    box = b.xyxy[0].tolist()
                    suspicious_payload.append({
                        "label": label,
                        "confidence": conf,
                        "box": box
                    })

                    print("Behaviour detected:", label, conf)
                    log_event("BEHAVIOUR", label, conf, box)

        return jsonify({
            "detected": detected,
            "confidence": float(max_conf),
            "weaponType": weapon_type,
            "boundingBoxes": weapon_boxes,
            "plate": plate_payload,
            "suspicious": suspicious_payload
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# ======================================================
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "device": device,
        "weapons_model": bool(weapons_model),
        "plate_model": bool(plate_model),
        "behaviour_model": bool(suspicion_model)
    })

# ======================================================
if __name__ == "__main__":
    print("Server running -> http://localhost:3005")
    app.run(host="0.0.0.0", port=3005)