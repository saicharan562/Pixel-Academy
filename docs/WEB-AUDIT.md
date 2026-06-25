# Pixel Academy — Web Redesign Audit (`apps/web`)

**Scope:** the recently-shipped "flagship SaaS" redesign — design system, primitive kit, app
shell, screens (Login / Dashboard / Clients / Projects / Tasks / Style), motion + capability
gating, and optimistic data flow.
**Date:** 2026-06-25
**Method:** source review against the running build + `tsc`/`vite build`, plus targeted greps and
hand-computed WCAG contrast ratios. **Findings only — no code changed this pass.**

> Note: an unrelated CSV (Dr. Aravind staff/billing) was attached to the task; it has no bearing
> on this web audit and was not used.

---

## 1. Executive summary

The redesign is a **genuine, coherent step-change** over the previous sci-fi template: a real
token layer, a self-hosted variable font, a deduplicated DataTable, Radix-backed focus-trapped
Modal/Sheet/⌘K, route-level code-splitting with a truly-lazy three.js chunk, and a structurally
correct optimistic-update flow. `tsc` and `vite build` are **clean** with no circular-dependency
or chunk-size warnings.

It is **not yet at the flagship/AA bar it claims**, and the gaps cluster exactly where the brief
said to look hardest — accessibility and motion correctness. The most material issues: **several
Motion (JS/WAAPI) animations bypass the reduced-motion guard** (the global CSS `@media` block only
stops CSS animations, not Framer Motion); **form errors aren't programmatically associated** with
inputs and the **user menu isn't keyboard-operable**; **`content-tertiary` drops below 4.5:1 on
`surface-2/3`** (computed ~4.3:1); the **font isn't preloaded** so first-visit paints in the
system fallback under `font-display: optional`; and the **Dashboard silently swallows query
errors**, rendering zeros instead of an error state. None are data-loss bugs; the optimistic cache
logic is sound apart from a transient concurrent-mutation rollback window that self-heals.

### Ship-readiness verdict
**Beta-ready** (internal/stakeholder demo today). **~1–1.5 engineer-days** of a11y + polish work
from a defensible "flagship, WCAG 2.1 AA" claim. No P0 blockers; the P1 cluster is a11y.

### Severity tally
| Severity | Count |
|---|---|
| High | 3 |
| Medium | 9 |
| Low | 9 |
| Info / Positive | — |
| **Total findings** | **21** |

### Tool output (real)
- **`npm run lint -w @pixel/web`** (`tsc --noEmit`): **clean**, exit 0.
- **`npm run build`**: **clean**, no warnings. Initial path for an authed route ≈ `index` 60.05 kB +
  `react-vendor` 53.52 kB + `motion-vendor` 48.61 kB + `data-vendor` 12.77 kB + page chunk ~3–4 kB
  (gzip) ≈ **~178 kB gzip**. Per-screen chunks 2.5–3.9 kB gzip. **`Float` (three.js) 820 kB raw /
  220 kB gzip is a separate chunk** and is imported only by `AmbientField`/`Hero3D` → confirmed
  **never in the initial path**. `LandingPage` 55 kB gzip is its own lazy chunk.

---

## 2. Findings table

