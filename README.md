# OrbitOps — Spacecraft Digital Twin & Mission Operations Platform 🛰️

**OrbitOps** is a production-quality, simulation-first Spacecraft Digital Twin, Real-Time Telemetry Pipeline, Fault Injection Suite, and Mission Operations Control Platform.

Built with **React, TypeScript, Node.js, Express, Socket.io, and Supabase PostgreSQL**, OrbitOps models physical spacecraft dynamics (power, thermal, storage, communications, attitude), detects in-flight anomalies, logs multi-session telemetry, and streams real-time state updates to an operator console.

---

## 🏗️ Architecture & Component Overview

```
   ┌─────────────────────────────────────────────────────────────┐
   │               React 18 + TypeScript Frontend                │
   │               (Vite Dev Server @ Port 5173)                 │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  │ REST APIs (fetch)
                                  │ Real-time WebSockets (Socket.io)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              Node.js + Express.js Backend                   │
   │                (HTTP Server @ Port 4000)                    │
   └──────────────┬──────────────────────────────┬───────────────┘
                  │                              │
                  │ Async Persist                │ Direct Module Import
                  ▼                              ▼
   ┌─────────────────────────────┐┌──────────────────────────────┐
   │ Supabase PostgreSQL DB      ││ Spacecraft Digital Twin      │
   │ (Missions, Telemetry, Faults)││ (Deterministic Physics Loop) │
   └─────────────────────────────┘└──────────────────────────────┘
```

1. **Frontend (`/src`)**: Operator Dashboard built with React 18, Tailwind CSS, Radix UI, Framer Motion, and Recharts. Features 9 dedicated views: Dashboard, Mission Planner, Telemetry Stream, Digital Twin Monitor, Fault Injection Controls, Emergency Procedures, Replay Scrubber, Mission Logs, and Settings.
2. **Backend Integration Layer (`/backend`)**: Express.js REST API server & Socket.io WebSocket gateway. Controls simulation execution (`/mission/*`), handles fault injection (`/fault/*`), streams live 1Hz telemetry broadcasts, and manages database persistence.
3. **Spacecraft Digital Twin Engine (`/simulation`)**: Pure JavaScript physics engine. Implements a 6-step tick loop (Timeline → Activity → Resources → Faults → Constraints → Telemetry) modeling 13 physical spacecraft sub-systems with zero runtime dependencies.
4. **Database Persistence Layer (Supabase PostgreSQL)**: Stores mission metadata (`missions`), 1Hz telemetry logs (`telemetry_logs`), fault events (`fault_logs`), state snapshots (`replay_logs`), and audit logs (`operator_actions`) with graceful in-memory fallback.

---

## 📁 Repository Directory Structure

```
CodeRush_2.0/
├── backend/                       # Express.js API & Socket.io Server
│   ├── config/                    # Supabase singleton configuration & health test
│   ├── controllers/               # HTTP REST request handlers (Mission, Telemetry, Fault, Replay)
│   ├── database/                  # Repositories for Supabase PostgreSQL tables
│   ├── middlewares/               # Express error handler, request logger, JSON schemas
│   ├── routes/                    # Express REST route definitions
│   ├── services/                  # Business logic & SimulationEngine adapter wrapper
│   ├── socket/                    # Socket.io gateway & connection manager
│   ├── utils/                     # ApiResponse factory, constants, helpers
│   ├── app.js                     # Express app factory
│   └── server.js                  # HTTP Server entry point
├── simulation/                    # Pure Physics Digital Twin Engine
│   ├── digitalTwin/               # Single Source of Truth state tree (DigitalTwin.js)
│   ├── engines/                   # 13 Sub-engines (Power, Thermal, Storage, Faults, etc.)
│   ├── models/                    # Immutable domain models (Mission, Telemetry, Fault, Activity)
│   ├── utils/                     # Physics constants, math helpers & MissionLoader
│   ├── missions/                  # 5 JSON mission scenario definitions
│   └── index.js                   # Public simulation API surface export
├── src/                           # React 18 + TypeScript Frontend Application
│   ├── components/                # UI components (MetricCards, Recharts, Shadcn UI)
│   ├── data/                      # Initial fallback metrics & mock datasets
│   ├── hooks/                     # Custom React hooks (useMissionSocket, useMissionTimer)
│   ├── layouts/                   # DashboardLayout, Sidebar, TopNav
│   ├── pages/                     # 9 Page views (Dashboard, Replay, Telemetry, etc.)
│   ├── types/                     # TypeScript domain interface definitions
│   ├── App.tsx                    # React Router 6 configuration
│   └── main.tsx                   # React root mount point
├── package.json                   # Root frontend dependencies & scripts
├── tailwind.config.js             # Tailwind CSS tokens & styling config
└── vite.config.ts                 # Vite bundler build configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### 1. Install Dependencies

Install root frontend and backend packages:

```bash
# Install frontend dependencies (Root folder)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

