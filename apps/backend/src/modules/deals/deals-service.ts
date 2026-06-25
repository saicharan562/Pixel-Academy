import type { AuthPrincipal, CreateDealInput, UpdateDealInput, DealListQuery } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { toPaise, paiseToDecimalString } from '../../lib/money.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * CRM deals (§ Revenue depth). Staff see deals they own; Manager/Admin see the whole
 * pipeline. Stage is free-moving (lead → … → won/lost) so the board can drag cards.
 */

const dealSelect = {
  id: true, clientId: true, title: true, stage: true, valueInr: true, probability: true,
  ownerUserId: true, expectedClose: true, lostReason: true, createdAt: true, updatedAt: true,
  client: { select: { displayName: true } },
  owner: { select: { fullName: true } },
} as const;

function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  if (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) return base;
  return { ...base, ownerUserId: principal.userId };
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const found = await prisma.deal.findFirst({ where: { ...scopeWhere(principal), id }, select: { id: true } });
  if (!found) throw notFound();
}

export async function listDeals(principal: AuthPrincipal, query: DealListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.ownerUserId && (principal.role === ROLE.ADMIN || principal.role === ROLE.MANAGER) ? { ownerUserId: query.ownerUserId } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };
  const rows = await prisma.deal.findMany({ where, select: dealSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getDeal(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const deal = await prisma.deal.findFirst({ where: { id, deletedAt: null }, select: dealSelect });
  if (!deal) throw notFound();
  return deal;
}

export async function createDeal(principal: AuthPrincipal, input: CreateDealInput, ip: string | null) {
  if (input.clientId) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } });
    if (!client) throw badRequest('Unknown clientId');
  }
  const owner = await prisma.user.findFirst({ where: { id: input.ownerUserId, deletedAt: null }, select: { id: true } });
  if (!owner) throw badRequest('Unknown ownerUserId');
  const id = uuidv7();
  const deal = await prisma.deal.create({
    data: {
      id, clientId: input.clientId ?? null, title: input.title, stage: input.stage,
      valueInr: input.valueInr !== undefined ? paiseToDecimalString(toPaise(input.valueInr)) : null,
      probability: input.probability ?? null, ownerUserId: input.ownerUserId,
      expectedClose: input.expectedClose ? new Date(input.expectedClose) : null,
      lostReason: input.lostReason ?? null,
    },
    select: dealSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'deal.create', entityType: 'deal', entityId: id, after: { title: input.title, stage: input.stage }, ip });
  return deal;
}

export async function updateDeal(principal: AuthPrincipal, id: string, input: UpdateDealInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.deal.findFirst({ where: { id, deletedAt: null }, select: { id: true, stage: true } });
  if (!before) throw notFound();
  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.stage !== undefined ? { stage: input.stage } : {}),
      ...(input.valueInr !== undefined ? { valueInr: input.valueInr === undefined ? undefined : paiseToDecimalString(toPaise(input.valueInr)) } : {}),
      ...(input.probability !== undefined ? { probability: input.probability } : {}),
      ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
      ...(input.expectedClose !== undefined ? { expectedClose: input.expectedClose ? new Date(input.expectedClose) : null } : {}),
      ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
    },
    select: dealSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'deal.update', entityType: 'deal', entityId: id, before: { stage: before.stage }, after: { stage: deal.stage }, ip });
  return deal;
}

export async function softDeleteDeal(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const existing = await prisma.deal.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.deal.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'deal.delete', entityType: 'deal', entityId: id, ip });
}
