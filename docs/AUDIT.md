# Pixel Academy — Security, Correctness & Quality Audit

**Scope:** `apps/backend`, `apps/web`, `packages/shared`, `infra/`
**Date:** 2026-06-25
**Method:** Source review (read every backend module, the shared contract package, the web token/auth/RBAC/render layers, infra, CI) + `tsc` / `vitest` / web type-check / `npm audit`. No application code was modified. Findings only.

> Convention: severities reflect real impact **in this app today** (built modules: auth, users/roles, audit, storage, clients+contacts, projects+milestones, tasks). Where a risk only bites once a placeholder module (e.g. invoices) lands, that is called out.

---

## 1. Executive summary

The codebase is, on the whole, a well-structured and security-conscious foundation: argon2id, pinned-HS256 JWTs with hashed/rotating refresh tokens, per-request permission re-resolution, a deliberate "404-not-403" scope contract, Zod-validated bodies, cursor pagination, soft-delete filters, no raw SQL, helmet/CORS/rate-limiting, and a clean `tsc`/`vitest` run. However, the **row-scope layer (layer 2 of the RBAC design) is applied inconsistently**, and that inconsistency produces real cross-tenant access-control breaks. The most serious is the **documents module, which has no capability check and no tenant scoping at all** — any authenticated user can mint a download URL for any other client's shared documents (Critical). Two further broken-access-control bugs let a **Client portal user enumerate another tenant's projects** (a query param overrides the scope filter) and let **Staff write tasks into projects they cannot see**. The object-storage upload path is exploitable for **key/path injection** because the storage prefix is user-controlled and unsanitized. A concurrency defect in the refresh flow makes the refresh-token **reuse-detection control misfire and force users to log out** under normal dashboard fan-out. Secrets management relies on in-code defaults and committed placeholder values with no production guard. None of these require a running exploit to confirm — they are visible in the control flow — except where explicitly marked "suspected".

### Severity tally

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 9 |
| Info | 3 |
| **Total** | **22** |

### Tool results (real output)

- **Backend `tsc` (build):** clean — `npm run build:shared` + `tsc` exit 0.
- **Backend `vitest`:** **42 passed (5 files)** — `tasks-transitions` (8), `clients-schema` (8), `projects-schema` (9), `uuid` (3), `rbac` (14). Duration 364ms. Exit 0.
- **Web type-check (`npm run lint -w @pixel/web` → `tsc --noEmit`):** clean, exit 0. (Note: the web `lint` script is only a type-check; there is no ESLint pass for the web app.)
- **`npm audit`:** `6 vulnerabilities (3 moderate, 2 high, 1 critical)` — all in two dependency chains: `nodemailer ≤9.0.0` (high/critical: SMTP/CRLF injection, jsonTransport file-access bypass, OAuth2 TLS, SSRF) and `esbuild ≤0.24.2 → vite ≤6.4.2 → @vitest/mocker/vite-node/vitest` (moderate, dev-server only). Triaged in **G1**.

---

## 2. Findings table

