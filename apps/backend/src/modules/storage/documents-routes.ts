import { Router } from 'express';
import { z } from 'zod';
import { DOC_VISIBILITY } from '@pixel/shared';
import { asyncHandler, validateBody } from '../../middleware/validate.js';
import { authenticate, type AuthedRequest } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound, forbidden } from '../../lib/errors.js';
import { isClient } from '../../middleware/rbac.js';
import {
  presignUpload,
  presignDownload,
  buildStorageKey,
} from '../storage/storage-service.js';

export const documentsRouter = Router();
documentsRouter.use(authenticate);

const RequestUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  visibility: z.enum(DOC_VISIBILITY).default('internal'),
  prefix: z.string().default('uploads'),
});

/**
 * Step 1: request a presigned PUT URL + create the document metadata row.
 * Client uploads bytes directly to the bucket using the returned URL.
 */
documentsRouter.post(
  '/request-upload',
  validateBody(RequestUploadSchema),
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const { filename, mimeType, sizeBytes, visibility, prefix } = req.body;

    // Clients may only create client_shared/public-scoped uploads, never internal.
    if (isClient(principal.role) && visibility === 'internal') {
      throw forbidden('Clients cannot create internal documents');
    }

    const storageKey = buildStorageKey(prefix, filename);
    const doc = await prisma.document.create({
      data: {
        id: uuidv7(),
        storageKey,
        filename,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        uploadedBy: principal.userId,
        visibility,
      },
    });

    const uploadUrl = await presignUpload(storageKey, mimeType);
    res.status(201).json({
      document: { ...doc, sizeBytes: Number(doc.sizeBytes) },
      uploadUrl,
    });
  }),
);

/**
 * Step 2: get a short-lived download URL, authorized by visibility + RBAC.
 */
documentsRouter.get(
  '/:id/download-url',
  asyncHandler(async (req, res) => {
    const principal = (req as AuthedRequest).principal;
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!doc) throw notFound();

    // Visibility gate: internal docs are internal-only; client_shared/public are broader.
    if (doc.visibility === 'internal' && isClient(principal.role)) throw notFound();

    const url = await presignDownload(doc.storageKey);
    res.json({ url });
  }),
);
