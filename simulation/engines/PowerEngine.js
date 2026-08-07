/**
 * PowerEngine.js
 *
 * Manages the spacecraft power subsystem every tick.
 *
 * Responsibilities:
 *   - Compute solar power generation (depends on orientation)
 *   - Compute total power consumption (activity + camera draw)
 *   - Update battery percentage (charge or drain)
 *   - Clamp battery to [0, 100]%
 *
 * Battery Rules:
 *   Activity rates (% per tick):
 *     Observation  → -1.0%
 *     Camera ON    → additional -0.5%
 *     Downlink     → -0.8%
 *     Charging     → +2.0%
 *     SafeMode     → +1.0%
 *     Rotate       → -0.3%
 *     Idle         → -0.1%
 *
 *   Solar Rules:
 *     SUN_POINTING → 120W generated
 *     Otherwise    →  20W generated
 *
 * The engine does NOT trigger safe-mode autonomously.
 * That decision belongs to ConstraintEngine + SimulationEngine.
 */

import {
  POWER_RATES,
  CAMERA_POWER_DRAIN,
  SOLAR_GEN_SUN,
  SOLAR_GEN_SHADOW,
  ACTIVITIES,
} from '../utils/constants.js';
import { clamp, round } from '../utils/helpers.js';

export class PowerEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   */
  constructor(twin) {
    this._twin = twin;
  }

  /**
   * Compute and apply power updates for one tick.
   * Called after ActivityEngine so hardware flags are current.
   */
  update() {
    const state   = this._twin.getMutableState();
    const activity = state.currentActivity;

    // ── Solar generation ──────────────────────────────────────────
    const isSunFacing = (
      state.orientation.mode === 'SUN_POINTING' ||
      state.safeMode  // safe mode always points at sun
    );

    const solarW = isSunFacing ? SOLAR_GEN_SUN : SOLAR_GEN_SHADOW;
    state.power.solarGeneration = solarW;
    state.power.generation      = solarW;

    // ── Battery drain/charge rate (%/tick) ───────────────────────
    const baseRate   = (POWER_RATES[activity] ?? POWER_RATES.Idle).drain;
    const cameraRate = state.camera.on ? CAMERA_POWER_DRAIN : 0;

    // Charging activities have negative drain (net positive)
    let netRate = baseRate + cameraRate;

    // Active faults may double drain — applied separately in FaultEngine.
    // PowerEngine only reads the clean activity rates here.

    // ── Apply to battery ─────────────────────────────────────────
    const previousBattery = state.battery.percentage;
    const newBattery      = clamp(previousBattery - netRate, 0, 100);

    state.battery.percentage = round(newBattery, 2);
    state.battery.charging   = netRate < 0; // net negative = charging
    state.battery.drainRate  = round(netRate, 3);

    // Approximate voltage model: linear between 22V (empty) and 29V (full)
    state.battery.voltage = round(22 + (newBattery / 100) * 7, 2);

    // ── Power consumption (W) ─────────────────────────────────────
    // Rough model: each activity draws a fraction of battery capacity per tick
    // Treat 1% battery capacity as ~1 Wh; convert %/tick → W
    const batteryCapacityWh = state.battery.capacity;
    state.power.consumption  = round(Math.abs(netRate) * batteryCapacityWh / 100 * 10, 1);
    // Power is available if battery has charge OR if we are currently charging via solar
    state.power.available    = state.battery.percentage > 0 || netRate < 0;
  }
}
