/**
 * Mission.js
 *
 * Domain model for a loaded spacecraft mission.
 *
 * Wraps the parsed JSON and exposes a clean interface to the rest
 * of the simulation engine.  All field access goes through getters
 * so the backing representation can change without touching engines.
 */

import { Activity } from './Activity.js';

export class Mission {
  /**
   * @param {Object} raw - Parsed mission JSON object
   */
  constructor(raw) {
    // ── Required fields ──────────────────────────────────────────
    if (!raw.missionName) throw new Error('Mission JSON missing required field: missionName');
    if (!raw.duration)    throw new Error('Mission JSON missing required field: duration');
    if (!Array.isArray(raw.timeline)) throw new Error('Mission JSON missing required field: timeline (array)');

    this._name     = String(raw.missionName);
    this._duration = Number(raw.duration);   // seconds

    // ── Spacecraft initial configuration ─────────────────────────
    this._spacecraftConfig = Object.freeze({
      initialBattery:    raw.initialBattery    ?? 85,
      batteryVoltage:    raw.batteryVoltage    ?? 28.5,
      batteryCapacity:   raw.batteryCapacity   ?? 100,
      initialTemp:       raw.initialTemp       ?? 22,
      minTemp:           raw.minTemp           ?? -30,
      maxTemp:           raw.maxTemp           ?? 65,
      initialStorage:    raw.initialStorage    ?? 0,
      storageMB:         raw.storageMB         ?? 2048,
      initialSignal:     raw.initialSignal     ?? 85,
      downlinkBandwidth: raw.downlinkBandwidth ?? 100,
      initialSolar:      raw.initialSolar      ?? 120,
      missionName:       this._name,
      duration:          this._duration,
    });

    // ── Timeline: sorted ascending by time ───────────────────────
    this._timeline = raw.timeline
      .map(entry => new Activity(entry))
      .sort((a, b) => a.time - b.time);

    Object.freeze(this._timeline); // array frozen; items already frozen in Activity
  }

  // ── Getters ──────────────────────────────────────────────────────

  get name()            { return this._name; }
  get duration()        { return this._duration; }
  get spacecraftConfig(){ return this._spacecraftConfig; }
  get timeline()        { return this._timeline; }

  /**
   * Return the activity that should be active at a given mission time.
   * Finds the last entry whose start time ≤ missionTime.
   *
   * @param {number} missionTime - seconds
   * @returns {Activity | null}
   */
  getActivityAt(missionTime) {
    let result = null;
    for (const entry of this._timeline) {
      if (entry.time <= missionTime) {
        result = entry;
      } else {
        break;
      }
    }
    return result;
  }

  /**
   * Return the next scheduled activity after missionTime.
   *
   * @param {number} missionTime
   * @returns {Activity | null}
   */
  getNextActivity(missionTime) {
    for (const entry of this._timeline) {
      if (entry.time > missionTime) return entry;
    }
    return null;
  }

  /**
   * Human-readable summary for logging.
   * @returns {string}
   */
  toString() {
    return `Mission("${this._name}", ${this._duration}s, ${this._timeline.length} activities)`;
  }
}
