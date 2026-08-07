/**
 * ReplayService.js
 *
 * Backend Replay Manager & Storage Engine for Database-Backed Replay System.
 *
 * Architecture & Data Flow:
 *   1. LIVE RECORDING:
 *      Simulation Engine Ticks → Telemetry Generated → ReplayService
 *      → Save session to Supabase (replay_sessions)
 *      → Save snapshots every N ticks to Supabase (replay_snapshots: tick, mission_time, timestamp, telemetry_data, subsystem_state, digital_twin_state)
 *      → Save events/faults/milestones to Supabase (replay_events: tick, mission_time, event_type, event_name, description, severity, event_data)
 *
 *   2. REPLAY PLAYBACK (READ-ONLY):
 *      User Selects Mission → Load stored session, snapshots (ordered by tick), & events (ordered by mission_time)
 *      → Set position to first snapshot
 *      → Start playback loop streaming frame snapshots over Socket.io
 *      → Replay operates strictly on stored database snapshots
 *      → Replay does NOT run Simulation Engine, generate new telemetry, or alter live state
 *      → Replay automatically stops at the final snapshot
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

const REPLAY_SNAPSHOT_INTERVAL = 5; // Snapshot every 5 ticks (~5s sim time)
let _tickCounter = 0;
let _io = null;

/**
 * Replay Manager internal session state
 */
const replaySession = {
  missionId:         null,
  sessionId:         null,
  missionName:       'OrbitOps Mission',
  status:            'STOPPED', // 'STOPPED' | 'PLAYING' | 'PAUSED'
  speed:             1.0,       // 0.5 | 1 | 2 | 4
  currentFrameIndex: 0,
  frames:            [],        // Stored Database Snapshots (ReplayFrame[])
  events:            [],        // Stored Database Events
  timer:             null,
};

// In-memory live session event log store for instant fallback access
const _liveSessionEvents = new Map(); // missionId -> event[]

/**
 * Helper to record a live event into database and memory.
 */
