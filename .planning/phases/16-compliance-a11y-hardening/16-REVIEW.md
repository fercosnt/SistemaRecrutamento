---
phase: 16-compliance-a11y-hardening
reviewed: 2026-06-26T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .github/workflows/ci.yml
  - e2e/a11y.spec.ts
  - e2e/fixtures/a11y-session.ts
  - src/__tests__/guards/rh-console.grep.test.ts
  - src/components/RHSidebar.tsx
  - src/components/pages/LoginRHPage.tsx
  - src/components/pages/PerfilCandidatoRHPage.tsx
  - src/components/pages/SuporteRHPage.tsx
  - src/features/admin/bias-audit/biasMath.ts
  - src/features/admin/bias-audit/components/BiasAuditPage.tsx
  - src/features/admin/bias-audit/services/biasAuditService.ts
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/components/RegistrarDecisaoForm.tsx
  - src/features/entrevista/components/EntrevistaDashboard.tsx
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/triagem/components/RedacaoOverrideForm.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: resolved
---

# Phase 16: Code Review Report

**Reviewed:** 2026-06-26
**Depth:** standard
**Files Reviewed:** 20
**Status:** resolved (WR-01 fixed; WR-02 is a known pre-existing Deno-runner gap, deferred)

## Summary

Phase 16 (final phase of milestone v2.0 — Compliance & A11y Hardening) was reviewed
across all 20 changed source/test/CI files. The phase's substantive changes — the
LoginRHPage race+gate fix, the biasMath surgical deletion, the Radix Tabs/RadioGroup/
Tooltip migrations, contrast bumps, slider `aria-valuetext`, the RHSidebar icon-button
accessible-name fix, the RH-path `console.*` cleanup, and the e2e/CI infra — are all
**correct and well-executed**. The four focus areas were verified positively:

1. **LoginRHPage race+gate fix — CORRECT.** The poll loop `for (let i = 0; i < 60 &&
   !role; i++) await new Promise(r => setTimeout(r, 50))` is a properly throttled
   `await`-yielding poll (NOT a busy-wait) with an early-exit on role population and a
   hard 3s cap. The widened gate `role !== 'administrador' && role !== 'rh'` is
   boolean-correct: it rejects only when the role is neither, letting both roles through.
2. **biasMath deletion — CLEAN.** `computeAdverseImpact` + `bandFromAge` (and their test
   file) were removed; all live type/constant exports (`AdverseImpactResult`,
   `BandResult`, `AgeBand`, `BandInput`, `ComputeOptions`, `FOUR_FIFTHS_THRESHOLD`,
   `SMALL_SAMPLE_FLOOR`) remain. Both consumers (`biasAuditService.ts`,
   `BiasAuditPage.tsx`) import only `AdverseImpactResult`/`BandResult`, which still
   resolve. No dangling references to the deleted functions remain in `src/` or `e2e/`.
   tsc holds at exactly 291.
3. **Radix migrations — CORRECT state wiring.** `DecisaoFinalPage` + `EntrevistaWorkspace`
   Tabs are controlled (`value={tab}` / `onValueChange` with a typed cast); all prior
   `TabsContent` panels preserve their full content (incl. the `painel` tab's
   `CognitivoBandCard`). `RegistrarDecisaoForm` RadioGroup is controlled with
   `value={decisao ?? ''}`; no controlled/uncontrolled mismatch. Tooltip triggers use
   focusable `<span tabIndex>` / `<button>` wrappers so disabled-CTA hints are keyboard/SR
   reachable. The `cn` import was correctly removed from `EntrevistaWorkspace` (no longer
   used) and kept in `DecisaoFinalPage` (still used).
4. **No new PII/LGPD regressions.** The candidate-facing `ProvaCognitivaScreen` change is
   a copy softening (removes a false autosave promise) — no score/band/percentile is
   introduced; the only "score" mentions are comments asserting RNF-07a compliance.

The findings below are two pre-existing latent defects surfaced during review (not
introduced this phase) and three minor quality notes. No blockers.

## Warnings

### WR-01: RHSidebar mobile-menu toggle calls an undefined setter (`setIsMobileOpen`) — button crashes on click

**RESOLVED 2026-06-26 (commit `14ee12f`):** renamed `setIsMobileOpen` → `setInternalMobileOpen`. This cleared one frozen-baseline tsc error (291→290) and the ci.yml gate was tightened to 290 to match.

**File:** `src/components/RHSidebar.tsx:278`
**Issue:** The mobile menu toggle button's handler is `onClick={() => setIsMobileOpen(!isMobileOpen)}`,
but no `setIsMobileOpen` is defined in this component — the state setter is
`setInternalMobileOpen` (declared on line 36). At runtime, clicking the mobile menu
button throws `ReferenceError: setIsMobileOpen is not defined`, so the mobile sidebar
never opens. tsc confirms this is a real `TS2552: Cannot find name 'setIsMobileOpen'`
error.

