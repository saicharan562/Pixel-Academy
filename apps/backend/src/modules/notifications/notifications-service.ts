import type { AuthPrincipal, NotificationListQuery, NotificationChannel } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { pushToUser } from '../../realtime/io.js';
import { enqueueEmail } from '../../jobs/queues.js';
import { logger } from '../../lib/logger.js';

/**
 * Notifications — the fan-out hub every mutating module calls to alert a user.
 *
 * `notify()` writes an append-only in-app row, pushes it live over Socket.IO (so open
 * clients update without a refetch), and optionally queues email / WhatsApp. Channels are
 * pluggable: in_app + email are wired; whatsapp goes through the provider-agnostic sender
 * (stub provider by default — swapping in a real key is config-only). Delivery failures are
 * logged, never thrown, so a notification hiccup can't roll back the business action.
 */

export interface NotifyInput {
  recipientId: string;
  type: string; // e.g. "invoice.issued", "leave.decided", "ticket.sla_breach"
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  channels?: NotificationChannel[];
  email?: { to: string; subject?: string };
  whatsapp?: { to: string; template?: string };
}

const notificationSelect = {
  id: true, type: true, title: true, body: true, entityType: true, entityId: true,
  channel: true, readAt: true, createdAt: true,
} as const;

/** Send a notification across the requested channels (default: in_app only). */
export async function notify(input: NotifyInput): Promise<void> {
  const channels = input.channels ?? ['in_app'];
  for (const channel of channels) {
    try {
      const row = await prisma.notification.create({
        data: {
          id: uuidv7(),
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          channel,
        },
        select: notificationSelect,
      });
      if (channel === 'in_app') {
        pushToUser(input.recipientId, 'notification', row);
      } else if (channel === 'email' && input.email) {
        await enqueueEmail({
          to: input.email.to,
          subject: input.email.subject ?? input.title,
          text: input.body ?? input.title,
        });
      } else if (channel === 'whatsapp' && input.whatsapp) {
        const { sendWhatsApp } = await import('../../lib/whatsapp.js');
        await sendWhatsApp({ to: input.whatsapp.to, body: input.body ?? input.title, template: input.whatsapp.template });
      }
    } catch (err) {
      logger.error({ err, type: input.type, channel }, 'NOTIFY FAILED');
    }
  }
}

export async function listNotifications(principal: AuthPrincipal, query: NotificationListQuery) {
  const where = {
    recipientId: principal.userId,
    channel: 'in_app',
    ...(query.unreadOnly ? { readAt: null } : {}),
  };
  const rows = await prisma.notification.findMany({
    where,
    select: notificationSelect,
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: { id: 'desc' }, // newest first
  });
  return toPage(rows, query.limit);
}

export async function unreadCount(principal: AuthPrincipal): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: principal.userId, channel: 'in_app', readAt: null },
  });
}

export async function markRead(principal: AuthPrincipal, id: string) {
  const existing = await prisma.notification.findFirst({
    where: { id, recipientId: principal.userId },
    select: { id: true },
  });
  if (!existing) throw notFound();
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    select: notificationSelect,
  });
}

export async function markAllRead(principal: AuthPrincipal): Promise<{ updated: number }> {
  const res = await prisma.notification.updateMany({
    where: { recipientId: principal.userId, channel: 'in_app', readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}