async function _recordEvent(missionId, type, subsystem, description, missionTime, severity = 'INFO', payload = {}) {
  if (!missionId) return;

  const metStr = `T+${Math.floor((missionTime || 0) / 3600).toString().padStart(2, '0')}:${Math.floor(((missionTime || 0) % 3600) / 60).toString().padStart(2, '0')}:${Math.floor((missionTime || 0) % 60).toString().padStart(2, '0')}`;
  
  const eventObj = {
    id:          `evt-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type:        type,
    subsystem:   subsystem,
    description: description,
    met:         metStr,
    time:        new Date().toLocaleTimeString(),
    timestamp:   now(),
  };

  if (!_liveSessionEvents.has(missionId)) {
    _liveSessionEvents.set(missionId, []);
  }
  _liveSessionEvents.get(missionId).push(eventObj);

  // Save to replay_events table in Supabase
  await ReplayRepository.saveEvent({
    mission_id:   missionId,
    tick:         _tickCounter,
    mission_time: missionTime || 0,
    event_type:   type,
    event_name:   subsystem,
    description:  description,
    severity:     severity,
    event_data:   payload,
  });
}

/**
 * Wire replay snapshotting and event logging into SimulationService ticks.
 * Called once at server startup.
 */
export function initialize(ioInstance) {
  _io = ioInstance || global._ioServer || null;

  // 1. Automatic Snapshot Recording during Simulation Execution
  SimulationService.on('onTick', ({ state, missionId }) => {
    _tickCounter++;
    if (!missionId) return;

    // Save/update replay_sessions entry
    ReplayRepository.saveSession({
      mission_id:   missionId,
      mission_name: state.missionName || 'OrbitOps Mission',
      start_time:   now(),
      duration:     state.missionTime || 0,
      status:       'RECORDING',
    });

    // Record snapshot at configured tick interval (e.g. Every 5 ticks)
    if (_tickCounter % REPLAY_SNAPSHOT_INTERVAL === 0 || _tickCounter === 1) {
      const subsystemState = {
        battery:       state.battery,
        thermal:       state.thermal || { temperature: state.temperature },
        power:         state.power || { generation: state.powerGeneration, consumption: state.powerConsumption },
        communication: state.communication || { signalStrength: state.signalStrength },
        orientation:   state.orientation,
        activity:      state.activity,
      };

      const digitalTwinState = state.digitalTwin || {
        safeMode:     state.safeMode,
        activeFaults: state.faults || [],
        subsystems:   subsystemState,
      };

      // Save snapshot to replay_snapshots table in Supabase
      ReplayRepository.saveSnapshot({
        mission_id:         missionId,
        tick:               _tickCounter,
        mission_time:       state.missionTime || 0,
        timestamp:          state.timestamp ? new Date(state.timestamp).toISOString() : now(),
        telemetry_data:     state,
        subsystem_state:    subsystemState,
        digital_twin_state: digitalTwinState,
      });
    }
  });

  // 2. Activity Transition Event Recording
  SimulationService.on('onActivityChange', (payload) => {
    _recordEvent(
      payload.missionId,
      'milestone',
      'Mission Control',
      `Activity transition: ${payload.newActivity || 'Idle'}`,
      payload.missionTime ?? 0,
      'INFO'
    );
  });

  // 3. Fault Injection Event Recording
  SimulationService.on('onFaultInjected', ({ missionId, fault }) => {
    _recordEvent(
      missionId,
      'anomaly',
      fault?.subsystem || 'Fault Manager',
      `Fault Injected: ${fault?.id || fault?.description} (${fault?.severity || 'HIGH'})`,
      fault?.injectedAtMissionTime ?? 0,
      'HIGH',
      { faultId: fault?.id }
    );
  });

  // 4. Constraint Violation Event Recording
  SimulationService.on('onConstraintViolation', (payload) => {
    const desc = Array.isArray(payload.violations)
      ? payload.violations.map(v => v.message || v.rule).join('; ')
      : 'Constraint violation detected';
    _recordEvent(
      payload.missionId,
      'anomaly',
      'Safety Constraints',
      `VIOLATION: ${desc}`,
      payload.missionTime ?? 0,
      'CRITICAL',
      { violations: payload.violations }
    );
  });

  // 5. Mission Start Event Recording
  SimulationService.on('onMissionStarted', (payload) => {
    _recordEvent(
      payload.missionId,
      'milestone',
      'Mission Control',
      'Mission Started by Operator — Snapshot Recording Active',
      payload.missionTime ?? 0,
      'INFO'
    );
  });

  // 6. Mission Pause Event Recording
  SimulationService.on('onMissionPaused', (payload) => {
    _recordEvent(
      payload.missionId,
      'operator',
      'Mission Control',
      'Mission Paused by Operator',
      payload.missionTime ?? 0,
      'INFO'
    );
  });

  // 7. Mission Resume Event Recording
  SimulationService.on('onMissionResumed', (payload) => {
    _recordEvent(
      payload.missionId,
      'operator',
      'Mission Control',
      'Mission Resumed by Operator',
      payload.missionTime ?? 0,
      'INFO'
    );
  });

  // 8. Mission Stop Event Recording
  SimulationService.on('onMissionStopped', (payload) => {
    _recordEvent(
      payload.missionId,
      'milestone',
      'Mission Control',
      'Mission Stopped by Operator — Historical Session Finalized',
      payload.missionTime ?? 0,
      'INFO'
    );

    ReplayRepository.saveSession({
      mission_id: payload.missionId,
      end_time:   now(),
      status:     'COMPLETED',
    });
  });

  // 9. Mission Completion Event Recording
  SimulationService.on('onMissionCompleted', (payload) => {
    _recordEvent(
      payload.missionId,
      'milestone',
      'Mission Lifecycle',
      'Mission Execution Completed Successfully',
      payload.finalState?.missionTime ?? 0,
      'INFO'
    );

    ReplayRepository.saveSession({
      mission_id: payload.missionId,
      end_time:   now(),
      status:     'COMPLETED',
    });
  });

  logger.info('ReplayService initialised — real database replay recording active');
}

// ─────────────────────────────────────────────────────────────────
// Replay Manager API (READ-ONLY)
// ─────────────────────────────────────────────────────────────────

/**
 * Load a replay session by fetching stored historical data from database tables:
 * 1. replay_sessions
 * 2. replay_snapshots (ordered by tick)
 * 3. replay_events (ordered by mission_time)
 *
 * @param {string} missionId
 * @returns {Promise<Object>} replay session info
 */
export async function loadReplaySession(missionId) {
  const targetId = missionId || SimulationService.getSessionStatus()?.missionId;
  if (!targetId) {
    throw new AppError('No mission ID provided or active for replay', HTTP.BAD_REQUEST);
  }

  // 1. Fetch stored replay session, snapshots, and events from database
  const [sessionRecord, dbSnapshots, dbEvents, legacyTelemetry, faultRows, actionRows] = await Promise.all([
    ReplayRepository.findSession(targetId),
    ReplayRepository.findSnapshots(targetId),
    ReplayRepository.findEvents(targetId),
    TelemetryRepository.findByMission(targetId, 1000, 0),
    FaultRepository.findByMission(targetId),
    OperatorActionRepository.findByMission(targetId),
  ]);

  // 2. Build unified event list from DB + fallbacks
  const events = [];

  // Add DB events
  for (const e of dbEvents) {
    const mTime = e.mission_time ?? 0;
    events.push({
      id:          e.id || `e-${mTime}-${e.event_type}`,
      type:        e.event_type || 'system',
      subsystem:   e.event_name || 'System',
      description: e.description,
      met:         `T+${Math.floor(mTime / 3600).toString().padStart(2, '0')}:${Math.floor((mTime % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(mTime % 60).toString().padStart(2, '0')}`,
      time:        e.created_at ? new Date(e.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
      timestamp:   e.created_at || now(),
    });
  }

  // Add fault events if not duplicate
  for (const f of faultRows) {
    const desc = `Fault ${f.fault_type || f.description}: ${f.resolved ? 'CLEARED' : 'INJECTED'}`;
    if (!events.some(e => e.description === desc)) {
      const mTime = f.mission_time || 0;
      events.push({
        id:          f.id || `f-${f.created_at}`,
        type:        'anomaly',
        subsystem:   f.subsystem || 'Fault System',
        description: desc,
        met:         `T+${Math.floor(mTime / 3600).toString().padStart(2, '0')}:${Math.floor((mTime % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(mTime % 60).toString().padStart(2, '0')}`,
        time:        f.created_at ? new Date(f.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
        timestamp:   f.created_at || now(),
      });
    }
  }

  // Add live session events fallback
  const liveEvents = _liveSessionEvents.get(targetId) || [];
  for (const le of liveEvents) {
    if (!events.some(e => e.description === le.description && e.met === le.met)) {
      events.push(le);
    }
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 3. Build stored snapshots frames array
  let rawSnapshots = dbSnapshots;

  // Fallback to legacy telemetry rows or in-memory buffer if DB snapshots table is empty
  if (!rawSnapshots || rawSnapshots.length === 0) {
    if (legacyTelemetry && legacyTelemetry.length > 0) {
      rawSnapshots = legacyTelemetry.map((row, idx) => ({
        tick:               idx,
        mission_time:       row.mission_time ?? idx,
        timestamp:          row.timestamp || row.created_at || now(),
        telemetry_data:     row.raw_payload || row,
        subsystem_state:    row.raw_payload?.subsystems || {},
        digital_twin_state: row.raw_payload?.digitalTwin || {},
      }));
    } else {
      const memBuffer = SimulationService.getTelemetryBuffer();
      if (memBuffer.length > 0) {
        rawSnapshots = memBuffer.map((t, idx) => ({
          tick:               idx,
          mission_time:       t.missionTime ?? idx,
          timestamp:          t.timestamp ? new Date(t.timestamp).toISOString() : now(),
          telemetry_data:     t.toJSON ? t.toJSON() : t,
          subsystem_state:    t.subsystems || {},
          digital_twin_state: t.digitalTwin || {},
        }));
      }
    }
  }

  // Map every stored database snapshot to a frame
  const frames = (rawSnapshots || []).map((snap, idx) => {
    const rawTel = snap.telemetry_data || snap.telemetry || {};
    const missionTime = snap.mission_time ?? idx;
    const metStr = `T+${Math.floor(missionTime / 3600).toString().padStart(2, '0')}:${Math.floor((missionTime % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(missionTime % 60).toString().padStart(2, '0')}`;

    const formattedTelemetry = {
      sequenceNumber:  rawTel.sequenceNumber ?? snap.tick ?? idx + 1,
      timestamp:       Date.parse(snap.timestamp || rawTel.timestamp || new Date()) || Date.now(),
      missionTime:     missionTime,
      missionName:     sessionRecord?.mission_name || rawTel.missionName || 'OrbitOps Replay',
      missionPhase:    rawTel.missionPhase || rawTel.mission_phase || 'OBSERVATION',
      battery:         rawTel.battery?.percentage ?? rawTel.battery ?? 100,
      batteryVoltage:  rawTel.batteryVoltage ?? 28.6,
      batteryCharging: rawTel.batteryCharging ?? false,
      solarGeneration: rawTel.solarGeneration ?? rawTel.solar_gen ?? 420,
      powerGeneration: rawTel.powerGeneration ?? rawTel.power ?? 420,
      powerConsumption:rawTel.powerConsumption ?? 120,
      temperature:     rawTel.temperature ?? 22,
      storageUsedMB:   rawTel.storageUsedMB ?? 128,
      storagePct:      rawTel.storagePct ?? 12,
      signalStrength:  rawTel.signalStrength ?? 92,
      windowOpen:      rawTel.windowOpen ?? true,
      packetLoss:      rawTel.packetLoss ?? 0,
      latencyMs:       rawTel.latencyMs ?? 15,
      orientation:     rawTel.orientation || 'EARTH_POINTING',
      activity:        rawTel.activity || 'Observation',
      safeMode:        rawTel.safeMode ?? false,
      faults:          rawTel.faults || [],
      warnings:        rawTel.warnings || [],
    };

    return {
      frameIndex:       idx,
      tick:             snap.tick ?? idx,
      missionTime:      missionTime,
      timestamp:        snap.timestamp || now(),
      telemetry:        formattedTelemetry,
      subsystemState:   snap.subsystem_state || rawTel.subsystems || {},
      digitalTwinState: snap.digital_twin_state || rawTel.digitalTwin || {},
      eventsAtFrame:    events.filter(e => e.met === metStr),
    };
  });

  replaySession.missionId         = targetId;
  replaySession.sessionId         = sessionRecord?.id || targetId;
  replaySession.missionName       = sessionRecord?.mission_name || 'OrbitOps Mission';
  replaySession.status            = 'STOPPED';
  replaySession.speed             = 1.0;
  replaySession.currentFrameIndex = 0;
  replaySession.frames            = frames;
  replaySession.events            = events;

  logger.info('Loaded database replay session', {
    missionId: targetId,
    totalSnapshots: frames.length,
    totalEvents: events.length
  });

  return getReplaySessionInfo();
}

/**
 * Return current replay session state info object.
 */
export function getReplaySessionInfo() {
  const frame = replaySession.frames[replaySession.currentFrameIndex] || null;
  return {
    missionId:         replaySession.missionId,
    sessionId:         replaySession.sessionId,
    missionName:       replaySession.missionName,
    status:            replaySession.status,
    speed:             replaySession.speed,
    currentFrameIndex: replaySession.currentFrameIndex,
    totalFrames:       replaySession.frames.length,
    startMissionTime:  replaySession.frames[0]?.missionTime ?? 0,
    endMissionTime:    replaySession.frames[replaySession.frames.length - 1]?.missionTime ?? 0,
    currentMissionTime:frame?.missionTime ?? 0,
    currentTelemetry:  frame?.telemetry ?? null,
    subsystemState:    frame?.subsystemState ?? null,
    digitalTwinState:  frame?.digitalTwinState ?? null,
    eventsCount:       replaySession.events.length,
  };
}

/**
 * Broadcast current replay frame snapshot over Socket.io to frontend Replay Store.
 */
function _emitReplayFrame() {
  const sessionInfo = getReplaySessionInfo();
  _broadcastSocket(SOCKET_EVENTS.REPLAY_TELEMETRY, sessionInfo);
}

/**
 * Broadcast socket event helper.
 */
function _broadcastSocket(eventName, data) {
  const socket = _io || global._ioServer;
  if (socket) {
    socket.emit(eventName, data);
  }
}

/**
 * Clear existing playback timer loop.
 */
function _clearTimer() {
  if (replaySession.timer) {
    clearInterval(replaySession.timer);
    replaySession.timer = null;
  }
}

/**
 * Schedule next playback loop tick based on speed multiplier.
 * Automatic Stop at final snapshot when playback completes.
 */
function _schedulePlaybackLoop() {
  _clearTimer();
  if (replaySession.status !== 'PLAYING') return;

  const intervalMs = Math.round(1000 / (replaySession.speed || 1.0));

  replaySession.timer = setInterval(() => {
    if (replaySession.status !== 'PLAYING') {
      _clearTimer();
      return;
    }

    if (replaySession.currentFrameIndex >= replaySession.frames.length - 1) {
      // Reached final snapshot -> Automatic Stop at the end
      replaySession.status = 'STOPPED';
      _clearTimer();
      _broadcastSocket(SOCKET_EVENTS.REPLAY_FINISHED, getReplaySessionInfo());
      _broadcastSocket(SOCKET_EVENTS.REPLAY_STOPPED, getReplaySessionInfo());
      logger.info('Replay playback finished automatically at final snapshot', { missionId: replaySession.missionId });
      return;
    }

    // Move to next snapshot
    replaySession.currentFrameIndex++;
    _emitReplayFrame();
  }, intervalMs);
}

/**
 * Start or restart replay playback (READ-ONLY).
 */
export async function startReplay(missionId) {
  if (missionId && missionId !== replaySession.missionId) {
    await loadReplaySession(missionId);
  } else if (replaySession.frames.length === 0) {
    const activeMissionId = SimulationService.getSessionStatus()?.missionId;
    if (activeMissionId) {
      await loadReplaySession(activeMissionId);
    }
  }

  if (replaySession.frames.length === 0) {
    throw new AppError('No historical database snapshots available to replay', HTTP.NOT_FOUND);
  }

  _clearTimer();
  replaySession.status            = 'PLAYING';
  replaySession.currentFrameIndex = 0;

  _broadcastSocket(SOCKET_EVENTS.REPLAY_STARTED, getReplaySessionInfo());
  _emitReplayFrame();
  _schedulePlaybackLoop();

  return getReplaySessionInfo();
}

/**
 * Pause replay playback loop.
 */
export function pauseReplay() {
  _clearTimer();
  replaySession.status = 'PAUSED';
  _broadcastSocket(SOCKET_EVENTS.REPLAY_PAUSED, getReplaySessionInfo());
  return getReplaySessionInfo();
}

/**
 * Resume replay playback loop.
 */
export function resumeReplay() {
  if (replaySession.frames.length === 0) {
    throw new AppError('No replay session loaded to resume', HTTP.BAD_REQUEST);
  }

  _clearTimer();
  replaySession.status = 'PLAYING';

  // If at the end, restart from beginning
  if (replaySession.currentFrameIndex >= replaySession.frames.length - 1) {
    replaySession.currentFrameIndex = 0;
  }

  _broadcastSocket(SOCKET_EVENTS.REPLAY_RESUMED, getReplaySessionInfo());
  _emitReplayFrame();
  _schedulePlaybackLoop();

  return getReplaySessionInfo();
}

/**
 * Stop replay playback and reset playhead to first snapshot (Frame 0).
 */
export function stopReplay() {
  _clearTimer();
  replaySession.status            = 'STOPPED';
  replaySession.currentFrameIndex = 0;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_STOPPED, getReplaySessionInfo());
  _emitReplayFrame();
  return getReplaySessionInfo();
}

/**
 * Seek replay playhead to target frameIndex or targetTime (READ-ONLY).
 */
export function seekReplay({ frameIndex, targetTime }) {
  if (replaySession.frames.length === 0) {
    throw new AppError('No replay session loaded to seek', HTTP.BAD_REQUEST);
  }

  let idx = replaySession.currentFrameIndex;

  if (typeof frameIndex === 'number') {
    idx = Math.max(0, Math.min(frameIndex, replaySession.frames.length - 1));
  } else if (typeof targetTime === 'number') {
    idx = replaySession.frames.findIndex(f => f.missionTime >= targetTime);
    if (idx === -1) idx = replaySession.frames.length - 1;
  }

  replaySession.currentFrameIndex = idx;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_SEEK, getReplaySessionInfo());
  _emitReplayFrame();

  return getReplaySessionInfo();
}

/**
 * Set replay playback speed multiplier (0.5x, 1x, 2x, 4x).
 */
export function setReplaySpeed(speed) {
  const numSpeed = parseFloat(speed);
  if (isNaN(numSpeed) || numSpeed <= 0) {
    throw new AppError('Invalid playback speed value', HTTP.BAD_REQUEST);
  }

  replaySession.speed = numSpeed;
  _broadcastSocket(SOCKET_EVENTS.REPLAY_SPEED_CHANGED, getReplaySessionInfo());

  if (replaySession.status === 'PLAYING') {
    _schedulePlaybackLoop();
  }

  return getReplaySessionInfo();
}

/**
 * Step 1 snapshot backward.
 */
export function stepPrev() {
  if (replaySession.frames.length === 0) {
    throw new AppError('No replay session loaded', HTTP.BAD_REQUEST);
  }
  _clearTimer();
  replaySession.status = 'PAUSED';
  replaySession.currentFrameIndex = Math.max(0, replaySession.currentFrameIndex - 1);
  _emitReplayFrame();
  return getReplaySessionInfo();
}

/**
 * Step 1 snapshot forward.
 */
export function stepNext() {
  if (replaySession.frames.length === 0) {
    throw new AppError('No replay session loaded', HTTP.BAD_REQUEST);
  }
  _clearTimer();
  replaySession.status = 'PAUSED';
  replaySession.currentFrameIndex = Math.min(replaySession.frames.length - 1, replaySession.currentFrameIndex + 1);
  _emitReplayFrame();
  return getReplaySessionInfo();
}

/**
 * Return all recorded replay sessions from database.
 */
export async function getReplayMissions() {
  return ReplayRepository.listSessions();
}

/**
 * Return stored historical event log list for a mission.
 */
export async function getReplayEvents(missionId) {
  const targetId = missionId || replaySession.missionId;
  if (!targetId) return [];
  if (targetId === replaySession.missionId && replaySession.events.length > 0) {
    return replaySession.events;
  }
  return ReplayRepository.findEvents(targetId);
}

export async function listReplayMissions() {
  return getReplayMissions();
}

export async function getReplayTimeline(missionId) {
  return loadReplaySession(missionId);
}


