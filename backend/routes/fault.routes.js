/**
 * fault.routes.js
 *
 *   POST /fault/inject
 *   POST /fault/clear
 *   GET  /faults
 *   GET  /faults/history/:missionId
 */

import { Router }            from 'express';
import { FaultController }   from '../controllers/fault.controller.js';
import { asyncHandler }      from '../utils/helpers.js';
import { validate, schemas } from '../middlewares/validation.js';

const router = Router();

router.post('/inject',           validate(schemas.injectFault), asyncHandler(FaultController.injectFault));
router.post('/clear',            validate(schemas.clearFault),  asyncHandler(FaultController.clearFault));
router.get('/',                  asyncHandler(FaultController.getActiveFaults));
router.get('/history/:missionId',asyncHandler(FaultController.getFaultHistory));

export default router;
