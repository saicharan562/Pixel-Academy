import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ERROR_CODE, type ApiError } from '@pixel/shared';
import { AppError } from '../lib/errors.js';
import { uuid } from '../lib/uuid.js';
import { logger } from '../lib/logger.js';

/** Attach a request id to every request for correlation in error payloads + logs. */
export function requestId(req: Request, _res: Response, next: NextFunction) {
  (req as Request & { id: string }).id =
    (req.headers['x-request-id'] as string) || uuid();
  next();
}

function send(res: Response, status: number, body: ApiError) {
  res.status(status).json(body);
}

/**
 * Centralized error handler. Converts AppError, ZodError, and unknown throwables
 * into the uniform §3.3 contract. Must be registered LAST.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  const requestId = (req as Request & { id?: string }).id ?? 'unknown';

  if (err instanceof AppError) {
    return send(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details, requestId },
    });
  }

  if (err instanceof ZodError) {
    return send(res, 400, {
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.') || '(root)',
          issue: e.message,
        })),
        requestId,
      },
    });
  }

  // Prisma known errors → map the common ones; everything else is a 500.
  const code = (err as { code?: string })?.code;
  if (code === 'P2002') {
    return send(res, 409, {
      error: {
        code: ERROR_CODE.CONFLICT,
        message: 'A record with these unique values already exists',
        requestId,
      },
    });
  }
  if (code === 'P2025') {
    return send(res, 404, {
      error: { code: ERROR_CODE.NOT_FOUND, message: 'Resource not found', requestId },
    });
  }

  logger.error({ err, requestId }, 'Unhandled error');
  return send(res, 500, {
    error: { code: ERROR_CODE.INTERNAL, message: 'Internal server error', requestId },
  });
}
