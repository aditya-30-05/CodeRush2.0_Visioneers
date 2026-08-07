/**
 * app.js
 *
 * Express application factory.
 *
 * Creates and configures the Express app with:
 *   - Security middleware (helmet, cors)
 *   - Compression
 *   - Request parsing
 *   - HTTP logging
 *   - All API routes
 *   - Health endpoint
 *   - 404 handler
 *   - Centralised error handler
 *
 * Does NOT start the server. server.js is responsible for binding.
 */

import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import compression  from 'compression';
import 'dotenv/config';

import { httpLogger }                  from './middlewares/logger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { ApiResponse }                 from './utils/ApiResponse.js';
import { checkDbConnection }           from './config/supabase.js';
import { HTTP }                        from './utils/constants.js';

import missionRoutes  from './routes/mission.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import faultRoutes    from './routes/fault.routes.js';
import replayRoutes   from './routes/replay.routes.js';

export function createApp() {
  const app = express();

  // ── Security ───────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin:      process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  }));

  // ── Performance ────────────────────────────────────────────────
  app.use(compression());

  // ── Parsing ────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── HTTP logging ───────────────────────────────────────────────
  app.use(httpLogger);

  // ── Health check ───────────────────────────────────────────────
  app.get('/health', async (req, res) => {
    const db = await checkDbConnection();
    const uptime = process.uptime();
    return ApiResponse.success(res, 'Backend is operational', {
      service:   'spacecraft-mission-ops-backend',
      version:   '1.0.0',
      status:    'healthy',
      uptime:    `${Math.floor(uptime)}s`,
      database:  db ? 'connected' : 'unavailable (in-memory mode)',
      timestamp: new Date().toISOString(),
    }, db ? HTTP.OK : HTTP.OK); // still 200 — DB degraded but server healthy
  });

  // ── API Routes ─────────────────────────────────────────────────
  app.use('/mission',  missionRoutes);
  app.use('/telemetry', telemetryRoutes);
  app.use('/fault',    faultRoutes);
  app.use('/faults',   faultRoutes);  // plural alias for GET /faults
  app.use('/replay',   replayRoutes);

  // ── 404 Handler ────────────────────────────────────────────────
  app.use(notFoundHandler);

  // ── Centralised Error Handler (MUST be last) ───────────────────
  app.use(errorHandler);

  return app;
}
