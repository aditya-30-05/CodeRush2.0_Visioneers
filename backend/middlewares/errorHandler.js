/**
 * errorHandler.js
 *
 * Centralised Express error-handling middleware.
 *
 * Architecture:
 *   - All async route handlers use asyncHandler() from utils/helpers.js,
 *     which calls next(err) on rejection.
 *   - Express routes this err to this middleware (4-argument signature).
 *   - This middleware normalises the error and sends a structured response.
 *
 * Register LAST in app.js after all routes.
 */

import { logger }      from './logger.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP }        from '../utils/constants.js';

/**
 * Express error-handling middleware.
 *
 * @param {Error}                    err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {Function}                 next  - Must be declared even if unused (4-arg = error handler)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Normalise status code
  const statusCode = err.statusCode ?? err.status ?? HTTP.INTERNAL_SERVER_ERROR;
  const message    = err.message ?? 'An unexpected error occurred';

  // Log the full error for server-side diagnostics
  logger.error(`${req.method} ${req.originalUrl} — ${message}`, {
    statusCode,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const details = process.env.NODE_ENV !== 'production'
    ? { stack: err.stack, name: err.name }
    : null;

  return ApiResponse.error(res, message, statusCode, details);
}

/**
 * 404 handler — registered BEFORE errorHandler but AFTER all routes.
 * Generates a structured not-found response for unmatched routes.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export function notFoundHandler(req, res) {
  return ApiResponse.error(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    HTTP.NOT_FOUND
  );
}

/**
 * AppError — custom error class allowing controllers/services to
 * throw structured errors with an HTTP status code attached.
 *
 * Usage:
 *   throw new AppError('Mission not loaded', 409);
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode = HTTP.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
