/**
 * OrientationEngine.js
 *
 * Models spacecraft attitude every tick.
 *
 * Responsibilities:
 *   - Maintain roll/pitch/yaw and pointing mode
 *   - Simulate gradual rotation toward a target during Rotate activity
 *   - Lock orientation when reaction wheel has failed
 *
 * Architecture note:
 *   ActivityEngine sets pointingMode; OrientationEngine transitions
 *   the actual orientation angles toward that target over time.
 *   When the reaction wheel fault is active, orientation is locked
 *   regardless of commanded pointingMode.
 */

import { ACTIVITIES } from '../utils/constants.js';
import { round }      from '../utils/helpers.js';

// Target angles for each pointing mode
const POINTING_TARGETS = {
  EARTH_POINTING:  { roll: 0,   pitch: 0,   yaw: 0   },
  SUN_POINTING:    { roll: 0,   pitch: 45,  yaw: 0   },
  TARGET_POINTING: { roll: 15,  pitch: -20, yaw: 10  },
  TUMBLING:        { roll: null, pitch: null, yaw: null }, // uncontrolled
};

// Slew rate (degrees per tick)
const SLEW_RATE = 3;

export class OrientationEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   */
  constructor(twin) {
    this._twin = twin;
  }

  /**
   * Compute and apply orientation update for one tick.
   */
  update() {
    const state = this._twin.getMutableState();

    // If reaction wheel failed → spacecraft tumbles; no commanded rotation
    if (state.orientation.locked || !state.reactionWheel.healthy) {
      state.orientation.locked = true;
      state.orientation.mode   = 'TUMBLING';
      state.pointingMode       = 'TUMBLING';

      // Simulate uncontrolled drift
      state.orientation.roll  = round(state.orientation.roll  + 0.5, 2);
      state.orientation.pitch = round(state.orientation.pitch + 0.3, 2);
      state.orientation.yaw   = round(state.orientation.yaw   + 0.4, 2);
      return;
    }

    const target = POINTING_TARGETS[state.pointingMode] ?? POINTING_TARGETS.EARTH_POINTING;

    // Slew each axis toward target at SLEW_RATE deg/tick
    state.orientation.roll  = round(this._slewAxis(state.orientation.roll,  target.roll),  2);
    state.orientation.pitch = round(this._slewAxis(state.orientation.pitch, target.pitch), 2);
    state.orientation.yaw   = round(this._slewAxis(state.orientation.yaw,   target.yaw),   2);

    // Update reaction wheel RPM (proportional to angular rate commanded)
    const angularRate = Math.abs(state.orientation.roll  - (target.roll ?? 0))
                      + Math.abs(state.orientation.pitch - (target.pitch ?? 0))
                      + Math.abs(state.orientation.yaw   - (target.yaw ?? 0));

    state.reactionWheel.rpm     = round(3000 + angularRate * 10, 0);
    state.reactionWheel.torqueNm = round(angularRate * 0.02, 4);
  }

  // ─────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────

  /**
   * Move `current` toward `target` by at most SLEW_RATE degrees.
   * @param {number} current
   * @param {number | null} target
   * @returns {number}
   */
  _slewAxis(current, target) {
    if (target === null) return current; // uncontrolled axis
    const delta = target - current;
    if (Math.abs(delta) <= SLEW_RATE) return target;
    return current + Math.sign(delta) * SLEW_RATE;
  }
}
