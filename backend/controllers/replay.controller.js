/**
 * replay.controller.js
 *
 * Thin HTTP controller for Replay API endpoints.
 */

import * as ReplayService from '../services/ReplayService.js';
import { ApiResponse }    from '../utils/ApiResponse.js';

export const ReplayController = {
  /**
   * GET /replay
   * List all missions with stored replay data.
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

  /**
   * GET /replay/events/:missionId
   * Return historical events list (faults, operator actions, milestones).
   */
  async getReplayEvents(req, res) {
    const { missionId } = req.params;
    const events = await ReplayService.getReplayEvents(missionId);
    return ApiResponse.success(res, 'Replay events retrieved', events);
  },

  /**
   * POST /replay/start
   * Start or restart replay playback.
   * Body: { missionId?: string }
   */
  async startReplay(req, res) {
    const { missionId } = req.body || {};
    const info = await ReplayService.startReplay(missionId);
    return ApiResponse.success(res, 'Replay started', info);
  },

  /**
   * POST /replay/pause
   * Pause current replay playback.
   */
  async pauseReplay(req, res) {
    const info = ReplayService.pauseReplay();
    return ApiResponse.success(res, 'Replay paused', info);
  },

  /**
   * POST /replay/resume
   * Resume paused replay playback.
   */
  async resumeReplay(req, res) {
    const info = ReplayService.resumeReplay();
    return ApiResponse.success(res, 'Replay resumed', info);
  },

  /**
   * POST /replay/stop
   * Stop replay playback and reset playhead to start.
   */
  async stopReplay(req, res) {
    const info = ReplayService.stopReplay();
    return ApiResponse.success(res, 'Replay stopped', info);
  },

  /**
   * POST /replay/seek
   * Seek playhead by frameIndex or targetTime.
   * Body: { frameIndex?: number, targetTime?: number }
   */
  async seekReplay(req, res) {
    const { frameIndex, targetTime } = req.body || {};
    const info = ReplayService.seekReplay({ frameIndex, targetTime });
    return ApiResponse.success(res, 'Replay seek executed', info);
  },

  /**
   * POST /replay/speed
   * Change replay speed multiplier (0.5x, 1x, 2x, 4x).
   * Body: { speed: number }
   */
  async setReplaySpeed(req, res) {
    const { speed } = req.body || {};
    const info = ReplayService.setReplaySpeed(speed);
    return ApiResponse.success(res, 'Replay speed updated', info);
  },

  /**
   * POST /replay/step/prev
   * Jump -1 frame backward.
   */
  async stepPrev(req, res) {
    const info = ReplayService.stepPrev();
    return ApiResponse.success(res, 'Replay stepped backward', info);
  },

  /**
   * POST /replay/step/next
   * Jump +1 frame forward.
   */
  async stepNext(req, res) {
    const info = ReplayService.stepNext();
    return ApiResponse.success(res, 'Replay stepped forward', info);
  },
};
