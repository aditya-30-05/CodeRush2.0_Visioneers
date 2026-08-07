/**
 * constants.js
 *
 * Backend-wide named constants.
 * No magic strings or numbers in any other module.
 */

// ── HTTP Status Codes ─────────────────────────────────────────────
export const HTTP = {
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  CONFLICT:              409,
  UNPROCESSABLE_ENTITY:  422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE:   503,
};

// ── Mission status values ─────────────────────────────────────────
export const MISSION_STATUS = {
  IDLE:      'IDLE',
  LOADED:    'LOADED',
  RUNNING:   'RUNNING',
  PAUSED:    'PAUSED',
  COMPLETED: 'COMPLETED',
  STOPPED:   'STOPPED',
  ERROR:     'ERROR',
};

// ── Socket.io event names ─────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Server → Client
  TELEMETRY_UPDATE:     'telemetry_update',
  MISSION_STARTED:      'mission_started',
  MISSION_PAUSED:       'mission_paused',
  MISSION_RESUMED:      'mission_resumed',
  MISSION_COMPLETED:    'mission_completed',
  MISSION_STOPPED:      'mission_stopped',
  MISSION_RESET:        'mission_reset',
  MISSION_LOADED:       'mission_loaded',
  FAULT_INJECTED:       'fault_injected',
  FAULT_CLEARED:        'fault_cleared',
  FAULT_EXPIRED:        'fault_expired',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  WARNING_GENERATED:    'warning_generated',
  STATE_SNAPSHOT:       'state_snapshot',
  ERROR_EVENT:          'error_event',

  // Replay Socket Events
  REPLAY_STARTED:       'replay_started',
  REPLAY_PAUSED:        'replay_paused',
  REPLAY_RESUMED:       'replay_resumed',
  REPLAY_STOPPED:       'replay_stopped',
  REPLAY_SEEK:          'replay_seek',
  REPLAY_SPEED_CHANGED: 'replay_speed_changed',
  REPLAY_TELEMETRY:     'replay_telemetry',
  REPLAY_FINISHED:      'replay_finished',

  // Client → Server (reserved for future bidirectional commands)
  CLIENT_CONNECTED:    'client_connected',
  CLIENT_DISCONNECTED: 'client_disconnected',
};

// ── Operator action types ─────────────────────────────────────────
export const ACTION_TYPES = {
  LOAD_MISSION:    'LOAD_MISSION',
  START_MISSION:   'START_MISSION',
  PAUSE_MISSION:   'PAUSE_MISSION',
  RESUME_MISSION:  'RESUME_MISSION',
  STOP_MISSION:    'STOP_MISSION',
  RESET_MISSION:   'RESET_MISSION',
  INJECT_FAULT:    'INJECT_FAULT',
  CLEAR_FAULT:     'CLEAR_FAULT',
  SET_ACTIVITY:    'SET_ACTIVITY',
  START_REPLAY:    'START_REPLAY',
  PAUSE_REPLAY:    'PAUSE_REPLAY',
  RESUME_REPLAY:   'RESUME_REPLAY',
  STOP_REPLAY:     'STOP_REPLAY',
  SEEK_REPLAY:     'SEEK_REPLAY',
  SPEED_REPLAY:    'SPEED_REPLAY',
};

// ── Supabase table names ──────────────────────────────────────────
export const TABLES = {
  MISSIONS:          'missions',
  TELEMETRY_LOGS:    'telemetry_logs',
  FAULT_LOGS:        'fault_logs',
  CONSTRAINT_LOGS:   'constraint_logs',
  REPLAY_LOGS:       'replay_logs',
  REPLAY_SESSIONS:   'replay_sessions',
  REPLAY_SNAPSHOTS:  'replay_snapshots',
  REPLAY_EVENTS:     'replay_events',
  OPERATOR_ACTIONS:  'operator_actions',
};

// ── Pagination defaults ───────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_LIMIT:  100,
  MAX_LIMIT:      1000,
};
