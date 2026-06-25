import type { Prisma } from '@prisma/client';
import type {
  AuthPrincipal, CreateInvoiceInput, UpdateInvoiceInput, InvoiceListQuery,
  RecordPaymentInput, GstReportQuery, InvoiceStatus,
} from '@pixel/shared';
import { ROLE, INVOICE_TRANSITIONS } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { env } from '../../config/env.js';
import { notFound, badRequest, conflict, unprocessable } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit, writeAuditTx } from '../audit/audit-service.js';
import { notify } from '../notifications/notifications-service.js';
import {
  toPaise, paiseToDecimalString, decimalToPaise, computeInvoice, deriveSupplyType,
  paymentStatus, balancePaise, financialYearOf, formatInvoiceNo, parseInvoiceSeq,
  type LineInputPaise,
} from '../../lib/money.js';

/**
 * Invoices + line items + payments (§ Finance). GST correctness is delegated to the tested
 * money engine; this service owns persistence, the issue/number lifecycle, status guards,
 * row scope, audit (mandatory for finance), and notifications.
 *
 * Row scope mirrors clients: Admin/Manager org-wide; Staff to clients they own or are a
 * project member of; Client to their own invoices only.
 */

const invoiceSelect = {
  id: true, invoiceNo: true, clientId: true, projectId: true, issueDate: true, dueDate: true,
  placeOfSupply: true, supplyType: true, subtotalInr: true, cgstInr: true, sgstInr: true,
  igstInr: true, totalInr: true, status: true, notes: true, createdAt: true, updatedAt: true,
  client: { select: { displayName: true, gstin: true, stateCode: true } },
} as const;

const fullInvoiceSelect = {
  ...invoiceSelect,
  lineItems: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { paidAt: 'asc' as const } },
} as const;

async function scopeWhere(principal: AuthPrincipal): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = { deletedAt: null };
  switch (principal.role) {
    case ROLE.ADMIN:
    case ROLE.MANAGER:
      return base;
    case ROLE.CLIENT:
      return { ...base, clientId: principal.clientId ?? '__none__' };
    case ROLE.STAFF:
    default: {
      const memberProjects = await prisma.projectMember.findMany({
        where: { userId: principal.userId },
        select: { project: { select: { clientId: true } } },
      });
      const clientIds = memberProjects.map((m) => m.project.clientId);
      return {
        ...base,
        client: { OR: [{ ownerUserId: principal.userId }, { id: { in: clientIds } }] },
      };
    }
  }
}

async function assertVisible(principal: AuthPrincipal, id: string): Promise<void> {
  const where = await scopeWhere(principal);
  const found = await prisma.invoice.findFirst({ where: { ...where, id }, select: { id: true } });
  if (!found) throw notFound();
}

/** Turn validated rupee line inputs into the paise shape the money engine consumes. */
function toLineInputs(lineItems: CreateInvoiceInput['lineItems']): LineInputPaise[] {
  return lineItems.map((l) => ({
    unitPricePaise: toPaise(l.unitPriceInr),
    quantity: l.quantity,
    discountPaise: toPaise(l.discountInr ?? 0),
    gstRate: l.gstRate,
  }));
}

