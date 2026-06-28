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

    // 7a. Staff + role profiles --------------------------------------------
    const shivaId = uuidv7();
    const sowmyaId = uuidv7();
    await prisma.user.create({ data: { id: shivaId, email: 'shiva@pixelacademy.local', fullName: 'Shiva', roleId: staffRoleId, status: 'active', passwordHash: opsHash } });
    await prisma.user.create({ data: { id: sowmyaId, email: 'sowmya@pixelacademy.local', fullName: 'Sowmya', roleId: staffRoleId, status: 'active', passwordHash: opsHash } });

    await prisma.staffProfile.create({
      data: {
        id: uuidv7(), userId: shivaId, roleTitle: 'Editor / Graphic Designer',
        dailyTasks: [
          'Edit reels, shorts, long-form videos',
          'Organize and manage project files',
          'Create flyers, social media posts, thumbnails, banners, and promotional creatives',
          'Coordinate with Operations Team for content requirements',
          'Deliver approved content before deadlines',
          'Maintain brand consistency across all designs',
        ],
        weeklyTasks: [
          'Complete all assigned video edits before deadlines',
          'Edit and deliver long-form videos',
          'Design all requested flyers and creatives',
          'Create thumbnails for YouTube and webinars',
          'Coordinate with Operations Team for upcoming requirements',
          'Organize project folders and maintain file backups',
          'Implement revisions within agreed timeline',
          'Maintain brand consistency across all content',
          'Provide weekly project status updates',
        ],
        kpis: [
          '95%+ On-Time Delivery Rate',
          'Less than 2 delayed projects per month',
          '100% creative requests completed on time',
          '90%+ approval rate in first review',
          'Zero missed creative requirements',
          '100% file organization compliance',
          'Revisions completed within 24 hours',
          'Brand guideline adherence above 95%',
          'Weekly report submitted on time',
        ],
        deliverables: [
          'Edited Reels', 'Long-form Videos', 'Instagram Flyers', 'YouTube Thumbnails',
          'Social Media Creatives', 'Organized Drive Folders', 'Updated Creative Assets',
          'Branded Marketing Materials', 'Progress Report',
        ],
      },
    });
    await prisma.staffProfile.create({
      data: {
        id: uuidv7(), userId: sowmyaId, roleTitle: 'Operations Team',
        dailyTasks: [
          'Make 100 outbound calls to leads and prospects',
          'Follow up with hot, warm, and old leads',
          'Update CRM and Lead Tracker after every call',
          'Respond to WhatsApp, Instagram, and email inquiries',
          'Coordinate with the Editor/Designer for pending creatives',
          'Collect content requirements from clients/coaches',
          'Ensure content pipeline is maintained at least 10 days ahead',
          'Review daily content scheduled for posting',
          'Schedule and publish posts across all platforms',
          'Follow up with team members on pending tasks and deadlines',
          'Conduct daily team check-ins and task updates',
          'Track project progress and update trackers',
          'Send reminders for webinars, workshops, or events',
          'Handle sales calls and close interested prospects',
          'Follow up on pending payments and invoices',
          'Resolve client queries and support requests',
          'Maintain client communication and provide updates',
          'Check content quality before publishing',
          'Update daily sales and operations reports',
          'Submit end-of-day work summary',
        ],
        weeklyTasks: [
          'Make outbound calls to leads and prospects',
          'Follow up with interested leads',
          'Coordinate with creative team for content requirements',
          'Plan and schedule content at least 10 days in advance',
          'Coordinate with editor, designer, and marketing team',
          'Publish and schedule content across platforms',
          'Track lead inquiries and responses',
          'Handle webinar/event registrations and reminders',
          'Conduct sales calls and close prospects',
          'Maintain CRM and update lead status daily',
          'Manage client communication and updates',
          'Prepare weekly performance reports',
        ],
        kpis: [
          '100 calls per day',
          '90% follow-ups completed on time',
          'Zero content delays due to coordination gaps',
          'Maintain 10-day content buffer',
          'Daily task completion rate above 95%',
          '100% scheduled posts published on time',
          'Response time under 2 hours',
          '90% reminder completion rate',
          'Monthly sales target achievement',
          '100% CRM accuracy',
          'Client satisfaction score above 90%',
          'Reports submitted on time',
        ],
        deliverables: [
          'Call Reports', 'Follow-up Tracker', 'Content Request Tracker', 'Content Calendar',
          'Team Coordination Updates', 'Published Content', 'Lead Management Report',
          'Registration Reports', 'Closed Sales', 'Updated CRM', 'Client Update Reports',
          'Weekly Operations Report',
        ],
      },
    });

    // 7b. Clients (each client tab in the sheet → a Client) ----------------
    const addr = (city: string) => ({ line1: '—', city, state: 'India', pincode: '000000' });
    const maniId = uuidv7();
    const aravindId = uuidv7();
    const komalId = uuidv7();
    const kitchenId = uuidv7();
    await prisma.client.create({ data: { id: maniId, legalName: 'Dr. Mani Pavitra', displayName: 'Dr. Mani Pavitra', stateCode: '37', billingAddress: addr('—'), status: 'active' } });
    await prisma.client.create({ data: { id: aravindId, legalName: 'Dr. Aravind', displayName: 'Dr. Aravind', stateCode: '37', billingAddress: addr('—'), status: 'active' } });
    await prisma.client.create({ data: { id: komalId, legalName: 'Komal Krishna', displayName: 'Komal (Stablegains)', stateCode: '37', billingAddress: addr('—'), status: 'active' } });
    await prisma.client.create({
      data: {
        id: kitchenId, legalName: "Mulpuri's Kitchen", displayName: "Mulpuri's Kitchen", stateCode: '37',
        billingAddress: addr('—'), phone: '9908128700', status: 'prospect',
        contacts: { create: [{ id: uuidv7(), name: 'Usha (manager)', phone: '9908128700', isPrimary: true }] },
      },
    });

    // 7c. Service price list — the agency's standard rate card (Dr. Mani tab) -
    const services = [
      { name: 'Reels Editing', min: '800', max: '1000', unit: 'Per Reel' },
      { name: 'Long Form Video Editing', min: '1500', max: null, unit: 'Per Video' },
      { name: 'Ad Video Editing', min: '1500', max: null, unit: 'Per Video' },
      { name: 'Creative Design', min: '200', max: null, unit: 'Per Creative' },
      { name: 'Shoot with Phone', min: '3000', max: null, unit: 'Per Shoot' },
      { name: 'Shoot with Camera', min: '5000', max: null, unit: 'Per Shoot' },
    ];
    for (const s of services) {
      await prisma.service.create({ data: { id: uuidv7(), name: s.name, priceMinInr: s.min, priceMaxInr: s.max, unit: s.unit } });
    }

    // 7d. Work / billing tracker — each tab's items, attached to its client -
    const S = { 'Not Started': 'not_started', Progress: 'in_progress', Completed: 'completed' } as const;
    type Src = keyof typeof S;
    const clientOf = { mani: maniId, aravind: aravindId, komal: komalId } as const;
    type ClientKey = keyof typeof clientOf;
    const work: Array<{ client: ClientKey; cat?: string; title: string; st: Src; notes?: string; price?: string; qty?: string; bill?: string; adv?: string }> = [
      // ── Dr. Mani Pavitra ──
      { client: 'mani', title: 'Jashan video edit', st: 'Not Started' },
      { client: 'mani', title: 'Mam Ad videos Edit', st: 'Not Started' },
      { client: 'mani', title: 'VCB Reels Edit', st: 'Not Started' },
      // ── Dr. Aravind — Video Production & Edit ──
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Testimonials cut from zoom videos', st: 'Completed', notes: 'done - 13', qty: '13', bill: 'Monthly' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Ad Video Editing', st: 'Completed', qty: '25', bill: 'Per Video' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Testimonial Mashup Edit', st: 'Not Started', bill: 'Project Based' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Testimonial Separate Edit', st: 'Progress', bill: 'Project Based' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Winning Ad edit (Changed to DHMP 7 days free)', st: 'Completed', qty: '1' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'WhatsApp Reminders', st: 'Progress', notes: 'yet to get approval', bill: 'Monthly' },
      { client: 'aravind', cat: 'Video Production & Edit', title: 'Intro Videos', st: 'Not Started' },
      // ── Dr. Aravind — Automations ──
      { client: 'aravind', cat: 'Automations', title: 'Email Broadcast - 7 day DHMP free classes', st: 'Completed', notes: '3 mails sent', qty: '3', bill: 'Monthly' },
      { client: 'aravind', cat: 'Automations', title: '7 Day DHMP Workflow Setup', st: 'Not Started', bill: 'One Time' },
      { client: 'aravind', cat: 'Automations', title: 'DHMP EMAILS Draft', st: 'Completed', notes: 'Add link here', qty: 'no', bill: 'Per Email' },
      { client: 'aravind', cat: 'Automations', title: 'DHMP Leads Automation', st: 'Completed' },
      { client: 'aravind', cat: 'Automations', title: '4D HMM Lead Automation', st: 'Completed' },
      { client: 'aravind', cat: 'Automations', title: 'Zoom Attendence', st: 'Completed' },
      // ── Dr. Aravind — TagMango ──
      { client: 'aravind', cat: 'TagMango', title: 'TagMango Engagement Plan', st: 'Progress', notes: 'content, editing, posting, comment replies', bill: 'Monthly' },
      { client: 'aravind', cat: 'TagMango', title: 'Flyer Designs', st: 'Progress', bill: 'Per Design' },
      { client: 'aravind', cat: 'TagMango', title: 'Comments Replies', st: 'Progress', bill: 'Per Video' },
      // ── Dr. Aravind — Social Media ──
      { client: 'aravind', cat: 'Social Media', title: 'TagMango Flyer Design', st: 'Completed', price: '55000', bill: 'Per Design' },
      { client: 'aravind', cat: 'Social Media', title: 'Comments Automation', st: 'Completed', bill: 'One Time' },
      { client: 'aravind', cat: 'Social Media', title: 'Scripts (Ads/Reels/YouTube)', st: 'Completed', bill: 'Monthly', adv: '10k advance paid May' },
      { client: 'aravind', cat: 'Social Media', title: 'Carousel/Flyers Designs', st: 'Completed', qty: '10/15', bill: 'Per Carousel' },
      { client: 'aravind', cat: 'Social Media', title: 'Reels Cover Design', st: 'Completed', qty: '15', bill: 'Per Cover' },
      { client: 'aravind', cat: 'Social Media', title: 'IG Reels', st: 'Completed', qty: '15', bill: 'Monthly' },
      { client: 'aravind', cat: 'Social Media', title: 'IG Stories', st: 'Completed', qty: '31', bill: 'Monthly' },
      { client: 'aravind', cat: 'Social Media', title: 'Testimonials reels', st: 'Completed', qty: '7' },
      { client: 'aravind', cat: 'Social Media', title: 'YouTube Videos', st: 'Completed', qty: '3/10', bill: 'Monthly' },
      { client: 'aravind', cat: 'Social Media', title: 'Strategy Sessions', st: 'Not Started', qty: '4', bill: 'Monthly' },
      { client: 'aravind', cat: 'Social Media', title: 'Shoot', st: 'Completed', qty: '1' },
      { client: 'aravind', cat: 'Social Media', title: 'AI Videos', st: 'Not Started', bill: 'Per Video' },
      // ── Komal (Stablegains) — scope / proposal ──
      { client: 'komal', title: 'Shoot with Camera', st: 'Not Started', price: '8000', bill: 'Per Visit' },
      { client: 'komal', title: 'Scripting', st: 'Not Started', price: '0', bill: 'Included' },
      { client: 'komal', title: 'Reel Editing', st: 'Not Started', notes: '₹800 – ₹1,000', bill: 'Per Reel' },
      { client: 'komal', title: 'Ad Video Editing', st: 'Not Started', price: '1500', bill: 'Per Video' },
      { client: 'komal', title: 'Telecalling', st: 'Not Started', price: '10000', bill: 'Monthly', adv: '12000 - June 17th' },
      { client: 'komal', title: 'Customer Support', st: 'Not Started', price: '12000', bill: 'Monthly' },
      { client: 'komal', title: 'Email Marketing', st: 'Not Started', price: '500', bill: 'Per Email' },
      { client: 'komal', title: 'Pain points', st: 'Progress' },
    ];
    for (const w of work) {
      await prisma.workItem.create({
        data: {
          id: uuidv7(), clientId: clientOf[w.client], category: w.cat ?? null, title: w.title, status: S[w.st],
          notes: w.notes ?? null, priceInr: w.price ?? null, quantity: w.qty ?? null, billingType: w.bill ?? null, advanceNote: w.adv ?? null,
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
    console.log('✅ Seeded ops data: 2 staff, 4 clients, 6 services, 38 work items, 3 tool costs, 2 salaries. Staff pw: Pixel@2026');
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
