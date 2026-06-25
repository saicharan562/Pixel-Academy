import { Router } from 'express';
import {
  CreateSlaPolicySchema, UpdateSlaPolicySchema, CreateTicketSchema, UpdateTicketSchema,
  TicketTransitionSchema, CreateTicketCommentSchema, TicketListQuerySchema,
  PERMISSIONS, type TicketListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as tickets from './tickets-service.js';

export const ticketsRouter = Router();
ticketsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

// ── SLA policies (config; guarded by ticket approve capability) ──
ticketsRouter.get(
  '/sla-policies',
  requirePermission(PERMISSIONS.TICKET_VIEW),
  asyncHandler(async (_req, res) => res.json(await tickets.listSlaPolicies())),
);
ticketsRouter.post(
  '/sla-policies',
  requirePermission(PERMISSIONS.TICKET_APPROVE),
  validateBody(CreateSlaPolicySchema),
  asyncHandler(async (req, res) => res.status(201).json(await tickets.createSlaPolicy(principalOf(req), req.body, ipOf(req)))),
);
ticketsRouter.patch(
  '/sla-policies/:id',
  requirePermission(PERMISSIONS.TICKET_APPROVE),
  validateBody(UpdateSlaPolicySchema),
  asyncHandler(async (req, res) => res.json(await tickets.updateSlaPolicy(principalOf(req), req.params.id, req.body, ipOf(req)))),
);

// ── Tickets ──
ticketsRouter.get(
  '/',
  requirePermission(PERMISSIONS.TICKET_VIEW),
  validateQuery(TicketListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: TicketListQuery }).validatedQuery;
    res.json(await tickets.listTickets(principalOf(req), query));
  }),
);
ticketsRouter.post(
  '/',
  requirePermission(PERMISSIONS.TICKET_CREATE),
  validateBody(CreateTicketSchema),
  asyncHandler(async (req, res) => res.status(201).json(await tickets.createTicket(principalOf(req), req.body, ipOf(req)))),
);
ticketsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.TICKET_VIEW),
  asyncHandler(async (req, res) => res.json(await tickets.getTicket(principalOf(req), req.params.id))),
);
ticketsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.TICKET_EDIT),
  validateBody(UpdateTicketSchema),
  asyncHandler(async (req, res) => res.json(await tickets.updateTicket(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
ticketsRouter.post(
  '/:id/transition',
  requirePermission(PERMISSIONS.TICKET_EDIT),
  validateBody(TicketTransitionSchema),
  asyncHandler(async (req, res) => res.json(await tickets.transitionTicket(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
ticketsRouter.post(
  '/:id/comments',
  requirePermission(PERMISSIONS.TICKET_VIEW),
  validateBody(CreateTicketCommentSchema),
  asyncHandler(async (req, res) => res.status(201).json(await tickets.addComment(principalOf(req), req.params.id, req.body, ipOf(req)))),
);
