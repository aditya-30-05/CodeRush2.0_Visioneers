/**
 * helpers.js
 *
 * Pure backend utility functions.
 * No side-effects. No imports from other backend modules.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID v4.
 * @returns {string}
 */
export function generateId() {
  return uuidv4();
}

/**
 * Return current UTC timestamp as an ISO-8601 string.
 * @returns {string}
 */
export function now() {
  return new Date().toISOString();
}

/**
 * Wrap an async route handler so unhandled promise rejections
 * are forwarded to Express's next(err) middleware automatically.
 *
 * Usage:
 *   router.get('/path', asyncHandler(controller.method));
 *
 * @param {Function} fn - Async Express handler (req, res, next) => Promise
 * @returns {Function}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Parse an integer from a string, returning a default if invalid.
 * @param {string | number} value
 * @param {number} defaultValue
 * @returns {number}
 */
export function parseIntSafe(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Clamp a number to [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely stringify any value for logging, handling circular refs.
 * @param {*} value
 * @returns {string}
 */
export function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Redact sensitive keys from an object for safe logging.
 * @param {Object} obj
 * @param {string[]} keys - Keys to redact
 * @returns {Object}
 */
export function redactSensitive(obj, keys = ['password', 'token', 'secret', 'key']) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = { ...obj };
  for (const key of keys) {
    if (key in copy) copy[key] = '[REDACTED]';
  }
  return copy;
}

/**
 * Format mission time seconds as HH:MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatMET(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
