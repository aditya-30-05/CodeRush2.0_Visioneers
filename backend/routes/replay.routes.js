/**
 * replay.routes.js
 *
 * Replay API Endpoints:
 *   GET  /replay                       → list missions with replay data
 *   GET  /replay/events/:missionId     → historical event list
 *   GET  /replay/:missionId            → full replay timeline
 *   POST /replay/start                 → start replay playback
 *   POST /replay/pause                 → pause replay playback
 *   POST /replay/resume                → resume replay playback
 *   POST /replay/stop                  → stop replay playback
 *   POST /replay/seek                  → seek playhead by time/index
 *   POST /replay/speed                 → update speed multiplier (0.5x, 1x, 2x, 4x)
 *   POST /replay/step/prev             → step -1 frame
 *   POST /replay/step/next             → step +1 frame
 */

import { Router }           from 'express';
import { ReplayController } from '../controllers/replay.controller.js';
import { asyncHandler }     from '../utils/helpers.js';

const router = Router();

router.get('/',                    asyncHandler(ReplayController.listReplayMissions));
router.get('/events/:missionId',   asyncHandler(ReplayController.getReplayEvents));
router.get('/:missionId',          asyncHandler(ReplayController.getReplayTimeline));

router.post('/start',              asyncHandler(ReplayController.startReplay));
router.post('/pause',              asyncHandler(ReplayController.pauseReplay));
router.post('/resume',             asyncHandler(ReplayController.resumeReplay));
router.post('/stop',               asyncHandler(ReplayController.stopReplay));
router.post('/seek',               asyncHandler(ReplayController.seekReplay));
router.post('/speed',              asyncHandler(ReplayController.setReplaySpeed));
router.post('/step/prev',          asyncHandler(ReplayController.stepPrev));
router.post('/step/next',          asyncHandler(ReplayController.stepNext));

export default router;
