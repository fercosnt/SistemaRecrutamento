---
phase: 10-triagem-rh-com-ia-comparativo-etapa-2
plan: 02
subsystem: triagem-ia-schema
tags: [migrations, rls, pg_net, security-definer, trigger, rpc]
requires:
  - "candidaturas table (status, opcao_knockout_id) — Phase 8 20260608000001"
  - "vagas table (created_by owner column) — base schema"
  - "Vault secrets project_url + edge_invoke_key — Phase 9 P07"
  - "notify_cost_anomaly pg_net template — Phase 9 20260609000002"
provides:
  - "analise_candidato_vaga table (UNIQUE candidatura_id, score_match CHECK 0-100, RLS candidato-DENY)"
  - "comparativo_solicitado audit table (RF-09)"
  - "trg_candidatura_analise pg_net trigger (survivors only)"
  - "reprocessar_analise SECURITY DEFINER RPC (own-vaga guarded)"
affects:
  - "Plan 10-03 (analise EF — writes analise_candidato_vaga, validates Bearer)"
  - "Plan 10-04 [BLOCKING] (PROD apply + types regen)"
  - "Plan 10-05 (RH panel reprocess button → reprocessar_analise RPC)"
tech-stack:
  added: []
  patterns:
    - "pg_net dispatch via Vault Bearer (notify_cost_anomaly template)"
    - "RLS candidato-DENY by absence of policy (V8 PII)"
    - "SECURITY DEFINER own-vaga guard via vagas.created_by = auth.uid()"
key-files:
  created:
    - "supabase/migrations/20260610000001_analise_tables.sql"
    - "supabase/migrations/20260610000002_analise_trigger.sql"
    - "supabase/migrations/20260610000003_reprocessar_rpc.sql"
  modified: []
decisions:
  - "vagas owner column = created_by (FK to auth.users, nullable) — confirmed from database.types.ts:2720; used as the rh own-vaga guard target"
  - "RLS DENY for candidato implemented by ABSENCE of any candidato/anon policy + no INSERT/UPDATE/DELETE policy → service_role-only writes"
metrics:
  duration: "~12 min"
  completed: 2026-06-09
---

# Phase 10 Plan 02: Triagem IA Schema Migrations Summary

Three no-wrapper migrations authoring the Phase-10 analysis foundation: the `analise_candidato_vaga` (idempotent upsert row, candidato-DENY RLS) + `comparativo_solicitado` (RF-09 audit) tables, the survivor-only `trg_candidatura_analise` pg_net trigger, and the own-vaga-guarded `reprocessar_analise` SECURITY DEFINER RPC — all reusing the existing Vault secrets, ready for Plan 10-04 PROD apply.

## What Was Built

### Task 1 — analise_candidato_vaga + comparativo_solicitado tables + RLS (commit `d3f5ec7`)
- `analise_candidato_vaga`: `id` PK, `candidatura_id` NOT NULL FK ON DELETE CASCADE, `vaga_id`, `score_match int CHECK (0-100)` (nullable while pendente/falhou), `pontos_fortes/gaps/flags text[] DEFAULT '{}'`, `resumo_cv`, `resumo_respostas`, `status` (`pendente`/`sucesso`/`falhou`), `erro`, timestamps. `UNIQUE (candidatura_id)` for idempotent upsert (SMOKE-4). Index `(vaga_id, score_match DESC)`.
- `comparativo_solicitado`: `vaga_id`, `candidatura_ids uuid[]`, `ranking jsonb`, `latencia_ms`, `solicitado_por`, `created_at`. Index `(vaga_id, created_at DESC)`.
- RLS ENABLED on both. SELECT policy `rh_le_analise` / `rh_le_comparativo` restricted to `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')` (subselect form). NO candidato/anon policy → candidato denied. NO INSERT/UPDATE/DELETE policy → only service_role (EFs) write, bypassing RLS. COMMENTs document the candidato-DENY intent.

