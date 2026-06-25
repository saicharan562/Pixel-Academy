import { Router } from 'express';
import {
  CreateKbDocumentSchema, UpdateKbDocumentSchema, KbListQuerySchema, AiQuerySchema,
  PERMISSIONS, type KbListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as kb from './kb-service.js';
import * as ai from '../ai/ai-service.js';

export const kbRouter = Router();
kbRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

// POST /kb/ask — AI assistant (RAG over the KB). Declared before /:id.
kbRouter.post(
  '/ask',
  requirePermission(PERMISSIONS.AI_USE),
  validateBody(AiQuerySchema),
  asyncHandler(async (req, res) => res.json(await ai.answer(principalOf(req), req.body))),
);

kbRouter.get(
  '/',
  requirePermission(PERMISSIONS.KB_VIEW),
  validateQuery(KbListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: KbListQuery }).validatedQuery;
    res.json(await kb.listKb(principalOf(req), query));
  }),
);
kbRouter.post(
  '/',
  requirePermission(PERMISSIONS.KB_CREATE),
  validateBody(CreateKbDocumentSchema),
  asyncHandler(async (req, res) => res.status(201).json(await kb.createKb(principalOf(req), req.body, ipOf(req)))),
);
kbRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.KB_VIEW),
  asyncHandler(async (req, res) => res.json(await kb.getKb(principalOf(req), req.params.id))),
);
kbRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.KB_EDIT),
  validateBody(UpdateKbDocumentSchema),
  asyncHandler(async (req, res) => res.json(await kb.updateKb(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
kbRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.KB_DELETE),
  asyncHandler(async (req, res) => {
    await kb.softDeleteKb(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);
