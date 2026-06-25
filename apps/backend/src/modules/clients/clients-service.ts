import type { AuthPrincipal } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import type {
  CreateClientInput,
  UpdateClientInput,
  CreateContactInput,
  UpdateContactInput,
  ClientListQuery,
} from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Clients module service (§ Phase 1). Owns all client + contact business logic and
 * row-scope (layer 2). Capability (layer 1) is enforced by the route middleware.
 *
 * Row scope:
 *  - Admin / Manager: org-wide (Manager manages the client book).
 *  - Staff: assigned only — clients they own (owner_user_id) or are a project member of.
 *  - Client (portal): their own client row only.
 */

const clientSelect = {
  id: true,
  legalName: true,
  displayName: true,
  gstin: true,
  stateCode: true,
  billingAddress: true,
  email: true,
  phone: true,
  ownerUserId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Build the list `where` filter for the caller's scope. */
async function scopeWhere(principal: AuthPrincipal): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = { deletedAt: null };

  switch (principal.role) {
    case ROLE.ADMIN:
    case ROLE.MANAGER:
      return base;
    case ROLE.CLIENT:
      return { ...base, id: principal.clientId ?? '__none__' };
    case ROLE.STAFF:
    default: {
      // Assigned = owns the client OR is a member of one of its projects.
      const memberProjects = await prisma.projectMember.findMany({
        where: { userId: principal.userId },
        select: { project: { select: { clientId: true } } },
      });
      const clientIds = memberProjects.map((m) => m.project.clientId);
      return {
        ...base,
        OR: [{ ownerUserId: principal.userId }, { id: { in: clientIds } }],
      };
    }
  }
}

/** Assert the caller may see/act on a specific client; throw 404 if out of scope. */
async function assertVisible(principal: AuthPrincipal, clientId: string): Promise<void> {
  const where = await scopeWhere(principal);
  const visible = await prisma.client.findFirst({ where: { ...where, id: clientId }, select: { id: true } });
  if (!visible) throw notFound();
}

export async function listClients(principal: AuthPrincipal, query: ClientListQuery) {
  const scope = await scopeWhere(principal);
  const where = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { displayName: { contains: query.search, mode: 'insensitive' as const } },
            { legalName: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const rows = await prisma.client.findMany({ where, select: clientSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getClient(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    select: { ...clientSelect, contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } } },
  });
  if (!client) throw notFound();
  return client;
}

export async function createClient(principal: AuthPrincipal, input: CreateClientInput, ip: string | null) {
  if (input.ownerUserId) {
    const owner = await prisma.user.findFirst({ where: { id: input.ownerUserId, deletedAt: null }, select: { id: true } });
    if (!owner) throw badRequest('Unknown ownerUserId');
  }
  const client = await prisma.client.create({
    data: {
      id: uuidv7(),
      legalName: input.legalName,
      displayName: input.displayName,
      gstin: input.gstin ?? null,
      stateCode: input.stateCode,
      billingAddress: input.billingAddress,
      email: input.email ?? null,
      phone: input.phone ?? null,
      ownerUserId: input.ownerUserId ?? null,
      status: input.status,
    },
    select: clientSelect,
  });
  await writeAudit({
    actorId: principal.userId,
    action: 'client.create',
    entityType: 'client',
    entityId: client.id,
    after: { displayName: client.displayName, status: client.status },
    ip,
  });
  return client;
}

export async function updateClient(principal: AuthPrincipal, id: string, input: UpdateClientInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw notFound();

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.gstin !== undefined ? { gstin: input.gstin } : {}),
      ...(input.stateCode !== undefined ? { stateCode: input.stateCode } : {}),
      ...(input.billingAddress !== undefined ? { billingAddress: input.billingAddress } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    select: clientSelect,
  });
  await writeAudit({
    actorId: principal.userId,
    action: 'client.update',
    entityType: 'client',
    entityId: id,
    before: { status: before.status, displayName: before.displayName },
    after: input as Record<string, never>,
    ip,
  });
  return updated;
}

export async function softDeleteClient(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const existing = await prisma.client.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'client.delete', entityType: 'client', entityId: id, ip });
}

// ───────────────────────── Contacts ─────────────────────────

export async function listContacts(principal: AuthPrincipal, clientId: string) {
  await assertVisible(principal, clientId);
  return prisma.clientContact.findMany({
    where: { clientId, deletedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
}

export async function addContact(principal: AuthPrincipal, clientId: string, input: CreateContactInput, ip: string | null) {
  await assertVisible(principal, clientId);
  const contact = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.clientContact.updateMany({ where: { clientId, isPrimary: true }, data: { isPrimary: false } });
    }
    return tx.clientContact.create({
      data: {
        id: uuidv7(),
        clientId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        isPrimary: input.isPrimary,
      },
    });
  });
  await writeAudit({ actorId: principal.userId, action: 'client.contact.create', entityType: 'client_contact', entityId: contact.id, ip });
  return contact;
}

export async function updateContact(
  principal: AuthPrincipal,
  clientId: string,
  contactId: string,
  input: UpdateContactInput,
  ip: string | null,
) {
  await assertVisible(principal, clientId);
  const existing = await prisma.clientContact.findFirst({ where: { id: contactId, clientId, deletedAt: null } });
  if (!existing) throw notFound();
  const updated = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.clientContact.updateMany({ where: { clientId, isPrimary: true, NOT: { id: contactId } }, data: { isPrimary: false } });
    }
    return tx.clientContact.update({ where: { id: contactId }, data: input });
  });
  await writeAudit({ actorId: principal.userId, action: 'client.contact.update', entityType: 'client_contact', entityId: contactId, ip });
  return updated;
}

export async function removeContact(principal: AuthPrincipal, clientId: string, contactId: string, ip: string | null) {
  await assertVisible(principal, clientId);
  const existing = await prisma.clientContact.findFirst({ where: { id: contactId, clientId, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.clientContact.update({ where: { id: contactId }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'client.contact.delete', entityType: 'client_contact', entityId: contactId, ip });
}