| ID | Severity | Area | Location | Title |
|----|----------|------|----------|-------|
| C1 | **Critical** | AuthZ / IDOR | `apps/backend/src/modules/storage/documents-routes.ts:31-82` | Documents API has no capability check and no tenant scope → cross-tenant document disclosure |
| H1 | **High** | AuthZ / IDOR | `apps/backend/src/modules/projects/projects-service.ts:63-72` | `query.clientId` overrides the row-scope filter → Client can enumerate other tenants' projects |
| H2 | **High** | AuthZ | `apps/backend/src/modules/tasks/tasks-service.ts:79-118` | `createTask` checks project existence but not visibility → Staff can write into out-of-scope projects |
| H3 | **High** | File / SSRF | `apps/backend/src/modules/storage/storage-service.ts:40-45`, `documents-routes.ts:19-62` | Unsanitized, user-controlled storage `prefix` (key/path injection) + no size/content-type enforcement on presigned PUT |
| H4 | **High** | Session / Reliability | `apps/web/src/lib/api.ts:70-119` + `apps/backend/src/modules/auth/token-service.ts:36-70` | No single-flight on refresh → concurrent 401s trip reuse-detection and force-logout; defeats the control |
| M1 | **Medium** | AuthZ / GST | `apps/backend/src/modules/clients/clients-service.ts:133-163` + `packages/shared/src/schemas.ts:102` | Client portal can edit GST-sensitive & ownership fields (`stateCode`, `gstin`, `legalName`, `ownerUserId`, `status`) on its own record — no field gating |
| M2 | **Medium** | Secrets / Config | `apps/backend/src/config/env.ts:24,33-49`, `apps/backend/.env`, `.env.example` | In-code defaults + committed placeholder secrets + default admin password, with no production guard |
| M3 | **Medium** | Secrets / Queue | `apps/backend/src/modules/auth/auth-routes.ts:58-62`, `jobs/queues.ts:33` | Password-reset token persisted in plaintext in Redis job payload; failed email jobs retained forever |
| M4 | **Medium** | Integrity | `apps/backend/src/modules/users/users-routes.ts:116-145` | `client_id ⇔ role=Client` invariant enforced on create but **not** on update; `data: body` mass-assign |
| M5 | **Medium** | Frontend / XSS | `apps/web/src/lib/api.ts:14,27-30` | Refresh token in `localStorage` → any XSS yields persistent account takeover |
| L1 | Low | Validation | `packages/shared/src/schemas.ts` (Create* schemas) | `Create*` schemas are not `.strict()` — unknown fields silently accepted |
| L2 | Low | Money | backend (no `decimal.js` import) | `decimal.js` declared but unused; money handled as JS `number` |
| L3 | Low | Logic / DoS | `apps/backend/src/modules/tasks/tasks-service.ts:178-181` | Cycle detection catches only direct 2-cycles; deeper cycles permitted |
| L4 | Low | Audit | `apps/backend/src/modules/audit/audit-service.ts:43-60` | Audit not append-only at DB level; `writeAudit` swallows failures (mutation can succeed unaudited) |
| L5 | Low | A11y / Perf | `apps/web/src/theme/ThemeBackground.tsx`, `components/three/AmbientField.tsx` | Always-on WebGL on every route; no `prefers-reduced-motion`, no no-GPU fallback |
| L6 | Low | A11y | `apps/web/src/**` | Icon-only buttons lack `aria-label`; glass-theme contrast unverified |
| L7 | Low | Infra | `infra/docker-compose.yml`, repo root | Default creds, host-bound ports, no restart policy, no app Dockerfile / prod build |
| L8 | Low | CI | `.github/workflows/ci.yml` | CI omits web type-check, ESLint, `npm audit`, and web tests |
| L9 | Low | Transport | `apps/backend/src/app.ts:27`, `middleware/error.ts:9-12` | Fixed `trust proxy = 1` + client-trusted `x-request-id` (IP spoof / log forging, deploy-dependent) |
| I1 | Info | Session | `apps/backend/src/realtime/io.ts:20-33` | Suspended/deleted user keeps a live socket until access-token expiry (≤15m) |
| I2 | Info | Integrity | `apps/backend/src/modules/projects/projects-service.ts:165-177` | `setMembers` does not restrict members to internal users |
| I3 | Info | Config | `apps/backend/src/config/env.ts:16`, unused `JWT_REFRESH_SECRET` | `JWT_REFRESH_SECRET` required but never used (refresh tokens are opaque) |

---

## 3. Detailed findings (ordered by severity)

### C1 — Documents API: no capability check, no tenant scope → cross-tenant document disclosure  **(Critical)**

**Where:** `apps/backend/src/modules/storage/documents-routes.ts:67-82` (download), `:31-62` (upload); data model `apps/backend/prisma/schema.prisma:590-608`.

**Description.** The documents router applies only `authenticate` — **neither route has a `requirePermission(...)` gate** (there is no `document.*` permission in the matrix at all), and the `Document` model has **no `clientId`/project linkage**, so there is no tenant scope possible at the data layer. The only access control on download is a single visibility check:

```ts
// documents-routes.ts:67-82
documentsRouter.get('/:id/download-url', asyncHandler(async (req, res) => {
  const principal = (req as AuthedRequest).principal;
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!doc) throw notFound();
  // Visibility gate: internal docs are internal-only; client_shared/public are broader.
  if (doc.visibility === 'internal' && isClient(principal.role)) throw notFound();
  const url = await presignDownload(doc.storageKey);
  res.json({ url });
}));
```

**Exploit scenario.**
1. Client A (role=Client, `clientId = A`) authenticates and calls `GET /documents/<id>/download-url` for any document id whose `visibility` is `client_shared` or `public`. There is no check that the document belongs to client A → **A downloads client B's shared contracts, invoices, receipts, KB attachments.** Document ids are UUID v7 (time-ordered, partially predictable) and the metadata row leaks `storageKey`/`filename`. A 2-minute presigned S3 GET is then minted (`storage-service.ts:34-37`).
2. Any internal user — including the lowest-privilege **Staff** — can fetch a download URL for **every `internal` document in the org**, with no project/team scoping whatsoever.

