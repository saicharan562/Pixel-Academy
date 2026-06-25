import { Router } from 'express';
import { CreateDealSchema, UpdateDealSchema, DealListQuerySchema, PERMISSIONS, type DealListQuery } from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as deals from './deals-service.js';

export const dealsRouter = Router();
dealsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

dealsRouter.get(
  '/',
  requirePermission(PERMISSIONS.DEAL_VIEW),
  validateQuery(DealListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: DealListQuery }).validatedQuery;
    res.json(await deals.listDeals(principalOf(req), query));
  }),
);
dealsRouter.post(
  '/',
  requirePermission(PERMISSIONS.DEAL_CREATE),
  validateBody(CreateDealSchema),
  asyncHandler(async (req, res) => res.status(201).json(await deals.createDeal(principalOf(req), req.body, ipOf(req)))),
);
dealsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.DEAL_VIEW),
  asyncHandler(async (req, res) => res.json(await deals.getDeal(principalOf(req), req.params.id))),
);
dealsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.DEAL_EDIT),
  validateBody(UpdateDealSchema),
  asyncHandler(async (req, res) => res.json(await deals.updateDeal(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
dealsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.DEAL_DELETE),
  asyncHandler(async (req, res) => {
    await deals.softDeleteDeal(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);
