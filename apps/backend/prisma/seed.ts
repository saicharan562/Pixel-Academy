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

  // 7. Demo data (idempotent) ----------------------------------------------
  // A realistic Indian agency slice so a fresh clone is demo-ready end-to-end.
  const demoMarker = 'Stablegains Financial Services LLP';
  const demoExists = await prisma.client.findFirst({ where: { legalName: demoMarker } });
  if (!demoExists) {
    const demoHash = await argon2.hash('Demo!2026pixel', { type: argon2.argon2id });
    const managerRoleId = roleByName.get('Manager')!;
    const staffRoleId = roleByName.get('Staff')!;
    const clientRoleId = roleByName.get('Client')!;

    const managerId = uuidv7();
    const staffId = uuidv7();
    await prisma.user.create({ data: { id: managerId, email: 'priya@pixelacademy.local', fullName: 'Priya Nair', roleId: managerRoleId, status: 'active', passwordHash: demoHash, phone: '+919900000001' } });
    await prisma.user.create({ data: { id: staffId, email: 'rahul@pixelacademy.local', fullName: 'Rahul Verma', roleId: staffRoleId, status: 'active', passwordHash: demoHash, phone: '+919900000002' } });

    // Clients: one intra-state (37 = AP, same as supplier) and one inter-state (29 = KA).
    const client1Id = uuidv7();
    await prisma.client.create({
      data: {
        id: client1Id, legalName: demoMarker, displayName: 'Stablegains', gstin: '37AABCS1234E1Z9', stateCode: '37',
        billingAddress: { line1: '4-12 Fintech Park', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520010' },
        email: 'ops@stablegains.in', phone: '+919812345678', ownerUserId: managerId, status: 'active',
      },
    });
    const client2Id = uuidv7();
    await prisma.client.create({
      data: {
        id: client2Id, legalName: 'HabbFit Wellness Pvt Ltd', displayName: 'HabbFit', gstin: '29AAFCH9876K1Z2', stateCode: '29',
        billingAddress: { line1: '88 Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
        email: 'team@habbfit.com', phone: '+919845612300', ownerUserId: managerId, status: 'active',
      },
    });
    // A client-portal login for Stablegains.
    await prisma.user.create({ data: { id: uuidv7(), email: 'komal@stablegains.in', fullName: 'Komal Krishna', roleId: clientRoleId, clientId: client1Id, status: 'active', passwordHash: demoHash } });

    // Webinar delivery project.
    const projectId = uuidv7();
    await prisma.project.create({
      data: {
        id: projectId, clientId: client1Id, name: 'Home Loan EMI Freedom — Webinar Funnel', code: 'STG-WEB-01',
        status: 'active', managerId, budgetInr: '250000.00', startDate: new Date('2026-06-01'),
        members: { create: [{ userId: staffId, roleInProject: 'Producer' }] },
      },
    });
    for (const [i, t] of [
      { title: 'Build registration landing page', status: 'in_progress', priority: 'high' },
      { title: 'Set up webinar email sequence (7 mails)', status: 'todo', priority: 'medium' },
      { title: 'Design slide deck + offer stack', status: 'review', priority: 'high' },
    ].entries()) {
      await prisma.task.create({ data: { id: uuidv7(), projectId, title: t.title, status: t.status, priority: t.priority, assigneeId: staffId, dueDate: new Date(`2026-06-${15 + i}`) } });
    }

    // Issued GST invoice (intra-state 18% → CGST+SGST) with a partial payment.
    const invoiceId = uuidv7();
    await prisma.invoice.create({
      data: {
        id: invoiceId, invoiceNo: 'PA/2026-27/0001', clientId: client1Id, projectId,
        issueDate: new Date('2026-06-05'), dueDate: new Date('2026-06-20'), placeOfSupply: '37', supplyType: 'intra_state',
        subtotalInr: '200000.00', cgstInr: '18000.00', sgstInr: '18000.00', igstInr: '0.00', totalInr: '236000.00',
        status: 'partially_paid', notes: 'Phase 1 — funnel build & first cohort.',
        lineItems: { create: [
          { id: uuidv7(), description: 'Webinar funnel build (landing, emails, automation)', hsnSac: '998314', quantity: '1', unitPriceInr: '200000.00', taxableValueInr: '200000.00', gstRate: '18', cgstInr: '18000.00', sgstInr: '18000.00', igstInr: '0.00' },
        ] },
        payments: { create: [{ id: uuidv7(), amountInr: '118000.00', paidAt: new Date('2026-06-08'), method: 'upi', reference: 'UPI/AX12CD34' }] },
      },
    });

    // A published KB article so the AI assistant has something to ground on.
    await prisma.kbDocument.create({
      data: {
        id: uuidv7(), title: 'How to set up a high-converting webinar funnel', category: 'Playbooks', status: 'draft', audience: 'internal',
        bodyMd: 'A webinar funnel has three stages: registration, show-up, and offer. Drive registrations with a benefit-led landing page and WhatsApp reminders. Maximise show-up with a 3-touch reminder sequence (24h, 1h, live). Convert with a clear offer stack and a deadline. Track registration rate, show-up rate, and offer conversion as the three core metrics.',
      },
    });

    // An open support ticket.
    await prisma.ticket.create({
      data: {
        id: uuidv7(), ticketNo: 'TKT-00001', clientId: client1Id, createdBy: managerId, assigneeId: staffId,
        subject: 'WhatsApp reminders not sending for Cohort 2', priority: 'high', status: 'open',
        firstResponseDueAt: new Date('2026-06-25T12:00:00Z'), resolutionDueAt: new Date('2026-06-26T12:00:00Z'),
      },
    });

    // eslint-disable-next-line no-console
    console.log('✅ Seeded demo data (2 clients, project, invoice, KB, ticket). Demo login pw: Demo!2026pixel');
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
