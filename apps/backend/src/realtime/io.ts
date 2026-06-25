import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Realtime gateway (§3.4 WS /realtime). Socket.IO authenticated by the same access
 * JWT. Each user joins a private room `user:<id>` so the server can push targeted
 * notifications (leave decisions, ticket assignment, SLA breaches) in later phases.
 */
let io: IOServer | null = null;

export function initRealtime(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    path: '/realtime',
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace('Bearer ', '') as string | undefined);
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    logger.debug({ userId, socketId: socket.id }, 'Realtime client connected');
    socket.on('disconnect', () => {
      logger.debug({ userId, socketId: socket.id }, 'Realtime client disconnected');
    });
  });

  return io;
}

/** Push an event to a specific user's room. Safe no-op if realtime isn't initialised. */
export function pushToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
