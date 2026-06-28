# Build Prompt — Pixel Academy Agency OS (Teamwork-parity Agency ERP)

> Hand this to a coding agent (or use yourself) to drive development toward full
> Teamwork.com feature parity, tailored for an Indian webinar-education agency.
> It is self-contained: an agent with no prior context can act on it.

---

## 1. Role & mission

You are a senior full-stack engineer extending **Pixel Academy Agency OS** — a unified
Agency Operating System (ERP) for an agency serving online coaches, course creators and
digital businesses. The product replaces Teamwork + HubSpot + Zoho + a CRM with one
platform covering the whole lifecycle: **lead → sale → onboarding → delivery → production →
finance → reporting → support → renewal.**

Reference product for feature scope and UX quality bar: **Teamwork.com**. Indian agency
context: default **INR**, **GST** invoicing, **WhatsApp-first** comms, webinar-funnel
delivery.

Your job is to close the gap to Teamwork parity in **reviewable, shippable slices** — never
a giant unreviewable diff. Each slice: backend (if needed) → frontend → typecheck → build →
manual smoke test → commit.

---

## 2. Architecture & stack (match this exactly — do not introduce new patterns)

Monorepo (npm workspaces): `apps/backend`, `apps/web`, `packages/shared`.

**Backend** — Node 22, Express, TypeScript (strict), Prisma + PostgreSQL (extensions:
`citext`, `vector`, `pgcrypto`), Redis, MinIO (S3), Zod validation, JWT auth.
- One module per domain in `apps/backend/src/modules/<name>/` with `*-routes.ts` +
  `*-service.ts`. Mount in `apps/backend/src/app.ts`.
- **IDs:** UUID v7 minted in app code via `src/lib/uuid.ts` (`uuidv7()`), passed explicitly
  on create. PK is `id @db.Uuid`.
- **Money:** integer **paise** internally, `NUMERIC(14,2)` rupees in DB. Use
  `src/lib/money.ts` (`decimalToPaise`, `paiseToDecimalString`, `balancePaise`, GST engine).
  Never do float rupee math.
- **Soft delete:** `deletedAt` on business tables; always filter `deletedAt: null`.
- **Timestamps:** `created_at`/`updated_at` (UTC, `@db.Timestamptz`) on every table.
- **AuthZ:** every route is `requirePermission(PERMISSIONS.X)`; permissions live in
  `packages/shared/src/permissions.ts` and are role-mapped there. Services re-scope rows by
  role (Admin/Manager = org-wide; staff = own; client = their account).
- **Audit:** mutating services call `writeAudit({ actorId, action, entityType, entityId, ... })`.
- **Pagination:** cursor-based via `src/lib/pagination.ts` (`cursorArgs`, `toPage`).
- **Validation:** Zod schemas in `packages/shared/src/schemas.ts`; routes use
  `validateBody` / `validateQuery`. Export inferred `*Input` types.
- Migrations: `npm run db:migrate`. Seed: `npm run db:seed`.

**Frontend** — React 18 + Vite + TypeScript (strict), React Router, TanStack Query, Tailwind,
`motion/react`, lucide-react icons.
- One feature per domain in `apps/web/src/features/<name>/api.ts` (typed React Query hooks +
  row interfaces). Pages in `apps/web/src/pages/<Name>Page.tsx`.
- API client: `apps/web/src/lib/api.ts` (`api.get/post/patch/del`); access token in memory,
  refresh token rotated. Never put tokens in localStorage beyond the refresh token.
- **Reuse the design system** in `apps/web/src/components/ui.ts`: `PageHeader`, `DataTable`
  (with `Column<T>`), `Badge` (`Tone`), `Button` (`icon`/`variant`/`size`/`loading`),
  `Modal`, `Sheet`, `Select`, `Input`, `Field`, `EmptyState`, `ErrorNote`, `Avatar`,
  `SegmentedControl`, toasts via `components/ui/toast.js`. Match the Tasks/Clients pages.
- Formatting: `lib/format.ts` (`formatINR`, `formatDate`, `titleCase`).
- Register routes in `apps/web/src/App.tsx` (lazy-loaded) and nav in `apps/web/src/nav.ts`,
  each gated by the same permission as its API.
- Money/enums/types are imported from `@pixel/shared` — never redefine them.

**Local run:** `npm run infra:up` (Docker via colima) → `npm run db:migrate` →
`npm run db:seed` → `npm run dev:backend` + `npm run dev:web`
(web :5173, api :4000). Seed admin: `admin@pixelacademy.local` / `ChangeMe!2026`.

---

## 3. Current state (already built — do NOT rebuild)

- **Backend modules (19):** auth, users/roles, clients, deals, projects, tasks, milestones,
  timesheets, attendance, leaves, invoices (GST), payments, expenses, contracts, tickets+SLA,
  kb (RAG), ai, notifications, audit, storage, reports.
- **Frontend pages (real):** Dashboard (with executive KPIs), Clients, Projects, Tasks
  (list + Kanban), Time tracking, Attendance, Leaves, Invoices, Users, Design system.
- 37 Prisma models incl. `Service` catalog, `WorkItem`, `SalaryRecord`, `StaffProfile`.

So the **backend is ~70% of Teamwork's surface; the frontend is the bottleneck.** Prefer
"wire an existing backend to a new page" over net-new modeling where possible.

---

## 4. Epics & acceptance criteria (the backlog)

