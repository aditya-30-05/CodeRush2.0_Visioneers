/**
 * logger.js
 *
 * Structured request & application logger middleware.
 *
 * Uses morgan for HTTP request logging.
 * Exposes a simple log() helper for application-level events.
 */

import morgan from 'morgan';

const isDev = process.env.NODE_ENV !== 'production';

// ── morgan HTTP request logger ───────────────────────────────────
// 'dev'  format: colorised short output in development
// 'combined' format: Apache combined log in production
export const httpLogger = morgan(isDev ? 'dev' : 'combined');

// ── Application logger ────────────────────────────────────────────
const LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', DEBUG: 'DEBUG' };

function _log(level, message, meta = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(Object.keys(meta).length ? { meta } : {}),
  };

  const output = isDev
    ? `[${entry.timestamp}] [${level}] ${message}${meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`
    : JSON.stringify(entry);

  if (level === LEVELS.ERROR) {
    console.error(output);
  } else if (level === LEVELS.WARN) {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info:  (msg, meta) => _log(LEVELS.INFO,  msg, meta),
  warn:  (msg, meta) => _log(LEVELS.WARN,  msg, meta),
  error: (msg, meta) => _log(LEVELS.ERROR, msg, meta),
  debug: (msg, meta) => isDev ? _log(LEVELS.DEBUG, msg, meta) : undefined,
};
