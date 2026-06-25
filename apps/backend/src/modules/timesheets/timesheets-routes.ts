import { Router } from 'express';
import {
  CreateTimesheetSchema, UpdateTimesheetSchema, TimesheetListQuerySchema, DecideTimesheetSchema,
  PERMISSIONS, type TimesheetListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as timesheets from './timesheets-service.js';

export const timesheetsRouter = Router();
timesheetsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

timesheetsRouter.get(
  '/',
  requirePermission(PERMISSIONS.TIMESHEET_VIEW),
  validateQuery(TimesheetListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: TimesheetListQuery }).validatedQuery;
    res.json(await timesheets.listTimesheets(principalOf(req), query));
  }),
);
timesheetsRouter.post(
  '/',
  requirePermission(PERMISSIONS.TIMESHEET_CREATE),
  validateBody(CreateTimesheetSchema),
  asyncHandler(async (req, res) => res.status(201).json(await timesheets.createTimesheet(principalOf(req), req.body, ipOf(req)))),
);
timesheetsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.TIMESHEET_EDIT),
  validateBody(UpdateTimesheetSchema),
  asyncHandler(async (req, res) => res.json(await timesheets.updateTimesheet(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
timesheetsRouter.post(
  '/:id/submit',
  requirePermission(PERMISSIONS.TIMESHEET_EDIT),
  asyncHandler(async (req, res) => res.json(await timesheets.submitTimesheet(principalOf(req), req.params.id, ipOf(req)))),
);
timesheetsRouter.post(
  '/:id/decision',
  requirePermission(PERMISSIONS.TIMESHEET_APPROVE),
  validateBody(DecideTimesheetSchema),
  asyncHandler(async (req, res) => res.json(await timesheets.decideTimesheet(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
timesheetsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.TIMESHEET_DELETE),
  asyncHandler(async (req, res) => {
    await timesheets.deleteTimesheet(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);
