import time
import os
import urllib.request
import math

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# ── App setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "https://minewatch12.netlify.app",
    "http://localhost:5173"
]}})

START_TIME = time.time()

# ── MediaPipe face landmarker setup ──────────────────────────────────────────
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

# ── ML model ─────────────────────────────────────────────────────────────────
MODEL_FILE = "fatigue_model.pkl"
clf        = joblib.load(MODEL_FILE) if os.path.exists(MODEL_FILE) else None

# ── EAR helpers ──────────────────────────────────────────────────────────────
# MediaPipe 478-landmark indices for left / right eye
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def _dist(a, b):
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

def eye_aspect_ratio(landmarks, indices):
    p = [landmarks[i] for i in indices]
    # vertical distances
    v1 = _dist(p[1], p[5])
    v2 = _dist(p[2], p[4])
    # horizontal distance
    h  = _dist(p[0], p[3])
    return (v1 + v2) / (2.0 * h) if h > 0 else 0.0

# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/uptime")
def uptime():
    elapsed = time.time() - START_TIME
    return jsonify({
        "uptime_seconds": round(elapsed, 2),
        "uptime_human":   f"{int(elapsed // 3600)}h {int((elapsed % 3600) // 60)}m",
    })


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects a JSON body:
    {
        "image": "<base64-encoded JPEG/PNG string>"   // without data:image/... prefix
    }
    Returns EAR values, blink-related flags, and optionally an ML fatigue label.
    """
    data = request.get_json(force=True)
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    # Decode base64 → numpy array
    try:
        img_bytes = np.frombuffer(
            __import__("base64").b64decode(data["image"]), dtype=np.uint8
        )
        frame = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("imdecode returned None")
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {e}"}), 400

    # Convert BGR → RGB for MediaPipe
    rgb      = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = face_landmarker.detect(mp_image)

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

    # Optional ML prediction
    if clf is not None:
        try:
            features = pd.DataFrame([[left_ear, right_ear, avg_ear]],
                                    columns=["left_ear", "right_ear", "avg_ear"])
            label    = clf.predict(features)[0]
            response["fatigue_label"] = int(label)
        except Exception as e:
            response["ml_error"] = str(e)

    return jsonify(response)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)