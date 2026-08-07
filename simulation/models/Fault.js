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
 *
 * Recovery modes:
 *   MANUAL       — operator must explicitly clear the fault
 *   AUTO_EXPIRE  — fault clears automatically after `duration` seconds
 *   AUTO_RECOVER — fault clears automatically and subsystem recovers gradually
 *   PERMANENT    — fault persists until mission reset
 */

export class Fault {
  /**
   * @param {string} id           - Fault identifier (use FAULT_IDS constant)
   * @param {string} description  - Human-readable description
   * @param {Object} [meta]       - Optional metadata
   * @param {string} [meta.severity]      - LOW | MEDIUM | HIGH | CRITICAL
   * @param {number} [meta.injectedAt]    - wall-clock ms
   * @param {number} [meta.missionTime]   - sim seconds at injection
   * @param {number} [meta.duration]      - seconds until auto-expire (null = permanent/manual)
   * @param {string} [meta.recoveryMode]  - MANUAL | AUTO_EXPIRE | AUTO_RECOVER | PERMANENT
   * @param {string} [meta.subsystem]     - affected subsystem name
   * @param {string[]} [meta.effects]     - human-readable effect descriptions
   */
  constructor(id, description, meta = {}) {
    this.id          = String(id);
    this.description = String(description);
    this.severity    = meta.severity     ?? 'MEDIUM';
    this.injectedAt  = meta.injectedAt   ?? Date.now();
    this.injectedAtMissionTime = meta.missionTime ?? 0;

    // Phase 3 additions
    this.duration     = meta.duration     ?? null;   // seconds; null = no auto-expire
    this.recoveryMode = meta.recoveryMode ?? (meta.duration ? 'AUTO_EXPIRE' : 'MANUAL');
    this.subsystem    = meta.subsystem    ?? 'Unknown';
    this.effects      = meta.effects      ?? [];
    this.active       = true;

    Object.freeze(this);
  }

  /**
   * Check whether this fault has expired based on elapsed mission time.
   *
   * @param {number} currentMissionTime  - current sim seconds
   * @returns {boolean}
   */
  isExpired(currentMissionTime) {
    if (this.duration === null) return false;
    if (this.recoveryMode === 'PERMANENT') return false;
    return (currentMissionTime - this.injectedAtMissionTime) >= this.duration;
  }

  /**
   * @returns {string}
   */
  toString() {
    return `Fault(${this.id}, ${this.severity}, ${this.recoveryMode})`;
  }
}
