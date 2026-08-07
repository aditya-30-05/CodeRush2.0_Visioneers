/**
 * validation.js
 *
 * Request validation middleware factory.
 *
 * Provides simple, schema-based request body validation without
 * external libraries (Joi, Zod, etc.) for zero extra dependencies.
 *
 * Usage:
 *   router.post('/fault/inject', validate(schemas.injectFault), controller.injectFault);
 */

import { ApiResponse } from '../utils/ApiResponse.js';

// ── Validation schemas ────────────────────────────────────────────
// Each schema is an object of field → rule:
//   { required: bool, type: 'string'|'number'|'object', values: [] }

export const schemas = {
  loadMission: {
    missionData: { required: true, type: 'object' },
  },

  injectFault: {
    faultId: {
      required: true,
      type:     'string',
      values: [
        'BATTERY_LEAK', 'SOLAR_PANEL_FAILURE', 'THERMAL_SPIKE',
        'COMMUNICATION_LOSS', 'PACKET_LOSS', 'SENSOR_DRIFT',
        'REACTION_WHEEL_FAILURE', 'ACTUATOR_FAILURE',
        'CONFLICTING_SENSORS', 'MISSING_TELEMETRY',
      ],
    },
  },

  clearFault: {
    faultId: { required: true, type: 'string' },
  },

  setActivity: {
    activity: {
      required: true,
      type:     'string',
      values:   ['Idle', 'Rotate', 'Observation', 'Calibration', 'Downlink', 'SafeMode', 'Charging'],
    },
  },
};

// ── Middleware factory ────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against schema.
 *
 * @param {Object} schema
 * @returns {Function} Express middleware
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const body   = req.body ?? {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      // Skip optional absent fields
      if (!rules.required && (value === undefined || value === null)) continue;

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}`);
        continue;
      }

      // Allowed values check
      if (rules.values && !rules.values.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.values.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return ApiResponse.badRequest(res, 'Validation failed', errors);
    }

    next();
  };
}
