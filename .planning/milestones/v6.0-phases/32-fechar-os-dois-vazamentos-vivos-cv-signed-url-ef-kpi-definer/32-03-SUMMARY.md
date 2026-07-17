---
phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer
plan: 03
subsystem: database
tags: [postgres, plpgsql, security-definer, rls, rpc, kpi, window-functions, vaga-scope]

# Dependency graph
requires:
  - phase: 32-01
    provides: "seg32_smokes.sql (b/c/d/e assertions) + RED harness that funil_kpis + rh_le_historico greens"
  - phase: 24 (M4)
    provides: "WR-04 vaga-scoped RLS predicate (redacao_rh_select) — the join form copied here; the P24-deferred rh_le_historico sweep"
  - phase: 26 (M4)
    provides: "get_avaliacao_status — the DEFINER/jsonb/REVOKE-GRANT header discipline cloned here"
provides:
  - "funil_kpis(p_vaga_id uuid DEFAULT NULL) RETURNS jsonb — SECURITY DEFINER, search_path='', PII-safe aggregates (median via LEAD/percentile_cont, raw stage->stage conversion, current volume by etapa_atual), vaga-scoped internally (admin bypass, p_vaga_id narrow), REVOKE PUBLIC + GRANT authenticated"
  - "rh_le_historico hardened to the WR-04 vaga-scoped predicate (the P24-deferred sweep) — closes the second live role-only horizontal leak on the audit trail"
