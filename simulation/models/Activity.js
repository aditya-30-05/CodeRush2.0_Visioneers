/**
 * Activity.js
 *
 * Value object representing a single scheduled activity entry
 * in a mission timeline.
 *
 * Immutable after construction.
 */

export class Activity {
  /**
   * @param {Object} raw   - Raw object from mission JSON
   * @param {number} raw.time          - Mission-time (seconds) at which to start
   * @param {string} raw.activity      - Activity name (must match ACTIVITIES constant)
   * @param {Object} [raw.parameters]  - Optional activity-specific parameters
   */
  constructor(raw) {
    this.time       = Number(raw.time);
    this.activity   = String(raw.activity);
    this.parameters = Object.freeze({ ...(raw.parameters ?? {}) });

    Object.freeze(this);
  }

  /**
   * Human-readable representation for logging.
   * @returns {string}
   */
  toString() {
    return `Activity(t=${this.time}s, ${this.activity})`;
  }
}
