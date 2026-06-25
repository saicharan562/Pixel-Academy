import { Router } from 'express';
import {
  CreateLeaveTypeSchema, UpdateLeaveTypeSchema, CreateLeaveRequestSchema, DecideLeaveRequestSchema,
  LeaveListQuerySchema, PERMISSIONS, type LeaveListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as leaves from './leaves-service.js';

export const leavesRouter = Router();
leavesRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

// ── Leave types (HR config; guarded by approve capability) ──
leavesRouter.get(
  '/types',
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  asyncHandler(async (_req, res) => res.json(await leaves.listLeaveTypes())),
);
leavesRouter.post(
  '/types',
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  validateBody(CreateLeaveTypeSchema),
  asyncHandler(async (req, res) => res.status(201).json(await leaves.createLeaveType(principalOf(req), req.body, ipOf(req)))),
);
leavesRouter.patch(
  '/types/:id',
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  validateBody(UpdateLeaveTypeSchema),
  asyncHandler(async (req, res) => res.json(await leaves.updateLeaveType(principalOf(req), req.params.id, req.body, ipOf(req)))),
);

// ── Balances ──
leavesRouter.get(
  '/balances',
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getUTCFullYear();
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    res.json(await leaves.listBalances(principalOf(req), userId, year));
  }),
);

// ── Requests ──
leavesRouter.get(
  '/requests',
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  validateQuery(LeaveListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: LeaveListQuery }).validatedQuery;
    res.json(await leaves.listLeaveRequests(principalOf(req), query));
  }),
);
leavesRouter.post(
  '/requests',
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  validateBody(CreateLeaveRequestSchema),
  asyncHandler(async (req, res) => res.status(201).json(await leaves.createLeaveRequest(principalOf(req), req.body, ipOf(req)))),
);
leavesRouter.post(
  '/requests/:id/decision',
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  validateBody(DecideLeaveRequestSchema),
  asyncHandler(async (req, res) => res.json(await leaves.decideLeaveRequest(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
leavesRouter.post(
  '/requests/:id/cancel',
  requirePermission(PERMISSIONS.LEAVE_VIEW),
  asyncHandler(async (req, res) => res.json(await leaves.cancelLeaveRequest(principalOf(req), req.params.id, ipOf(req)))),
);
