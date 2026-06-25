import type { Prisma } from '@prisma/client';
import type {
  AuthPrincipal, CreateSlaPolicyInput, UpdateSlaPolicyInput, CreateTicketInput, UpdateTicketInput,
  TicketTransitionInput, CreateTicketCommentInput, TicketListQuery, TicketStatus,
} from '@pixel/shared';
import { ROLE, TICKET_TRANSITIONS } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit, writeAuditTx } from '../audit/audit-service.js';
import { notify } from '../notifications/notifications-service.js';

/**
 * Tickets + SLA (§ Support). On creation, an SLA policy (explicit, or matched by priority)
 * stamps first-response and resolution due-times; the sla-sweep job watches these and the
 * escalation path. Every status change / assignment / comment is recorded as a TicketEvent
 * so the thread is a complete, append-only history.
 */

const ticketSelect = {
  id: true, ticketNo: true, clientId: true, createdBy: true, assigneeId: true, subject: true,
  priority: true, slaPolicyId: true, status: true, firstResponseDueAt: true, resolutionDueAt: true,
  firstRespondedAt: true, resolvedAt: true, createdAt: true, updatedAt: true,
  client: { select: { displayName: true } },
  assignee: { select: { fullName: true } },
} as const;

// ── SLA policies ──
export async function listSlaPolicies() {
  return prisma.slaPolicy.findMany({ orderBy: { resolutionMins: 'asc' } });
}
export async function createSlaPolicy(principal: AuthPrincipal, input: CreateSlaPolicyInput, ip: string | null) {
  const id = uuidv7();
  const policy = await prisma.slaPolicy.create({ data: { id, ...input } });
  await writeAudit({ actorId: principal.userId, action: 'sla.create', entityType: 'sla_policy', entityId: id, after: { name: input.name }, ip });
  return policy;
}
export async function updateSlaPolicy(principal: AuthPrincipal, id: string, input: UpdateSlaPolicyInput, ip: string | null) {
  const existing = await prisma.slaPolicy.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound();
  const policy = await prisma.slaPolicy.update({ where: { id }, data: input });
  await writeAudit({ actorId: principal.userId, action: 'sla.update', entityType: 'sla_policy', entityId: id, ip });
  return policy;
}

// ── Tickets ──
function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  switch (principal.role) {
    case ROLE.ADMIN:
    case ROLE.MANAGER:
      return base;
    case ROLE.CLIENT:
      return { ...base, clientId: principal.clientId ?? '__none__' };
    case ROLE.STAFF:
    default:
      return { ...base, OR: [{ assigneeId: principal.userId }, { createdBy: principal.userId }] };
  }
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const found = await prisma.ticket.findFirst({ where: { ...scopeWhere(principal), id }, select: { id: true } });
  if (!found) throw notFound();
}

export async function listTickets(principal: AuthPrincipal, query: TicketListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.search ? { OR: [{ subject: { contains: query.search, mode: 'insensitive' as const } }, { ticketNo: { contains: query.search, mode: 'insensitive' as const } }] } : {}),
  };
  const rows = await prisma.ticket.findMany({ where, select: ticketSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getTicket(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
    select: { ...ticketSelect, events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { fullName: true } } } } },
  });
  if (!ticket) throw notFound();
  return ticket;
}

async function nextTicketNo(tx: Prisma.TransactionClient): Promise<string> {
  const last = await tx.ticket.findFirst({ orderBy: { ticketNo: 'desc' }, select: { ticketNo: true } });
  const lastSeq = last ? Number(/\d+$/.exec(last.ticketNo)?.[0] ?? 0) : 0;
  return `TKT-${String(lastSeq + 1).padStart(5, '0')}`;
}

export async function createTicket(principal: AuthPrincipal, input: CreateTicketInput, ip: string | null) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } });
  if (!client) throw badRequest('Unknown clientId');

  // Resolve SLA policy: explicit, else the one matching the ticket priority.
  let policy = input.slaPolicyId
    ? await prisma.slaPolicy.findUnique({ where: { id: input.slaPolicyId } })
    : await prisma.slaPolicy.findFirst({ where: { priority: input.priority } });
  if (input.slaPolicyId && !policy) throw badRequest('Unknown slaPolicyId');

  const now = new Date();
  const firstResponseDueAt = policy ? new Date(now.getTime() + policy.firstResponseMins * 60_000) : null;
  const resolutionDueAt = policy ? new Date(now.getTime() + policy.resolutionMins * 60_000) : null;

  const ticket = await prisma.$transaction(async (tx) => {
    const ticketNo = await nextTicketNo(tx);
    const created = await tx.ticket.create({
      data: {
        id: uuidv7(), ticketNo, clientId: input.clientId, createdBy: principal.userId,
        assigneeId: input.assigneeId ?? null, subject: input.subject, priority: input.priority,
        slaPolicyId: policy?.id ?? null, status: 'open', firstResponseDueAt, resolutionDueAt,
      },
      select: ticketSelect,
    });
    if (input.description) {
      await tx.ticketEvent.create({ data: { id: uuidv7(), ticketId: created.id, actorId: principal.userId, type: 'comment', payload: { body: input.description } } });
    }
    await writeAuditTx(tx, { actorId: principal.userId, action: 'ticket.create', entityType: 'ticket', entityId: created.id, after: { ticketNo, priority: input.priority }, ip });
    return created;
  });

  if (ticket.assigneeId) {
    await notify({ recipientId: ticket.assigneeId, type: 'ticket.assigned', title: `Ticket ${ticket.ticketNo} assigned to you`, body: ticket.subject, entityType: 'ticket', entityId: ticket.id });
  }
  return ticket;
}

