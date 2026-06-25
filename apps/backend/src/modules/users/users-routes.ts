import { Router } from 'express';
import {
  CreateUserSchema,
  UpdateUserSchema,
  PaginationSchema,
  PERMISSIONS,
  ROLE,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission, assertSelfOrAdmin, isAdmin } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { hashPassword } from '../auth/password.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../audit/audit-service.js';
import { randomBytes } from 'node:crypto';

export const usersRouter = Router();
usersRouter.use(authenticate);

const publicUser = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  clientId: true,
  status: true,
  lastLoginAt: true,
  role: { select: { name: true } },
} as const;

// GET /users — Admin, Manager (Manager scope: team; narrowed here to non-client users)
usersRouter.get(
  '/',
  requirePermission(PERMISSIONS.USER_VIEW),
  validateQuery(PaginationSchema),
  asyncHandler(async (req, res) => {
    const { limit, cursor } = (req as AuthedRequest & { validatedQuery: { limit: number; cursor?: string } }).validatedQuery;
    const principal = (req as AuthedRequest).principal;

    // Managers see internal users only (not other clients' portal logins).
    const where = isAdmin(principal.role)
      ? { deletedAt: null }
      : { deletedAt: null, role: { name: { not: ROLE.CLIENT } } };

    const rows = await prisma.user.findMany({
      where,
      select: publicUser,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    res.json({
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
    });
  }),
);

// POST /users — Admin only (invite flow)
usersRouter.post(
  '/',
  requirePermission(PERMISSIONS.USER_CREATE),
  validateBody(CreateUserSchema),
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const { email, fullName, roleId, clientId, phone } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw badRequest('Unknown role');

    // Enforce the client_id ⇔ role=Client invariant (§2.3 users constraint).
    if (role.name === ROLE.CLIENT && !clientId) {
      throw badRequest('clientId is required for Client-role users');
    }
    if (role.name !== ROLE.CLIENT && clientId) {
      throw badRequest('clientId may only be set for Client-role users');
    }

    // Invited users get a random unusable password until they set one via reset.
    const tempPassword = randomBytes(24).toString('base64url');
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        id: uuidv7(),
        email,
        fullName,
        phone: phone ?? null,
        roleId,
        clientId: clientId ?? null,
        status: 'invited',
        passwordHash,
      },
      select: publicUser,
    });

    await writeAudit({
      actorId: principal.userId,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      after: { email, roleId, clientId: clientId ?? null },
      ip: req.ip ?? null,
    });

    res.status(201).json(user);
  }),
);

// PATCH /users/:id — Admin (any) or self (limited fields)
usersRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.USER_EDIT),
  validateBody(UpdateUserSchema),
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const target = await prisma.user.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { role: true },
    });
    if (!target) throw notFound();

    // Scope (layer 2): self or admin.
    assertSelfOrAdmin(req as AuthedRequest, target.id);

    const body = req.body as Record<string, unknown>;

    // Non-admins (editing self) may only change name/phone — never role or status.
    if (!isAdmin(principal.role)) {
      if ('roleId' in body || 'status' in body) {
        throw badRequest('You may only update your own name and phone');
      }
    }

    const before = { fullName: target.fullName, phone: target.phone, status: target.status, roleId: target.roleId };
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: body,
      select: publicUser,
    });

    await writeAudit({
      actorId: principal.userId,
      action: 'user.update',
      entityType: 'user',
      entityId: target.id,
      before,
      after: body as never,
      ip: req.ip ?? null,
    });

    res.json(updated);
  }),
);
