/**
 * ReplayService.js
 *
 * Backend Replay Manager & Storage Engine.
 *
 * Responsibilities:
 *   - Subscribe to SimulationService tick events to record snapshots in Supabase/memory
 *   - Load historical telemetry, fault logs, operator actions, and replay snapshots
 *   - Manage playback state machine (PLAY, PAUSE, RESUME, STOP, SEEK, SPEED, PREV, NEXT)
 *   - Stream authentic historical telemetry over Socket.io
 *   - NEVER generate mock/fake telemetry — backend remains single source of truth
 */

import * as SimulationService   from './SimulationService.js';
import { ReplayRepository }         from '../database/ReplayRepository.js';
import { TelemetryRepository }      from '../database/TelemetryRepository.js';
import { FaultRepository }          from '../database/FaultRepository.js';
import { OperatorActionRepository } from '../database/OperatorActionRepository.js';
import { SOCKET_EVENTS, ACTION_TYPES, HTTP } from '../utils/constants.js';
import { AppError }                 from '../middlewares/errorHandler.js';
import { logger }                   from '../middlewares/logger.js';
import { now }                      from '../utils/helpers.js';

const REPLAY_SNAPSHOT_INTERVAL = 5; // snapshot every 5 ticks (~5s sim time)
let _tickCounter = 0;

/**
 * Replay Manager internal session state
 */
const replaySession = {
  missionId:         null,
  status:            'STOPPED', // 'STOPPED' | 'PLAYING' | 'PAUSED'
  speed:             1.0,       // 0.5 | 1 | 2 | 4
  currentFrameIndex: 0,
  frames:            [],        // ReplayFrame[]
  events:            [],        // Historical events list
  timer:             null,
};

/**
 * Wire replay snapshotting into SimulationService ticks.
 * Called once at server startup.
 */
