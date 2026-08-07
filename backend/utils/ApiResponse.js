/**
 * ApiResponse.js
 *
 * Standardised API response factory.
 *
 * Every REST endpoint uses these static methods to ensure a
 * consistent envelope:
 *
 *   {
 *     success:   boolean,
 *     message:   string,
 *     data:      any | null,
 *     timestamp: ISO-8601 string
 *   }
 *
 * Controllers call ApiResponse.success(res, ...) or ApiResponse.error(res, ...)
 * and never construct raw response objects themselves.
 */

import { HTTP } from './constants.js';

export class ApiResponse {
  /**
   * Send a successful response.
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @param {*} data
   * @param {number} statusCode
   */
  static success(res, message = 'Success', data = null, statusCode = HTTP.OK) {
    return res.status(statusCode).json({
      success:   true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send an error response.
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @param {number} statusCode
   * @param {*} details  - Optional additional error detail (never stack traces in production)
   */
  static error(res, message = 'An error occurred', statusCode = HTTP.INTERNAL_SERVER_ERROR, details = null) {
    const body = {
      success:   false,
      message,
      data:      details,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      delete body.data; // never leak internals in production
    }

    return res.status(statusCode).json(body);
  }

  /**
   * Send a 404 Not Found response.
   *
   * @param {import('express').Response} res
   * @param {string} resource
   */
  static notFound(res, resource = 'Resource') {
    return ApiResponse.error(res, `${resource} not found`, HTTP.NOT_FOUND);
  }

  /**
   * Send a 400 Bad Request response.
   *
   * @param {import('express').Response} res
   * @param {string} message
   * @param {*} validationErrors
   */
  static badRequest(res, message = 'Bad request', validationErrors = null) {
    return ApiResponse.error(res, message, HTTP.BAD_REQUEST, validationErrors);
  }

  /**
   * Send a 409 Conflict response.
   *
   * @param {import('express').Response} res
   * @param {string} message
   */
  static conflict(res, message = 'Conflict') {
    return ApiResponse.error(res, message, HTTP.CONFLICT);
  }
}
