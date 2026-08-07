/**
 * TelemetryRepository.js
 *
 * Persistence layer for telemetry log records.
 *
 * Actual Supabase schema (telemetry_logs):
 *   id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   mission_id            uuid REFERENCES missions(id)
 *   battery               numeric
 *   temperature           numeric
 *   power                 numeric       (power in watts)
 *   solar_current         numeric       (solar current in amps)
 *   signal_strength       numeric
 *   storage_used          numeric       (storage % used)
 *   cpu_usage             numeric
 *   ram_usage             numeric
 *   camera_status         boolean
 *   safe_mode             boolean
 *   communication         boolean
 *   reaction_wheel_status text
 *   mission_phase         text          (activity/phase name uppercase)
 *   telemetry_source      text
 *   created_at            timestamptz DEFAULT now()
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';

export class TelemetryRepository {
  /**
   * Insert a single telemetry record.
   *
   * Intentionally fire-and-forget — the hot tick path must not block.
   * Errors are logged but not rethrown.
   *
   * Only uses columns confirmed to exist in the actual Supabase schema.
   *
   * @param {Object} record
   */
  static async insert(record) {
    if (!dbAvailable) return;
    const payload = {
      mission_id:            record.mission_id,
      battery:               Math.round(record.battery ?? 100),
      temperature:           Math.round(record.temperature ?? 22),
      power:                 Math.round(record.power_gen ?? record.solar_gen ?? record.power ?? 420),
      solar_current:         Math.round((record.solar_gen ?? record.solar_current ?? 420) / 28),
      signal_strength:       Math.round(record.signal_strength ?? 92),
      storage_used:          Math.round(record.storage_pct ?? record.storage_used ?? 12),
      cpu_usage:             15,
      ram_usage:             22,
      camera_status:         record.activity === 'Observation',
      safe_mode:             record.safe_mode ?? false,
      communication:         (record.signal_strength ?? 92) > 20,
      reaction_wheel_status: record.faults?.includes('REACTION_WHEEL_FAILURE') ? 'FAULT' : 'HEALTHY',
      mission_phase:         (record.activity || record.mission_phase || 'OBSERVATION').toUpperCase(),
      telemetry_source:      'Simulation',
      created_at:            record.timestamp || new Date().toISOString(),
    };

    supabase
      .from(TABLES.TELEMETRY_LOGS)
      .insert(payload)
      .then(({ error }) => {
        if (error) logger.error('TelemetryRepository.insert failed', { message: error.message });
      });
  }

  /**
   * List all unique mission IDs from telemetry_logs.
   *
   * @returns {Promise<Object[]>}
   */
  static async listMissionsWithTelemetry() {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.TELEMETRY_LOGS)
        .select('mission_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map(r => r.mission_id).filter(Boolean))];
      return ids.map(id => ({ mission_id: id }));
    } catch (err) {
      logger.error('TelemetryRepository.listMissionsWithTelemetry failed', { message: err.message });
      return [];
    }
  }

  /**
   * Bulk insert multiple telemetry records (with only valid schema columns).
   *
   * @param {Object[]} records  Each record must already have schema-valid columns only.
   */
  static async bulkInsert(records) {
    if (!dbAvailable || !records.length) return;
    try {
      const { error } = await supabase
        .from(TABLES.TELEMETRY_LOGS)
        .insert(records);
      if (error) throw error;
    } catch (err) {
      logger.error('TelemetryRepository.bulkInsert failed', { message: err.message });
    }
  }

  /**
   * Fetch telemetry records for a given mission, ordered by created_at ascending.
   *
   * @param {string} missionId
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<Object[]>}
   */
  static async findByMission(missionId, limit = 100, offset = 0) {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.TELEMETRY_LOGS)
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      logger.error('TelemetryRepository.findByMission failed', { missionId, message: err.message });
      return [];
    }
  }

  /**
   * Fetch the most recent telemetry row.
   *
   * @param {string} missionId
   * @returns {Promise<Object|null>}
   */
  static async findLatest(missionId) {
    if (!dbAvailable) return null;
    try {
      const { data, error } = await supabase
        .from(TABLES.TELEMETRY_LOGS)
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('TelemetryRepository.findLatest failed', { missionId, message: err.message });
      return null;
    }
  }
}
