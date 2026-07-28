---
phase: 24-blindagem-de-seguran-a-pii-lgpd
plan: 07
subsystem: database
tags: [big-five, ipip-neo-120, psychometrics, lgpd, rls, security-definer, deno, scorer]

# Dependency graph
requires:
  - phase: 12-big-five-devolutiva
    provides: bigfive_itens item bank + get_bigfive_itens RPC + bigfive-scoring.ts (120-item Johnson-norm scorer) + submit-bigfive-final EF + client schema/screen
  - phase: 24-01
    provides: live-state verification (A5 — 120 items, {28,58,88,118} all dim O faceta 28, no ativo column)
provides:
  - "UX-08: the 4 political-opinion O6 Big Five items {28,58,88,118} are deactivated from administration (reversible ativo flag; get_bigfive_itens filters WHERE ativo → 116)"
  - "116-item scorer with O domain prorated ×6/5 (Johnson O norm preserved); REVERSED 55→53"
  - "all 6 count-invariant sites moved in lockstep (scorer, submit EF validateBody, client schema, screen copy, both golden tests) — no contiguous 1..120 assumption survives"
affects: [24-08-apply-wave, 24-09-ef-redeploy, M5-o6-authoral-replacement, phase-25-funil]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reversible ativo flag (NOT hard DELETE) for LGPD item-bank removal — M5 flips back"
    - "Domain proration ×6/5 to keep a full-facet norm valid after dropping one facet (only O prorated)"
    - "Active-id-set coverage validation (non-contiguous ids) shared server-side via scorer exports (ACTIVE_ITEM_IDS/ACTIVE_ITEM_COUNT/DEACTIVATED_ITEM_IDS)"

key-files:
  created:
    - supabase/migrations/20260706110008_ux08_o6_deactivate.sql
  modified:
    - supabase/functions/_shared/bigfive-scoring.ts
    - supabase/functions/_shared/bigfive-scoring.test.ts
    - supabase/functions/submit-bigfive-final/index.ts
    - supabase/functions/submit-bigfive-final/index.test.ts
    - src/features/avaliacao/schemas/bigfiveSchema.ts
    - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx

key-decisions:
  - "Reversible ativo=false flag (not hard DELETE) so M5 restores the authoral non-political O6 facet"
  - "Prorate ONLY the O domain ×6/5 over its 5 surviving facets; N/E/A/C untouched — the neutral vector keeps O=72, so the wired Johnson percentile/norm is byte-identical (no re-norming, no auto-reject)"
  - "validateBody + scorer validate against the ACTIVE 116-id set (non-contiguous), derived server-side from scorer exports — rejects the old 120-item body and any deactivated id present; EF re-touch not needed when M5 re-adds items"

patterns-established:
  - "6-site count-invariant lockstep (RESEARCH Pitfall 3): a partial edit silently corrupts scores or 400s every submit — move all sites in one plan"
  - "Facet-drop + domain-prorate keeps a full-facet Johnson norm valid without re-normalizing"

requirements-completed: [UX-08]

# Metrics
duration: 40min
completed: 2026-07-07
---

# Phase 24 Plan 07: UX-08 — Political O6 Item Removal (LGPD) without Breaking the Big Five Scorer Summary

**The 4 political-opinion O6 Big Five items {28,58,88,118} are removed from administration via a reversible `ativo` flag; the scorer accepts 116 non-contiguous items and prorates the O domain ×6/5 so the Johnson norm stays byte-identical, with all 6 count-invariant sites moved in lockstep and every golden/scorer test green.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-07-07T04:13Z
- **Completed:** 2026-07-07T04:52Z
- **Tasks:** 3 (+1 auto-fix deviation)
- **Files modified:** 6 (1 created, 5 modified) + 1 deferred-items log

