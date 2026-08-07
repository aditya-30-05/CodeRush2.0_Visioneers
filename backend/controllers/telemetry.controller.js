/**
 * telemetry.controller.js
 *
 * Thin HTTP controller for telemetry endpoints.
 */

import * as TelemetryService from '../services/TelemetryService.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { parseIntSafe }      from '../utils/helpers.js';

export const TelemetryController = {
  /**
   * GET /telemetry
   * Returns the in-memory rolling buffer (last 300 frames, live feed).
   * Optional query: ?limit=N
   */
  getBuffer(req, res) {
    const limit  = parseIntSafe(req.query.limit, 300);
    const buffer = TelemetryService.getBuffer();
    const sliced = limit > 0 ? buffer.slice(-limit) : buffer;
    return ApiResponse.success(res, 'Telemetry buffer retrieved', sliced);
  },

  /**
   * GET /telemetry/latest
   * Returns the single most recent telemetry record.
   */
  getLatest(req, res) {
    const telemetry = TelemetryService.getLatest();
    if (!telemetry) {
      return ApiResponse.notFound(res, 'Telemetry');
    }
    return ApiResponse.success(res, 'Latest telemetry retrieved', telemetry);
  },

  /**
   * GET /telemetry/history/:missionId
   * Returns historical telemetry from Supabase.
   */
  async getHistorical(req, res) {
    const { missionId } = req.params;
    const limit  = parseIntSafe(req.query.limit,  100);
    const offset = parseIntSafe(req.query.offset, 0);
    const data = await TelemetryService.getHistorical(missionId, limit, offset);
    return ApiResponse.success(res, 'Historical telemetry retrieved', data);
  },
};
