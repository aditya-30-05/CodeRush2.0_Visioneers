/**
 * replay.controller.js
 *
 * Thin HTTP controller for replay timeline endpoints.
 */

import * as ReplayService from '../services/ReplayService.js';
import { ApiResponse }    from '../utils/ApiResponse.js';

export const ReplayController = {
  /**
   * GET /replay
   * List all missions with replay data.
   */
  async listReplayMissions(req, res) {
    const missions = await ReplayService.listReplayMissions();
    return ApiResponse.success(res, 'Replay missions retrieved', missions);
  },

  /**
   * GET /replay/:missionId
   * Return full replay timeline for a given mission.
   */
  async getReplayTimeline(req, res) {
    const { missionId } = req.params;
    const timeline = await ReplayService.getReplayTimeline(missionId);
    return ApiResponse.success(res, 'Replay timeline retrieved', timeline);
  },
};
