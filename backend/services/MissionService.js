/**
 * MissionService.js
 *
 * Mission lifecycle business logic.
 *
 * Orchestrates:
 *   - Mission load → SimulationService + MissionRepository
 *   - Mission start/pause/resume/stop/reset → SimulationService
 *   - Mission status queries
 *   - Operator action logging
 *
 * Controllers call this service. This service calls SimulationService.
 * MissionService knows nothing about Express or Socket.io.
 */

import * as SimulationService from './SimulationService.js';
import { MissionRepository }  from '../database/MissionRepository.js';
import { OperatorActionRepository } from '../database/OperatorActionRepository.js';
import { AppError }           from '../middlewares/errorHandler.js';
import { logger }             from '../middlewares/logger.js';
import { generateId, now }    from '../utils/helpers.js';
import { MISSION_STATUS, ACTION_TYPES, HTTP } from '../utils/constants.js';

export class MissionService {
  /**
   * Load a mission from a raw JSON object (parsed by controller).
   *
   * @param {Object} missionData - Parsed mission JSON
   * @param {string} [operatorIp]
   * @returns {Promise<Object>} missionRecord
   */
  static async loadMission(missionData, operatorIp = null) {
    if (!missionData || typeof missionData !== 'object') {
      throw new AppError('missionData must be a valid mission JSON object', HTTP.BAD_REQUEST);
    }
    if (!missionData.missionName || !Array.isArray(missionData.timeline)) {
      throw new AppError('missionData must contain missionName and timeline', HTTP.BAD_REQUEST);
    }

    const missionId = generateId();

    // Initialise simulation engine with mission
    SimulationService.loadMission(missionData, missionId);

    // Persist mission record
    const record = await MissionRepository.create({
      id:         missionId,
      name:       missionData.missionName,
      status:     MISSION_STATUS.LOADED,
      config:     missionData,
      created_at: now(),
    });

    // Log operator action
    OperatorActionRepository.log({
      mission_id:   missionId,
      action_type:  ACTION_TYPES.LOAD_MISSION,
      payload:      { missionName: missionData.missionName },
      mission_time: 0,
      ip_address:   operatorIp,
    });

    logger.info('Mission loaded', { missionId, name: missionData.missionName });

    return record ?? { id: missionId, name: missionData.missionName, status: MISSION_STATUS.LOADED };
  }

  /**
   * Start the mission.
   *
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async startMission(operatorIp = null) {
    SimulationService.start();
    const status = SimulationService.getSessionStatus();

    await MissionRepository.update(status.missionId, {
      status:     MISSION_STATUS.RUNNING,
      started_at: status.startedAt,
    });

    OperatorActionRepository.log({
      mission_id:   status.missionId,
      action_type:  ACTION_TYPES.START_MISSION,
      payload:      {},
      mission_time: status.missionTime,
      ip_address:   operatorIp,
    });

    return status;
  }

  /**
   * Pause the mission.
   *
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async pauseMission(operatorIp = null) {
    SimulationService.pause();
    const status = SimulationService.getSessionStatus();

    await MissionRepository.update(status.missionId, { status: MISSION_STATUS.PAUSED });

    OperatorActionRepository.log({
      mission_id:   status.missionId,
      action_type:  ACTION_TYPES.PAUSE_MISSION,
      payload:      {},
      mission_time: status.missionTime,
      ip_address:   operatorIp,
    });

    return status;
  }

  /**
   * Resume the mission.
   *
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async resumeMission(operatorIp = null) {
    SimulationService.resume();
    const status = SimulationService.getSessionStatus();

    await MissionRepository.update(status.missionId, { status: MISSION_STATUS.RUNNING });

    OperatorActionRepository.log({
      mission_id:   status.missionId,
      action_type:  ACTION_TYPES.RESUME_MISSION,
      payload:      {},
      mission_time: status.missionTime,
      ip_address:   operatorIp,
    });

    return status;
  }

  /**
   * Stop the mission permanently.
   *
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async stopMission(operatorIp = null) {
    SimulationService.stop();
    const status = SimulationService.getSessionStatus();

    await MissionRepository.update(status.missionId, {
      status:       MISSION_STATUS.STOPPED,
      completed_at: status.stoppedAt,
      final_state:  SimulationService.getCurrentState(),
    });

    OperatorActionRepository.log({
      mission_id:   status.missionId,
      action_type:  ACTION_TYPES.STOP_MISSION,
      payload:      {},
      mission_time: status.missionTime,
      ip_address:   operatorIp,
    });

    return status;
  }

  /**
   * Reset the mission to tick 0.
   *
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async resetMission(operatorIp = null) {
    SimulationService.reset();
    const status = SimulationService.getSessionStatus();

    await MissionRepository.update(status.missionId, { status: MISSION_STATUS.LOADED });

    OperatorActionRepository.log({
      mission_id:   status.missionId,
      action_type:  ACTION_TYPES.RESET_MISSION,
      payload:      {},
      mission_time: 0,
      ip_address:   operatorIp,
    });

    return status;
  }

  /**
   * Return current mission status.
   *
   * @returns {Object}
   */
  static getStatus() {
    return SimulationService.getSessionStatus();
  }
}
