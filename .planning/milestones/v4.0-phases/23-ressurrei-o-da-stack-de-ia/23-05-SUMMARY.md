# Plan 23-05 SUMMARY — bigfive_devolutiva enum+seed + cost trigger + ai_call_logs.prompt_version (PROD landing)

**Plan:** 23-05 (Wave 3, [BLOCKING] non-autonomous — PROD via Supabase MCP)
**Status:** applied to PROD (authorized by Fernando via AskUserQuestion) + verified by SQL smokes
**Duration:** orchestrator-executed (checkpoint-type plan)

## What landed in PROD (3 migrations via `mcp__supabase__apply_migration`)

| Migration | Ledger version | Effect |
|-----------|----------------|--------|
| `bigfive_devolutiva_enum` | 20260706010519 | `ALTER TYPE llm_call_type ADD VALUE IF NOT EXISTS 'bigfive_devolutiva'` — **no-op** (see finding 1) but recorded for the ledger/rebuild (DBMIG-01) |
| `bigfive_devolutiva_seed` | 20260706010544 | INSERT bigfive_devolutiva prompt_versions row (real template 08, is_active=true, semver 1.0.0, sentinel content_hash) |
| `cost_guardrail_fix` | 20260706010602 | `ALTER TABLE ai_call_logs ADD COLUMN prompt_version text` + `CREATE OR REPLACE notify_cost_anomaly` (RAISE WARNING) |

## SQL smokes (PROD evidence)
- `SELECT 'bigfive_devolutiva'::public.llm_call_type` → accepts (no 22P02).
- `prompt_versions WHERE call_type='bigfive_devolutiva'` → 1 row, **is_active=true**, semver 1.0.0, system_template = real template 08 ("Você é um redator corporativo especializ…").
- `information_schema.columns` → `ai_call_logs.prompt_version` (text) now **exists**.
- `pg_proc notify_cost_anomaly` → `has_raise_warning=true`, `has_candidate_branch=false` (see finding 3).

## Task 1 PROD-state findings (the gate queries)
1. **The enum ALREADY contained `bigfive_devolutiva`** in PROD (8 labels) — PROD drifted ahead of the base migration 20260609000001 (7 labels). The `ADD VALUE` was a no-op; the file exists for the ledger/clean-rebuild (DBMIG-01/Phase-27). This is itself a DBMIG-01 data point (migrations don't reconstruct PROD).
2. **The 3 "uncertain" call_types were already active** — `culture_fit_essay`, `transcript_analysis`, `interview_guide` are all `is_active=true` in PROD (Open-Q1 resolved; no activation UPDATE needed). All 6 non-bigfive real call_types are active. `cv_summary` is inactive (orphan, unused — left as-is).
3. **ROOT-CAUSE: `ai_call_logs` had 0 rows in PROD.** The audit-logger has inserted a `prompt_version` field since Phase 9 (commit 4f8dd9e) but the column was never declared; `logAiCall` swallows the insert error (console.error only) → **all AI-call audit logging has silently failed since Phase 9**. This also starved the cost data AI-06 + the 23-03 kill-switch depend on (both sum `ai_call_logs.cost_usd`). Migration C's column-add is a root-cause fix that unblocks logging + cost tracking end-to-end. (Open-Q3 resolved: the column was missing, now added.)

## Deviations
- **candidate_cost_over_1 NOT emitted from the trigger (honest data-model limitation).** `ai_cost_daily` aggregates per (vaga_id, date, call_type, provider) — it has **no candidate dimension**, so a per-candidate/$1 threshold isn't derivable at this trigger (a $1 threshold on a per-vaga aggregate would be meaningless/spammy). The **correct** real-time per-vaga cost guardrail is the 23-03 pre-call kill-switch (`ai-client.ts`), which refuses the provider call before spend with the right scope/window/channel. The cost-alerter's `candidate_cost_over_1` message branch (23-03) remains available for a future correct per-candidate emitter (M5). AI-06's substance (working guardrail + not-silent) is met via the kill-switch + the RAISE WARNING; the misdesigned dead trigger-channel is documented, not force-emitted wrongly.
- **Seed content_hash is the sentinel convention, not the canonical sync-prompts hash.** A future `sync-prompts` run (Phase-27/CI-15) recomputes template 08's canonical hash; the sentinel differs → RF-PL-11 would throw. Reconcile in Phase 27 (update the row's hash or bump semver). Documented inline in the seed migration.
- **Ledger convergence deferred to Phase 27 (DBMIG-01).** MCP `apply_migration` records its own version timestamps (not the local filename); I renamed the 3 local files to match the recorded ledger versions to minimize new drift, but full `supabase db push --linked` convergence (including pre-existing M2 drift) is DBMIG-01's job.

## Handoff to Wave 4 (23-06)
- The 3 migrations are live, but **the 7 AI EFs still run the OLD bundle** (with the Phase-9 stub + no prompt_version-aware logging) until redeployed. AI-01/AI-04/AI-06 go fully live after 23-06. `gerar-devolutiva-bigfive` will resolve the real prompt once redeployed (the row exists now).
- REQUIREMENTS: AI-01/AI-06 left **Pending** until 23-06 redeploy makes them live in PROD.