This is **PRE-EXISTING** — it lies outside the Phase 16 diff hunk (the phase only added
`aria-label`/`aria-hidden` to the *collapse* toggle on lines 261-271) and is one of the
frozen 291-error tsc baseline entries. It is NOT a Phase 16 regression, but it is a
genuine product defect on the RH path that the a11y/accessible-name work in this file
brushed past. Flagged here because the file was edited this phase and the bug renders an
RH-facing control non-functional.

**Fix:** Route the toggle through the existing internal/external pattern used everywhere
else in this component:
```tsx
onClick={() => {
  if (onMobileClose && isMobileOpen) onMobileClose()
  else setInternalMobileOpen((v) => !v)
}}
```
(or minimally `onClick={() => setInternalMobileOpen((v) => !v)}` to match the declared setter.)

### WR-02: Deno Edge-Function test files fail under the vitest node runner (full-suite red)

**File:** `supabase/functions/_shared/__tests__/essay-schemas.test.ts`, `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`
**Issue:** A plain `npx vitest run` from the repo root collects two Deno EF test files and
fails them with `Error: Only URLs with a scheme in: file and data are supported by the
default ESM loader. Received protocol 'https:'` (they use `https:` ESM imports that only
Deno resolves). Result: 2 test FILES fail (584/584 *tests* still pass). These files were
**NOT touched this phase** (empty diff in `4fc8e08..HEAD`), so this is a pre-existing
runner-config gap, not a Phase 16 regression. It matters because Phase 16 ships CI/test
infra (`e2e/a11y.spec.ts`, the grep guard) and a reviewer running the documented
`npm run test:run` should know the root vitest invocation is not clean — the suite count
in the milestone notes (584 passed) is only green if these Deno files are excluded.

**Fix:** Ensure `vitest.config.ts` `test.exclude` (or `test.include`) scopes out
`supabase/functions/**` so the node runner never collects Deno specs, e.g.:
```ts
// vitest.config.ts
test: { exclude: [...configDefaults.exclude, 'supabase/functions/**'] }
```
Deno EF tests should run via `deno test` in their own CI job, not the vitest node runner.

## Info

### IN-01: `rh-console.grep.test.ts` `isCommentLine` only strips lines that START with a comment marker

**File:** `src/__tests__/guards/rh-console.grep.test.ts:69-72`
**Issue:** `isCommentLine` returns true only when the trimmed line begins with `//`, `*`,
`/*`, or `*/`. A code line with a *trailing* comment that mentions `console.log` (e.g.
`doThing(); // console.log fallback`) would NOT be exempt and would trip the guard as a
false positive. Conversely, a real `console.log` hidden after a statement on the same line
as a block-comment opener is an edge the guard does not model. This is a calibrated
trade-off the file's own JSDoc acknowledges ("conservative"), so it is not a bug today —
but it is a latent flakiness source if future RH-path source adds trailing comments.
**Fix:** Strip trailing line-comments before the forbidden-pattern test, or document that
RH-path source must keep `console`-mentioning comments on their own line. Low priority.

### IN-02: a11y Tier-A R1 (LoginRHPage) drives a login round-trip it does not need

**File:** `e2e/a11y.spec.ts:136`, `:180-185`
**Issue:** R1 targets `/auth/login-rh`, a public pre-auth route, but the Tier-A loop still
runs `mockSession` + `driveLogin` (which navigates to `/auth/login`, submits, then
`page.goto('/auth/login-rh')`). The login round-trip is harmless but redundant for a
public route, and the `driveLogin` submit may itself register console/network noise that
the axe scan does not care about. Functionally fine (the page renders and is scanned), but
the screen could have been scanned directly without the session dance. Cosmetic.
**Fix:** Optionally special-case public-route Tier-A entries to skip `driveLogin`. Not
required for correctness.

### IN-03: `PerfilCandidatoRHPage` / `SuporteRHPage` handlers are now silent no-ops with backend wiring deferred

**File:** `src/components/pages/PerfilCandidatoRHPage.tsx:430-490`, `src/components/pages/SuporteRHPage.tsx:101`
**Issue:** The FX-14 cleanup correctly removed the debug `console.log` calls, but several
handlers (`handleSalvarTranscricaoOnline`, `handleSalvarTranscricaoPresencial`,
`handleSubmit` in Suporte) are now empty bodies with only a "wiring real deferido"/"aqui
você salvaria no backend" comment. They render success UI (`setEnviado(true)` in Suporte)
without persisting anything — a user who "saves" a transcription or submits a support form
gets a success signal but no data is written. This is the intended placeholder state
(these are legacy `components/pages/` screens pending feature migration per CLAUDE.md), and
the console removal itself is correct, but the silent-success-without-persistence pattern
is worth tracking so it is not mistaken for working functionality.
**Fix:** None required this phase. Track the deferred backend wiring (and consider a
"não implementado" toast over a false success state) in the legacy-page migration backlog.

---

_Reviewed: 2026-06-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
