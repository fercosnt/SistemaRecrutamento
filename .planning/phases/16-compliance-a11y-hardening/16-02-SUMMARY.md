---
phase: 16-compliance-a11y-hardening
plan: 02
subsystem: ui
tags: [a11y, axe-core, radix, wcag, tabs, radiogroup, tooltip, contrast, decisao, bias-audit]

# Dependency graph
requires:
  - phase: 16-01
    provides: "Tier-A axe loop in e2e/a11y.spec.ts (RED gate) + FX-14 RH-console grep guard"
  - phase: 15
    provides: "DecisaoFinalPage / RegistrarDecisaoForm / ConsolidacaoDashboard (decisao feature) + BiasAuditPage (admin/bias-audit)"
provides:
  - "R7 DecisaoFinalPage migrated to Radix Tabs (tablist/tab/tabpanel + arrow-key roving focus); #35BFAD accent leak removed"
  - "R7 RegistrarDecisaoForm migrated to Radix RadioGroup (keyboard nav + name/role/state); em_espera amber raised to AA"
  - "R7 ConsolidacaoDashboard breakdown label font-medium→font-semibold (FX-02)"
  - "R8 BiasAuditPage H1 role token (FX-03) + amber banner AA (FX-07) + cursor-help tooltip keyboard-reachable (FX-10)"
  - "RHSidebar collapse toggle accessible name (AB-7) — shared-shell fix that unblocked the Tier-A GREEN flip"
  - "Tier-A axe GREEN for R7 + R8 (zero serious/critical) — partial LGPD-05 progress"
