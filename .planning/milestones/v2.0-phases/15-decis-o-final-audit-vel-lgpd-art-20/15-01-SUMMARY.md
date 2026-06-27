---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
plan: 01
subsystem: testing
tags: [tdd, deno, vitest, zod, eeoc-4-5, lgpd, edge-function, contract-test, golden-test]

# Dependency graph
requires:
  - phase: 10-triagem-rh-com-ia-comparativo-etapa-2
    provides: comparativo-candidatos injected-deps Deno handler-test shape (authorize-then-act mock skeleton)
  - phase: 13-reda-o-cultural-revis-o-humana
    provides: redacao-contract.test.ts idiom (Node-local Zod .strict() replica + node:fs source-text probe RED→GREEN)
  - phase: 09-ai-prompt-library-cost-infra
    provides: forbidden-strings.grep LGPD-04 guard (recursive SCAN_ROOTS over src/ + supabase/functions/ + supabase/migrations/)
provides:
  - RED Deno golden test for the consolidation aggregation + authorize (DECISAO-01) — calibrated module-not-found until the EF lands
  - RED Vitest golden test for the EEOC 4/5 adverse-impact ratio + age banding (LGPD-03) — calibrated module-resolution until biasMath lands
  - RED client↔EF contract test for the consolidation request body (.strict()) — closes the integration-contract-gap drift
  - forbidden-strings.grep sanity-count locking LGPD-04 coverage over the 3 new Phase-15 feature dirs (SCAN_ROOTS unchanged)
affects: [15-02 consolidar-decisao-final EF, 15-03 src/features/decisao, 15-05 src/features/admin/bias-audit biasMath, 15-04 src/features/explicacao]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 RED contract honored: every downstream Phase-15 surface has a calibrated FAILING test before its implementation lands (smoke-runtime gate, Phase-4 lesson)"
    - "Deno injected-deps handler test (no network) cloned from comparativo-candidatos for the consolidation EF"
    - "Contract test = Node-local Zod .strict() replica (runtime assertions run today) + node:fs source-text probe (RED until the shared schema lands) — NOT a live dynamic import (which fails vitest suite collection while the module is absent)"

key-files:
  created:
    - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
    - src/features/admin/bias-audit/__tests__/biasMath.test.ts
    - src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts
  modified:
    - src/__tests__/guards/forbidden-strings.grep.test.ts
    - .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-VALIDATION.md

key-decisions:
  - "biasMath.test.ts placed under __tests__/ (not the plan's sibling path) so the vitest include glob (**/__tests__/**) discovers it — a sibling *.test.ts is never run by npm run test:run"
  - "consolidacaoContract Part-2 uses a node:fs source-text probe instead of a live dynamic import — a dynamic import of an absent module fails vitest suite collection, which would stop the Part-1 runtime contract assertions from running (redacao-contract precedent)"
  - "Requirements DECISAO-01/03/LGPD-03 NOT marked complete — this is the RED test wave; the requirements close when the implementation waves (15-02..15-06) land"

patterns-established:
  - "Pattern 1: RED Deno golden test importing handler from ../index.ts → module-not-found is the calibrated assertion (compiles, fails at runtime against the absent module)"
  - "Pattern 2: RED Vitest golden test for a pure deterministic fn importing from a sibling module under __tests__/ → module-resolution is the calibrated assertion"
  - "Pattern 3: client↔EF contract = local .strict() replica (accept-valid + reject-unknown-key GREEN now) + source-text probe (RED until the single shared schema both sides import lands)"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-06-26
---

# Phase 15 Plan 01: Wave-0 RED Golden Battery Summary

**Three calibrated RED golden/contract tests — consolidation weighted-aggregation (Deno, module-not-found), EEOC 4/5 age-band adverse-impact (Vitest, module-resolution), and the client↔EF .strict() body contract — plus a forbidden-strings sanity-count locking LGPD-04 coverage over the 3 new Phase-15 feature dirs; tsc 296 ≤ 305.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-06-26T01:00:40Z
- **Completed:** 2026-06-26T01:07:51Z
- **Tasks:** 3
- **Files modified:** 5 (3 created test files + 2 modified: forbidden-strings.grep + 15-VALIDATION.md)

## Accomplishments

