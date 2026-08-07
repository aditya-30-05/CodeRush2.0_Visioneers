/**
 * StorageEngine.js
 *
 * Manages onboard data storage every tick.
 *
 * Storage Rules:
 *   Observation → +2 MB/tick (camera capturing raw imagery)
 *   Calibration → +0.5 MB/tick (smaller calibration frames)
 *   Downlink    → -10 MB/tick (transmitting stored data)
 *   All others  → 0 MB/tick
 *
 * Storage is clamped to [0, totalMB].
 * Percentage-used is recomputed each tick.
 */

import { STORAGE_RATES } from '../utils/constants.js';
import { clamp, round }  from '../utils/helpers.js';

export class StorageEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   */
  constructor(twin) {
    this._twin = twin;
  }

  /**
   * Compute and apply storage update for one tick.
   */
  update() {
    const state    = this._twin.getMutableState();
    const activity = state.currentActivity;

    // Activity fill/drain rate (MB/tick)
    const fillRate = STORAGE_RATES[activity] ?? 0;

    const total   = state.storage.totalMB;
    const newUsed = clamp(state.storage.usedMB + fillRate, 0, total);

    state.storage.usedMB      = round(newUsed, 2);
    state.storage.fillRateMB  = fillRate;
    state.storage.percentUsed = round((newUsed / total) * 100, 2);
  }
}
