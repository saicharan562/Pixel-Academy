import type { NextFunction, Request, Response } from 'express';
import type { AuthPrincipal, PermissionKey, Role } from '@pixel/shared';
import { verifyAccessToken } from '../modules/auth/jwt.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';

/** Express request augmented with the authenticated principal. */
export interface AuthedRequest extends Request {
  id: string;
  principal: AuthPrincipal;
}

/**
 * Authentication middleware.
 * Verifies the bearer access token, then loads the role's permission set so the
 * downstream RBAC layer can check capabilities. Permissions are resolved per-request
 * from the DB (the role/permission tables are configurable per §2.1, so we must not
 * bake them into the JWT — an admin permission change takes effect on next request).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized('Missing bearer token');

    const payload = verifyAccessToken(header.slice('Bearer '.length));

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user || user.status === 'suspended') {
      throw unauthorized('Account is not active');
    }

    const permissions = new Set<PermissionKey>(
      user.role.permissions.map((rp: { permission: { key: string } }) => rp.permission.key as PermissionKey),
    );

    const principal: AuthPrincipal = {
      userId: user.id,
      role: user.role.name as Role,
      clientId: user.clientId,
      email: user.email,
      permissions,
    };

    (req as AuthedRequest).principal = principal;
    next();
  } catch (err) {
    next(err);
  }
}
