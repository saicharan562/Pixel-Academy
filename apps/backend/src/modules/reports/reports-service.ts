import type { AuthPrincipal, ReportQuery } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { decimalToPaise, paiseToDecimalString, balancePaise } from '../../lib/money.js';

/**
 * Reports (§ Reports/Exports). Read-only aggregates for the dashboard and the finance view.
 * Org-wide for Admin/Manager; scoped down for everyone else so a staff member's dashboard
 * reflects their own world.
 */

const isOrgWide = (p: AuthPrincipal) => p.role === ROLE.ADMIN || p.role === ROLE.MANAGER;

export async function dashboardSummary(principal: AuthPrincipal) {
  const now = new Date();

  if (isOrgWide(principal)) {
    const [activeProjects, openTickets, pendingLeaves, overdueInvoices, receivables] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.ticket.count({ where: { deletedAt: null, status: { in: ['open', 'in_progress', 'waiting_client', 'escalated'] } } }),
      prisma.leaveRequest.count({ where: { deletedAt: null, status: 'pending' } }),
      prisma.invoice.count({ where: { deletedAt: null, status: { in: ['issued', 'partially_paid', 'overdue'] }, dueDate: { lt: now } } }),
      outstandingReceivables(),
    ]);
    return { scope: 'org', activeProjects, openTickets, pendingLeaves, overdueInvoices, outstandingReceivablesInr: receivables };
  }

  // Staff / client: their own slice.
  const [myTasks, myOpenTickets, myPendingLeaves] = await Promise.all([
    prisma.task.count({ where: { deletedAt: null, assigneeId: principal.userId, status: { notIn: ['done'] } } }),
    prisma.ticket.count({ where: { deletedAt: null, OR: [{ assigneeId: principal.userId }, { createdBy: principal.userId }], status: { in: ['open', 'in_progress', 'waiting_client', 'escalated'] } } }),
    prisma.leaveRequest.count({ where: { deletedAt: null, userId: principal.userId, status: 'pending' } }),
  ]);
  return { scope: 'self', myOpenTasks: myTasks, myOpenTickets, myPendingLeaves };
}

/** Sum of outstanding balances across non-terminal invoices, in paise → rupee string. */
async function outstandingReceivables(): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, status: { in: ['issued', 'partially_paid', 'overdue'] } },
    select: { totalInr: true, payments: { select: { amountInr: true } } },
  });
  let outstanding = 0;
  for (const inv of invoices) {
    const paid = inv.payments.reduce((acc, p) => acc + decimalToPaise(p.amountInr), 0);
    outstanding += balancePaise(decimalToPaise(inv.totalInr), paid);
  }
  return paiseToDecimalString(outstanding);
}

/** Revenue + tax summary over an issue-date window (Admin/Manager only). */
export async function financialSummary(principal: AuthPrincipal, query: ReportQuery) {
  if (!isOrgWide(principal)) return { scope: 'denied' as const };
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ['issued', 'partially_paid', 'paid', 'overdue'] },
      issueDate: { gte: new Date(query.from), lte: new Date(query.to) },
      ...(query.clientId ? { clientId: query.clientId } : {}),
    },
    select: { status: true, subtotalInr: true, cgstInr: true, sgstInr: true, igstInr: true, totalInr: true },
  });

  const acc = { count: invoices.length, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
  const byStatus: Record<string, number> = {};
  for (const inv of invoices) {
    acc.taxable += decimalToPaise(inv.subtotalInr);
    acc.cgst += decimalToPaise(inv.cgstInr);
    acc.sgst += decimalToPaise(inv.sgstInr);
    acc.igst += decimalToPaise(inv.igstInr);
    acc.total += decimalToPaise(inv.totalInr);
    byStatus[inv.status] = (byStatus[inv.status] ?? 0) + 1;
  }

  return {
    scope: 'org' as const,
    period: { from: query.from, to: query.to },
    count: acc.count,
    byStatus,
    totals: {
      taxableValue: paiseToDecimalString(acc.taxable),
      cgst: paiseToDecimalString(acc.cgst),
      sgst: paiseToDecimalString(acc.sgst),
      igst: paiseToDecimalString(acc.igst),
      total: paiseToDecimalString(acc.total),
    },
  };
}
