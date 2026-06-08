-- =============================================================================
-- Migration: AI Prompt Library — pg_cron jobs (cost aggregation + retention purge)
-- Date: 2026-06-09
-- Phase: 09 (ai-prompt-library-cost-infra)
-- Requirements: IA-02 (retention), IA-03/IA-04 (cost aggregation)
-- DEPENDS ON: 20260609000001 (schema — ai_call_logs, ai_cost_daily, candidate_ai_decisions)
-- AUTHORED BUT NOT APPLIED — apply is the [BLOCKING] human task in Plan 09-07.
-- =============================================================================
--
-- PURPOSE
-- Registers EXACTLY TWO pg_cron jobs:
--   (1) 'ai-cost-aggregation' @ 01:30 — rolls yesterday's ai_call_logs into ai_cost_daily
--       (grouped by date/vaga_id/call_type/provider, ON CONFLICT DO UPDATE — AUDITORIA §7.3).
--       Runs 30 min BEFORE the purge so cost history survives the retention cleanup.
--   (2) 'ai-logs-retention-cleanup' @ 02:00 — deletes ai_call_logs past retain_until,
--       EXCEPT logs referenced by a review-pending decision (AUDITORIA §7.2 / LGPD Art.15).
--
-- DESCOPE (orchestrator-decision #5):
-- - The HITL SLA cron ('human-review-sla-check', AUDITORIA §6.3) is OUT OF SCOPE this phase —
--   it joins non-existent English tables (recruiters/jobs) and HITL SLA is a Phase 10+ concern.
-- - The Art.18 delete_candidate_data() function (AUDITORIA §7.4) is deferred to Phase 15.
-- Neither is authored here.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the cron.schedule
-- `$$ ... $$` job bodies breaks the prepared-statement boundary parser and raises SQLSTATE 42601
-- at push time (CLAUDE.md §Commands / D-22). If `supabase db push` fails with 42601, apply via the
-- D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260609000003`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) Cost aggregation — 01:30 daily (BEFORE the purge so history survives)
-- AUDITORIA §7.3. Groups yesterday's logs and upserts ai_cost_daily.
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
  'ai-cost-aggregation',
  '30 1 * * *',
  $$
    INSERT INTO public.ai_cost_daily (
      date, vaga_id, call_type, provider,
      call_count, total_input_tokens, total_output_tokens, total_cost_usd, error_count
    )
    SELECT
      DATE(created_at),
      vaga_id,
      call_type,
      provider,
      COUNT(*),
      COALESCE(SUM(input_token_count), 0),
      COALESCE(SUM(output_token_count), 0),
      COALESCE(SUM(cost_usd), 0),
      SUM(CASE WHEN success = false THEN 1 ELSE 0 END)
    FROM public.ai_call_logs
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(created_at), vaga_id, call_type, provider
    ON CONFLICT (date, vaga_id, call_type, provider) DO UPDATE SET
      call_count          = EXCLUDED.call_count,
      total_input_tokens  = EXCLUDED.total_input_tokens,
      total_output_tokens = EXCLUDED.total_output_tokens,
      total_cost_usd      = EXCLUDED.total_cost_usd,
      error_count         = EXCLUDED.error_count;
  $$
);

-- -----------------------------------------------------------------------------
-- (2) Retention purge — 02:00 daily. Preserves logs tied to a review-pending decision.
-- AUDITORIA §7.2 / LGPD Art.15.
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
  'ai-logs-retention-cleanup',
  '0 2 * * *',
  $$
    DELETE FROM public.ai_call_logs
    WHERE retain_until < now()
      AND id NOT IN (
        SELECT unnest(ai_call_log_ids)
        FROM public.candidate_ai_decisions
        WHERE status IN ('candidate_review_requested', 'human_reviewing')
      );
  $$
);
