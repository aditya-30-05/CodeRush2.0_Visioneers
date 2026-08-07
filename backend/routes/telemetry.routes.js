/**
 * telemetry.routes.js
 *
 *   GET /telemetry              → live buffer
 *   GET /telemetry/latest       → single latest frame
 *   GET /telemetry/history/:id  → historical from Supabase
 */

import { Router }               from 'express';
import { TelemetryController }  from '../controllers/telemetry.controller.js';
import { asyncHandler }         from '../utils/helpers.js';

const router = Router();

router.get('/',                    asyncHandler(TelemetryController.getBuffer));
router.get('/latest',              asyncHandler(TelemetryController.getLatest));
router.get('/history/:missionId',  asyncHandler(TelemetryController.getHistorical));

export default router;
