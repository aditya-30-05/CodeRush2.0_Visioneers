# CodeRush 2.0 | Team Project Repository

## Project Information

- **Team Name**: Visioneers
- **Project Title**: OrbitOps — Autonomous Spacecraft Digital Twin & AI Mission Control System
- **Track/Theme**: Space Tech / Autonomous Systems / Space Infrastructure

---

## Project Description

**Problem:** Modern satellite mission operations face increasing operational complexity, massive telemetry streams, unpredictable space environmental hazards, and signal latencies. Manually monitoring spacecraft health, analyzing multi-dimensional sensor data, and reacting to in-flight hardware anomalies introduces critical delays and human error risks.

**Proposed Solution:** **OrbitOps** is a production-grade, simulation-first **Spacecraft Digital Twin**, **Real-Time Telemetry Pipeline**, **Autonomous AI Mission Planner**, and **Operator Control Platform**. Built with a 13-subsystem physics simulation engine, interactive 3D spacecraft visualization (Three.js), multi-agent AI fault recovery planner, and LLM-powered Mission Copilot (Groq), OrbitOps enables space operators to simulate orbital dynamics, detect in-flight anomalies, execute automated recovery rules, and ensure total mission safety.

---

## Technical Stack

List the technologies used in this project:

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Three.js (3D Spacecraft Canvas), Recharts, Lucide Icons, Framer Motion, Radix UI
- **Backend**: Node.js, Express.js, Socket.IO (1Hz Real-Time Telemetry Gateway), Python 3 (Autonomous AI Mission Planner & Constraint Engine), Stdio IPC Bridge
- **Database**: Supabase (PostgreSQL), In-Memory Simulation State Cache
- **Tools/APIs**: Groq API (LLM Mission Copilot via `llama-3.3-70b-versatile`), Python Dataclasses / NumPy, RESTful APIs, WebSockets

---

## Setup and Installation

Provide instructions on how to run your project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aditya-30-05/CodeRush2.0_Visioneers.git
   cd CodeRush2.0_Visioneers
   ```

2. **Install dependencies:**
   ```bash
   # Install frontend dependencies (Root directory)
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Configure environment variables:**
   Create a `.env` file inside the `backend/` directory (see `backend/.env.example`):
   ```env
   PORT=4000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   SUPABASE_URL=https://mrkgpgjemffctixqalht.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   SIMULATION_TICK_INTERVAL_MS=1000
   TELEMETRY_LOG_EVERY_N_TICKS=1
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

4. **Start the development server:**
   Open two separate terminal windows:

   - **Terminal 1 — Start Backend Server:**
     ```bash
     cd backend
     npm start
     ```
     *(Runs on `http://localhost:4000`)*

   - **Terminal 2 — Start Frontend Dev Server:**
     ```bash
     npm run dev
     ```
     *(Runs on `http://localhost:5173`)*

---

## 🌟 Key Features

1. **Interactive 3D Spacecraft Digital Twin**
   - Real-time 3D rendering of satellite solar array deployment, payload camera gimbal tilt, thermal heat shimmer, and thruster plumes reacting dynamically to telemetry.
   - View modes: Telemetry Live, Thruster Test, Thermal Shimmer, Camera Pitch, and Prediction Preview.

2. **13-Subsystem Physics Simulation Engine**
   - Pure JS deterministic physics loop modeling EPS (Power), Thermal, Storage, TT&C (Communications), ADCS (Attitude), Navigation, and Payload.
   - Pre-configured mission scenarios: Earth Observation, Mars Transfer, Solar Array Hazard, Deep Space Survey, and Lunar Relay.

3. **Autonomous AI Mission Planner (`telemetry_ai`)**
   - Multi-agent Python engine performing dependency-aware task decomposition, 12-dimensional feasibility constraint checks, power/fuel depletion forecasting, and automated fault recovery timeline generation.

4. **OrbitOps AI Mission Copilot (Powered by Groq LLM)**
   - Real-time conversational assistant connected directly to live telemetry context and backend database repositories using `llama-3.3-70b-versatile`.

5. **Multi-Fault Injection & Safety Controls**
   - Hardware fault suite (`SOLAR_PANEL_FAILURE`, `THERMAL_SPIKE`, `BATTERY_LEAK`, `COMMUNICATION_LOSS`, `PACKET_LOSS`, `SENSOR_DRIFT`, `REACTION_WHEEL_FAILURE`) with real-time Socket.IO broadcasts.

6. **Historical Replay Scrubber & Audit Logging**
   - Scrub past telemetry logs frame-by-frame for post-mission incident forensics and audit analysis.

---

## 🛰️ API Endpoint Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Server status & database connection health check |
| `POST` | `/mission/load` | Load a JSON mission scenario into the engine |
| `POST` | `/mission/start` | Start 1Hz simulation clock ticks |
| `POST` | `/mission/pause` | Pause simulation execution |
| `POST` | `/mission/resume` | Resume paused simulation execution |
| `POST` | `/mission/stop` | Stop simulation permanently |
| `POST` | `/mission/reset` | Reset simulation to tick 0 |
| `GET` | `/mission/status` | Get current simulation clock and status |
| `POST` | `/mission/plan` | Run Autonomous AI Space Mission Planner engine |
| `GET` | `/telemetry/latest` | Fetch latest 18-parameter telemetry frame |
| `GET` | `/telemetry` | Fetch in-memory rolling telemetry buffer |
| `POST` | `/fault/inject` | Inject named hardware fault |
| `POST` | `/fault/clear` | Clear an active hardware fault |
| `POST` | `/copilot/query` | Query AI Mission Copilot (LLM + Telemetry Context) |