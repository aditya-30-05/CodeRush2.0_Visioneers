/**
 * TickEngine.js
 *
 * Drives the simulation clock at a configurable interval.
 *
 * Responsibilities:
 *   - Maintain wall-clock interval using setInterval
 *   - Advance the mission clock by one tick per interval
 *   - Execute the ordered tick pipeline on each interval
 *   - Support pause / resume / stop
 *   - Expose tick count and elapsed simulation time
 *
 * The TickEngine is deliberately thin — it knows nothing about
 * physics or spacecraft state.  It simply calls the pipeline
 * function provided by SimulationEngine on each interval.
 *
 * Architecture decision:
 *   Using setInterval (not a busy loop) keeps the Node.js event
 *   loop free, allows async operations to interleave safely, and
 *   makes the engine easy to pause/resume.
 *
 *   For high-fidelity replay (faster-than-realtime), SimulationEngine
 *   can set tickIntervalMs = 0 and call tick() manually in a loop.
 */

import { TICK_INTERVAL_MS } from '../utils/constants.js';

export class TickEngine {
  /**
   * @param {Function} pipelineFn       - Called each tick; receives (tickCount, missionTime)
   * @param {Object}   [config]
   * @param {number}   [config.tickIntervalMs]  - Override default 1000ms
   */
  constructor(pipelineFn, config = {}) {
    if (typeof pipelineFn !== 'function') {
      throw new Error('TickEngine requires a pipeline function');
    }

    this._pipeline        = pipelineFn;
    this._tickIntervalMs  = config.tickIntervalMs ?? TICK_INTERVAL_MS;
    this._intervalHandle  = null;
    this._tickCount       = 0;
    this._missionTime     = 0;
    this._running         = false;
    this._paused          = false;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Start the tick loop.
   * Throws if already running.
   */
  start() {
    if (this._running) throw new Error('TickEngine is already running');

    this._running = true;
    this._paused  = false;

    this._intervalHandle = setInterval(() => {
      if (!this._paused) {
        this._executeTick();
      }
    }, this._tickIntervalMs);
  }

  /**
   * Stop the tick loop permanently.
   * Call reset() to restart later.
   */
  stop() {
    if (this._intervalHandle) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }
    this._running = false;
    this._paused  = false;
  }

  /**
   * Pause the tick loop without destroying the interval.
   * Ticks continue to fire but the pipeline is not called.
   */
  pause() {
    if (!this._running) throw new Error('TickEngine is not running');
    this._paused = true;
  }

  /**
   * Resume after pause().
   */
  resume() {
    if (!this._running) throw new Error('TickEngine is not running');
    this._paused = false;
  }

  /**
   * Reset tick count and mission time to zero.
   * Stops the loop if running.
   */
  reset() {
    this.stop();
    this._tickCount   = 0;
    this._missionTime = 0;
  }

  /**
   * Manually advance one tick (useful for testing or accelerated replay).
   * Can be called whether or not the loop is running.
   */
  manualTick() {
    this._executeTick();
  }

  // ─────────────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────────────

  /** @returns {number} Total ticks executed */
  get tickCount()    { return this._tickCount; }

  /** @returns {number} Mission time in seconds */
  get missionTime()  { return this._missionTime; }

  /** @returns {boolean} */
  get isRunning()    { return this._running && !this._paused; }

  /** @returns {boolean} */
  get isPaused()     { return this._paused; }

  // ─────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────

  _executeTick() {
    this._tickCount++;
    this._missionTime++;  // 1 tick = 1 simulated second

    try {
      this._pipeline(this._tickCount, this._missionTime);
    } catch (err) {
      // Log but don't crash the tick loop — simulation continues
      console.error(`[TickEngine] Pipeline error at tick ${this._tickCount}:`, err.message);
    }
  }
}
