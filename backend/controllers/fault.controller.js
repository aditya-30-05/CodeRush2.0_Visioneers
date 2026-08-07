/**
 * fault.controller.js
 *
 * Thin HTTP controller for fault injection endpoints.
 */

import { FaultService } from '../services/FaultService.js';
import { ApiResponse }  from '../utils/ApiResponse.js';
import { HTTP }         from '../utils/constants.js';

export const FaultController = {
  /**
   * POST /fault/inject
   * Body: { faultId: string, meta?: object }
   */
  async injectFault(req, res) {
    const { faultId, duration, severity } = req.body;
    const meta = {};
    if (duration  !== undefined) meta.duration = duration;
    if (severity  !== undefined) meta.severity = severity;
    const fault = await FaultService.injectFault(faultId, meta, req.ip);
    return ApiResponse.success(res, `Fault '${faultId}' injected`, fault, HTTP.CREATED);
  },

  /**
   * POST /fault/clear
   * Body: { faultId: string }
   */
  async clearFault(req, res) {
    const { faultId } = req.body;
    const result = await FaultService.clearFault(faultId, req.ip);
    return ApiResponse.success(res, `Fault '${faultId}' cleared`, result);
  },

  /**
   * GET /faults
   * Returns currently active faults.
   */
  getActiveFaults(req, res) {
    const faults = FaultService.getActiveFaults();
    return ApiResponse.success(res, 'Active faults retrieved', faults);
  },

  /**
   * GET /faults/history/:missionId
   */
  async getFaultHistory(req, res) {
    const { missionId } = req.params;
    const history = await FaultService.getFaultHistory(missionId);
    return ApiResponse.success(res, 'Fault history retrieved', history);
  },
};
