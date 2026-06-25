import { Router } from 'express';
import {
  AttendanceListQuerySchema, AttendanceCheckInSchema, UpsertAttendanceSchema,
  PERMISSIONS, type AttendanceListQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as attendance from './attendance-service.js';

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

attendanceRouter.get(
  '/',
  requirePermission(PERMISSIONS.ATTENDANCE_VIEW),
  validateQuery(AttendanceListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: AttendanceListQuery }).validatedQuery;
    res.json(await attendance.listAttendance(principalOf(req), query));
  }),
);

attendanceRouter.post(
  '/check-in',
  requirePermission(PERMISSIONS.ATTENDANCE_CREATE),
  validateBody(AttendanceCheckInSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await attendance.checkIn(principalOf(req), req.body.source, ipOf(req)));
  }),
);

attendanceRouter.post(
  '/check-out',
  requirePermission(PERMISSIONS.ATTENDANCE_CREATE),
  asyncHandler(async (req, res) => {
    res.json(await attendance.checkOut(principalOf(req), ipOf(req)));
  }),
);

attendanceRouter.put(
  '/',
  requirePermission(PERMISSIONS.ATTENDANCE_EDIT),
  validateBody(UpsertAttendanceSchema),
  asyncHandler(async (req, res) => {
    res.json(await attendance.upsertAttendance(principalOf(req), req.body, ipOf(req)));
  }),
);
