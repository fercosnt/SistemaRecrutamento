---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
plan: 01
subsystem: testing
tags: [zod, deno, vitest, ctt-scoring, anti-tamper, rls, edge-functions, cognitivo, entrevista]

# Dependency graph
requires:
  - phase: 12-big-five-devolutiva
    provides: "bigfive-scoring.ts deep-module server-only-key posture + golden-test idiom (cloned by cognitivo/scoring.ts)"
  - phase: 13-redacao-cultural-revisao-humana
    provides: "redacao-schemas.ts .strict() anti-tamper body + redacao-contract.test.ts source-probe + compute-score.ts deterministic-derive + 13-VALIDATION.md runbook format (all cloned here)"
  - phase: 09-ai-prompt-library-cost-infra
    provides: "InterviewGuideSchema + TranscriptAnalysisSchema (the EF OUTPUT contracts the 14-03 EFs consume) + ai-client callAi pipeline"
provides:
  - "GerarGuiaBodySchema + AvaliarTranscricaoBodySchema (.strict, no score/band — anti-tamper EF body contracts)"
  - "SubmitCognitivoBodySchema (raw picks only) + BandaCognitivaEnum (5 pt-BR faixas)"
  - "scoreRaciocinio — deterministic CTT-soma + 5-faixa banding cognitive scorer (server-only key)"
  - "deriveLanguageAccentFlag — server-authoritative language/accent flag (NOT the LLM)"
  - "checkWeakDimCoverage — weak-dim coverage post-validation (Pitfall 4)"
  - "14-VALIDATION.md — 7-block SQL-smoke runbook for the apply wave"
  - "entrevista-allowlist.test.ts — calibrated RED for the 14-05 service allowlist"
