/**
 * Fault.js
 *
 * Value object representing a single active fault record.
 *
 * A Fault is created by FaultEngine.injectFault() and stored in
 * DigitalTwin.state.activeFaults[].
 *
 * Faults are immutable after construction; their effects are applied
 * each tick by FaultEngine.propagate().
 */

export class Fault {
  /**
   * @param {string} id           - Fault identifier (use FAULT_IDS constant)
   * @param {string} description  - Human-readable description
   * @param {Object} [meta]       - Optional metadata (severity, injectedAt, etc.)
   */
  constructor(id, description, meta = {}) {
    this.id          = String(id);
    this.description = String(description);
    this.severity    = meta.severity   ?? 'MEDIUM'; // LOW | MEDIUM | HIGH | CRITICAL
    this.injectedAt  = meta.injectedAt ?? Date.now(); // wall-clock ms
    this.injectedAtMissionTime = meta.missionTime ?? 0; // sim seconds

    Object.freeze(this);
  }

  /**
   * @returns {string}
   */
  toString() {
    return `Fault(${this.id}, ${this.severity})`;
  }
}
