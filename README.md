# 🚦 CivicFlow: Smart Adaptive Traffic Management System

A full-stack traffic signal control platform combining **real-time YOLOv8 vehicle detection**, a **rule-based adaptive signal controller**, and an **interactive React simulation** to optimize traffic flow at 4-way intersections.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running the Application](#running-the-application)
- [How It Works](#how-it-works)
  - [Signal Control Logic](#signal-control-logic)
  - [Simulation Mode](#simulation-mode)
  - [Video Mode](#video-mode)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Performance Metrics](#performance-metrics)

---

## Overview

This system provides two operating modes:

1. **Manual Simulation Mode** — An interactive browser-based 4-way intersection where users manually spawn vehicles (cars, bikes, trucks, buses, ambulances). The adaptive signal controller dynamically adjusts green-light durations based on real-time queue weight — no fixed timers.

2. **Video Mode** — Upload a real traffic video. The backend runs a full YOLOv8 detection and tracking pipeline, extracting a timestamped vehicle event schedule frame-by-frame. That schedule is then replayed in the frontend simulation in real time, with the adaptive controller making live green-phase decisions driven by actual video data.

After any simulation completes, a **Comparison Dashboard** displays side-by-side metrics comparing the adaptive system against a static fixed-timer baseline: average wait time, vehicles crossed, CO₂ estimate, green utilization, and ambulance wait time.

---

## Key Features

| Feature | Description |
|---|---|
| 🎥 **Video Upload & Processing** | Upload MP4 traffic videos; backend extracts per-frame vehicle detections via YOLOv8 |
| 🧠 **Adaptive Signal Controller** | Rule-based controller dynamically scales green-phase duration based on real-time vehicle queue weight |
| 🚑 **Emergency Vehicle Preemption** | Ambulance detection triggers immediate signal preemption with a proper yellow-phase transition |
| 📡 **WebSocket Live Updates** | Real-time lane counts and signal state pushed from backend to frontend after every event batch |
| 📊 **Comparison Dashboard** | Side-by-side adaptive vs. static benchmarking with Recharts bar charts and KPI cards |
| 🗺️ **Homography Support** | Bird's-eye-view lane mapping via configurable homography transform for top-down perspective |
| 🎬 **Auto Demo Scenarios** | URL-driven automated demos: `?demo=true`, `?scenario=high_traffic`, `?scenario=emergency`, `?scenario=master` |
| 📦 **Async Job System** | Video processing runs in a background thread with live job-status polling from the frontend |
| 🗃️ **SQLite Persistence** | All sessions, events, signal decisions, and results stored in a local SQLite database |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │VideoUploadPage│  │SimulationPage│  │    DashboardPage       ││
│  │              │  │              │  │  (Recharts + metrics)  ││
│  │ Upload video │  │ Tick engine  │  │                        ││
│  │ Poll job     │  │ Vehicle spawn│  │ Adaptive vs Static     ││
│  │ Start sim    │  │ WS listener  │  │ comparison             ││
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘│
│         │  REST           │  WebSocket           │ REST          │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                          │
│                                                                 │
│  Routers:  /upload  │  /jobs  │  /simulation/*                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Simulation Controller                      │   │
│  │  create_session · submit_log · get_results              │   │
│  │  get_latest_results · log_signal · get_report           │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼──────────────────┐                  │
│  │              Services Layer              │                  │
│  │  simulation_service  · results_service   │                  │
│  │  static_replay_service                   │                  │
│  └───────────────────────┬──────────────────┘                  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────┐                  │
│  │         Job Runner (Background Thread)   │                  │
│  │  run_video_pipeline_job                  │                  │
│  │  → state_extractor → video_pipeline      │                  │
│  └───────────────────────┬──────────────────┘                  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────┐                  │
│  │     Perception / Detection Layer         │                  │
│  │  YOLOv8 Detector (yolo_traffic.pt)       │                  │
│  │  StableTracker · SimpleVehicleTracker    │                  │
│  │  HomographyLaneMapper · LaneProcessor    │                  │
│  └───────────────────────┬──────────────────┘                  │
│                          │                                      │
│  ┌───────────────────────▼──────────────────┐                  │
│  │              SQLite Database             │                  │
│  │  session · event · result · decision_log │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Library | Purpose |
|---|---|
| **FastAPI** | Async REST API + WebSocket server |
| **Uvicorn** | ASGI server |
| **Ultralytics YOLOv8** | Real-time vehicle detection |
| **OpenCV** | Frame extraction, polygon drawing, homography |
| **NumPy** | Numerical operations |
| **aiofiles** | Async file I/O for video uploads |
| **SQLite3** | Embedded database (Python stdlib) |

### Frontend

| Library | Purpose |
|---|---|
| **React 18** | Component-driven UI |
| **React Router v6** | Client-side routing |
| **Zustand** | Lightweight global state management |
| **React Three Fiber / Drei / Three.js** | 3D intersection rendering |
| **Recharts** | Bar charts on the dashboard |

---

## Project Structure

```
CivicFlow/
├── README.md
├── .gitignore
├── civicflow.db              # SQLite database (auto-created on startup)
│
├── models/
│   └── yolo_traffic.pt       # Custom YOLOv8 traffic detection model (6.2 MB)
│
├── data/                     # Training datasets (gitignored)
├── uploads/                  # Uploaded video files (runtime, gitignored)
│
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── requirements.txt      # Python dependencies
│   ├── job_runner.py         # Background video processing job manager
│   │
│   ├── routers/
│   │   ├── simulation.py     # /simulation/* endpoints + WebSocket
│   │   ├── upload.py         # /upload/video endpoint
│   │   └── jobs.py           # /jobs/start + /jobs/{id}/status
│   │
│   ├── controllers/
│   │   └── simulation_controller.py  # Session management, metric computation
│   │
│   ├── services/
│   │   ├── simulation_service.py     # DB writes: sessions, events, results
│   │   ├── results_service.py        # DB reads: result formatting, comparison
│   │   └── static_replay_service.py  # Simulates static-timer baseline metrics
│   │
│   ├── agent/
│   │   ├── yolo_detector.py   # YOLOv8 inference + multi-frame track management
│   │   └── stable_tracker.py  # IoU + centroid-based vehicle tracker
│   │
│   ├── perception/
│   │   ├── video_pipeline.py  # Main video processing pipeline
│   │   ├── state_extractor.py # Extracts full simulation schedule from video
│   │   ├── lane_processing.py # Polygon region helpers
│   │   ├── homography.py      # Homography transform for bird's-eye-view mapping
│   │   ├── session_report.py  # Builds per-session summary report
│   │   ├── calibrate_lanes.py          # Interactive lane calibration tool
│   │   ├── calibrate_lanes_polygon.py  # Polygon-based lane calibration tool
│   │   └── config/            # Per-video lane region JSON configs
│   │       ├── junction_demo.json
│   │       └── symmetric_config.json
│   │
│   ├── database/
│   │   ├── db.py              # SQLite connection factory
│   │   ├── models.py          # CREATE TABLE definitions
│   │   └── shared_state.py    # In-process video processing state flag
│   │
│   ├── state/
│   │   └── simulation_state.py  # In-memory latest_results dict + threading lock
│   │
│   └── utils/
│       ├── event_parser.py    # Parse raw event log into structured timeline
│       └── metrics.py         # Compute wait time, utilization, CO₂ helpers
│
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx            # Root router — 4 routes
        ├── index.js           # React DOM mount
        │
        ├── pages/
        │   ├── SimulationPage.jsx  # Main intersection UI + tick engine + signal FSM
        │   ├── VideoUploadPage.jsx # Upload flow + job polling + simulation launch
        │   ├── DashboardPage.jsx   # Results comparison dashboard
        │   ├── LoadingPage.jsx     # Transition page post-simulation
        │   └── dashboard.css       # Shared page styles
        │
        ├── components/
        │   ├── controls/      # TimerControl
        │   ├── layout/        # AppSidebar
        │   ├── simulation/    # Intersection canvas components
        │   └── ui/            # Card, Button, Section primitives
        │
        ├── services/
        │   └── api.js         # Fetch wrappers for all backend endpoints
        │
        ├── state/
        │   └── simulationStore.js  # Zustand store (lanes, lights, session, mode)
        │
        └── utils/
            ├── simulationUtils.js  # buildLaneSnapshot, generateVehicleId
            ├── vehicleUtils.js     # moveVehicles, checkVehicleCrossing
            └── dashboardUtils.js   # determineWinner for metric comparison
```

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- A GPU is recommended for YOLOv8 inference but CPU fallback works

### Backend Setup

```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r backend\requirements.txt
```

### Frontend Setup

```powershell
cd frontend
npm install
```

### Running the Application

Open **two terminals** simultaneously in the project root directory.

**Terminal 1 — Backend**

```powershell
# Make sure virtual environment is active
.\venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

API Docs: `http://localhost:8000/docs`

**Terminal 2 — Frontend**

```powershell
cd frontend
npm start
```

App URL: `http://localhost:3000`

---



## License

This project was developed as an intelligent traffic signal control prototype using computer vision and adaptive algorithms.
