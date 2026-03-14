from flask import Flask, request, jsonify
import joblib
import pandas as pd
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.components import containers
import urllib.request
import os
import math

app = Flask(__name__)

# ----------------------------
# Load ML model
# ----------------------------
try:
    model = joblib.load("fatigue_model.pkl")
except FileNotFoundError:
    raise Exception("fatigue_model.pkl not found.")

# ----------------------------
# Download MediaPipe Face Landmarker model
# ----------------------------
LANDMARK_MODEL_PATH = "face_landmarker.task"
if not os.path.exists(LANDMARK_MODEL_PATH):
    print("Downloading Face Landmarker model...")
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        LANDMARK_MODEL_PATH
    )
    print("Downloaded.")

# ----------------------------
# Setup Face Landmarker
# Gives 468 landmarks — real eye/nose/chin points
# ----------------------------
base_options = mp_python.BaseOptions(model_asset_path=LANDMARK_MODEL_PATH)
landmarker_options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    output_face_blendshapes=True,       # gives us eyeBlink scores directly
    output_facial_transformation_matrixes=True,  # gives real head pose
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5
)
face_landmarker = vision.FaceLandmarker.create_from_options(landmarker_options)

# ----------------------------
# EAR — Eye Aspect Ratio
# Real blink metric using 6 eye landmark points
#
#        p2  p3
#   p1           p4
#        p6  p5
#
# EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
# Low EAR = eye closed
# ----------------------------

# MediaPipe Face Mesh eye landmark indices
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def compute_ear(landmarks, eye_indices, img_w, img_h):
    pts = []
    for idx in eye_indices:
        lm = landmarks[idx]
        pts.append((lm.x * img_w, lm.y * img_h))

    # Vertical distances
    A = math.dist(pts[1], pts[5])
    B = math.dist(pts[2], pts[4])
    # Horizontal distance
    C = math.dist(pts[0], pts[3])

    ear = (A + B) / (2.0 * C)
    return ear

EAR_THRESHOLD = 0.21   # below this = eye closed
BLINK_CONSEC_FRAMES = 2  # needs 2 consecutive closed frames = blink

# ----------------------------
# Head tilt using facial transformation matrix
# Returns pitch (up/down), yaw (left/right), roll (tilt) in degrees
# ----------------------------
def compute_head_pose(transformation_matrix):
    mat = np.array(transformation_matrix.data).reshape(4, 4)
    R = mat[:3, :3]

    # Extract Euler angles from rotation matrix
    sy = math.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
    singular = sy < 1e-6

    if not singular:
        pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
        yaw   = math.degrees(math.atan2(-R[2, 0], sy))
        roll  = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    else:
        pitch = math.degrees(math.atan2(-R[1, 2], R[1, 1]))
        yaw   = math.degrees(math.atan2(-R[2, 0], sy))
        roll  = 0

    return pitch, yaw, roll

# ----------------------------
# Analyze a single frame
# Returns: face_detected, left_ear, right_ear, pitch, yaw, roll,
#          eye_blink_left (blendshape score), eye_blink_right
# ----------------------------
def analyze_frame(frame):
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    results = face_landmarker.detect(mp_image)

    if not results.face_landmarks:
        return False, 0, 0, 0, 0, 0, 0, 0

    landmarks = results.face_landmarks[0]

    # EAR for both eyes
    left_ear  = compute_ear(landmarks, LEFT_EYE,  w, h)
    right_ear = compute_ear(landmarks, RIGHT_EYE, w, h)

    # Blendshape blink scores (0.0 - 1.0, higher = more closed)
    blink_left  = 0
    blink_right = 0
    if results.face_blendshapes:
        for bs in results.face_blendshapes[0]:
            if bs.category_name == "eyeBlinkLeft":
                blink_left = bs.score
            elif bs.category_name == "eyeBlinkRight":
                blink_right = bs.score

    # Head pose
    pitch, yaw, roll = 0, 0, 0
    if results.facial_transformation_matrixes:
        pitch, yaw, roll = compute_head_pose(
            results.facial_transformation_matrixes[0]
        )

    return True, left_ear, right_ear, pitch, yaw, roll, blink_left, blink_right


