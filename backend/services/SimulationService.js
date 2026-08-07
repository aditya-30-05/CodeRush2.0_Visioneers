/**
 * SimulationService.js
 *
 * The adapter between the backend and the Spacecraft Digital Twin
 * Simulation Engine.
 *
 * Architecture:
 *   - Owns a single SimulationEngine instance (module-level singleton)
 *   - Wires all SimulationEngine callbacks to Socket.io emitters
 *   - All simulation interactions go through this service
 *   - NEVER modifies simulator internals
 *
 * This service is the ONLY file in the backend that imports from
 * the simulation engine.  All other services call this service.
 *
 * Lifecycle of a simulation session:
 *   1. SimulationService.initialize(io)  → called at server startup
 *   2. SimulationService.loadMission()   → creates engine with callbacks
 *   3. SimulationService.start/pause/resume/stop/reset()
 *   4. SimulationService.injectFault() / clearFault()
 *   5. SimulationService.getState() / getTelemetry()
 */

import path    from 'path';
import { fileURLToPath } from 'url';

import { SimulationEngine } from '../../simulation/engines/SimulationEngine.js';
import { FAULT_IDS }        from '../../simulation/utils/constants.js';
import { SOCKET_EVENTS, MISSION_STATUS } from '../utils/constants.js';
import { logger }           from '../middlewares/logger.js';
import { AppError }         from '../middlewares/errorHandler.js';
import { HTTP }             from '../utils/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Internal state tracked by the service layer.
 * The DigitalTwin inside the engine is the physics source of truth;
 * this object tracks administrative lifecycle state.
 */
const session = {
  missionId:   null,   // UUID assigned by MissionService
  missionName: null,
  status:      MISSION_STATUS.IDLE,
  startedAt:   null,
  stoppedAt:   null,
  engine:      null,   // SimulationEngine instance
  io:          null,   // Socket.io server reference
  tickCount:   0,
  telemetryBuffer: [], // rolling in-memory telemetry buffer (last 300)
  activeFaults:    [], // [ { id, description, severity, injectedAt } ]
  callbacks:   {
    onTelemetry:        [],
    onActivityChange:   [],
    onFaultInjected:    [],
    onConstraintViolation: [],
    onMissionCompleted: [],
    onTick:             [],
  },
};

export const BUFFER_SIZE = 300;

// ─────────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────────

/**
 * Wire the Socket.io server into the service.
 * Called once from server.js before any routes handle requests.
 *
 * @param {import('socket.io').Server} io
 */
export function initialize(io) {
  session.io = io;
  logger.info('SimulationService initialised with Socket.io server');
}

// ─────────────────────────────────────────────────────────────────
// External callback registration (for other services)
// ─────────────────────────────────────────────────────────────────

/**
 * Register a listener for simulation events.
 * TelemetryService and ReplayService use this.
 *
 * @param {'onTelemetry'|'onActivityChange'|'onFaultInjected'|'onConstraintViolation'|'onMissionCompleted'|'onTick'} event
 * @param {Function} fn
 */
export function on(event, fn) {
  if (session.callbacks[event]) {
    session.callbacks[event].push(fn);
  }
}

function _emit(event, ...args) {
  for (const fn of session.callbacks[event] ?? []) {
    try { fn(...args); } catch (e) { logger.error(`SimulationService callback error [${event}]`, { message: e.message }); }
  }
}

// ─────────────────────────────────────────────────────────────────
// Mission management
// ─────────────────────────────────────────────────────────────────

/**
 * Load and initialise a mission in the simulation engine.
 *
 * @param {Object} missionData - Raw mission JSON object
 * @param {string} missionId   - UUID assigned by MissionService
 */
