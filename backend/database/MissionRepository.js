/**
 * MissionRepository.js
 *
 * Persistence layer for mission records.
 *
 * All methods are async and gracefully no-op when the database
 * is unavailable (dbAvailable = false).
 *
 * Schema (Supabase table: missions):
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
 *   name            text NOT NULL
 *   status          text NOT NULL
 *   started_at      timestamptz
 *   completed_at    timestamptz
 *   duration_sec    integer
 *   config          jsonb
 *   final_state     jsonb
 *   created_at      timestamptz DEFAULT now()
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';

export class MissionRepository {
  /**
   * Create a new mission record.
   *
   * @param {Object} mission
   * @returns {Promise<Object|null>}
   */
  static async create(mission) {
    if (!dbAvailable) return null;
    try {
      const { data, error } = await supabase
        .from(TABLES.MISSIONS)
        .insert(mission)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('MissionRepository.create failed', { message: err.message });
      return null;
    }
  }

  /**
   * Update mission fields by id.
   *
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object|null>}
   */
  static async update(id, updates) {
    if (!dbAvailable) return null;
    try {
      const { data, error } = await supabase
        .from(TABLES.MISSIONS)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('MissionRepository.update failed', { id, message: err.message });
      return null;
    }
  }

  /**
   * Find mission by id.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    if (!dbAvailable) return null;
    try {
      const { data, error } = await supabase
        .from(TABLES.MISSIONS)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('MissionRepository.findById failed', { id, message: err.message });
      return null;
    }
  }

  /**
   * List all missions ordered by creation time descending.
   *
   * @param {number} limit
   * @returns {Promise<Object[]>}
   */
  static async list(limit = 50) {
    if (!dbAvailable) return [];
    try {
      const { data, error } = await supabase
        .from(TABLES.MISSIONS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      logger.error('MissionRepository.list failed', { message: err.message });
      return [];
    }
  }
}
