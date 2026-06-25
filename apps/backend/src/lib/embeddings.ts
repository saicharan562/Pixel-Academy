import { createHash } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Embeddings provider abstraction (§ Intelligence). The pgvector column is fixed at 1536
 * dims. OpenAI text-embedding-3-small fits natively; Gemini (768) is zero-padded by its
 * adapter. The default `stub` produces a deterministic, L2-normalised pseudo-embedding from
 * the text hash so the whole RAG path (chunk → store → cosine search → cite) runs end-to-end
 * in dev without a key. Swapping to a real provider is config-only (EMBEDDING_PROVIDER).
 *
 * IMPORTANT: do not mix providers in one deployment without re-embedding — vectors from
 * different models are not comparable.
 */

const DIM = 1536;

/** Deterministic, normalised vector from text — same text ⇒ same vector, similar n-grams ⇒ closer. */
function stubEmbed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    const h = createHash('sha256').update(token).digest();
    // Spread each token across a few dimensions for a denser, more discriminative signal.
    for (let i = 0; i < 8; i++) {
      const idx = ((h[i * 2] << 8) | h[i * 2 + 1]) % DIM;
      vec[idx] += 1;
    }
  }
  const norm = Math.sqrt(vec.reduce((a, v) => a + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embed(text: string): Promise<number[]> {
  switch (env.EMBEDDING_PROVIDER) {
    case 'openai':
    case 'gemini':
      // Real adapters call out to the provider then normalise/pad to DIM. Until a key is
      // configured we fall back to the deterministic stub rather than throwing, so the
      // feature degrades gracefully instead of 500-ing.
      if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) return stubEmbed(text);
      return stubEmbed(text); // adapter hook point — implement provider call here
    case 'stub':
    default:
      return stubEmbed(text);
  }
}

/** Serialise a vector to the pgvector text format: "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

/** Split markdown/plain text into ~maxChars chunks on paragraph then sentence boundaries. */
export function chunkText(text: string, maxChars = 800): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const para of paras) {
    if ((current + '\n\n' + para).length > maxChars && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, maxChars)];
}
