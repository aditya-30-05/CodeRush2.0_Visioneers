/**
 * ReplayRepository.js
 *
 * Persistence layer for replay timeline entries.
 *
 * A replay entry is a timestamped snapshot of the spacecraft state
 * stored every N ticks so that operators can scrub through history.
 *
 * Schema (Supabase table: replay_logs):
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   mission_id      uuid REFERENCES missions(id)
 *   mission_time    integer
 *   state_snapshot  jsonb
 *   events          jsonb[]  -- activity changes, faults, violations at this tick
 *   created_at      timestamptz DEFAULT now()
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';

export class ReplayRepository {
  /**
   * Save a replay snapshot.
   *
   * @param {Object} record
   */
  static async save(record) {
    if (!dbAvailable) return;
    supabase
      .from(TABLES.REPLAY_LOGS)
      .insert(record)
      .then(({ error }) => {
        if (error) logger.error('ReplayRepository.save failed', { message: error.message });
      });
  }

  /**
   * Retrieve all replay frames for a mission, ordered by mission_time.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async findByMission(missionId) {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.REPLAY_LOGS)
        .select('*')
        .eq('mission_id', missionId)
        .order('mission_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      logger.error('ReplayRepository.findByMission failed', { missionId, message: err.message });
      return [];
    }
  }

  /**
   * List all missions that have replay data.
   *
   * @returns {Promise<Object[]>}
   */
  static async listMissionsWithReplay() {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.REPLAY_LOGS)
        .select('mission_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Deduplicate
      const ids = [...new Set((data ?? []).map(r => r.mission_id))];
      return ids.map(id => ({ mission_id: id }));
    } catch (err) {
      logger.error('ReplayRepository.listMissionsWithReplay failed', { message: err.message });
      return [];
    }
  }
}
