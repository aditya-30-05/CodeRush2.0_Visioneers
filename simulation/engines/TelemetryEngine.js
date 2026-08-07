/**
 * TelemetryEngine.js
 *
 * Produces a Telemetry snapshot from the current Digital Twin state
 * at the end of each tick, AFTER all engines have updated state.
 *
 * Responsibilities:
 *   - Build an immutable Telemetry value object from current state
 *   - Apply sensor drift if SENSOR_DRIFT fault is active
 *   - Randomly skip packet if MISSING_TELEMETRY or PACKET_LOSS fault active
 *   - Fire onTelemetry callback
 *   - Maintain a rolling buffer of the last N telemetry records
 *
 * The Telemetry record is also returned from snapshot() so
 * TickEngine can include it in the onTick payload.
 */

import { Telemetry }   from '../models/Telemetry.js';
import { FAULT_IDS }   from '../utils/constants.js';
import { applyDrift }  from '../utils/helpers.js';

const TELEMETRY_BUFFER_SIZE = 300; // retain last 5 minutes @ 1 tick/sec

export class TelemetryEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   * @param {Function} [onTelemetry]  - callback(Telemetry)
   */
  constructor(twin, onTelemetry) {
    this._twin        = twin;
    this._onTelemetry = onTelemetry ?? (() => {});
    this._sequence    = 0;
    this._buffer      = [];  // Telemetry[]
    this._lastTelemetry = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Produce a telemetry snapshot for the current tick.
   * Applies sensor drift and packet-loss suppression based on faults.
   *
   * @returns {Telemetry | null}  null if packet was suppressed
   */
  snapshot() {
    const state        = this._twin.getMutableState();
    const activeFaults = state.activeFaults.map(f => f.id);

    // Packet loss — randomly suppress this telemetry frame
    const hasMissingFault   = activeFaults.includes(FAULT_IDS.MISSING_TELEMETRY);
    const hasPacketLoss     = activeFaults.includes(FAULT_IDS.PACKET_LOSS);
    const packetLossPct     = state.communication.packetLoss;

    if (hasMissingFault && Math.random() < 0.25) {
      // 25% chance of dropped packet when MISSING_TELEMETRY fault active
      state.warnings.push('Telemetry packet suppressed by MISSING_TELEMETRY fault');
      return null;
    }

    if (hasPacketLoss && Math.random() < packetLossPct / 100) {
      state.warnings.push(`Telemetry packet dropped (packet loss: ${packetLossPct}%)`);
      return null;
    }

    this._sequence++;

    // Build the Telemetry record from a frozen state snapshot
    const frozenState = this._twin.getState();
    let telemetry     = new Telemetry(frozenState, this._sequence);

    // Sensor drift — deviate numeric readings by ±5%
    if (activeFaults.includes(FAULT_IDS.SENSOR_DRIFT)) {
      telemetry = this._applyDrift(telemetry);
    }

    // Maintain rolling buffer
    this._buffer.push(telemetry);
    if (this._buffer.length > TELEMETRY_BUFFER_SIZE) {
      this._buffer.shift();
    }

    this._lastTelemetry = telemetry;
    this._onTelemetry(telemetry);

    return telemetry;
  }

  /**
   * Return the most recent telemetry record.
   * @returns {Telemetry | null}
   */
  getLatest() {
    return this._lastTelemetry;
  }

  /**
   * Return a copy of the telemetry buffer (newest last).
   * @returns {Telemetry[]}
   */
  getBuffer() {
    return [...this._buffer];
  }

  /**
   * Clear the telemetry buffer (e.g., on mission reset).
   */
  clearBuffer() {
    this._buffer    = [];
    this._sequence  = 0;
    this._lastTelemetry = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Private — drift application
  // ─────────────────────────────────────────────────────────────────

  /**
   * Return a new Telemetry-like plain object with sensor readings
   * deviated by ±5%.
   * We rebuild a plain object (not a Telemetry instance) to avoid
   * mutating the frozen record.
   *
   * @param {Telemetry} t
   * @returns {Telemetry}
   */
  _applyDrift(t) {
    // Create a mutable clone
    const draft = Object.assign(Object.create(Telemetry.prototype), t);

    // Apply drift to numeric sensor fields
    const DRIFTED_FIELDS = [
      'battery', 'batteryVoltage', 'solarGeneration',
      'powerGeneration', 'powerConsumption',
      'temperature', 'storageUsedMB', 'storagePct',
      'signalStrength', 'latencyMs',
      'roll', 'pitch', 'yaw',
    ];

    for (const field of DRIFTED_FIELDS) {
      if (typeof draft[field] === 'number') {
        draft[field] = Math.round(applyDrift(draft[field], 5) * 100) / 100;
      }
    }

    Object.freeze(draft);
    return draft;
  }
}
