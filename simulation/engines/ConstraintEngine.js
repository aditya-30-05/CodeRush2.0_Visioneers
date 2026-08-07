/**
 * ConstraintEngine.js
 *
 * Validates spacecraft state against operational safety constraints
 * every tick, AFTER fault propagation.
 *
 * Returns a structured result:
 *   {
 *     valid: boolean,
 *     warnings: string[],
 *     violations: ConstraintViolation[]
 *   }
 *
 * A violation is a hard breach of a safety limit.
 * A warning is a soft alert (approaching a limit).
 *
 * This engine does NOT mutate the Digital Twin.
 * SimulationEngine decides what action to take based on violations
 * (e.g., auto-trigger SafeMode on critical battery).
 *
 * Constraint thresholds are imported from constants.js.
 */

import {
  CONSTRAINT_BATTERY_MIN,
  CONSTRAINT_TEMP_MAX,
  CONSTRAINT_STORAGE_MAX,
  CONSTRAINT_SIGNAL_MIN,
} from '../utils/constants.js';

/**
 * @typedef {Object} ConstraintViolation
 * @property {string} field      - Which state field is in violation
 * @property {string} rule       - Description of the rule breached
 * @property {number} value      - Current value
 * @property {number} limit      - The constraint limit
 * @property {string} severity   - 'WARNING' | 'CRITICAL'
 */

export class ConstraintEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   * @param {Function} [onConstraintViolation]  - callback(violations[])
   */
  constructor(twin, onConstraintViolation) {
    this._twin                  = twin;
    this._onConstraintViolation = onConstraintViolation ?? (() => {});

    // Soft-warning thresholds (% of hard limit, approached from inside)
    this._warningMargins = {
      battery:  5,  // warn when battery < (min + 5)%
      temp:     5,  // warn when temp > (max - 5)°C
      storage:  5,  // warn when storage > (max - 5)%
      signal:   10, // warn when signal < (min + 10)%
    };
  }

  /**
   * Validate current state and return result.
   * Fires onConstraintViolation if any violations detected.
   *
   * @returns {{ valid: boolean, warnings: string[], violations: ConstraintViolation[] }}
   */
  validate() {
    const state      = this._twin.getState(); // frozen snapshot — no mutation here
    const warnings   = [];
    const violations = [];

    // ── Battery ────────────────────────────────────────────────────
    this._checkLowerBound(
      'battery.percentage', state.battery.percentage,
      CONSTRAINT_BATTERY_MIN,
      this._warningMargins.battery,
      'Battery must remain above minimum',
      warnings, violations
    );

    // ── Temperature ────────────────────────────────────────────────
    this._checkUpperBound(
      'thermal.temperature', state.thermal.temperature,
      CONSTRAINT_TEMP_MAX,
      this._warningMargins.temp,
      'Temperature must remain below maximum',
      warnings, violations
    );

    // ── Storage ────────────────────────────────────────────────────
    this._checkUpperBound(
      'storage.percentUsed', state.storage.percentUsed,
      CONSTRAINT_STORAGE_MAX,
      this._warningMargins.storage,
      'Storage must not exceed capacity limit',
      warnings, violations
    );

    // ── Signal ─────────────────────────────────────────────────────
    // Only enforce signal constraint when communication window is open
    if (state.communication.windowOpen) {
      this._checkLowerBound(
        'communication.signalStrength', state.communication.signalStrength,
        CONSTRAINT_SIGNAL_MIN,
        this._warningMargins.signal,
        'Signal strength must remain above minimum during contact window',
        warnings, violations
      );
    }

    // ── Power availability ─────────────────────────────────────────
    if (!state.power.available) {
      violations.push({
        field:    'power.available',
        rule:     'Power subsystem must remain operational',
        value:    0,
        limit:    1,
        severity: 'CRITICAL',
      });
    }

    // ── Communication window check ─────────────────────────────────
    if (state.currentActivity === 'Downlink' && !state.communication.windowOpen) {
      warnings.push('Downlink activity running but communication window is closed');
    }

    // ── Orientation check ──────────────────────────────────────────
    if (state.orientation.locked && state.currentActivity === 'Observation') {
      violations.push({
        field:    'orientation.locked',
        rule:     'Observation requires attitude control',
        value:    1,
        limit:    0,
        severity: 'CRITICAL',
      });
    }

    const result = { valid: violations.length === 0, warnings, violations };

    if (violations.length > 0) {
      this._onConstraintViolation(violations);
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  _checkLowerBound(field, value, limit, margin, rule, warnings, violations) {
    if (value < limit) {
      violations.push({ field, rule, value, limit, severity: 'CRITICAL' });
    } else if (value < limit + margin) {
      warnings.push(`${field} is approaching lower limit: ${value.toFixed(1)} (limit: ${limit})`);
    }
  }

  _checkUpperBound(field, value, limit, margin, rule, warnings, violations) {
    if (value > limit) {
      violations.push({ field, rule, value, limit, severity: 'CRITICAL' });
    } else if (value > limit - margin) {
      warnings.push(`${field} is approaching upper limit: ${value.toFixed(1)} (limit: ${limit})`);
    }
  }
}
