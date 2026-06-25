import { ERROR_CODE, ERROR_STATUS, type ErrorCode, type ErrorDetail } from '@pixel/shared';

/**
 * AppError — the single way the application signals an expected failure.
 * The error-handler middleware serialises this into the §3.3 contract.
 *
 * IMPORTANT (§3.3): out-of-scope access returns NOT_FOUND (404), never FORBIDDEN,
 * to avoid leaking the existence of records the caller may not see. Use
 * `notFound()` for "exists but you can't see it" as well as "doesn't exist".
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(ERROR_CODE.VALIDATION_ERROR, message, details);

export const unauthorized = (message = 'Authentication required') =>
  new AppError(ERROR_CODE.UNAUTHORIZED, message);

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(ERROR_CODE.FORBIDDEN, message);

export const notFound = (message = 'Resource not found') =>
  new AppError(ERROR_CODE.NOT_FOUND, message);

export const conflict = (message: string, details?: ErrorDetail[]) =>
  new AppError(ERROR_CODE.CONFLICT, message, details);

export const unprocessable = (message: string, details?: ErrorDetail[]) =>
  new AppError(ERROR_CODE.UNPROCESSABLE, message, details);

export const rateLimited = (message = 'Too many requests') =>
  new AppError(ERROR_CODE.RATE_LIMITED, message);

export const internal = (message = 'Internal server error') =>
  new AppError(ERROR_CODE.INTERNAL, message);
