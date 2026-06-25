import type {
  AuthPrincipal, CreateExpenseInput, UpdateExpenseInput, ExpenseListQuery, DecideExpenseInput, ExpenseStatus,
} from '@pixel/shared';
import { ROLE, EXPENSE_TRANSITIONS } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable, forbidden } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { toPaise, paiseToDecimalString } from '../../lib/money.js';
import { writeAudit } from '../audit/audit-service.js';
import { notify } from '../notifications/notifications-service.js';

/**
 * Expenses (§ Finance). Staff submit and see their own; Manager/Admin see all and decide
 * (approve → reimburse / reject). Status follows the EXPENSE_TRANSITIONS guard.
 */

const expenseSelect = {
  id: true, userId: true, projectId: true, category: true, amountInr: true, spentOn: true,
  receiptDocId: true, status: true, approverId: true, createdAt: true, updatedAt: true,
  user: { select: { fullName: true } },
  project: { select: { name: true } },
} as const;

function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  if (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) return base;
  return { ...base, userId: principal.userId }; // Staff: own only
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const found = await prisma.expense.findFirst({ where: { ...scopeWhere(principal), id }, select: { id: true } });
  if (!found) throw notFound();
}

export async function listExpenses(principal: AuthPrincipal, query: ExpenseListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.status ? { status: query.status } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.category ? { category: { contains: query.category, mode: 'insensitive' as const } } : {}),
    ...(query.userId && (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) ? { userId: query.userId } : {}),
  };
  const rows = await prisma.expense.findMany({ where, select: expenseSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getExpense(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const exp = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: expenseSelect });
  if (!exp) throw notFound();
  return exp;
}

export async function createExpense(principal: AuthPrincipal, input: CreateExpenseInput, ip: string | null) {
  if (input.projectId) {
    const project = await prisma.project.findFirst({ where: { id: input.projectId, deletedAt: null }, select: { id: true } });
    if (!project) throw badRequest('Unknown projectId');
  }
  const id = uuidv7();
  const expense = await prisma.expense.create({
    data: {
      id, userId: principal.userId, projectId: input.projectId ?? null, category: input.category,
      amountInr: paiseToDecimalString(toPaise(input.amountInr)), spentOn: new Date(input.spentOn),
      receiptDocId: input.receiptDocId ?? null, status: 'submitted',
    },
    select: expenseSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'expense.create', entityType: 'expense', entityId: id, after: { amount: expense.amountInr.toString(), category: input.category }, ip });
  return expense;
}

export async function updateExpense(principal: AuthPrincipal, id: string, input: UpdateExpenseInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true } });
  if (!before) throw notFound();
  if (before.status !== 'submitted') throw unprocessable('Only submitted expenses can be edited');
  if (before.userId !== principal.userId && principal.role !== ROLE.ADMIN) throw forbidden();
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.amountInr !== undefined ? { amountInr: paiseToDecimalString(toPaise(input.amountInr)) } : {}),
      ...(input.spentOn !== undefined ? { spentOn: new Date(input.spentOn) } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {}),
      ...(input.receiptDocId !== undefined ? { receiptDocId: input.receiptDocId ?? null } : {}),
    },
    select: expenseSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'expense.update', entityType: 'expense', entityId: id, ip });
  return updated;
}

/** Approve / reject / reimburse a submitted (or approved) expense. */
export async function decideExpense(principal: AuthPrincipal, id: string, input: DecideExpenseInput, ip: string | null) {
  const expense = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, userId: true, amountInr: true } });
  if (!expense) throw notFound();
  const target = input.decision as ExpenseStatus;
  const allowed = EXPENSE_TRANSITIONS[expense.status] ?? [];
  if (!allowed.includes(target)) throw unprocessable(`Cannot move expense from ${expense.status} to ${target}`);

  const updated = await prisma.expense.update({
    where: { id },
    data: { status: target, approverId: principal.userId },
    select: expenseSelect,
  });
  await writeAudit({ actorId: principal.userId, action: `expense.${target}`, entityType: 'expense', entityId: id, before: { status: expense.status }, after: { status: target }, ip });
  await notify({
    recipientId: expense.userId, type: `expense.${target}`, title: `Expense ${target}`,
    body: `Your ₹${expense.amountInr.toString()} expense was ${target}.`, entityType: 'expense', entityId: id,
  });
  return updated;
}

export async function softDeleteExpense(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
  if (!existing) throw notFound();
  if (existing.status === 'reimbursed') throw unprocessable('Cannot delete a reimbursed expense');
  await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'expense.delete', entityType: 'expense', entityId: id, ip });
}
