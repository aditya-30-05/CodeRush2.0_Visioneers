/**
 * ReplayRepository.js
 *
 * Persistence layer for database-backed Replay History system.
 *
 * Tables (Supabase):
 *   1. replay_sessions: id, mission_id, mission_name, start_time, end_time, duration, status, created_at
 *   2. replay_snapshots: id, replay_session_id, mission_id, tick, mission_time, timestamp, telemetry_data, subsystem_state, digital_twin_state, created_at
 *   3. replay_events: id, replay_session_id, mission_id, tick, mission_time, event_type, event_name, description, severity, event_data, created_at
 */

import { supabase, dbAvailable } from '../config/supabase.js';
import { TABLES }                from '../utils/constants.js';
import { logger }                from '../middlewares/logger.js';
import { now }                   from '../utils/helpers.js';

// In-memory fallback repositories if DB tables are uninitialized in schema cache
const _memorySessions  = new Map(); // mission_id -> session
const _memorySnapshots = new Map(); // mission_id -> snapshot[]
const _memoryEvents    = new Map(); // mission_id -> event[]

export class ReplayRepository {
  // ── 1. Replay Sessions ─────────────────────────────────────────────

  /**
   * Save or update a replay session record in replay_sessions table.
   *
   * @param {Object} sessionRecord
   */
  static async saveSession(sessionRecord) {
    const record = {
      mission_id:   sessionRecord.mission_id || sessionRecord.missionId,
      mission_name: sessionRecord.mission_name || sessionRecord.missionName || 'OrbitOps Mission',
      start_time:   sessionRecord.start_time || sessionRecord.startTime || now(),
      end_time:     sessionRecord.end_time || sessionRecord.endTime || null,
      duration:     sessionRecord.duration || 0,
      status:       sessionRecord.status || 'RECORDING',
      created_at:   sessionRecord.created_at || now(),
    };

    _memorySessions.set(record.mission_id, record);

    if (!dbAvailable) return record;

    try {
      const { data, error } = await supabase
        .from(TABLES.REPLAY_SESSIONS)
        .upsert(record, { onConflict: 'mission_id' })
        .select()
        .maybeSingle();

      if (error) {
        logger.error('ReplayRepository.saveSession failed', { message: error.message });
      }
      return data || record;
    } catch (err) {
      logger.error('ReplayRepository.saveSession exception', { message: err.message });
      return record;
    }
  }