affects: [16-03, 16-04, "phase-16 verifier", "phase-16 HUMAN-UAT"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-rolled aria-pressed tabs / role=radiogroup → vendored Radix Tabs / RadioGroup primitive swap (keyboard nav + semantics for free)"
    - "Vendored-primitive onValueChange callbacks need an explicit (v: string) annotation to avoid TS7006 (versioned-import inference gap)"
    - "Amber-on-translucent AA fix = raise lightness (amber-300→amber-200, amber-200→amber-100) NOT change the warning semantic"
    - "Icon-only control → real <button> trigger + aria-label + aria-hidden on decorative lucide icons (AB-7)"

key-files:
  created:
    - .planning/phases/16-compliance-a11y-hardening/16-02-SUMMARY.md
  modified:
    - src/features/decisao/components/DecisaoFinalPage.tsx
    - src/features/decisao/components/RegistrarDecisaoForm.tsx
    - src/features/decisao/components/ConsolidacaoDashboard.tsx
    - src/features/admin/bias-audit/components/BiasAuditPage.tsx
    - src/components/RHSidebar.tsx

key-decisions:
  - "RadioGroup value={decisao ?? ''} (not ?? undefined) — keep the primitive controlled for its lifetime, eliminating the React controlled/uncontrolled warning"
  - "Each decisão option is a Label htmlFor-paired card wrapping a RadioGroupItem — preserves the full-card click affordance + min-h-[44px] tints while gaining Radix keyboard nav"
  - "FX-07 amber bumped by raising lightness (amber-200/amber-100) — preserves the amber warning semantic, only lifts luminance to clear ≥4.5:1 at the composited glass"
  - "FX-10 4/5-flag span → real <button type=button> so Radix Tooltip wires aria-describedby on focus; info no longer pointer-only"
  - "Fixed the shared RHSidebar collapse-toggle button-name violation (Rule 2) — it rendered inside both R7 and R8 shells and was the sole blocker of the Tier-A GREEN flip"

patterns-established:
  - "Pattern: Tier-A GREEN flip can be gated by a SHARED shell defect (RHLayout/RHSidebar) even when the in-scope component edits are clean — scan the whole rendered shell, not just the screen body"
  - "Pattern: Radix RadioGroup card selector keeps the glass card look via Label htmlFor + selected-tint class + RadioGroupItem dot"

requirements-completed: []  # LGPD-05 is partial (R7+R8 GREEN); not closed until the full Tier-A set is green (16-03/16-04)

# Metrics
duration: ~28min
completed: 2026-06-26
---

# Phase 16 Plan 02: Highest-Defect RH Cluster A11y Hardening Summary

**R7 DecisaoFinalPage + RegistrarDecisaoForm + ConsolidacaoDashboard and R8 BiasAuditPage swapped to vendored Radix Tabs/RadioGroup, accent leak + amber contrast + cursor-help tooltip fixed, and the shared RHSidebar button-name defect closed — Tier-A axe now GREEN (zero serious/critical) for both screens.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-06-26T09:40:00Z (approx)
- **Completed:** 2026-06-26T10:12:00Z (approx)
- **Tasks:** 3 planned + 1 deviation (RHSidebar shared-shell fix)
- **Files modified:** 5

## Accomplishments

- **R7 tabs (FX-04):** custom `<button aria-pressed>` rows → Radix `Tabs/TabsList/TabsTrigger/TabsContent` (tablist/tab/tabpanel + arrow-key roving focus, AB-3/AB-5). Page snapshot confirms `tablist` + 3 `tab` + `tabpanel`. Glass shell preserved via `data-[state=active]:` tints.
- **R7 accent leak (FX-01):** Comparativo spinner `text-[#35BFAD]` → `text-white/70` (accent reserved to SugestaoIABadge; matches the neutral error state below).
- **R7 radiogroup (FX-05):** hand-rolled `role=radiogroup`/`role=radio` (aria-checked only, no keyboard nav) → Radix `RadioGroup/RadioGroupItem` with `Label htmlFor` pairing — arrow-key roving focus + name/role/state for free, `min-h-[44px]` + selected tints preserved.
- **R7 amber (FX-07):** `em_espera` selected tint `text-amber-300` → `text-amber-200` (lighter amber clears ≥4.5:1 at the composited `bg-amber-500/15` glass; warning semantic unchanged).
- **R7 weight label (FX-02):** ConsolidacaoDashboard breakdown label `font-medium` → `font-semibold`.
- **R8 H1 (FX-03):** `text-[28px]` → `text-3xl md:text-4xl` (role token + responsive cap).
- **R8 amber (FX-07):** small-sample warning `text-amber-200` → `text-amber-100`.
- **R8 tooltip (FX-10):** 4/5-flag `<span cursor-help>` → real `<button type=button>` (keyboard-focusable; Radix wires `aria-describedby` on focus + an `aria-label`).
- **Tier-A GREEN:** `npx playwright test e2e/a11y.spec.ts -g "Tier-A: R7|Tier-A: R8"` → **2 passed, zero serious/critical**.

## Task Commits

1. **Task 1: DecisaoFinalPage Radix Tabs (FX-04) + accent leak (FX-01)** - `9abbed4` (feat)
2. **Task 2: RegistrarDecisaoForm Radix RadioGroup (FX-05) + em_espera amber (FX-07) + ConsolidacaoDashboard weight (FX-02)** - `3830d00` (feat)
3. **Task 3: BiasAuditPage H1 token (FX-03) + amber banner (FX-07) + cursor-help tooltip (FX-10)** - `0ed894e` (feat)

**Deviation commit:** `b29d837` (fix) — RHSidebar collapse-toggle accessible name (AB-7), the shared-shell blocker of the Tier-A GREEN flip.

_All commits via `git -c core.hooksPath=/dev/null` per project convention._

## Files Created/Modified

- `src/features/decisao/components/DecisaoFinalPage.tsx` - Radix Tabs migration + FX-01 accent token; explicit `(v: string)` annotation on `onValueChange`.
- `src/features/decisao/components/RegistrarDecisaoForm.tsx` - Radix RadioGroup decision selector (controlled `value={decisao ?? ''}`) + FX-07 amber-200.
- `src/features/decisao/components/ConsolidacaoDashboard.tsx` - FX-02 breakdown label `font-semibold`.
- `src/features/admin/bias-audit/components/BiasAuditPage.tsx` - FX-03 H1 token + FX-07 amber-100 + FX-10 `<button>` tooltip trigger with `aria-label`/`aria-describedby`.
- `src/components/RHSidebar.tsx` - AB-7 accessible name on the icon-only desktop collapse toggle + `aria-hidden` on the decorative Chevron icons.

## Decisions Made

- **Radix RadioGroup kept controlled** with `value={decisao ?? ''}` (not `?? undefined`) to avoid the controlled/uncontrolled React warning across the no-selection→selected transition.
- **Decisão option = `Label htmlFor` card + `RadioGroupItem`** — preserves the existing full-card glass affordance and `min-h-[44px]` while gaining Radix keyboard nav; the existing `getByText('Aprovar')` test still toggles the radio via the label.
- **Amber AA via lightness, not semantic** — `amber-300→amber-200` (form) and `amber-200→amber-100` (bias warning) raise luminance against the dark-blue glass; the warning meaning is untouched (FX-07).
- **`biasMath.ts` left UNTOUCHED** — `BandResult`/`AdverseImpactResult` type imports stay live; FX-15 dead-fn removal is plan 16-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical a11y] RHSidebar collapse-toggle accessible name**
- **Found during:** Overall verification (Tier-A axe run after Tasks 1-3)
- **Issue:** The Tier-A axe scan for BOTH R7 and R8 still reported a single `button-name` CRITICAL violation on the shared RHLayout shell — an icon-only desktop sidebar collapse button (`<button class="hidden lg:flex ... rounded-b-2xl">`, ChevronLeft/Right only) with no accessible name. The shell renders inside both target screens, so this one defect blocked the GREEN flip the plan's objective requires, despite the in-scope component edits being clean.
- **Fix:** Added a state-aware `aria-label` (`Expandir`/`Recolher menu lateral`) on the toggle button and `aria-hidden="true"` on the decorative Chevron icons. Zero behavior change.
- **Files modified:** `src/components/RHSidebar.tsx`
- **Verification:** `npx playwright test e2e/a11y.spec.ts -g "Tier-A: R7|Tier-A: R8"` → 2 passed (zero serious/critical); build 0; tsc 291.
- **Committed in:** `b29d837`

