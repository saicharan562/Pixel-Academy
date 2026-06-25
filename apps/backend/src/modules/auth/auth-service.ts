import { createHash, randomBytes } from 'node:crypto';
import type { LoginResponse, UserDto, Role } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { env } from '../../config/env.js';
import { unauthorized, badRequest } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { signAccessToken } from './jwt.js';
import {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} from './token-service.js';

function toUserDto(u: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  clientId: string | null;
  status: string;
  lastLoginAt: Date | null;
  role: { name: string };
}): UserDto {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role.name as Role,
    clientId: u.clientId,
    status: u.status,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: { role: true },
  });

  // Constant-ish work even on missing user to blunt enumeration timing.
  if (!user) {
    await verifyPassword(
      '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$0000000000000000000000000000000000000000000',
      password,
    );
    throw unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') throw unauthorized('Account suspended');

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw unauthorized('Invalid email or password');

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role.name as Role,
    clientId: user.clientId,
    email: user.email,
  });
  const refreshToken = await issueRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { accessToken, refreshToken, user: toUserDto(user) };
}

export async function refresh(rawRefresh: string) {
  const { userId, refreshToken } = await rotateRefreshToken(rawRefresh);
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { role: true },
  });
  if (!user || user.status === 'suspended') throw unauthorized('Account not active');

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role.name as Role,
    clientId: user.clientId,
    email: user.email,
  });
  return { accessToken, refreshToken };
}

export async function logout(rawRefresh: string) {
  await revokeRefreshToken(rawRefresh);
}

/**
 * Forgot-password: always returns success (no account enumeration). If the email
 * exists, mint a single-use reset token (hashed at rest) with a short TTL.
 * The raw token is returned here for the caller (email worker) to deliver; it is
 * never logged.
 */
export async function createPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) return null;

  const raw = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MIN * 60 * 1000);

  // Reuse the refresh_tokens table shape would be wrong; store as a dedicated
  // short-lived row. For Phase 0 we encode resets as refresh tokens with a marker
  // prefix is avoided — instead we keep a minimal in-table convention:
  // (a real deployment may add a password_resets table; kept lean here.)
  await prisma.refreshToken.create({
    data: {
      id: uuidv7(),
      userId: user.id,
      tokenHash: `pwreset:${tokenHash}`,
      expiresAt,
    },
  });

  return raw;
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = `pwreset:${createHash('sha256').update(rawToken).digest('hex')}`;
  const row = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null },
  });
  if (!row || row.expiresAt < new Date()) throw badRequest('Invalid or expired reset token');

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  });
  // Invalidate all existing sessions after a password change.
  await revokeAllForUser(row.userId);
}
