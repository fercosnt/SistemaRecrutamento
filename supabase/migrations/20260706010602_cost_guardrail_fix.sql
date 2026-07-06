-- Phase 23 / AI-06 + Open-Q3 — two fixes.
--
-- (1) ai_call_logs.prompt_version column [ROOT-CAUSE, critical].
--     `_shared/audit-logger.ts` has inserted `prompt_version` (text) into ai_call_logs since
--     Phase 9 (commit 4f8dd9e), but the column was never declared in any migration. logAiCall
--     SWALLOWS the resulting insert error (console.error only). Net effect verified in PROD:
--     ai_call_logs had 0 rows — ALL AI-call audit logging silently failed. This also starves the
--     cost data the AI-06 guardrails + the 23-03 pre-call kill-switch depend on (they sum
--     ai_call_logs.cost_usd). Adding the column unblocks logging end-to-end.
--
-- (2) notify_cost_anomaly: RAISE WARNING instead of a silent RETURN NEW when Vault secrets are
--     absent (Repudiation T-23-05-02) — a skipped dispatch must be observable, not mute.
--
-- SCOPE NOTE (candidate_cost_over_1): the plan asked this trigger to also emit the
-- `candidate_cost_over_1` alert. ai_cost_daily aggregates per (vaga_id, date, call_type, provider)
-- and has NO candidate dimension, so a per-candidate/$1 threshold is not derivable here (a $1
-- threshold on a per-vaga aggregate would be meaningless and spammy). The CORRECT real-time
-- per-vaga cost guardrail is the 23-03 pre-call kill-switch in _shared/ai-client.ts (refuses the
-- provider call before spend, correct scope/window/channel). The cost-alerter's candidate_cost_over_1
-- message branch (23-03) remains available for a future correct per-candidate emitter (M5). This
-- trigger keeps its vaga_cost_over_200 + error_rate channels; the AI-06 "not-silent" fix is the
-- RAISE WARNING below.

ALTER TABLE public.ai_call_logs ADD COLUMN IF NOT EXISTS prompt_version text;

CREATE OR REPLACE FUNCTION public.notify_cost_anomaly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_alert      text;
  v_value      numeric;
  v_threshold  numeric;
  v_project_url text;
  v_invoke_key  text;
  v_exists      boolean;
BEGIN
  IF NEW.total_cost_usd > 200 THEN
    v_alert := 'vaga_cost_over_200';
    v_value := NEW.total_cost_usd;
    v_threshold := 200;
  ELSIF NEW.call_count > 0
        AND (NEW.error_count::numeric / NEW.call_count::numeric) > 0.05 THEN
    v_alert := 'error_rate';
    v_value := round((NEW.error_count::numeric / NEW.call_count::numeric) * 100, 2);
    v_threshold := 5;
  ELSE
    v_alert := NULL;
  END IF;

  IF v_alert IS NULL THEN
    RETURN NEW;
  END IF;

  -- Dedup (Pitfall 7): skip if a same-(threshold_violated, vaga_id, day) alert already exists.
  SELECT EXISTS (
    SELECT 1 FROM public.recruiter_alerts
     WHERE threshold_violated = v_alert
       AND vaga_id IS NOT DISTINCT FROM NEW.vaga_id
       AND created_at::date = NEW.date
  ) INTO v_exists;
  IF v_exists THEN
    RETURN NEW;
  END IF;

  -- Read Vault secrets (human-gated — Plan 07). If absent, WARN (do not skip silently — AI-06).
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RAISE WARNING 'notify_cost_anomaly: Vault secret ausente (project_url/edge_invoke_key) — dispatch do alerta % pulado (vaga=%, date=%)', v_alert, NEW.vaga_id, NEW.date;
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/cost-alerter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object(
      'alert_type', v_alert,
      'vaga_id', NEW.vaga_id,
      'date', NEW.date,
      'value', v_value,
      'threshold', v_threshold
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_cost_daily_anomaly ON public.ai_cost_daily;
CREATE TRIGGER trg_ai_cost_daily_anomaly
  AFTER INSERT OR UPDATE ON public.ai_cost_daily
  FOR EACH ROW EXECUTE FUNCTION public.notify_cost_anomaly();

COMMENT ON FUNCTION public.notify_cost_anomaly() IS
  'Phase 9 / IA-04 + Phase 23 / AI-06: AFTER INSERT/UPDATE on ai_cost_daily. Detects PRD threshold '
  'violations (vaga cost, error rate), dedups per (threshold_violated, vaga_id, day), and fires '
  'net.http_post to the cost-alerter EF using Vault Bearer. Phase 23: RAISE WARNING (not silent '
  'RETURN NEW) when Vault secrets are absent. Per-candidate cost lives in the 23-03 pre-call '
  'kill-switch (ai-client.ts), not this per-vaga trigger.';