Build in the order below. Each epic = its own branch/commit(s). Acceptance = TypeScript
clean (`tsc -p` both apps), `vite build` passes, route gated by permission, and the feature
verified live against the running app.

### Epic 1 — Wire existing backends to pages (fast, high coverage)
- **Tickets + SLA page:** list with SLA due/breach indicators, status flow, assignee,
  ticket detail Sheet with event timeline; create ticket.
- **Deals / sales pipeline:** Kanban board by stage (lead→qualified→proposal→negotiation→
  won/lost), drag to move stage, value + probability, weighted pipeline total; create/edit deal.
- **Expenses page:** list, submit expense (category, amount, project, receipt upload via
  storage), approve/reject for approvers.
- **Contracts page:** list with status (active/expiring/expired), value, term; create + link
  to client/project; expiry highlighting.
- **Notifications center:** bell dropdown + page; mark read; deep-link to entity.

### Epic 2 — Client Portal (key agency differentiator)
- Separate permission-scoped area for `client` role users: their projects, tasks (read),
  files, invoices + pay, approvals, support tickets. Reuse existing models; add a portal
  shell/layout and `client.*` scoped endpoints where missing. No internal data leakage —
  enforce row scoping in services, not just the UI.

### Epic 3 — Daily-driver UX
- **My Work:** cross-project view of the current user's assigned tasks + due timesheets,
  grouped by due date.
- **Live timer:** start/stop timer that creates a draft timesheet entry on stop; running
  state persisted (Redis or DB) and shown in the shell.
- **Comments/activity:** generic comment thread on tasks/projects/tickets (new `Comment`
  model: polymorphic `entityType`/`entityId`, author, body, @mention → notification).
- **File management UI:** browse/upload/download `Document`s per project/client via storage.

### Epic 4 — Automation & service templates (from the product vision)
- **Service-template engine:** when a deal is won / a project is created for a service (e.g.
  "Webinar Funnel"), auto-scaffold the standard milestones + tasks + checklist for that
  service (landing page, thank-you, registration form, CRM setup, email/WhatsApp automation,
  payment gateway, QA, launch checklist…). Define templates as data, not code.
- **Automation rules (v1):** trigger→action rules (e.g. "task overdue → notify manager",
  "invoice overdue → WhatsApp reminder", "deal won → create project"). Persist rules; run via
  a job/worker.

### Epic 5 — Finance depth
- **Invoice issue flow + PDF:** draft→issue (assign number), GST-correct PDF, record payments,
  status auto-transition (issued→partially_paid→paid→overdue).
- **Quotes:** quote → accepted → convert to project + draft invoice.
- **Budget burn:** per-project budget vs. logged-cost (timesheet minutes × role rate) +
  expenses; health indicator. Introduce **per-role/per-project rates** + optional
  **multi-currency** (store currency + FX at invoice time).
- **Profitability report:** per-project and per-client P&L (revenue − labor cost − expenses).

### Epic 6 — Planning & reporting
- **Resource/capacity planner:** per-person weekly workload (assigned estimate vs. capacity),
  over-allocation flags, tentative projects for scenario planning.
- **Gantt / timeline:** project tasks on a timeline with dependencies + milestones.
- **Custom reports:** user-configurable table reports (pick entity, columns, filters, group-by)
  with CSV export.
- **Project health scoring:** planned-vs-actual, overdue %, budget burn → RAG status on the
  dashboard.

### Epic 7 — AI assistant (Pixel AI) & integrations
- **Assistant UI** over the existing RAG/ai backend: proposal writing, requirement analysis,
  auto task generation, SOPs, funnel/landing/ad/email/webinar copy, meeting summaries, client
  replies, risk/delay prediction, report generation. Default to the latest Claude models.
- **Integrations:** WhatsApp (Cloud API) for reminders/notifications; accounting export
  (Xero/QuickBooks/Tally CSV); Zapier/Make webhooks.

---

## 5. Working agreements

- **One epic per branch; small commits.** Conventional Commits (`feat(scope): …`,
  `fix(scope): …`). End commit messages with the required `Co-Authored-By` trailer.
- **Never break the build.** Run `tsc --noEmit -p .` for both apps and `vite build` before
  every commit. Regenerate Prisma client after schema changes.
- **Match existing code** — read the nearest sibling module/page first and mirror its
  structure, naming, and error handling. Reuse `ui.ts` components; do not add a UI kit.
- **Security:** every endpoint permission-gated; every service row-scoped by role; validate
  all input with Zod; audit all mutations. Client-portal endpoints must be provably unable to
  read other clients' data.
- **Data integrity:** money in paise; GST via the money engine; soft-delete; UTC timestamps;
  UUID v7.
- **Verify before claiming done:** seed or create sample data and exercise the feature against
  the running app; report what you actually observed (don't assert success you didn't see).
- **Don't over-scope a slice.** If an epic is large, ship its read views first, then actions,
  then polish.

---

## 6. Kickoff instruction

> Start with **Epic 1**. For each item: confirm the backend endpoint + shape, add a
> `features/<name>/api.ts` hook, build the page mirroring `TasksPage.tsx`/`InvoicesPage.tsx`,
> wire the route (`App.tsx`) and nav (`nav.ts`) behind the right permission, typecheck, build,
> smoke-test against `localhost:5173`, then commit. Post a one-line status after each item and
> proceed to the next without waiting, unless a decision genuinely requires the product owner.
