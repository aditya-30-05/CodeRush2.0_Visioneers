/**
 * copilot.routes.js
 *
 * API Routes for OrbitOps AI Mission Copilot.
 *
 * Routes:
 *   POST /copilot/query  - Process AI queries
 *   POST /copilot/action - Execute confirmed backend actions
 */

import { Router } from 'express';
import { queryCopilot, executeCopilotAction } from '../controllers/copilot.controller.js';

const router = Router();

router.post('/query',  queryCopilot);
router.post('/action', executeCopilotAction);

export default router;
