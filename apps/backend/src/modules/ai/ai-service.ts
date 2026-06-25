import { Prisma } from '@prisma/client';
import type { AuthPrincipal, AiQueryInput } from '@pixel/shared';
import { ROLE } from '@pixel/shared';
import { prisma } from '../../lib/prisma.js';
import { uuidv7 } from '../../lib/uuid.js';
import { env } from '../../config/env.js';
import { embed, toVectorLiteral } from '../../lib/embeddings.js';

/**
 * AI assistant (§ Intelligence) — read-only, retrieval-augmented, guardrailed. It embeds the
 * question, finds the nearest published KB chunks the caller is allowed to see (clients →
 * client-audience only), and grounds the answer in them with inline citations. Every call is
 * logged to ai_interaction_logs (query, retrieved chunks, model, latency). With LLM_PROVIDER
 * unset the synthesiser stitches the retrieved passages into a cited extractive answer, so
 * the feature is honest (never hallucinates beyond the KB) and works with no key.
 */

interface RetrievedChunk {
  id: string;
  kb_document_id: string;
  title: string;
  chunk_index: number;
  content: string;
  score: number;
}

export interface AiAnswer {
  answer: string;
  blocked: boolean;
  citations: { id: string; kbDocumentId: string; title: string; chunkIndex: number; score: number; snippet: string }[];
  model: string;
}

async function retrieve(principal: AuthPrincipal, queryVec: string, topK: number): Promise<RetrievedChunk[]> {
  const clientFilter = principal.role === ROLE.CLIENT ? Prisma.sql`AND d.audience = 'client'` : Prisma.empty;
  return prisma.$queryRaw<RetrievedChunk[]>`
    SELECT c.id, c.kb_document_id, d.title, c.chunk_index, c.content,
           1 - (c.embedding <=> ${queryVec}::vector) AS score
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.kb_document_id
    WHERE d.deleted_at IS NULL AND d.status = 'published'
    ${clientFilter}
    ORDER BY c.embedding <=> ${queryVec}::vector
    LIMIT ${topK}
  `;
}

/** Extractive, cited synthesis. The real LLM call slots in behind LLM_PROVIDER here. */
function synthesize(query: string, chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return "I couldn't find anything about that in the knowledge base. Try rephrasing, or ask an admin to add an article.";
  }
  const cited = chunks
    .map((c, i) => `[${i + 1}] ${c.content.replace(/\s+/g, ' ').trim().slice(0, 320)}`)
    .join('\n\n');
  return `Here's what the knowledge base says about "${query}":\n\n${cited}\n\nSources: ${chunks.map((c, i) => `[${i + 1}] ${c.title}`).join('; ')}`;
}

export async function answer(principal: AuthPrincipal, input: AiQueryInput): Promise<AiAnswer> {
  const started = Date.now();
  const queryVec = toVectorLiteral(await embed(input.query));
  const chunks = await retrieve(principal, queryVec, input.topK);
  const blocked = chunks.length === 0;
  const text = synthesize(input.query, chunks);
  const model = `${env.LLM_PROVIDER}:rag`;

  await prisma.aiInteractionLog.create({
    data: {
      id: uuidv7(), userId: principal.userId, query: input.query,
      retrievedChunkIds: chunks.map((c) => c.id), model,
      response: text, wasBlocked: blocked, latencyMs: Date.now() - started,
    },
  });

  return {
    answer: text,
    blocked,
    model,
    citations: chunks.map((c) => ({
      id: c.id, kbDocumentId: c.kb_document_id, title: c.title, chunkIndex: c.chunk_index,
      score: Number(c.score.toFixed(4)), snippet: c.content.slice(0, 160),
    })),
  };
}
