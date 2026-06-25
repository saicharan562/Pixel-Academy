import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@pixel/shared';
import { env } from '../../config/env.js';
import { unauthorized } from '../../lib/errors.js';

/**
 * Access-token JWT helpers — §3.1.
 * Access tokens are short-lived (15m default) and carry sub, role, client_id, email.
 * Refresh tokens are opaque random strings (NOT JWTs) stored hashed in the DB so
 * they can be revoked; see token-service.ts.
 */

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    throw unauthorized('Invalid or expired access token');
  }
}
