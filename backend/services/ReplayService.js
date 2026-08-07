/**
 * ReplayService.js
 *
 * Stores and retrieves mission replay timelines.
 *
 * Responsibilities:
 *   - Subscribe to SimulationService tick events at startup
 *   - Save state snapshots to ReplayRepository every REPLAY_SNAPSHOT_INTERVAL ticks
 *   - Provide timeline query for frontend replay scrubber
 */

import * as SimulationService from './SimulationService.js';
import { ReplayRepository }   from '../database/ReplayRepository.js';
import { logger }             from '../middlewares/logger.js';
import { now }                from '../utils/helpers.js';

const REPLAY_SNAPSHOT_INTERVAL = 5; // save every 5 ticks (~5 seconds of real time)
let _tickCounter = 0;

/**
 * Wire replay snapshot callback into SimulationService.
 * Called once at server startup.
 */
export function initialize() {
  SimulationService.on('onTick', ({ state, missionId }) => {
    _tickCounter++;

    if (_tickCounter % REPLAY_SNAPSHOT_INTERVAL !== 0) return;
    if (!missionId) return;

    // Collect any events at this tick — faults, safe-mode
    const events = [];
    if (state.safeMode) events.push({ type: 'SAFE_MODE', missionTime: state.missionTime });

    ReplayRepository.save({
      mission_id:     missionId,
      mission_time:   state.missionTime,
      state_snapshot: state,
      events,
      created_at:     now(),
    });
  });

  logger.info('ReplayService initialised — snapshotting every ' + REPLAY_SNAPSHOT_INTERVAL + ' ticks');
}

// ─────────────────────────────────────────────────────────────────
// Query methods
// ─────────────────────────────────────────────────────────────────

/**
 * Return all replay frames for the current in-memory session.
 * Pulls from Supabase if missionId is given.
 *
 * @param {string} missionId
 * @returns {Promise<Object[]>}
 */
export async function getReplayTimeline(missionId) {
  return ReplayRepository.findByMission(missionId);
}

/**
 * List all missions that have recorded replay data.
 *
 * @returns {Promise<Object[]>}
 */
export async function listReplayMissions() {
  return ReplayRepository.listMissionsWithReplay();
}
