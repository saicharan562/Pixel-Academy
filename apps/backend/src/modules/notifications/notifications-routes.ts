import { Router } from 'express';
import { NotificationListQuerySchema, PERMISSIONS, type NotificationListQuery } from '@pixel/shared';
import { asyncHandler, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as notifications from './notifications-service.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;

// GET /notifications — the caller's own in-app feed (newest first)
notificationsRouter.get(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  validateQuery(NotificationListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: NotificationListQuery }).validatedQuery;
    res.json(await notifications.listNotifications(principalOf(req), query));
  }),
);

// GET /notifications/unread-count — for the bell badge
notificationsRouter.get(
  '/unread-count',
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  asyncHandler(async (req, res) => {
    res.json({ count: await notifications.unreadCount(principalOf(req)) });
  }),
);

// POST /notifications/:id/read
notificationsRouter.post(
  '/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await notifications.markRead(principalOf(req), req.params.id));
  }),
);

// POST /notifications/read-all
notificationsRouter.post(
  '/read-all',
  requirePermission(PERMISSIONS.NOTIFICATION_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await notifications.markAllRead(principalOf(req)));
  }),
);