**Evidence.** `Document` has only `uploadedBy` (`schema.prisma:596`); no `clientId`. Router (`documents-routes.ts:16-17`) registers `documentsRouter.use(authenticate)` and nothing else.

**Remediation.**
- Add tenant/owner linkage to `Document` (`clientId` and/or `projectId`) and scope every read: a Client may only resolve documents for `clientId === principal.clientId`; internal roles scoped by project membership/ownership the same way clients/projects are.
- Add explicit `document.view` / `document.create` capabilities and `requirePermission(...)` on both routes.
- Continue to return `notFound()` (404) on scope miss to preserve the existence-hiding contract.

---

### H1 — `query.clientId` overrides the scope filter → Client enumerates other tenants' projects  **(High)**

**Where:** `apps/backend/src/modules/projects/projects-service.ts:63-72`.

**Description.** `scopeWhere` correctly pins a Client to its own org (`{ clientId: principal.clientId }`, `:44-45`). But `listProjects` then spreads the optional query filter **using the same `clientId` key**, so a caller-supplied `clientId` *replaces* the scope value:

```ts
const scope = await scopeWhere(principal);             // { deletedAt:null, clientId: <mine> } for Client
const where = {
  ...scope,
  ...(query.status ? { status: query.status } : {}),
  ...(query.clientId ? { clientId: query.clientId } : {}),   // ← overrides scope.clientId
  ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
};
```

`ProjectListQuerySchema` (`schemas.ts:150-155`) accepts `clientId: z.string().uuid().optional()` and `Client` holds `PROJECT_VIEW` (`permissions.ts:163`), so the route's capability check passes.

**Exploit scenario.** Client A calls `GET /projects?clientId=<B>` and receives client B's project list — names, `code`, `status`, `budgetInr`, manager name, dates (`projectSelect`, `:22-36`). Cross-tenant business-data disclosure.

**Why Staff/Manager aren't affected here.** Staff scope uses an `OR` on `managerId`/`members` (different keys), so `query.clientId` ANDs rather than overrides; Manager/Admin are org-wide by design.

**Remediation.** Never let a query filter override a scope key. For Client, ignore `query.clientId` (or intersect): e.g. build the user filter first, then apply scope last, or `clientId: principal.role === ROLE.CLIENT ? principal.clientId : (query.clientId ?? undefined)`. Apply the same "scope wins" ordering pattern to every list endpoint.

---

### H2 — `createTask` enforces project existence, not visibility → Staff writes into out-of-scope projects  **(High)**

**Where:** `apps/backend/src/modules/tasks/tasks-service.ts:79-118`.

**Description.** The comment says *"Project must be visible to the caller"*, but the code only checks the project exists:

```ts
const project = await prisma.project.findFirst({
  where: { id: input.projectId, deletedAt: null },   // ← no scopeWhere() applied
  select: { id: true },
});
if (!project) throw badRequest('Unknown projectId');
```

Every other task operation (`getTask`, `updateTask`, `softDeleteTask`, `addDependency`) calls `assertVisible`, but `createTask` does not. `Staff` holds `TASK_CREATE` (`permissions.ts:150`).

**Exploit scenario.** A Staff user enumerates/guesses a `projectId` from another team and `POST /tasks` with `{ projectId: <other>, assigneeId: <self> }`. The task is created in that project; because they set `assigneeId` to themselves, `scopeWhere` (`:33-43`, `assigneeId` branch) now makes it visible to them — converting a blind write into read+write access to another team's delivery board. They can also set arbitrary `assigneeId`, `milestoneId`, `parentTaskId` (each validated only for existence/same-project, not scope).

**Remediation.** Replace the existence check with the project-scoped check used elsewhere — resolve the project through `projects-service.assertVisible(principal, input.projectId)` (or inline `scopeWhere`) before creating. Validate `assigneeId`/`milestoneId`/`parentTaskId` against the same visible project.

---

### H3 — Storage key/path injection via user-controlled `prefix`; no size/content-type enforcement  **(High)**

**Where:** `apps/backend/src/modules/storage/storage-service.ts:40-45`, `documents-routes.ts:19-62`.

**Description.** `buildStorageKey` sanitizes only the *filename*, never the *prefix*, and `prefix` is a free-form request field:

```ts
// documents-routes.ts:19-25
const RequestUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  visibility: z.enum(DOC_VISIBILITY).default('internal'),
  prefix: z.string().default('uploads'),         // ← arbitrary, unvalidated
});

// storage-service.ts:40-45
export function buildStorageKey(prefix: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');   // filename only
  const ymd = `${d.getUTCFullYear()}/${...}`;
  return `${prefix}/${ymd}/${Date.now()}_${safe}`;          // prefix injected raw
}
```

