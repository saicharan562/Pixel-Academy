import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestId, errorHandler } from './middleware/error.js';
import { authLimiter, globalLimiter } from './middleware/rate-limit.js';
import { authRouter } from './modules/auth/auth-routes.js';
import { usersRouter } from './modules/users/users-routes.js';
import { rolesRouter } from './modules/users/roles-routes.js';
import { meRouter } from './modules/users/me-routes.js';
import { documentsRouter } from './modules/storage/documents-routes.js';
import { clientsRouter } from './modules/clients/clients-routes.js';
import { projectsRouter } from './modules/projects/projects-routes.js';
import { tasksRouter } from './modules/tasks/tasks-routes.js';
import { invoicesRouter } from './modules/invoices/invoices-routes.js';
import { notificationsRouter } from './modules/notifications/notifications-routes.js';

/**
 * Express application assembly. Order matters:
 *   security headers → cors → body parsing → request id → logging → rate limit
 *   → routes → error handler (LAST).
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // behind a proxy/load balancer in prod; needed for req.ip
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use(globalLimiter);

  // Auth routes get the stricter limiter.
  app.use('/auth', authLimiter, authRouter);
  app.use('/me', meRouter);
  app.use('/users', usersRouter);
  app.use('/roles', rolesRouter);
  app.use('/documents', documentsRouter);
  app.use('/clients', clientsRouter);
  app.use('/projects', projectsRouter);
  app.use('/tasks', tasksRouter);
  app.use('/invoices', invoicesRouter);
  app.use('/notifications', notificationsRouter);

  // 404 for unmatched routes → uniform contract via the error handler.
  app.use((req, _res, next) => {
    next(
      Object.assign(new Error('Route not found'), {
        code: 'P2025', // mapped to NOT_FOUND by the handler
      }),
    );
  });

  app.use(errorHandler);
  return app;
}
