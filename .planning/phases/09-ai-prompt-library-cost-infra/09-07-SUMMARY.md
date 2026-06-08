---
phase: 09-ai-prompt-library-cost-infra
plan: 07
status: complete
completed: 2026-06-08
requirements: [IA-02, IA-04]
human_pending:
  - "Vault secrets project_url + edge_invoke_key (cost-alerter pg_net auth)"
  - "supabase functions deploy cost-alerter --no-verify-jwt"
  - "RESEND_API_KEY (cost-alerter email) + ANTHROPIC_API_KEY/OPENAI_API_KEY (live ai-client smoke)"
  - "one-time manual is_active=true SQL per call_type"
---

# Plan 09-07 Summary — PROD apply + cost-alerter EF

## Outcome

The Phase-9 AI infra is **live in PROD**. Schema, RPCs, triggers, cron, and seed are applied; `database.types.ts` is regenerated at repo ROOT; the cost-alerter EF source is committed; all 7 SQL smokes PASS.

## Task 1 — cost-alerter EF source (commit `e3e539b`)
- `supabase/functions/cost-alerter/index.ts`: Bearer self-auth (Vault `edge_invoke_key`, 401 on mismatch) + dedup by `(threshold_violated, vaga_id, date)` + **unconditional** `recruiter_alerts` INSERT via service_role + best-effort Resend email with graceful degradation (logs-and-skips if `RESEND_API_KEY` absent — never crashes). Body shape matches `notify_cost_anomaly()`. INSERT@222 precedes RESEND@242.

## Task 2 — live apply (driven via Supabase MCP `execute_sql`, user-authorized)
Applied in order, each version row reconciled into `supabase_migrations.schema_migrations`:
- `20260609000001_prompt_library_schema` — 6 tables + 3 enums + RLS (administrador-read; recruiter_alerts also rh).
- `20260609000002_prompt_library_rpcs` — immutability trigger + 3 SECURITY DEFINER RPCs + cost-anomaly pg_net trigger.
- `20260609000003_prompt_library_cron` — 2 pg_cron jobs (aggregation 01:30, retention 02:00).
- `20260609000004_prompt_library_seed` — 7 prompt_versions v1.0.0, is_active=false.
- `database.types.ts` regenerated (commit `cc3eb5d`) — contains all 6 new tables.
- `supabase db push --linked` → **"Remote database is up to date"** (reconciliation confirmed).

### 7 SQL smokes — 7/7 PASS
| Smoke | Result |
|-------|--------|
| SMOKE-1 tables + RLS | ✅ 6 tables, RLS on, 1 SELECT policy each |
| SMOKE-2 enums | ✅ llm_call_type(7), llm_provider(3), candidate_status(10) |
| SMOKE-3 EXCLUDE unique_active_per_type | ✅ 2nd active+non-canary row rejected (23P01) |
| SMOKE-4 immutability trigger | ✅ template UPDATE blocked (P0001); state-column UPDATE allowed |
| SMOKE-5 RPC auth | ✅ candidato→42501 forbidden; administrador+pct=99→P0001 range msg |
| SMOKE-6 cost-anomaly trigger | ✅ over-threshold INSERT fired trigger, graceful skip (0 dispatched — Vault absent, no crash) |
| SMOKE-7 cron jobs | ✅ both active, schedules 30 1 * * * / 0 2 * * * |

## Human-pending (deferred to phase UAT — do NOT block downstream)
These need credentials/CLI not available autonomously; tracked as UAT items:
1. **Vault secrets:** `select vault.create_secret('https://isljnozzlvckrgjjbjwp.supabase.co','project_url');` + `select vault.create_secret('<service_role_jwt>','edge_invoke_key');` — until set, `notify_cost_anomaly` skips dispatch gracefully (SMOKE-6 confirmed the skip path).
2. **Deploy:** `supabase functions deploy cost-alerter --no-verify-jwt`.
3. **Secrets:** `RESEND_API_KEY` (email; row INSERT works without it) + `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` (live ai-client smoke).
4. **Activation:** one-time `UPDATE prompt_versions SET is_active=true WHERE call_type=... AND semver='1.0.0';` per call_type (orchestrator-decision #2).

## Known follow-up (flagged for phase verification)
- **content_hash duplication:** the seed (09-03) wrote 7 placeholder rows with sentinel hashes (`seed:<type>:1.0.0`); `sync-prompts.ts` (09-06) computes real SHA-256 hashes, so its `ON CONFLICT (content_hash) DO NOTHING` will ADD 7 real rows on first merge (not dedup) → transient 14 rows until the placeholders are superseded/removed. Acceptable per the seed migration comment; resolve when wiring the first real consumer (Phase 10).

## Gates
- 7/7 SQL smokes PASS · db push "up to date" · types contain 6 new tables · tsc baseline 293 (unchanged).