Additional problems on the same path: the route has **no capability gate** (any authenticated user, including Client, can request presigned PUTs); `sizeBytes` is **recorded but never enforced** (presigned PUT imposes no size limit → storage-exhaustion / cost DoS and a metadata row that lies about size); `mimeType` is attacker-controlled with **no allowlist** (e.g. `text/html`/`image/svg+xml` stored and later served from the bucket origin → stored-XSS surface on download since `presignDownload` sets no `ResponseContentDisposition`).

**Exploit scenario.** A user submits `prefix: "../invoices"` (or any namespace) to steer the object key outside the intended partition, polluting or potentially clobbering other modules' key space within the bucket; or uploads a 5 GB file while recording `sizeBytes: 1`.

**Remediation.** Drop `prefix` from the request entirely (derive it server-side from the document purpose), or validate it against an allowlist (`/^[a-z0-9-]+$/`). Add `document.create` capability gating. Constrain `ContentType` to an allowlist and set it from a trusted value; add `ContentLengthRange` via a presigned POST policy (or verify object size/type out-of-band after upload). Set `ResponseContentDisposition: attachment` on download presigns.

---

### H4 — Refresh flow has no single-flight → concurrent 401s trip reuse-detection and force-logout  **(High)**

**Where:** `apps/web/src/lib/api.ts:70-119` (client), `apps/backend/src/modules/auth/token-service.ts:36-70` (server).

**Description.** The web client refreshes per-request with no de-duplication:

```ts
// api.ts — each failing request independently:
if (res.status === 401 && auth) {
  const refreshed = await tryRefresh();   // reads the SAME localStorage token, POSTs /auth/refresh
  ...
}
```

The server rotates on every refresh and treats a second presentation of an already-rotated token as theft:

```ts
// token-service.ts:45-51
if (existing.revokedAt) {
  await prisma.refreshToken.updateMany({ where: { userId: existing.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  throw unauthorized('Refresh token reuse detected; all sessions revoked');
}
```

**Failure scenario (no attacker needed).** When the 15-minute access token expires, a dashboard that fans out N parallel queries (TanStack Query) gets N simultaneous 401s. Each calls `tryRefresh()` with the same stored token `R0`. Request 1 rotates `R0→R1`. Request 2 presents `R0`, now `revokedAt != null` → **reuse-detection fires, every session is revoked**, and the user is logged out everywhere. This (a) makes legitimate use flaky and (b) renders the reuse-detection signal untrustworthy (constant false positives → operators learn to ignore it), defeating a marquee security control.

**Remediation.** Implement single-flight refresh on the client: a module-level `refreshPromise` that all concurrent callers await, so only one `/auth/refresh` is in flight; queue and replay pending requests after it resolves. Optionally add a small server-side grace window (accept the immediately-prior token for a few seconds) to tolerate races, but the client fix is the correct primary remedy.

---

### M1 — Client portal can edit GST-sensitive & ownership fields on its own client record  **(Medium; High once invoicing lands)**

**Where:** `apps/backend/src/modules/clients/clients-service.ts:133-163`; schema `packages/shared/src/schemas.ts:102` (`UpdateClientSchema = CreateClientSchema.partial().strict()`).

**Description.** `Client` holds `CLIENT_EDIT` (self-only) (`permissions.ts:161`); the comment there claims *"GST-sensitive fields are request-gated"* — but `updateClient` applies **no field-level role gating**. A Client can PATCH its own record's `stateCode`, `gstin`, `legalName`, `ownerUserId`, and `status`:

```ts
...(input.gstin !== undefined ? { gstin: input.gstin } : {}),
...(input.stateCode !== undefined ? { stateCode: input.stateCode } : {}),
...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
...(input.status !== undefined ? { status: input.status } : {}),
```

**Exploit scenario.** A Client flips `stateCode` to/from the supplier state (`SUPPLIER_STATE_CODE`), which is exactly what the invoice module will use to decide intra-state (CGST/SGST) vs inter-state (IGST) — i.e. **self-service tax manipulation** on all future invoices. They can also self-promote `status` to `active`, rewrite `legalName`, or set `ownerUserId` to an arbitrary value. Note `updateClient` (unlike `createClient`, `:103-105`) does **not** validate `ownerUserId` exists, so a bad UUID raises an unmapped FK error (`P2003` → generic 500), and a valid one silently reassigns internal ownership.