| ID | Severity | Area | Location | Title |
|----|----------|------|----------|-------|
| H1 | High | A11y / Motion | `pages/DashboardPage.tsx:72,99,220`, `components/ui/toast.tsx:59`, `components/AppShell.tsx:157` | Motion (JS) animations bypass reduced-motion guard |
| H2 | High | A11y / Forms | `components/ui.tsx` `FieldFrame` (~L108-126) | Field errors not associated to inputs (`aria-describedby`/`aria-invalid` absent) |
| H3 | High | A11y / Keyboard | `components/AppShell.tsx:140-175` | User menu not keyboard-operable (no Esc, no focus management, not arrow-navigable) |
| M1 | Medium | A11y / Contrast | `src/design/tokens.css` (`--text-3`) | `content-tertiary` ≈ 4.3:1 on `surface-2/3` — below AA 4.5 for normal/small text |
| M2 | Medium | State / UX | `pages/TasksPage.tsx:258-296` | Detail-sheet status `<select>` offers illegal transitions (no client guard) — optimistic flash then 422 |
| M3 | Medium | Data / UX | `pages/DashboardPage.tsx:38-40` | Dashboard swallows query errors (`?? []`) — renders zeros, no error state |
| M4 | Medium | Typography / Perf | `index.html`, `src/design/tokens.css:19` | Inter not preloaded + `font-display: optional` → first visit paints system fallback |
| M5 | Medium | Responsive | `components/AppShell.tsx:38-86` | Rail never becomes an off-canvas drawer on mobile — persists and squeezes content |
| M6 | Medium | Responsive | `components/ui/data-table.tsx` | Tables hide columns on mobile but never become cards (brief asked for cards) |
| M7 | Medium | Design consistency | `pages/LandingPage.tsx`, `components/ui/{spotlight,border-beam,…}` | `/welcome` + leftover Magic UI not migrated to the design system (raw slate/neon) |
| M8 | Medium | State (concurrency) | `features/tasks/api.ts:57-73,82-92` | Overlapping optimistic mutations can transiently clobber via snapshot rollback |
| M9 | Medium | A11y / DnD | `pages/TasksPage.tsx:150-185` | Kanban drag is mouse-only — not keyboard operable (no DnD a11y) |
| L1 | Low | Perf | `components/ui/data-table.tsx:43-54` | `sorted` memo depends on inline `columns` array → recomputes every render |
| L2 | Low | Design tokens | `src/design/tokens.css` (comment) vs usage | No z-index token scale despite the claim; raw `z-[90/91/100]`, `z-50/30/20` scattered |
| L3 | Low | DRY | `pages/*` (5 files) | `status→Tone` maps duplicated across Clients/Projects/Tasks/Dashboard |
| L4 | Low | Visual consistency | `components/three/Hero3D.tsx:16,28,35` | Dashboard 3D still neon (`#d946ef`/`#22d3ee`) — `AmbientField` was calmed, `Hero3D` wasn't |
| L5 | Low | A11y | `components/ui/data-table.tsx:62-78,116-124` | Sortable headers lack `aria-sort`; clickable rows activate on Enter only (not Space) |
| L6 | Low | Type safety | `pages/TasksPage.tsx:166-170`, `features/tasks/api.ts:63-64` | `as unknown as DragEvent` double-cast; `{...t,...input} as TaskRow` |
| L7 | Low | Reliability | `components/ui/toast.tsx:38-41` | Auto-dismiss `setTimeout` not cleared on unmount (setState-after-unmount risk) |
| L8 | Low | Polish | list pages ↔ `ui/sheet.tsx` | No shared-element (`layoutId`) continuity between row and detail (brief goal) |
| L9 | Low | A11y | `ClientsPage.tsx`, `ProjectsPage.tsx` (inline inputs) | Raw inline contact/milestone inputs are placeholder-only (no `<label>`) |

---

## 3. Detailed findings (severity order)

### H1 — Motion (JS) animations bypass the reduced-motion guard **(High)**

**Why it matters.** The global guard in `index.css` only neutralizes **CSS** animations/transitions:

```css
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:0.001ms!important; transition-duration:0.001ms!important; } }
```

Framer **Motion** animates via the Web Animations API / JS, which this rule does **not** touch.
Several `motion.*` instances hardcode displacement and never consult `useReducedMotion`/`useMotion`:

- `pages/DashboardPage.tsx:72` & `:99` — greeting/hero cards slide up (`initial={{opacity:0,y:12}}`).
- `pages/DashboardPage.tsx:220` — `DistRow` bar fills (`initial={{width:0}} animate={{width:'${pct}%'}}`).
- `components/ui/toast.tsx:59` — toasts slide/scale in on every notification.
- `components/AppShell.tsx:157` — user-menu dropdown spring.

(`grep` confirms reduced-motion is consulted only in `motion/index.ts`, `AppShell.tsx`,
`components/motion.tsx`, `LoginPage.tsx` — Dashboard/toast/menu are absent.)

**Repro.** macOS *Reduce Motion* on → load `/`: KPI/greeting cards still translate, distribution
bars still grow, toasts still fly in.

**Fix.** Route these through `useMotion()`/`useReducedMotion()` (gate `y`/`x`/`width`/`scale` to 0
when reduced) — the infrastructure already exists and `LoginPage` does it correctly. Quick win.

---

### H2 — Field errors not programmatically associated with inputs **(High)**

**Why it matters.** `FieldFrame` renders the error as a sibling `<p>` with no link to the control;
inputs get no `aria-invalid`/`aria-describedby`. Screen-reader users hear the label but not the
error, and the invalid state isn't announced. (`grep aria-describedby|aria-invalid` → **0 hits**.)

