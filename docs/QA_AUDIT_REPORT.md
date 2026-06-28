# QA Audit — Pixel Academy Agency OS

Date: 2026-06-28 · Commit: `655beb8` · Auditor: automated (API + code, partial browser)

## Summary
- Screens inventoried: 15/15 · Roles exercised live: 2/4 (Admin, Staff) — only
  Admin/Client/Manager/Staff roles exist in seed (the PDF's 20+ roles are not seeded).
- Findings: **0 Critical · 2 High · 7 Medium · 2 Low**
- What's solid: RBAC scoping (no data leakage found), status-machine enforcement,
  pagination validation (drift bug fixed in `8b25982`), empty/loading/error states on
  the new pages.

### Top 5 must-fix
1. **Invoices page is read-only** — no create / issue / record-payment UI despite a
   full GST billing backend. Core finance flow unusable from the app. *(High)*
2. **Users page is read-only** — admins can't invite or edit users in the UI. *(High)*
3. **Clients has no Edit** — `useUpdateClient` exists but is never wired. *(Medium)*
4. **Form errors are generic** — API returns field-level `details`, but the client
   drops them; every invalid form shows "Request validation failed". *(Medium)*
5. **Partial edits** — Tasks (status-only), Tickets (no subject/assignee edit),
   Timesheets (no edit), Leaves (no cancel) — hooks/endpoints exist, UI doesn't. *(Medium)*

---

## CRUD coverage matrix
Legend: ✅ present · 🟡 partial · ❌ missing (backend supports it) · — N/A

| Entity | Create | Read | Edit | Delete | Filter | Notes |
|--------|:--:|:--:|:--:|:--:|:--:|------|
| Client | ✅ | ✅ | ❌ | ✅ | ✅ | `useUpdateClient` defined but unused |
| Deal | ✅ | ✅ | 🟡 | ❌ | 🟡 | edit = stage drag only; no value/owner edit, no delete |
| Project | ✅ | ✅ | ✅ | ✅ | ✅ | full |
| Task | ✅ | ✅ | 🟡 | ✅ | ✅ | sheet edits status only; no title/assignee/priority/due |
| Timesheet | ✅ | ✅ | ❌ | ✅ | ✅ | `useUpdateTimesheet` defined but unused |
| Attendance | ❌ | ✅ | ❌ | ❌ | ✅ | read-only; backend supports upsert/correction |
| Leave | ✅ | ✅ | ❌ | — | ✅ | `useCancelLeaveRequest` defined but unused; decide ✅ |
| Invoice | ❌ | ✅ | ❌ | ❌ | ✅ | **read-only**; backend has create/issue/pay/GST |
| Expense | ✅ | ✅ | ❌ | ❌ | ✅ | decide ✅; no edit/delete |
| Contract | ✅ | ✅ | ❌ | ❌ | ✅ | no edit/delete; backend supports patch/delete |
| Ticket | ✅ | ✅ | 🟡 | ❌ | ✅ | transition + comment; no subject/assignee/priority edit |
| User | ❌ | ✅ | ❌ | ❌ | ❌ | **read-only**; backend supports create/edit |
| Notification | — | ✅ | — | — | ✅ | mark-read / mark-all ✅ |

---

## Findings

### [High] Invoices page is read-only — no billing actions
- Screen/role: `/invoices`, Admin/Finance.
- Repro: open Invoices → only a filterable list + total tiles; no "New invoice",
  no issue, no record-payment, no row detail.
- Expected: create draft → issue (number + GST) → record payments → status
  transitions, all of which the backend already implements.
- Evidence: `apps/web/src/features/invoices/api.ts` exposes only `useInvoices` (read).
  Backend `apps/backend/src/modules/invoices/invoices-routes.ts` has POST/PATCH/pay.
- Suggested fix: add create/issue/payment hooks + a detail Sheet with line items.

### [High] Users page is read-only — no invite/edit
- Screen/role: `/users`, Admin/HR.
- Repro: `/users` shows a directory only; no create/edit/deactivate.
- Evidence: `features/users/api.ts` exposes only `useUsers`. Backend
  `users-routes.ts` supports create + edit.
- Suggested fix: invite-user modal + edit (role/status) action gated by `user.edit`.

### [Medium] Clients — no Edit action
- `apps/web/src/pages/ClientsPage.tsx` imports `useDeleteClient` but not
  `useUpdateClient` (which exists in `features/clients/api.ts`). Detail sheet has
  Delete but no Edit. Wire an edit form gated by `client.edit`.

### [Medium] Validation errors are not surfaced per-field
- Backend returns `error.details: [{field, issue}]` (verified: creating a deal with
  no title → `{field:"title", issue:"Required"}`), but `ApiRequestError`
  (`apps/web/src/lib/api.ts:44`) only captures `message`, so all forms show the
  generic "Request validation failed".
- Fix: carry `details` on `ApiRequestError` and render field errors in forms.

### [Medium] Partial edit — Tasks
- `TaskSheet` only changes status; title/assignee/priority/due/description are not
  editable though `useUpdateTask` supports them. Add an edit form.

### [Medium] Partial edit — Tickets
- Only transition + comment; subject/assignee/priority not editable though
  `UpdateTicketSchema` + `PATCH /tickets/:id` exist.

### [Medium] Timesheets — no edit
- `useUpdateTimesheet` defined but unused; draft entries can't be corrected, only
  deleted + re-created.

### [Medium] Leaves — no cancel
- `useCancelLeaveRequest` defined but unused; `POST /leaves/requests/:id/cancel`
  exists. Add a Cancel action on the requester's own pending rows.

### [Medium] Deals — no full edit / no delete
- Board supports stage drag (PATCH) but value/probability/owner/title aren't editable
  after creation and there's no delete, though backend supports both.

### [Low] Attendance is read-only
- No clock-in/correction UI. May be intentional (clock-in is a separate flow), but
  backend supports manual upsert; flag for product decision.

### [Low] Empty dashboards/tiles read as "₹0"
- Revenue/MRR/pipeline tiles show ₹0 because the seed has no transactional data
  (verified the endpoints return correct structure, not errors). Seed sample
  invoices/payments/timesheets so the app demos populated, and so money/GST math can
  be audited live (currently untestable — no invoices seeded).

---

## Verified-correct (no action needed)
- **RBAC scoping:** as Staff — `/invoices` 403, `/reports/financial` `scope=denied`,
  `/reports/dashboard` `scope=self`, clients/deals/tickets return 0 rows (own scope),
  approving own timesheet 403. No cross-tenant leakage observed.
- **Status machines:** illegal task transition `todo→done` → 422.
- **Pagination validation:** all frontend list limits are ≤100 (drift bug fixed).
- **Notifications:** bell badge, mark-read, mark-all, deep-links work end-to-end.

## Not tested (call out honestly)
- **GST math live** — no invoices seeded; intra/inter-state CGST/SGST/IGST not verified
  against hand calc. Seed invoices, then verify.
- **Manager / Client / PM / Finance / HR roles** — not seeded, so their exact
  visibility wasn't exercised live (only Admin + Staff were).
- **Browser-only checks** — modal Escape/backdrop close, focus trapping, double-submit,
  keyboard nav, responsive breakpoints, console warnings: require a real browser pass.

## Backend endpoints with no UI
`/kb` (knowledge base / RAG), `/ai` (assistant), `/documents` (file management),
`/reports/financial` (no report page), `/roles` (no roles admin), `/me` (profile page).

## Recommendations (prioritized)
1. Build the Invoices billing UI (create/issue/pay) — highest-value gap.
2. Add the missing edit/delete actions (Clients, Tasks, Tickets, Timesheets, Leaves,
   Deals, Expenses, Contracts, Users) — mostly small, backends exist.
3. Surface field-level validation errors app-wide (one fix in `api.ts` + form wiring).
4. Seed transactional sample data so finance/KPI logic is demoable and auditable.
5. Schedule a browser pass for a11y/responsive/console findings this audit couldn't cover.
