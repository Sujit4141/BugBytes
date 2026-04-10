import time
import os
import math
import base64
import urllib.request

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "https://minewatch12.netlify.app",
    "https://minewatch15.netlify.app",
    "http://localhost:5173"
]}})

START_TIME = time.time()

# ── MediaPipe face landmarker setup ───────────────────────────────────────────
MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MODEL_PATH = "face_landmarker.task"

if not os.path.exists(MODEL_PATH):
    print("Downloading face landmarker model…")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded.")

base_options    = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
face_options    = vision.FaceLandmarkerOptions(
    base_options=base_options,
    output_face_blendshapes=True,
    output_facial_transformation_matrixes=True,
    num_faces=1,
)
face_landmarker = vision.FaceLandmarker.create_from_options(face_options)

# ── ML model ──────────────────────────────────────────────────────────────────
MODEL_FILE = "fatigue_model.pkl"
model      = joblib.load(MODEL_FILE) if os.path.exists(MODEL_FILE) else None

# ── EAR helpers ───────────────────────────────────────────────────────────────
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def _dist(a, b):
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

def eye_aspect_ratio(landmarks, indices):
    p  = [landmarks[i] for i in indices]
    v1 = _dist(p[1], p[5])
    v2 = _dist(p[2], p[4])
    h  = _dist(p[0], p[3])
    return (v1 + v2) / (2.0 * h) if h > 0 else 0.0

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return "Fatigue Detection API Running"


@app.route("/health")
def health():
    return jsonify({"status": "ok"})



@app.route("/uptime")
def uptime():
    elapsed = time.time() - START_TIME
    days    = int(elapsed // 86400)
    hours   = int((elapsed % 86400) // 3600)
    minutes = int((elapsed % 3600) // 60)
    seconds = int(elapsed % 60)
    return jsonify({
        "uptime_seconds": round(elapsed, 2),
        "uptime_human":   f"{days}d {hours}h {minutes}m {seconds}s",
        "started_at":     time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(START_TIME)),
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects JSON: { "image": "<base64-encoded JPEG/PNG without data:image/... prefix>" }
    Returns EAR values and optional ML fatigue label.
    """
    data = request.get_json(force=True)
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    try:
        img_bytes = np.frombuffer(base64.b64decode(data["image"]), dtype=np.uint8)
        frame     = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("imdecode returned None")
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {e}"}), 400

    rgb      = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result   = face_landmarker.detect(mp_image)

    if not result.face_landmarks:
        return jsonify({"face_detected": False})

    landmarks = result.face_landmarks[0]
    left_ear  = eye_aspect_ratio(landmarks, LEFT_EYE)
    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE)
    avg_ear   = (left_ear + right_ear) / 2.0

    response = {
        "face_detected": True,
        "left_ear":      round(left_ear,  4),
        "right_ear":     round(right_ear, 4),
        "avg_ear":       round(avg_ear,   4),
    }

    if model is not None:
        try:
            features = pd.DataFrame([[left_ear, right_ear, avg_ear]],
                                    columns=["left_ear", "right_ear", "avg_ear"])
            label    = model.predict(features)[0]
            response["fatigue_label"] = int(label)
        except Exception as e:
            response["ml_error"] = str(e)

    return jsonify(response)


@app.route("/predict-session", methods=["POST", "OPTIONS"])
def predict_session():
    """Called by React after a full session ends with aggregated stats."""
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data   = request.get_json(force=True)
    sample = pd.DataFrame([{
        "blink_rate":       data.get("blink_rate",       0),
        "eye_closure_time": data.get("eye_closure_time", 0),
        "head_tilt_angle":  data.get("head_tilt_angle",  0),
        "heart_rate":       data.get("heart_rate",       95),
        "shift_hours":      data.get("shift_hours",      5),
        "temperature":      data.get("temperature",      32),
        "gas_level":        data.get("gas_level",        0.03),
    }])

    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    levels        = ["Normal", "Moderate", "High"]
    fatigue_level = levels[int(model.predict(sample)[0])]

    return jsonify({
        "fatigue_level":    fatigue_level,
        "blink_rate":       round(data.get("blink_rate",       0), 2),
        "eye_closure_time": round(data.get("eye_closure_time", 0), 2),
        "head_tilt_angle":  round(data.get("head_tilt_angle",  0), 2),
    })


@app.route("/predict", methods=["POST"])
def predict():
    """Manual single prediction with all sensor features."""
    data   = request.get_json(force=True)
    sample = pd.DataFrame([{
        "blink_rate":       data.get("blink_rate",       0),
        "eye_closure_time": data.get("eye_closure_time", 0),
        "head_tilt_angle":  data.get("head_tilt_angle",  0),
        "heart_rate":       data.get("heart_rate",       0),
        "shift_hours":      data.get("shift_hours",      0),
        "temperature":      data.get("temperature",      0),
        "gas_level":        data.get("gas_level",        0),
    }])

    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    levels = ["Normal", "Moderate", "High"]
    return jsonify({"fatigue_level": levels[int(model.predict(sample)[0])]})


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)