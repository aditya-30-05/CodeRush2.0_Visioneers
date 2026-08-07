/**
 * TelemetryService.js
 *
 * Manages telemetry reception, buffering, persistence, and API reads.
 *
 * Responsibilities:
 *   - Subscribes to SimulationService telemetry events at startup
 *   - Persists telemetry to Supabase every N ticks (configurable)
 *   - Provides query methods for the REST API
 *
 * The in-memory buffer in SimulationService is the live source;
 * Supabase is the historical store.
 */

import * as SimulationService      from './SimulationService.js';
import { TelemetryRepository }     from '../database/TelemetryRepository.js';
import { logger }                  from '../middlewares/logger.js';
import { parseIntSafe }            from '../utils/helpers.js';

const LOG_EVERY_N_TICKS = parseIntSafe(process.env.TELEMETRY_LOG_EVERY_N_TICKS, 1);
let _tickCounter = 0;

/**
 * Wire telemetry persistence callback into SimulationService.
 * Called once at server startup (after SimulationService.initialize).
 */
export function initialize() {
  SimulationService.on('onTelemetry', ({ missionId, telemetry }) => {
    _tickCounter++;

    if (_tickCounter % LOG_EVERY_N_TICKS !== 0) return;

    // Map telemetry to DB row
    const t = typeof telemetry.toJSON === 'function' ? telemetry.toJSON() : telemetry;

    const tsISO = typeof t.timestamp === 'number'
      ? new Date(t.timestamp).toISOString()
      : (t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString());

    TelemetryRepository.insert({
      mission_id:      missionId,
      sequence_number: t.sequenceNumber ?? _tickCounter,
      mission_time:    t.missionTime,
      timestamp:       tsISO,
      battery:         t.battery?.percentage   ?? t.battery   ?? null,
      temperature:     t.thermal?.temperature  ?? t.temperature ?? null,
      power_gen:       t.power?.consumption    ?? null,
      solar_gen:       t.power?.solarGeneration ?? null,
      storage_pct:     t.storage?.usedPercentage ?? t.storage ?? null,
      signal_strength: t.communication?.signalStrength ?? t.signalStrength ?? null,
      orientation:     t.orientation?.mode ?? t.orientation ?? null,
      activity:        t.activity ?? null,
      safe_mode:       t.safeMode ?? false,
      faults:          Array.isArray(t.activeFaults) ? t.activeFaults : [],
      raw_payload:     t,
    });
  });

  logger.info('TelemetryService initialised — logging every ' + LOG_EVERY_N_TICKS + ' tick(s)');
}

// ─────────────────────────────────────────────────────────────────
// Query methods (used by REST controllers)
// ─────────────────────────────────────────────────────────────────

/**
 * Return the current in-memory telemetry buffer (live feed).
 * Falls back to the engine's last telemetry record.
 *
 * @returns {Object[]}
 */
export function getBuffer() {
  return SimulationService.getTelemetryBuffer();
}

/**
 * Return the single latest telemetry record.
 *
 * @returns {Object|null}
 */
export function getLatest() {
  const tel = SimulationService.getLatestTelemetry();
  if (!tel) return null;
  return typeof tel.toJSON === 'function' ? tel.toJSON() : tel;
}

/**
 * Query historical telemetry from Supabase.
 *
 * @param {string} missionId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Object[]>}
 */
export async function getHistorical(missionId, limit = 100, offset = 0) {
  return TelemetryRepository.findByMission(missionId, limit, offset);
}
