/**
 * copilot.controller.js
 *
 * Express controller for OrbitOps AI Mission Copilot endpoints.
 */

import * as AiCopilotService from '../services/AiCopilotService.js';
import { ApiResponse }       from '../utils/ApiResponse.js';
import { HTTP }              from '../utils/constants.js';
import { logger }            from '../middlewares/logger.js';

/**
 * Handle natural language query from AI Copilot UI.
 * POST /copilot/query
 * Body: { prompt: string }
 */
export async function queryCopilot(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return ApiResponse.error(res, 'Prompt text is required', HTTP.BAD_REQUEST);
    }

    const result = await AiCopilotService.processCopilotQuery(prompt);
    return ApiResponse.success(res, 'Copilot query processed', result, HTTP.OK);
  } catch (err) {
    logger.error('queryCopilot failed', { message: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * Handle confirmed user action execution from AI Copilot UI.
 * POST /copilot/action
 * Body: { action: string, params?: object }
 */
export async function executeCopilotAction(req, res, next) {
  try {
    const { action, params } = req.body;
    if (!action || typeof action !== 'string') {
      return ApiResponse.error(res, 'Action name is required', HTTP.BAD_REQUEST);
    }

    const result = await AiCopilotService.executeCopilotAction({ action, params });
    return ApiResponse.success(res, result.message, result.data, HTTP.OK);
  } catch (err) {
    logger.error('executeCopilotAction failed', { message: err.message, stack: err.stack });
    next(err);
  }
}