affects: [14-03-EFs-migrations, 14-05-RH-UI, 14-06-candidate-cognitive-UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave-0 RED smoke-runtime gate (Phase-4 lesson): every downstream surface gets a calibrated failing test BEFORE its implementation lands"
    - "Anti-tamper .strict() EF body schema in a score-token-free file + a source-probe contract test (Phase-13 idiom)"
    - "Deterministic server-only scorer/derivation: the gabarito/predicate never reaches the client; tests assert external behavior not internals"

key-files:
  created:
    - supabase/functions/_shared/entrevista-schemas.ts
    - supabase/functions/_shared/cognitivo-schemas.ts
    - supabase/functions/_shared/cognitivo/scoring.ts
    - supabase/functions/_shared/cognitivo/scoring.test.ts
    - supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts
    - supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts
    - supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts
    - supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.test.ts
    - src/features/entrevista/__tests__/entrevista-contract.test.ts
    - src/features/entrevista/__tests__/entrevista-allowlist.test.ts
  modified:
    - .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-VALIDATION.md

key-decisions:
  - "scoreRaciocinio takes an optional secoesByItem partition (matriz/letra_numero) the PROD caller supplies from cognitivo_itens.secao — keeps the scorer pure + the section sum exact"
  - "bandaFromTotal uses wide proportion-correct quintiles (≤20/40/60/80% → bem_abaixo/abaixo/na_media/acima/bem_acima) as the provisional norm_ref 'provisoria_item_difficulty_sapa' (PRD §8.3 L183) — replaced by a local norm in v2; the interface stays stable"
  - "Body schemas pin plain npm:zod@3.25.76 (v3) for .safeParse; /v4 is reserved for the SDK structured-output OUTPUT schemas in 14-03 (Pitfall 3)"
  - "scoring.ts duplicates the Banda union as a const (does NOT import cognitivo-schemas.ts) to stay a pure module with no Zod runtime dependency — the enum contract is identical"

patterns-established:
  - "Pattern: EF body schema lives in a deliberately score-token-free file; a Node-local Zod replica + node:fs source-probe is the faithful client↔EF contract (Vitest has no npm: resolver)"
  - "Pattern: cognitive scorer mirrors bigfive-scoring's server-only-key deep-module posture — forged score/banda keys in rawResponses are ignored (only gabarito-keyed picks count)"

requirements-completed: [ENTREV-01, ENTREV-03, ENTREV-04, ENTREV-05]

# Metrics
duration: ~18min
completed: 2026-06-24
---

# Phase 14 Plan 01: Wave-0 RED Layer + Deterministic Modules + Anti-Tamper Schemas Summary

**The Phase-14 testable-contract foundation: 2 .strict() anti-tamper EF body schemas (no score fields), a deterministic CTT-soma cognitive scorer with a server-only key (10-profile golden battery GREEN), a server-authoritative language/accent flag predicate (6-row truth table GREEN), a weak-dim-coverage check, a calibrated RED allowlist probe, and a 7-block SQL-smoke runbook — every downstream surface now has a test before its implementation.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-24T18:10Z
- **Completed:** 2026-06-24T18:30Z
- **Tasks:** 3
- **Files modified:** 11 (10 created + 1 modified)

## Accomplishments
- **2 anti-tamper EF body schemas** (`GerarGuiaBodySchema`, `AvaliarTranscricaoBodySchema`) `.strict()` with zero score/band fields; `SubmitCognitivoBodySchema` (raw picks only) + `BandaCognitivaEnum` (5 pt-BR faixas). 16 contract tests GREEN (runtime replicas + source-probes proving zero score token in the live body code).
- **Deterministic cognitive scorer** `scoreRaciocinio` — CTT soma 0/1 per item, per-section sum (matriz/letra_numero), 5-faixa banding; the gabarito is server-only, a forged client score is structurally ignored. 10-profile golden battery + section-sum + anti-tamper, 6/6 GREEN under deno.
- **Server-authoritative flag** `deriveLanguageAccentFlag` — predicate `score<3 && regional_markers_ignored===false`, NOT the LLM; 6-row truth table GREEN. **Weak-dim coverage** `checkWeakDimCoverage` (Pitfall 4) — case/whitespace-insensitive, 6/6 GREEN.
- **14-VALIDATION.md** — 7-block SQL-smoke runbook (flag-blocks-avancar / pontuar_cognitivo non-owner 42501 / never-auto-reject / aplica_cognitivo gate / salvar_avaliacao non-owner / candidate-DENY RLS / prompts is_active), `nyquist_compliant: false`.
- **entrevista-allowlist.test.ts** — calibrated Wave-0 RED that flips GREEN when 14-05 ships the allowlist-projecting service (no `select('*')` PII over-projection).

## Task Commits

Each task was committed atomically (TDD tasks have test → feat commits):

1. **Task 1: EF body schemas + frontend contract test** — `c3b17ff` (feat)
2. **Task 2: cognitive scorer** — RED `6ef5aaf` (test) → GREEN `9528f98` (feat)
3. **Task 3: flag-derivation + weak-dim-coverage + runbook** — RED `32bc468` (test) → GREEN `e04613d` (feat)

**Plan metadata:** (this commit) `docs(14-01): complete plan`

## Files Created/Modified
- `supabase/functions/_shared/entrevista-schemas.ts` — `.strict()` GerarGuia + AvaliarTranscricao body schemas, no score/band fields (anti-tamper)
- `supabase/functions/_shared/cognitivo-schemas.ts` — SubmitCognitivo body (raw picks) + BandaCognitivaEnum (5 faixas)
- `supabase/functions/_shared/cognitivo/scoring.ts` — `scoreRaciocinio` deterministic CTT-soma + `bandaFromTotal` 5-faixa banding (server-only key)
- `supabase/functions/_shared/cognitivo/scoring.test.ts` — 10-profile golden battery + section-sum + anti-tamper (6/6 GREEN deno)
- `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts` — `deriveLanguageAccentFlag` server-side predicate
- `supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.test.ts` — 6-row truth table (GREEN deno)
- `supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts` — `checkWeakDimCoverage` (Pitfall 4)
- `supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.test.ts` — coverage cases (GREEN deno)
- `src/features/entrevista/__tests__/entrevista-contract.test.ts` — client↔EF body contract (16/16 GREEN vitest)
- `src/features/entrevista/__tests__/entrevista-allowlist.test.ts` — allowlist source-probe (calibrated RED until 14-05)
- `.planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-VALIDATION.md` — 7-block SQL-smoke runbook

## Decisions Made
- **Section partition is caller-supplied:** `scoreRaciocinio(rawResponses, gabarito, secoesByItem?)` — the PROD caller (the `pontuar_cognitivo` RPC / `submit-cognitivo` EF) passes the matriz/letra_numero partition from `cognitivo_itens.secao`. The golden test supplies it explicitly. Keeps the scorer pure and the per-section sum exact.
- **Provisional banding cutoffs:** wide proportion-correct quintiles (`provisoria_item_difficulty_sapa`, PRD §8.3 L183) — cognitive is CONTEXTUAL and decides nothing (RNF-07a), so an approximate band carries no eliminatory weight; the local norm (IRT 2PL / SAPA) is a v2 refinement behind the stable interface.
- **scoring.ts duplicates the Banda union (no Zod import):** keeps the scorer a pure module with no `npm:zod` runtime dependency; the enum contract matches `BandaCognitivaEnum` exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Calibrated the golden test to pass the section partition the PROD caller supplies**
- **Found during:** Task 2 (cognitive scorer GREEN)
- **Issue:** The RED golden test's 20-item fixture (12 matriz `item_01`-`item_12` + 8 letra_numero `item_13`-`item_20`) had no `ln`/`letra`/`numero` name marker, so the scorer's convention fallback would have classified all 20 as matriz — breaking the `letra_numero.n_itens === 8` assertion. The pure scorer cannot infer the section from a bare `item_NN` id.
- **Fix:** Added an optional `secoesByItem` partition arg to `scoreRaciocinio` (which the PROD caller supplies from `cognitivo_itens.secao` anyway) and updated the test to pass an explicit `SECOES` map. This calibrates the test to the scorer's stable PROD interface, not the other way round.
- **Files modified:** supabase/functions/_shared/cognitivo/scoring.test.ts (calibration), supabase/functions/_shared/cognitivo/scoring.ts (the optional arg)
- **Verification:** golden battery 6/6 GREEN; the section-sum assertion (`matriz.n_itens===12`, `letra_numero.n_itens===8`) passes
- **Committed in:** `9528f98` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug / test-calibration)
**Impact on plan:** The calibration aligned the test with the scorer's real PROD interface (the caller supplies the section partition from the item bank). No scope creep; no behavior change to the scorer's contract.

