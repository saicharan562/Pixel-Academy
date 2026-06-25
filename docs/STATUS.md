# Build Status — Pixel Academy

This document is the honest, module-by-module state of the build against the architecture
spec. It exists so nobody mistakes scaffolding for a finished feature.

## Legend
- ✅ Done & type-checked
- 🟡 Partial / stubbed seam
- ⬜ Not started (planned in the named phase)

## Phase 0 — Foundation ✅

| Item | State | Notes |
|---|---|---|
| Monorepo (npm workspaces) | ✅ | shared + backend + web + infra |
| `@pixel/shared` (enums, permissions, errors, schemas, types) | ✅ | compiles clean; single source of truth |
| Prisma schema — all 33 tables (§2.3) | ✅ | types, constraints, indexes, soft-delete, pgvector |
| Env config (validated, fail-fast) | ✅ | |
| UUID v7 generator | ✅ | unit-tested (version/variant/ordering/uniqueness) |
| Auth — login/refresh/logout/reset | ✅ | argon2id, JWT |
| Rotating refresh tokens + reuse detection | ✅ | |
| RBAC — capability middleware (layer 1) | ✅ | |
| RBAC — scope guards (layer 2), 404-not-403 | ✅ | unit-tested (14 cases) |
| Audit logging (append-only + tx variant) | ✅ | |
| Error contract + handler | ✅ | |
| Rate limiting (Redis-backed) | ✅ | auth + global limiters |
| S3 presigned upload/download | ✅ | MinIO in dev |
| Documents registry | ✅ | |
| Users + Roles routes | ✅ | mandatory-audit on RBAC changes |
| `/me` route | ✅ | |
| BullMQ queues + email worker (SMTP) | ✅ | other job queues registered, workers in later phases |
| Socket.IO realtime gateway | ✅ | JWT-authed, per-user rooms |
| Docker Compose infra | ✅ | postgres+pgvector, redis, minio |
| Seed (roles, perms, leave types, SLA, admin) | ✅ | idempotent |
| CI/CD pipeline | ⬜ | add GitHub Actions: install → build:shared → prisma generate → tsc → test |
| Web app shell + client portal shell | ⬜ | scaffold pending (see below) |

## Phase 1 — MVP core ⬜
Clients+Contacts, Projects+Milestones, Tasks (subtasks/deps/status guards),
Attendance+work-hour calc, Leaves+approval+balances, Notifications+realtime push,
Invoices+GST+line items+PDF, Payments (manual). The data model and the service/route
patterns from Phase 0 are designed for these to slot in directly.

## Phase 2 — Revenue & support depth ⬜
CRM pipeline, Timesheets, Expenses, Contracts+expiry, Tickets+SLA+escalation,
Recurring tasks job, Payment gateway (behind a stub `PaymentProvider` interface — chosen),
Scheduled reports + GSTR-ready exports.

## Phase 3 — Intelligence & integrations ⬜
KB+documents, AI Assistant (RAG, read-only, guardrails — embeddings behind an OpenAI/Gemini
abstraction; pgvector column fixed at 1536), WhatsApp (templates), Google Calendar, MFA.

## Known decisions captured
- **Payment gateway:** stub interface now; concrete adapter (Razorpay/Cashfree/…) later.
- **Email:** plain SMTP via nodemailer (Mailpit in dev).
- **Embeddings:** OpenAI + Gemini behind one interface; column is `VECTOR(1536)`. OpenAI
  `text-embedding-3-small` fits natively; Gemini (768) is padded by the adapter. **Do not
  mix providers in one deployment without a re-embed migration.**
- **Supplier GST state:** `SUPPLIER_STATE_CODE` env (default 37 = Andhra Pradesh).

## To run the next phase
Each Phase 1 module = Prisma models already exist → add Zod schema (in `@pixel/shared`) →
service (business logic) → routes (both RBAC layers) → BullMQ job if needed → unit tests →
React surface. Follow the auth/users modules as the reference pattern.
