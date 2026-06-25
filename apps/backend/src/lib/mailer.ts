import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * SMTP transport — plain SMTP per the chosen email decision.
 * In dev, point SMTP_HOST/PORT at a local catcher (e.g. Mailpit on :1025).
 * In prod, set real SMTP credentials; SPF/DKIM/DMARC are configured on the domain
 * side (§5.2), not in code.
 */
let transporter: Transporter | null = null;

export function getMailer(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<void> {
  const info = await getMailer().sendMail({ from: env.SMTP_FROM, ...opts });
  logger.debug({ messageId: info.messageId, to: opts.to }, 'Email sent');
}
