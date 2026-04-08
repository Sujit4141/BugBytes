# 🪨 MineWatch — AI-Based Fatigue Monitoring System
### Team Bug Bytes

![Status](https://img.shields.io/badge/Status-Prototype-brightgreen)
![AI/ML](https://img.shields.io/badge/AI-ML-blue)
![React](https://img.shields.io/badge/Frontend-React+Vite-61dafb)
![Flask](https://img.shields.io/badge/Backend-Flask-black)
![MediaPipe](https://img.shields.io/badge/Vision-MediaPipe-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

> **Real-time fatigue detection for coal mine workers using computer vision, machine learning, and sensor fusion.**

---

## 📋 Table of Contents
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [ML Model](#-ml-model)
- [Impact & Future Vision](#-impact--future-vision)
- [Team](#-team)

---

## 🚨 Problem Statement

Coal mine workers face extreme conditions every single day:

| Problem | Impact |
|---|---|
| Shifts longer than 8 hours underground | Cognitive fatigue builds undetected |
| Fatigue impairs judgment by 40%+ | Reaction time becomes dangerously slow |
| Manual supervision covers <30% of workers | Most workers go unmonitored |
| **52% of mining accidents are fatigue-related** | Lives are lost preventably |

**The gap:** Current systems rely on manual checks and self-reporting. There is no real-time, automated way to detect worker fatigue *before* it causes an accident.

> ⚡ **We need a system that detects fatigue before accidents happen.**

---

## 💡 Solution

MineWatch is an AI-powered fatigue monitoring system that continuously analyzes worker state using:

- 📷 **Webcam-based computer vision** — eye tracking, blink rate, head pose
- 🧠 **Machine learning** — Decision Tree classifier trained on real fatigue data
- 🌡️ **Environmental sensor fusion** — temperature, gas levels, heart rate, shift hours
- ⚡ **Reaction time testing** — cognitive performance measurement
- 🚨 **3-level alert system** — Normal → Moderate → High Risk

### System Flow

```
Worker sits at station
        ↓
Webcam captures face @ 8fps
        ↓
Base64 frames → Flask API
        ↓
MediaPipe extracts 478 facial landmarks
        ↓
EAR + Blink Rate + Head Pose computed
        ↓
Combined with sensor data (HR, temp, gas, shift hours)
        ↓
Decision Tree → Fatigue Level (Normal / Moderate / High)
        ↓
Alert shown on screen + supervisor notified
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  Vercel · react-router · Webcam · Canvas API            │
└──────────────────────┬──────────────────────────────────┘
                       │  POST /analyze-frame (base64 JPEG)
                       │  POST /predict-session (sensor data)
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (Flask API)                     │
│  Render · Gunicorn · Docker · Python 3.9               │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  MediaPipe  │───▶│  EAR + Pose  │───▶│  ML Model │  │
│  │  FaceMesh   │    │  Calculator  │    │  .pkl     │  │
│  └─────────────┘    └──────────────┘    └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Tech | Purpose |
|---|---|
| React 18 + Vite | UI framework |
| react-router v6 | Client-side routing |
| Canvas API | Frame capture from webcam |
| Oswald + Barlow fonts | Industrial UI aesthetic |
| Vercel | Deployment |

### Backend
| Tech | Purpose |
|---|---|
| Flask 2.3.3 | REST API framework |
| MediaPipe 0.10.8 | Face landmark detection (478 points) |
| scikit-learn 1.6.1 | Decision Tree classifier |
| OpenCV (headless) | Image processing |
| pandas 2.2.2 | Feature dataframe construction |
| Gunicorn | Production WSGI server |
| Docker | Containerized deployment |
| Render | Cloud deployment |

---

## ✨ Key Features

### 👁️ Eye Aspect Ratio (EAR) Detection
Calculates EAR from 6 MediaPipe landmarks per eye using the formula:
```
EAR = (|p2-p6| + |p3-p5|) / (2 × |p1-p4|)
```
- EAR < **0.21** = eyes closed
- Tracks both left and right eye independently
- Real-time visual bar shown on screen during scan

### 🔁 Blink Rate Tracking
- Counts blinks per minute throughout the 20-second session
- Requires **2+ consecutive closed frames** to register a blink (avoids false positives)
- Abnormal blink rate (too high or too low) indicates fatigue

### 📐 Head Pose Estimation
- Extracts **pitch, yaw, roll** from 4×4 facial transformation matrix
- Head tilt angle = average absolute roll over session
- Drooping head = strong fatigue signal

### ⚡ Reaction Time Test
4-round colour-flash cognitive test:
| Score | Rating |
|---|---|
| < 200ms | Excellent |
| 200–299ms | Good |
| 300–399ms | Moderate |
| ≥ 400ms | SLOW — Fatigue Risk |

### 🌡️ Environmental Sensor Fusion
Manual inputs combined with vision data:
- Heart Rate (bpm)
- Shift Hours (hrs)
- Pit Temperature (°C)
- Gas Level (ppm)

### 🚨 3-Level Alert System
| Level | Color | Action |
|---|---|---|
| ● NORMAL | 🟢 Green | Continue operations |
| ◆ MODERATE | 🟡 Amber | Schedule immediate break |
| ▲ HIGH RISK | 🔴 Red | STOP — Report to supervisor |

---

## ⚙️ How It Works

1. Worker enters shift data (heart rate, hours, temperature, gas level)
2. Camera activates — system streams frames every **120ms (≈8fps)**
3. Each frame is base64-encoded and sent to `/analyze-frame`
4. Flask decodes frame → MediaPipe detects face → EAR + head pose computed
5. Session runs for **20 seconds**, collecting blink count, closure time, tilt angle
6. At session end, all 7 features sent to `/predict-session`
7. Decision Tree model returns fatigue classification
8. Result displayed with recommended action

---

## 📡 API Reference

**Base URL:** `https://fatigue-backend-pijd.onrender.com`

> ⚠️ Free tier — server may take 50s+ to wake up on first request.

### `GET /`
Health check / server wake ping.
```
Response: "Fatigue Detection API Running"
```

### `POST /analyze-frame`
Analyze a single webcam frame in real-time.

**Request:**
```json
{
  "image": "<base64 encoded JPEG string>"
}
```

**Response:**
```json
{
  "face_detected": true,
  "left_ear": 0.312,
  "right_ear": 0.298,
  "avg_ear": 0.305,
  "eyes_closed": false,
  "pitch": -2.14,
  "yaw": 1.08,
  "roll": 0.93,
  "blink_score_left": 0.031,
  "blink_score_right": 0.027
}
```

### `POST /predict-session`
Final fatigue prediction after a full 20-second session.

**Request:**
```json
{
  "blink_rate": 18.5,
  "eye_closure_time": 0.42,
  "head_tilt_angle": 3.21,
  "heart_rate": 95,
  "shift_hours": 5,
  "temperature": 32,
  "gas_level": 0.03
}
```

**Response:**
```json
{
  "fatigue_level": "Normal",
  "blink_rate": 18.5,
  "eye_closure_time": 0.42,
  "head_tilt_angle": 3.21
}
```

### `POST /predict`
Manual prediction without vision (all fields provided manually).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- Webcam access

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/minewatch.git
cd minewatch/backend

# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py
# Server starts at http://localhost:5000
```

### Frontend Setup
```bash
cd minewatch/frontend

# Install packages
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Production build
npm run build
```

### Environment
Set the API URL in `Detect.jsx`:
```js
const API = "http://localhost:5000"; // local
// or
const API = "https://fatigue-backend-pijd.onrender.com"; // production
```

### `requirements.txt`
```
Flask==2.3.3
flask-cors==4.0.0
joblib==1.3.2
pandas==2.2.2
numpy==2.0.0
opencv-python-headless==4.8.1.78
mediapipe==0.10.8
scikit-learn==1.6.1
gunicorn==21.2.0
```

### `vercel.json` (required for react-router)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## 📁 Project Structure

```
minewatch/
├── backend/
│   ├── app.py                  # Flask API — all routes
│   ├── fatigue_model.pkl       # Trained Decision Tree model
│   ├── fatigue_dataset.csv     # Training dataset
│   ├── face_landmarker.task    # MediaPipe model file
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Container config
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx            # App entry + routes
│   │   ├── Homepage.jsx        # Landing page
│   │   ├── Detect.jsx          # Main fatigue scan page
│   │   └── App.jsx             # App wrapper
│   ├── public/
│   ├── vercel.json             # Vercel routing config
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🤖 ML Model

| Property | Value |
|---|---|
| Algorithm | Decision Tree Classifier |
| Library | scikit-learn 1.6.1 |
| Serialization | joblib |
| Input features | 7 |
| Output classes | 3 |
| File | `fatigue_model.pkl` |

### Input Features
| Feature | Source | Unit |
|---|---|---|
| `blink_rate` | Computer Vision | blinks/min |
| `eye_closure_time` | Computer Vision | seconds |
| `head_tilt_angle` | Computer Vision | degrees |
| `heart_rate` | Manual Input | bpm |
| `shift_hours` | Manual Input | hours |
| `temperature` | Manual Input | °C |
| `gas_level` | Manual Input | ppm |

### Output Classes
- `0` → Normal
- `1` → Moderate
- `2` → High Risk

---

## 🌍 Impact & Future Vision

### Current Impact (Prototype)
- ✅ Real-time fatigue detection with zero additional hardware (just webcam)
- ✅ 20-second non-intrusive scan
- ✅ Works in low-light mine environments
- ✅ Reaction time cognitive test as secondary check

### Roadmap
- [ ] **ESP32 integration** — wearable heart rate + gas sensor hardware
- [ ] **Dashboard** — supervisor view with all workers' fatigue status
- [ ] **Historical logging** — fatigue trends over shifts and weeks
- [ ] **Alert system** — SMS/buzzer alert to supervisor on High Risk
- [ ] **Offline mode** — edge inference on-device for no-internet mine environments
- [ ] **Helmet integration** — camera embedded in safety helmet

### Revenue Model
| Tier | Target | Price |
|---|---|---|
| Basic | Small mines (<50 workers) | ₹15,000/month |
| Pro | Mid-size operations | ₹40,000/month |
| Enterprise | Large corporations | Custom pricing |
| Hardware Kit | ESP32 + sensors | ₹8,000/unit |

---

## 👥 Team

**Team Bug Bytes**

| Member | Role |
|---|---|
| Sujit Kumar Verma | Full Stack Development + ML Integration |
| Pratik Kumar | Backend + Model Training |
| Sujit Kumar | Frontend + UI/UX Design |

---

## 📄 License

MIT License — free to use, modify, and distribute with attribution.

---

<div align="center">

**Built with ❤️ by Team Bug Bytes**

*MineWatch — Because every miner deserves to come home safe.*

</div>
