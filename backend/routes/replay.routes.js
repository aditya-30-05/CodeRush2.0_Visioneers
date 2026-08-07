/**
 * replay.routes.js
 *
 *   GET /replay              → list missions with replay
 *   GET /replay/:missionId   → full replay timeline
 */

import { Router }           from 'express';
import { ReplayController } from '../controllers/replay.controller.js';
import { asyncHandler }     from '../utils/helpers.js';

const router = Router();

router.get('/',             asyncHandler(ReplayController.listReplayMissions));
router.get('/:missionId',  asyncHandler(ReplayController.getReplayTimeline));

export default router;