export function loadMission(missionData, missionId) {
  // Destroy previous engine if one exists
  if (session.engine) {
    try { session.engine.stop(); } catch { /* already stopped */ }
  }

  session.missionId      = missionId;
  session.missionName    = missionData.missionName;
  session.status         = MISSION_STATUS.LOADED;
  session.startedAt      = null;
  session.stoppedAt      = null;
  session.tickCount      = 0;
  session.telemetryBuffer = [];
  session.activeFaults   = [];

  // Build engine with all callbacks wired
  session.engine = new SimulationEngine(
    {
      onTick: (state, telemetry) => {
        session.tickCount++;
        _handleTick(state, telemetry);
      },

      onTelemetry: (telemetry) => {
        _handleTelemetry(telemetry);
      },

      onActivityChange: (newAct, oldAct) => {
        const payload = {
          missionId:   session.missionId,
          newActivity: newAct?.activity ?? null,
          oldActivity: oldAct?.activity ?? null,
          missionTime: session.engine?.getMissionTime() ?? 0,
          timestamp:   new Date().toISOString(),
        };
        session.io?.emit(SOCKET_EVENTS.MISSION_STARTED, payload); // reuse for activity updates
        _emit('onActivityChange', payload);
        logger.debug('Activity changed', payload);
      },

      onFaultInjected: (fault) => {
        session.activeFaults.push({
          id:          fault.id,
          description: fault.description,
          severity:    fault.severity,
          missionTime: fault.injectedAtMissionTime,
          injectedAt:  new Date().toISOString(),
        });
        const payload = { missionId: session.missionId, fault: fault };
        session.io?.emit(SOCKET_EVENTS.FAULT_INJECTED, payload);
        _emit('onFaultInjected', { missionId: session.missionId, fault });
      },

      onConstraintViolation: (violations) => {
        const payload = {
          missionId:   session.missionId,
          violations,
          missionTime: session.engine?.getMissionTime() ?? 0,
          timestamp:   new Date().toISOString(),
        };
        session.io?.emit(SOCKET_EVENTS.CONSTRAINT_VIOLATION, payload);
        _emit('onConstraintViolation', payload);
      },

      onMissionCompleted: (finalState) => {
        session.status    = MISSION_STATUS.COMPLETED;
        session.stoppedAt = new Date().toISOString();
        const payload = {
          missionId:  session.missionId,
          finalState,
          timestamp:  session.stoppedAt,
        };
        session.io?.emit(SOCKET_EVENTS.MISSION_COMPLETED, payload);
        _emit('onMissionCompleted', payload);
        logger.info('Mission completed', { missionId: session.missionId });
      },
    },
    {
      tickIntervalMs: parseInt(process.env.SIMULATION_TICK_INTERVAL_MS ?? '1000', 10),
    }
  );

  session.engine.loadMission(missionData);

  session.io?.emit(SOCKET_EVENTS.MISSION_LOADED, {
    missionId:   session.missionId,
    missionName: session.missionName,
    status:      session.status,
  });

  logger.info('Mission loaded into simulation engine', { missionId, name: missionData.missionName });
}

/**
 * Start the simulation.
 */
export function start() {
  _assertLoaded('start');
  session.engine.start();
  session.status    = MISSION_STATUS.RUNNING;
  session.startedAt = new Date().toISOString();

  const payload = { missionId: session.missionId, status: session.status, startedAt: session.startedAt, missionTime: session.engine?.state?.missionTime || 0 };
  session.io?.emit(SOCKET_EVENTS.MISSION_STARTED, payload);
  _emit('onMissionStarted', payload);
  logger.info('Simulation started', { missionId: session.missionId });
}

/**
 * Pause the simulation.
 */
export function pause() {
  _assertRunning('pause');
  session.engine.pause();
  session.status = MISSION_STATUS.PAUSED;
  const payload = { missionId: session.missionId, status: session.status, missionTime: session.engine?.state?.missionTime || 0 };
  session.io?.emit(SOCKET_EVENTS.MISSION_PAUSED, payload);
  _emit('onMissionPaused', payload);
  logger.info('Simulation paused', { missionId: session.missionId });
}

/**
 * Resume a paused simulation.
 */
export function resume() {
  _assertLoaded('resume');
  session.engine.resume();
  session.status = MISSION_STATUS.RUNNING;
  const payload = { missionId: session.missionId, status: session.status, missionTime: session.engine?.state?.missionTime || 0 };
  session.io?.emit(SOCKET_EVENTS.MISSION_RESUMED, payload);
  _emit('onMissionResumed', payload);
  logger.info('Simulation resumed', { missionId: session.missionId });
}

/**
 * Stop the simulation permanently.
 */
export function stop() {
  _assertLoaded('stop');
  session.engine.stop();
  session.status    = MISSION_STATUS.STOPPED;
  session.stoppedAt = new Date().toISOString();
  const payload = { missionId: session.missionId, status: session.status, stoppedAt: session.stoppedAt, missionTime: session.engine?.state?.missionTime || 0 };
  session.io?.emit(SOCKET_EVENTS.MISSION_STOPPED, payload);
  _emit('onMissionStopped', payload);
  logger.info('Simulation stopped', { missionId: session.missionId });
}

/**
 * Reset simulation to tick 0 with the same mission.
 */
export function reset() {
  _assertLoaded('reset');
  session.engine.reset();
  session.status         = MISSION_STATUS.LOADED;
  session.startedAt      = null;
  session.stoppedAt      = null;
  session.tickCount      = 0;
  session.telemetryBuffer = [];
  session.activeFaults   = [];
  session.io?.emit(SOCKET_EVENTS.MISSION_RESET, { missionId: session.missionId, status: session.status });
  logger.info('Simulation reset', { missionId: session.missionId });
}

