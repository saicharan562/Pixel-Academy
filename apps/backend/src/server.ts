import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initRealtime } from './realtime/io.js';
import { startEmailWorker } from './jobs/email-worker.js';
import { prisma } from './lib/prisma.js';
import { connection } from './jobs/queues.js';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);

  initRealtime(httpServer);

  // Phase 0 runs the worker in-process. Split into its own process at scale.
  const emailWorker = startEmailWorker();

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Pixel Academy API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down…');
    httpServer.close();
    await emailWorker.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