**Evidence** (`components/ui.tsx`, FieldFrame + Input):
```tsx
{error ? <p className="text-xs text-danger">{error}</p> : hint ? <p …>{hint}</p> : null}
…
<input id={fieldId} className={cn(fieldBase,'h-9', Icon&&'pl-9', error&&'border-danger/70 …')} {...props} />
```

**Fix.** Generate a `${fieldId}-desc` id; set `aria-describedby` to it and `aria-invalid={!!error}`
on the input/select/textarea; render the hint/error `<p>` with that id. Centralized in `FieldFrame`,
so it fixes every form at once.

---

### H3 — User menu is not keyboard-operable **(High)**

**Why it matters.** The avatar menu (`AppShell.tsx:140-175`) sets `aria-haspopup`/`aria-expanded`
(good) but: closes only via `useClickOutside` (mousedown) — **not Escape**; focus is never moved
into the panel and never restored to the trigger; items aren't a roving-tabindex/arrow-navigable
`menu`. (`grep "Escape" AppShell.tsx` → 0 hits.) Keyboard users can open it but can't reliably use
or dismiss it. "Sign out" lives only here.

**Fix.** Use Radix `DropdownMenu` (or replicate: Esc to close + restore focus, arrow-key roving
focus, `role="menuitem"`). Radix is already a dependency pattern in this app.

---

### M1 — `content-tertiary` fails AA on elevated surfaces **(Medium)**

**Computed, not eyeballed.** `--text-3 = hsl(224 10% 52%)` ≈ relative luminance **0.212**.

| Background | L(bg) | Contrast | AA normal (4.5)? |
|---|---|---|---|
| `--bg` (235 18% 5%) | 0.0034 | **4.9:1** | pass (barely) |
| `--surface` (234 16% 8%) | 0.0061 | **4.7:1** | pass (barely) |
| `--surface-2` (234 15% 11%) | ~0.011 | **~4.3:1** | **fail** |
| `--surface-3` (234 14% 14%) | ~0.017 | **~4.0:1** | **fail** |

`content-tertiary` is used for `text-2xs`/`text-xs` labels and **input placeholders on
`bg-surface-2`** (`fieldBase`) and on `surface-2/3` cards — i.e. exactly the failing combinations,
at small sizes that have no large-text exemption.

**Fix.** Lighten `--text-3` to ~`224 11% 60%` (≈ +0.06 luminance → ~6:1 on bg, ~5:1 on surface-2),
or forbid `content-tertiary` on `surface-2/3` (use `content-secondary` there). Re-verify ratios.

---

### M2 — Detail-sheet status select offers illegal transitions **(Medium)**

The Kanban board guards transitions **before** mutating:
```tsx
// TasksPage.tsx:51-56
function onDrop(taskId, from, to) {
  if (from === to) return;
  if (!(TASK_TRANSITIONS[from] ?? []).includes(to)) { toast.warning('Move not allowed', …); return; }
  move.mutate({ id: taskId, status: to }, …);
}
```
But the detail Sheet's `<select>` lists **all** `TASK_STATUS` and calls `changeStatus` with no guard
(`TasksPage.tsx:258-296`). Picking an illegal target (or moving to `done` with unmet deps)
optimistically flips the UI, the server returns 422, and `useUpdateTask.onError` rolls back +
toasts — so it's *safe*, but it presents invalid options and flashes a state that can't happen.

**Fix.** Disable `<option>`s not in `TASK_TRANSITIONS[data.status]` (plus current), mirroring the
board's guard; keep the server as the backstop.

---

### M3 — Dashboard swallows query errors **(Medium)**

```tsx
// DashboardPage.tsx:36-40
const loading = clients.isLoading || projects.isLoading || tasks.isLoading;
const clientRows = clients.data?.data ?? [];   // error → [] → renders "0"
```
If `/clients|/projects|/tasks` fail (401 refresh edge, 500), the dashboard shows **0s and empty
feed** rather than an error — actively misleading on the landing screen. The list pages handle
`error` correctly; the dashboard is the gap.

**Fix.** Compute `isError` across the three queries and render an inline error/retry state (reuse
`ErrorNote` + a refetch button).

---

### M4 — Inter not preloaded; `optional` paints fallback first **(Medium)**

