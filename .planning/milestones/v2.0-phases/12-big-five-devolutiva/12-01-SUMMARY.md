---
phase: 12-big-five-devolutiva
plan: 01
subsystem: testing
tags: [deno, vitest, zod, ipip-neo-120, big-five, lgpd-04, smoke-runtime-gate, red-tests]

# Dependency graph
requires:
  - phase: 11-avaliacao-assincrona
    provides: "scores_candidato (tipo='big_five' forward-declared), respostas_avaliacao + useAutosaveAvaliacao, avaliar-redacao EF authorize-then-act skeleton, two-client D-23"
  - phase: 09-ai-prompt-library-cost-infra
    provides: "LGPD-04 forbidden-strings grep guard, callAi/loadPrompt/audit-logger infra, deno test harness (deno.land/std@0.224.0/assert)"
provides:
  - "Wave-0 RED test battery for every Phase-12 production surface (scorer, both EFs, client↔EF contract) — fails before its implementation lands (smoke-runtime gate)"
  - "Reverse-key 55 + per-domain N7/E6/O12/A17/C13 contract pinned as executable assertions (Pitfall 1 de-risk)"
  - "Anti-tamper .strict client↔EF body contract pinned (Pitfall 3)"
  - "RF-19b non-big_five-refuse + word-count retry→degrade guards pinned (Pitfall 6)"
  - "LGPD-04 grep guard extended to the future 08-bigfive-devolutiva.md prompt template"
  - "12-SMOKES.md SQL smoke runbook for the 12-06 [BLOCKING] PROD apply wave"
affects: [12-02-scorer, 12-03-submit-ef, 12-04-devolutiva-ef, 12-06-prod-apply]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 calibrated-RED gate: tests COMPILE under Deno/TS strict but FAIL at runtime (module-not-found) against not-yet-written code — the failure IS the assertion (Phase-4 lesson D-25..D-28)"
    - "Node-local Zod replica + node:fs source-text probe for a client↔EF contract whose EF schema uses an npm:/esm.sh specifier Vitest can't resolve (strict-schema.test.ts precedent)"
    - "Targeted-include LGPD-04 grep extension for ONE candidate-facing doc path (not docs/ wholesale) with negated-disclaimer hygiene exemption"

key-files:
  created:
    - "supabase/functions/_shared/bigfive-scoring.test.ts"
    - "supabase/functions/submit-bigfive-final/index.test.ts"
    - "supabase/functions/gerar-devolutiva-bigfive/index.test.ts"
    - "src/features/avaliacao/__tests__/bigfive-contract.test.ts"
    - ".planning/phases/12-big-five-devolutiva/12-SMOKES.md"
  modified:
    - "src/__tests__/guards/forbidden-strings.grep.test.ts"

key-decisions:
  - "Golden vector pins the norm-INDEPENDENT raws exactly (neutral→72/domain, 12/facet; C-only variant→68) + asserts the band follows the percentile cutoffs; the exact percentile is left to 12-02's transcribed Johnson norm table (norm.py not on-disk) — the deterministic raws + cutoff-agreement detect the Pitfall-1 failure mode without fabricating norm values."
  - "Contract test uses a Node-local Zod replica for the runtime parse assertions + a node:fs source probe for the calibrated RED, because the EF schema imports npm:zod@3.25.76 which Vitest/Node cannot resolve (a direct import would NOT flip GREEN when 12-02 lands)."
  - "LGPD-04 guard targets the single 08-bigfive-devolutiva.md path (not docs/ in SCAN_ROOTS) and EXEMPTS the negated compliant disclaimer 'não é teste psicológico' via isExemptDevolutivaLine — a naive grep would mis-flag the L44 footer."

patterns-established:
  - "Per-surface RED test authored before implementation; flips GREEN when 12-02/03/04 ship the target module"
  - "DI-mocked Deno EF tests (supabaseAdmin/supabaseUser/callAi injected) — never open a socket"

requirements-completed: [AVAL-04, AVAL-08]

# Metrics
duration: ~30min
completed: 2026-06-09
---

# Phase 12 Plan 01: Wave-0 Smoke-Runtime Gate Summary

**4 calibrated RED test files (IPIP-NEO-120 scorer reverse-key/golden contract, both EF auth+IDOR+never-reject+anti-tamper, client↔EF .strict body contract) + the LGPD-04 grep guard extended to the future devolutiva prompt + the 5-step SQL smoke runbook — every downstream Phase-12 surface now has a failing test before its implementation lands.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-06-09
- **Tasks:** 2
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- **Scorer RED contract (bigfive-scoring.test.ts):** `REVERSED.size === 55`, per-domain N7/E6/O12/A17/C13 (filtered through FACET_TO_DOMAIN), verbatim-vs-PESQUISA no-drift check, `facetOf` spot checks, FACET_TO_DOMAIN cycle, and a golden vector pinning every domain raw (72) / facet raw (12) for the neutral vector + a C-only variant (68, proving reverse correction is applied per-item) + band-follows-percentile-cutoff agreement. RED via module-not-found until 12-02.
- **submit-bigfive-final RED contract:** 401 no-session, 403 IDOR non-owner, 403 wrong-etapa, `tipo='big_five'`+`status='sucesso'` insert, NEVER writes `candidaturas` + no trait-derived `pendente_humano` (RNF-07a / Pitfall 4), neutral `{ok:true}` carrying zero score data, `.strict` rejects a `score` field, `<120` answers rejected. RED until 12-03.
- **gerar-devolutiva-bigfive RED contract:** band selection at the ≤15/16-35/36-64/65-84/≥85 cutoffs, RF-19b refuse for a non-big_five score row (Pitfall 6), word-count out-of-range → exactly 1 retry/dim then graceful-degrade to the raw template, happy-path no-retry persist. RED until 12-04.
- **client↔EF contract (bigfive-contract.test.ts):** Node-local Zod replica proves the 120×(1-5) body parses + `.strict` rejects an extra `score` + out-of-range/non-int fail; node:fs source probe asserts the EF file exports `SubmitBigfiveFinalBodySchema` with `.strict()`+`.min(1)/.max(5)` (RED until 12-02).
- **LGPD-04 grep extension:** targeted include for `08-bigfive-devolutiva.md`; forbids candidate-facing clinical labels (diagnóstico/transtorno/neuroticismo + teste psicológico) while exempting the negated compliant disclaimer; green now (file absent), asserts on 12-04.
- **12-SMOKES.md:** 5 SQL smokes for the [BLOCKING] apply wave (answer-key projection, candidate score-deny, devolutiva own-row, RH allowlist, seed 120/55 integrity) with the set_config jwt-claims pattern + ROLLBACK-free cleanup.