**Remediation.** Gate mutable fields by role: Clients may edit only contact-ish fields (e.g. `billingAddress`, `phone`, `email`); `stateCode`/`gstin`/`legalName`/`ownerUserId`/`status` must be internal-only. Validate `ownerUserId` existence on update as on create. Add a P2003 mapping (see L-tier).

---

### M2 — Default / placeholder secrets reachable in production, no prod guard  **(Medium; High if deployed as-is)**

**Where:** `apps/backend/src/config/env.ts:24,33-49`; `apps/backend/.env`; `apps/backend/.env.example`; `apps/backend/prisma/seed.ts:96-108`.

**Description.** JWT secrets correctly have *no* default (`min(32)` required, good). But many other secrets have **in-code defaults** that will silently apply in production: `S3_SECRET_KEY` (`'pixel_minio_dev_pw'`), `S3_ACCESS_KEY`, SMTP creds, and `SUPPLIER_STATE_CODE` default `'37'`. The committed `.env` ships `JWT_ACCESS_SECRET=dev_access_secret_change_me_to_32+_chars_long` (passes the length check while being a public, guessable value) and `SEED_ADMIN_PASSWORD=ChangeMe!2026`; the seed falls back to the same `ChangeMe!2026` if unset (`seed.ts:97`). There is no startup assertion that, when `NODE_ENV=production`, none of these equal their dev/placeholder values.

**Exploit scenario.** A deploy that reuses `.env`/`.env.example` ships a **publicly-known JWT signing secret** → anyone can forge access tokens for any user/role (full auth bypass), plus a **known admin password** and known S3 credentials.

**Remediation.** Remove secret defaults from `env.ts` (require them). Add a production guard that rejects known placeholder values (`*change_me*`, `ChangeMe!2026`, `pixel_minio_dev_pw`). Never commit a real `.env`; keep only `.env.example` with empty values. Force an admin password reset on first login for the seeded account.

---

### M3 — Password-reset token persisted in plaintext in Redis (BullMQ payload); failed jobs kept forever  **(Medium)**

**Where:** `apps/backend/src/modules/auth/auth-routes.ts:58-62`; `jobs/queues.ts:29-34,60-62`.

**Description.** `createPasswordReset` correctly stores only a SHA-256 hash in the DB and never logs the raw token. But the raw token is then handed to the email queue as job data:

```ts
await enqueueEmail({ to: req.body.email, subject: '...', text: `Use this token to reset your password: ${raw}\n...` });
```

BullMQ persists job payloads in Redis. With `removeOnComplete: { age: 24h }` and `removeOnFail: false` (`queues.ts:33`), **every reset token sits in Redis for up to a day (or forever if the send fails)**. The dev Redis runs with no auth (`infra/docker-compose.yml:20-32`).

**Exploit scenario.** Anyone with Redis read access (a second app bug, an exposed port, a compromised cache) lists `bull:email:*` jobs and harvests valid reset tokens → account takeover within the token TTL. Forever-retained failed jobs widen the window indefinitely.

**Remediation.** Don't put the raw token in durable queue data: enqueue only `{ userId, resetId }` and have the worker render the email from a freshly-fetched (still-hashed) record, or include only a single-use opaque id resolved at send time. Set `removeOnComplete: true` and a bounded `removeOnFail` for the email queue. Require Redis auth/TLS in prod.

---

### M4 — `client_id ⇔ role=Client` invariant not enforced on user update; `data: body` mass-assign  **(Medium)**

**Where:** `apps/backend/src/modules/users/users-routes.ts:116-145`.

**Description.** `POST /users` enforces the invariant (`:77-82`), but `PATCH /users/:id` does not, and writes the validated body straight through:

```ts
const updated = await prisma.user.update({ where: { id: target.id }, data: body, select: publicUser });
```

`UpdateUserSchema` is `.strict()` and limited to `fullName/phone/roleId/status` (so this is *bounded* mass-assignment — no `passwordHash`/`email`/`clientId` injection), and non-admins are blocked from `roleId`/`status` (`:134-138`). But an **Admin** can set `roleId` to `Client` on a user with `clientId = null`, or change a Client user to an internal role while leaving `clientId` populated — producing rows that violate the documented invariant and confuse every `scopeWhere` (a `Client` with `clientId = null` resolves to `'__none__'`).

**Exploit scenario.** Admin-only, so this is an integrity/consistency bug rather than privilege escalation: it lets a privileged user (or a buggy admin UI) create role/tenant-inconsistent accounts that downstream scope logic mis-handles.

**Remediation.** Re-run the create-time invariant check on update using the *resulting* `{role, clientId}`. Prefer explicit field mapping over `data: body` even when the schema is strict, for defense-in-depth.