`tokens.css:15-20` self-hosts Inter with `font-display: optional`, and the built `index.html` has
**no `<link rel="preload" as="font">`** (`grep` → none; only JS modulepreload + the stylesheet).
With `optional`, if the font isn't already cached when the first paint happens (i.e. **every first
visit**), the browser uses the system fallback for that load and never swaps — so the "premium
type" the redesign sells doesn't appear on first impression. CLS is avoided (that's `optional`'s
upside), but the typographic identity is lost on cold loads.

**Fix.** Add `<link rel="preload" href="/assets/Inter.var-*.woff2" as="font" type="font/woff2"
crossorigin>` (hash via a Vite plugin or a stable filename). Preload + `optional` (or `swap`) gives
Inter on first paint without FOUT.

---

### M5 / M6 — Mobile: rail doesn't drawer; tables don't become cards **(Medium)**

- **M5:** the rail is `sticky h-screen` at 76/256px and is always rendered; there's no `md:hidden`
  drawer/hamburger (`grep` shows only a `sm:hidden` command-palette icon swap). On phones it
  permanently steals horizontal space.
- **M6:** `DataTable` only toggles `hidden md:table-cell` on `collapse` columns; below `md` it's a
  reduced table inside a horizontal-scroll container — the brief's "tables become cards on small
  screens" wasn't delivered.

**Fix.** Add an off-canvas rail (Radix Dialog/`vaul`) under `lg`; add a `renderCard?(row)` mode to
`DataTable` (or a `<md` card list) so list pages degrade to cards.

---

### M7 — Marketing surface + Magic UI not migrated **(Medium)**

`/welcome` (`LandingPage.tsx`, 10 raw `slate-*`/hex lines) and the leftover Aceternity/Magic UI
components (`spotlight`, `border-beam`, `animated-shiny-text`, `marquee`, `shimmer-button`) still
use the **old neon/slate** language, inconsistent with the new token system a visitor sees right
before/after the product. It also keeps dead-ish CSS keyframes (`spotlight`, `shiny-text`, etc.) in
the Tailwind config.

**Fix.** Either migrate the landing page to tokens or scope it as an explicitly separate brand
surface; prune unused Magic UI components + keyframes.

---

### M8 — Concurrent optimistic rollback window **(Medium)**

`useUpdateTask`/`useMoveTask` snapshot the cache in their own `onMutate` and restore it in
`onError`. The flow is correct for a single in-flight mutation, but with **two overlapping**
mutations on the same/another row, mutation B snapshots A's already-optimistic cache; if A then
errors, A's `onError` restores **A's** snapshot, transiently discarding B's optimistic value until
`onSettled` invalidation refetches. No persistent corruption (server reconciles), but a visible
flicker/regression under rapid edits or drags.

**Fix.** Gate optimistic writes by a per-id in-flight check, or rely on `onSettled` refetch and skip
manual rollback for list rows, or use a mutation key + `cancelQueries` scoping per id.

---

### M9 — Kanban is mouse-only **(Medium, a11y)**

Board cards use native HTML5 drag (`draggable`, `onDragStart`/`onDrop`, `TasksPage.tsx:150-185`);
there's no keyboard alternative for moving a card between columns. The **table view + detail-sheet
status select is an accessible fallback**, which mitigates this to Medium, but the board itself is
not operable without a pointer.

**Fix.** Add keyboard move affordances (e.g. focus a card → arrow/Enter to move, or a status menu on
the card), or document the table view as the accessible path. (`@dnd-kit` ships keyboard sensors.)

---

### Low findings (condensed)

- **L1** `DataTable` `sorted` `useMemo` deps include `columns` (`data-table.tsx:54`), but pages
  define `columns` inline → new identity every render → sort recomputes each render. Memoize
  `columns` in pages or drop it from deps. (Negligible on current list sizes.)
- **L2** No z-index **token** scale despite the tokens.css header claiming one; raw `z-[90]`,
  `z-[91]`, `z-[100]`, `z-50/30/20/10` are scattered (CommandPalette 90/91, toast 100, Sheet/Modal
  50). Define `--z-*` tokens to prevent stacking regressions.
- **L3** `status→Tone` maps duplicated in `ClientsPage`, `ProjectsPage` (+`msTone`), `TasksPage`
  (+`prioTone`), `DashboardPage`. Centralize in `lib/format.ts` or `shared`.
- **L4** `Hero3D.tsx:16,28,35` still uses neon `#d946ef`/`#22d3ee`; `AmbientField` was recolored to
  the calm accent but `Hero3D` (the visible Dashboard accent) wasn't — palette inconsistency.
