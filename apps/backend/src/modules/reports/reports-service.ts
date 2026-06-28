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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      activeProjects, openTickets, pendingLeaves, overdueInvoices, receivables,
      activeClients, delayedProjects, revenueThisMonthInr, mrrInr, teamUtilizationPct,
    ] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.ticket.count({ where: { deletedAt: null, status: { in: ['open', 'in_progress', 'waiting_client', 'escalated'] } } }),
      prisma.leaveRequest.count({ where: { deletedAt: null, status: 'pending' } }),
      prisma.invoice.count({ where: { deletedAt: null, status: { in: ['issued', 'partially_paid', 'overdue'] }, dueDate: { lt: now } } }),
      outstandingReceivables(),
      prisma.client.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.project.count({ where: { deletedAt: null, status: 'active', endDate: { lt: now } } }),
      revenueCollected(monthStart, now),
      monthlyRecurringRevenue(now),
      teamUtilization(monthStart, now),
    ]);
    return {
      scope: 'org', activeProjects, openTickets, pendingLeaves, overdueInvoices,
      outstandingReceivablesInr: receivables, activeClients, delayedProjects,
      revenueThisMonthInr, mrrInr, teamUtilizationPct,
    };
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

/** Cash actually collected (payment date) within a window, in paise → rupee string. */
async function revenueCollected(from: Date, to: Date): Promise<string> {
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: from, lte: to } },
    select: { amountInr: true },
  });
  const total = payments.reduce((acc, p) => acc + decimalToPaise(p.amountInr), 0);
  return paiseToDecimalString(total);
}

/** Monthly recurring revenue: active contracts' value spread evenly over their term. */
async function monthlyRecurringRevenue(now: Date): Promise<string> {
  const contracts = await prisma.contract.findMany({
    where: { deletedAt: null, status: 'active', startDate: { lte: now }, endDate: { gte: now } },
    select: { valueInr: true, startDate: true, endDate: true },
  });
  let mrr = 0;
  for (const c of contracts) {
    if (!c.valueInr) continue;
    const months = Math.max(
      1,
      Math.round((c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    mrr += decimalToPaise(c.valueInr) / months;
  }
  return paiseToDecimalString(Math.round(mrr));
}

/** Logged timesheet minutes vs. theoretical capacity (8h/weekday) for the active team. */
async function teamUtilization(from: Date, to: Date): Promise<number> {
  const [loggedMinutes, activeStaff] = await Promise.all([
    prisma.timesheetEntry.aggregate({
      where: { deletedAt: null, workDate: { gte: from, lte: to }, status: { in: ['submitted', 'approved'] } },
      _sum: { minutes: true },
    }),
    prisma.user.count({ where: { deletedAt: null, status: 'active' } }),
  ]);
  if (activeStaff === 0) return 0;
  const weekdays = countWeekdays(from, to);
  const capacityMinutes = activeStaff * weekdays * 8 * 60;
  if (capacityMinutes === 0) return 0;
  return Math.round(((loggedMinutes._sum.minutes ?? 0) / capacityMinutes) * 100);
}

function countWeekdays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
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
