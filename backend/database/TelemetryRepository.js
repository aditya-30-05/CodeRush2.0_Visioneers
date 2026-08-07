/**
 * TelemetryRepository.js
 *
 * Persistence layer for telemetry log records.
 *
 * Schema (Supabase table: telemetry_logs):
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   mission_id      uuid REFERENCES missions(id)
 *   sequence_number integer
 *   mission_time    integer
 *   timestamp       timestamptz
 *   battery         numeric
 *   temperature     numeric
 *   power_gen       numeric
 *   solar_gen       numeric
 *   storage_pct     numeric
 *   signal_strength numeric
 *   orientation     text
 *   activity        text
 *   safe_mode       boolean
 *   faults          text[]
 *   raw_payload     jsonb
 *   created_at      timestamptz DEFAULT now()
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
   * @param {Object} record
   */
  static async insert(record) {
    if (!dbAvailable) return;
    supabase
      .from(TABLES.TELEMETRY_LOGS)
      .insert(record)
      .then(({ error }) => {
        if (error) logger.error('TelemetryRepository.insert failed', { message: error.message });
      });
  }

  /**
   * Bulk insert multiple telemetry records.
   *
   * @param {Object[]} records
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
   * Fetch telemetry records for a given mission.
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
        .order('mission_time', { ascending: true })
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
        .order('mission_time', { ascending: false })
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
