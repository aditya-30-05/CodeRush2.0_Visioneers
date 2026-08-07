/**
 * FaultRepository.js (operator actions extension)
 *
 * OperatorActionRepository — logs every operator API call for audit trail.
 *
 * Schema (Supabase table: operator_actions):
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   mission_id      uuid
 *   action_type     text NOT NULL
 *   payload         jsonb
 *   mission_time    integer
 *   ip_address      text
 *   created_at      timestamptz DEFAULT now()
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';

export class OperatorActionRepository {
  /**
   * Log an operator action.
   *
   * @param {Object} record
   */
  static async log(record) {
    if (!dbAvailable) return;
    supabase
      .from(TABLES.OPERATOR_ACTIONS)
      .insert(record)
      .then(({ error }) => {
        if (error) logger.error('OperatorActionRepository.log failed', { message: error.message });
      });
  }

  /**
   * Fetch operator action audit trail for a mission.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async findByMission(missionId) {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.OPERATOR_ACTIONS)
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      logger.error('OperatorActionRepository.findByMission failed', { missionId, message: err.message });
      return [];
    }
  }
}
