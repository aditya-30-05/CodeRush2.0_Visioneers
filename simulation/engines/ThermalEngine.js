/**
 * ThermalEngine.js
 *
 * Models spacecraft body temperature every tick.
 *
 * Temperature model:
 *   - Each activity has a base delta (°C/tick) from THERMAL_RATES
 *   - Camera ON adds THERMAL_CAMERA_BONUS
 *   - A passive equilibrium pull toward THERMAL_AMBIENT is applied
 *     to prevent unbounded drift (simulates passive radiation)
 *
 * Fault effects (applied by FaultEngine, not here):
 *   - ThermalSpike fault adds +5°C/tick (on top of this engine's output)
 *
 * This engine does NOT trigger safe-mode; that belongs to ConstraintEngine.
 */

import {
  THERMAL_RATES,
  THERMAL_CAMERA_BONUS,
  THERMAL_AMBIENT,
  THERMAL_EQUILIBRIUM_RATE,
} from '../utils/constants.js';
import { clamp, round } from '../utils/helpers.js';

export class ThermalEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   */
  constructor(twin) {
    this._twin = twin;
  }

  /**
   * Compute and apply thermal update for one tick.
   */
  update() {
    const state    = this._twin.getMutableState();
    const activity = state.currentActivity;
    const temp     = state.thermal.temperature;

    // ── Activity delta ───────────────────────────────────────────
    const activityDelta = THERMAL_RATES[activity] ?? 0;

    // ── Camera bonus ─────────────────────────────────────────────
    const cameraDelta = state.camera.on ? THERMAL_CAMERA_BONUS : 0;

    // ── Passive equilibrium pull ──────────────────────────────────
    // Gentle pull toward ambient temperature (radiation model)
    const equilibriumDelta = (THERMAL_AMBIENT - temp) * THERMAL_EQUILIBRIUM_RATE;

    // ── Net delta ─────────────────────────────────────────────────
    const totalDelta = activityDelta + cameraDelta + equilibriumDelta;

    const newTemp = clamp(temp + totalDelta, -100, 200);

    state.thermal.temperature  = round(newTemp, 2);
    state.thermal.deltaPerTick = round(totalDelta, 3);

    // Update battery thermal (simplified coupling)
    state.battery.temperature = round(state.battery.temperature + totalDelta * 0.1, 2);
  }
}