export async function listInvoices(principal: AuthPrincipal, query: InvoiceListQuery) {
  const scope = await scopeWhere(principal);
  const where = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.from || query.to
      ? { issueDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
      : {}),
    ...(query.search ? { invoiceNo: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };
  const rows = await prisma.invoice.findMany({ where, select: invoiceSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getInvoice(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const invoice = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, select: fullInvoiceSelect });
  if (!invoice) throw notFound();
  const paidPaise = invoice.payments.reduce((acc, p) => acc + decimalToPaise(p.amountInr), 0);
  return { ...invoice, paidInr: paiseToDecimalString(paidPaise), balanceInr: paiseToDecimalString(balancePaise(decimalToPaise(invoice.totalInr), paidPaise)) };
}

/**
 * Create a DRAFT invoice. The place of supply + supplier state decide CGST/SGST vs IGST;
 * GST is computed in paise and persisted as 2-dp rupee decimals. Draft invoices carry a
 * `DRAFT-…` placeholder number so the gap-free PA/FY/NNNN series is only consumed on issue.
 */
export async function createInvoice(principal: AuthPrincipal, input: CreateInvoiceInput, ip: string | null) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } });
  if (!client) throw badRequest('Unknown clientId');
  if (input.projectId) {
    const project = await prisma.project.findFirst({ where: { id: input.projectId, clientId: input.clientId, deletedAt: null }, select: { id: true } });
    if (!project) throw badRequest('projectId does not belong to this client');
  }

  const supplyType = deriveSupplyType(env.SUPPLIER_STATE_CODE, input.placeOfSupply);
  const totals = computeInvoice(toLineInputs(input.lineItems), supplyType);
  const invoiceId = uuidv7();

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        id: invoiceId,
        invoiceNo: `DRAFT-${invoiceId.slice(0, 8)}`,
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        placeOfSupply: input.placeOfSupply,
        supplyType,
        subtotalInr: paiseToDecimalString(totals.subtotalPaise),
        cgstInr: paiseToDecimalString(totals.cgstPaise),
        sgstInr: paiseToDecimalString(totals.sgstPaise),
        igstInr: paiseToDecimalString(totals.igstPaise),
        totalInr: paiseToDecimalString(totals.totalPaise),
        status: 'draft',
        notes: input.notes ?? null,
        lineItems: {
          create: input.lineItems.map((l, i) => ({
            id: uuidv7(),
            description: l.description,
            hsnSac: l.hsnSac,
            quantity: String(l.quantity),
            unitPriceInr: paiseToDecimalString(toPaise(l.unitPriceInr)),
            taxableValueInr: paiseToDecimalString(totals.lines[i].taxablePaise),
            gstRate: String(l.gstRate),
            cgstInr: paiseToDecimalString(totals.lines[i].cgstPaise),
            sgstInr: paiseToDecimalString(totals.lines[i].sgstPaise),
            igstInr: paiseToDecimalString(totals.lines[i].igstPaise),
          })),
        },
      },
      select: fullInvoiceSelect,
    });
    await writeAuditTx(tx, {
      actorId: principal.userId, action: 'invoice.create', entityType: 'invoice', entityId: invoiceId,
      after: { status: 'draft', total: created.totalInr.toString(), supplyType }, ip,
    });
    return created;
  });
  return invoice;
}

/** Replace a DRAFT invoice's contents (recomputes GST). Illegal once issued. */
export async function updateInvoice(principal: AuthPrincipal, id: string, input: UpdateInvoiceInput, ip: string | null) {
  await assertVisible(principal, id);
  const existing = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, placeOfSupply: true, clientId: true } });
  if (!existing) throw notFound();
  if (existing.status !== 'draft') throw unprocessable('Only draft invoices can be edited');

  const placeOfSupply = input.placeOfSupply ?? existing.placeOfSupply;
  const supplyType = deriveSupplyType(env.SUPPLIER_STATE_CODE, placeOfSupply);

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.InvoiceUpdateInput = {
      ...(input.issueDate ? { issueDate: new Date(input.issueDate) } : {}),
      ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
      ...(input.placeOfSupply ? { placeOfSupply, supplyType } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.projectId !== undefined ? { project: input.projectId ? { connect: { id: input.projectId } } : { disconnect: true } } : {}),
    };
    if (input.lineItems) {
      const totals = computeInvoice(toLineInputs(input.lineItems), supplyType);
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      data.subtotalInr = paiseToDecimalString(totals.subtotalPaise);
      data.cgstInr = paiseToDecimalString(totals.cgstPaise);
      data.sgstInr = paiseToDecimalString(totals.sgstPaise);
      data.igstInr = paiseToDecimalString(totals.igstPaise);
      data.totalInr = paiseToDecimalString(totals.totalPaise);
      data.lineItems = {
        create: input.lineItems.map((l, i) => ({
          id: uuidv7(), description: l.description, hsnSac: l.hsnSac, quantity: String(l.quantity),
          unitPriceInr: paiseToDecimalString(toPaise(l.unitPriceInr)),
          taxableValueInr: paiseToDecimalString(totals.lines[i].taxablePaise),
          gstRate: String(l.gstRate),
          cgstInr: paiseToDecimalString(totals.lines[i].cgstPaise),
          sgstInr: paiseToDecimalString(totals.lines[i].sgstPaise),
          igstInr: paiseToDecimalString(totals.lines[i].igstPaise),
        })),
      };
    } else if (input.placeOfSupply) {
      // Place of supply changed without re-sending lines: recompute split from stored lines.
      const lines = await tx.invoiceLineItem.findMany({ where: { invoiceId: id } });
      const totals = computeInvoice(
        lines.map((l) => ({ unitPricePaise: decimalToPaise(l.unitPriceInr), quantity: Number(l.quantity), discountPaise: 0, gstRate: Number(l.gstRate) })),
        supplyType,
      );
      data.subtotalInr = paiseToDecimalString(totals.subtotalPaise);
      data.cgstInr = paiseToDecimalString(totals.cgstPaise);
      data.sgstInr = paiseToDecimalString(totals.sgstPaise);
      data.igstInr = paiseToDecimalString(totals.igstPaise);
      data.totalInr = paiseToDecimalString(totals.totalPaise);
      for (const l of lines) {
        const idx = lines.indexOf(l);
        await tx.invoiceLineItem.update({
          where: { id: l.id },
          data: {
            taxableValueInr: paiseToDecimalString(totals.lines[idx].taxablePaise),
            cgstInr: paiseToDecimalString(totals.lines[idx].cgstPaise),
            sgstInr: paiseToDecimalString(totals.lines[idx].sgstPaise),
            igstInr: paiseToDecimalString(totals.lines[idx].igstPaise),
          },
        });
      }
    }
    const res = await tx.invoice.update({ where: { id }, data, select: fullInvoiceSelect });
    await writeAuditTx(tx, { actorId: principal.userId, action: 'invoice.update', entityType: 'invoice', entityId: id, after: { total: res.totalInr.toString() }, ip });
    return res;
  });
  return updated;
}

