/**
 * helpers.js
 *
 * Pure utility functions shared across all engines.
 * No side-effects.  No imports from other simulation modules.
 */

/**
 * Clamp value to [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation from a to b by t ∈ [0,1].
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Return a random float in [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Apply sensor drift: deviate a value by up to ±driftPercent.
 * @param {number} value
 * @param {number} driftPercent  - e.g. 5 means ±5%
 * @returns {number}
 */
export function applyDrift(value, driftPercent = 5) {
  const factor = 1 + (randomBetween(-driftPercent, driftPercent) / 100);
  return value * factor;
}

/**
 * Round to N decimal places.
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Format elapsed seconds as HH:MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatMissionTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/**
 * Determine if a percentage is above a threshold.
 * @param {number} value
 * @param {number} threshold
 * @returns {boolean}
 */
export function isAbove(value, threshold) {
  return value > threshold;
}

/**
 * Determine if a percentage is below a threshold.
 * @param {number} value
 * @param {number} threshold
 * @returns {boolean}
 */
export function isBelow(value, threshold) {
  return value < threshold;
}

/**
 * Deep-freeze an object recursively (for safe external exposure).
 * @param {Object} obj
 * @returns {Readonly<Object>}
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

/**
 * Create an ISO-8601 timestamp string from a Unix millisecond value.
 * @param {number} ms
 * @returns {string}
 */
export function toISOTimestamp(ms) {
  return new Date(ms).toISOString();
}
