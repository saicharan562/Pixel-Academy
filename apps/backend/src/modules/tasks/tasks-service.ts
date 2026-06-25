import type {
  AuthPrincipal, CreateTaskInput, UpdateTaskInput, TaskListQuery,
} from '@pixel/shared';
import { ROLE, TASK_TRANSITIONS } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, badRequest, unprocessable } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Tasks service (Phase 1): subtasks (parentTaskId), dependencies, and status-transition
 * guards. A task is visible when its project is visible to the caller, or it is assigned
 * to the caller. Moving a task to `done` requires every dependency to be `done`.
 */

const taskSelect = {
  id: true, projectId: true, milestoneId: true, parentTaskId: true, title: true,
  description: true, assigneeId: true, status: true, priority: true, dueDate: true,
  estimateMinutes: true, createdAt: true, updatedAt: true,
  assignee: { select: { fullName: true } },
  project: { select: { name: true } },
} as const;

function scopeWhere(principal: AuthPrincipal): Record<string, unknown> {
  const base: Record<string, unknown> = { deletedAt: null };
  switch (principal.role) {
    case ROLE.ADMIN:
    case ROLE.MANAGER:
      return base;
    case ROLE.CLIENT:
      return { ...base, project: { clientId: principal.clientId ?? '__none__' } };
    case ROLE.STAFF:
    default:
      return {
        ...base,
        OR: [
          { assigneeId: principal.userId },
          { project: { managerId: principal.userId } },
          { project: { members: { some: { userId: principal.userId } } } },
        ],
      };
  }
}

async function assertVisible(principal: AuthPrincipal, id: string) {
  const found = await prisma.task.findFirst({ where: { ...scopeWhere(principal), id }, select: { id: true } });
  if (!found) throw notFound();
}

const toDate = (s?: string | null) => (s ? new Date(s) : null);

export async function listTasks(principal: AuthPrincipal, query: TaskListQuery) {
  const where = {
    ...scopeWhere(principal),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };
  const rows = await prisma.task.findMany({ where, select: taskSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getTask(principal: AuthPrincipal, id: string) {
  await assertVisible(principal, id);
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...taskSelect,
      subtasks: { where: { deletedAt: null }, select: { id: true, title: true, status: true } },
      dependencies: { select: { dependsOnTaskId: true, dependsOn: { select: { title: true, status: true } } } },
    },
  });
  if (!task) throw notFound();
  return task;
}

export async function createTask(principal: AuthPrincipal, input: CreateTaskInput, ip: string | null) {
  // Project must be visible to the caller.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) throw badRequest('Unknown projectId');

  if (input.milestoneId) {
    const ms = await prisma.milestone.findFirst({ where: { id: input.milestoneId, projectId: input.projectId, deletedAt: null }, select: { id: true } });
    if (!ms) throw badRequest('milestoneId does not belong to this project');
  }
  if (input.parentTaskId) {
    const parent = await prisma.task.findFirst({ where: { id: input.parentTaskId, projectId: input.projectId, deletedAt: null }, select: { id: true } });
    if (!parent) throw badRequest('parentTaskId does not belong to this project');
  }
  if (input.assigneeId) {
    const a = await prisma.user.findFirst({ where: { id: input.assigneeId, deletedAt: null }, select: { id: true } });
    if (!a) throw badRequest('Unknown assigneeId');
  }

  const task = await prisma.task.create({
    data: {
      id: uuidv7(),
      projectId: input.projectId,
      milestoneId: input.milestoneId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      status: input.status,
      priority: input.priority,
      dueDate: toDate(input.dueDate),
      estimateMinutes: input.estimateMinutes ?? null,
    },
    select: taskSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'task.create', entityType: 'task', entityId: task.id, after: { title: task.title, projectId: task.projectId }, ip });
  return task;
}

export async function updateTask(principal: AuthPrincipal, id: string, input: UpdateTaskInput, ip: string | null) {
  await assertVisible(principal, id);
  const current = await prisma.task.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw notFound();

  // Status-transition guard.
  if (input.status && input.status !== current.status) {
    const allowed = TASK_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw unprocessable(`Illegal status transition: ${current.status} → ${input.status}`);
    }
    if (input.status === 'done') {
      const deps = await prisma.taskDependency.findMany({
        where: { taskId: id },
        select: { dependsOn: { select: { status: true } } },
      });
      const blocking = deps.filter((d) => d.dependsOn.status !== 'done').length;
      if (blocking > 0) throw unprocessable(`Cannot complete: ${blocking} dependency(ies) not done`);
    }
  }
  if (input.assigneeId) {
    const a = await prisma.user.findFirst({ where: { id: input.assigneeId, deletedAt: null }, select: { id: true } });
    if (!a) throw badRequest('Unknown assigneeId');
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.milestoneId !== undefined ? { milestoneId: input.milestoneId } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueDate !== undefined ? { dueDate: toDate(input.dueDate) } : {}),
      ...(input.estimateMinutes !== undefined ? { estimateMinutes: input.estimateMinutes } : {}),
    },
    select: taskSelect,
  });
  await writeAudit({ actorId: principal.userId, action: 'task.update', entityType: 'task', entityId: id, before: { status: current.status }, after: input as Record<string, never>, ip });
  return updated;
}

export async function softDeleteTask(principal: AuthPrincipal, id: string, ip: string | null) {
  await assertVisible(principal, id);
  const found = await prisma.task.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!found) throw notFound();
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'task.delete', entityType: 'task', entityId: id, ip });
}

export async function addDependency(principal: AuthPrincipal, taskId: string, dependsOnTaskId: string, ip: string | null) {
  await assertVisible(principal, taskId);
  if (taskId === dependsOnTaskId) throw badRequest('A task cannot depend on itself');
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null }, select: { projectId: true } });
  const dep = await prisma.task.findFirst({ where: { id: dependsOnTaskId, deletedAt: null }, select: { projectId: true } });
  if (!task || !dep) throw notFound();
  if (task.projectId !== dep.projectId) throw badRequest('Dependencies must be within the same project');
  // Prevent a direct 2-cycle (full cycle detection deferred — see STATUS.md).
  const reverse = await prisma.taskDependency.findFirst({ where: { taskId: dependsOnTaskId, dependsOnTaskId: taskId } });
  if (reverse) throw unprocessable('That would create a circular dependency');

  await prisma.taskDependency.create({ data: { taskId, dependsOnTaskId } });
  await writeAudit({ actorId: principal.userId, action: 'task.dependency.add', entityType: 'task', entityId: taskId, after: { dependsOnTaskId }, ip });
  return getTask(principal, taskId);
}

export async function removeDependency(principal: AuthPrincipal, taskId: string, dependsOnTaskId: string, ip: string | null) {
  await assertVisible(principal, taskId);
  await prisma.taskDependency.deleteMany({ where: { taskId, dependsOnTaskId } });
  await writeAudit({ actorId: principal.userId, action: 'task.dependency.remove', entityType: 'task', entityId: taskId, after: { dependsOnTaskId }, ip });
  return getTask(principal, taskId);
}
