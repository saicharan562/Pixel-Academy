import { Router } from 'express';
import {
  CreateTaskSchema, UpdateTaskSchema, TaskListQuerySchema, TaskDependencySchema,
  PERMISSIONS, type TaskListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as tasks from './tasks-service.js';

export const tasksRouter = Router();
tasksRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

tasksRouter.get(
  '/',
  requirePermission(PERMISSIONS.TASK_VIEW),
  validateQuery(TaskListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: TaskListQuery }).validatedQuery;
    res.json(await tasks.listTasks(principalOf(req), query));
  }),
);

tasksRouter.post(
  '/',
  requirePermission(PERMISSIONS.TASK_CREATE),
  validateBody(CreateTaskSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await tasks.createTask(principalOf(req), req.body, ipOf(req)));
  }),
);

tasksRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.TASK_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await tasks.getTask(principalOf(req), req.params.id));
  }),
);

tasksRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.TASK_EDIT),
  validateBody(UpdateTaskSchema),
  asyncHandler(async (req, res) => {
    res.json(await tasks.updateTask(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

tasksRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.TASK_DELETE),
  asyncHandler(async (req, res) => {
    await tasks.softDeleteTask(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);

tasksRouter.post(
  '/:id/dependencies',
  requirePermission(PERMISSIONS.TASK_EDIT),
  validateBody(TaskDependencySchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await tasks.addDependency(principalOf(req), req.params.id, req.body.dependsOnTaskId, ipOf(req)));
  }),
);

tasksRouter.delete(
  '/:id/dependencies/:dependsOnTaskId',
  requirePermission(PERMISSIONS.TASK_EDIT),
  asyncHandler(async (req, res) => {
    res.json(await tasks.removeDependency(principalOf(req), req.params.id, req.params.dependsOnTaskId, ipOf(req)));
  }),
);