## Accomplishments
- **UX-08 exposure closed (files-only):** migration adds a reversible `ativo boolean DEFAULT true`, sets `ativo=false` for exactly `item_id IN (28,58,88,118)`, and recreates `get_bigfive_itens()` with `WHERE b.ativo` (same SECURITY DEFINER + search_path='' + REVOKE/GRANT projection) → the candidate is served 116 items and never sees a political item. No hard DELETE (M5 flips it back).
- **Scorer survives 116 items:** count guard `120 → ACTIVE_ITEM_COUNT (116)` and rejects any deactivated id; `REVERSED` drops 88 & 118 (O reversed 12→10, total 55→53); `domainRaw.O = round(O × 6 / 5)` prorates ONLY O over its 5 surviving facets — the neutral all-3s vector still yields O=72, so the Johnson percentile/band/norm is unchanged. The scorer no longer throws on 116.
- **6-site lockstep landed together (Pitfall 3):** scorer, `submit-bigfive-final` validateBody (active-id-set, non-contiguous), client `bigfiveSchema` (`BIGFIVE_TOTAL_ITENS 120→116` + `isAllAnswered` driven off loaded ids), `BigFiveQuestionnaireScreen` copy (dynamic `ordered.length`, no hardcoded "120 afirmações"), and BOTH golden tests (scorer 116/53/prorate + EF 116-body). No orphan count-120 literal remains for the instrument.
- **Non-eliminatory preserved (RNF-07a):** scoring writes nothing to `candidaturas` and never auto-rejects on a trait/percentile; bands (UX-07) unchanged.

## Task Commits

1. **Task 1: DB migration — ativo flag + deactivate {28,58,88,118} + get_bigfive_itens filters ativo** — `279f8ca` (feat)
2. **Task 2: Scorer 116-item + O ×6/5 prorate + golden test** — `5bc2fdf` (feat)
3. **Task 3: submit EF active-set validate + client schema/copy lockstep** — `00755f4` (feat)

**Deviation fix:** `678637e` (fix — Rule 1, forbidden-term in migration comment)

## Files Created/Modified
- `supabase/migrations/20260706110008_ux08_o6_deactivate.sql` — **created**: reversible `ativo` flag, deactivate the 4 political O6 items, `get_bigfive_itens` filters `WHERE b.ativo`. No outer BEGIN/COMMIT; no hard DELETE. Apply = 24-08.
- `supabase/functions/_shared/bigfive-scoring.ts` — count 116, reject deactivated ids, REVERSED 53, O ×6/5 prorate; new exports `DEACTIVATED_ITEM_IDS`/`ACTIVE_ITEM_COUNT`/`ACTIVE_ITEM_IDS`.
- `supabase/functions/_shared/bigfive-scoring.test.ts` — golden at 116/53, facet-28 raw 0, explicit ×6/5 prorate assertion, deactivated-id-rejection + active-set exposure tests (17/17 green).
- `supabase/functions/submit-bigfive-final/index.ts` — validateBody drives coverage off `ACTIVE_ITEM_IDS`/`ACTIVE_ITEM_COUNT` (non-contiguous); no `for id=1..120` loop. Redeploy = 24-09.
- `supabase/functions/submit-bigfive-final/index.test.ts` — 116-active body + a new "120-body rejected 400" case (10/10 green).
- `src/features/avaliacao/schemas/bigfiveSchema.ts` — `BIGFIVE_TOTAL_ITENS 120→116`; `isAllAnswered(respostas, itemIds)` off loaded ids; `countAnswered` counts entries directly (no 1..N loop).
- `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` — dynamic count via `ordered.length` (`LikertItem total` prop, `BigFiveIntro totalItens` prop, progress denominator); completion gate off loaded item ids.

