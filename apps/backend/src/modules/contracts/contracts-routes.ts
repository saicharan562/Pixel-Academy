import { Router } from 'express';
import {
  CreateContractSchema, UpdateContractSchema, ContractListQuerySchema, PERMISSIONS, type ContractListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as contracts from './contracts-service.js';

export const contractsRouter = Router();
contractsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

contractsRouter.get(
  '/',
  requirePermission(PERMISSIONS.CONTRACT_VIEW),
  validateQuery(ContractListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: ContractListQuery }).validatedQuery;
    res.json(await contracts.listContracts(principalOf(req), query));
  }),
);

contractsRouter.post(
  '/',
  requirePermission(PERMISSIONS.CONTRACT_CREATE),
  validateBody(CreateContractSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await contracts.createContract(principalOf(req), req.body, ipOf(req)));
  }),
);

contractsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CONTRACT_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await contracts.getContract(principalOf(req), req.params.id));
  }),
);

contractsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.CONTRACT_EDIT),
  validateBody(UpdateContractSchema),
  asyncHandler(async (req, res) => {
    res.json(await contracts.updateContract(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

contractsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.CONTRACT_DELETE),
  asyncHandler(async (req, res) => {
    await contracts.softDeleteContract(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);
