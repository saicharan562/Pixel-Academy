import type { NextFunction, Request, Response } from 'express';
import type { PermissionKey, Role } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import type { AuthedRequest } from './authenticate.js';
import { forbidden, notFound } from '../lib/errors.js';

/**
 * RBAC — §3.2 two-layer enforcement.
 *
 * LAYER 1 (this middleware): capability check. Does the caller's role hold the
 * required permission key for this route? Capability violations → 403 FORBIDDEN.
 *
 * LAYER 2 (scope guards, used inside handlers): row-scope. May THIS caller see/act
 * on THIS specific record? Scope violations → 404 NOT_FOUND (never 403), so we don't
 * leak the existence of records outside the caller's scope.
 *
 * Both layers are required. A route guard alone is insufficient because most real
 * violations are scope violations, not capability violations.
 */

/** Layer 1: require one or more permission keys (all must be held). */
export function requirePermission(...required: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { permissions } = (req as AuthedRequest).principal;
    const missing = required.filter((p) => !permissions.has(p));
    if (missing.length > 0) {
      return next(forbidden(`Missing permission: ${missing.join(', ')}`));
    }
    next();
  };
}

/** Convenience: restrict a route to specific roles regardless of permission rows. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes((req as AuthedRequest).principal.role)) {
      return next(forbidden('Your role may not access this resource'));
    }
    next();
  };
}

// ───────────────────────── Layer 2: scope helpers ─────────────────────────

export const isAdmin = (role: Role) => role === ROLE.ADMIN;
export const isManager = (role: Role) => role === ROLE.MANAGER;
export const isStaff = (role: Role) => role === ROLE.STAFF;
export const isClient = (role: Role) => role === ROLE.CLIENT;

/**
 * Assert the caller may act on a record owned by `ownerUserId` under "self" scope.
 * Admins always pass. Throws 404 (not 403) on scope violation.
 */
export function assertSelfOrAdmin(req: AuthedRequest, ownerUserId: string) {
  if (isAdmin(req.principal.role)) return;
  if (req.principal.userId !== ownerUserId) throw notFound();
}

/**
 * Assert a Client caller may only touch their own client_id's records.
 * Internal roles (Admin/Manager/Staff) are subject to their own scope rules elsewhere;
 * here we specifically gate the Client portal surface.
 */
export function assertClientScope(req: AuthedRequest, recordClientId: string | null) {
  if (!isClient(req.principal.role)) return; // internal roles handled by other guards
  if (!recordClientId || req.principal.clientId !== recordClientId) throw notFound();
}

/**
 * Generic ownership gate used by handlers: given the role and the record's relevant
 * scoping ids, decide visibility. Returns void on success, throws 404 on violation.
 *
 * `opts` lets a handler declare which ids matter:
 *  - ownerUserId: the user who owns the row (self scope)
 *  - clientId: the client org the row belongs to (client portal scope)
 *  - teamUserIds: for Manager "team" scope, the set of users they manage
 *  - assignedUserIds: for Staff "assigned" scope
 */
export function assertRecordScope(
  req: AuthedRequest,
  opts: {
    ownerUserId?: string | null;
    clientId?: string | null;
    teamUserIds?: Set<string>;
    assignedUserIds?: Set<string>;
    managerCanSeeAll?: boolean;
  },
): void {
  const { role, userId, clientId } = req.principal;

  if (isAdmin(role)) return; // Admin: org-wide

  if (isClient(role)) {
    if (!opts.clientId || opts.clientId !== clientId) throw notFound();
    return;
  }

  if (isManager(role)) {
    if (opts.managerCanSeeAll) return;
    if (opts.ownerUserId && opts.ownerUserId === userId) return;
    if (opts.teamUserIds?.has(opts.ownerUserId ?? '')) return;
    // If no team scoping was supplied, default-allow only self; otherwise deny.
    if (!opts.teamUserIds && !opts.ownerUserId) return;
    throw notFound();
  }

  // Staff
  if (opts.ownerUserId && opts.ownerUserId === userId) return;
  if (opts.assignedUserIds?.has(userId)) return;
  throw notFound();
}
