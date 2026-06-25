import { Router } from 'express';
import {
  CreateInvoiceSchema, UpdateInvoiceSchema, InvoiceListQuerySchema, RecordPaymentSchema,
  GstReportQuerySchema, PERMISSIONS, type InvoiceListQuery, type GstReportQuery,
} from '@pixel/shared';
import { asyncHandler, validateBody, validateQuery } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as invoices from './invoices-service.js';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);

const principalOf = (req: import('express').Request) => (req as AuthedRequest).principal;
const ipOf = (req: import('express').Request) => req.ip ?? null;

// GET /invoices/gst-report — GSTR-1-style export (Admin/Manager). Declared before /:id.
invoicesRouter.get(
  '/gst-report',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validateQuery(GstReportQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: GstReportQuery }).validatedQuery;
    const report = await invoices.gstReport(principalOf(req), query);
    if (report.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="gstr1-${query.from}_${query.to}.csv"`);
      return res.send(report.content);
    }
    res.json(report);
  }),
);

// GET /invoices
invoicesRouter.get(
  '/',
  requirePermission(PERMISSIONS.INVOICE_VIEW),
  validateQuery(InvoiceListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = (req as AuthedRequest & { validatedQuery: InvoiceListQuery }).validatedQuery;
    res.json(await invoices.listInvoices(principalOf(req), query));
  }),
);

// POST /invoices — create draft
invoicesRouter.post(
  '/',
  requirePermission(PERMISSIONS.INVOICE_CREATE),
  validateBody(CreateInvoiceSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await invoices.createInvoice(principalOf(req), req.body, ipOf(req)));
  }),
);

// GET /invoices/:id
invoicesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.INVOICE_VIEW),
  asyncHandler(async (req, res) => {
    res.json(await invoices.getInvoice(principalOf(req), req.params.id));
  }),
);

// PATCH /invoices/:id — edit draft
invoicesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.INVOICE_EDIT),
  validateBody(UpdateInvoiceSchema),
  asyncHandler(async (req, res) => {
    res.json(await invoices.updateInvoice(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);

// POST /invoices/:id/issue
invoicesRouter.post(
  '/:id/issue',
  requirePermission(PERMISSIONS.INVOICE_EDIT),
  asyncHandler(async (req, res) => {
    res.json(await invoices.issueInvoice(principalOf(req), req.params.id, ipOf(req)));
  }),
);

// POST /invoices/:id/void
invoicesRouter.post(
  '/:id/void',
  requirePermission(PERMISSIONS.INVOICE_EDIT),
  asyncHandler(async (req, res) => {
    res.json(await invoices.voidInvoice(principalOf(req), req.params.id, ipOf(req)));
  }),
);

// POST /invoices/:id/payments — record a payment
invoicesRouter.post(
  '/:id/payments',
  requirePermission(PERMISSIONS.INVOICE_PAY),
  validateBody(RecordPaymentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await invoices.recordPayment(principalOf(req), req.params.id, req.body, ipOf(req)));
  }),
);
