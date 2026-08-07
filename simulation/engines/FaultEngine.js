/**
 * FaultEngine.js
 *
 * Manages fault injection, clearance, and per-tick propagation.
 *
 * Architecture:
 *   - Faults are stored in DigitalTwin.state.activeFaults[]
 *   - Each fault has a registered "propagator" function
 *   - Every tick, propagate() runs all active fault propagators
 *   - Propagators directly mutate mutable DigitalTwin state
 *   - Duration-based faults auto-expire after their duration elapses
 *   - Cascading cross-effects compound when multiple faults are active
 *
 * Supported faults (FAULT_IDS):
 *   BATTERY_LEAK          → drain x2
 *   SOLAR_PANEL_FAILURE   → solarGeneration = 0
 *   THERMAL_SPIKE         → temperature +5°C
 *   COMMUNICATION_LOSS    → signal = 0, windowOpen = false
 *   PACKET_LOSS           → packetLoss = random 20-80%
 *   SENSOR_DRIFT          → telemetry values deviate ±5% (flagged here)
 *   REACTION_WHEEL_FAILURE→ orientation locked = true
 *   ACTUATOR_FAILURE      → general actuator flag set
 *   CONFLICTING_SENSORS   → conflicting flag set
 *   MISSING_TELEMETRY     → missing flag set (handled in TelemetryEngine)
 *
 * Multiple simultaneous faults are fully supported.
 * Each fault is applied independently every tick.
 * Cascading cross-effects are applied after individual propagation.
 */

import { Fault }      from '../models/Fault.js';
import { FAULT_IDS, THERMAL_SPIKE_FAULT } from '../utils/constants.js';
import { clamp, round, randomBetween }    from '../utils/helpers.js';

