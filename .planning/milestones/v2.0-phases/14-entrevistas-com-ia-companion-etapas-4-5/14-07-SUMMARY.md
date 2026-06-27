---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
plan: 07
subsystem: database
tags: [supabase, rls, security-definer-rpc, postgres, react, edge-function, gap-closure]

# Dependency graph
requires:
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: "Plans 14-03/04/05/06 — entrevista/cognitivo tables + RLS, pontuar_cognitivo + salvar_avaliacao_entrevista RPCs, avancar_etapa flag guard, RH interview workspace, candidate cognitive prova, avaliar-transcricao-entrevista EF"
provides:
  - "CR-04: getAnalise normalizes the EF English `competency` key to pt-BR `competencia` in the service read layer — transcript competencies finally reach the RH scorecard + transcript panel (ENTREV-03)"
  - "CR-03 + WR-07: confirmar_revisao_entrevista SECURITY DEFINER RPC + a client readback assertion replace the silent RLS-filtered client UPDATE (the flag-release path now actually persists)"
  - "CR-02: pontuar_cognitivo persists raw picks + proctoring to cognitivo_respostas (the table's first writer) — the tab-blur disclosure is now truthful"
  - "CR-01: pontuar_cognitivo refuses to persist a misleading na_media row when the item bank is empty (RAISE no_data_found)"
  - "WR-04: vaga-ownership-scoped RH SELECT RLS on entrevista_analises + entrevista_guias + scores_candidato (horizontal-access gap closed)"
  - "WR-06: deriveLanguageAccentFlag guards bias_flags (missing field = non-firing, never throws — never-absent-persist invariant holds)"
  - "WR-05/WR-03/WR-02/IN-01/IN-04: client validation parity, audit-only relabel, dead-CTA disable, dead-branch + timezone cleanups"
