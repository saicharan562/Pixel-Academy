import type { Prisma } from '@prisma/client';
import type {
  AuthPrincipal, CreateLeaveTypeInput, UpdateLeaveTypeInput, CreateLeaveRequestInput,
  DecideLeaveRequestInput, LeaveListQuery,
} from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable, forbidden } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { inclusiveDays } from '../../lib/workdays.js';
import { writeAudit, writeAuditTx } from '../audit/audit-service.js';
import { notify } from '../notifications/notifications-service.js';

/**
 * Leaves (§ People Ops). Leave types are HR config; requests run pending → approved/rejected
 * with balance accounting. Approving deducts the type's balance for the year; cancelling an
 * approved future leave restores it. Balances are lazily provisioned from the type's annual
 * quota the first time a user touches that type in a year.
 */

const requestSelect = {
  id: true, userId: true, leaveTypeId: true, startDate: true, endDate: true, days: true,
  reason: true, status: true, approverId: true, decidedAt: true, createdAt: true,
  user: { select: { fullName: true } },
  leaveType: { select: { name: true, isPaid: true } },
} as const;

// ── Leave types ──
export async function listLeaveTypes() {
  return prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
}
export async function createLeaveType(principal: AuthPrincipal, input: CreateLeaveTypeInput, ip: string | null) {
  const id = uuidv7();
  const type = await prisma.leaveType.create({ data: { id, name: input.name, annualQuota: String(input.annualQuota), isPaid: input.isPaid } });
  await writeAudit({ actorId: principal.userId, action: 'leave_type.create', entityType: 'leave_type', entityId: id, after: { name: input.name }, ip });
  return type;
}
export async function updateLeaveType(principal: AuthPrincipal, id: string, input: UpdateLeaveTypeInput, ip: string | null) {
  const existing = await prisma.leaveType.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound();
  const type = await prisma.leaveType.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.annualQuota !== undefined ? { annualQuota: String(input.annualQuota) } : {}),
      ...(input.isPaid !== undefined ? { isPaid: input.isPaid } : {}),
    },
  });
  await writeAudit({ actorId: principal.userId, action: 'leave_type.update', entityType: 'leave_type', entityId: id, ip });
  return type;
}

// ── Balances ──
function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}
async function ensureBalance(tx: Prisma.TransactionClient, userId: string, leaveTypeId: string, year: number) {
  const existing = await tx.leaveBalance.findUnique({ where: { uq_balance_user_type_year: { userId, leaveTypeId, year } } });
  if (existing) return existing;
  const type = await tx.leaveType.findUnique({ where: { id: leaveTypeId }, select: { annualQuota: true } });
  if (!type) throw badRequest('Unknown leaveTypeId');
  return tx.leaveBalance.create({
    data: { id: uuidv7(), userId, leaveTypeId, year, allocated: type.annualQuota, used: '0' },
  });
}
export async function listBalances(principal: AuthPrincipal, userId: string | undefined, year: number) {
  const target = principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER ? (userId ?? principal.userId) : principal.userId;
  return prisma.leaveBalance.findMany({
    where: { userId: target, year },
    include: { leaveType: { select: { name: true, isPaid: true } } },
    orderBy: { leaveType: { name: 'asc' } },
  });
}

// ── Requests ──
function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  if (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) return base;
  return { ...base, userId: principal.userId };
}

