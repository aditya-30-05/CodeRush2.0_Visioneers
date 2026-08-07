# Spacecraft Digital Twin & Simulation Engine 🛰️

A production-quality, modular, deterministic Spacecraft Digital Twin and Simulation Engine built with pure Node.js (ES Modules).

This simulation engine serves as the **core backbone** for the **OrbitOps Space Mission Operations Platform**. It models spacecraft physical resource consumption, environmental thermal dynamics, orbital communications, dynamic attitude orientation, fault propagation, constraint validation, and telemetry generation.

---

## 🌟 Key Architecture & Highlights

- **Single Source of Truth**: Managed strictly by `DigitalTwin.js`. All sub-engines read from and update this central state.
- **Zero External Runtime Dependencies**: Built using standard Node.js built-ins (`fs`, `path`, `events`).
- **Deterministic & JSON Configurable**: Missions are defined purely via JSON files. No engine code modifications needed to switch or adjust missions.
- **Extensible Sub-Engine Architecture**: Independent, modular engines for Power, Thermal, Storage, Communication, Orientation, Activity Sequencing, Fault Propagation, Telemetry, and Safety Constraints.
- **Simultaneous Multi-Fault Injection**: Propagates up to 10 fault types simultaneously (Battery Leak, Thermal Spike, Solar Failure, Communication Loss, Reaction Wheel Tumble, Sensor Drift, etc.).
- **Clean Event Callback API**: Integrates with external systems via event callbacks (`onTick`, `onTelemetry`, `onActivityChange`, `onFaultInjected`, `onConstraintViolation`, `onMissionCompleted`).

---

## 📁 Project Structure

```
simulation/
├── index.js                     # Main entry point & integration demo
├── package.json                 # ES Module metadata & configuration
├── digitalTwin/
│   └── DigitalTwin.js           # Central spacecraft state (Single Source of Truth)
├── engines/
│   ├── SimulationEngine.js      # Top-level orchestrator & Public API surface
│   ├── TickEngine.js            # Clock controller (Start / Stop / Pause / Resume)
│   ├── MissionTimeline.js       # Activity timeline cursor & sequence trigger
│   ├── ResourceEngine.js        # Facade running resource sub-engines in order
│   ├── ActivityEngine.js        # Hardware mode flag mutations (Camera, Pointing, SafeMode)
│   ├── PowerEngine.js           # Solar generation, battery drain/charge & voltage model
│   ├── ThermalEngine.js         # Activity heating & passive radiation equilibrium
│   ├── StorageEngine.js         # Data accumulation (Observation) & drain (Downlink)
│   ├── CommunicationEngine.js   # Sinusoidal orbital windows, signal noise & latency
│   ├── OrientationEngine.js     # Attitude slew math & reaction wheel RPM/torque
│   ├── FaultEngine.js           # Fault registry & per-tick propagation logic
│   ├── TelemetryEngine.js       # Immutable snapshot generator & rolling buffer
│   └── ConstraintEngine.js      # Hard limits & soft warning validator
├── models/
│   ├── Mission.js               # Mission domain model
│   ├── Activity.js              # Timeline activity value object
│   ├── Fault.js                 # Fault record value object
│   └── Telemetry.js             # Telemetry record value object
├── utils/
│   ├── constants.js             # System-wide rates, thresholds & fault IDs
│   ├── helpers.js               # Pure math, drift & formatting utilities
│   └── MissionLoader.js         # JSON file & object loader
└── missions/                    # Sample JSON Mission Files
    ├── observation_mission.json # Standard Earth observation sequence
    ├── earth_imaging.json        # High-resolution multi-pass imaging
    ├── deep_space.json           # Weak solar, low signal, deep space probe
    ├── safe_mode_demo.json       # Low battery & emergency recovery sequence
    └── communication_demo.json  # Multi-window downlink contact sequence
```

---

## ⚡ Quick Start & Usage