affects: [phase-15-decisao-final, secure-phase-14, verify-phase-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-layer key normalization (EF EN write key → pt-BR read key) bridges a write/read drift without renaming the write (keeps the other consumer, gerar-guia weakDimsFromScores, working)"
    - "Release/confirm marker writes route through a SECURITY DEFINER RPC with a server-returned readback row, never a direct client UPDATE on a SELECT-only RLS table"
    - "Vaga-ownership-scoped SELECT RLS (candidatura → vagas.created_by = auth.uid(); administrador bypass) closes horizontal-access on RH reads, matching the write RPCs"

key-files:
  created:
    - "supabase/migrations/20260625000001_phase14_gap_closure.sql — CR-01/CR-02 (pontuar_cognitivo guard + cognitivo_respostas persist), CR-03 (confirmar_revisao_entrevista RPC), WR-04 (vaga-scoped SELECT RLS). AUTHORED-NOT-APPLIED."
    - ".planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-07-SUMMARY.md"
  modified:
    - "src/features/entrevista/services/entrevistaService.ts — CR-04 normalize, CR-03/WR-07 RPC reroute + readback, WR-05 client guard + VALIDATION surfacing, WR-03 docstring"
    - "src/features/entrevista/components/EntrevistaWorkspace.tsx — WR-03 audit-only handler + toast"
    - "src/features/entrevista/components/TranscricaoReviewPanel.tsx — WR-02 Avançar CTA disabled with decisão-final tooltip"
    - "src/features/entrevista/components/CognitivoBandCard.tsx — WR-03 audit-only relabel (no reject promise)"
    - "src/features/entrevista/components/EntrevistaDashboard.tsx — IN-04 America/Sao_Paulo timezone pin"
    - "src/features/avaliacao-cognitiva/services/cognitivoService.ts — IN-01 dead-branch removal + CR-02 submitProva proctoring/shuffleSeed wiring"
    - "src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx — IN-01 duplicate-toast collapse + CR-02 proctoring read+pass"
    - "src/features/avaliacao-cognitiva/__tests__/prova-cognitiva.test.tsx — updated for the new RPC body contract"
    - "supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts — WR-06 bias_flags null-guard"

key-decisions:
  - "Scoped the table-wide scores_candidato rh_le_scores SELECT policy to vaga-ownership (affects all tipos, not just interview/cognitive) — consistent with the write RPCs and the right horizontal-access boundary"
  - "Extended pontuar_cognitivo's signature (DROP + recreate as 5-arg) instead of a separate write path, so the raw-picks + proctoring persist atomically inside the already-ownership-verified DEFINER body"
  - "confirmar_revisao_entrevista cast to `as never` at the rpc call site because it is absent from the unapplied database.types.ts union (drop the cast once the orchestrator applies + regenerates types)"
  - "CR-04 normalized in the SERVICE READ LAYER only (not the EF write) — gerar-guia's weakDimsFromScores still reads `competency` (IN-03), so renaming the write would have broken weak-dim gap-targeting"

patterns-established:
  - "EF write key vs RH read key drift bridged at the read layer with a non-lossy normalizer (keeps both consumers working)"
  - "Confirm/release markers go through a DEFINER RPC with a readback row; no silent 0-row success on a SELECT-only RLS table"

requirements-completed: [ENTREV-03, ENTREV-04, ENTREV-05]

# Metrics
duration: ~32min
completed: 2026-06-25
---

# Phase 14 Plan 07: Code-Review Gap Closure Summary

**Closed the Phase-14 review blockers — competency scores now reach the RH UI, the human-review release path goes through an authorized RPC with readback, cognitive picks + proctoring finally persist, empty-bank scoring refuses, and the RH read path is vaga-ownership scoped — all DB changes authored as one idempotent migration (UNAPPLIED) plus the client/EF code fixes.**

## Performance

- **Duration:** ~32 min
- **Tasks:** 2
- **Files modified:** 9 (8 modified + 1 migration created), plus this SUMMARY

## Accomplishments

- **CR-04** — `getAnalise` normalizes the EF's English `competency` to the pt-BR `competencia` every RH consumer reads; the inline scorecard sliders + transcript panel now render AI-seeded competencies and `SugestaoIABadge` (ENTREV-03 surface was inert before). The EF write key is deliberately NOT renamed (IN-03: gerar-guia's `weakDimsFromScores` correctly reads `competency`).
- **CR-03 + WR-07** — "Confirmar revisão humana" routes through the new `confirmar_revisao_entrevista(p_analise_id)` SECURITY DEFINER RPC (role + vaga-ownership guarded). The client asserts the returned row carries `revisao_confirmada_em` and throws `NOT_FOUND` on a null/empty return — no more silent RLS-filtered 0-row no-op (flagged candidates were permanently un-advanceable).
- **CR-02** — `pontuar_cognitivo` now persists raw picks + proctoring to `cognitivo_respostas` (the table previously had zero writers — dead table + dead back-lock RLS). `submitProva` passes the collected `shuffleSeed` + proctoring (blurCount/events/seconds); the "registramos quando a aba perde o foco" disclosure is now truthful. Raw-picks-only — never a score/band/gabarito in `cognitivo_respostas`.
- **CR-01** — `pontuar_cognitivo` RAISES `no_data_found` when the item bank is empty (`v_n_total = 0`) instead of persisting a misleading `na_media` score=0/score_max=0 row for every candidate. The CC0 content seed stays deferred.
- **WR-04** — vaga-ownership-scoped RH SELECT policies on `entrevista_analises`, `entrevista_guias`, and `scores_candidato` (a recrutador reads interview/cognitive data ONLY for vagas they own; administrador sees all). Candidate-DENY preserved.
- **WR-06** — `deriveLanguageAccentFlag` guards `bias_flags` (missing field = non-firing, never throws) so the EF still persists an analysis row (never-absent-persist invariant holds).
- **WR-05 / WR-03 / WR-02 / IN-01 / IN-04** — client 200-char floor parity + VALIDATION surfacing; cognitive band relabeled audit-only (no false reject promise, `bias_audit_log` write kept); dead "Avançar etapa" CTA disabled with a decisão-final tooltip; impossible `String(status)==='42501'` disjunct + duplicate-toast if/else removed; dashboard datetime pinned to America/Sao_Paulo.

## Task Commits

1. **Task 1: Code-layer fixes (CR-04/CR-03/WR-05/WR-06/WR-03/WR-02/IN-01/IN-04)** — `0a20f48` (fix)
2. **Task 2: Migration (CR-01/CR-02/CR-03/WR-04) + submitProva proctoring persist** — `4fe98e3` (feat)

**Plan metadata:** this docs commit.

## Files Created/Modified

See the `key-files` frontmatter for the full list. Migration:
- `supabase/migrations/20260625000001_phase14_gap_closure.sql` — pontuar_cognitivo empty-bank guard + cognitivo_respostas persist (CR-01/CR-02), confirmar_revisao_entrevista RPC (CR-03), vaga-scoped SELECT RLS (WR-04). No BEGIN/COMMIT wrapper (D-22). Idempotent (DROP FUNCTION + CREATE for the signature change; CREATE OR REPLACE; DROP POLICY IF EXISTS).

## Decisions Made