affects: [32-04 (applies + reconciles + runs seg32_smokes.sql), 34 (KPI dashboard + historico feed consume funil_kpis), 33 (WR-04 join precedent for agendamentos_entrevista RLS)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER jsonb reader with internal owner-scope (get_avaliacao_status clone) as the only privileged aggregate channel"
    - "Median-time-per-stage via LEAD window CTE + percentile_cont(0.5), excluding NULL in-progress deltas (Pitfall 5)"
    - "WR-04 vaga-scoped RLS join predicate for a table with no direct vaga_id (candidatura_id -> candidaturas -> vagas.created_by)"

key-files:
  created:
    - supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql
  modified: []

key-decisions:
  - "funil_kpis is PII-safe by construction — CTEs project only candidatura_id/etapa_*/criado_em/vaga_id, never the transition-author column, never any candidatos column"
  - "volume_by_stage reflects the CURRENT candidaturas.etapa_atual distribution (Assumption A1), not cumulative stage entries"
  - "Both Part 1 (RPC) + Part 2 (policy) live in one migration file; authored-not-applied (32-04 applies via MCP apply_migration + reconciles schema_migrations)"

patterns-established:
  - "Pattern: compose two shipped-pattern copies (DEFINER jsonb header + WR-04 join predicate) in a single SEG migration"
  - "Pattern: verify greps as PII tripwire (no .ator on code lines) + policy-integrity guard (no candidate-policy touch, no write policy)"

requirements-completed: [SEG-02]

# Metrics
duration: 8min
completed: 2026-07-15
---

# Phase 32 Plan 03: funil_kpis DEFINER RPC + rh_le_historico WR-04 Hardening Summary

**Authored Migration B — the `funil_kpis` SECURITY DEFINER RPC (PII-safe median/conversion/volume jsonb, vaga-scoped by construction) plus the WR-04 hardening of the P24-deferred role-only `rh_le_historico` policy — closing the second live horizontal leak (SEG-02) at the authoring layer.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-15T05:00Z (approx)
- **Completed:** 2026-07-15
- **Tasks:** 2 (both author the single composed migration artifact)
- **Files modified:** 1 created

## Accomplishments

- `funil_kpis(p_vaga_id uuid DEFAULT NULL) RETURNS jsonb` authored — `LANGUAGE plpgsql SECURITY DEFINER SET search_path=''`, every object schema-qualified (`public.`/`auth.`); internal scope `WHERE (v_is_admin OR v.created_by = v_uid) AND (p_vaga_id IS NULL OR v.id = p_vaga_id)`; `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO authenticated`.
- Three PII-free aggregates via CTEs: (1) median-time-per-stage — `LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) − criado_em` deltas → `percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM dwell))` over NON-NULL deltas (excludes each candidatura's in-progress last transition — Pitfall 5); (2) raw stage→stage conversion counts (`WHERE etapa_de IS NOT NULL GROUP BY etapa_de, etapa_para`; K4 cohort refinement deferred to P34); (3) current volume by `etapa_atual`. Assembled with `COALESCE(…, '{}'::jsonb / '[]'::jsonb)` guards.
- `rh_le_historico` DROP+CREATEd with the WR-04 vaga-scoped predicate copied verbatim from `redacao_rh_select` (admin bypass OR `rh AND candidatura_id IN (SELECT c.id FROM public.candidaturas c JOIN public.vagas v ON v.id=c.vaga_id WHERE v.created_by=(select auth.uid()))`). The candidate own-row historico read policy is left untouched; no write policy added.

## Task Commits

Both tasks author the two composed parts of a single migration file (`files_modified` lists exactly one artifact), so they committed as one atomic unit for that file:

1. **Task 1: funil_kpis SECURITY DEFINER RPC** + **Task 2: rh_le_historico WR-04 hardening** — `941d8e5` (feat)

**Plan metadata:** (this SUMMARY + STATE + ROADMAP) — see final docs commit

## Files Created/Modified

- `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql` (created) — Part 1: `funil_kpis` DEFINER RPC (PII-safe jsonb aggregates); Part 2: `rh_le_historico` WR-04 vaga-scoped hardening. No BEGIN/COMMIT wrapper (D-22). Authored only — applied via MCP in 32-04.

## Decisions Made

- **PII-safe by construction:** the aggregation CTEs select only `candidatura_id / etapa_de / etapa_para / criado_em / vaga_id` — never the transition-author column, never any `candidatos` column. The verify grep enforces no `.ator` projection on any code line.
- **`volume_by_stage` = current `etapa_atual` distribution** (Assumption A1), not cumulative entries per stage — a jsonb-shape choice the P34 dashboard consumes flexibly.
- **Single migration file for both parts:** the RPC does not depend on the policy (DEFINER bypasses row RLS) — they are belt-and-suspenders composed in one artifact, matching the plan's `files_modified`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks author the two composed parts of the single migration file specified in `files_modified`; no auto-fixes, no blocking issues, no architectural changes.

## Issues Encountered

None. The comment prose was phrased to avoid the substrings the verify greps forbid on the whole file (`insert` case-insensitive; the literal candidate-policy name) and to keep `.ator` off all code lines (PII tripwire) — all four Task 1 + Task 2 greps PASS.

## User Setup Required

None - no external service configuration required. The migration is authored-not-applied; 32-04 (BLOCKING, non-autonomous) applies it via Supabase MCP `apply_migration`, reconciles `supabase_migrations.schema_migrations`, regenerates `database.types.ts` (repo ROOT), and runs `seg32_smokes.sql` (the load-bearing gate).

## Next Phase Readiness

- SEG-02 primitive authored and structurally verified (all Task 1/Task 2 greps PASS; tsc baseline held at 104 — no TS touched).
- `seg32_smokes.sql` (b)/(c)/(d)/(e) stays RED until 32-04 applies this migration + Migration A + deploys the EF — the behavioral JWT-impersonated smoke is the authoritative acceptance gate (P24 precedent).
- 32-04 landmine (RESEARCH Pitfall 1): deploy `get-curriculo-url` FIRST → apply migrations (ordered) → drop the `curriculos` RH Storage branch → run smokes. Reconcile the migration ledger (MCP writes a timestamp version row ≠ filename) and regen `database.types.ts` after `funil_kpis` lands.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql`
- FOUND: `.planning/phases/32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer/32-03-SUMMARY.md`
- FOUND commit: `941d8e5`
- Task 1 verify greps: PASS (funil_kpis signature, SECURITY DEFINER, search_path='', percentile_cont, LEAD(criado_em), REVOKE/GRANT, no .ator projection)
- Task 2 verify greps: PASS (rh_le_historico DROP+CREATE, WR-04 join, candidate policy untouched, no write policy)
- tsc baseline: 104 (held — no TS touched)

---
*Phase: 32-fechar-os-dois-vazamentos-vivos-cv-signed-url-ef-kpi-definer*
*Completed: 2026-07-15*
