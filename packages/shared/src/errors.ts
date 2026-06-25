/**
 * Uniform error contract — §3.3.
 * Every non-2xx response from the API uses this shape.
 */

export const ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR', // 400
  UNAUTHORIZED: 'UNAUTHORIZED', // 401
  FORBIDDEN: 'FORBIDDEN', // 403
  NOT_FOUND: 'NOT_FOUND', // 404 (also out-of-scope, to avoid leaking existence)
  CONFLICT: 'CONFLICT', // 409
  RATE_LIMITED: 'RATE_LIMITED', // 429
  UNPROCESSABLE: 'UNPROCESSABLE', // 422 business-rule
  INTERNAL: 'INTERNAL', // 500
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export interface ErrorDetail {
  field: string;
  issue: string;
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};
