import { PrismaClient } from '@prisma/client';
import {
  ALL_PERMISSION_KEYS,
  ROLE_PERMISSION_SEED,
  ROLES,
} from '@pixel/shared';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

/**
 * Seed — idempotent. Safe to re-run. Establishes the RBAC backbone (permissions,
 * the 4 system roles, their grants), baseline People-Ops config (leave types), a
 * default SLA policy, and one bootstrap Admin.
 *
 * UUID v7 minted inline (seed runs outside the app's lib path).
 */
const prisma = new PrismaClient();

function uuidv7(): string {
  const ms = Date.now();
  const buf = randomBytes(16);
  buf[0] = (ms / 2 ** 40) & 0xff;
  buf[1] = (ms / 2 ** 32) & 0xff;
  buf[2] = (ms / 2 ** 24) & 0xff;
  buf[3] = (ms / 2 ** 16) & 0xff;
  buf[4] = (ms / 2 ** 8) & 0xff;
  buf[5] = ms & 0xff;
  buf[6] = (buf[6] & 0x0f) | 0x70;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function main() {
  // 1. Permissions ----------------------------------------------------------
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { id: uuidv7(), key, description: key },
    });
  }
  const permissions = await prisma.permission.findMany();
  const permByKey = new Map(permissions.map((p) => [p.key, p.id]));

  // 2. Roles ----------------------------------------------------------------
  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { id: uuidv7(), name, isSystem: true, description: `${name} system role` },
    });
  }
  const roles = await prisma.role.findMany();
  const roleByName = new Map(roles.map((r) => [r.name, r.id]));

  // 3. Role → permission grants (replace to stay in sync with the seed map) --
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSION_SEED)) {
    const roleId = roleByName.get(roleName)!;
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: keys
        .map((k) => permByKey.get(k))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  // 4. Leave types ----------------------------------------------------------
  const leaveTypes = [
    { name: 'Casual', annualQuota: 12, isPaid: true },
    { name: 'Sick', annualQuota: 12, isPaid: true },
    { name: 'Earned', annualQuota: 15, isPaid: true },
  ];
  for (const lt of leaveTypes) {
    const existing = await prisma.leaveType.findFirst({ where: { name: lt.name } });
    if (!existing) {
      await prisma.leaveType.create({ data: { id: uuidv7(), ...lt } });
    }
  }

  // 5. Default SLA policies -------------------------------------------------
  const slaDefaults = [
    { name: 'Standard - Low', priority: 'low', firstResponseMins: 480, resolutionMins: 4320 },
    { name: 'Standard - Medium', priority: 'medium', firstResponseMins: 240, resolutionMins: 2880 },
    { name: 'Standard - High', priority: 'high', firstResponseMins: 60, resolutionMins: 1440 },
    { name: 'Standard - Urgent', priority: 'urgent', firstResponseMins: 30, resolutionMins: 480 },
  ];
  for (const s of slaDefaults) {
    const existing = await prisma.slaPolicy.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.slaPolicy.create({ data: { id: uuidv7(), ...s } });
  }

  // 6. Bootstrap Admin ------------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@pixelacademy.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const adminRoleId = roleByName.get('Admin')!;
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        id: uuidv7(),
        email: adminEmail,
        fullName: 'Platform Admin',
        roleId: adminRoleId,
        status: 'active',
        passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✅ Seeded admin: ${adminEmail} / ${adminPassword} (change this!)`);
  }

  // NOTE: No demo/sample data. Every content section (Staff, Clients, Projects, Tasks,
  // Invoices, KB, Tickets, …) starts EMPTY — the seed provisions only the RBAC backbone,
  // baseline config (leave types, SLA policies), and one bootstrap Admin so you can log in.

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete (empty sections — only RBAC, config defaults, and admin login).');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
