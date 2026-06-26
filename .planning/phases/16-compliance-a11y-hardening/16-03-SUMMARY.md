---
phase: 16-compliance-a11y-hardening
plan: 03
subsystem: ui
tags: [a11y, axe-core, wcag, radix, tabs, radiogroup, tooltip, slider, aria-valuetext, glass-ui]

# Dependency graph
requires:
  - phase: 16-compliance-a11y-hardening (16-01)
    provides: Wave-0 Tier-A axe assertions in e2e/a11y.spec.ts (R6/C3/C8 contract) + FX-14 RED grep guard
  - phase: 16-compliance-a11y-hardening (16-02)
    provides: RHSidebar icon-only collapse-toggle accessible name (shared RH-shell fix benefited by R6)
  - phase: 11 (avaliacao-assincrona)
    provides: SjtMultiplaEscolhaScreen already on Radix RadioGroup (FX-06 pre-landed)
  - phase: 12 (big-five-devolutiva)
    provides: BigFiveQuestionnaireScreen already on Radix RadioGroup (FX-06 pre-landed)
provides:
  - EntrevistaWorkspace custom aria-pressed tabs migrated to Radix Tabs (tablist/tab/tabpanel + arrow-key roving focus) — FX-04
  - Entrevista amber 24h pill + text-white/50-60 eyebrows raised to AA at the #00109E glass composite — FX-07/08
  - Dead "Agendar entrevista" CTA rendered disabled + Radix-tooltip-named (V1-manual scheduling) — FX-12
  - ProvaCognitivaScreen native title= submit hint replaced by Radix Tooltip (keyboard/SR reachable) — FX-09
  - Cognitive intro copy softened to not over-promise autosave (conservative FX-13 branch — no autosave on this screen)
  - aria-valuetext on the interview BARS slider (EntrevistaScorecardInline) + redacao BARS override sliders (RedacaoOverrideForm) — FX-11
  - Tier-A axe GREEN (zero serious/critical) for R6 EntrevistaWorkspace + C3 SjtMultiplaEscolhaScreen + C8 ProvaCognitivaScreen
affects: [16-04, 16-HUMAN-UAT, LGPD-05, phase-16-verifier]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disabled control + Radix Tooltip hint lives on a focusable tabIndex=0 span (a disabled button never receives focus/hover)"
    - "Slider aria-valuetext='{n} de 5' forwarded through the vendored Slider to SliderPrimitive.Root for SR readout"
    - "FX-13 conservative branch: soften copy when the autosave affordance is not present on a screen (vs. wiring useAutosaveAvaliacao)"

key-files:
  created:
    - .planning/phases/16-compliance-a11y-hardening/16-03-SUMMARY.md
  modified:
    - src/features/entrevista/components/EntrevistaWorkspace.tsx
    - src/features/entrevista/components/EntrevistaDashboard.tsx
    - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
    - src/features/entrevista/components/EntrevistaScorecardInline.tsx
    - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
    - src/features/triagem/components/RedacaoOverrideForm.tsx

key-decisions:
  - "Task 2 (FX-06 candidate radiogroups) is verify-only — SjtMultiplaEscolhaScreen + BigFiveQuestionnaireScreen already use Radix RadioGroup (landed Phase 11 6d658f7 / Phase 12 b2579ab); re-authoring would be a no-op empty commit"
  - "FX-13 softened-copy branch chosen — ProvaCognitivaScreen has NO autosave (picks live in local state, posted only at submit), so the intro no longer promises persistence; it directs single-session completion"
  - "FX-11 redacao BARS sliders fixed in RedacaoOverrideForm.tsx (the component RedacaoReviewPanel mounts), not RedacaoReviewPanel.tsx itself — the <Slider> elements live in the child, the plan's file reference pointed at the mount surface (Rule-3 reference correction)"
  - "FX-08 eyebrow bump applied uniformly (/50→/70, /60→/75) across EntrevistaDashboard + GuiaEntrevistaPanel for consistent treatment"

patterns-established:
  - "Pattern: disabled CTA keeps its hint keyboard/SR-reachable by hosting the Radix TooltipTrigger on a focusable wrapper span, not on the inert button"
  - "Pattern: candidate-facing copy reconcile (FX-13) prefers the truthful conservative branch over wiring infra that doesn't exist on the screen"

requirements-completed: [LGPD-05]

# Metrics
duration: 10min
completed: 2026-06-26
---

# Phase 16 Plan 03: Entrevista + Candidate-Avaliação A11y Cluster Summary

**EntrevistaWorkspace migrated to Radix Tabs, cognitive submit-hint moved off native title= to Radix Tooltip, BARS sliders got aria-valuetext, amber/eyebrow contrast raised to AA, and the dead Agendar CTA disabled — flipping the Tier-A axe gate GREEN (zero serious/critical) for R6/C3/C8.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-26T13:16:52Z
- **Completed:** 2026-06-26T13:26:37Z
- **Tasks:** 3 (Task 1 + Task 3 code; Task 2 verify-only)
- **Files modified:** 6