// ─────────────────────────────────────────────────────────────────
// Fault management
// ─────────────────────────────────────────────────────────────────

/**
 * Inject a fault.
 *
 * @param {string} faultId
 * @param {Object} [meta]
 * @returns {Object} fault record
 */
export function injectFault(faultId, meta = {}) {
  _assertLoaded('injectFault');
  const fault = session.engine.injectFault(faultId, meta);
  return fault;
}

/**
 * Clear a fault.
 *
 * @param {string} faultId
 * @returns {boolean}
 */
export function clearFault(faultId) {
  _assertLoaded('clearFault');
  const cleared = session.engine.clearFault(faultId);
  if (cleared) {
    session.activeFaults = session.activeFaults.filter(f => f.id !== faultId);
    session.io?.emit(SOCKET_EVENTS.FAULT_CLEARED, {
      missionId:   session.missionId,
      faultId,
      missionTime: session.engine.getMissionTime(),
      timestamp:   new Date().toISOString(),
    });
  }
  return cleared;
}

// ─────────────────────────────────────────────────────────────────
// State accessors
// ─────────────────────────────────────────────────────────────────

/**
 * Return the current session status object.
 * This is safe to expose to the REST layer.
 */
export function getSessionStatus() {
  return {
    missionId:      session.missionId,
    missionName:    session.missionName,
    status:         session.status,
    startedAt:      session.startedAt,
    stoppedAt:      session.stoppedAt,
    missionTime:    session.engine?.getMissionTime() ?? 0,
    tickCount:      session.tickCount,
    activeFaults:   session.activeFaults,
  };
}

/**
 * Return the current Digital Twin state snapshot.
 *
 * @returns {Object|null}
 */
export function getCurrentState() {
  if (!session.engine) return null;
  return session.engine.getCurrentState();
}

/**
 * Return the latest telemetry record.
 *
 * @returns {Object|null}
 */
export function getLatestTelemetry() {
  if (!session.engine) return null;
  return session.engine.getTelemetry();
}

/**
 * Return the in-memory telemetry buffer (newest last, up to BUFFER_SIZE).
 *
 * @returns {Object[]}
 */
export function getTelemetryBuffer() {
  return [...session.telemetryBuffer];
}

/**
 * Return the list of currently active faults.
 */
export function getActiveFaults() {
  return [...session.activeFaults];
}

// ─────────────────────────────────────────────────────────────────
// Private tick/telemetry handlers
// ─────────────────────────────────────────────────────────────────

function _handleTick(state, telemetry) {
  // Emit state snapshot every 5 ticks to keep socket traffic manageable
  if (session.tickCount % 5 === 0) {
    session.io?.emit(SOCKET_EVENTS.STATE_SNAPSHOT, {
      missionId: session.missionId,
      state,
      missionTime: state.missionTime,
    });
  }

  // Emit warnings if any
  if (state.warnings?.length) {
    session.io?.emit(SOCKET_EVENTS.WARNING_GENERATED, {
      missionId:   session.missionId,
      warnings:    state.warnings,
      missionTime: state.missionTime,
    });
  }

  _emit('onTick', { state, telemetry, missionId: session.missionId });
}

function _handleTelemetry(telemetry) {
  // Buffer latest N records in memory
  session.telemetryBuffer.push(telemetry);
  if (session.telemetryBuffer.length > BUFFER_SIZE) {
    session.telemetryBuffer.shift();
  }

  // Emit to all connected frontend clients
  session.io?.emit(SOCKET_EVENTS.TELEMETRY_UPDATE, {
    missionId: session.missionId,
    telemetry: telemetry.toJSON ? telemetry.toJSON() : telemetry,
  });

  _emit('onTelemetry', { missionId: session.missionId, telemetry });
}

// ─────────────────────────────────────────────────────────────────
// Private guards
// ─────────────────────────────────────────────────────────────────

function _assertLoaded(method) {
  if (!session.engine || session.status === MISSION_STATUS.IDLE) {
    throw new AppError(`SimulationService.${method}(): no mission loaded`, HTTP.CONFLICT);
  }
}

function _assertRunning(method) {
  if (session.status !== MISSION_STATUS.RUNNING) {
    throw new AppError(`SimulationService.${method}(): simulation is not running (status: ${session.status})`, HTTP.CONFLICT);
  }
}

// Export FAULT_IDS for convenience so other services don't need to import the sim
export { FAULT_IDS };
