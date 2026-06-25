import type {
  AuthPrincipal, CreateContractInput, UpdateContractInput, ContractListQuery,
} from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { toPaise, paiseToDecimalString } from '../../lib/money.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Contracts (§ Revenue depth). Client-scoped like invoices. Expiry → `expiring`/`expired`
 * transitions are driven by the contract-expiry scheduler; this service owns CRUD + manual
 * status changes (e.g. terminate).
 */

const contractSelect = {
  id: true, clientId: true, projectId: true, title: true, documentId: true, valueInr: true,
  startDate: true, endDate: true, status: true, autoRenew: true, createdAt: true, updatedAt: true,
  client: { select: { displayName: true } },
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
        where: { userId: principal.userId }, select: { project: { select: { clientId: true } } },
      });
      const clientIds = memberProjects.map((m) => m.project.clientId);
      return { ...base, client: { OR: [{ ownerUserId: principal.userId }, { id: { in: clientIds } }] } };
    }
  }
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const where = await scopeWhere(principal);
  const found = await prisma.contract.findFirst({ where: { ...where, id }, select: { id: true } });
  if (!found) throw notFound();
}

export async function listContracts(principal: AuthPrincipal, query: ContractListQuery) {
  const scope = await scopeWhere(principal);
  let endDateFilter: Record<string, unknown> | undefined;
  if (query.expiringInDays) {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + query.expiringInDays);
    endDateFilter = { lte: until, gte: new Date() };
  }
  const where = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(endDateFilter ? { endDate: endDateFilter } : {}),
  };
  const rows = await prisma.contract.findMany({ where, select: contractSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getContract(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const contract = await prisma.contract.findFirst({ where: { id, deletedAt: null }, select: contractSelect });
  if (!contract) throw notFound();
  return contract;
}

export async function createContract(principal: AuthPrincipal, input: CreateContractInput, ip: string | null) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } });
  if (!client) throw badRequest('Unknown clientId');
  if (input.projectId) {
    const project = await prisma.project.findFirst({ where: { id: input.projectId, clientId: input.clientId, deletedAt: null }, select: { id: true } });
    if (!project) throw badRequest('projectId does not belong to this client');
  }
  const id = uuidv7();
  const contract = await prisma.contract.create({
    data: {
      id, clientId: input.clientId, projectId: input.projectId ?? null, title: input.title,
      documentId: input.documentId ?? null,
      valueInr: input.valueInr !== undefined ? paiseToDecimalString(toPaise(input.valueInr)) : null,
      startDate: new Date(input.startDate), endDate: new Date(input.endDate),
      status: input.status, autoRenew: input.autoRenew,
    },
    select: contractSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'contract.create', entityType: 'contract', entityId: id, after: { title: input.title, status: input.status }, ip });
  return contract;
}

export async function updateContract(principal: AuthPrincipal, id: string, input: UpdateContractInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.contract.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
  if (!before) throw notFound();
  const updated = await prisma.contract.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId ?? null } : {}),
      ...(input.documentId !== undefined ? { documentId: input.documentId ?? null } : {}),
      ...(input.valueInr !== undefined ? { valueInr: input.valueInr === null ? null : paiseToDecimalString(toPaise(input.valueInr)) } : {}),
      ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.autoRenew !== undefined ? { autoRenew: input.autoRenew } : {}),
    },
    select: contractSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'contract.update', entityType: 'contract', entityId: id, before: { status: before.status }, after: { status: updated.status }, ip });
  return updated;
}

export async function softDeleteContract(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const existing = await prisma.contract.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.contract.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'contract.delete', entityType: 'contract', entityId: id, ip });
}