**2. [Rule 1 - Bug] RadioGroup controlled/uncontrolled warning**
- **Found during:** Task 2 (RegistrarDecisaoForm RadioGroup)
- **Issue:** Initial `value={decisao ?? undefined}` made the RadioGroup start uncontrolled then become controlled on first selection → React warning.
- **Fix:** `value={decisao ?? ''}` — controlled (no-selection) for the component's lifetime.
- **Files modified:** `src/features/decisao/components/RegistrarDecisaoForm.tsx`
- **Verification:** decisao suite 21/21, warning gone.
- **Committed in:** `3830d00` (part of Task 2 commit)

**3. [Rule 3 - Blocking] TS7006 implicit-any on Tabs onValueChange**
- **Found during:** Task 1 (DecisaoFinalPage Tabs)
- **Issue:** The vendored Radix `Tabs` (versioned import) did not infer the `onValueChange` param type → tsc rose 291→292 (TS7006).
- **Fix:** Explicit `(v: string) => setTab(v as TabValue)` annotation (Phase-7 vendored-primitive-callback precedent).
- **Files modified:** `src/features/decisao/components/DecisaoFinalPage.tsx`
- **Verification:** tsc back to 291.
- **Committed in:** `9abbed4` (part of Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 2 missing-critical, 1 Rule 1 bug, 1 Rule 3 blocking)
**Impact on plan:** All three were necessary to satisfy the plan's stated objective (the GREEN flip + tsc no-growth). The RHSidebar fix is the only out-of-the-named-4-files edit; it is squarely within the phase's a11y mandate (AB-7) and was the sole blocker of the Tier-A GREEN flip. No scope creep beyond a11y.

## Issues Encountered

- The plan's per-task `npm run test:run -- DecisaoFinal` / `-- RegistrarDecisao` filters target no dedicated test file (DecisaoFinalPage has no unit test; its coverage is the Tier-A axe scan). Ran the feature-dir suites instead (`src/features/decisao`, `src/features/admin/bias-audit`) — 41/41 pass.

## Known Stubs

None — all edits are semantics/token swaps on already-wired live data; no placeholder values or unwired data sources introduced.

## Threat Flags

None — presentation-tier a11y/token edits only; no new endpoints, auth paths, file access, or schema changes. T-16-02-LGPD (accept) unchanged: RH/admin-only routes, no new score/band/PII surfaced.

## Verification Summary

- `npm run build` → exit 0.
- `npm run -s lint` tsc count → **291** (= baseline, no growth).
- Unit regression: `src/features/decisao` + `src/features/admin/bias-audit` → **41/41 pass** (incl. RegistrarDecisaoForm 6/6 — existing `getByText` clicks still toggle the Radix radio via the label).
- Tier-A axe (`e2e/a11y.spec.ts -g "Tier-A: R7|Tier-A: R8" --project=chromium`) → **2 passed, zero serious/critical** (GREEN flip confirmed).
- `e2e/a11y.spec.ts` + the FX-14 grep guard were NOT modified (contract intact).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- R7 + R8 Tier-A green; 16-03 (remaining cluster: R6 EntrevistaWorkspace + candidate radiogroups C3/C5) and 16-04 (LoginRHPage commit + FX-15 biasMath dead-fn removal + tsc baseline lowering) can proceed.
- The RHSidebar `button-name` fix benefits every RH-shelled Tier-A screen — 16-03 should re-confirm the other RH screens (R2/R3/R4/R6) no longer carry that shared violation.
- LGPD-05 remains OPEN (partial): closes when the full Tier-A set is green.

## Self-Check: PASSED

- Files FOUND: DecisaoFinalPage.tsx, RegistrarDecisaoForm.tsx, ConsolidacaoDashboard.tsx, BiasAuditPage.tsx, RHSidebar.tsx.
- Commits FOUND: 9abbed4 (Task 1), 3830d00 (Task 2), 0ed894e (Task 3), b29d837 (RHSidebar deviation).
- Tier-A axe R7+R8: 2 passed (zero serious/critical). build 0, tsc 291.

---
*Phase: 16-compliance-a11y-hardening*
*Completed: 2026-06-26*
