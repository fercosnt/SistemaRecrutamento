-- =============================================================================
-- Migration: AI Prompt Library — RPCs + triggers (immutability, promote/rollback, cost-anomaly)
-- Date: 2026-06-09
-- Phase: 09 (ai-prompt-library-cost-infra)
-- Requirements: IA-01, IA-04
-- DEPENDS ON: 20260609000001 (schema — tables + enums)
-- AUTHORED BUT NOT APPLIED — apply is the [BLOCKING] human task in Plan 09-07.
-- =============================================================================
--
-- PURPOSE
-- The state-changing layer for the prompt library:
--   (1) prevent_published_prompt_edit() — BEFORE-UPDATE immutability trigger (RF-PL-04).
--   (2) promote_to_canary / promote_canary_to_active / rollback_to_version — the 3
--       admin-only SECURITY DEFINER RPCs (RF-PL-08/09/10) that manage canary/active state.
--   (3) notify_cost_anomaly() — AFTER INSERT/UPDATE trigger on ai_cost_daily that fires
--       net.http_post to the cost-alerter EF when PRD thresholds are violated (IA-04, Pattern 3).
--
-- AUTHORIZATION
-- RLS does NOT apply inside a SECURITY DEFINER body, so the 3 promote/rollback RPCs check the
-- role IN-BODY: (auth.jwt() #>> '{app_metadata,role}') NOT IN ('administrador') -> RAISE 42501.
-- Each RPC: REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated (called from the
-- authenticated admin client, NOT service_role). The PRD's `GRANT ... TO admin` is WRONG for
-- this project — there is no 'admin' role; the live JWT claim is 'administrador'
-- (RESEARCH Pattern 4). Domain errors use errcode 'P0001'; literal % is escaped as %%.
--
-- VAULT (human-gated, Plan 07): notify_cost_anomaly reads two Vault secrets that are created
-- MANUALLY before this trigger can dispatch:
--   select vault.create_secret('https://isljnozzlvckrgjjbjwp.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_jwt>', 'edge_invoke_key');
-- Until those exist the http_post is skipped (graceful — no row is blocked).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the `$$ ... $$`
-- PL/pgSQL bodies + adjacent COMMENT/REVOKE/GRANT breaks the prepared-statement boundary parser
-- and raises SQLSTATE 42601 at push time (CLAUDE.md §Commands / D-22). If `supabase db push`
-- fails with 42601, apply via the D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260609000002`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) Immutability trigger (RF-PL-04 / Pitfall 5)
-- Blocks edits to template/hash/semver once deployed, but ALLOWS state-column changes
-- (is_active/is_canary/canary_pct/deprecated_at) so the promote/rollback RPCs work.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_published_prompt_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.deployed_at IS NOT NULL THEN
    IF OLD.system_template IS DISTINCT FROM NEW.system_template
       OR OLD.user_template  IS DISTINCT FROM NEW.user_template
       OR OLD.content_hash   IS DISTINCT FROM NEW.content_hash
       OR OLD.semver         IS DISTINCT FROM NEW.semver THEN
      RAISE EXCEPTION
        'Prompt version % already deployed (deployed_at=%) — content is immutable. Create a new version.',
        OLD.semver, OLD.deployed_at
        USING errcode = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prompt_versions_immutable ON public.prompt_versions;
CREATE TRIGGER trg_prompt_versions_immutable
  BEFORE UPDATE ON public.prompt_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_prompt_edit();

COMMENT ON FUNCTION public.prevent_published_prompt_edit() IS
  'Phase 9 / RF-PL-04: BEFORE-UPDATE immutability guard. Once deployed_at IS NOT NULL, blocks any '
  'change to system_template/user_template/content_hash/semver. State columns (is_active/is_canary/'
  'canary_pct/deprecated_at) remain editable so promote/rollback RPCs function (Pitfall 5).';

-- -----------------------------------------------------------------------------
-- (2a) promote_to_canary (RF-PL-08)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_to_canary(
  p_call_type   public.llm_call_type,
  p_semver      text,
  p_canary_pct  int DEFAULT 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_id   uuid;
BEGIN
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF p_canary_pct < 1 OR p_canary_pct > 50 THEN
    RAISE EXCEPTION 'canary_pct precisa estar entre 1 e 50 (recebido: %).', p_canary_pct
      USING errcode = 'P0001';
  END IF;

  UPDATE public.prompt_versions
     SET is_canary = true,
         canary_pct = p_canary_pct,
         deployed_at = COALESCE(deployed_at, now())
   WHERE call_type = p_call_type
     AND semver = p_semver
     AND deprecated_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Versao % para call_type % nao encontrada ou ja depreciada.', p_semver, p_call_type
      USING errcode = 'P0001';
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.promote_to_canary(public.llm_call_type, text, int) IS
  'Phase 9 / RF-PL-08: admin-only canary promotion. Sets is_canary=true, canary_pct (1..50), '
  'deployed_at. RLS does not apply in DEFINER body — role checked in-body (administrador only).';
REVOKE ALL ON FUNCTION public.promote_to_canary(public.llm_call_type, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_to_canary(public.llm_call_type, text, int) TO authenticated;

-- -----------------------------------------------------------------------------
-- (2b) promote_canary_to_active (RF-PL-09)
-- Deactivate current active FIRST, then activate target — order matters for the
-- unique_active_per_type EXCLUDE constraint (Pitfall 5). Single migration txn.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_canary_to_active(
  p_call_type public.llm_call_type,
  p_semver    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role   text;
  v_old_id uuid;
  v_new_id uuid;
BEGIN
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Deactivate the current active version (if any) BEFORE activating the target.
  SELECT id INTO v_old_id
    FROM public.prompt_versions
   WHERE call_type = p_call_type AND is_active = true AND is_canary = false;
  IF v_old_id IS NOT NULL THEN
    UPDATE public.prompt_versions
       SET is_active = false, deprecated_at = now()
     WHERE id = v_old_id;
  END IF;

  -- Activate the target version.
  UPDATE public.prompt_versions
     SET is_active = true, is_canary = false, canary_pct = 0
   WHERE call_type = p_call_type AND semver = p_semver
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'Versao % para call_type % nao encontrada.', p_semver, p_call_type
      USING errcode = 'P0001';
  END IF;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.promote_canary_to_active(public.llm_call_type, text) IS
  'Phase 9 / RF-PL-09: admin-only canary->active promotion. Deactivates current active '
  '(is_active=false, deprecated_at=now) THEN activates target — order required by the '
  'unique_active_per_type EXCLUDE constraint (Pitfall 5). administrador only (in-body check).';
REVOKE ALL ON FUNCTION public.promote_canary_to_active(public.llm_call_type, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_canary_to_active(public.llm_call_type, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- (2c) rollback_to_version (RF-PL-10)
-- Target must exist and be deprecated within the last year. Writes a data_deletion_log
-- audit row. Deactivate current active, reactivate target.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollback_to_version(
  p_call_type public.llm_call_type,
  p_semver    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role      text;
  v_target_id uuid;
BEGIN
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Validate target exists and was deprecated less than 1 year ago.
  SELECT id INTO v_target_id
    FROM public.prompt_versions
   WHERE call_type = p_call_type
     AND semver = p_semver
     AND deprecated_at > now() - INTERVAL '1 year';
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Nao e possivel reverter para %: nao encontrada ou depreciada ha mais de 1 ano.', p_semver
      USING errcode = 'P0001';
  END IF;

  -- Deactivate the current active version (deactivate-then-reactivate — Pitfall 5).
  UPDATE public.prompt_versions
     SET is_active = false, deprecated_at = now()
   WHERE call_type = p_call_type AND is_active = true;

  -- Reactivate the target.
  UPDATE public.prompt_versions
     SET is_active = true, deprecated_at = NULL
   WHERE id = v_target_id;

  -- Audit trail (no candidate ID — compliance).
  INSERT INTO public.data_deletion_log (deletion_type, deleted_at)
  VALUES ('prompt_rollback:' || p_call_type::text || ':' || p_semver, now());

  RETURN v_target_id;
END;
$$;

COMMENT ON FUNCTION public.rollback_to_version(public.llm_call_type, text) IS
  'Phase 9 / RF-PL-10: admin-only emergency rollback. Target must exist and be deprecated <1y. '
  'Deactivates current active, reactivates target (deprecated_at=NULL), writes a data_deletion_log '
  'audit row. administrador only (in-body check).';
REVOKE ALL ON FUNCTION public.rollback_to_version(public.llm_call_type, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_to_version(public.llm_call_type, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- (3) Cost-anomaly trigger (IA-04 / Pattern 3)
-- AFTER INSERT OR UPDATE ON ai_cost_daily: evaluate PRD thresholds against NEW;
-- if a threshold is violated AND no same-(threshold_violated, vaga_id, day) alert
-- already exists (dedup — Pitfall 7), fire net.http_post to the cost-alerter EF.
-- Vault secrets project_url + edge_invoke_key are human-gated (Plan 07); if absent
-- the dispatch is skipped gracefully (the row is never blocked).
-- -----------------------------------------------------------------------------
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
  -- Evaluate PRD thresholds against the NEW aggregated row.
  -- (a) per-vaga monthly cost > R$200 (proxied here as the daily aggregate cost in USD;
  --     the cost-alerter EF refines against the 30-day window).
  -- (b) error rate within the day's calls > threshold (warn band).
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

  -- Read Vault secrets (human-gated — Plan 07). If absent, skip dispatch gracefully.
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- secrets not set yet — cost-alerter dispatch deferred (no row blocked)
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
  'Phase 9 / IA-04 (Pattern 3): AFTER INSERT/UPDATE on ai_cost_daily. Detects PRD threshold '
  'violations (vaga cost, error rate), dedups per (threshold_violated, vaga_id, day) (Pitfall 7), '
  'and fires net.http_post to the cost-alerter EF using Vault Bearer (project_url + edge_invoke_key). '
  'Vault secrets are human-gated (Plan 07); dispatch is skipped gracefully until they exist.';
