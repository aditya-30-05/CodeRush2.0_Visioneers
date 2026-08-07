/**
 * constants.js
 *
 * Central registry of all named constants, rates, and thresholds.
 * Engines import from here — no magic numbers anywhere else.
 */

// ── Simulation timing ─────────────────────────────────────────────
export const TICK_INTERVAL_MS = 1000; // one simulated second per tick

// ── Power rates (% battery per tick) ─────────────────────────────
export const POWER_RATES = {
  Idle:        { drain: 0.1,  solarBonus: 0   },
  Rotate:      { drain: 0.3,  solarBonus: 0   },
  Observation: { drain: 1.0,  solarBonus: 0   },
  Calibration: { drain: 0.5,  solarBonus: 0   },
  Downlink:    { drain: 0.8,  solarBonus: 0   },
  SafeMode:    { drain: -1.0, solarBonus: 0   }, // negative = charging
  Charging:    { drain: -2.0, solarBonus: 0   },
};

// Camera adds extra drain when ON
export const CAMERA_POWER_DRAIN = 0.5; // %/tick

// ── Solar generation (Watts) ──────────────────────────────────────
export const SOLAR_GEN_SUN    = 120; // W — when sun-facing
export const SOLAR_GEN_SHADOW =  20; // W — eclipse / not pointing

// ── Thermal rates (°C per tick) ──────────────────────────────────
export const THERMAL_RATES = {
  Idle:        0,
  Rotate:      0.2,
  Observation: 1.0,
  Calibration: 0.3,
  Downlink:    0.4,
  SafeMode:   -1.0,
  Charging:   -0.5,
};

export const THERMAL_CAMERA_BONUS   =  0.5;  // °C/tick when camera on
export const THERMAL_HIGH_POWER     =  2.0;  // °C/tick — high draw activities
export const THERMAL_SPIKE_FAULT    =  5.0;  // °C/tick — fault effect
export const THERMAL_AMBIENT        =  22;   // °C — equilibrium temperature
export const THERMAL_EQUILIBRIUM_RATE = 0.05; // fraction pulled toward ambient/tick

// ── Storage rates (MB per tick) ──────────────────────────────────
export const STORAGE_RATES = {
  Idle:        0,
  Rotate:      0,
  Observation: 2,    // +2 MB/sec
  Calibration: 0.5,
  Downlink:   -10,   // -10 MB/sec
  SafeMode:    0,
  Charging:    0,
};

// ── Communication ─────────────────────────────────────────────────
export const SIGNAL_BASE_STRENGTH  = 85;  // %
export const SIGNAL_LOSS_FAULT     =  0;  // %
export const SIGNAL_DOWNLINK_BOOST =  5;  // % added during Downlink
export const LATENCY_BASE_MS       = 250; // ms

// ── Constraints / limits ──────────────────────────────────────────
export const CONSTRAINT_BATTERY_MIN    = 20;   // %
export const CONSTRAINT_TEMP_MAX       = 65;   // °C
export const CONSTRAINT_STORAGE_MAX    = 95;   // % used
export const CONSTRAINT_SIGNAL_MIN     = 30;   // %

// ── Fault identifiers ─────────────────────────────────────────────
export const FAULT_IDS = {
  BATTERY_LEAK:          'BATTERY_LEAK',
  SOLAR_PANEL_FAILURE:   'SOLAR_PANEL_FAILURE',
  THERMAL_SPIKE:         'THERMAL_SPIKE',
  COMMUNICATION_LOSS:    'COMMUNICATION_LOSS',
  PACKET_LOSS:           'PACKET_LOSS',
  SENSOR_DRIFT:          'SENSOR_DRIFT',
  REACTION_WHEEL_FAILURE:'REACTION_WHEEL_FAILURE',
  ACTUATOR_FAILURE:      'ACTUATOR_FAILURE',
  CONFLICTING_SENSORS:   'CONFLICTING_SENSORS',
  MISSING_TELEMETRY:     'MISSING_TELEMETRY',
};

// ── Mission phases ────────────────────────────────────────────────
export const MISSION_PHASES = {
  PRE_LAUNCH: 'PRE_LAUNCH',
  ACTIVE:     'ACTIVE',
  SAFE_MODE:  'SAFE_MODE',
  COMPLETED:  'COMPLETED',
  ABORTED:    'ABORTED',
};

// ── Activity identifiers ──────────────────────────────────────────
export const ACTIVITIES = {
  IDLE:        'Idle',
  ROTATE:      'Rotate',
  OBSERVATION: 'Observation',
  CALIBRATION: 'Calibration',
  DOWNLINK:    'Downlink',
  SAFE_MODE:   'SafeMode',
  CHARGING:    'Charging',
};
