import type {
  AuthPrincipal,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectListQuery,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Projects + Milestones service (Phase 1).
 * Scope: Admin/Manager org-wide; Staff = projects they manage or are a member of;
 * Client (portal) = their own client's projects, read-only (enforced by route perms).
 */

const projectSelect = {
  id: true,
  clientId: true,
  name: true,
  code: true,
  status: true,
  startDate: true,
  endDate: true,
  budgetInr: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { displayName: true } },
  manager: { select: { fullName: true } },
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
    default:
      return {
        ...base,
        OR: [{ managerId: principal.userId }, { members: { some: { userId: principal.userId } } }],
      };
  }
}

async function assertVisible(principal: AuthPrincipal, id: string): Promise<void> {
  const where = await scopeWhere(principal);
  const found = await prisma.project.findFirst({ where: { ...where, id }, select: { id: true } });
  if (!found) throw notFound();
}

const toDate = (s?: string) => (s ? new Date(s) : null);

export async function listProjects(principal: AuthPrincipal, query: ProjectListQuery) {
  const scope = await scopeWhere(principal);
  const where = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };
  const rows = await prisma.project.findMany({ where, select: projectSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getProject(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...projectSelect,
      members: { select: { userId: true, roleInProject: true, user: { select: { fullName: true } } } },
      milestones: { where: { deletedAt: null }, orderBy: { orderIndex: 'asc' } },
    },
  });
  if (!project) throw notFound();
  return project;
}

export async function createProject(principal: AuthPrincipal, input: CreateProjectInput, ip: string | null) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null }, select: { id: true } });
  if (!client) throw badRequest('Unknown clientId');
  const manager = await prisma.user.findFirst({
    where: { id: input.managerId, deletedAt: null },
    select: { id: true, role: { select: { name: true } } },
  });
  if (!manager) throw badRequest('Unknown managerId');
  if (manager.role.name === ROLE.CLIENT) throw badRequest('Project manager must be an internal user');

  const project = await prisma.project.create({
    data: {
      id: uuidv7(),
      clientId: input.clientId,
      name: input.name,
      code: input.code ?? null,
      status: input.status,
      startDate: toDate(input.startDate),
      endDate: toDate(input.endDate),
      budgetInr: input.budgetInr ?? null,
      managerId: input.managerId,
    },
    select: projectSelect,
  });
  await writeAudit({
    actorId: principal.userId,
    action: 'project.create',
    entityType: 'project',
    entityId: project.id,
    after: { name: project.name, clientId: project.clientId, status: project.status },
    ip,
  });
  return project;
}

export async function updateProject(principal: AuthPrincipal, id: string, input: UpdateProjectInput, ip: string | null) {
  await assertVisible(principal, id);
  const before = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw notFound();
  if (input.managerId) {
    const manager = await prisma.user.findFirst({ where: { id: input.managerId, deletedAt: null }, select: { id: true } });
    if (!manager) throw badRequest('Unknown managerId');
  }
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: toDate(input.startDate) } : {}),
      ...(input.endDate !== undefined ? { endDate: toDate(input.endDate) } : {}),
      ...(input.budgetInr !== undefined ? { budgetInr: input.budgetInr } : {}),
      ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
    },
    select: projectSelect,
  });
  await writeAudit({
    actorId: principal.userId,
    action: 'project.update',
    entityType: 'project',
    entityId: id,
    before: { status: before.status, name: before.name },
    after: input as Record<string, never>,
    ip,
  });
  return updated;
}

export async function softDeleteProject(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const found = await prisma.project.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!found) throw notFound();
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'project.delete', entityType: 'project', entityId: id, ip });
}

export async function setMembers(principal: AuthPrincipal, projectId: string, userIds: string[], ip: string | null) {
  await assertVisible(principal, projectId);
  const valid = await prisma.user.findMany({ where: { id: { in: userIds }, deletedAt: null }, select: { id: true } });
  if (valid.length !== userIds.length) throw badRequest('One or more userIds are unknown');
  await prisma.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({ where: { projectId } });
    if (userIds.length) {
      await tx.projectMember.createMany({ data: userIds.map((userId) => ({ projectId, userId })) });
    }
  });
  await writeAudit({ actorId: principal.userId, action: 'project.members.set', entityType: 'project', entityId: projectId, after: { userIds }, ip });
  return getProject(principal, projectId);
}

// ───────────────────────── Milestones ─────────────────────────

export async function addMilestone(principal: AuthPrincipal, projectId: string, input: CreateMilestoneInput, ip: string | null) {
  await assertVisible(principal, projectId);
  const milestone = await prisma.milestone.create({
    data: {
      id: uuidv7(),
      projectId,
      name: input.name,
      dueDate: toDate(input.dueDate),
      status: input.status,
      orderIndex: input.orderIndex,
    },
  });
  await writeAudit({ actorId: principal.userId, action: 'milestone.create', entityType: 'milestone', entityId: milestone.id, ip });
  return milestone;
}

export async function updateMilestone(
  principal: AuthPrincipal,
  projectId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
  ip: string | null,
) {
  await assertVisible(principal, projectId);
  const existing = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId, deletedAt: null } });
  if (!existing) throw notFound();
  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.dueDate !== undefined ? { dueDate: toDate(input.dueDate) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
    },
  });
  await writeAudit({ actorId: principal.userId, action: 'milestone.update', entityType: 'milestone', entityId: milestoneId, ip });
  return updated;
}

export async function removeMilestone(principal: AuthPrincipal, projectId: string, milestoneId: string, ip: string | null) {
  await assertVisible(principal, projectId);
  const existing = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.milestone.update({ where: { id: milestoneId }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'milestone.delete', entityType: 'milestone', entityId: milestoneId, ip });
}