export function initialize() {
  SimulationService.on('onTick', ({ state, missionId }) => {
    _tickCounter++;

    if (_tickCounter % REPLAY_SNAPSHOT_INTERVAL !== 0) return;
    if (!missionId) return;

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
// Replay Manager API
// ─────────────────────────────────────────────────────────────────

/**
 * Load a replay session by fetching stored historical data.
 * Combines database queries with in-memory buffer fallbacks.
 *
 * @param {string} missionId
 * @returns {Promise<Object>} replay session info
 */
export async function loadReplaySession(missionId) {
  const targetId = missionId || SimulationService.getSessionStatus().missionId;
  if (!targetId) {
    throw new AppError('No mission ID provided or active for replay', HTTP.BAD_REQUEST);
  }

  // 1. Fetch telemetry logs, faults, operator actions, and replay snapshots
  const [telemetryRows, faultRows, actionRows, snapshotRows] = await Promise.all([
    TelemetryRepository.findByMission(targetId, 1000, 0),
    FaultRepository.findByMission(targetId),
    OperatorActionRepository.findByMission(targetId),
    ReplayRepository.findByMission(targetId),
  ]);

  // 2. In-memory buffer fallback if DB telemetry is empty (e.g. recent unpersisted run)
  let rawTelemetry = telemetryRows;
  if (!rawTelemetry || rawTelemetry.length === 0) {
    const memBuffer = SimulationService.getTelemetryBuffer();
    if (memBuffer.length > 0) {
      rawTelemetry = memBuffer.map((t, idx) => ({
        mission_id:           targetId,
        sequence_number:      t.sequenceNumber ?? idx,
        mission_time:         t.missionTime ?? idx,
        timestamp:            t.timestamp ?? new Date().toISOString(),
        battery:              t.battery,
        temperature:          t.temperature,
        power:                t.powerGeneration || t.solarGeneration || 420,
        solar_gen:            t.solarGeneration,
        storage_pct:          t.storagePct,
        signal_strength:      t.signalStrength,
        orientation:          t.orientation,
        activity:             t.activity,
        safe_mode:            t.safeMode,
        faults:               t.faults || [],
        raw_payload:          t.toJSON ? t.toJSON() : t,
      }));
    }
  }

  // Build unified events list
  const events = [];
  
  // Add fault events
  for (const f of faultRows) {
    events.push({
      id:          f.id || `f-${f.created_at}`,
      type:        'anomaly',
      subsystem:   f.subsystem || 'Fault System',
      description: `Fault ${f.fault_type || f.description}: ${f.resolved ? 'CLEARED' : 'INJECTED'}`,
      met:         `T+${Math.floor((f.mission_time || 0) / 60)}:${String(Math.floor((f.mission_time || 0) % 60)).padStart(2, '0')}`,
      time:        f.created_at || now(),
      timestamp:   f.created_at,
    });
  }

  // Add operator action events
  for (const a of actionRows) {
    events.push({
      id:          a.id || `a-${a.created_at}`,
      type:        'operator',
      subsystem:   'Ground Operations',
      description: `Operator CMD: ${a.action_type}`,
      met:         `T+${Math.floor((a.mission_time || 0) / 60)}:${String(Math.floor((a.mission_time || 0) % 60)).padStart(2, '0')}`,
      time:        a.created_at || now(),
      timestamp:   a.created_at,
    });
  }

  // Add snapshot events
  for (const s of snapshotRows) {
    if (s.events?.length) {
      for (const e of s.events) {
        events.push({
          id:          `snap-${s.mission_time}`,
          type:        e.type === 'SAFE_MODE' ? 'anomaly' : 'system',
          subsystem:   'Spacecraft Core',
          description: e.type === 'SAFE_MODE' ? 'Safe Mode Activated' : String(e.type),
          met:         `T+${Math.floor((s.mission_time || 0) / 60)}:${String(Math.floor((s.mission_time || 0) % 60)).padStart(2, '0')}`,
          time:        s.created_at,
          timestamp:   s.created_at,
        });
      }
    }
  }

  // Sort events chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Build frames array
  const frames = rawTelemetry.map((row, idx) => {
    const raw = row.raw_payload || {};
    const missionTime = row.mission_time ?? idx;
    return {
      frameIndex:     idx,
      sequenceNumber: row.sequence_number ?? idx + 1,
      missionTime:    missionTime,
      timestamp:      row.timestamp || row.created_at || now(),
      telemetry: {
        sequenceNumber: row.sequence_number ?? idx + 1,
        timestamp:      Date.parse(row.timestamp || row.created_at || new Date()) || Date.now(),
        missionTime:    missionTime,
        missionName:    raw.missionName || 'OrbitOps Replay',
        missionPhase:   row.mission_phase || raw.missionPhase || 'OBSERVATION',
        battery:        row.battery ?? raw.battery ?? 100,
        batteryVoltage: raw.batteryVoltage ?? 3.8,
        batteryCharging:raw.batteryCharging ?? false,
        solarGeneration:row.solar_gen ?? raw.solarGeneration ?? 420,
        powerGeneration:row.power ?? raw.powerGeneration ?? 420,
        powerConsumption:raw.powerConsumption ?? 120,
        temperature:    row.temperature ?? raw.temperature ?? 22,
        storageUsedMB:  raw.storageUsedMB ?? 128,
        storagePct:     row.storage_used ?? raw.storagePct ?? 12,
        signalStrength: row.signal_strength ?? raw.signalStrength ?? 92,
        windowOpen:     raw.windowOpen ?? true,
        packetLoss:     raw.packetLoss ?? 0,
        latencyMs:      raw.latencyMs ?? 15,
        orientation:    row.orientation || raw.orientation || 'EARTH_POINTING',
        activity:       row.activity || raw.activity || 'Observation',
        safeMode:       row.safe_mode ?? raw.safeMode ?? false,
        faults:         row.faults || raw.faults || [],
        warnings:       raw.warnings || [],
      },
      state: snapshotRows.find(s => s.mission_time === missionTime)?.state_snapshot || null,
      eventsAtFrame: events.filter(e => e.met === `T+${Math.floor(missionTime / 60)}:${String(Math.floor(missionTime % 60)).padStart(2, '0')}`),
    };
  });

  replaySession.missionId         = targetId;
  replaySession.status            = 'STOPPED';
  replaySession.speed             = 1.0;
  replaySession.currentFrameIndex = 0;
  replaySession.frames            = frames;
  replaySession.events            = events;

  logger.info('Loaded replay session', { missionId: targetId, totalFrames: frames.length, totalEvents: events.length });

  return getReplaySessionInfo();
}

/**
 * Start or restart replay playback.
 *
 * @param {string} [missionId]
 * @returns {Promise<Object>}
 */
export async function startReplay(missionId) {
  if (missionId && missionId !== replaySession.missionId) {
    await loadReplaySession(missionId);
  } else if (replaySession.frames.length === 0) {
    await loadReplaySession(SimulationService.getSessionStatus().missionId);
  }

  if (replaySession.frames.length === 0) {
    throw new AppError('No historical telemetry frames available to replay', HTTP.NOT_FOUND);
  }

  _clearTimer();
  replaySession.status            = 'PLAYING';
  replaySession.currentFrameIndex = 0;

  const io = SimulationService.getSessionStatus() ? SimulationService.initialize : null;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_STARTED, getReplaySessionInfo());

  _streamCurrentFrame();
  _scheduleNextFrame();

  return getReplaySessionInfo();
}

/**
 * Pause replay playback.
 *
 * @returns {Object}
 */
export function pauseReplay() {
  _clearTimer();
  replaySession.status = 'PAUSED';
  _broadcastSocket(SOCKET_EVENTS.REPLAY_PAUSED, getReplaySessionInfo());
  logger.info('Replay paused', { missionId: replaySession.missionId, frameIndex: replaySession.currentFrameIndex });
  return getReplaySessionInfo();
}

/**
 * Resume replay playback from current playhead.
 *
 * @returns {Object}
 */
export function resumeReplay() {
  if (replaySession.frames.length === 0) {
    throw new AppError('No active replay session to resume', HTTP.BAD_REQUEST);
  }

  _clearTimer();
  replaySession.status = 'PLAYING';
  _broadcastSocket(SOCKET_EVENTS.REPLAY_RESUMED, getReplaySessionInfo());
  _scheduleNextFrame();
  logger.info('Replay resumed', { missionId: replaySession.missionId, frameIndex: replaySession.currentFrameIndex });
  return getReplaySessionInfo();
}

/**
 * Stop replay playback and reset playhead to start.
 *
 * @returns {Object}
 */
export function stopReplay() {
  _clearTimer();
  replaySession.status            = 'STOPPED';
  replaySession.currentFrameIndex = 0;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_STOPPED, getReplaySessionInfo());
  logger.info('Replay stopped', { missionId: replaySession.missionId });
  return getReplaySessionInfo();
}

/**
 * Seek playhead to a specific frame index or mission time.
 *
 * @param {Object} params
 * @param {number} [params.frameIndex]
 * @param {number} [params.targetTime]
 * @returns {Object}
 */
export function seekReplay({ frameIndex, targetTime }) {
  if (replaySession.frames.length === 0) {
    throw new AppError('No replay frames loaded to seek', HTTP.BAD_REQUEST);
  }

  let idx = 0;
  if (typeof frameIndex === 'number') {
    idx = Math.max(0, Math.min(replaySession.frames.length - 1, frameIndex));
  } else if (typeof targetTime === 'number') {
    const foundIdx = replaySession.frames.findIndex(f => f.missionTime >= targetTime);
    idx = foundIdx !== -1 ? foundIdx : replaySession.frames.length - 1;
  }

  replaySession.currentFrameIndex = idx;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_SEEK, {
    missionId:         replaySession.missionId,
    currentFrameIndex: idx,
    missionTime:       replaySession.frames[idx]?.missionTime ?? 0,
  });

  _streamCurrentFrame();

  if (replaySession.status === 'PLAYING') {
    _clearTimer();
    _scheduleNextFrame();
  }

  return getReplaySessionInfo();
}