## Accomplishments

- **FX-04** — EntrevistaWorkspace's hand-rolled `<button aria-pressed>` tab row is now vendored Radix `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (real `tablist`/`tab`/`tabpanel` + arrow-key roving focus + `aria-selected`). The 4 section bodies became `TabsContent` panels driven by `value`/`onValueChange` over the existing `tab` state.
- **FX-07/08** — Amber 24h pill (`amber-300`→`amber-100`, `bg /15`→`/25`, `border /30`→`/40`) and the `text-white/50`→`/70` + `text-white/60`→`/75` eyebrows across EntrevistaDashboard + GuiaEntrevistaPanel now clear ≥4.5:1 at the `#00109E` glass composite. Amber semantic (the `<24h` warning signal) unchanged.
- **FX-12** — The dead "Agendar entrevista" CTA (EntrevistaWorkspace never passed `onAgendar`) is now `disabled` + `aria-disabled`, wrapped in a Radix Tooltip on a focusable `tabIndex=0` span naming V1-manual scheduling — no live no-op focusable control.
- **FX-09** — ProvaCognitivaScreen's native `title=` submit-disabled hint is now a Radix `Tooltip` whose trigger is the focusable span gating the submit CTA (keyboard/SR reachable; AB-5/AB-7).
- **FX-13** — Cognitive intro copy softened: the screen has no autosave, so it no longer promises persistence; it directs single-session completion ("suas respostas são enviadas ao finalizar").
- **FX-11** — `aria-valuetext={`${n} de 5`}` on the interview BARS slider (EntrevistaScorecardInline) and the redacao BARS override sliders (RedacaoOverrideForm).
- **LGPD-05** — Tier-A axe assertions GREEN for **all 15 mockable M2 screens**, including R6 EntrevistaWorkspace, C3 SjtMultiplaEscolhaScreen, C8 ProvaCognitivaScreen (verified live via Playwright chromium, not grep-only).

## Task Commits

