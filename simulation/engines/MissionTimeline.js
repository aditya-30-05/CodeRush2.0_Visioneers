/**
 * MissionTimeline.js
 *
 * Drives automatic activity sequencing based on mission time.
 *
 * Responsibilities:
 *   - Track which timeline entry is currently active
 *   - Detect activity transitions as simulation time advances
 *   - Notify SimulationEngine via callback when an activity changes
 *   - Report whether the mission end-time has been reached
 *
 * The timeline itself is owned by the Mission model; this class
 * only maintains cursor state (which entry is active) and fires
 * transition events.
 *
 * Architecture note:
 *   MissionTimeline does NOT write to DigitalTwin directly.
 *   It returns transition information, and SimulationEngine / TickEngine
 *   applies the change through ActivityEngine.
 */

import { MISSION_PHASES } from '../utils/constants.js';

export class MissionTimeline {
  /**
   * @param {import('../models/Mission.js').Mission} mission
   * @param {Function} onActivityChange - callback(newActivity, oldActivity)
   */
  constructor(mission, onActivityChange) {
    this._mission          = mission;
    this._onActivityChange = onActivityChange ?? (() => {});
    this._currentIndex     = -1;   // index into mission.timeline
    this._currentActivity  = null; // Activity | null
    this._completed        = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public interface
  // ─────────────────────────────────────────────────────────────────

  /**
   * Reset timeline cursor to start — call this on simulation reset.
   */
  reset() {
    this._currentIndex    = -1;
    this._currentActivity = null;
    this._completed       = false;
  }

  /**
   * Called every tick by TickEngine.
   * Checks whether a new timeline entry should become active.
   * Fires onActivityChange callback if a transition occurs.
   *
   * @param {number} missionTime - current mission clock in seconds
   * @returns {{ changed: boolean, activity: string, missionPhase: string }}
   */
  advance(missionTime) {
    // Check mission completion
    if (missionTime >= this._mission.duration) {
      if (!this._completed) {
        this._completed = true;
      }
      return {
        changed:      false,
        activity:     this._currentActivity?.activity ?? 'Idle',
        missionPhase: MISSION_PHASES.COMPLETED,
        completed:    true,
      };
    }

    const timeline  = this._mission.timeline;
    let   newIndex  = this._currentIndex;

    // Walk forward through timeline entries whose start time has passed
    for (let i = this._currentIndex + 1; i < timeline.length; i++) {
      if (timeline[i].time <= missionTime) {
        newIndex = i;
      } else {
        break;
      }
    }

    const changed = newIndex !== this._currentIndex;

    if (changed) {
      const previous        = this._currentActivity;
      this._currentIndex    = newIndex;
      this._currentActivity = timeline[newIndex];

      this._onActivityChange(this._currentActivity, previous);
    }

    const activityName = this._currentActivity?.activity ?? 'Idle';
    const phase = activityName === 'SafeMode'
      ? MISSION_PHASES.SAFE_MODE
      : MISSION_PHASES.ACTIVE;

    return {
      changed,
      activity:     activityName,
      missionPhase: phase,
      completed:    false,
      parameters:   this._currentActivity?.parameters ?? {},
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────────────

  /** @returns {import('../models/Activity.js').Activity | null} */
  get currentActivity() { return this._currentActivity; }

  /** @returns {boolean} */
  get isCompleted() { return this._completed; }

  /**
   * Return seconds until the next scheduled activity transition.
   * Returns null if there is no further activity.
   *
   * @param {number} missionTime
   * @returns {number | null}
   */
  secondsUntilNextActivity(missionTime) {
    const next = this._mission.getNextActivity(missionTime);
    return next ? next.time - missionTime : null;
  }
}