  /**
   * Find a replay session by mission_id.
   *
   * @param {string} missionId
   * @returns {Promise<Object|null>}
   */
  static async findSession(missionId) {
    if (!dbAvailable) {
      return _memorySessions.get(missionId) || null;
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.REPLAY_SESSIONS)
        .select('*')
        .eq('mission_id', missionId)
        .maybeSingle();

      if (error || !data) {
        return _memorySessions.get(missionId) || null;
      }
      return data;
    } catch (err) {
      return _memorySessions.get(missionId) || null;
    }
  }

  /**
   * List all replay sessions.
   *
   * @returns {Promise<Object[]>}
   */
  static async listSessions() {
    if (!dbAvailable) {
      return Array.from(_memorySessions.values());
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.REPLAY_SESSIONS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return Array.from(_memorySessions.values());
      }
      return data;
    } catch (err) {
      return Array.from(_memorySessions.values());
    }
  }


  // ── 2. Replay Snapshots ───────────────────────────────────────────

  /**
   * Save a single snapshot to replay_snapshots.
   *
   * @param {Object} snapshot
   */
  static async saveSnapshot(snapshot) {
    const mId = snapshot.mission_id || snapshot.missionId;
    if (!mId) return;

    const record = {
      replay_session_id:  snapshot.replay_session_id || snapshot.sessionId || mId,
      mission_id:         mId,
      tick:               snapshot.tick ?? 0,
      mission_time:       snapshot.mission_time ?? snapshot.missionTime ?? 0,
      timestamp:          snapshot.timestamp ? new Date(snapshot.timestamp).toISOString() : now(),
      telemetry_data:     snapshot.telemetry_data || snapshot.telemetry || {},
      subsystem_state:    snapshot.subsystem_state || snapshot.subsystems || {},
      digital_twin_state: snapshot.digital_twin_state || snapshot.digitalTwin || {},
      created_at:         now(),
    };

    if (!_memorySnapshots.has(mId)) {
      _memorySnapshots.set(mId, []);
    }
    _memorySnapshots.get(mId).push(record);

    if (!dbAvailable) return;

    try {
      const { error } = await supabase
        .from(TABLES.REPLAY_SNAPSHOTS)
        .insert(record);

      if (error) {
        // Fallback to legacy replay_logs if replay_snapshots table isn't migrated yet
        supabase
          .from(TABLES.REPLAY_LOGS)
          .insert({
            mission_id:     mId,
            mission_time:   record.mission_time,
            state_snapshot: record.telemetry_data,
            events:         [],
            created_at:     record.created_at,
          })
          .then(({ error: legErr }) => {
            if (legErr) logger.debug('Legacy replay_logs fallback skipped', { message: legErr.message });
          });
      }
    } catch (err) {
      logger.debug('ReplayRepository.saveSnapshot exception', { message: err.message });
    }
  }

  /**
   * Retrieve all replay snapshots for a mission ordered by tick ASC.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async findSnapshots(missionId) {
    let results = [];

    if (dbAvailable) {
      try {
        const { data, error } = await supabase
          .from(TABLES.REPLAY_SNAPSHOTS)
          .select('*')
          .eq('mission_id', missionId)
          .order('tick', { ascending: true });

        if (!error && data && data.length > 0) {
          results = data;
        } else {
          // Check legacy replay_logs
          const { data: legData } = await supabase
            .from(TABLES.REPLAY_LOGS)
            .select('*')
            .eq('mission_id', missionId)
            .order('mission_time', { ascending: true });

          if (legData && legData.length > 0) {
            results = legData.map((row, idx) => ({
              id:                 row.id,
              mission_id:         row.mission_id,
              tick:               idx,
              mission_time:       row.mission_time,
              timestamp:          row.created_at,
              telemetry_data:     row.state_snapshot,
              subsystem_state:    row.state_snapshot?.subsystems || {},
              digital_twin_state: row.state_snapshot?.digitalTwin || {},
              created_at:         row.created_at,
            }));
          }
        }
      } catch (err) {
        logger.debug('ReplayRepository.findSnapshots DB error', { message: err.message });
      }
    }

    // Combine with memory buffer fallback
    if (results.length === 0 && _memorySnapshots.has(missionId)) {
      results = _memorySnapshots.get(missionId);
    }

    return results;
  }


  // ── 3. Replay Events ───────────────────────────────────────────────

  /**
   * Save a single event to replay_events.
   *
   * @param {Object} eventRecord
   */
  static async saveEvent(eventRecord) {
    const mId = eventRecord.mission_id || eventRecord.missionId;
    if (!mId) return;

    const record = {
      replay_session_id: eventRecord.replay_session_id || mId,
      mission_id:        mId,
      tick:              eventRecord.tick ?? 0,
      mission_time:      eventRecord.mission_time ?? eventRecord.missionTime ?? 0,
      event_type:        eventRecord.event_type || eventRecord.type || 'system',
      event_name:        eventRecord.event_name || eventRecord.subsystem || 'System',
      description:       eventRecord.description || '',
      severity:          eventRecord.severity || (eventRecord.type === 'anomaly' ? 'HIGH' : 'INFO'),
      event_data:        eventRecord.event_data || eventRecord.payload || {},
      created_at:        eventRecord.created_at || now(),
    };

    if (!_memoryEvents.has(mId)) {
      _memoryEvents.set(mId, []);
    }
    _memoryEvents.get(mId).push(record);

    if (!dbAvailable) return;

    try {
      const { error } = await supabase
        .from(TABLES.REPLAY_EVENTS)
        .insert(record);

      if (error) {
        logger.debug('ReplayRepository.saveEvent failed', { message: error.message });
      }
    } catch (err) {
      logger.debug('ReplayRepository.saveEvent exception', { message: err.message });
    }
  }

  /**
   * Retrieve all replay events for a mission ordered by mission_time ASC.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async findEvents(missionId) {
    let results = [];

    if (dbAvailable) {
      try {
        const { data, error } = await supabase
          .from(TABLES.REPLAY_EVENTS)
          .select('*')
          .eq('mission_id', missionId)
          .order('mission_time', { ascending: true });

        if (!error && data && data.length > 0) {
          results = data;
        }
      } catch (err) {
        logger.debug('ReplayRepository.findEvents DB error', { message: err.message });
      }
    }

    if (results.length === 0 && _memoryEvents.has(missionId)) {
      results = _memoryEvents.get(missionId);
    }

    return results;
  }

  /**
   * Backwards compatible findByMission method for ReplayService.
   */
  static async findByMission(missionId) {
    return this.findSnapshots(missionId);
  }

  /**
   * Backwards compatible listMissionsWithReplay method.
   */
  static async listMissionsWithReplay() {
    const sessions = await this.listSessions();
    return sessions.map(s => ({ mission_id: s.mission_id, mission_name: s.mission_name }));
  }

  /**
   * Legacy save wrapper for compatibility.
   */
  static async save(record) {
    return this.saveSnapshot({
      mission_id:     record.mission_id,
      tick:           record.mission_time ?? 0,
      mission_time:   record.mission_time,
      timestamp:      record.created_at,
      telemetry_data: record.state_snapshot,
    });
  }
}
