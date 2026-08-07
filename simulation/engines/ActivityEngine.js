/**
 * ActivityEngine.js
 *
 * Translates the current mission activity string into concrete
 * hardware-flag mutations on the Digital Twin.
 *
 * This engine runs FIRST each tick so every subsequent engine
 * sees up-to-date hardware state before computing its own deltas.
 *
 * Responsibilities:
 *   - Enable/disable camera based on activity
 *   - Set pointing mode based on activity
 *   - Set safe-mode flag
 *   - Set antenna state
 *
 * Deliberately does NOT compute power, thermal, or storage deltas —
 * those belong to their respective engines.
 */

import { ACTIVITIES } from '../utils/constants.js';

export class ActivityEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   */
  constructor(twin) {
    this._twin = twin;
  }

  /**
   * Apply hardware-flag mutations for the current activity.
   * Called once per tick, before all resource engines.
   *
   * @param {string} activity - current activity name
   * @param {Object} parameters - activity-specific overrides from timeline
   */
  apply(activity, parameters = {}) {
    const state = this._twin.getMutableState();

    // Reset per-tick hardware flags before applying activity rules
    state.camera.powerDrawW = 0;

    switch (activity) {
      case ACTIVITIES.OBSERVATION:
        state.camera.on       = true;
        state.camera.mode     = 'CAPTURING';
        state.camera.powerDrawW = 15; // W
        state.pointingMode    = parameters.pointingMode ?? 'TARGET_POINTING';
        state.safeMode        = false;
        break;

      case ACTIVITIES.CALIBRATION:
        state.camera.on       = true;
        state.camera.mode     = 'STANDBY';
        state.camera.powerDrawW = 5;
        state.pointingMode    = 'EARTH_POINTING';
        state.safeMode        = false;
        break;

      case ACTIVITIES.DOWNLINK:
        state.camera.on       = false;
        state.camera.mode     = 'IDLE';
        state.pointingMode    = 'EARTH_POINTING';
        state.antenna.trackingEarth = true;
        state.safeMode        = false;
        break;

      case ACTIVITIES.SAFE_MODE:
        state.camera.on       = false;
        state.camera.mode     = 'IDLE';
        state.safeMode        = true;
        state.pointingMode    = 'SUN_POINTING';
        break;

      case ACTIVITIES.CHARGING:
        state.camera.on       = false;
        state.camera.mode     = 'IDLE';
        state.pointingMode    = 'SUN_POINTING';
        state.safeMode        = false;
        break;

      case ACTIVITIES.ROTATE:
        state.camera.on       = false;
        state.camera.mode     = 'IDLE';
        state.safeMode        = false;
        // pointing mode transitions mid-rotate; final mode from parameters
        state.pointingMode    = parameters.targetPointing ?? 'TARGET_POINTING';
        break;

      case ACTIVITIES.IDLE:
      default:
        state.camera.on       = false;
        state.camera.mode     = 'IDLE';
        state.safeMode        = false;
        state.pointingMode    = 'EARTH_POINTING';
        break;
    }

    // Sync orientation.mode with pointingMode
    if (!state.orientation.locked) {
      state.orientation.mode = state.pointingMode;
    }
  }
}