function assertTransition(from: InvoiceStatus, to: InvoiceStatus) {
  const allowed = INVOICE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) throw unprocessable(`Cannot move invoice from ${from} to ${to}`);
}

/** Allocate the next gap-free PA/FY/NNNN number for the issue-date's financial year. */
async function nextInvoiceNo(tx: Prisma.TransactionClient, issueDate: Date): Promise<string> {
  const fy = financialYearOf(issueDate);
  const prefix = `PA/${fy.label}/`;
  const last = await tx.invoice.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: 'desc' },
    select: { invoiceNo: true },
  });
  const lastSeq = last ? (parseInvoiceSeq(last.invoiceNo) ?? 0) : 0;
  return formatInvoiceNo(fy.label, lastSeq + 1);
}

/** Draft → issued: assign the sequential number and lock the contents. Notifies the client. */
export async function issueInvoice(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const invoice = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, issueDate: true, clientId: true } });
  if (!invoice) throw notFound();
  assertTransition(invoice.status as InvoiceStatus, 'issued');

  // Retry on the (rare) concurrent unique-number race; the DB unique index is the guard.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const issued = await prisma.$transaction(async (tx) => {
        const invoiceNo = await nextInvoiceNo(tx, invoice.issueDate);
        const res = await tx.invoice.update({ where: { id }, data: { invoiceNo, status: 'issued' }, select: fullInvoiceSelect });
        await writeAuditTx(tx, { actorId: principal.userId, action: 'invoice.issue', entityType: 'invoice', entityId: id, after: { invoiceNo, status: 'issued' }, ip });
        return res;
      });
      const portalUser = await prisma.user.findFirst({ where: { clientId: issued.clientId, deletedAt: null }, select: { id: true, email: true } });
      if (portalUser) {
        await notify({
          recipientId: portalUser.id, type: 'invoice.issued', title: `Invoice ${issued.invoiceNo} issued`,
          body: `An invoice of ₹${issued.totalInr.toString()} has been issued and is due ${issued.dueDate.toISOString().slice(0, 10)}.`,
          entityType: 'invoice', entityId: id, channels: ['in_app', 'email'], email: { to: portalUser.email },
        });
      }
      return issued;
    } catch (err) {
      if (attempt < 2 && err instanceof Error && err.message.includes('Unique constraint')) continue;
      throw err;
    }
  }
  throw conflict('Could not allocate an invoice number; please retry');
}

/** Void a non-paid invoice. */
export async function voidInvoice(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const invoice = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, _count: { select: { payments: true } } } });
  if (!invoice) throw notFound();
  if (invoice._count.payments > 0) throw unprocessable('Cannot void an invoice that has payments');
  assertTransition(invoice.status as InvoiceStatus, 'cancelled');
  const res = await prisma.invoice.update({ where: { id }, data: { status: 'cancelled' }, select: invoiceSelect });
  await writeAudit({ actorId: principal.userId, action: 'invoice.void', entityType: 'invoice', entityId: id, before: { status: invoice.status }, after: { status: 'cancelled' }, ip });
  return res;
}

