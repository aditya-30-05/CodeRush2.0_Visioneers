/**
 * CommunicationEngine.js
 *
 * Models the spacecraft communication subsystem every tick.
 *
 * Manages:
 *   - Signal strength (% 0-100)
 *   - Communication window (open/closed)
 *   - Packet loss (%)
 *   - Latency (ms)
 *
 * Signal model:
 *   - Base signal drifts slowly around SIGNAL_BASE_STRENGTH
 *   - Downlink activity boosts signal by SIGNAL_DOWNLINK_BOOST
 *   - CommunicationLoss fault drops signal to 0
 *   - PacketLoss fault adds packet loss %
 *
 * Window model (simplified orbital):
 *   - Communication window simulated as sinusoidal availability
 *   - Window opens/closes on a ~90-second period by default
 *   - Can be overridden per-mission via config
 */

import {
  SIGNAL_BASE_STRENGTH,
  SIGNAL_DOWNLINK_BOOST,
  LATENCY_BASE_MS,
  ACTIVITIES,
} from '../utils/constants.js';
import { clamp, round, randomBetween } from '../utils/helpers.js';

export class CommunicationEngine {
  /**
   * @param {import('../digitalTwin/DigitalTwin.js').DigitalTwin} twin
   * @param {Object} [config]
   * @param {number} [config.windowPeriodSec=90]  - Orbital contact window period
   */
  constructor(twin, config = {}) {
    this._twin         = twin;
    this._windowPeriod = config.windowPeriodSec ?? 90; // seconds
  }

  /**
   * Compute and apply communication update for one tick.
   */
  update() {
    const state        = this._twin.getMutableState();
    const activity     = state.currentActivity;
    const missionTime  = state.missionTime;

    // ── Communication window (sinusoidal orbital model) ──────────
    // sin(2π * t / T) > 0 → window open; ≤ 0 → window closed
    const angle      = (2 * Math.PI * missionTime) / this._windowPeriod;
    const windowOpen = Math.sin(angle) >= -0.3; // generous window

    // ── Signal strength ───────────────────────────────────────────
    let signal = SIGNAL_BASE_STRENGTH;

    if (activity === ACTIVITIES.DOWNLINK) {
      signal = clamp(signal + SIGNAL_DOWNLINK_BOOST, 0, 100);
    }

    // Small realistic noise ±1%
    signal += randomBetween(-1, 1);
    signal  = clamp(round(signal, 1), 0, 100);

    // If window is closed, signal degrades
    if (!windowOpen) {
      signal = clamp(signal * 0.4, 0, 100);
    }

    // ── Latency ───────────────────────────────────────────────────
    const latency = round(LATENCY_BASE_MS + randomBetween(-20, 50), 0);

    // ── Packet loss ───────────────────────────────────────────────
    const packetLoss = windowOpen ? 0 : round(randomBetween(0, 5), 1);

    // ── Apply ─────────────────────────────────────────────────────
    state.communication.signalStrength = signal;
    state.communication.windowOpen     = windowOpen;
    state.communication.latencyMs      = latency;
    state.communication.packetLoss     = packetLoss;
  }
}
