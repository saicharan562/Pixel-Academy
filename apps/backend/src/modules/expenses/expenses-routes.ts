import { Router } from 'express';
import {
  CreateExpenseSchema, UpdateExpenseSchema, ExpenseListQuerySchema, DecideExpenseSchema,
  PERMISSIONS, type ExpenseListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as expenses from './expenses-service.js';

export const expensesRouter = Router();
expensesRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

expensesRouter.get(
  '/',
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  validateQuery(ExpenseListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: ExpenseListQuery }).validatedQuery;
    res.json(await expenses.listExpenses(principalOf(req), query));
  }),
);

expensesRouter.post(
  '/',
  requirePermission(PERMISSIONS.EXPENSE_CREATE),
  validateBody(CreateExpenseSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await expenses.createExpense(principalOf(req), req.body, ipOf(req)));
  }),
);

expensesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSE_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await expenses.getExpense(principalOf(req), req.params.id));
  }),
);

expensesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSE_EDIT),
  validateBody(UpdateExpenseSchema),
  asyncHandler(async (req, res) => {
    res.json(await expenses.updateExpense(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

expensesRouter.post(
  '/:id/decision',
  requirePermission(PERMISSIONS.EXPENSE_APPROVE),
  validateBody(DecideExpenseSchema),
  asyncHandler(async (req, res) => {
    res.json(await expenses.decideExpense(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

expensesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.EXPENSE_DELETE),
  asyncHandler(async (req, res) => {
    await expenses.softDeleteExpense(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);
