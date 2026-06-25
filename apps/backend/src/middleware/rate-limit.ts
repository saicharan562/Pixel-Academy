import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { connection } from '../jobs/queues.js';
import { rateLimited } from '../lib/errors.js';
import { isProd } from '../config/env.js';

/**
 * Rate limiting (§6.1). Redis-backed so limits hold across multiple app instances.
 * A tight limiter guards auth endpoints (brute-force defense); a looser global
 * limiter protects the rest of the API.
 *
 * Limits are environment-aware: production stays tight for brute-force defense,
 * while development uses generous ceilings so hot-reloads, token refreshes and
 * dashboard fan-out queries never trip a 429 during normal work.
 */
function makeLimiter(opts: { windowMs: number; max: number; prefix: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        connection.call(command, ...args) as Promise<never>,
      prefix: opts.prefix,
    }),
    handler: (_req, _res, next) => next(rateLimited()),
  });
}

export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 1000, // prod: 20 attempts / 15 min / IP; dev: effectively unthrottled
  prefix: 'rl:auth:',
});

export const globalLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: isProd ? 300 : 5000, // prod: 300 req / min / IP; dev: generous for hot-reload + fan-out
  prefix: 'rl:global:',
});