---

### M5 — Refresh token in `localStorage` → XSS = persistent account takeover  **(Medium)**

**Where:** `apps/web/src/lib/api.ts:14,23-30`.

**Description.** The access token lives in memory (good, XSS-resilient), but the **refresh token is stored in `localStorage`** (`pixel.refreshToken`). The header comment frames the design as XSS-resilient; the refresh token undermines that — any successful XSS reads `localStorage`, exfiltrates the 30-day refresh token, and can mint access tokens indefinitely from anywhere. For an app handling client PII and (soon) finance, this is a meaningful blast-radius multiplier. **No active XSS sink was found** (no `dangerouslySetInnerHTML`, no `eval`), so this is latent, not currently chained.

**Remediation.** Move the refresh token to a `Secure; HttpOnly; SameSite=Strict` cookie (the backend already runs `cookie-parser` and CORS `credentials: true`), so JS can't read it; pair with CSRF protection on `/auth/refresh`. If localStorage must stay, keep refresh TTL short and bind tokens to device/UA.

---

### L1 — `Create*` schemas are not `.strict()`  **(Low)**

**Where:** `packages/shared/src/schemas.ts` — `CreateUserSchema` (`:33`), `CreateClientSchema` (`:89`), `CreateProjectSchema` (`:135`), `CreateTaskSchema` (`:174`), `CreateContactSchema` (`:112`), `CreateMilestoneSchema` (`:162`), `SetRolePermissionsSchema` (`:53`). Only the `Update*` variants use `.strict()`.

Unknown fields on create are accepted (then silently dropped because services map fields explicitly), so it is **not currently exploitable**, but it violates the stated contract ("reject unknown fields") and is one refactor away from a mass-assignment bug. **Fix:** add `.strict()` to every request schema.

### L2 — `decimal.js` declared but unused  **(Low/Info)**

`decimal.js` is a backend dependency but is **not imported anywhere** (grep of `apps/backend/src` finds no usage). Money today is a plain JS `number` constrained by `MoneySchema` (`schemas.ts:125-130`) and passed to Prisma `Decimal(14,2)` columns — acceptable for 2-dp validated inputs, but the "decimal.js everywhere" claim is not yet true. **Fix:** when the invoice/GST math lands, do all arithmetic with `decimal.js` (or Prisma.Decimal) and never with JS floats; add rounding tests for CGST/SGST/IGST splits.

### L3 — Task cycle detection only catches direct 2-cycles  **(Low)**

**Where:** `tasks-service.ts:178-181`. A→B→C→A is allowed. Consequence: tasks in a cycle can never reach `done` (the "all deps done" guard at `:131-138` deadlocks), a soft logic-lock. No current traversal recurses over the graph, so there is **no DoS today**, but a future recursive resolver could loop. **Fix:** on `addDependency`, walk the existing dependency graph (BFS/DFS from `dependsOnTaskId`) and reject if `taskId` is reachable.

### L4 — Audit not append-only at DB level; `writeAudit` swallows failures  **(Low)**

**Where:** `audit-service.ts:43-60`; `schema.prisma:666-683`. `writeAudit` catches and logs insert errors but does **not** throw, so a non-finance mutation can commit while its audit row silently fails. The table has no DB-level protection against `UPDATE`/`DELETE` (append-only is only an application convention). RBAC changes correctly use the transactional `writeAuditTx` (`roles-routes.ts:61`), which is good. **Fix:** revoke `UPDATE`/`DELETE` on `audit_logs` from the app DB role; consider failing closed for sensitive actions.

### L5 — Always-on WebGL background; no reduced-motion / no-GPU fallback  **(Low)**

**Where:** `theme/ThemeBackground.tsx:13-31`, `components/three/AmbientField.tsx:61-73`. `AmbientField` renders on **every** route (mounted at the app root), with `frameloop="always"` and continuously-animating `<Float>` shapes — a permanent render loop on top of data screens. There is **no `prefers-reduced-motion` handling anywhere** in the app, and no fallback for software/low-end GPUs (it lazy-loads but always runs once loaded). **Fix:** gate the 3D layer behind `window.matchMedia('(prefers-reduced-motion: reduce)')` and a WebGL/`hardwareConcurrency`/`deviceMemory` capability check; use `frameloop="demand"` or pause off the landing route.

### L6 — Missing aria-labels on icon buttons; unverified glass contrast  **(Low)**

Only one `aria-label` exists across the whole web app. Icon-only controls (close buttons, etc.) need labels; the translucent "glass" theme over a moving background risks failing WCAG AA contrast. **Fix:** add `aria-label` to icon buttons, verify focus traps in the Radix dialog, and audit contrast.

