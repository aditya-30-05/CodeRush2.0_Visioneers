/**
 * server.js
 *
 * Main server entry point.
 *
 * Startup sequence:
 *   1. Load environment variables
 *   2. Create Express app
 *   3. Create HTTP server
 *   4. Create Socket.io server
 *   5. Wire Socket.io into SimulationService
 *   6. Initialise TelemetryService & ReplayService event listeners
 *   7. Start listening
 *   8. Handle graceful shutdown
 */

import http      from 'http';
import 'dotenv/config';

import { createApp }            from './app.js';
import { createSocketServer }   from './socket/socket.js';
import * as SimulationService   from './services/SimulationService.js';
import * as TelemetryService    from './services/TelemetryService.js';
import * as ReplayService       from './services/ReplayService.js';
import { logger }               from './middlewares/logger.js';

const PORT        = parseInt(process.env.PORT ?? '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

async function bootstrap() {
  // ── 1. Create Express app ──────────────────────────────────────
  const app = createApp();

  // ── 2. Create HTTP server ──────────────────────────────────────
  const httpServer = http.createServer(app);

  // ── 3. Create Socket.io server ────────────────────────────────
  const io = createSocketServer(httpServer, CORS_ORIGIN);
  global._ioServer = io;

  // ── 4. Wire Socket.io into SimulationService ──────────────────
  //    Must happen BEFORE any mission is loaded.
  SimulationService.initialize(io);

  // ── 5. Initialise service-level event listeners ───────────────
  TelemetryService.initialize();  // persists telemetry every N ticks
  ReplayService.initialize(io);   // persists replay snapshots every 5 ticks

  // ── 6. Start listening ────────────────────────────────────────
  httpServer.listen(PORT, () => {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('   🛰️  Spacecraft Mission Ops Backend — Online');
    logger.info(`   PORT        : ${PORT}`);
    logger.info(`   CORS ORIGIN : ${CORS_ORIGIN}`);
    logger.info(`   NODE_ENV    : ${process.env.NODE_ENV ?? 'development'}`);
    logger.info('═══════════════════════════════════════════════════');
    logger.info('Health check : http://localhost:' + PORT + '/health');
    logger.info('Mission API  : http://localhost:' + PORT + '/mission/status');
  });

  // ── 7. Graceful shutdown ──────────────────────────────────────
  function gracefulShutdown(signal) {
    logger.warn(`${signal} received — shutting down gracefully`);

    // Stop the simulation if running
    try {
      const status = SimulationService.getSessionStatus();
      if (status.status === 'RUNNING' || status.status === 'PAUSED') {
        SimulationService.stop();
        logger.info('Simulation stopped cleanly');
      }
    } catch { /* no mission loaded */ }

    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10s if server didn't close cleanly
    setTimeout(() => {
      logger.error('Force exit after 10s shutdown timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception — exiting', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
    // Do not exit — log and continue; simulation should not crash on a DB timeout
  });
}

bootstrap();
