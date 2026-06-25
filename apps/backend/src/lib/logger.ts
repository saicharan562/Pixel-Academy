import pino from 'pino';
import { isProd } from '../config/env.js';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
  // Never log secrets — redact common sensitive paths defensively.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },
});
