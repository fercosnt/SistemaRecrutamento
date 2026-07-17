---
phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
plan: 01
status: complete
wave: 1
requirements: [KPI-01, KPI-02, KPI-03, KPI-04]
completed: 2026-07-16
gate: KPI-04 acceptance — 8/8 smoke PASS (a-h) in PROD
---

# 34-01 SUMMARY — funil_kpis v2 (+4 KPI-04 keys) + v_fila_trabalho — LIVE PROD

## What went live (migration `20260716000003`, applied via MCP, ledger reconciled)

- **`funil_kpis(uuid)` extended IN-PLACE to 7 keys.** Re-derived from the LIVE `pg_get_functiondef`
  output (DBMIG-02 belt — the git file was stale after 853cb03): the 3 existing keys
  (`median_time_per_stage`, `conversion_stage_to_stage`, `volume_by_stage`) + their CTEs preserved
  byte-for-byte; 4 new CTEs/keys appended, all reusing the same `(v_is_admin OR v.created_by=v_uid)
  AND (p_vaga_id…) AND deleted_at IS NULL` owner-scope: `time_to_hire` (median inscrição→aprovado
  seconds), `knockout_rate` {knockouts,total,taxa}, `drop_per_stage` (closed/exited-denominator,
  inscricao self-loop + terminals excluded), `no_show_rate` {no_shows,total,taxa} (0-agendamento →
  taxa=null CASE guard). SECURITY DEFINER + search_path='' + REVOKE/GRANT preserved; single-arg
  signature kept (v1 all-time cohort).
- **`v_fila_trabalho`** `security_invoker=true` view — cross-vaga work queue, `entrou_etapa_em =
  GREATEST(MAX(historico.criado_em), data_candidatura, created_at)`, terminals excluded, scope
  inherited from `rh_le_candidaturas` (no DEFINER laundering). GRANT SELECT to authenticated.
- `database.types.ts` regenerated (+217 lines, `v_fila_trabalho` row type + new RPC shape); tsc **104 = baseline**.

## Proof — SEG/KPI gate GREEN in PROD (8/8, zero SKIP)

`supabase/tests/funil34_kpis_smokes.sql` via MCP execute_sql (result-returning) — **a–h all PASS**:
(a) 3 existing keys preserved+non-empty · (b) 4 new keys present · (c) time_to_hire positive ·
(d) knockout_rate correct · (e) drop_per_stage closed-cohort + self-loop excluded ·
(f) no_show + 0-agendamento taxa=null · (g) vaga-scope + PII-free (recruiter A sees no vaga-B numbers;
no candidate-identity key in output) · (h) v_fila_trabalho isolation + entrou_etapa_em set.
This subsumes the seg32 (b/d/e) funil_kpis regression (a=keys-preserved, g=scope+PII-free).

## Fixture bug caught + fixed (live)
- First smoke run = all SKIP. Root cause: `candidaturas_candidato_vaga_unique_idx` (UNIQUE
  candidato_id+vaga_id) — the fixture put 4 candidaturas for one candidato on ONE vaga → 2nd insert
  23505 → fixture EXCEPTION → SKIP. Fixed: **4 distinct recruiter-B vagas** (b01–b04), one candidatura
  each. (MCP hides RAISE NOTICE/WARNING → surfaced the error by running the inserts without an
  exception handler so 23505 propagated as an MCP error.)

## Key files
- created: `supabase/migrations/20260716000003_funil_kpis_v2_and_v_fila_trabalho.sql` (applied)
- created: `supabase/tests/funil34_kpis_smokes.sql` (8 assertions, GREEN)
- modified: `database.types.ts` (regenerated)

## Self-Check: PASSED