- **scores_candidato is scoped table-wide** — the `rh_le_scores` SELECT policy is shared across SJT/big_five/redacao/entrevista/cognitivo; scoping it to vaga-ownership closes the horizontal-access gap for ALL tipos consistently (and matches the write RPCs), not just interview/cognitive.
- **pontuar_cognitivo signature changed via DROP + recreate** — the new 5-arg signature carries `p_shuffle_seed`/`p_completion_time_seconds`/`p_proctoring`; the old 2-arg overload is dropped so no stale signature lingers. The client calls with named params.
- **`confirmar_revisao_entrevista` cast `as never` at the call site** — it is absent from the unapplied `database.types.ts` union; the cast is removed once the orchestrator applies the migration + regenerates types ([[feedback_integration_contract_gap]]).
- **CR-04 fixed in the read layer, not the EF write** — IN-03: renaming the EF write to `competencia` would have silently broken gerar-guia's weak-dim detection. The read-layer normalizer keeps both consumers working.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `confirmar_revisao_entrevista` rpc-name cast for the unapplied RPC**
- **Found during:** Task 1 (CR-03 RPC reroute)
- **Issue:** The new RPC is absent from the generated `database.types.ts` union (it is authored-but-unapplied), so `supabase.rpc('confirmar_revisao_entrevista', ...)` failed tsc (TS2345) and would have grown the baseline.
- **Fix:** Cast the rpc name + params `as never` with an inline note to drop the cast on types regen (the codebase's established pattern for unapplied RPCs).
- **Files modified:** src/features/entrevista/services/entrevistaService.ts
- **Verification:** tsc baseline returned to 291 (zero growth).
- **Committed in:** 0a20f48 (Task 1 commit)

**2. [Rule 1 - Bug] prova-cognitiva test updated for the new RPC body contract**
- **Found during:** Task 2 (submitProva proctoring wiring)
- **Issue:** The existing test asserted the RPC body had exactly `['p_candidatura_id', 'p_respostas']` keys; CR-02 adds the advisory shuffle seed + proctoring/timing params, so the assertion would (correctly) fail.
- **Fix:** Updated the assertion to the new 5-key contract while keeping the anti-tamper check (no score/band/threshold/nota reaches the RPC body).
- **Files modified:** src/features/avaliacao-cognitiva/__tests__/prova-cognitiva.test.tsx
- **Verification:** prova-cognitiva 12/12 GREEN.
- **Committed in:** 4fe98e3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). Both required by the plan's own intent (the plan explicitly says submitProva should pass shuffleSeed + proctoring, and the RPC is intentionally unapplied).
**Impact on plan:** No scope creep. CC0 cognitive item seed stays deferred per the plan.

## Issues Encountered

- **Pre-existing out-of-scope test failure (NOT mine):** `supabase/functions/_shared/__tests__/essay-schemas.test.ts` fails under Vitest with `Only URLs with a scheme in: file and data are supported` — it is a Phase-13 Deno test (commit 3af37d8) that imports `https://deno.land/std...` and is meant to run under `deno test`, not Vitest. It is not in this plan's diff and is left untouched (SCOPE BOUNDARY). The plan-scoped suites (entrevista 20/20, prova-cognitiva 12/12) and the rest of the Vitest run (543 tests) pass.

## Migration / Edge Function — Orchestrator Apply Required

**The migration is AUTHORED but NOT APPLIED.** Per the PROD-apply boundary, the executor authored `supabase/migrations/20260625000001_phase14_gap_closure.sql` as a file only — no `supabase db push`, no `apply_migration`, no MCP/CLI deploy was run.

**The orchestrator must, with the user's authorization, AFTER this plan returns:**
1. **Apply the migration** `20260625000001_phase14_gap_closure.sql` to PROD (via Supabase MCP `apply_migration`, the Phase-14 precedent for PL/pgSQL `$$` bodies that trip 42601 on `db push`). This drops the old 2-arg `pontuar_cognitivo`, creates the 5-arg version, creates `confirmar_revisao_entrevista`, and reworks the 3 RH SELECT policies.
2. **Redeploy the Edge Function** `avaliar-transcricao-entrevista` — the WR-06 `bias_flags` null-guard in `_local/derive-flags.ts` only takes effect once the EF is redeployed (`supabase functions deploy avaliar-transcricao-entrevista`).
3. **Regenerate `database.types.ts`** so the `confirmar_revisao_entrevista` rpc cast (`as never`) can be dropped (and `pontuar_cognitivo`'s new signature is reflected).

## Next Phase Readiness

- Phase-15 (decisão final) owns the real funil advance + the auditable rejection — the WR-02 CTA and the WR-03 audit-only relabel both point there.
- Verifier/secure-phase gates can re-run after the orchestrator applies the migration + redeploys the EF; the vaga-scoped RLS (WR-04) is the security-relevant change to re-audit.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260625000001_phase14_gap_closure.sql`
- FOUND: `.planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-07-SUMMARY.md`
- FOUND commit: `0a20f48` (Task 1)
- FOUND commit: `4fe98e3` (Task 2)
- Build exit 0; tsc baseline 291 (≤305, zero growth); entrevista 20/20 + prova-cognitiva 12/12 GREEN.

---
*Phase: 14-entrevistas-com-ia-companion-etapas-4-5*
*Completed: 2026-06-25*
