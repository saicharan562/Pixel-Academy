import { Router } from 'express';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';

export const meRouter = Router();
meRouter.use(authenticate);

/** GET /me — the current principal + their resolved permission keys. */
meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const user = await prisma.user.findFirst({
      where: { id: principal.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        clientId: true,
        status: true,
        lastLoginAt: true,
        role: { select: { name: true } },
      },
    });
    if (!user) throw notFound();
    res.json({
      user: { ...user, role: user.role.name, lastLoginAt: user.lastLoginAt?.toISOString() ?? null },
      permissions: [...principal.permissions],
    });
  }),
);
