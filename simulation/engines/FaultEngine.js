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
   * @param {Object} [meta]    - Optional { severity, description } overrides
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
        severity:    meta.severity  ?? this._defaultSeverity(faultId),
        missionTime: state.missionTime,
        injectedAt:  Date.now(),
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
    return state.activeFaults.length < before;
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
   */
  propagate() {
    const state = this._twin.getMutableState();

    // Reset per-tick fault-induced warning list
    state.warnings = [];

    for (const fault of state.activeFaults) {
      const propagator = this._propagators[fault.id];
      if (propagator) {
        propagator(state, fault);
      } else {
        state.warnings.push(`Unknown fault propagator for: ${fault.id}`);
      }
    }
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
  // Private helpers
  // ─────────────────────────────────────────────────────────────────

  _defaultDescription(faultId) {
    const descriptions = {
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
    return descriptions[faultId] ?? `Unknown fault: ${faultId}`;
  }

  _defaultSeverity(faultId) {
    const severities = {
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
    return severities[faultId] ?? 'MEDIUM';
  }
}
