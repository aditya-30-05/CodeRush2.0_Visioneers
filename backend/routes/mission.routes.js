/**
 * mission.routes.js
 *
 * Mission lifecycle REST routes.
 *
 *   POST /mission/load
 *   POST /mission/start
 *   POST /mission/pause
 *   POST /mission/resume
 *   POST /mission/stop
 *   POST /mission/reset
 *   GET  /mission/status
 */

import { Router }            from 'express';
import { MissionController } from '../controllers/mission.controller.js';
import { asyncHandler }      from '../utils/helpers.js';
import { validate, schemas } from '../middlewares/validation.js';

const router = Router();

router.post('/load',   validate(schemas.loadMission), asyncHandler(MissionController.loadMission));
router.post('/start',  asyncHandler(MissionController.startMission));
router.post('/pause',  asyncHandler(MissionController.pauseMission));
router.post('/resume', asyncHandler(MissionController.resumeMission));
router.post('/stop',   asyncHandler(MissionController.stopMission));
router.post('/reset',  asyncHandler(MissionController.resetMission));
router.get('/status',  asyncHandler(MissionController.getStatus));

export default router;
