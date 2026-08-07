/**
 * mission.controller.js
 *
 * Thin HTTP controller for mission lifecycle & AI Mission Planner endpoints.
 */

import { MissionService } from '../services/MissionService.js';
import * as MissionPlannerService from '../services/MissionPlannerService.js';
import { ApiResponse }    from '../utils/ApiResponse.js';
import { HTTP }           from '../utils/constants.js';

export const MissionController = {
  /**
   * POST /mission/load
   * Body: { missionData: Object }
   */
  async loadMission(req, res) {
    const { missionData } = req.body;
    const operatorIp = req.ip;

    const record = await MissionService.loadMission(missionData, operatorIp);

    return ApiResponse.success(res, 'Mission loaded successfully', record, HTTP.CREATED);
  },

  /**
   * POST /mission/start
   */
  async startMission(req, res) {
    const status = await MissionService.startMission(req.ip);
    return ApiResponse.success(res, 'Mission started', status);
  },

  /**
   * POST /mission/pause
   */
  async pauseMission(req, res) {
    const status = await MissionService.pauseMission(req.ip);
    return ApiResponse.success(res, 'Mission paused', status);
  },

  /**
   * POST /mission/resume
   */
  async resumeMission(req, res) {
    const status = await MissionService.resumeMission(req.ip);
    return ApiResponse.success(res, 'Mission resumed', status);
  },

  /**
   * POST /mission/stop
   */
  async stopMission(req, res) {
    const status = await MissionService.stopMission(req.ip);
    return ApiResponse.success(res, 'Mission stopped', status);
  },

  /**
   * POST /mission/reset
   */
  async resetMission(req, res) {
    const status = await MissionService.resetMission(req.ip);
    return ApiResponse.success(res, 'Mission reset to tick 0', status);
  },

  /**
   * GET /mission/status
   */
  getStatus(req, res) {
    const status = MissionService.getStatus();
    return ApiResponse.success(res, 'Mission status retrieved', status);
  },

  /**
   * POST /mission/plan
   * Body: { customInputs?: Object }
   */
  async generateAiPlan(req, res) {
    const customInputs = req.body || {};
    const report = await MissionPlannerService.generateMissionPlan(customInputs);
    return ApiResponse.success(res, 'AI Mission Plan generated successfully', report, HTTP.OK);
  },
};
