import { Router } from 'express';
import { SetRolePermissionsSchema, PERMISSIONS } from '@pixel/shared';
import { asyncHandler, validateBody } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { writeAuditTx } from '../audit/audit-service.js';

export const rolesRouter = Router();
rolesRouter.use(authenticate);

// GET /roles — Admin: roles + their permissions
rolesRouter.get(
  '/',
  requirePermission(PERMISSIONS.ROLE_VIEW),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(
      roles.map((r: { id: string; name: string; description: string | null; isSystem: boolean; permissions: { permission: { key: string } }[] }) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions.map((rp: { permission: { key: string } }) => rp.permission.key),
      })),
    );
  }),
);

// PATCH /roles/:id/permissions — Admin: replace the role's permission set.
// RBAC change ⇒ MANDATORY transactional audit (§6.2).
rolesRouter.patch(
  '/:id/permissions',
  requirePermission(PERMISSIONS.ROLE_EDIT),
  validateBody(SetRolePermissionsSchema),
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const roleId = req.params.id;

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });
    if (!role) throw notFound();

    const before = role.permissions.map((p: { permissionId: string }) => p.permissionId).sort();
    const after = [...new Set(req.body.permissionIds as string[])].sort();

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (after.length > 0) {
        await tx.rolePermission.createMany({
          data: after.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
      await writeAuditTx(tx, {
        actorId: principal.userId,
        action: 'role.permissions.set',
        entityType: 'role',
        entityId: roleId,
        before: { permissionIds: before },
        after: { permissionIds: after },
        ip: req.ip ?? null,
      });
    });

    const updated = await prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    res.json({
      id: updated!.id,
      name: updated!.name,
      permissions: updated!.permissions.map((rp: { permission: { key: string } }) => rp.permission.key),
    });
  }),
);