## Decisions Made
- **Prorate O ×6/5, don't re-norm.** Dropping facet 28 makes O a 5-facet (20-item, 20-100) sum; ×6/5 maps it back to the 24-item (24-120) Johnson O scale. Because the neutral vector's O pre-prorate is 60 → 72, every percentile/band assertion in the golden test is byte-identical to the 120-item run — no norm table change, no candidate-visible shift. Facet-28 output stays raw 0 (devolutiva uses domain-level `paginas` — cosmetic).
- **Server-derived active set.** `validateBody` and the scorer both validate against `ACTIVE_ITEM_IDS` exported from the scorer, so M5 re-adding items needs no EF re-touch, and a stray deactivated id (28/58/88/118) is rejected in addition to the count check.
- **Reversible flag.** `ativo=false` (not DELETE) keeps the rows for auditability and lets M5's authoral replacement flip them back.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Forbidden LGPD-04 term in migration comment**
- **Found during:** Post-Task-3 full-suite regression check
- **Issue:** My Task-1 migration comment wrote "M5/psicólogo", which the `forbidden-strings.grep` guard (LGPD-04 / RNF-12) forbids in `supabase/` source → the guard turned red.
- **Fix:** Reworded the comment to "(deferred to M5)".
- **Files modified:** `supabase/migrations/20260706110008_ux08_o6_deactivate.sql`
- **Verification:** `npm run test:run -- forbidden-strings` → 19/19 green.
- **Committed in:** `678637e`

---

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Trivial comment fix; no behavior change. No scope creep.

## Issues Encountered

- **Pre-existing (out-of-scope) full-suite reds:** the full `vitest run` shows 3 failing tests in `src/features/avaliacao/services/__tests__/redacaoService.test.ts` (SEC-02 verdict-allowlist projection). `redacaoService.ts` was last touched by Plan **24-03** (`c22fab5`) and is untouched by any 24-07 commit — these failures are independent of the Big Five UX-08 work. Logged to `deferred-items.md`; NOT fixed here per the SCOPE BOUNDARY rule. Excluding them, full vitest is **747/751 green**; the 4 files this plan touched are all green.

## Validation Evidence

- **Deno full corpus:** 187/187 green (incl. 17 scorer + 10 submit-EF tests).
- **Vitest (bigfive surface):** 25/25 green (bigfive-contract, BigFiveLikert, BigFiveIntro, schema-driven).
- **tsc:** 128 errors (≤ frozen 133 baseline; unchanged by this plan).
- **Greps:** `grep "120 afirma"` → 0; `grep "for (let id = 1; id <= 120"` (EF) → 0; scorer `6/5` → present; migration `28,58,88,118` + `WHERE b.ativo` present, `DELETE FROM bigfive_itens` → 0. No orphan count-120 literal remains for the instrument (remaining 120s are the max item-id, the 24-120 domain-scale range, and filenames).
- **No PROD apply, no EF redeploy, no `candidaturas` write** — migration application is 24-08, `submit-bigfive-final` redeploy is 24-09 (bundle-freeze).

## Known Stubs
None — no stub/placeholder patterns introduced. The authoral non-political O6 replacement is explicitly deferred to M5 (reversible `ativo` flag is the sanctioned mechanism, documented in the migration + CONTEXT UX-08); M4 only removes the exposure without breaking the calculation.

## Next Phase Readiness
- **24-08 (apply wave):** apply `20260706110008_ux08_o6_deactivate.sql` to PROD via Supabase MCP (`apply_migration`/`execute_sql` — bypasses 42601, writes the version row); smoke `SELECT count(*) FROM get_bigfive_itens()` → 116.
- **24-09 (EF redeploy):** redeploy `submit-bigfive-final` (bundles `_shared/bigfive-scoring.ts`) so the 116-item validate + O-prorate go live (bundle-freeze — `reference_ef_shared_bundle_freeze`). Then a live 116-item submit smoke.
- **M5:** authoral non-political O6 replacement — seed 4 new O6 items (or flip these back), set `ativo=true`; the scorer prorate reverts to 120/no-prorate.

## Self-Check: PASSED

All 8 created/modified files present on disk; all 4 commits (`279f8ca`, `5bc2fdf`, `00755f4`, `678637e`) present in git history.

---
*Phase: 24-blindagem-de-seguran-a-pii-lgpd*
*Completed: 2026-07-07*
