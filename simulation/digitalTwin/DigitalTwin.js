/**
 * DigitalTwin.js
 *
 * The single source of truth for spacecraft state.
 *
 * Every engine reads from and writes to this object.
 * No engine duplicates state; no engine owns a private copy.
 *
 * The class exposes:
 *   - initialize(config)   → seed defaults from mission config
 *   - reset()              → return state to initial values
 *   - getState()           → deep-frozen snapshot (safe to pass to callbacks)
 *   - update(patch)        → controlled partial update with validation
 *
 * Architecture note:
 *   DigitalTwin is intentionally NOT a singleton.  The SimulationEngine
 *   owns the instance and injects it into every engine.  This makes each
 *   engine unit-testable in isolation.
 */

export class DigitalTwin {
  /** @param {import('../utils/constants.js').SpacecraftDefaults} defaults */
  constructor(defaults = {}) {
    this._defaults = defaults;
    this._state = this._buildInitialState(defaults);
  }

  // ─────────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────────

  /**
   * (Re)initialize state from a mission configuration object.
   * Called by SimulationEngine on loadMission() or reset().
   *
   * @param {Object} config - Mission-level configuration overrides.
   */
  initialize(config = {}) {
    this._defaults = { ...this._defaults, ...config };
    this._state = this._buildInitialState(this._defaults);
  }

  /**
   * Reset state to initial defaults without reloading mission config.
   */
  reset() {
    this._state = this._buildInitialState(this._defaults);
  }

  // ─────────────────────────────────────────────────────────────────
  // State access
  // ─────────────────────────────────────────────────────────────────

  /**
   * Return a deep-frozen snapshot of the current spacecraft state.
   * Callers receive an immutable view; they cannot accidentally mutate it.
   *
   * @returns {Readonly<SpacecraftState>}
   */
  getState() {
    return Object.freeze(this._deepClone(this._state));
  }

  /**
   * Return a live (mutable) reference to the internal state.
   * Only engines called from within the tick pipeline should use this.
   * External callers should always use getState().
   *
   * @returns {SpacecraftState}
   */
  getMutableState() {
    return this._state;
  }

  // ─────────────────────────────────────────────────────────────────
  // Controlled updates
  // ─────────────────────────────────────────────────────────────────

  /**
   * Apply a shallow or deep patch to the spacecraft state.
   * Nested objects (battery, camera, etc.) are merged, not replaced.
   *
   * @param {Partial<SpacecraftState>} patch
   */
  update(patch) {
    this._merge(this._state, patch);
  }

  /**
   * Clamp a numeric field to [min, max].
   *
   * @param {string} field  - Dot-path like 'battery.percentage'
   * @param {number} min
   * @param {number} max
   */
  clamp(field, min, max) {
    const parts = field.split('.');
    let obj = this._state;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    const key = parts[parts.length - 1];
    obj[key] = Math.max(min, Math.min(max, obj[key]));
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Build the canonical initial spacecraft state.
   *
   * All fields are defined here — this is the authoritative schema.
   * No field should ever appear for the first time in an engine.
   *
   * @param {Object} cfg
   * @returns {SpacecraftState}
   */
  _buildInitialState(cfg = {}) {
    return {
      // ── Time ────────────────────────────────────────────────────
      timestamp: Date.now(),
      missionTime: 0,                       // seconds elapsed since mission start
      missionDuration: cfg.duration ?? 600, // total planned mission length (sec)

      // ── Mission context ──────────────────────────────────────────
      missionName: cfg.missionName ?? 'Unknown Mission',
      missionPhase: 'PRE_LAUNCH',
      currentActivity: 'Idle',
      previousActivity: null,

      // ── Power subsystem ──────────────────────────────────────────
      battery: {
        percentage: cfg.initialBattery ?? 85,   // %
        voltage: cfg.batteryVoltage ?? 28.5,     // V
        capacity: cfg.batteryCapacity ?? 100,    // Wh (nominal)
        temperature: 20,                          // °C
        charging: false,
        drainRate: 0,                             // %/tick
      },
      power: {
        generation: 0,    // W  — solar + any other sources
        consumption: 0,   // W  — total draw
        solarGeneration: cfg.initialSolar ?? 120, // W
        available: true,
      },

      // ── Thermal subsystem ───────────────────────────────────────
      thermal: {
        temperature: cfg.initialTemp ?? 22,   // °C  spacecraft body
        minSafe: cfg.minTemp ?? -30,
        maxSafe: cfg.maxTemp ?? 65,
        deltaPerTick: 0,                       // computed each tick
      },

      // ── Data storage ─────────────────────────────────────────────
      storage: {
        usedMB: cfg.initialStorage ?? 0,
        totalMB: cfg.storageMB ?? 2048,
        fillRateMB: 0,    // MB/tick — positive = filling, negative = draining
        percentUsed: 0,
      },

      // ── Communication subsystem ──────────────────────────────────
      communication: {
        signalStrength: cfg.initialSignal ?? 85,  // %
        windowOpen: true,
        packetLoss: 0,       // %
        latencyMs: 250,      // ms
        downlinkBandwidth: cfg.downlinkBandwidth ?? 100, // Mbps
      },

      // ── Attitude / Orientation ───────────────────────────────────
      orientation: {
        mode: 'EARTH_POINTING',  // EARTH_POINTING | SUN_POINTING | TARGET_POINTING | TUMBLING
        roll: 0,    // degrees
        pitch: 0,
        yaw: 0,
        reactionWheelHealthy: true,
        locked: false,           // true when reaction wheel has failed
      },

      // ── Instruments / hardware ───────────────────────────────────
      camera: {
        on: false,
        mode: 'IDLE',           // IDLE | CAPTURING | STANDBY
        powerDrawW: 0,
      },
      antenna: {
        deployed: true,
        trackingEarth: true,
        gainDbi: 12,
      },
      reactionWheel: {
        healthy: true,
        rpm: 3000,
        torqueNm: 0,
      },

      // ── Operational mode flags ───────────────────────────────────
      pointingMode: 'EARTH_POINTING',
      safeMode: false,
      safeModeTrigger: null,

      // ── Faults ───────────────────────────────────────────────────
      activeFaults: [],   // Array<FaultRecord>
      warnings: [],       // Array<string>  — current-tick warnings
    };
  }

  /**
   * Deep-clone an object (supports plain objects, arrays, primitives).
   * Does NOT handle Date, Map, Set, etc. — state must stay JSON-serialisable.
   *
   * @param {*} obj
   * @returns {*}
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._deepClone(item));
    const clone = {};
    for (const key of Object.keys(obj)) {
      clone[key] = this._deepClone(obj[key]);
    }
    return clone;
  }

  /**
   * Recursively merge patch into target.
   * Nested plain objects are merged; primitives and arrays are replaced.
   *
   * @param {Object} target
   * @param {Object} patch
   */
  _merge(target, patch) {
    for (const key of Object.keys(patch)) {
      if (
        patch[key] !== null &&
        typeof patch[key] === 'object' &&
        !Array.isArray(patch[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        this._merge(target[key], patch[key]);
      } else {
        target[key] = patch[key];
      }
    }
  }
}

/**
 * @typedef {Object} SpacecraftState
 * Full type definition is inferred from _buildInitialState above.
 * Included here as a reference comment for IDE tooling.
 */
