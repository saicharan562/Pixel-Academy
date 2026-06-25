import { Router } from 'express';
import {
  LoginSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@pixel/shared';
import { asyncHandler, validateBody } from '../../middleware/validate.js';
import { writeAudit } from '../audit/audit-service.js';
import * as authService from './auth-service.js';
import { logger } from '../../lib/logger.js';
import { enqueueEmail } from '../../jobs/queues.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validateBody(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    await writeAudit({
      actorId: result.user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: result.user.id,
      ip: req.ip ?? null,
    });
    res.json(result);
  }),
);

authRouter.post(
  '/refresh',
  validateBody(RefreshSchema),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  }),
);

authRouter.post(
  '/logout',
  validateBody(RefreshSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  }),
);

authRouter.post(
  '/forgot-password',
  validateBody(ForgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const raw = await authService.createPasswordReset(req.body.email);
    if (raw) {
      // Deliver via the email queue; never log the token.
      await enqueueEmail({
        to: req.body.email,
        subject: 'Reset your Pixel Academy password',
        text: `Use this token to reset your password: ${raw}\nThis token expires shortly.`,
      });
    } else {
      logger.debug({ email: req.body.email }, 'Password reset requested for unknown email');
    }
    // Always 202 — no account enumeration.
    res.status(202).send();
  }),
);

authRouter.post(
  '/reset-password',
  validateBody(ResetPasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.status(204).send();
  }),
);
