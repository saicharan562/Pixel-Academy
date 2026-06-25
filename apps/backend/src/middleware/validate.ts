import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Wrap async handlers so thrown errors reach the error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Validate req.body against a Zod schema, replacing it with the parsed value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

/** Validate req.query against a Zod schema. */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(result.error);
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}