export class FaultEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   * @param {Function} [onFaultInjected]  - callback(fault)
   */
  constructor(twin, onFaultInjected) {
    this._twin            = twin;
    this._onFaultInjected = onFaultInjected ?? (() => {});
    this._onFaultExpired  = null; // set externally if needed

    // Registry: faultId → propagator function
    this._propagators = this._buildPropagatorRegistry();
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Inject a fault into the Digital Twin.
   * If the fault is already active, the call is a no-op.
   *
   * @param {string} faultId   - Use FAULT_IDS constants
   * @param {Object} [meta]    - Optional { severity, description, duration, recoveryMode } overrides
   * @returns {Fault} the injected fault record
   */
  injectFault(faultId, meta = {}) {
    const state = this._twin.getMutableState();

    // Idempotent — do not add duplicate
    const existing = state.activeFaults.find(f => f.id === faultId);
    if (existing) return existing;

    const fault = new Fault(
      faultId,
      meta.description ?? this._defaultDescription(faultId),
      {
        severity:     meta.severity     ?? this._defaultSeverity(faultId),
        missionTime:  state.missionTime,
        injectedAt:   Date.now(),
        duration:     meta.duration     ?? null,
        recoveryMode: meta.recoveryMode ?? (meta.duration ? 'AUTO_EXPIRE' : 'MANUAL'),
        subsystem:    this._subsystemMap()[faultId] ?? 'Unknown',
        effects:      this._effectsMap()[faultId]   ?? [],
      }
    );

    state.activeFaults.push(fault);
    this._onFaultInjected(fault);

    return fault;
  }

  /**
   * Clear (remove) a fault by ID.
   *
   * @param {string} faultId
   * @returns {boolean} true if a fault was removed
   */
  clearFault(faultId) {
    const state  = this._twin.getMutableState();
    const before = state.activeFaults.length;
    state.activeFaults = state.activeFaults.filter(f => f.id !== faultId);
    
    if (state.activeFaults.length < before) {
      this._revertFaultEffects(state, faultId);
      return true;
    }
    return false;
  }

  /**
   * Clear ALL active faults.
   */
  clearAllFaults() {
    const state = this._twin.getMutableState();
    state.activeFaults = [];
  }

  /**
   * Apply every active fault's side-effects to the Digital Twin.
   * Called once per tick, AFTER resource engines, BEFORE constraint check.
   *
   * Pipeline:
   *   1. Remove expired faults (duration-based auto-expiry)
   *   2. Run individual fault propagators
   *   3. Apply cascading cross-effects between active faults
   */
  propagate() {
    const state = this._twin.getMutableState();

    // Reset per-tick fault-induced warning list
    state.warnings = [];

    // ── Step 1: Auto-expire faults ──────────────────────────────
    const expired = [];
    state.activeFaults = state.activeFaults.filter(fault => {
      if (fault.isExpired(state.missionTime)) {
        expired.push(fault);
        state.warnings.push(`RECOVERED: ${fault.id} auto-expired after ${fault.duration}s`);
        return false;
      }
      return true;
    });

    // Notify expired faults (for logging/socket emission)
    for (const fault of expired) {
      if (this._onFaultExpired) {
        this._onFaultExpired(fault);
      }
    }

    // ── Step 2: Individual fault propagation ─────────────────────
    for (const fault of state.activeFaults) {
      const propagator = this._propagators[fault.id];
      if (propagator) {
        propagator(state, fault);
      } else {
        state.warnings.push(`Unknown fault propagator for: ${fault.id}`);
      }
    }

    // ── Step 3: Cascading cross-effects ─────────────────────────
    this._applyCascadingEffects(state);
  }

  /**
   * Return enriched metadata for all active faults.
   * Includes subsystem, effects, elapsed time — suitable for API responses.
   *
   * @returns {Object[]}
   */
  getActiveFaultsDetailed() {
    const state = this._twin.getMutableState();
    return state.activeFaults.map(fault => ({
      id:            fault.id,
      description:   fault.description,
      severity:      fault.severity,
      subsystem:     fault.subsystem,
      effects:       fault.effects,
      recoveryMode:  fault.recoveryMode,
      duration:      fault.duration,
      elapsedTime:   Math.round(state.missionTime - fault.injectedAtMissionTime),
      remainingTime: fault.duration
        ? Math.max(0, fault.duration - (state.missionTime - fault.injectedAtMissionTime))
        : null,
      injectedAtMissionTime: fault.injectedAtMissionTime,
      injectedAt:    fault.injectedAt,
      active:        true,
    }));
  }

  /**
   * Set a callback for when faults auto-expire.
   * @param {Function} fn
   */
  onFaultExpired(fn) {
    this._onFaultExpired = fn;
  }

  /**
   * Return the full fault catalog with metadata.
   * @returns {Object[]}
   */
  getFaultCatalog() {
    const subsystems   = this._subsystemMap();
    const effects      = this._effectsMap();
    const severities   = this._defaultSeverities();
    const descriptions = this._defaultDescriptions();
    const state        = this._twin.getMutableState();
    const activeIds    = state.activeFaults.map(f => f.id);

    return Object.values(FAULT_IDS).map(id => ({
      id,
      name:        this._faultLabel(id),
      subsystem:   subsystems[id],
      severity:    severities[id],
      description: descriptions[id],
      effects:     effects[id],
      active:      activeIds.includes(id),
    }));
  }

  // ─────────────────────────────────────────────────────────────────
  // Private — fault propagators
  // ─────────────────────────────────────────────────────────────────

  /**
   * Build the fault-id → propagator function registry.
   * Each propagator receives the mutable state and the Fault record.
   *
   * @returns {Object<string, Function>}
   */
  _buildPropagatorRegistry() {
    return {

      [FAULT_IDS.BATTERY_LEAK]: (state) => {
        // Drain at 2× normal rate — add extra drain on top of PowerEngine's work
        const extraDrain = Math.abs(state.battery.drainRate);
        state.battery.percentage = clamp(
          round(state.battery.percentage - extraDrain, 2), 0, 100
        );
        state.warnings.push('FAULT: Battery leak — drain rate doubled');
      },

      [FAULT_IDS.SOLAR_PANEL_FAILURE]: (state) => {
        state.power.solarGeneration = 0;
        state.power.generation      = 0;
        state.warnings.push('FAULT: Solar panel failure — no solar power');
      },

      [FAULT_IDS.THERMAL_SPIKE]: (state) => {
        state.thermal.temperature = clamp(
          round(state.thermal.temperature + THERMAL_SPIKE_FAULT, 2), -100, 200
        );
        state.warnings.push(`FAULT: Thermal spike — temperature +${THERMAL_SPIKE_FAULT}°C`);
      },

      [FAULT_IDS.COMMUNICATION_LOSS]: (state) => {
        state.communication.signalStrength = 0;
        state.communication.windowOpen     = false;
        state.communication.packetLoss     = 100;
        state.warnings.push('FAULT: Communication loss — signal dropped to 0');
      },

      [FAULT_IDS.PACKET_LOSS]: (state) => {
        const loss = round(randomBetween(20, 80), 1);
        state.communication.packetLoss = loss;
        state.warnings.push(`FAULT: Packet loss — ${loss}% packets dropped`);
      },

      [FAULT_IDS.SENSOR_DRIFT]: (state, fault) => {
        // Mark state so TelemetryEngine can apply drift to its snapshot
        // We store a flag rather than corrupting real state
        state.warnings.push('FAULT: Sensor drift active — telemetry values may deviate ±5%');
        // Actual drift is applied in TelemetryEngine.snapshot()
      },

      [FAULT_IDS.REACTION_WHEEL_FAILURE]: (state) => {
        state.reactionWheel.healthy  = false;
        state.orientation.locked     = true;
        state.orientation.mode       = 'TUMBLING';
        state.pointingMode           = 'TUMBLING';
        state.warnings.push('FAULT: Reaction wheel failure — orientation control lost');
      },

      [FAULT_IDS.ACTUATOR_FAILURE]: (state) => {
        // General actuator fault — disable camera and antenna steering
        state.camera.on   = false;
        state.camera.mode = 'IDLE';
        state.antenna.trackingEarth = false;
        state.warnings.push('FAULT: Actuator failure — camera and antenna disabled');
      },

      [FAULT_IDS.CONFLICTING_SENSORS]: (state) => {
        state.warnings.push('FAULT: Conflicting sensor readings detected — data unreliable');
      },

      [FAULT_IDS.MISSING_TELEMETRY]: (state) => {
        state.warnings.push('FAULT: Missing telemetry — some packets will be skipped');
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private — cascading cross-effects
  // ─────────────────────────────────────────────────────────────────

  /**
   * Apply cascading effects when multiple faults are active simultaneously.
   * These compound on top of individual propagator effects.
   */
  _applyCascadingEffects(state) {
    const activeIds = state.activeFaults.map(f => f.id);

    // Solar failure + battery leak → extreme power crisis
    if (activeIds.includes(FAULT_IDS.SOLAR_PANEL_FAILURE) &&
        activeIds.includes(FAULT_IDS.BATTERY_LEAK)) {
      state.battery.percentage = clamp(
        round(state.battery.percentage - 0.5, 2), 0, 100
      );
      state.warnings.push('CASCADE: Solar failure + battery leak — critical power crisis');
    }

    // Solar failure accelerates battery drain even without battery leak
    if (activeIds.includes(FAULT_IDS.SOLAR_PANEL_FAILURE) &&
        !activeIds.includes(FAULT_IDS.BATTERY_LEAK)) {
      state.battery.percentage = clamp(
        round(state.battery.percentage - 0.3, 2), 0, 100
      );
      state.warnings.push('CASCADE: No solar generation — battery draining faster');
    }

    // Thermal spike + any power fault → CPU throttle
    if (activeIds.includes(FAULT_IDS.THERMAL_SPIKE) &&
        (activeIds.includes(FAULT_IDS.SOLAR_PANEL_FAILURE) || activeIds.includes(FAULT_IDS.BATTERY_LEAK))) {
      state.thermal.temperature = clamp(
        round(state.thermal.temperature + 2, 2), -100, 200
      );
      state.warnings.push('CASCADE: Thermal spike + power fault — thermal runaway risk');
    }

    // Communication loss + sensor drift → total situational awareness loss
    if (activeIds.includes(FAULT_IDS.COMMUNICATION_LOSS) &&
        activeIds.includes(FAULT_IDS.SENSOR_DRIFT)) {
      state.warnings.push('CASCADE: Comms loss + sensor drift — total situational awareness failure');
    }

    // Reaction wheel failure + actuator failure → complete loss of spacecraft control
    if (activeIds.includes(FAULT_IDS.REACTION_WHEEL_FAILURE) &&
        activeIds.includes(FAULT_IDS.ACTUATOR_FAILURE)) {
      state.warnings.push('CASCADE: Reaction wheel + actuator failure — total control loss');
    }

    // 3+ simultaneous faults → emergency mode warning
    if (state.activeFaults.length >= 3) {
      state.warnings.push(`EMERGENCY: ${state.activeFaults.length} simultaneous faults — consider safe mode`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Private — metadata registries
  // ─────────────────────────────────────────────────────────────────

  _subsystemMap() {
    return {
      [FAULT_IDS.BATTERY_LEAK]:          'Power',
      [FAULT_IDS.SOLAR_PANEL_FAILURE]:   'Power',
      [FAULT_IDS.THERMAL_SPIKE]:         'Thermal',
      [FAULT_IDS.COMMUNICATION_LOSS]:    'Communication',
      [FAULT_IDS.PACKET_LOSS]:           'Communication',
      [FAULT_IDS.SENSOR_DRIFT]:          'Sensors',
      [FAULT_IDS.REACTION_WHEEL_FAILURE]:'ADCS',
      [FAULT_IDS.ACTUATOR_FAILURE]:      'Instruments',
      [FAULT_IDS.CONFLICTING_SENSORS]:   'Sensors',
      [FAULT_IDS.MISSING_TELEMETRY]:     'Telemetry',
    };
  }

  _effectsMap() {
    return {
      [FAULT_IDS.BATTERY_LEAK]:          ['Battery drain rate doubled', 'Thermal stress on power bus'],
      [FAULT_IDS.SOLAR_PANEL_FAILURE]:   ['Solar generation drops to 0W', 'Battery enters discharge-only mode'],
      [FAULT_IDS.THERMAL_SPIKE]:         ['Temperature rises +5°C/tick', 'Possible CPU throttling'],
      [FAULT_IDS.COMMUNICATION_LOSS]:    ['Signal strength drops to 0%', 'Communication window closed', 'Data downlink halted'],
      [FAULT_IDS.PACKET_LOSS]:           ['20-80% telemetry packets dropped', 'Downlink bandwidth reduced'],
      [FAULT_IDS.SENSOR_DRIFT]:          ['Telemetry readings deviate ±5%', 'Attitude determination degraded'],
      [FAULT_IDS.REACTION_WHEEL_FAILURE]:['Orientation control lost', 'Spacecraft enters tumbling mode'],
      [FAULT_IDS.ACTUATOR_FAILURE]:      ['Camera disabled', 'Antenna tracking disabled'],
      [FAULT_IDS.CONFLICTING_SENSORS]:   ['Sensor data unreliable', 'Cross-validation failed'],
      [FAULT_IDS.MISSING_TELEMETRY]:     ['Random telemetry frame drops', 'Monitoring gaps'],
    };
  }

  _faultLabel(faultId) {
    const labels = {
      [FAULT_IDS.BATTERY_LEAK]:          'Battery Cell Leak',
      [FAULT_IDS.SOLAR_PANEL_FAILURE]:   'Solar Panel Failure',
      [FAULT_IDS.THERMAL_SPIKE]:         'Thermal Spike',
      [FAULT_IDS.COMMUNICATION_LOSS]:    'Communication Loss',
      [FAULT_IDS.PACKET_LOSS]:           'Packet Loss',
      [FAULT_IDS.SENSOR_DRIFT]:          'Sensor Drift',
      [FAULT_IDS.REACTION_WHEEL_FAILURE]:'Reaction Wheel Failure',
      [FAULT_IDS.ACTUATOR_FAILURE]:      'Actuator Failure',
      [FAULT_IDS.CONFLICTING_SENSORS]:   'Conflicting Sensors',
      [FAULT_IDS.MISSING_TELEMETRY]:     'Missing Telemetry',
    };
    return labels[faultId] ?? faultId;
  }

  _defaultDescriptions() {
    return {
      [FAULT_IDS.BATTERY_LEAK]:          'Battery cell leaking — elevated discharge rate',
      [FAULT_IDS.SOLAR_PANEL_FAILURE]:   'Solar panel array offline — zero generation',
      [FAULT_IDS.THERMAL_SPIKE]:         'Thermal spike detected — temperature rising rapidly',
      [FAULT_IDS.COMMUNICATION_LOSS]:    'Total communication link failure',
      [FAULT_IDS.PACKET_LOSS]:           'Intermittent packet loss on downlink',
      [FAULT_IDS.SENSOR_DRIFT]:          'Sensor calibration drift — readings deviated',
      [FAULT_IDS.REACTION_WHEEL_FAILURE]:'Reaction wheel bearing failure — attitude control lost',
      [FAULT_IDS.ACTUATOR_FAILURE]:      'Actuator subsystem failure',
      [FAULT_IDS.CONFLICTING_SENSORS]:   'Multiple sensors reporting contradictory values',
      [FAULT_IDS.MISSING_TELEMETRY]:     'Telemetry packet loss — missing data frames',
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  _defaultDescription(faultId) {
    return this._defaultDescriptions()[faultId] ?? `Unknown fault: ${faultId}`;
  }

  _defaultSeverities() {
    return {
      [FAULT_IDS.BATTERY_LEAK]:          'HIGH',
      [FAULT_IDS.SOLAR_PANEL_FAILURE]:   'CRITICAL',
      [FAULT_IDS.THERMAL_SPIKE]:         'HIGH',
      [FAULT_IDS.COMMUNICATION_LOSS]:    'CRITICAL',
      [FAULT_IDS.PACKET_LOSS]:           'MEDIUM',
      [FAULT_IDS.SENSOR_DRIFT]:          'LOW',
      [FAULT_IDS.REACTION_WHEEL_FAILURE]:'CRITICAL',
      [FAULT_IDS.ACTUATOR_FAILURE]:      'HIGH',
      [FAULT_IDS.CONFLICTING_SENSORS]:   'MEDIUM',
      [FAULT_IDS.MISSING_TELEMETRY]:     'LOW',
    };
  }

  _defaultSeverity(faultId) {
    return this._defaultSeverities()[faultId] ?? 'MEDIUM';
  }

  /**
   * Revert the lasting side-effects of a fault when it is cleared.
   * This heals the spacecraft back to its nominal state.
   */
  _revertFaultEffects(state, faultId) {
    switch (faultId) {
      case FAULT_IDS.BATTERY_LEAK:
      case FAULT_IDS.SOLAR_PANEL_FAILURE:
        state.battery.percentage = 100;
        state.battery.voltage = 29.0;
        break;
      case FAULT_IDS.THERMAL_SPIKE:
        state.thermal.temperature = 22; // default ambient
        break;
      case FAULT_IDS.COMMUNICATION_LOSS:
      case FAULT_IDS.PACKET_LOSS:
        state.communication.signalStrength = 85;
        state.communication.windowOpen = true;
        state.communication.packetLoss = 0;
        break;
      case FAULT_IDS.REACTION_WHEEL_FAILURE:
        state.reactionWheel.healthy = true;
        state.orientation.locked = false;
        state.orientation.mode = 'EARTH_POINTING';
        state.pointingMode = 'EARTH_POINTING';
        break;
      case FAULT_IDS.ACTUATOR_FAILURE:
        state.camera.on = false;
        state.camera.mode = 'IDLE';
        state.antenna.trackingEarth = true;
        break;
    }

    // Auto-recover from safe mode if system is healthy again
    if (state.safeMode && state.battery.percentage > 20) {
      state.safeMode = false;
      state.currentActivity = state.previousActivity && state.previousActivity !== 'SafeMode' ? state.previousActivity : 'Observation';
      state.missionPhase = 'ACTIVE';
      state.safeModeTrigger = null;
    }
  }
}
