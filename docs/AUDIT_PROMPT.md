# Audit Prompt — Pixel Academy Agency OS (full functional + logic QA)

> Hand this to a coding/QA agent to systematically audit the running application:
> exercise every button and form, verify the logic and data correctness, and
> catalog everything missing or broken. Self-contained: an agent with no prior
> context can act on it. Produce a single prioritized report — do not fix unless
> told; if asked to fix, do it in small per-issue commits.

---

## 1. Role & objective

You are a senior QA + full-stack engineer doing a **comprehensive audit** of Pixel
Academy Agency OS (a Teamwork-style Agency ERP: React + Vite frontend, Express +
Prisma + PostgreSQL backend, monorepo with `@pixel/shared`). Your goal: find every
broken interaction, logic error, validation gap, missing CRUD action, and missing
state — across **every screen and every role** — and report them with severity,
exact repro steps, and the responsible file/line.

You must **actually exercise the app**, not just read code. Click every button,
submit every form (valid + invalid), and watch the network + console. Verify the
*logic*, not just that a request returns 200.

---

## 2. Environment & access

- Start infra + app: `npm run infra:up` → `npm run db:migrate` → `npm run db:seed`
  → `npm run dev:backend` + `npm run dev:web`. Web `:5173`, API `:4000`.
- Seed admin: `admin@pixelacademy.local` / `ChangeMe!2026`.
- **Test every role**, not just admin — RBAC scoping bugs only appear as non-admins.
  Create one user per role (Manager, Project Manager, Team Lead, staff specialist,
  Finance, HR, Client) via the API/seed and log in as each. The role→permission map
  is in `packages/shared/src/permissions.ts`; the route guards are
  `requirePermission(...)`. A screen that 200s for admin may 403 or leak/hide data
  for others — both are findings.
- Tools you should use: the browser (click through every page), the API directly
  (`curl` with a bearer token) to confirm backend behavior, the **browser console**
  (JS errors), the **network tab** (4xx/5xx, payload shape), and the **DB** to
  confirm writes actually persisted and money/derived fields are correct.

---

## 3. What to check on EVERY screen (per-page checklist)

For each route (`/`, `/clients`, `/deals`, `/projects`, `/tasks`, `/timesheets`,
`/attendance`, `/leaves`, `/invoices`, `/expenses`, `/contracts`, `/tickets`,
`/notifications`, `/users`, `/style`, plus login/landing), walk this checklist:

**A. Every interactive element**
- Click every button, link, tab, filter, sort header, row, drag target, menu item,
  bell, avatar menu, command palette (⌘K). Note any that do nothing, throw, or
  navigate wrong.
- Open every modal/sheet: does Cancel/close work? Does Escape close? Does clicking
  the backdrop close? Does it trap focus?

**B. Every form (happy + unhappy path)**
- Submit valid input → confirm it persists (re-fetch / check DB) and the UI updates
  (list refreshes, toast shows, modal closes).
- Submit invalid input: empty required fields, too-long strings, negative/zero money,
  end-date-before-start-date, bad email/GSTIN, out-of-range numbers. Confirm a
  *useful inline error* appears — not a generic "Request validation failed" or a
  silent failure. Mismatch between client-side limits and the Zod schema in
  `packages/shared/src/schemas.ts` is a bug (e.g. a list querying `limit=200` when
  `PaginationSchema` caps at 100 → 400).
- Confirm the disabled/loading state during submit; double-click shouldn't double-submit.

**C. CRUD completeness (this product is full of gaps here — look hard)**
- For every entity list, is there **Create, Read, Edit, Delete** as appropriate?
  Many pages are create-only or read-only. Specifically verify edit/delete exist
  (or are intentionally omitted by permission) for: **Clients (no edit currently),
  Projects, Tasks, Deals, Invoices, Expenses, Contracts, Tickets, Users, Leave
  types.** Each missing action a role *should* have is a finding.
- Does the action respect the permission? A user without `*.edit` should not see the
  edit control; a user with it should. Cross-check the control's `can(PERMISSIONS.X)`
  gate against the backend route's `requirePermission`.

**D. States**
- Loading (skeleton/spinner), empty (designed empty state, not a blank table),
  error (network down / 500 → friendly message, not a white screen).
- Pagination/infinite scroll: does "load more"/cursor work past the first page?
- Stale data: after an edit elsewhere, does this view reflect it (query invalidation)?

**E. Data correctness & logic (the important part)**
- **Money/GST:** totals, subtotals, CGST/SGST/IGST, balance, outstanding,
  MRR, weighted pipeline, budget burn — recompute by hand and compare. Intra-state
  vs inter-state GST must differ. Rounding must reconcile to the paisa. Numbers must
  never show float artifacts (`0.30000000000000004`).
