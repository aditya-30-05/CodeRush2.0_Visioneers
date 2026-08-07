/**
 * socket.js
 *
 * Socket.io server configuration and connection management.
 *
 * Architecture:
 *   - Created once in server.js and attached to the HTTP server
 *   - Passed into SimulationService.initialize(io) so the engine
 *     callbacks can emit directly to clients
 *   - This file handles connection/disconnection bookkeeping only
 *   - Data emission happens inside SimulationService callbacks
 *
 * Future AI Copilot integration:
 *   Register additional event handlers here (e.g., ai_recommendation)
 *   without touching SimulationService.
 */

import { Server } from 'socket.io';
import { logger } from '../middlewares/logger.js';
import { SOCKET_EVENTS } from '../utils/constants.js';

let _io = null;

/**
 * Create and configure the Socket.io server.
 *
 * @param {import('http').Server} httpServer
 * @param {string} corsOrigin
 * @returns {import('socket.io').Server}
 */
export function createSocketServer(httpServer, corsOrigin) {
  _io = new Server(httpServer, {
    cors: {
      origin:  corsOrigin,
      methods: ['GET', 'POST'],
    },
    // Tuned for high-frequency telemetry streaming
    pingTimeout:    60000,
    pingInterval:   25000,
    transports:     ['websocket', 'polling'],
  });

  _io.on('connection', (socket) => {
    const clientId = socket.id;
    const clientIp = socket.handshake.address;

    logger.info('Socket client connected', { clientId, clientIp });

    // Notify client of successful connection
    socket.emit(SOCKET_EVENTS.CLIENT_CONNECTED, {
      clientId,
      message:   'Connected to Spacecraft Mission Ops backend',
      timestamp: new Date().toISOString(),
    });

    // ── Client → Server commands (future bidirectional control) ──
    // Operators can optionally send control commands via socket
    // These are forwarded to the same service layer
    socket.on('mission_command', (data) => {
      logger.info('Socket mission_command received', { clientId, data });
      // Forward to mission service if needed (AI Copilot use case)
      // MissionService[data.action]?.() — gated by auth in future
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket client disconnected', { clientId, reason });
      socket.emit(SOCKET_EVENTS.CLIENT_DISCONNECTED, { clientId });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { clientId, message: err.message });
    });
  });

  logger.info('Socket.io server created', { corsOrigin });

  return _io;
}

/**
 * Return the Socket.io server instance.
 * Used by services that need to emit directly.
 *
 * @returns {import('socket.io').Server|null}
 */
export function getIO() {
  return _io;
}