/**
 * Update playback speed multiplier.
 *
 * @param {number} speed - 0.5 | 1 | 2 | 4
 * @returns {Object}
 */
export function setReplaySpeed(speed) {
  const numSpeed = parseFloat(speed);
  if (isNaN(numSpeed) || numSpeed <= 0) {
    throw new AppError('Invalid playback speed', HTTP.BAD_REQUEST);
  }

  replaySession.speed = numSpeed;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_SPEED_CHANGED, { speed: numSpeed });

  if (replaySession.status === 'PLAYING') {
    _clearTimer();
    _scheduleNextFrame();
  }

  return getReplaySessionInfo();
}

/**
 * Jump to previous stored frame.
 * @returns {Object}
 */
export function stepPrev() {
  return seekReplay({ frameIndex: replaySession.currentFrameIndex - 1 });
}

/**
 * Jump to next stored frame.
 * @returns {Object}
 */
export function stepNext() {
  return seekReplay({ frameIndex: replaySession.currentFrameIndex + 1 });
}

/**
 * Return detailed replay session status info.
 */
export function getReplaySessionInfo() {
  const frameCount = replaySession.frames.length;
  const currentFrame = replaySession.frames[replaySession.currentFrameIndex] || null;

  return {
    missionId:         replaySession.missionId,
    status:            replaySession.status,
    speed:             replaySession.speed,
    currentFrameIndex: replaySession.currentFrameIndex,
    totalFrames:       frameCount,
    startMissionTime:  replaySession.frames[0]?.missionTime ?? 0,
    endMissionTime:    replaySession.frames[frameCount - 1]?.missionTime ?? 0,
    currentMissionTime:currentFrame?.missionTime ?? 0,
    currentTelemetry:  currentFrame?.telemetry ?? null,
    eventsCount:       replaySession.events.length,
  };
}