### Running the Demo

```bash
cd simulation
node index.js
```

### Basic Integration Example

```javascript
import { SimulationEngine, FAULT_IDS } from './simulation/index.js';

// 1. Instantiate the Engine with event callbacks
const sim = new SimulationEngine({
  onTick: (state, telemetry) => {
    console.log(`[T+${state.missionTime}s] Activity: ${state.currentActivity} | Battery: ${state.battery.percentage.toFixed(1)}%`);
  },
  onTelemetry: (telemetry) => {
    // Forward to Telemetry Pipeline or WebSockets
  },
  onConstraintViolation: (violations) => {
    console.warn('🚨 Violation detected:', violations);
  },
  onMissionCompleted: (finalState) => {
    console.log('✅ Mission Completed successfully!');
  }
});

// 2. Load a Mission JSON File
sim.loadMission('./simulation/missions/observation_mission.json');

// 3. Start the Simulation
sim.start();

// 4. Inject a Fault at runtime
setTimeout(() => {
  sim.injectFault(FAULT_IDS.THERMAL_SPIKE);
}, 5000);

// 5. Clear the Fault
setTimeout(() => {
  sim.clearFault(FAULT_IDS.THERMAL_SPIKE);
}, 10000);
```

---

## 🛠️ Fault Injection System

The `FaultEngine` supports injecting and clearing the following standard fault codes:

| Fault ID | Effect / Impact |
| --- | --- |
| `BATTERY_LEAK` | Battery discharge rate multiplied ×2 |
| `SOLAR_PANEL_FAILURE` | Solar power generation drops to `0W` |
| `THERMAL_SPIKE` | Rapid body heating (`+5°C/tick`) |
| `COMMUNICATION_LOSS` | Signal strength drops to `0%`, link lost |
| `PACKET_LOSS` | Random telemetry frame drops (`20-80%`) |
| `SENSOR_DRIFT` | Telemetry values drift randomly by `±5%` |
| `REACTION_WHEEL_FAILURE` | Attitude control locked, spacecraft tumbles |
| `ACTUATOR_FAILURE` | Camera and steerable antenna disabled |
| `CONFLICTING_SENSORS` | Conflicting sensor flag raised in state |
| `MISSING_TELEMETRY` | Telemetry packets intermittently skipped |

---

## 📜 Mission JSON Schema

Example `observation_mission.json`:

```json
{
  "missionName": "Observation Mission Alpha",
  "duration": 600,
  "initialBattery": 85,
  "initialTemp": 22,
  "storageMB": 2048,
  "timeline": [
    { "time": 0,   "activity": "Idle" },
    { "time": 30,  "activity": "Rotate", "parameters": { "targetPointing": "TARGET_POINTING" } },
    { "time": 60,  "activity": "Observation", "parameters": { "pointingMode": "TARGET_POINTING" } },
    { "time": 180, "activity": "Downlink" },
    { "time": 240, "activity": "Calibration" },
    { "time": 300, "activity": "SafeMode" }
  ]
}
```

---

## ⚙️ Core Public API (`SimulationEngine`)

- `loadMission(filePath | object)` — Loads and initializes a mission.
- `start()` — Begins simulation tick loop.
- `stop()` — Stops the simulation.
- `pause()` — Pauses clock execution.
- `resume()` — Resumes clock execution.
- `reset()` — Resets mission time to `0` and restores initial state.
- `injectFault(faultId, meta?)` — Dynamically injects a hardware fault.
- `clearFault(faultId)` — Removes an active fault.
- `setActivity(activityName, params?)` — Overrides timeline activity.
- `getCurrentState()` — Returns frozen snapshot of the Digital Twin state.
- `getTelemetry()` — Returns the latest Telemetry record.
- `getMissionTime()` — Returns current simulation elapsed seconds.

---

## 📄 License

MIT License. Designed for aerospace and mission operations platforms.