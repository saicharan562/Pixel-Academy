import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { env } from '../../config/env.js';
import { unauthorized } from '../../lib/errors.js';

/**
 * Refresh-token service — §3.1 rotating refresh tokens with reuse detection.
 *
 * - Refresh tokens are opaque 256-bit random strings. Only their SHA-256 hash is
 *   stored, so a DB leak does not expose usable tokens.
 * - On every refresh, the presented token is revoked and a new one issued (rotation).
 * - REUSE DETECTION: if a token that is already revoked is presented, we treat it as
 *   theft and revoke ALL of that user's refresh tokens, forcing re-login everywhere.
 */

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

function newRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = newRawToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { id: uuidv7(), userId, tokenHash: hash(raw), expiresAt },
  });
  return raw;
}

/**
 * Rotate: validate the presented refresh token, revoke it, and issue a fresh one.
 * Returns the userId on success.
 */
export async function rotateRefreshToken(
  raw: string,
): Promise<{ userId: string; refreshToken: string }> {
  const tokenHash = hash(raw);
  const existing = await prisma.refreshToken.findFirst({ where: { tokenHash } });

  if (!existing) throw unauthorized('Invalid refresh token');

  // Reuse detection: a revoked token being presented again ⇒ compromise.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Refresh token reuse detected; all sessions revoked');
  }

  if (existing.expiresAt < new Date()) throw unauthorized('Refresh token expired');

  // Rotate atomically: revoke old, mint new.
  const refreshToken = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const raw2 = newRawToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await tx.refreshToken.create({
      data: { id: uuidv7(), userId: existing.userId, tokenHash: hash(raw2), expiresAt },
    });
    return raw2;
  });

  return { userId: existing.userId, refreshToken };
}

/** Revoke a single token (logout). Idempotent. */
export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active token for a user (e.g. password reset, admin suspend). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
