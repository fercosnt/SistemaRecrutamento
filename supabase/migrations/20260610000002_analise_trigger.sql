-- =============================================================================
-- Migration: Phase 10 analise dispatch trigger — trg_candidatura_analise (survivors only)
-- Date: 2026-06-10
-- Phase: 10 (triagem-rh-com-ia-comparativo-etapa-2)
-- Requirement: TRIAGEM-01 (async analysis dispatch)
-- =============================================================================
--
-- PURPOSE
--   AFTER INSERT on public.candidaturas, fire net.http_post to the analise-candidato-individual
--   Edge Function — but ONLY for knockout SURVIVORS. Knockouts (status='rejeitado' OR
--   opcao_knockout_id IS NOT NULL) must NEVER be analyzed (SMOKE-1).
--
--   This is a verbatim adaptation of the shipped notify_cost_anomaly() pg_net template
--   (20260609000002_prompt_library_rpcs.sql:249-327): SECURITY DEFINER + SET search_path='',
--   reads vault.decrypted_secrets project_url + edge_invoke_key (graceful skip if NULL — the row
--   is never blocked), PERFORM net.http_post with a Bearer-edge_invoke_key header.
--
--   Reuses the EXISTING Vault secrets project_url + edge_invoke_key (Phase 9 P07) — no new secret.
--   pg_net carries no user JWT; the EF (Plan 10-03) validates the Bearer == service_role.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLAUDE.md D-22). PROD apply is the separate [BLOCKING]
--   Plan 10-04 (if 42601 fires at apply, 10-04 uses Supabase MCP execute_sql + version reconcile).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_candidatura_analise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Survivor guard: knockouts are NEVER analyzed. A knockout is status='rejeitado' OR a matched
  -- knockout option (opcao_knockout_id IS NOT NULL). Survivors pass both.
  IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Read Vault secrets (Phase 9 P07). If absent, skip dispatch gracefully (no row blocked).
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- secrets not set yet — analise dispatch deferred (no row blocked)
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object(
      'candidatura_id', NEW.id,
      'vaga_id', NEW.vaga_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidaturas_analise ON public.candidaturas;
CREATE TRIGGER trg_candidaturas_analise
  AFTER INSERT ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.trg_candidatura_analise();

COMMENT ON FUNCTION public.trg_candidatura_analise() IS
  'Phase 10 / TRIAGEM-01: AFTER INSERT on candidaturas. Fires net.http_post to the '
  'analise-candidato-individual EF ONLY for knockout survivors (status<>''rejeitado'' AND '
  'opcao_knockout_id IS NULL). Knockouts are never analyzed. Reuses Vault project_url + '
  'edge_invoke_key (Phase 9 P07) with graceful skip when absent; mirrors the shipped '
  'notify_cost_anomaly() pg_net template. pg_net carries no user JWT — the EF validates the '
  'Bearer == service_role.';