### L7 — Infra/compose hardening & missing app Dockerfile  **(Low)**

`infra/docker-compose.yml` uses default credentials (`pixel/pixel_dev_pw`, `pixel_minio/pixel_minio_dev_pw`), binds all service ports to the host, has no `restart` policy, and mailpit has no healthcheck; **redis has no password** (compounds M3). There is **no Dockerfile / production build artifact** for the API or web app. This is acceptable for local dev but there is no documented prod path. **Fix:** separate dev vs prod compose; secrets via env/secret store; add app Dockerfiles and a hardened prod profile.

### L8 — CI gaps  **(Low)**

`.github/workflows/ci.yml` runs backend `tsc` + `vitest` only. It does **not** run the web type-check (`-w @pixel/web`), the root ESLint (`npm run lint`), `npm audit`, or any web tests. (Task brief said "missing CI"; CI exists but is partial.) **Fix:** add web type-check, lint, and `npm audit --audit-level=high` (or Dependabot) to the pipeline.

### L9 — Fixed `trust proxy = 1` and client-trusted `x-request-id`  **(Low; deploy-dependent)**

**Where:** `app.ts:27`, `middleware/error.ts:9-12`. `app.set('trust proxy', 1)` assumes exactly one proxy hop; if the real deployment has a different hop count (or none), `req.ip` (used for rate-limit keying and audit `ip`) can be spoofed via `X-Forwarded-For`, enabling rate-limit evasion and audit-IP forgery. The `requestId` middleware echoes a client-supplied `x-request-id` verbatim into responses and logs (log-forging / unbounded value). **Fix:** set `trust proxy` to the actual infrastructure value; sanitize/cap or ignore inbound `x-request-id` (generate server-side, only correlate if it matches a safe pattern).

### I1 — Suspended/deleted user keeps a live socket until token expiry  **(Info)**

**Where:** `realtime/io.ts:20-33`. HTTP requests re-check `status`/`deletedAt` every request (`authenticate.ts:27-34`, good), but the Socket.IO handshake only verifies the JWT signature/exp — a user suspended mid-session retains their socket for up to the 15-minute access TTL. No sensitive events are emitted yet, so impact is minimal. **Fix:** re-check DB status on connect and periodically; disconnect on suspend via `revokeAllForUser` + a presence sweep.

### I2 — `setMembers` doesn't restrict members to internal users  **(Info)**

**Where:** `projects-service.ts:165-177`. Member user ids are validated for existence only; a Client-role user could be added as a project member. It doesn't currently grant cross-tenant read (Client scope keys off `clientId`, not membership), but it's an inconsistency. **Fix:** reject non-internal users in `setMembers`.

### I3 — `JWT_REFRESH_SECRET` required but unused  **(Info)**

**Where:** `config/env.ts:16`. Refresh tokens are opaque random strings (correct design), so `JWT_REFRESH_SECRET` is never read. Harmless but misleading (implies refresh JWTs exist). **Fix:** remove it, or document it as reserved.

---

## 4. Positive notes (controls implemented correctly — do not regress)