### Task 2 — trg_candidatura_analise() trigger + pg_net dispatch (commit `ac710be`)
- `trg_candidatura_analise()` RETURNS trigger, SECURITY DEFINER, SET search_path=''. Survivor guard: `IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN RETURN NEW; END IF;` — knockouts never analyzed (SMOKE-1).
- Reads `vault.decrypted_secrets` `project_url` + `edge_invoke_key`, graceful skip if NULL. `PERFORM net.http_post` → `/functions/v1/analise-candidato-individual` with `Authorization: Bearer <edge_invoke_key>` + body `{candidatura_id, vaga_id}`.
- `DROP TRIGGER IF EXISTS trg_candidaturas_analise` + `CREATE TRIGGER ... AFTER INSERT ON public.candidaturas FOR EACH ROW`. Reuses existing Vault secrets — no new secret.

### Task 3 — reprocessar_analise(p_candidatura_id) SECURITY DEFINER RPC (commit `72d9d5d`)
- Resolves `candidaturas.vaga_id` + `vagas.created_by` via a JOIN; RAISE `no_data_found` if candidatura missing.
- Role + own-vaga guard: `v_role := (select auth.jwt() #>> '{app_metadata,role}')`. If role NOT IN ('rh','administrador') → RAISE 'forbidden' (`insufficient_privilege`) — candidato/anon can never reprocess. If role='rh' AND `vagas.created_by IS DISTINCT FROM auth.uid()` → RAISE 'forbidden'. administrador bypasses ownership.
- Re-fires the SAME pg_net dispatch as the trigger (Vault read + graceful skip + http_post to the analise EF with body `{candidatura_id, vaga_id}`).
- `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` (NOT anon). COMMENT documents the guard.

## Key Decision: vagas owner column

The plan's `<interfaces>` left the exact vagas ownership column to be confirmed from the live schema. Confirmed from `database.types.ts:2720` (the regenerated root types) that the live column is `vagas.created_by` (FK to auth.users, nullable). The Task-3 own-vaga guard compares `vagas.created_by = auth.uid()`. No `responsavel_id`/`criado_por`/`recrutador_id` column exists — those were speculative names in the plan body.

## PROD Apply Deferred to Plan 10-04

Per the plan objective and `<critical_constraints>`, this plan AUTHORS the migration SQL files only. It does NOT run `supabase db push` or apply via Supabase MCP. **PROD apply + `database.types.ts` regeneration + the SMOKE-1..5 runbook execution are the [BLOCKING] job of Plan 10-04.** All three files are authored WITHOUT a BEGIN/COMMIT wrapper (D-22) so `db push --linked` can apply clean; if 42601 fires on the two PL/pgSQL files (trigger + RPC) at apply time, 10-04 uses the Supabase MCP `execute_sql` + version-reconcile workaround (Phase 6/7/8/9 precedent).

## Threat Model Coverage

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-10-04 (analise RLS info disclosure) | mitigate | DONE — no candidato policy; RH/admin SELECT only; service_role writes bypass RLS |
| T-10-05 (comparativo RLS info disclosure) | mitigate | DONE — same role-gated SELECT; no candidato policy |
| T-10-06 (trigger SECURITY DEFINER EoP) | accept | DONE — SET search_path='' + survivor guard; mirrors shipped notify_cost_anomaly |
| T-10-07 (pg_net Bearer spoofing) | mitigate | PARTIAL — trigger sends Vault edge_invoke_key; EF Bearer==service_role validation is Plan 10-03 |
| T-10-08 (reprocessar_analise EoP) | mitigate | DONE — role guard + rh own-vaga guard (created_by=auth.uid()); GRANT to authenticated only |
| T-10-SC (no package installs) | accept | DONE — migration-only; no npm surface |

## Deviations from Plan

None affecting behavior. One concretization (not a deviation): the plan deferred the exact vagas ownership column to live-schema confirmation; resolved to `created_by` from `database.types.ts`.

## Known Stubs

None. The migration files are complete; the analise row population + Bearer validation are the analise EF's responsibility (Plan 10-03), and PROD apply is Plan 10-04 by design.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260610000001_analise_tables.sql
- FOUND: supabase/migrations/20260610000002_analise_trigger.sql
- FOUND: supabase/migrations/20260610000003_reprocessar_rpc.sql
- FOUND commit: d3f5ec7 (Task 1)
- FOUND commit: ac710be (Task 2)
- FOUND commit: 72d9d5d (Task 3)
- All three verify-block greps returned OK (tables+UNIQUE+RLS no-wrapper; trigger survivor-guard+http_post+AFTER INSERT no-wrapper; RPC SECURITY DEFINER+GRANT+role-guard no-wrapper)
