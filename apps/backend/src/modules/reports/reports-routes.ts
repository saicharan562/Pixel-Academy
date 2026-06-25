import { Router } from 'express';
import { ReportQuerySchema, PERMISSIONS, type ReportQuery } from '@pixel/shared';
import { asyncHandler, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as reports from './reports-service.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;

// GET /reports/dashboard — headline metrics for the dashboard (scoped to the caller).
reportsRouter.get(
  '/dashboard',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  asyncHandler(async (req, res) => res.json(await reports.dashboardSummary(principalOf(req)))),
);

// GET /reports/financial — revenue + tax summary over a window (Admin/Manager).
reportsRouter.get(
  '/financial',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validateQuery(ReportQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: ReportQuery }).validatedQuery;
    res.json(await reports.financialSummary(principalOf(req), query));
  }),
);