# ----------------------------
# Camera session route
# ----------------------------
@app.route("/camera-detect", methods=["GET"])
def camera_detect():

    # Optional sensor params from query string
    heart_rate  = float(request.args.get("heart_rate",  95))
    shift_hours = float(request.args.get("shift_hours", 5))
    temperature = float(request.args.get("temperature", 32))
    gas_level   = float(request.args.get("gas_level",   0.03))

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return jsonify({"error": "Camera not accessible"})

    frame_data = []
    blink_count = 0
    consec_closed = 0          # consecutive frames with closed eyes
    total_closed_frames = 0    # for eye_closure_time
    start_time = cv2.getTickCount()

    print("Camera started. Press Q to stop and analyze.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        result = analyze_frame(frame)
        (face_detected, left_ear, right_ear,
         pitch, yaw, roll, blink_left, blink_right) = result

        avg_ear = (left_ear + right_ear) / 2.0
        eyes_closed = avg_ear < EAR_THRESHOLD and face_detected

        # Count blinks (closed → open transition)
        if eyes_closed:
            consec_closed += 1
            total_closed_frames += 1
        else:
            if consec_closed >= BLINK_CONSEC_FRAMES:
                blink_count += 1
            consec_closed = 0

        frame_data.append({
            "face_detected": face_detected,
            "left_ear": left_ear,
            "right_ear": right_ear,
            "avg_ear": avg_ear,
            "pitch": pitch,
            "yaw": yaw,
            "roll": roll,
            "eyes_closed": eyes_closed,
            "blink_score_left": blink_left,
            "blink_score_right": blink_right
        })

        # --- Live overlay ---
        h_frame, w_frame, _ = frame.shape

        # EAR bar
        ear_color = (0, 0, 255) if eyes_closed else (0, 255, 0)
        cv2.putText(frame, f"EAR: {avg_ear:.2f}",
                    (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, ear_color, 2)

        # Head pose
        cv2.putText(frame, f"Pitch:{pitch:.1f} Yaw:{yaw:.1f} Roll:{roll:.1f}",
                    (30, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

        # Blink count
        cv2.putText(frame, f"Blinks: {blink_count}",
                    (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

        # Face status
        face_text = "Face: YES" if face_detected else "Face: NO"
        cv2.putText(frame, face_text,
                    (30, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (0, 255, 0) if face_detected else (0, 0, 255), 2)

        cv2.putText(frame, "Press Q to analyze",
                    (30, h_frame - 20), cv2.FONT_HERSHEY_SIMPLEX,
                    0.6, (200, 200, 200), 1)

        cv2.imshow("Fatigue Detection - Recording", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Session end
    end_time = cv2.getTickCount()
    session_seconds = (end_time - start_time) / cv2.getTickFrequency()

    cap.release()
    cv2.destroyAllWindows()

    if not frame_data:
        return jsonify({"error": "No frames captured"})

    total_frames = len(frame_data)
    face_frames  = [f for f in frame_data if f["face_detected"]]

    # --- Compute aggregated metrics ---

    # Blink rate per minute
    blink_rate = (blink_count / session_seconds) * 60 if session_seconds > 0 else 0

    # Eye closure time in seconds
    fps_estimate = total_frames / session_seconds if session_seconds > 0 else 30
    eye_closure_time = total_closed_frames / fps_estimate

    # Head tilt = mean absolute roll (side tilt most relevant for fatigue)
    if face_frames:
        avg_roll  = np.mean([abs(f["roll"])  for f in face_frames])
        avg_pitch = np.mean([f["pitch"]      for f in face_frames])
        avg_yaw   = np.mean([abs(f["yaw"])   for f in face_frames])
        avg_ear   = np.mean([f["avg_ear"]    for f in face_frames])
    else:
        avg_roll = avg_pitch = avg_yaw = avg_ear = 0

    print(f"\nSession: {session_seconds:.1f}s | Frames: {total_frames}")
    print(f"Blinks: {blink_count} | Blink Rate: {blink_rate:.1f}/min")
    print(f"Eye Closure Time: {eye_closure_time:.2f}s")
    print(f"Avg EAR: {avg_ear:.3f}")
    print(f"Head Pose — Roll: {avg_roll:.1f}° | Pitch: {avg_pitch:.1f}° | Yaw: {avg_yaw:.1f}°")

    # --- Predict ---
    sample = pd.DataFrame([{
        "blink_rate":        round(blink_rate, 2),
        "eye_closure_time":  round(eye_closure_time, 2),
        "head_tilt_angle":   round(avg_roll, 2),
        "heart_rate":        heart_rate,
        "shift_hours":       shift_hours,
        "temperature":       temperature,
        "gas_level":         gas_level
    }])

    prediction = model.predict(sample)
    levels = ["Normal", "Moderate", "High"]
    fatigue_level = levels[int(prediction[0])]

    print(f"Fatigue Level: {fatigue_level}")

    return jsonify({
        "fatigue_level":             fatigue_level,
        "session_duration_seconds":  round(session_seconds, 2),
        "total_frames":              total_frames,
        "blink_count":               blink_count,
        "blink_rate_per_min":        round(blink_rate, 2),
        "eye_closure_time_seconds":  round(eye_closure_time, 2),
        "avg_ear":                   round(avg_ear, 3),
        "avg_head_roll_deg":         round(avg_roll, 2),
        "avg_head_pitch_deg":        round(avg_pitch, 2),
        "avg_head_yaw_deg":          round(avg_yaw, 2)
    })


# ----------------------------
# Manual prediction route
# ----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    sample = pd.DataFrame([{
        "blink_rate":       data.get("blink_rate", 0),
        "eye_closure_time": data.get("eye_closure_time", 0),
        "head_tilt_angle":  data.get("head_tilt_angle", 0),
        "heart_rate":       data.get("heart_rate", 0),
        "shift_hours":      data.get("shift_hours", 0),
        "temperature":      data.get("temperature", 0),
        "gas_level":        data.get("gas_level", 0)
    }])
    prediction = model.predict(sample)
    levels = ["Normal", "Moderate", "High"]
    return jsonify({"fatigue_level": levels[int(prediction[0])]})


@app.route("/")
def home():
    return "Fatigue Detection API Running"


if __name__ == "__main__":
    app.run(port=5000)
