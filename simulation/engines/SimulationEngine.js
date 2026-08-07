/**
 * SimulationEngine.js
 *
 * Top-level orchestrator for the Spacecraft Digital Twin Simulation Engine.
 *
 * This is the ONLY class that external consumers (Telemetry Pipeline,
 * Anomaly Detection, AI Copilot, Operator Console, etc.) interact with.
 * Everything else is an internal implementation detail.
 *
 * ─────────────────────────────────────────────────────────────────
 * Public API
 * ─────────────────────────────────────────────────────────────────
 *   initializeMission(mission)         → load and seed from Mission instance
 *   loadMission(filePath | rawObj)     → load from file or plain object
 *   start()                            → begin tick loop
 *   stop()                             → permanently stop
 *   pause()                            → freeze simulation
 *   resume()                           → unfreeze simulation
 *   reset()                            → return to tick 0 with same mission
 *   injectFault(faultId, meta?)        → inject a named fault
 *   clearFault(faultId)                → remove a named fault
 *   setActivity(activity, params?)     → manually override current activity
 *   getCurrentState()                  → frozen Digital Twin snapshot
 *   getTelemetry()                     → most recent Telemetry record
 *   getMissionTime()                   → mission clock in seconds
 *
 * ─────────────────────────────────────────────────────────────────
 * Event Callbacks
 * ─────────────────────────────────────────────────────────────────
 *   onTick(state, telemetry)           → every tick
 *   onTelemetry(telemetry)             → every valid telemetry frame
 *   onActivityChange(newActivity, oldActivity)
 *   onFaultInjected(fault)
 *   onConstraintViolation(violations[])
 *   onMissionCompleted(finalState)
 *
 * ─────────────────────────────────────────────────────────────────
 * Tick pipeline (executed in order every second):
 * ─────────────────────────────────────────────────────────────────
 *   1. Advance MissionTimeline → determine current activity
 *   2. ResourceEngine.update()  → activity flags + all resource engines
 *   3. FaultEngine.propagate()  → apply fault side-effects
 *   4. ConstraintEngine.validate() → check limits, fire violation callbacks
 *   5. TelemetryEngine.snapshot()  → produce and emit Telemetry record
 *   6. Update DigitalTwin timestamp and missionTime
 *   7. Fire onTick callback
 *   8. Check mission completion
 */

import { DigitalTwin }       from '../digitalTwin/DigitalTwin.js';
import { MissionLoader }     from '../utils/MissionLoader.js';
import { TickEngine }        from './TickEngine.js';
import { MissionTimeline }   from './MissionTimeline.js';
import { ResourceEngine }    from './ResourceEngine.js';
import { FaultEngine }       from './FaultEngine.js';
import { TelemetryEngine }   from './TelemetryEngine.js';
import { ConstraintEngine }  from './ConstraintEngine.js';
import { MISSION_PHASES }    from '../utils/constants.js';

export class SimulationEngine {
  /**
   * @param {Object} [callbacks]  - Named event callbacks
   * @param {Function} [callbacks.onTick]
   * @param {Function} [callbacks.onTelemetry]
   * @param {Function} [callbacks.onActivityChange]
   * @param {Function} [callbacks.onFaultInjected]
   * @param {Function} [callbacks.onConstraintViolation]
   * @param {Function} [callbacks.onMissionCompleted]
   * @param {Object}   [config]   - Engine configuration overrides
   * @param {number}   [config.tickIntervalMs]
   */
  constructor(callbacks = {}, config = {}) {
    // ── Callback registry ─────────────────────────────────────────
    this._cb = {
      onTick:                callbacks.onTick               ?? (() => {}),
      onTelemetry:           callbacks.onTelemetry          ?? (() => {}),
      onActivityChange:      callbacks.onActivityChange     ?? (() => {}),
      onFaultInjected:       callbacks.onFaultInjected      ?? (() => {}),
      onConstraintViolation: callbacks.onConstraintViolation ?? (() => {}),
      onMissionCompleted:    callbacks.onMissionCompleted    ?? (() => {}),
    };

    this._config = config;

    // ── Core state ────────────────────────────────────────────────
    this._twin    = new DigitalTwin();
    this._mission = null;
    this._missionCompletedFired = false;

    // ── Sub-engines (wired after mission load) ────────────────────
    this._timeline    = null;
    this._resources   = null;
    this._faultEngine = null;
    this._telemetry   = null;
    this._constraints = null;
    this._ticker      = null;

    this._manualActivity = null; // null = follow timeline
  }