- **DECISAO-01 consolidation golden test (RED Deno):** asserts heterogeneous-scale normalization (triagem score_match 80→80; sjt 18/25→72; redacao 20/25→80), entrevista `pendente_humano` → N/A (Open Q1: weight ONLY `status='sucesso'`), weight renormalization over PRESENT etapas (Σ effective_weight = 1.0; a missing etapa redistributes its weight, never blocks), big_five/cognitivo as context rows (weight=null, contributes 0), NEVER re-scores (functions.invoke throws if reached), deterministic templated recommendation, and the 4 authorize cases (candidato→403, non-owner rh→403, administrador bypasses→200, no-user→401). 7 tests, all RED via module-not-found against the absent `../index.ts`.
- **LGPD-03 EEOC 4/5 golden test (RED Vitest):** asserts selection_rate = selected/applicants per band, reference = highest-rate band (razao_4_5 = 1.0), the cited 0.70 worked example flags (0.35/0.50 < 0.80) while 0.90 does not, `bandFromAge` boundary cases (18-24 / 25-34 / 35-44 / 45-54 / 55+; 24→18-24, 25→25-34, 55→55+), small_sample_warning when any band applicants < 30, null-birthdate exclusion accounting (Pitfall 4), and metodo/limitacao self-description (LGPD-01 age-only honesty). RED via module-resolution against the absent `../biasMath`.
- **Client↔EF contract test (RED):** Node-local Zod `.strict()` replica asserts the `{candidatura_id, vaga_id}` body parses and an extra/unknown key + injected score + non-uuid are REJECTED (4 GREEN runtime assertions today); a `node:fs` source-text probe over `../consolidacaoSchema.ts` is RED (2 assertions) until Wave 2 authors the single shared schema both the EF and client import — closing the [[feedback_integration_contract_gap]] drift that broke Phase 11 SJT.
- **LGPD-04 coverage lock:** forbidden-strings.grep gained ONE sanity-count `it` referencing the 3 new feature dirs (decisao/explicacao/admin·bias-audit), tolerant pre-implementation (skip-if-absent) and locking coverage post-implementation. SCAN_ROOTS UNCHANGED (still 3 roots); the forbidden-term assertion stays GREEN (17/17).
- **15-VALIDATION.md:** `nyquist_compliant: true` + `wave_0_complete: true` flipped; Wave 0 checkboxes + Sign-Off ticked.

## Task Commits

