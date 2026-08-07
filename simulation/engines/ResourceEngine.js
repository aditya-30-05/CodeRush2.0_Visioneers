/**
 * ResourceEngine.js
 *
 * Thin orchestration wrapper that runs all resource sub-engines
 * in the correct dependency order within each tick.
 *
 * Order:
 *   1. ActivityEngine   — hardware flags (camera, pointing, safeMode)
 *   2. PowerEngine      — solar, battery, consumption
 *   3. ThermalEngine    — temperature
 *   4. StorageEngine    — data fill/drain
 *   5. CommunicationEngine — signal, window, latency
 *   6. OrientationEngine   — attitude slew
 *
 * All six engines share the same DigitalTwin instance.
 * This class itself holds no state.
 */

import { ActivityEngine }      from './ActivityEngine.js';
import { PowerEngine }         from './PowerEngine.js';
import { ThermalEngine }       from './ThermalEngine.js';
import { StorageEngine }       from './StorageEngine.js';
import { CommunicationEngine } from './CommunicationEngine.js';
import { OrientationEngine }   from './OrientationEngine.js';

export class ResourceEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   * @param {Object} [config]
   */
  constructor(twin, config = {}) {
    this._activity      = new ActivityEngine(twin);
    this._power         = new PowerEngine(twin);
    this._thermal       = new ThermalEngine(twin);
    this._storage       = new StorageEngine(twin);
    this._communication = new CommunicationEngine(twin, config.communication);
    this._orientation   = new OrientationEngine(twin);
  }

  /**
   * Run all resource sub-engines for the current tick.
   *
   * @param {string} activity   - current mission activity
   * @param {Object} parameters - activity-level parameters
   */
  update(activity, parameters = {}) {
    this._activity.apply(activity, parameters);
    this._power.update();
    this._thermal.update();
    this._storage.update();
    this._communication.update();
    this._orientation.update();
  }
}