### 2. Environment Configuration

Create or verify `backend/.env`:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://mrkgpgjemffctixqalht.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_secret_key
SIMULATION_TICK_INTERVAL_MS=1000
TELEMETRY_LOG_EVERY_N_TICKS=1
```

*(Note: If Supabase credentials are not configured, OrbitOps automatically degrades to an in-memory mode without crashing).*

---

### 3. Launching the Servers

Run backend and frontend in separate terminal windows:

#### Terminal 1 — Start Backend Server:
```bash
cd backend
npm start
```
*Backend runs on `http://localhost:4000`*

#### Terminal 2 — Start Frontend Dev Server:
```bash
# From root directory
npm run dev
```
*Frontend app runs on `http://localhost:5173`*

---

## 🌐 API & Socket.io Interface Reference

### REST Endpoints

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
| `GET` | `/telemetry/latest` | Fetch single latest 18-parameter telemetry frame |
| `GET` | `/telemetry` | Fetch in-memory rolling buffer (last 300 frames) |
| `GET` | `/telemetry/history/:id` | Fetch historical telemetry logs from Supabase |
| `POST` | `/fault/inject` | Inject named hardware fault (`SOLAR_PANEL_FAILURE`, `THERMAL_SPIKE`, etc.) |
| `POST` | `/fault/clear` | Clear an active hardware fault |
| `GET` | `/faults` | List currently active faults |
| `GET` | `/replay/:missionId` | Fetch full state snapshots for timeline scrubbing |

### Socket.io Real-Time Events

- `telemetry_update`: Streams live 1Hz telemetry frames to React components.
- `fault_injected` / `fault_cleared`: Broadcasts hardware fault state changes.
- `mission_started` / `mission_paused` / `mission_resumed`: Streams clock state transitions.
- `constraint_violation`: Broadcasts hard safety threshold limit breaches.

---

## 🛠️ Supported Fault System

OrbitOps supports multi-fault injection with real-time physical side-effects:

| Fault ID | Physical Impact |
| --- | --- |
| `SOLAR_PANEL_FAILURE` | Solar power generation drops to 0W; battery discharge accelerates |
| `BATTERY_LEAK` | Battery capacity degrades; cell discharge rate multiplies 2× |
| `THERMAL_SPIKE` | Subsystem temperature surges rapidly (+5°C/tick) |
| `COMMUNICATION_LOSS` | RF downlink link drops to 0 dBm; spacecraft triggers SafeMode |
| `PACKET_LOSS` | Telemetry downlink drops packets (40% loss rate) |
| `SENSOR_DRIFT` | Applies noise drift to attitude determination sensors |
| `REACTION_WHEEL_FAILURE` | ADCS reaction wheel #2 locks, causing attitude drift |

---

## 🧪 Automated Testing & Verification

Run the built-in autonomous test suite to verify end-to-end integration:

```bash
cd backend
node -e "import('./services/SimulationService.js').then(() => console.log('✅ Integration OK'))"
```

You can also run full production frontend build checks:

```bash
npm run build
```

---

## 📜 License

MIT License. Built for space mission operations, spacecraft simulation, and satellite telemetry analytics.