- **JWT hardening:** `signAccessToken`/`verifyAccessToken` pin `algorithm: 'HS256'` and pass `algorithms: ['HS256']` to verify → **no algorithm-confusion / `alg:none`** (`auth/jwt.ts`). Short 15m access TTL.
- **Refresh design:** opaque 256-bit tokens, **only SHA-256 hashes stored**, rotation on every use, reuse-detection, atomic rotate in a transaction (`token-service.ts`). (The control is sound; H4 is a client concurrency defect, not a design flaw.)
- **Passwords:** argon2id with sane params (19 MiB / t=2 / p=1); login does constant-ish work for unknown users to blunt enumeration timing (`auth-service.ts:44-51`).
- **Password reset:** hashed at rest, single-use (revoked in a transaction), TTL-bounded, 256-bit entropy, and **never logged**; sessions revoked after reset (`auth-service.ts:101-139`).
- **Per-request permission resolution** from the DB so role/permission changes take effect immediately, and suspended/soft-deleted users are rejected on every HTTP request (`authenticate.ts`).
- **Scope contract:** out-of-scope access returns **404 (`notFound`), never 403** (`lib/errors.ts`, `middleware/rbac.ts`), avoiding existence leaks — applied consistently in clients/projects/tasks read/update/delete via `assertVisible`/`scopeWhere` (the gaps are C1/H1/H2, not the pattern).
- **No raw SQL** anywhere (`grep` for `queryRaw`/`executeRaw`/`Prisma.sql` is empty) → no SQL-injection surface; pgvector not yet queried.
- **Prisma error mapping:** `P2002`→409, `P2025`→404, everything else→generic 500 with a `requestId`, no stack traces or internals leaked (`middleware/error.ts`).
- **Validation & pagination:** every mutating route runs `validateBody` with a shared Zod schema; all list endpoints use bounded cursor pagination (`limit` max 100, default 25) and over-fetch-by-one keyset paging (`lib/pagination.ts`).
- **Soft-delete** `deletedAt: null` is consistently applied on the read paths reviewed.
- **Transactions** for multi-write ops: primary-contact toggle, project member replacement, role-permission replacement (with `writeAuditTx`), and password reset.
- **Transport:** `helmet`, CORS locked to `WEB_ORIGIN` with credentials, 1 MB JSON body cap, Redis-backed env-aware rate limiting (auth 20/15m, global 300/min in prod), pino redaction of `authorization`/`cookie`/`*.password`/`*.token`/`*.refreshToken`.
- **Realtime:** Socket.IO authenticated by the access JWT; clients join only their own `user:<id>` room and there is **no client-controlled `join`** handler → users cannot subscribe to others' events.
- **Frontend:** access token in memory; route + capability gating via `ProtectedRoute`/`can()`; correct TanStack Query invalidation; code-splitting (lazy landing, dashboard, and the three.js chunk); GSAP cleanup via `gsap.context()` + `ScrollTrigger.getAll().kill()`; fail-fast env validation. Client-side `can()` gating is cosmetic-only and (except for the C1/H1/H2 server gaps) **is backed by server-side `requirePermission` on every mutating route**.

---

## 5. Prioritized remediation plan

**P0 — fix before any external/multi-tenant exposure**
1. **C1 Documents tenant scope + capability** — add `clientId`/`projectId` to `Document`, scope reads, add `document.*` perms. *(Effort: M — schema migration + route rework.)*
2. **H1 Project list scope override** — stop query params overriding scope keys (audit all list endpoints for the pattern). *(Effort: S.)*
3. **H2 createTask visibility** — apply project scope before create. *(Effort: S.)*
4. **H3 Storage prefix/size/type** — remove/allowlist `prefix`, gate capability, enforce size/content-type, attachment disposition. *(Effort: S–M.)*

**P1 — fix before production launch**
5. **M2 Secrets** — remove defaults, add prod placeholder guard, rotate/seed admin reset. *(Effort: S.)*
6. **H4 Refresh single-flight** — client refresh de-dup + optional server grace window. *(Effort: S.)*
7. **M3 Reset-token in Redis** — stop persisting raw tokens; bound queue retention; Redis auth. *(Effort: S.)*
8. **M1 Client field gating** — restrict GST/ownership/status fields to internal roles; validate `ownerUserId` on update. *(Effort: S.)*
9. **M5 Refresh token → HttpOnly cookie + CSRF.** *(Effort: M.)*

**P2 — hardening & correctness**
10. **M4** invariant on update; **L1** `.strict()` on all create schemas; **L4** DB-level audit immutability; **L9** trust-proxy/request-id; **I1/I2/I3**. *(Effort: S each.)*
11. **G1/L8** dependency upgrades (`nodemailer@≥9.0.1`; dev-only vite/esbuild/vitest bump or accept-with-note) + CI: add web type-check, lint, `npm audit`. *(Effort: S–M; nodemailer is a major bump — test the mailer.)*
12. **L2** wire `decimal.js` into the invoice/GST math with rounding tests (when that module lands). *(Effort: M, future.)*
13. **L3** full cycle detection; **L5/L6** `prefers-reduced-motion`, GPU fallback, aria-labels, contrast. *(Effort: S–M.)*

### G1 — `npm audit` triage
- **nodemailer ≤9.0.0 (high/critical):** the advisories (CRLF/SMTP command injection, jsonTransport file-access bypass, OAuth2 TLS, SSRF) require attacker-controlled headers/addresses/transport options. This app sends only server-templated mail to addresses pulled from validated records, with no user-controlled headers, so **practical exploitability is currently low** — but it's a high-severity transitive risk on the auth path (reset emails). **Action: upgrade to `nodemailer@^9.0.1`** and regression-test `lib/mailer.ts`.
- **esbuild/vite/vite-node/vitest (moderate):** the esbuild dev-server SSRF affects the **local dev server only**; it is not part of any production artifact. **Action: low urgency**; bump when convenient (`vite`/`vitest` majors are breaking) or accept with a documented note. No production exposure.
