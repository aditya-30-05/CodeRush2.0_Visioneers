/**
 * FaultService.js
 *
 * Business logic for fault injection and clearance.
 *
 * Responsibilities:
 *   - Delegate fault injection/clearance to SimulationService
 *   - Persist fault events to Supabase
 *   - Provide fault list queries
 */

import * as SimulationService from './SimulationService.js';
import { FaultRepository }    from '../database/FaultRepository.js';
import { OperatorActionRepository } from '../database/OperatorActionRepository.js';
import { AppError }           from '../middlewares/errorHandler.js';
import { logger }             from '../middlewares/logger.js';
import { now }                from '../utils/helpers.js';
import { ACTION_TYPES, HTTP } from '../utils/constants.js';

export class FaultService {
  /**
   * Inject a fault into the simulation.
   *
   * @param {string} faultId
   * @param {Object} [meta]
   * @param {string} [operatorIp]
   * @returns {Promise<Object>} fault record
   */
  static async injectFault(faultId, meta = {}, operatorIp = null) {
    const sessionStatus = SimulationService.getSessionStatus();

    const fault = SimulationService.injectFault(faultId, meta);

    // Persist fault event
    await FaultRepository.log({
      mission_id:   sessionStatus.missionId,
      fault_id:     faultId,
      description:  fault?.description ?? faultId,
      severity:     fault?.severity    ?? 'HIGH',
      action:       'INJECTED',
      mission_time: sessionStatus.missionTime,
      created_at:   now(),
    });

    // Operator audit
    OperatorActionRepository.log({
      mission_id:   sessionStatus.missionId,
      action_type:  ACTION_TYPES.INJECT_FAULT,
      payload:      { faultId, meta },
      mission_time: sessionStatus.missionTime,
      ip_address:   operatorIp,
    });

    logger.info('Fault injected', { faultId, missionId: sessionStatus.missionId });

    return {
      faultId,
      description:  fault?.description ?? faultId,
      severity:     fault?.severity    ?? 'HIGH',
      missionTime:  sessionStatus.missionTime,
      injectedAt:   now(),
    };
  }

  /**
   * Clear a fault from the simulation.
   *
   * @param {string} faultId
   * @param {string} [operatorIp]
   * @returns {Promise<Object>}
   */
  static async clearFault(faultId, operatorIp = null) {
    const sessionStatus = SimulationService.getSessionStatus();
    const cleared = SimulationService.clearFault(faultId);

    if (!cleared) {
      throw new AppError(`Fault '${faultId}' is not currently active`, HTTP.NOT_FOUND);
    }

    await FaultRepository.log({
      mission_id:   sessionStatus.missionId,
      fault_id:     faultId,
      description:  `Fault ${faultId} cleared`,
      severity:     'NONE',
      action:       'CLEARED',
      mission_time: sessionStatus.missionTime,
      created_at:   now(),
    });

    OperatorActionRepository.log({
      mission_id:   sessionStatus.missionId,
      action_type:  ACTION_TYPES.CLEAR_FAULT,
      payload:      { faultId },
      mission_time: sessionStatus.missionTime,
      ip_address:   operatorIp,
    });

    logger.info('Fault cleared', { faultId, missionId: sessionStatus.missionId });

    return { faultId, cleared: true, missionTime: sessionStatus.missionTime };
  }

  /**
   * Return the list of currently active faults.
   *
   * @returns {Object[]}
   */
  static getActiveFaults() {
    return SimulationService.getActiveFaults();
  }

  /**
   * Return fault history for a mission from Supabase.
   *
   * @param {string} missionId
   * @returns {Promise<Object[]>}
   */
  static async getFaultHistory(missionId) {
    return FaultRepository.findByMission(missionId);
  }
}