export async function updateTicket(principal: AuthPrincipal, id: string, input: UpdateTicketInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.ticket.findFirst({ where: { id, deletedAt: null }, select: { id: true, assigneeId: true } });
  if (!before) throw notFound();

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.ticket.update({
      where: { id },
      data: {
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.slaPolicyId !== undefined ? { slaPolicyId: input.slaPolicyId } : {}),
      },
      select: ticketSelect,
    });
    if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
      await tx.ticketEvent.create({ data: { id: uuidv7(), ticketId: id, actorId: principal.userId, type: 'assignment', payload: { assigneeId: input.assigneeId } } });
    }
    await writeAuditTx(tx, { actorId: principal.userId, action: 'ticket.update', entityType: 'ticket', entityId: id, ip });
    return res;
  });

  if (input.assigneeId && input.assigneeId !== before.assigneeId) {
    await notify({ recipientId: input.assigneeId, type: 'ticket.assigned', title: `Ticket ${updated.ticketNo} assigned to you`, body: updated.subject, entityType: 'ticket', entityId: id });
  }
  return updated;
}

export async function transitionTicket(principal: AuthPrincipal, id: string, input: TicketTransitionInput, ip: string | null) {
  await assertVisible(principal, id);
  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, firstRespondedAt: true, createdBy: true, ticketNo: true } });
  if (!ticket) throw notFound();
  const from = ticket.status as TicketStatus;
  const to = input.status;
  if (from === to) throw unprocessable('Ticket is already in that status');
  const allowed = TICKET_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) throw unprocessable(`Cannot move ticket from ${from} to ${to}`);

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.ticket.update({
      where: { id },
      data: {
        status: to,
        ...(ticket.firstRespondedAt == null && to !== 'open' ? { firstRespondedAt: now } : {}),
        ...(to === 'resolved' ? { resolvedAt: now } : {}),
      },
      select: ticketSelect,
    });
    await tx.ticketEvent.create({ data: { id: uuidv7(), ticketId: id, actorId: principal.userId, type: to === 'escalated' ? 'escalation' : 'status_change', payload: { from, to } } });
    await writeAuditTx(tx, { actorId: principal.userId, action: 'ticket.transition', entityType: 'ticket', entityId: id, before: { status: from }, after: { status: to }, ip });
    return res;
  });

  await notify({ recipientId: ticket.createdBy, type: 'ticket.status', title: `Ticket ${ticket.ticketNo} ${to.replace('_', ' ')}`, body: `Your ticket is now ${to.replace('_', ' ')}.`, entityType: 'ticket', entityId: id });
  return updated;
}

export async function addComment(principal: AuthPrincipal, id: string, input: CreateTicketCommentInput, ip: string | null) {
  await assertVisible(principal, id);
  const ticket = await prisma.ticket.findFirst({ where: { id, deletedAt: null }, select: { id: true, firstRespondedAt: true, createdBy: true, assigneeId: true, ticketNo: true } });
  if (!ticket) throw notFound();
  const isStaff = principal.role !== ROLE.CLIENT;

  const event = await prisma.$transaction(async (tx) => {
    const ev = await tx.ticketEvent.create({ data: { id: uuidv7(), ticketId: id, actorId: principal.userId, type: 'comment', payload: { body: input.body } } });
    // First staff reply satisfies first-response SLA.
    if (ticket.firstRespondedAt == null && isStaff) {
      await tx.ticket.update({ where: { id }, data: { firstRespondedAt: new Date() } });
    }
    await writeAuditTx(tx, { actorId: principal.userId, action: 'ticket.comment', entityType: 'ticket', entityId: id, ip });
    return ev;
  });

  // Notify the other party.
  const recipient = isStaff ? ticket.createdBy : (ticket.assigneeId ?? ticket.createdBy);
  if (recipient !== principal.userId) {
    await notify({ recipientId: recipient, type: 'ticket.comment', title: `New reply on ${ticket.ticketNo}`, body: input.body.slice(0, 140), entityType: 'ticket', entityId: id });
  }
  return event;
}
