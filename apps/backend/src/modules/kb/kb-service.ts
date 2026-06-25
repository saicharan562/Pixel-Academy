import type { Prisma } from '@prisma/client';
import type {
  AuthPrincipal, CreateKbDocumentInput, UpdateKbDocumentInput, KbListQuery,
} from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { notFound } from '../../lib/errors.js';
import { cursorArgs, toPage } from '../../lib/pagination.js';
import { embed, toVectorLiteral, chunkText } from '../../lib/embeddings.js';
import { writeAudit } from '../audit/audit-service.js';

/**
 * Knowledge Base (§ Intelligence). Documents are authored as markdown; on publish the body
 * is chunked + embedded into kb_chunks (pgvector) so the AI assistant can ground answers in
 * them. Clients only ever see `published` + `client`-audience docs.
 */

const kbSelect = {
  id: true, documentId: true, title: true, bodyMd: true, category: true, status: true, audience: true,
  createdAt: true, updatedAt: true,
} as const;

function audienceWhere(principal: AuthPrincipal): Record<string, unknown> {
  if (principal.role === ROLE.CLIENT) return { deletedAt: null, status: 'published', audience: 'client' };
  return { deletedAt: null };
}

export async function listKb(principal: AuthPrincipal, query: KbListQuery) {
  const where = {
    ...audienceWhere(principal),
    ...(query.status && principal.role !== ROLE.CLIENT ? { status: query.status } : {}),
    ...(query.audience && principal.role !== ROLE.CLIENT ? { audience: query.audience } : {}),
    ...(query.category ? { category: { contains: query.category, mode: 'insensitive' as const } } : {}),
    ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };
  const rows = await prisma.kbDocument.findMany({ where, select: kbSelect, ...cursorArgs(query.limit, query.cursor) });
  return toPage(rows, query.limit);
}

export async function getKb(principal: AuthPrincipal, id: string) {
  const doc = await prisma.kbDocument.findFirst({ where: { ...audienceWhere(principal), id }, select: kbSelect });
  if (!doc) throw notFound();
  return doc;
}

/** Re-chunk + re-embed a document's body. Replaces any existing chunks. */
async function reindex(docId: string, bodyMd: string | null) {
  await prisma.kbChunk.deleteMany({ where: { kbDocumentId: docId } });
  if (!bodyMd?.trim()) return;
  const chunks = chunkText(bodyMd);
  for (let i = 0; i < chunks.length; i++) {
    const vector = toVectorLiteral(await embed(chunks[i]));
    // Raw insert: the embedding column is pgvector (Unsupported in Prisma Client).
    await prisma.$executeRaw`
      INSERT INTO kb_chunks (id, kb_document_id, chunk_index, content, embedding, token_count, created_at, updated_at)
      VALUES (${uuidv7()}::uuid, ${docId}::uuid, ${i}, ${chunks[i]}, ${vector}::vector, ${Math.ceil(chunks[i].length / 4)}, now(), now())
    `;
  }
}

export async function createKb(principal: AuthPrincipal, input: CreateKbDocumentInput, ip: string | null) {
  const id = uuidv7();
  const doc = await prisma.kbDocument.create({
    data: {
      id, documentId: input.documentId ?? null, title: input.title, bodyMd: input.bodyMd ?? null,
      category: input.category ?? null, status: input.status, audience: input.audience,
    },
    select: kbSelect,
  });
  if (doc.status === 'published') await reindex(id, doc.bodyMd);
  await writeAudit({ actorId: principal.userId, action: 'kb.create', entityType: 'kb_document', entityId: id, after: { title: input.title, status: input.status }, ip });
  return doc;
}

export async function updateKb(principal: AuthPrincipal, id: string, input: UpdateKbDocumentInput, ip: string | null) {
  const before = await prisma.kbDocument.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } });
  if (!before) throw notFound();
  const data: Prisma.KbDocumentUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.bodyMd !== undefined ? { bodyMd: input.bodyMd } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
  };
  const doc = await prisma.kbDocument.update({ where: { id }, data, select: kbSelect });
  // Re-index when published content/state changes; drop chunks if unpublished.
  if (doc.status === 'published') await reindex(id, doc.bodyMd);
  else if (before.status === 'published') await prisma.kbChunk.deleteMany({ where: { kbDocumentId: id } });
  await writeAudit({ actorId: principal.userId, action: 'kb.update', entityType: 'kb_document', entityId: id, after: { status: doc.status }, ip });
  return doc;
}

export async function softDeleteKb(principal: AuthPrincipal, id: string, ip: string | null) {
  const existing = await prisma.kbDocument.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!existing) throw notFound();
  await prisma.kbChunk.deleteMany({ where: { kbDocumentId: id } });
  await prisma.kbDocument.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId: principal.userId, action: 'kb.delete', entityType: 'kb_document', entityId: id, ip });
}
