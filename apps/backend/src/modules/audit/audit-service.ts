import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { logger } from '../../lib/logger.js';

/** Portable JSON value type — avoids depending on Prisma.InputJsonValue resolving
 * before client generation. Compatible with what Prisma accepts for Json columns. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** The interactive transaction client handed to a `prisma.$transaction(async (tx) => …)`
 * callback. Callers pass `tx` directly so the audit row commits with the mutation. */
type AuditTxClient = Prisma.TransactionClient;

/**
 * Audit logging — §6.2.
 *
 * Append-only record of every mutating action: actor, action, entity, before/after, ip.
 * Finance and RBAC mutations are MANDATORY-audit. Reads are not audited (except AI and
 * invoice PDF/exports, handled in their own modules). There is deliberately NO update or
 * delete path for audit rows — the table is write-once.
 *
 * Audit writes must never break the business operation: if the audit insert fails we log
 * loudly but do not throw, so a logging hiccup can't roll back a legitimate action. (In a
 * stricter compliance posture you'd make finance audit transactional with the mutation;
 * that hook point is noted inline.)
 */
export interface AuditInput {
  actorId: string | null;
  action: string; // e.g. "invoice.update", "role.permissions.set"
  entityType: string; // e.g. "invoice"
  entityId?: string | null;
  before?: JsonValue | null;
  after?: JsonValue | null;
  ip?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: uuidv7(),
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: input.action }, 'AUDIT WRITE FAILED');
  }
}

/**
 * Transactional variant — use for finance/RBAC where the audit row MUST commit with the
 * mutation. Pass the same tx client the mutation used.
 */
export async function writeAuditTx(
  tx: AuditTxClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: uuidv7(),
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      ip: input.ip ?? null,
    },
  });
}
