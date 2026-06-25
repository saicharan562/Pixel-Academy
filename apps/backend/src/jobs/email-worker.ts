import { Worker } from 'bullmq';
import { bullConnection, QUEUE_NAMES, type EmailJob } from './queues.js';
import { sendMail } from '../lib/mailer.js';
import { logger } from '../lib/logger.js';

/**
 * Email worker. Run as part of the worker process (npm run dev spins both API and
 * workers in Phase 0; split into a dedicated process at scale).
 */
export function startEmailWorker() {
  const worker = new Worker<EmailJob>(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      await sendMail(job.data);
    },
    { connection: bullConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.warn({ jobId: job?.id, err: err.message }, 'Email job failed');
  });

  return worker;
}