## Task Commits

1. **Task 1: Scorer + EF + contract RED tests** - `e5b4d8e` (test)
2. **Task 2: LGPD-04 grep extension + SQL smoke runbook** - `18fcfd4` (test)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `supabase/functions/_shared/bigfive-scoring.test.ts` - RED scorer tests (reverse-set + golden vector)
- `supabase/functions/submit-bigfive-final/index.test.ts` - RED EF tests (auth/IDOR/etapa, never-touch-candidaturas, neutral payload, anti-tamper)
- `supabase/functions/gerar-devolutiva-bigfive/index.test.ts` - RED EF tests (band select, RF-19b guard, retry/degrade)
- `src/features/avaliacao/__tests__/bigfive-contract.test.ts` - client↔EF body contract (replica + source probe)
- `.planning/phases/12-big-five-devolutiva/12-SMOKES.md` - SQL smoke runbook for the 12-06 apply wave
- `src/__tests__/guards/forbidden-strings.grep.test.ts` - LGPD-04 guard extended to the devolutiva prompt template

## Decisions Made
- See `key-decisions` frontmatter: golden-vector norm-independent pinning, Node-local Zod replica + source probe for the contract test, and the targeted single-path LGPD-04 include with negated-disclaimer exemption.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the LGPD-04 guard path**
- **Found during:** Task 2
- **Issue:** The plan referenced `tests/forbidden-strings.grep.test.ts`; the actual Phase-9 guard lives at `src/__tests__/guards/forbidden-strings.grep.test.ts`.
- **Fix:** Extended the guard at its real path (the plan's `<read_first>` anticipated this with a `grep -rn` discovery step).
- **Files modified:** src/__tests__/guards/forbidden-strings.grep.test.ts
- **Verification:** `npm run test:run -- forbidden-strings` → 16/16 green.
- **Committed in:** 18fcfd4

**2. [Rule 2 - Missing Critical] Negated-disclaimer exemption in the grep extension**
- **Found during:** Task 2
- **Issue:** The fixed LGPD/CFP footer (templates-devolutiva.md L44) reads "…não é teste psicológico…" — a forbidden term in a NEGATED, compliant context. A naive scan would mis-flag the compliant disclaimer once 12-04 authors the template, producing a false LGPD-04 failure.
- **Fix:** Added `isExemptDevolutivaLine` hygiene (skip comment lines + "não é (teste psicológico|diagnóstico)" negations) so the guard fires only on candidate-facing clinical LABELS, never the compliant disclaimer. No bare `=== 0` on unfiltered content (plan-required hygiene).
- **Files modified:** src/__tests__/guards/forbidden-strings.grep.test.ts
- **Verification:** `isExemptDevolutivaLine('…não é teste psicológico.')` → true; `Sensibilidade Emocional` → not flagged; the 3 forbidden labels match.
- **Committed in:** 18fcfd4

---

**Total deviations:** 2 auto-fixed (1 blocking path correction, 1 missing-critical hygiene)
**Impact on plan:** Both necessary for a correctly-calibrated guard. No scope creep — the test surface is exactly the 4 RED files + 1 grep extension + 1 runbook the plan specified.

## Issues Encountered
None — the deno harness, schema-import-resolution constraint, and the role/RLS strings all matched the Phase-9/11 precedents the RESEARCH cited.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- **12-02 (scorer + schema)** can now develop against `bigfive-scoring.test.ts` (flip module-not-found → green by exporting REVERSED/FACET_TO_DOMAIN/facetOf/reverse/score) AND `bigfive-contract.test.ts` source probe (add `SubmitBigfiveFinalBodySchema` `.strict()` to avaliacao-schemas.ts). The norm table (560 Johnson values, NOT on-disk) is 12-02's one mandatory transcription step — the golden test pins the raws + cutoff agreement, leaving the exact percentile to the transcribed norms.
- **12-03 (submit EF)** flips `submit-bigfive-final/index.test.ts` by copying avaliar-redacao's authorize-then-act skeleton + wiring the 12-02 scorer (handler must accept `{ supabaseAdmin, supabaseUser }` deps).
- **12-04 (devolutiva EF)** flips `gerar-devolutiva-bigfive/index.test.ts` (handler accepts `{ supabaseAdmin, callAi }` deps) AND lands `08-bigfive-devolutiva.md` (the LGPD-04 guard then asserts it).
- **12-06 [BLOCKING] apply** runs 12-SMOKES.md against live PROD.

## Self-Check: PASSED

---
*Phase: 12-big-five-devolutiva*
*Completed: 2026-06-09*