export async function listLeaveRequests(principal: AuthPrincipal, query: LeaveListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId && (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) ? { userId: query.userId } : {}),
    ...(query.from || query.to
      ? { startDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
  };
  const rows = await prisma.leaveRequest.findMany({ where, select: requestSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function createLeaveRequest(principal: AuthPrincipal, input: CreateLeaveRequestInput, ip: string | null) {
  const days = inclusiveDays(input.startDate, input.endDate);
  if (days <= 0) throw badRequest('Leave must span at least one day');
  const year = yearOf(input.startDate);

  const request = await prisma.$transaction(async (tx) => {
    const balance = await ensureBalance(tx, principal.userId, input.leaveTypeId, year);
    const available = Number(balance.allocated) - Number(balance.used);
    if (days > available) throw unprocessable(`Insufficient leave balance: ${available} day(s) available, ${days} requested`);
    const id = uuidv7();
    const created = await tx.leaveRequest.create({
      data: {
        id, userId: principal.userId, leaveTypeId: input.leaveTypeId,
        startDate: new Date(input.startDate), endDate: new Date(input.endDate),
        days: String(days), reason: input.reason ?? null, status: 'pending',
      },
      select: requestSelect,
    });
    await writeAuditTx(tx, { actorId: principal.userId, action: 'leave.request', entityType: 'leave_request', entityId: id, after: { days, status: 'pending' }, ip });
    return created;
  });

  // Notify approvers (managers + admins).
  const approvers = await prisma.user.findMany({ where: { role: { name: { in: [ROLE.MANAGER, ROLE.ADMIN] } }, deletedAt: null }, select: { id: true } });
  await Promise.all(approvers.map((a) => notify({
    recipientId: a.id, type: 'leave.requested', title: 'Leave request awaiting approval',
    body: `${request.user.fullName} requested ${request.days} day(s) of ${request.leaveType.name}.`,
    entityType: 'leave_request', entityId: request.id,
  })));
  return request;
}

/** Approve / reject a pending request. Approval deducts the balance atomically. */
export async function decideLeaveRequest(principal: AuthPrincipal, id: string, input: DecideLeaveRequestInput, ip: string | null) {
  const request = await prisma.leaveRequest.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true, leaveTypeId: true, startDate: true, days: true } });
  if (!request) throw notFound();
  if (request.status !== 'pending') throw unprocessable(`Cannot decide a ${request.status} request`);
  const year = request.startDate.getUTCFullYear();
  const days = Number(request.days);

  const updated = await prisma.$transaction(async (tx) => {
    if (input.decision === 'approved') {
      const balance = await ensureBalance(tx, request.userId, request.leaveTypeId, year);
      const available = Number(balance.allocated) - Number(balance.used);
      if (days > available) throw unprocessable(`Insufficient balance to approve: ${available} available`);
      await tx.leaveBalance.update({ where: { id: balance.id }, data: { used: String(Number(balance.used) + days) } });
    }
    const res = await tx.leaveRequest.update({
      where: { id },
      data: { status: input.decision, approverId: principal.userId, decidedAt: new Date() },
      select: requestSelect,
    });
    await writeAuditTx(tx, { actorId: principal.userId, action: `leave.${input.decision}`, entityType: 'leave_request', entityId: id, before: { status: 'pending' }, after: { status: input.decision, note: input.note ?? null }, ip });
    return res;
  });

  await notify({
    recipientId: request.userId, type: `leave.${input.decision}`, title: `Leave ${input.decision}`,
    body: `Your ${updated.leaveType.name} request for ${updated.days} day(s) was ${input.decision}.${input.note ? ` Note: ${input.note}` : ''}`,
    entityType: 'leave_request', entityId: id,
  });
  return updated;
}

/** Cancel your own pending/approved request; restores balance if it had been approved. */
export async function cancelLeaveRequest(principal: AuthPrincipal, id: string, ip: string | null) {
  const request = await prisma.leaveRequest.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true, leaveTypeId: true, startDate: true, days: true } });
  if (!request) throw notFound();
  if (request.userId !== principal.userId && principal.role !== ROLE.ADMIN && principal.role !== ROLE.MANAGER) throw forbidden();
  if (request.status !== 'pending' && request.status !== 'approved') throw unprocessable(`Cannot cancel a ${request.status} request`);
  const days = Number(request.days);
  const year = request.startDate.getUTCFullYear();

  const updated = await prisma.$transaction(async (tx) => {
    if (request.status === 'approved') {
      const balance = await tx.leaveBalance.findUnique({ where: { uq_balance_user_type_year: { userId: request.userId, leaveTypeId: request.leaveTypeId, year } } });
      if (balance) await tx.leaveBalance.update({ where: { id: balance.id }, data: { used: String(Math.max(0, Number(balance.used) - days)) } });
    }
    const res = await tx.leaveRequest.update({ where: { id }, data: { status: 'cancelled' }, select: requestSelect });
    await writeAuditTx(tx, { actorId: principal.userId, action: 'leave.cancel', entityType: 'leave_request', entityId: id, before: { status: request.status }, after: { status: 'cancelled' }, ip });
    return res;
  });
  return updated;
}