- **Dashboard KPIs:** verify each tile against the DB (revenue MTD = sum of payments
  this month; utilization = logged ÷ capacity; delayed = active past end date).
- **Status machines:** illegal transitions must be blocked (tasks, tickets,
  timesheets, deals, invoices, leaves). Try to force an illegal one via the API.
- **Scoping:** as a staff user, can you see/edit another user's timesheet, another
  client's invoice, another team's tasks? As a client, can you reach internal data?
  Any leakage is **Critical**.
- **Dates/timezones:** off-by-one on date-only fields (UTC vs local); "ends in Nd"
  math; overdue logic.

**F. Cross-cutting**
- Console errors/warnings on load and on interaction (React key warnings, act
  warnings, failed prop types, uncaught promise rejections).
- Network: any 4xx/5xx in normal use; any request firing on every keystroke; any
  N+1 storm.
- Responsive: 375px mobile, 768px tablet, 1440px desktop — overflow, clipped
  controls, unusable tables.
- Accessibility: keyboard-only nav (tab order, focus rings, Escape), `aria-label` on
  icon-only buttons, color-contrast, form labels.
- Auth: token refresh on expiry; logout clears session; protected routes redirect
  when logged out; deep-link to a permission-gated route as a forbidden role.

---

## 4. Known-pattern hotspots (check these first — they recur in this codebase)

1. **Client/server validation drift** — frontend sends a value the Zod schema
   rejects (limits, enums, required combos). Symptom: "Request validation failed",
   blank/zero UI. (Already seen with `deals?limit=200`.)
2. **Missing edit/delete** — pages built create-only. Clients especially.
3. **Empty-but-not-broken** — pages show ₹0 / no rows because the seed has no
   transactional data; distinguish "no data" from "query erroring." Check the
   network response, not just the screen.
4. **Permission gating mismatch** — UI shows an action the API forbids (or hides one
   the API allows).
5. **Optimistic update / cache invalidation** — after a mutation, does every
   affected list refresh (e.g. moving a deal stage updates tiles; approving a leave
   updates counts)?
6. **Decimal-as-string money** — values arrive as strings; ensure `Number(...)`
   conversions and `formatINR` are applied consistently (no `"150000.00"` raw, no NaN).
7. **Inert shell controls** — header icons/menus that don't do anything.

---

## 5. Method

1. Inventory every route from `apps/web/src/App.tsx` and every nav item from
   `apps/web/src/nav.ts`. Inventory every backend route from `apps/backend/src/app.ts`
   and confirm each has a frontend surface (or note "backend-only, no UI").
2. For each route, run the §3 checklist as each relevant role. Record findings as you
   go — don't batch from memory.
3. For each finding, capture: **repro steps**, **expected vs actual**, **evidence**
   (console/network/DB), **suspected file:line**, **severity**.
4. Also produce a **coverage matrix**: rows = entities, columns = Create/Read/Edit/
   Delete/Filter/Validate, cells = ✅/❌/N-A — so missing actions are obvious at a glance.

---

## 6. Severity definitions

- **Critical** — data loss/corruption, money miscalculation, auth bypass, cross-tenant
  data leak, or a primary flow fully broken (can't create/save).
- **High** — a core action broken or missing for a role that needs it; wrong totals
  on a secondary view; illegal state transition allowed.
- **Medium** — missing edit/delete where expected; poor/no validation message; missing
  empty/error state; cache not invalidating.
- **Low** — cosmetic, copy, minor responsive/a11y, console warning.

---

## 7. Deliverable (output format)

A single markdown report:

```
# QA Audit — Pixel Academy Agency OS  (date, commit SHA)

## Summary
- Screens audited: N/15 · Roles tested: N/8
- Findings: X Critical · Y High · Z Medium · W Low
- Top 5 must-fix (one line each)

## CRUD coverage matrix
| Entity | Create | Read | Edit | Delete | Filter | Validation |
|--------|--------|------|------|--------|--------|------------|
| Client |  ✅   |  ✅  |  ❌  |   ❌   |   ✅   |   partial  |
| ...    |       |      |      |        |        |            |

## Findings (grouped by severity, then by screen)
### [Critical] <title>
- Screen / role:
- Repro: 1… 2… 3…
- Expected: …  Actual: …
- Evidence: <console/network/DB/screenshot>
- Suspected source: path/to/file.ts:line
- Suggested fix: …

(repeat)

## Backend endpoints with no UI
- /contracts … (now built), /kb, /ai, /reports/financial, /documents, …

## Recommendations (prioritized)
1. …
```

Be specific and reproducible. Prefer fewer, verified, high-confidence findings over
a long list of guesses. If you couldn't test something (e.g. a role you couldn't
create), say so explicitly rather than assuming it works.
```
