# Pixel Academy — Internal Management Platform

Production-grade internal management platform for a single-organization creative/production
agency in India (₹ INR, Indian GST). Built to the developer-handoff architecture spec.

> **Status: Phase 0 (Foundation) — complete and type-checked.**
> Auth, RBAC, audit, storage, realtime, jobs, and the full data model are in place.
> Phases 1–3 (business modules, AI/RAG, integrations) build on top of this foundation.
> See `docs/STATUS.md` for the exact module-by-module state.

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Node.js 22 + Express + TypeScript |
| DB | PostgreSQL 16 + pgvector, Prisma ORM |
| Jobs / cache | Redis + BullMQ |
| Realtime | Socket.IO |
| Storage | S3-compatible (MinIO in dev) |
| Validation | Zod (shared FE/BE via `@pixel/shared`) |
| Money | `NUMERIC(14,2)` in DB, `decimal.js` in code |
| IDs | UUID v7 (time-ordered) |
| Auth | JWT access (15m) + rotating refresh (30d, hashed), argon2id |

## Monorepo layout

```
pixel-academy/
├── packages/shared/      # Zod schemas, enums, permission matrix, error contract, types
├── apps/backend/         # Express API, Prisma schema, services, jobs, workers
│   ├── prisma/           # schema.prisma + seed.ts (all 33 tables from §2.3)
│   └── src/
│       ├── config/       # env (validated)
│       ├── lib/          # prisma, uuid v7, logger, errors, mailer
│       ├── middleware/   # auth, rbac (2-layer), validate, rate-limit, error
│       ├── modules/      # auth, users/roles, audit, storage
│       ├── jobs/         # BullMQ queues + email worker
│       └── realtime/     # Socket.IO gateway
├── apps/web/             # React frontend (Phase 0 shell — see STATUS.md)
└── infra/                # docker-compose (postgres+pgvector, redis, minio)
```

## Prerequisites

- Node.js ≥ 22
- Docker + Docker Compose (for Postgres, Redis, MinIO)

## Setup (first run)

```bash
# 1. Install dependencies (root installs all workspaces)
npm install

# 2. Start infrastructure (Postgres+pgvector, Redis, MinIO)
npm run infra:up

# 3. Configure backend env
cp apps/backend/.env.example apps/backend/.env
#    → set SUPPLIER_STATE_CODE to Pixel Academy's GST state (default 37 = Andhra Pradesh)
#    → set strong JWT secrets before any non-local use

# 4. Build shared types
npm run build:shared

# 5. Generate the Prisma client + run migrations  (REQUIRED — see note below)
cd apps/backend
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed          # seeds roles, permissions, leave types, SLA policies, admin
cd ../..

# 6. Run the API + workers
npm run dev:backend
```

> **Prisma generate note:** the Prisma client is generated from `schema.prisma` and is
> required before the backend will run or fully type-check. This step downloads a query
> engine binary from `binaries.prisma.sh`. (In the build sandbox that domain was
> unreachable, so the client could not be generated there — but the schema is valid and
> the application code type-checks cleanly against the generated client's types.)

Seeded admin (change immediately): `admin@pixelacademy.local` / `ChangeMe!2026`

## Verify

```bash
curl http://localhost:4000/health
# → {"status":"ok","ts":"..."}

# Login
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pixelacademy.local","password":"ChangeMe!2026"}'
# → { accessToken, refreshToken, user }

# Use the token
curl http://localhost:4000/me -H "Authorization: Bearer <accessToken>"
```

## Tests

```bash
npm test        # backend unit tests (UUID v7, RBAC scope guards) — DB-independent
```

## What Phase 0 enforces (spec compliance)

- **Two-layer RBAC** (§3.2): capability middleware + in-handler scope guards. Out-of-scope
  access returns **404, not 403** (no existence leak). Verified by unit tests.
- **Rotating refresh tokens** (§3.1) with reuse detection → revoke-all on theft.
- **Append-only audit** (§6.2) with a transactional variant for finance/RBAC mutations.
- **Uniform error contract** (§3.3) across every endpoint.
- **Presigned S3 uploads** (§6.3): bytes go client→bucket, never through the app server.
- **Full data model** (§2.3): all 33 tables with constraints, indexes, soft-delete.
- **Configurable roles/permissions** seeded from the §1.3 access matrix.

## License

Proprietary — Pixel Academy.
