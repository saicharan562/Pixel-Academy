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

  // 7. Real ops data (from the Pixel Academy ops tracker) -------------------
  // Idempotent: keyed off the Shiva staff record. Re-running won't duplicate.
  const opsExists = await prisma.user.findFirst({ where: { email: 'shiva@pixelacademy.local' } });
  if (!opsExists) {
    const opsHash = await argon2.hash('Pixel@2026', { type: argon2.argon2id });
    const staffRoleId = roleByName.get('Staff')!;
    const adminUser = await prisma.user.findFirst({ where: { email: adminEmail }, select: { id: true } });

    // 7a. Staff -------------------------------------------------------------
    const shivaId = uuidv7();
    const sowmyaId = uuidv7();
    await prisma.user.create({ data: { id: shivaId, email: 'shiva@pixelacademy.local', fullName: 'Shiva (Editor / Graphic Designer)', roleId: staffRoleId, status: 'active', passwordHash: opsHash } });
    await prisma.user.create({ data: { id: sowmyaId, email: 'sowmya@pixelacademy.local', fullName: 'Sowmya (Operations Team)', roleId: staffRoleId, status: 'active', passwordHash: opsHash } });

    // 7b. Client (from the hiring note) -------------------------------------
    const kitchenId = uuidv7();
    await prisma.client.create({
      data: {
        id: kitchenId, legalName: "Mulpuri's Kitchen", displayName: "Mulpuri's Kitchen", stateCode: '37',
        billingAddress: { line1: '—', city: '—', state: 'Andhra Pradesh', pincode: '520001' },
        phone: '9908128700', status: 'active',
        contacts: { create: [{ id: uuidv7(), name: 'Usha', phone: '9908128700', isPrimary: true }] },
      },
    });

    // 7c. Service price list (rate card) ------------------------------------
    const services = [
      { name: 'Reels Editing', min: '800', max: '1000', unit: 'Per Reel' },
      { name: 'Long Form Video Editing', min: '1500', max: null, unit: 'Per Video' },
      { name: 'Ad Video Editing', min: '1500', max: null, unit: 'Per Video' },
      { name: 'Creative Design', min: '200', max: null, unit: 'Per Creative' },
      { name: 'Shoot with Phone', min: '3000', max: null, unit: 'Per Shoot' },
      { name: 'Shoot with Camera (studio)', min: '5000', max: null, unit: 'Per Shoot' },
      { name: 'Shoot with Camera (on-site)', min: '8000', max: null, unit: 'Per Visit' },
      { name: 'Scripting', min: '0', max: null, unit: 'Included' },
      { name: 'Telecalling', min: '10000', max: null, unit: 'Monthly' },
      { name: 'Customer Support', min: '12000', max: null, unit: 'Monthly' },
      { name: 'Email Marketing', min: '500', max: null, unit: 'Per Email' },
    ];
    for (const s of services) {
      await prisma.service.create({ data: { id: uuidv7(), name: s.name, priceMinInr: s.min, priceMaxInr: s.max, unit: s.unit } });
    }

    // 7d. Work / billing tracker -------------------------------------------
    const S = { 'Not Started': 'not_started', Progress: 'in_progress', Completed: 'completed' } as const;
    type Src = keyof typeof S;
    const work: Array<{ cat?: string; title: string; st: Src; notes?: string; price?: string; qty?: string; bill?: string; adv?: string }> = [
      // Quick tasks
      { title: 'Jashan video edit', st: 'Not Started' },
      { title: 'Mam Ad videos Edit', st: 'Not Started' },
      { title: 'VCB Reels Edit', st: 'Not Started' },
      // Video production & Edit
      { cat: 'Video Production & Edit', title: 'Testimonials cut from zoom videos', st: 'Completed', notes: 'done - 13', qty: '13', bill: 'Monthly' },
      { cat: 'Video Production & Edit', title: 'Ad Video Editing', st: 'Completed', qty: '25', bill: 'Per Video' },
      { cat: 'Video Production & Edit', title: 'Testimonial Mashup Edit', st: 'Not Started', bill: 'Project Based' },
      { cat: 'Video Production & Edit', title: 'Testimonial Separate Edit', st: 'Progress', bill: 'Project Based' },
      { cat: 'Video Production & Edit', title: 'Winning Ad edit (Changed to DHMP 7 days free)', st: 'Completed', qty: '1' },
      { cat: 'Video Production & Edit', title: 'WhatsApp Reminders', st: 'Progress', notes: 'yet to get approval', bill: 'Monthly' },
      { cat: 'Video Production & Edit', title: 'Intro Videos', st: 'Not Started' },
      // Automations
      { cat: 'Automations', title: 'Email Broadcast - 7 day DHMP free classes', st: 'Completed', notes: '3 mails sent', qty: '3', bill: 'Monthly' },
      { cat: 'Automations', title: '7 Day DHMP Workflow Setup', st: 'Not Started', bill: 'One Time' },
      { cat: 'Automations', title: 'DHMP EMAILS Draft', st: 'Completed', notes: 'Add link here', qty: 'no', bill: 'Per Email' },
      { cat: 'Automations', title: 'DHMP Leads Automation', st: 'Completed' },
      { cat: 'Automations', title: '4D HMM Lead Automation', st: 'Completed' },
      { cat: 'Automations', title: 'Zoom Attendence', st: 'Completed' },
      // TagMango
      { cat: 'TagMango', title: 'TagMango Engagement Plan', st: 'Progress', notes: 'content, editing, posting, comment replies', bill: 'Monthly' },
      { cat: 'TagMango', title: 'Flyer Designs', st: 'Progress', bill: 'Per Design' },
      { cat: 'TagMango', title: 'Comments Replies', st: 'Progress', bill: 'Per Video' },
      // Social media
      { cat: 'Social Media', title: 'TagMango Flyer Design', st: 'Completed', price: '55000', bill: 'Per Design' },
      { cat: 'Social Media', title: 'Comments Automation', st: 'Completed', bill: 'One Time' },
      { cat: 'Social Media', title: 'Scripts (Ads/Reels/YouTube)', st: 'Completed', bill: 'Monthly', adv: '10k advance paid May' },
      { cat: 'Social Media', title: 'Carousel/Flyers Designs', st: 'Completed', qty: '10/15', bill: 'Per Carousel' },
      { cat: 'Social Media', title: 'Reels Cover Design', st: 'Completed', qty: '15', bill: 'Per Cover' },
      { cat: 'Social Media', title: 'IG Reels', st: 'Completed', qty: '15', bill: 'Monthly' },
      { cat: 'Social Media', title: 'IG Stories', st: 'Completed', qty: '31', bill: 'Monthly' },
      { cat: 'Social Media', title: 'Testimonials reels', st: 'Completed', qty: '7' },
      { cat: 'Social Media', title: 'YouTube Videos', st: 'Completed', qty: '3/10', bill: 'Monthly' },
      { cat: 'Social Media', title: 'Strategy Sessions', st: 'Not Started', qty: '4', bill: 'Monthly' },
      { cat: 'Social Media', title: 'Shoot', st: 'Completed', qty: '1' },
      { cat: 'Social Media', title: 'AI Videos', st: 'Not Started', bill: 'Per Video' },
      // Proposal / scope (last tracker)
      { cat: 'Proposal', title: 'Shoot with Camera', st: 'Not Started', price: '8000', bill: 'Per Visit' },
      { cat: 'Proposal', title: 'Scripting', st: 'Not Started', price: '0', bill: 'Included' },
      { cat: 'Proposal', title: 'Reel Editing', st: 'Not Started', notes: '₹800 – ₹1,000', bill: 'Per Reel' },
      { cat: 'Proposal', title: 'Ad Video Editing', st: 'Not Started', price: '1500', bill: 'Per Video' },
      { cat: 'Proposal', title: 'Telecalling', st: 'Not Started', price: '10000', bill: 'Monthly', adv: '12000 - June 17th' },
      { cat: 'Proposal', title: 'Customer Support', st: 'Not Started', price: '12000', bill: 'Monthly' },
      { cat: 'Proposal', title: 'Email Marketing', st: 'Not Started', price: '500', bill: 'Per Email' },
      { cat: 'Proposal', title: 'Pain points', st: 'Progress' },
    ];
    for (const w of work) {
      await prisma.workItem.create({
        data: {
          id: uuidv7(), category: w.cat ?? null, title: w.title, status: S[w.st], notes: w.notes ?? null,
          priceInr: w.price ?? null, quantity: w.qty ?? null, billingType: w.bill ?? null, advanceNote: w.adv ?? null,
        },
      });
    }

    // 7e. Tools (recurring SaaS costs) → expenses --------------------------
    if (adminUser) {
      for (const t of [{ name: 'Hygen', amt: '3000' }, { name: 'Kalakar', amt: '800' }, { name: 'Zoom', amt: '500' }]) {
        await prisma.expense.create({
          data: { id: uuidv7(), userId: adminUser.id, category: `Tools — ${t.name}`, amountInr: t.amt, spentOn: new Date(), status: 'approved', approverId: adminUser.id },
        });
      }
    }

    // 7f. Salaries (June) ---------------------------------------------------
    await prisma.salaryRecord.create({ data: { id: uuidv7(), month: '2026-06', userId: shivaId, salaryInr: '10000', netSalaryInr: '10000' } });
    await prisma.salaryRecord.create({ data: { id: uuidv7(), month: '2026-06', userId: sowmyaId, salaryInr: '15000', netSalaryInr: '15000' } });

    // eslint-disable-next-line no-console
    console.log('✅ Seeded ops data: 2 staff, 1 client, 11 services, 38 work items, 3 tool costs, 2 salaries. Staff pw: Pixel@2026');
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
