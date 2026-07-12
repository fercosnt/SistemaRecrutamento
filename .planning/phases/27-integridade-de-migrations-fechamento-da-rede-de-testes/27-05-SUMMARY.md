---
phase: 27
plan: "05"
wave: 3
status: complete_with_deferred
requirements: [DBMIG-01, DBMIG-02, CI-03]
autonomous: false
completed: 2026-07-12
---

# 27-05 SUMMARY — [BLOCKING] DB integrity wave (DBMIG-01/02, CI-03)

Executed orchestrator-led (MCP `apply_migration`/`execute_sql`/`generate_typescript_types`) with Fernando's PROD-write authorization. Mirrors the 24-08/25-07/26-07 BLOCKING precedent.

## Done + verified live on PROD

### DBMIG-02 (auto_rejeitado semantics) + CI-03 (submit-candidatura knockout) ✅
- **PRE-APPLY REGRESSION CATCH.** The 27-04 trigger migration `20260712110001` was authored from the Phase-6 body (`20260607000005`) and therefore DROPPED the **Phase-14 ENTREV-03 flag guard** (`v_blocked` + the `entrevista_analises.bloqueio_avanco`/`revisao_confirmada_em` hold on advancing past `entrevista_online`) that the CURRENT live function carries (from `20260624000004`). Applying it as-authored would have silently reverted a live bias-review control. Verified the live body via `pg_get_functiondef`, **rewrote the migration** to reproduce the current body (flag guard preserved) changing ONLY the `auto_rejeitado` value, and applied that. Post-apply catalog check confirmed the live function has both the flag guard AND the new predicate.
- New predicate: `auto_rejeitado = (v_ator IS NULL AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on' AND NEW.etapa_atual = 'rejeitado')` — system-write AND sanctioned AND terminal only. RNF-07a preserved (no new auto-reject path; knockout remains the only sanctioned auto-reject).
- **Backfill** applied: 5 mismarked survivor rows (all `etapa_para <> 'rejeitado'`) → `auto_rejeitado=false`; 0 genuine terminal rejects touched.
- **CI-03 live smoke PASS** (disposable fixture, MCP `execute_sql`): (1) knockout → `rejeitado/inscricao/knockout_automatico` + exactly 1 history row `auto_rejeitado=true, ator NULL`; (2) **survivor advance → `aguardando_resposta/triagem` + `auto_rejeitado=false` (DBMIG-02 proven live)**; (3) dedup → 23505. Fixture tuned to live schema (bloco `geral`→`valores` per `bloco_valido_check`; added `opcoes_resposta` per `opcoes_obrigatorias_check`, D-13) and the committed smoke file updated to match.
- `database.types.ts` regenerated at repo root — picked up the Phase-26 `get_avaliacao_status` RPC that was missing from the committed types; DBMIG-02 adds no columns. tsc flat **104**.

### DBMIG-01 ledger convergence ✅ (the hard half)
- **Diagnosed the drift:** 73 remote `schema_migrations` rows ↔ 73 local files, bijective — **0 orphan rows, 0 missing**, 42 rows carrying MCP-apply timestamps (Phases 10-15 + 24-26) instead of their filename timestamp (e.g. `20260709185825` → `20260706110001`/`sec01_cognitivo_gabarito`).
- **Reconciled** all 42 via a single data-driven `UPDATE` (VALUES map of the 73 files; matched by embedded-timestamp-in-name OR slug; no target collision since targets were fresh). **Verified convergence:** all 73 rows now match a local file EXACTLY on version AND name; 0 drift timestamps remain; `remote_versions_not_in_local=0`, `local_ts_not_in_remote=0`. This is the `db push --linked` "up to date" condition (version-set equality) — CLI `db push` itself not run (no `SUPABASE_ACCESS_TOKEN` in this session).
- **No only-in-PROD tracked objects** proven by the ledger bijection (0 orphans).

## Deferred (environment-gated — routed by Fernando 2026-07-12)

- **DBMIG-01 baseline fill + clean-room from-zero rebuild proof.** `20260419000000_baseline.sql` is still a no-op (documented header added, no real base-schema DDL). Filling it correctly needs the iterative from-empty rebuild loop (local `supabase db reset` seed-disabled, or a Pro preview branch + `db push`) — replay baseline+72 migrations onto a clean Postgres, add each missing base object until the replay is clean, then catalog-diff vs PROD == empty. `supabase db dump` works (authenticated) but needs Docker + a full-vs-base subtraction, and an unverified baseline is worse than a clean deferral. Tracked in `27-HUMAN-UAT.md`. The ledger bijection is strong standing evidence that the tracked object set is complete.

## Files
- `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` (rewritten — flag guard preserved) — committed `5456722`
- `supabase/tests/submit_candidatura_atomic_smokes.sql` (fixture tuned to live schema) — `5456722`
- `database.types.ts` (regen) — `5456722`
- `supabase/migrations/20260419000000_baseline.sql` (documented deferral header)
- Live PROD: DBMIG-02 trigger+backfill applied; ledger reconciled (42 rows); smokes green (no residue — disposable fixture cleaned)

## Gates
tsc **104** (≤107) · Vitest 770/770 (unchanged) · Deno corpus 192/0 (unchanged) · CI-03 live smoke PASS · ledger 73/73 converged.
