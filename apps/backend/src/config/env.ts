import { z } from 'zod';

/**
 * Environment configuration — validated once at startup.
 * Fail fast: a missing critical secret should crash the process, not surface
 * as a runtime 500 later.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  PASSWORD_RESET_TTL_MIN: z.coerce.number().default(30),

  // Org config — supplier state drives GST intra/inter determination (§3.4).
  // Pixel Academy's own registered GST state code. REQUIRED for invoicing.
  SUPPLIER_STATE_CODE: z.string().regex(/^[0-9]{2}$/).default('37'), // 37 = Andhra Pradesh

  // CORS
  WEB_ORIGIN: z.string().default('http://localhost:5173'),

  // Object storage (S3-compatible). India region in prod.
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().default('pixel-academy'),
  S3_ACCESS_KEY: z.string().default('pixel_minio'),
  S3_SECRET_KEY: z.string().default('pixel_minio_dev_pw'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // SMTP (chosen email transport — plain SMTP per build decision)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Pixel Academy <no-reply@pixelacademy.local>'),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  // AI / embeddings — provider abstraction (OpenAI or Gemini), chosen per-deploy.
  // NOTE: pgvector column is fixed at 1536 dims. OpenAI text-embedding-3-small fits.
  // Gemini text-embedding-004 is 768; if selected, embeddings are zero-padded to 1536
  // by the adapter (lossless for cosine within a single provider). Do NOT mix providers
  // in one deployment without a re-embed.
  EMBEDDING_PROVIDER: z.enum(['openai', 'gemini', 'stub']).default('stub'),
  EMBEDDING_DIM: z.coerce.number().default(1536),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(['anthropic', 'openai', 'gemini', 'stub']).default('stub'),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
