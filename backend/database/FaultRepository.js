/**
 * FaultRepository.js
 *
 * Persistence layer for fault injection/clearance events.
 *
 * Schema (Supabase table: fault_logs):
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   mission_id      uuid REFERENCES missions(id)
 *   fault_id        text NOT NULL
 *   description     text
 *   severity        text
 *   action          text  -- 'INJECTED' | 'CLEARED'
 *   mission_time    integer
 *   created_at      timestamptz DEFAULT now()
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';

export class FaultRepository {
  /**
   * Log a fault injection or clearance event.
   *
   * @param {Object} record
   * @returns {Promise<Object|null>}
   */
  static async log(record) {
    if (!dbAvailable) return null;
    try {
      const { data, error } = await supabase
        .from(TABLES.FAULT_LOGS)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('FaultRepository.log failed', { message: err.message });
      return null;
    }
  }

  /**
   * Fetch all fault events for a mission.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async findByMission(missionId) {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.FAULT_LOGS)
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      logger.error('FaultRepository.findByMission failed', { missionId, message: err.message });
      return [];
    }
  }
}
