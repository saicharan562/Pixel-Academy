import type { AuthPrincipal, AttendanceListQuery, UpsertAttendanceInput } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { workedMinutes, attendanceStatusFromMinutes } from '../../lib/workdays.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Attendance (§ People Ops). Staff check in/out for themselves; Manager/Admin can view all
 * and manually upsert a day (corrections, holidays). Worked minutes + status are derived
 * server-side from the timestamps so the record can't be gamed from the client.
 */

const attendanceSelect = {
  id: true, userId: true, workDate: true, checkInAt: true, checkOutAt: true, workedMinutes: true,
  status: true, source: true, createdAt: true, updatedAt: true,
  user: { select: { fullName: true } },
} as const;

function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  if (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) return base;
  return { ...base, userId: principal.userId };
}

/** UTC midnight for a day — attendance is keyed by date, one row per user per day. */
function dayStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function listAttendance(principal: AuthPrincipal, query: AttendanceListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId && (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) ? { userId: query.userId } : {}),
    ...(query.from || query.to
      ? { workDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
  };
  const rows = await prisma.attendance.findMany({ where, select: attendanceSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

/** Self check-in for today. Idempotent: a second call returns the existing open row. */
export async function checkIn(principal: AuthPrincipal, source: string, ip: string | null) {
  const workDate = dayStart();
  const existing = await prisma.attendance.findFirst({ where: { userId: principal.userId, workDate }, select: attendanceSelect });
  if (existing?.checkInAt) return existing;
  const now = new Date();
  const row = await prisma.attendance.upsert({
    where: { uq_attendance_user_date: { userId: principal.userId, workDate } },
    create: { id: uuidv7(), userId: principal.userId, workDate, checkInAt: now, status: 'present', source },
    update: { checkInAt: now, status: 'present', source },
    select: attendanceSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'attendance.check_in', entityType: 'attendance', entityId: row.id, ip });
  return row;
}

/** Self check-out for today; computes worked minutes + status. */
export async function checkOut(principal: AuthPrincipal, ip: string | null) {
  const workDate = dayStart();
  const existing = await prisma.attendance.findFirst({ where: { userId: principal.userId, workDate } });
  if (!existing?.checkInAt) throw unprocessable('No active check-in for today');
  const now = new Date();
  const minutes = workedMinutes(existing.checkInAt, now);
  const row = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutAt: now, workedMinutes: minutes, status: attendanceStatusFromMinutes(minutes) },
    select: attendanceSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'attendance.check_out', entityType: 'attendance', entityId: row.id, after: { workedMinutes: minutes }, ip });
  return row;
}

/** Manager/Admin manual upsert for a user/day (corrections, holidays, leave marking). */
export async function upsertAttendance(principal: AuthPrincipal, input: UpsertAttendanceInput, ip: string | null) {
  const user = await prisma.user.findFirst({ where: { id: input.userId, deletedAt: null }, select: { id: true } });
  if (!user) throw badRequest('Unknown userId');
  const workDate = new Date(input.workDate);
  const checkInAt = input.checkInAt ? new Date(input.checkInAt) : null;
  const checkOutAt = input.checkOutAt ? new Date(input.checkOutAt) : null;
  const minutes = checkInAt && checkOutAt ? workedMinutes(checkInAt, checkOutAt) : null;
  const status = input.status ?? (minutes != null ? attendanceStatusFromMinutes(minutes) : null);

  const row = await prisma.attendance.upsert({
    where: { uq_attendance_user_date: { userId: input.userId, workDate } },
    create: { id: uuidv7(), userId: input.userId, workDate, checkInAt, checkOutAt, workedMinutes: minutes, status, source: input.source },
    update: { checkInAt, checkOutAt, workedMinutes: minutes, status, source: input.source },
    select: attendanceSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'attendance.upsert', entityType: 'attendance', entityId: row.id, after: { userId: input.userId, status }, ip });
  return row;
}