Each task was committed atomically (RED test commits — `git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: RED golden test — consolidation aggregation + authorize (Deno)** - `44ef5dc` (test)
2. **Task 2: RED golden test — EEOC 4/5 + age banding (Vitest)** - `cf1320b` (test)
3. **Task 3: RED contract test (client↔EF body) + forbidden-strings sanity-count** - `e87c94d` (test)

**Plan metadata:** _this commit_ (docs: complete plan — SUMMARY + STATE + ROADMAP + VALIDATION)

## Files Created/Modified

- `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` (created, 296 lines) — RED Deno golden test for the consolidation EF aggregation + authorize; injected-deps mock supabase, no network.
- `src/features/admin/bias-audit/__tests__/biasMath.test.ts` (created, 137 lines) — RED Vitest golden test for `computeAdverseImpact` (EEOC 4/5) + `bandFromAge`.
- `src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts` (created) — client↔EF `.strict()` body contract: Node-local replica (GREEN) + source-text probe (RED until Wave 2).
- `src/__tests__/guards/forbidden-strings.grep.test.ts` (modified) — added ONE Phase-15 sanity-count `it`; SCAN_ROOTS untouched.
- `.planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-VALIDATION.md` (modified) — nyquist_compliant/wave_0_complete flipped true; Wave 0 + Sign-Off checkboxes ticked.

## Decisions Made

- **biasMath.test.ts location:** the plan's frontmatter named `src/features/admin/bias-audit/biasMath.test.ts` (a sibling, not under `__tests__/`). The vitest `include` glob is `**/__tests__/**/*.{test,spec}.{ts,tsx}` (verified in `vite.config.ts:13`), so a sibling `*.test.ts` is **never discovered** by `npm run test:run` ("No test files found"). Placed it at `src/features/admin/bias-audit/__tests__/biasMath.test.ts` importing `../biasMath` so the verify command `npm run test:run -- biasMath` discovers it AND it fails via module-resolution (the calibrated RED). Wave-2 module remains its sibling one level up.
- **Contract Part-2 mechanism:** the plan said "import the shared request schema from `../consolidacaoSchema`". A live `await import('../consolidacaoSchema')` of an absent module fails vitest **suite collection** ("Failed to resolve import" → "no tests"), which would prevent the Part-1 runtime contract assertions from running. Switched to the verified `redacao-contract.test.ts` idiom: a `node:fs` source-text probe — RED now, GREEN the moment Wave 2 authors the file — so the accept-valid + reject-unknown-key assertions run today.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] biasMath.test.ts relocated under __tests__/ for vitest discovery**
- **Found during:** Task 2 (EEOC 4/5 golden test)
- **Issue:** The plan's sibling path `src/features/admin/bias-audit/biasMath.test.ts` is not matched by the vitest `include` glob (`**/__tests__/**`); `npm run test:run -- biasMath` returned "No test files found", so the file would never run as a calibrated RED test.
- **Fix:** Placed the test at `src/features/admin/bias-audit/__tests__/biasMath.test.ts` importing the Wave-2 module as its sibling `../biasMath`. Now discovered + RED via module-resolution.
- **Files modified:** src/features/admin/bias-audit/__tests__/biasMath.test.ts
- **Verification:** `npm run test:run -- biasMath` → `Failed to resolve import "../biasMath"` (calibrated RED, suite collects).
- **Committed in:** `cf1320b` (Task 2 commit)

**2. [Rule 3 - Blocking] consolidacaoContract Part-2 uses a node:fs source-text probe, not a live dynamic import**
- **Found during:** Task 3 (client↔EF contract test)
- **Issue:** A live `await import('../consolidacaoSchema')` of the absent shared schema failed vitest **suite collection** ("Failed to resolve import" → "no tests"), so the Part-1 runtime `.strict()` contract assertions (accept-valid + reject-unknown-key) never ran — defeating the acceptance criterion "asserts both accept-valid + reject-unknown-key".
- **Fix:** Replaced the dynamic import with a `node:fs` source-text probe over `../consolidacaoSchema.ts` (the verified `redacao-contract.test.ts` idiom) — RED now (file absent → empty source → no match), GREEN when Wave 2 authors it; Part-1 replica assertions run today.
- **Files modified:** src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts
- **Verification:** `npm run test:run -- consolidacaoContract` → 6 tests collect, 4 Part-1 GREEN, 2 Part-2 source-probe RED.
- **Committed in:** `e87c94d` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking test-infra). Both are mechanical adaptations to the project's vitest discovery + module-resolution semantics that preserve the EXACT plan intent (a discoverable, calibrated RED test that fails until the implementation lands). No scope creep; no production code authored (RED wave).
**Impact on plan:** None on behavior — the test contracts assert precisely what the plan specified; only the file location (Task 2) and the RED mechanism (Task 3) were adapted to the harness.

## Issues Encountered

- vitest only discovers tests under `**/__tests__/**` and statically analyzes dynamic-import targets at suite-collection time. Both surfaced as "no tests found / suite failed to collect" rather than the intended per-test RED. Resolved via the two Rule-3 fixes above (relocate under `__tests__/`; use a `node:fs` source-text probe). Both fixes mirror verified prior-phase precedents (redacao-contract, Phase 13).

## Known Stubs

None. This is the RED (TDD) layer by design — the three test files reference not-yet-existing modules (`consolidar-decisao-final/index.ts`, `biasMath.ts`, `consolidacaoSchema.ts`) whose absence IS the calibrated assertion. They are not stubs flowing to UI; they are failing tests that downstream waves (15-02 EF, 15-03 schema, 15-05 biasMath) flip GREEN. No hardcoded empty values, placeholder copy, or unwired data sources were authored.

## Threat Flags

None. This plan authors only test files + a guard sanity-count + a planning-doc flip — no new network endpoints, auth paths, file-access patterns, or schema changes. Threat register T-15-01 (SCAN_ROOTS unchanged) and T-15-02 (every RED test fails via module-not-found, not a pass) are both satisfied; T-15-SC (no package installs) is vacuously satisfied.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Wave 1 (15-02)** can author `supabase/functions/consolidar-decisao-final/index.ts` against the Deno golden test (the `handler(req, deps)` injected-deps signature + the JSON shape `{ consolidated, breakdown[], recommendation }` are pinned), and the shared `src/features/decisao/schemas/consolidacaoSchema.ts` exporting `ConsolidacaoRequestSchema` (`.strict()`, `{candidatura_id, vaga_id}` uuids, no score) to flip the contract source-probe GREEN.
- **Wave 2 (15-05)** can author `src/features/admin/bias-audit/biasMath.ts` exporting `computeAdverseImpact(bands, opts?)` + `bandFromAge(age)` to flip the EEOC 4/5 golden test GREEN; the 5 age bands + the small-N + null-exclusion contract are pinned.
- forbidden-strings sanity-count auto-locks LGPD-04 coverage the moment any Wave-2 source file lands under the 3 new feature dirs.
- No blockers.

## Self-Check: PASSED

- FOUND: supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
- FOUND: src/features/admin/bias-audit/__tests__/biasMath.test.ts
- FOUND: src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts
- FOUND: .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-01-SUMMARY.md
- FOUND commit: 44ef5dc (Task 1) · cf1320b (Task 2) · e87c94d (Task 3)

---
*Phase: 15-decis-o-final-audit-vel-lgpd-art-20*
*Completed: 2026-06-26*
