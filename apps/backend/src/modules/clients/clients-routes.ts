import { Router } from 'express';
import {
  CreateClientSchema,
  UpdateClientSchema,
  ClientListQuerySchema,
  CreateContactSchema,
  UpdateContactSchema,
  PERMISSIONS,
  type ClientListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as clients from './clients-service.js';

export const clientsRouter = Router();
clientsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

// GET /clients
clientsRouter.get(
  '/',
  requirePermission(PERMISSIONS.CLIENT_VIEW),
  validateQuery(ClientListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: ClientListQuery }).validatedQuery;
    res.json(await clients.listClients(principalOf(req), query));
  }),
);

// POST /clients
clientsRouter.post(
  '/',
  requirePermission(PERMISSIONS.CLIENT_CREATE),
  validateBody(CreateClientSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await clients.createClient(principalOf(req), req.body, ipOf(req)));
  }),
);

// GET /clients/:id
clientsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CLIENT_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await clients.getClient(principalOf(req), req.params.id));
  }),
);

// PATCH /clients/:id
clientsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.CLIENT_EDIT),
  validateBody(UpdateClientSchema),
  asyncHandler(async (req, res) => {
    res.json(await clients.updateClient(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

// DELETE /clients/:id
clientsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.CLIENT_DELETE),
  asyncHandler(async (req, res) => {
    await clients.softDeleteClient(principalOf(req), req.params.id, ipOf(req));
    res.status(204).send();
  }),
);

// ── Contacts (sub-resource) ──

clientsRouter.get(
  '/:id/contacts',
  requirePermission(PERMISSIONS.CLIENT_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await clients.listContacts(principalOf(req), req.params.id));
  }),
);

clientsRouter.post(
  '/:id/contacts',
  requirePermission(PERMISSIONS.CLIENT_EDIT),
  validateBody(CreateContactSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await clients.addContact(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

clientsRouter.patch(
  '/:id/contacts/:contactId',
  requirePermission(PERMISSIONS.CLIENT_EDIT),
  validateBody(UpdateContactSchema),
  asyncHandler(async (req, res) => {
    res.json(await clients.updateContact(principalOf(req), req.params.id, req.params.contactId, req.body, ipOf(req)));
  }),
);

clientsRouter.delete(
  '/:id/contacts/:contactId',
  requirePermission(PERMISSIONS.CLIENT_EDIT),
  asyncHandler(async (req, res) => {
    await clients.removeContact(principalOf(req), req.params.id, req.params.contactId, ipOf(req));
    res.status(204).send();
  }),
);