- **L5** Sortable `<th>` lack `aria-sort`; clickable rows handle `Enter` but not `Space`
  (`data-table.tsx`). Add `aria-sort={asc|desc|none}` and Space activation.
- **L6** `as unknown as DragEvent` double-cast (`TasksPage.tsx:166`) and `{...t,...input} as TaskRow`
  (`tasks/api.ts:63`) — the only unsafe casts beyond the justified three.js `useRef<any>`.
- **L7** Toast auto-dismiss `setTimeout` (`toast.tsx:40`) isn't tracked/cleared on unmount → a
  late `dismiss` can `setState` after unmount (dev warning; harmless but untidy).
- **L8** No `layoutId` shared-element continuity between a list row and its Sheet (a stated brief
  goal); the Sheet only slides in.
- **L9** Inline contact/milestone inputs in `ClientsPage`/`ProjectsPage` sheets are placeholder-only
  (no `<label>`), unlike the `Input` primitive.

---

## 4. What's genuinely excellent (don't regress)

- **Build health:** `tsc` + `vite build` clean; **no circular-dependency warning** after the
  `ui/base.tsx` extraction; **no chunk-size warning**.
- **Code-splitting & lazy 3D:** route-level `lazy()`; the **820 kB three.js chunk is confirmed
  out of the initial path**, dynamically imported only inside `rich && …` / `rich ? <Hero3D/>`.
- **`useRich3D` gate (`lib/capabilities.ts`)** correctly ANDs WebGL availability with
  `!prefers-reduced-motion` and re-evaluates on change → no-WebGL/reduced-motion devices never
  download or execute the 3D chunk and get the CSS-aurora fallback.
- **Focus management where it counts:** Modal, Sheet, and the ⌘K palette are Radix Dialogs →
  focus-trapped, Esc/overlay close, focus restore. ⌘K has full in-list arrow/Enter nav.
- **Optimistic flow is structurally right:** `cancelQueries → getQueriesData snapshot →
  setQueriesData patch (all matching list caches + detail) → onError restores ALL snapshots →
  onSettled invalidates`. The board pre-checks `TASK_TRANSITIONS` before mutating.
- **Reduced-motion is honored for the big costs:** 3D disabled, CSS aurora frozen by the global
  guard, `AnimatedCounter`/`Stagger`/`FadeItem`/`Lift` and the rail/page transitions gated.
- **States designed:** `EmptyState` distinguishes "no data" vs "no results for filter"; list pages
  render loading (skeleton)/error/empty; copy is human (no lorem; `PlaceholderPage` is a real
  "coming soon").
- **DRY tables:** the three list pages share one `DataTable` (the prior per-page table duplication
  is gone); `format.ts` is used across Projects/Tasks/Clients.
- **Toasts** use `role="region"` + per-toast `role="status"`; icon buttons carry `aria-label`;
  landmarks (`nav[aria-label]`, `main`, breadcrumb `nav`) are present.

---

## 5. Prioritized punch-list to reach flagship AA

**P1 — accessibility (do first; ~0.5–0.75 day)**
1. H1 gate Dashboard/toast/user-menu Motion through `useMotion()` (~1h).
2. H2 add `aria-invalid`/`aria-describedby` in `FieldFrame` (~1h, fixes all forms).
3. H3 swap user menu to Radix `DropdownMenu` (Esc/focus/arrows) (~1.5h).
4. M1 lighten `--text-3` (or restrict its surfaces) + re-verify ratios (~0.5h).
5. L5/L9 `aria-sort` + Space activation + labels on inline inputs (~1h).

**P2 — correctness & perceived quality (~0.5 day)**
6. M3 Dashboard error/retry state (~0.5h).
7. M2 disable illegal status options in the detail select (~0.5h).
8. M4 preload the Inter woff2 (~0.5h).
9. M8 de-flicker concurrent optimistic mutations (per-id guard) (~1–2h).
10. L4 recolor `Hero3D` to the accent palette; L7 clear toast timers (~0.5h).

**P3 — responsive & system hygiene (~0.5 day)**
11. M5 off-canvas rail under `lg`; M6 `DataTable` card mode on mobile (~2–3h).
12. M7 migrate/prune the landing page + unused Magic UI + keyframes (~1–2h).
13. L1 memoize `columns`; L2 z-index tokens; L3 centralize tone maps; L8 `layoutId`
    list↔detail; L6 tighten the two casts (~1–2h total).