  // ═══════════════════════════════════════════════════════════════
  // Mission management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initialize the engine with an already-constructed Mission instance.
   * This wires up all sub-engines and seeds the Digital Twin.
   *
   * @param {import('../models/Mission.js').Mission} mission
   */
  initializeMission(mission) {
    if (!mission) throw new Error('SimulationEngine: mission cannot be null');

    this._mission = mission;
    this._missionCompletedFired = false;
    this._manualActivity = null;

    // Seed the Digital Twin from mission config
    this._twin.initialize(mission.spacecraftConfig);

    // Wire up engines
    this._timeline = new MissionTimeline(
      mission,
      (newAct, oldAct) => this._cb.onActivityChange(newAct, oldAct)
    );

    this._resources = new ResourceEngine(
      this._twin,
      { communication: this._config.communication }
    );

    this._faultEngine = new FaultEngine(
      this._twin,
      (fault) => this._cb.onFaultInjected(fault)
    );

    this._telemetry = new TelemetryEngine(
      this._twin,
      (telemetry) => this._cb.onTelemetry(telemetry)
    );

    this._constraints = new ConstraintEngine(
      this._twin,
      (violations) => this._cb.onConstraintViolation(violations)
    );

    this._ticker = new TickEngine(
      (tickCount, missionTime) => this._executePipeline(tickCount, missionTime),
      { tickIntervalMs: this._config.tickIntervalMs }
    );

    console.log(`[SimulationEngine] Mission loaded: ${mission}`);
  }

  /**
   * Load a mission from a file path or plain object and initialize.
   *
   * @param {string | Object} source  - File path string or raw mission object
   */
  loadMission(source) {
    const mission = typeof source === 'string'
      ? MissionLoader.loadFromFile(source)
      : MissionLoader.loadFromObject(source);

    this.initializeMission(mission);
  }

  // ═══════════════════════════════════════════════════════════════
  // Simulation lifecycle
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start the simulation tick loop.
   * Mission must be loaded first.
   */
  start() {
    this._assertMissionLoaded('start');
    this._twin.getMutableState().missionPhase = MISSION_PHASES.ACTIVE;
    this._ticker.start();
    console.log('[SimulationEngine] Simulation started');
  }

  /**
   * Stop the simulation permanently.
   */
  stop() {
    if (this._ticker) {
      this._ticker.stop();
      console.log('[SimulationEngine] Simulation stopped');
    }
  }

  /**
   * Pause the simulation (tick loop keeps running, pipeline is skipped).
   */
  pause() {
    this._assertMissionLoaded('pause');
    this._ticker.pause();
    console.log('[SimulationEngine] Simulation paused');
  }

  /**
   * Resume after pause.
   */
  resume() {
    this._assertMissionLoaded('resume');
    this._ticker.resume();
    console.log('[SimulationEngine] Simulation resumed');
  }

  /**
   * Reset the simulation to tick 0 with the same loaded mission.
   * Stops the loop, resets Digital Twin and all engines.
   */
  reset() {
    this._assertMissionLoaded('reset');
    this._ticker.reset();
    this._twin.reset();
    this._timeline.reset();
    this._faultEngine.clearAllFaults();
    this._telemetry.clearBuffer();
    this._missionCompletedFired = false;
    this._manualActivity = null;
    console.log('[SimulationEngine] Simulation reset');
  }

  // ═══════════════════════════════════════════════════════════════
  // Fault management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Inject a fault into the running simulation.
   *
   * @param {string} faultId  - Use FAULT_IDS constants
   * @param {Object} [meta]   - { severity, description }
   * @returns {import('../models/Fault.js').Fault}
   */
  injectFault(faultId, meta = {}) {
    this._assertMissionLoaded('injectFault');
    return this._faultEngine.injectFault(faultId, meta);
  }

  /**
   * Clear a fault by ID.
   *
   * @param {string} faultId
   * @returns {boolean}
   */
  clearFault(faultId) {
    this._assertMissionLoaded('clearFault');
    return this._faultEngine.clearFault(faultId);
  }

  // ═══════════════════════════════════════════════════════════════
  // Activity control
  // ═══════════════════════════════════════════════════════════════