/** Record a payment; recompute the paid sum and auto-derive status (partially_paid / paid). */
export async function recordPayment(principal: AuthPrincipal, id: string, input: RecordPaymentInput, ip: string | null) {
  await assertVisible(principal, id);
  const invoice = await prisma.invoice.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, totalInr: true, invoiceNo: true } });
  if (!invoice) throw notFound();
  if (invoice.status === 'draft') throw unprocessable('Issue the invoice before recording a payment');
  if (invoice.status === 'cancelled') throw unprocessable('Cannot record a payment on a cancelled invoice');

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        id: uuidv7(), invoiceId: id, amountInr: paiseToDecimalString(toPaise(input.amountInr)),
        paidAt: new Date(input.paidAt), method: input.method, reference: input.reference ?? null,
      },
    });
    const agg = await tx.payment.aggregate({ where: { invoiceId: id }, _sum: { amountInr: true } });
    const paidPaise = agg._sum.amountInr ? decimalToPaise(agg._sum.amountInr) : 0;
    const totalPaise = decimalToPaise(invoice.totalInr);
    const nextStatus = paymentStatus(totalPaise, paidPaise);
    const updated = await tx.invoice.update({ where: { id }, data: { status: nextStatus }, select: fullInvoiceSelect });
    await writeAuditTx(tx, { actorId: principal.userId, action: 'invoice.payment.record', entityType: 'invoice', entityId: id, after: { amount: payment.amountInr.toString(), method: input.method, status: nextStatus }, ip });
    return { updated, payment, paidPaise, totalPaise, nextStatus, overpaid: paidPaise > totalPaise };
  });

  return {
    ...result.updated,
    paidInr: paiseToDecimalString(result.paidPaise),
    balanceInr: paiseToDecimalString(balancePaise(result.totalPaise, result.paidPaise)),
    overpaid: result.overpaid,
  };
}

/**
 * GSTR-1-style export over issued/paid invoices in a window. Returns rows that reconcile to
 * the rupee. CSV is a flat B2B-style dump; JSON keeps the structured totals.
 */
export async function gstReport(principal: AuthPrincipal, query: GstReportQuery) {
  if (principal.role !== ROLE.ADMIN && principal.role !== ROLE.MANAGER) throw notFound();
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ['issued', 'partially_paid', 'paid', 'overdue'] },
      issueDate: { gte: new Date(query.from), lte: new Date(query.to) },
    },
    select: invoiceSelect,
    orderBy: { invoiceNo: 'asc' },
  });

  const rows = invoices.map((inv) => ({
    invoiceNo: inv.invoiceNo,
    issueDate: inv.issueDate.toISOString().slice(0, 10),
    client: inv.client.displayName,
    gstin: inv.client.gstin ?? '',
    placeOfSupply: inv.placeOfSupply,
    supplyType: inv.supplyType,
    taxableValue: inv.subtotalInr.toString(),
    cgst: inv.cgstInr.toString(),
    sgst: inv.sgstInr.toString(),
    igst: inv.igstInr.toString(),
    total: inv.totalInr.toString(),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.taxable += toPaise(Number(r.taxableValue));
      acc.cgst += toPaise(Number(r.cgst));
      acc.sgst += toPaise(Number(r.sgst));
      acc.igst += toPaise(Number(r.igst));
      acc.total += toPaise(Number(r.total));
      return acc;
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

  if (query.format === 'csv') {
    const header = 'Invoice No,Date,Client,GSTIN,Place of Supply,Supply Type,Taxable Value,CGST,SGST,IGST,Total';
    const body = rows.map((r) => [r.invoiceNo, r.issueDate, `"${r.client}"`, r.gstin, r.placeOfSupply, r.supplyType, r.taxableValue, r.cgst, r.sgst, r.igst, r.total].join(',')).join('\n');
    return { format: 'csv' as const, content: `${header}\n${body}` };
  }
  return {
    format: 'json' as const,
    period: { from: query.from, to: query.to },
    count: rows.length,
    rows,
    totals: {
      taxableValue: paiseToDecimalString(totals.taxable),
      cgst: paiseToDecimalString(totals.cgst),
      sgst: paiseToDecimalString(totals.sgst),
      igst: paiseToDecimalString(totals.igst),
      total: paiseToDecimalString(totals.total),
    },
  };
}
