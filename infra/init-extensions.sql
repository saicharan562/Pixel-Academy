-- Extensions required by the platform.
-- citext: case-insensitive email columns (users.email, clients.email).
-- vector: pgvector for kb_chunks embeddings (RAG).
-- pgcrypto: gen_random_uuid fallback (we primarily mint UUID v7 in app code).
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
