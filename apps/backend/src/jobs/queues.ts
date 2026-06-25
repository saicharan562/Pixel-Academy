import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

/**
 * BullMQ queue registry — §6.4 background jobs.
 *
 * Phase 0 wires the queue layer and the email queue (used by auth + notifications).
 * The scheduled jobs (recurring-task-gen, sla-sweep, invoice-overdue, contract-expiry,
 * payment-reminders, scheduled-reports, calendar-watch-renew, leave-rollover) are
 * registered here as named queues so later phases attach workers without re-plumbing.
 *
 * All jobs are configured idempotent + retried with backoff + dead-lettered on repeated
 * failure (default opts below).
 */

/**
 * A raw IORedis instance for app-level use (rate limiting, caching).
 * BullMQ gets its own ConnectionOptions (not this instance) to avoid the
 * nested-ioredis type clash between bullmq's bundled ioredis and ours.
 */
export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ-style usage
});

const bullConnection: ConnectionOptions = { url: env.REDIS_URL };
export { bullConnection };

const defaultJobOpts = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: false, // keep failed jobs for inspection / dead-letter review
};

export const QUEUE_NAMES = {
  EMAIL: 'email',
  RECURRING_TASK_GEN: 'recurring-task-gen',
  SLA_SWEEP: 'sla-sweep',
  INVOICE_OVERDUE: 'invoice-overdue',
  CONTRACT_EXPIRY: 'contract-expiry-alert',
  PAYMENT_REMINDERS: 'payment-reminders',
  SCHEDULED_REPORTS: 'scheduled-reports',
  CALENDAR_WATCH_RENEW: 'calendar-watch-renew',
  LEAVE_ROLLOVER: 'leave-balance-rollover',
} as const;

export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: bullConnection,
  defaultJobOptions: defaultJobOpts,
});

export interface EmailJob {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function enqueueEmail(job: EmailJob) {
  await emailQueue.add('send', job);
}
