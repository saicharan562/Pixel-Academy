import { Router } from 'express';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectListQuerySchema,
  SetProjectMembersSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  PERMISSIONS,
  type ProjectListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as projects from './projects-service.js';

export const projectsRouter = Router();
projectsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

projectsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  validateQuery(ProjectListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: ProjectListQuery }).validatedQuery;
    res.json(await projects.listProjects(principalOf(req), query));
  }),
);

projectsRouter.post(
  '/',
  requirePermission(PERMISSIONS.PROJECT_CREATE),
  validateBody(CreateProjectSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await projects.createProject(principalOf(req), req.body, ipOf(req)));
  }),
);

projectsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await projects.getProject(principalOf(req), req.params.id));
  }),
);

projectsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_EDIT),
  validateBody(UpdateProjectSchema),
  asyncHandler(async (req, res) => {
    res.json(await projects.updateProject(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

projectsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_DELETE),
  asyncHandler(async (req, res) => {
    await projects.softDeleteProject(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);

projectsRouter.put(
  '/:id/members',
  requirePermission(PERMISSIONS.PROJECT_EDIT),
  validateBody(SetProjectMembersSchema),
  asyncHandler(async (req, res) => {
    res.json(await projects.setMembers(principalOf(req), req.params.id, req.body.userIds, ipOf(req)));
  }),
);

// ── Milestones ──

projectsRouter.post(
  '/:id/milestones',
  requirePermission(PERMISSIONS.MILESTONE_CREATE),
  validateBody(CreateMilestoneSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await projects.addMilestone(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

projectsRouter.patch(
  '/:id/milestones/:milestoneId',
  requirePermission(PERMISSIONS.MILESTONE_EDIT),
  validateBody(UpdateMilestoneSchema),
  asyncHandler(async (req, res) => {
    res.json(await projects.updateMilestone(principalOf(req), req.params.id, req.params.milestoneId, req.body, ipOf(req)));
  }),
);

projectsRouter.delete(
  '/:id/milestones/:milestoneId',
  requirePermission(PERMISSIONS.MILESTONE_DELETE),
  asyncHandler(async (req, res) => {
    await projects.removeMilestone(principalOf(req), req.params.id, req.params.milestoneId, ipOf(req));
    res.status(204).send();
  }),
);