  /**
   * Manually override the current activity, bypassing the timeline.
   * Pass null to return to timeline-driven activity.
   *
   * @param {string | null} activity
   * @param {Object} [parameters]
   */
  setActivity(activity, parameters = {}) {
    this._assertMissionLoaded('setActivity');
    this._manualActivity = activity ? { activity, parameters } : null;
    if (activity) {
      const state = this._twin.getMutableState();
      const prev  = state.currentActivity;
      state.currentActivity = activity;
      if (activity !== prev) {
        this._cb.onActivityChange({ activity, parameters }, { activity: prev });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // State inspection
  // ═══════════════════════════════════════════════════════════════

  /**
   * Return a deep-frozen snapshot of the current spacecraft state.
   * Safe to pass to any external consumer.
   *
   * @returns {Readonly<SpacecraftState>}
   */
  getCurrentState() {
    this._assertMissionLoaded('getCurrentState');
    return this._twin.getState();
  }

  /**
   * Return the most recent Telemetry record.
   *
   * @returns {import('../models/Telemetry.js').Telemetry | null}
   */
  getTelemetry() {
    this._assertMissionLoaded('getTelemetry');
    return this._telemetry.getLatest();
  }

  /**
   * Return the current mission clock value in seconds.
   *
   * @returns {number}
   */
  getMissionTime() {
    return this._ticker?.missionTime ?? 0;
  }

  /**
   * Return the telemetry history buffer.
   *
   * @returns {import('../models/Telemetry.js').Telemetry[]}
   */
  getTelemetryBuffer() {
    this._assertMissionLoaded('getTelemetryBuffer');
    return this._telemetry.getBuffer();
  }

  // ═══════════════════════════════════════════════════════════════
  // Private — tick pipeline
  // ═══════════════════════════════════════════════════════════════

  /**
   * The ordered tick pipeline.
   * Called by TickEngine once per interval.
   *
   * @param {number} tickCount
   * @param {number} missionTime
   */
  _executePipeline(tickCount, missionTime) {
    const state = this._twin.getMutableState();

    // Update clock
    state.missionTime = missionTime;
    state.timestamp   = Date.now();

    // ── Step 1: Advance timeline ────────────────────────────────
    let activity, parameters, missionPhase;

    if (this._manualActivity) {
      // Manual override — bypass timeline
      activity      = this._manualActivity.activity;
      parameters    = this._manualActivity.parameters;
      missionPhase  = activity === 'SafeMode'
        ? MISSION_PHASES.SAFE_MODE
        : MISSION_PHASES.ACTIVE;
    } else {
      const result  = this._timeline.advance(missionTime);
      activity      = result.activity;
      parameters    = result.parameters ?? {};
      missionPhase  = result.missionPhase;

      // Handle mission completion
      if (result.completed && !this._missionCompletedFired) {
        this._missionCompletedFired = true;
        state.missionPhase = MISSION_PHASES.COMPLETED;
        this._ticker.stop();
        this._cb.onMissionCompleted(this._twin.getState());
        return;
      }
    }

    // Persist current activity to state
    state.previousActivity = state.currentActivity !== activity
      ? state.currentActivity
      : state.previousActivity;
    state.currentActivity = activity;
    state.missionPhase    = missionPhase;

    // ── Step 2: Resource engines ────────────────────────────────
    this._resources.update(activity, parameters);

    // ── Step 3: Fault propagation ────────────────────────────────
    this._faultEngine.propagate();

    // Auto-safe-mode: critical battery breach
    if (state.battery.percentage < 20 && !state.safeMode) {
      state.safeMode        = true;
      state.currentActivity = 'SafeMode';
      state.missionPhase    = MISSION_PHASES.SAFE_MODE;
      state.safeModeTrigger = 'LOW_BATTERY';
    }

    // ── Step 4: Constraint validation ───────────────────────────
    const constraintResult = this._constraints.validate();

    // Merge constraint warnings into state warnings
    if (constraintResult.warnings.length) {
      state.warnings.push(...constraintResult.warnings);
    }

    // ── Step 5: Telemetry snapshot ───────────────────────────────
    const telemetry = this._telemetry.snapshot();

    // ── Step 6: Fire onTick callback ─────────────────────────────
    this._cb.onTick(this._twin.getState(), telemetry);
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  _assertMissionLoaded(methodName) {
    if (!this._mission) {
      throw new Error(`SimulationEngine.${methodName}(): no mission loaded. Call loadMission() first.`);
    }
  }
}
