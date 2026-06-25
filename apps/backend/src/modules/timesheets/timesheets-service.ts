import type {
  AuthPrincipal, CreateTimesheetInput, UpdateTimesheetInput, TimesheetListQuery, DecideTimesheetInput,
} from '@pixel/shared';
import { ROLE, TIMESHEET_TRANSITIONS } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable, forbidden } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit } from '../audit/audit-service.js';
import { notify } from '../notifications/notifications-service.js';

/**
 * Timesheets (§ Revenue depth). Staff log time against a task/project, then submit for
 * approval. Status follows TIMESHEET_TRANSITIONS (draft → submitted → approved/rejected).
 * Edits and deletes are only legal while a row is in draft (or rejected, back to draft).
 */

const tsSelect = {
  id: true, userId: true, taskId: true, projectId: true, workDate: true, minutes: true, note: true,
  status: true, createdAt: true, updatedAt: true,
  user: { select: { fullName: true } },
  project: { select: { name: true } },
  task: { select: { title: true } },
} as const;

function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  if (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) return base;
  return { ...base, userId: principal.userId };
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const found = await prisma.timesheetEntry.findFirst({ where: { ...scopeWhere(principal), id }, select: { id: true } });
  if (!found) throw notFound();
}

export async function listTimesheets(principal: AuthPrincipal, query: TimesheetListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.status ? { status: query.status } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.userId && (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) ? { userId: query.userId } : {}),
    ...(query.from || query.to
      ? { workDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
  };
  const rows = await prisma.timesheetEntry.findMany({ where, select: tsSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

async function validateRefs(input: { taskId?: string | null; projectId?: string | null }) {
  if (input.taskId) {
    const task = await prisma.task.findFirst({ where: { id: input.taskId, deletedAt: null }, select: { id: true } });
    if (!task) throw badRequest('Unknown taskId');
  }
  if (input.projectId) {
    const project = await prisma.project.findFirst({ where: { id: input.projectId, deletedAt: null }, select: { id: true } });
    if (!project) throw badRequest('Unknown projectId');
  }
}

export async function createTimesheet(principal: AuthPrincipal, input: CreateTimesheetInput, ip: string | null) {
  await validateRefs(input);
  const id = uuidv7();
  const entry = await prisma.timesheetEntry.create({
    data: {
      id, userId: principal.userId, taskId: input.taskId ?? null, projectId: input.projectId ?? null,
      workDate: new Date(input.workDate), minutes: input.minutes, note: input.note ?? null, status: 'draft',
    },
    select: tsSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'timesheet.create', entityType: 'timesheet', entityId: id, after: { minutes: input.minutes }, ip });
  return entry;
}

export async function updateTimesheet(principal: AuthPrincipal, id: string, input: UpdateTimesheetInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.timesheetEntry.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true } });
  if (!before) throw notFound();
  if (before.status !== 'draft' && before.status !== 'rejected') throw unprocessable('Only draft/rejected entries can be edited');
  if (before.userId !== principal.userId && principal.role !== ROLE.ADMIN) throw forbidden();
  await validateRefs(input);
  const updated = await prisma.timesheetEntry.update({
    where: { id },
    data: {
      ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.workDate !== undefined ? { workDate: new Date(input.workDate) } : {}),
      ...(input.minutes !== undefined ? { minutes: input.minutes } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    },
    select: tsSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'timesheet.update', entityType: 'timesheet', entityId: id, ip });
  return updated;
}

function assertTransition(from: string, to: string) {
  const allowed = TIMESHEET_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) throw unprocessable(`Cannot move timesheet from ${from} to ${to}`);
}

export async function submitTimesheet(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const entry = await prisma.timesheetEntry.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true } });
  if (!entry) throw notFound();
  if (entry.userId !== principal.userId && principal.role !== ROLE.ADMIN) throw forbidden();
  assertTransition(entry.status, 'submitted');
  const updated = await prisma.timesheetEntry.update({ where: { id }, data: { status: 'submitted' }, select: tsSelect });
  await writeAudit({ actorId: principal.userId, action: 'timesheet.submit', entityType: 'timesheet', entityId: id, ip });
  return updated;
}

export async function decideTimesheet(principal: AuthPrincipal, id: string, input: DecideTimesheetInput, ip: string | null) {
  const entry = await prisma.timesheetEntry.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true } });
  if (!entry) throw notFound();
  assertTransition(entry.status, input.decision);
  const updated = await prisma.timesheetEntry.update({ where: { id }, data: { status: input.decision }, select: tsSelect });
  await writeAudit({ actorId: principal.userId, action: `timesheet.${input.decision}`, entityType: 'timesheet', entityId: id, before: { status: entry.status }, after: { status: input.decision }, ip });
  await notify({ recipientId: entry.userId, type: `timesheet.${input.decision}`, title: `Timesheet ${input.decision}`, body: `Your timesheet entry was ${input.decision}.`, entityType: 'timesheet', entityId: id });
  return updated;
}

export async function deleteTimesheet(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const entry = await prisma.timesheetEntry.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true } });
  if (!entry) throw notFound();
  if (entry.userId !== principal.userId && principal.role !== ROLE.ADMIN) throw forbidden();
  if (entry.status === 'approved') throw unprocessable('Cannot delete an approved timesheet');
  await prisma.timesheetEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'timesheet.delete', entityType: 'timesheet', entityId: id, ip });
}