## Issues Encountered
- **`supabase/functions/_shared/__tests__/essay-schemas.test.ts` fails under the full `npm run test:run`** — a pre-existing Phase-13 Deno test (commit `3af37d8`) that uses `deno.land`/`Deno.test`. It sits under `_shared/__tests__/` so Vitest's `include` picks it up, but vite.config.ts's `exclude` does not name it (the other deno EF tests ARE path-excluded). It runs GREEN under `deno test`. Out of scope (not touched by this plan); logged to `deferred-items.md` with the one-line fix (add it to the vite.config.ts exclude list).

## Known Stubs
- **`entrevista-allowlist.test.ts` is calibrated RED by design** — it source-probes the `entrevistaService.ts` that ships in Plan 14-05. The 3 failing assertions (service exists / declares ENTREVISTA_ALLOWLIST / projects through it) flip GREEN the moment 14-05 lands the allowlist-projecting service. This is the intended Wave-0 smoke-runtime gate, not an unresolved stub.

## Self-Check: PASSED
All 8 spot-checked created files exist on disk; all 5 task commits (`c3b17ff`, `6ef5aaf`, `9528f98`, `32bc468`, `e04613d`) are present in git history.

## Next Phase Readiness
- **14-03 (EFs + migrations + apply)** can implement against fixed, test-locked contracts: the 2 `.strict()` body schemas, `scoreRaciocinio`, `deriveLanguageAccentFlag`, `checkWeakDimCoverage`, and the 7-block SQL-smoke runbook are all in place.
- **14-05/06 (UI)** inherit the calibrated `entrevista-allowlist.test.ts` RED, which the service + components will flip GREEN.
- tsc baseline 291 (unchanged, ≤305). No new packages (RESEARCH Package Legitimacy Audit — T-14-01-SC held).

---
*Phase: 14-entrevistas-com-ia-companion-etapas-4-5*
*Completed: 2026-06-24*