1. **Task 1: EntrevistaWorkspace Radix Tabs (FX-04) + amber/eyebrow AA (FX-07/08) + dead Agendar CTA (FX-12)** — `a6b9c68` (feat)
2. **Task 2: Candidate radiogroup keyboard nav (FX-06) — SjtMultiplaEscolha + BigFive** — verify-only, no commit (radiogroup already Radix; pre-landed Phase 11 `6d658f7` / Phase 12 `b2579ab`)
3. **Task 3: Cognitive Radix Tooltip (FX-09) + autosave copy (FX-13) + slider aria-valuetext (FX-11)** — `40dfa35` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/features/entrevista/components/EntrevistaWorkspace.tsx` — custom aria-pressed tabs → Radix Tabs/TabsList/TabsTrigger/TabsContent
- `src/features/entrevista/components/EntrevistaDashboard.tsx` — amber pill AA tint, eyebrow alpha bump, dead Agendar CTA disabled + Radix-tooltip-named
- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` — text-white/50→/70 + /60→/75 eyebrows
- `src/features/entrevista/components/EntrevistaScorecardInline.tsx` — interview BARS slider aria-valuetext
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` — native title= → Radix Tooltip; FX-13 intro copy reconcile
- `src/features/triagem/components/RedacaoOverrideForm.tsx` — redacao BARS override sliders aria-valuetext (the sliders RedacaoReviewPanel mounts)

## Decisions Made

- **Task 2 is verify-only.** Both candidate radiogroup surfaces (SjtMultiplaEscolhaScreen, BigFiveQuestionnaireScreen) already use Radix `RadioGroup`/`RadioGroupItem` with `Label htmlFor` pairing and `min-h-[44px]` preserved — landed in Phase 11 (`6d658f7`) and Phase 12 (`b2579ab`). No hand-rolled `role="radio"`/`aria-pressed`/`aria-checked` (grep = 0 each). No score/band/percentile literal is rendered in candidate JSX (the only `score`/`percentis` matches are doc-comments and the pre-existing emotional disclaimer). Re-authoring would yield an empty no-op commit (Phase-9 verify-only precedent).
- **FX-13 softened-copy branch.** ProvaCognitivaScreen accumulates picks in local `respostas` state and posts them only at submit — it has no `useAutosaveAvaliacao` (unlike BigFive). Wiring autosave would be net-new behavior; the truthful fix is to stop promising persistence. Copy now: "Conclua a prova em uma única sessão; suas respostas são enviadas ao finalizar."
- **FX-11 sliders are in RedacaoOverrideForm, not RedacaoReviewPanel.** The plan listed `RedacaoReviewPanel.tsx` in `files_modified`, but `RedacaoReviewPanel` has no `<Slider>` of its own — the BARS override sliders live in `RedacaoOverrideForm.tsx` which it mounts. `aria-valuetext` was added there (the actual element), satisfying FX-11's intent.

## Deviations from Plan

### Reference corrections (Rule 3 — blocking-reference fix, zero behavior change)

**1. [Rule 3 — Reference] FX-11 redacao slider lives in RedacaoOverrideForm, not RedacaoReviewPanel**
- **Found during:** Task 3 (slider aria-valuetext)
- **Issue:** Plan `files_modified` + acceptance grep pointed at `RedacaoReviewPanel.tsx`, but that file has no `<Slider>` element — the BARS override sliders are in `RedacaoOverrideForm.tsx`, the child RedacaoReviewPanel renders.
- **Fix:** Added `aria-valuetext={`${scores[dim.key]} de 5`}` to the `<Slider>` in `RedacaoOverrideForm.tsx`.
- **Files modified:** src/features/triagem/components/RedacaoOverrideForm.tsx
- **Verification:** grep `aria-valuetext` matches; RedacaoOverrideForm vitest 3/3 PASS; Tier-A axe green.
- **Committed in:** `40dfa35` (Task 3 commit)

**2. [Rule 3 — Blocking] Radix Tabs onValueChange param implicit-any (TS7006)**
- **Found during:** Task 1 (Radix Tabs migration)
- **Issue:** `onValueChange={(v) => setTab(v as TabValue)}` introduced one net-new tsc error (291→292), breaching the no-growth invariant.
- **Fix:** Annotated the callback param `(v: string)` — the project's established explicit-annotation pattern for vendored-primitive callbacks.
- **Files modified:** src/features/entrevista/components/EntrevistaWorkspace.tsx
- **Verification:** `npm run -s lint | grep -c "error TS"` back to 291; no entrevista-file errors.
- **Committed in:** `a6b9c68` (Task 1 commit)

### Scope clarification (not an edit)

**FX-11 weight sliders (config-vaga) out of scope for this plan's file set.** The plan body action mentions weight sliders (`aria-valuetext={`${pct}%`}`), but `src/features/config-vaga/*` is NOT in this plan's `files_modified` and the Task-3 acceptance grep only checks EntrevistaScorecardInline + the redacao sliders. The config-vaga weight sliders (R2) belong to a separate file set; not touched here.

---

**Total deviations:** 2 Rule-3 reference/blocking fixes (zero behavior change) + 1 verify-only task + 1 scope clarification.
**Impact on plan:** No scope creep. All acceptance criteria met; Tier-A axe GREEN confirmed live.

## Issues Encountered

- Full vitest sweep shows 603/604 passing with 1 failing test: `rh-console.grep.test.ts > FX-14 — RH-path console.* grep guard` — this is the **Phase 16 / Plan 16-01 Wave-0 FX-14 RED guard**, intentionally RED until the FX-14 console.log cleanup plan lands (NOT this plan, 16-03). It scans `*RH*.tsx` page files (PerfilCandidatoRHPage, SuporteRHPage), none of which are this plan's files. Two "failed files" (`essay-schemas.test.ts`, `consolidar-decisao-final/index.test.ts`) are pre-existing Deno/Vitest collection failures (Phase-15 Wave-0 RED contract + Deno-only imports). My 8 candidate/RH files introduced zero new failures.

## Known Stubs

None. No empty-array/placeholder/TODO stubs introduced. All edits are semantics + token swaps preserving existing behavior, copy, shuffle/timer logic, and the glass shell.

## Manual-check items routed to 16-HUMAN-UAT (axe under-tests these — RESEARCH Pitfall 3)

axe-core (headless) cannot fully model keyboard/focus/live-region behavior. The following are GREEN-on-axe but must be confirmed manually in the Phase-16 HUMAN-UAT runbook:

- **AB-5 (keyboard roving focus):** Tab into the EntrevistaWorkspace Radix tablist and confirm ArrowLeft/Right move tab selection; Tab into the C3 SjtMultiplaEscolha + C5 BigFive radiogroups and confirm ArrowUp/Down/Left/Right roving focus selects options.
- **AB-6 (visible focus on glass):** Confirm a visible focus ring on each Radix tab, radiogroup item, slider thumb, and the disabled-Agendar tooltip trigger span over the `#00109E` glass surface.
- **AB-8 (live-region announce):** Not applicable to the cognitive prova after FX-13 (no autosave to announce); the BigFive autosave "Salvo automaticamente" aria-live announce is unchanged and still a manual SR check.

## Next Phase Readiness

- **16-04** is next (LoginRHPage race fix + auth-hook RLS migration — the pre-existing uncommitted `src/components/pages/LoginRHPage.tsx` was deliberately left alone this plan, committed in 16-04).
- Tier-A axe gate is GREEN for the full mockable M2 set (15/15) — the phase verifier can certify R6/C3/C8 without re-running source edits.
- Build exit 0; tsc baseline 291 = 291 (no growth).

## Self-Check: PASSED

- Created file present: `16-03-SUMMARY.md`
- All 6 modified source files present on disk
- Task commits present in git: `a6b9c68` (Task 1), `40dfa35` (Task 3)
- Build exit 0; tsc 291 = 291 (no growth)
- Tier-A axe assertions GREEN 15/15 (incl. R6/C3/C8) via Playwright chromium

---
*Phase: 16-compliance-a11y-hardening*
*Completed: 2026-06-26*