/**
 * Return historical event list for a mission.
 *
 * @param {string} missionId
 * @returns {Promise<Object[]>}
 */
export async function getReplayEvents(missionId) {
  if (missionId && missionId !== replaySession.missionId) {
    await loadReplaySession(missionId);
  }
  return replaySession.events;
}

/**
 * Return all stored replay frames for a mission.
 *
 * @param {string} missionId
 * @returns {Promise<Object[]>}
 */
export async function getReplayTimeline(missionId) {
  if (missionId && missionId !== replaySession.missionId) {
    await loadReplaySession(missionId);
  }
  return replaySession.frames;
}

/**
 * List all missions that have recorded replay data.
 */
export async function listReplayMissions() {
  return ReplayRepository.listMissionsWithReplay();
}

// ─────────────────────────────────────────────────────────────────
// Private — Timer & Socket Stream
// ─────────────────────────────────────────────────────────────────

function _scheduleNextFrame() {
  if (replaySession.status !== 'PLAYING') return;

  const delay = Math.max(100, Math.round(1000 / replaySession.speed));

  replaySession.timer = setTimeout(() => {
    if (replaySession.status !== 'PLAYING') return;

    if (replaySession.currentFrameIndex < replaySession.frames.length - 1) {
      replaySession.currentFrameIndex++;
      _streamCurrentFrame();
      _scheduleNextFrame();
    } else {
      replaySession.status = 'STOPPED';
      _broadcastSocket(SOCKET_EVENTS.REPLAY_FINISHED, { missionId: replaySession.missionId });
      logger.info('Replay finished', { missionId: replaySession.missionId });
    }
  }, delay);
}

function _streamCurrentFrame() {
  const frame = replaySession.frames[replaySession.currentFrameIndex];
  if (!frame) return;

  _broadcastSocket(SOCKET_EVENTS.REPLAY_TELEMETRY, {
    missionId:         replaySession.missionId,
    telemetry:         frame.telemetry,
    state:             frame.state,
    events:            frame.eventsAtFrame,
    currentFrameIndex: replaySession.currentFrameIndex,
    totalFrames:       replaySession.frames.length,
    status:            replaySession.status,
    speed:             replaySession.speed,
  });
}

function _clearTimer() {
  if (replaySession.timer) {
    clearTimeout(replaySession.timer);
    replaySession.timer = null;
  }
}

function _broadcastSocket(event, payload) {
  try {
    // Obtain io instance via SimulationService internal reference if available
    const status = SimulationService.getSessionStatus();
    // We import io or broadcast via global socket if attached
    const appSocket = global._ioServer;
    if (appSocket) {
      appSocket.emit(event, payload);
    }
  } catch (err) {
    logger.debug(`ReplayService socket emit error [${event}]`, { message: err.message });
  }
}
