-- =============================================================================
-- Migration: SEC-03 — move the n8n webhook dispatch SERVER-SIDE (out of the bundle)
-- Date: 2026-07-06
-- Phase: 24 (blindagem-de-seguran-a-pii-lgpd)
-- Requirement: SEC-03
-- =============================================================================
--
-- PURPOSE
--   Three n8n webhook URLs were hardcoded in the CLIENT bundle (candidaturasService
--   VITE_N8N_NOVA_CANDIDATURA + VITE_N8N_STATUS_UPDATE, explicacaoService
--   VITE_N8N_REVISAO_DECISAO). VITE_-prefixed env vars are INLINED into the public
--   bundle at build (RESEARCH Pitfall 5) — configurable is NOT private — so the URL
--   shipped to every browser and could be forged/enumerated (info disclosure / DoS).
--
--   This migration moves the dispatch server-side: three AFTER triggers on the
--   authoritative row mutations PERFORM net.http_post to the n8n URL read from a
--   Vault secret, mirroring reprocessar_analise (20260610000003:63-82). The client
--   no longer carries any URL. The three event paths:
--     - nova-candidatura   : AFTER INSERT ON candidaturas
--     - status-candidatura : AFTER UPDATE OF status ON candidaturas (status changed)
--     - revisao-decisao    : AFTER UPDATE OF revisao_solicitada_em ON decisao_final
--                            (NULL -> NOT NULL — a review was just requested)
--
-- GRACEFUL SKIP (mirrors reprocessar_analise): if the Vault secret is NULL the trigger
--   RETURNs without raising — a not-yet-created secret never breaks an INSERT/UPDATE.
--   The secret VALUE (`n8n_webhook_base`) is created in Plan 24-08 (executor/PROD),
--   NOT here — this migration is FILE-ONLY and only READS it.
--
-- MINIMAL M4 SCOPE (RESEARCH Open Q3): the body carries NO PII beyond ids/status/event
--   (never nome/email/cpf/telefone — the old client payloads carried those). The full
--   `notificar-candidato` EF (rich payload, retries) is M5. Here we only stop the URL
--   leaking into the bundle and dispatch the minimal event server-side.
--
-- RNF-07a: these triggers ONLY PERFORM an outbound HTTP POST. They NEVER write
--   candidaturas / never change status / never auto-reject. AFTER triggers return NEW
--   (row-level, no mutation).
--
-- DUPLICATE-FIRE NOTE (for 24-08 / 24-09): the EF `submit-candidatura` currently ALSO
--   fires the nova-candidatura webhook post-commit via its own N8N_NOVA_CANDIDATURA_URL
--   *env var* (server-side already — not a bundle leak). Once THIS trigger owns the
--   nova-candidatura dispatch canonically, that EF env-var fire becomes redundant and
--   should be dropped in 24-09 (EF redeploy) to avoid a double fire. The client-tier
--   fetch (the bundle leak) is removed in this same plan.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLAUDE.md D-22). PROD apply is Plan 24-08
--   (via Supabase MCP apply_migration if 42601 fires on the $$ bodies).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) nova-candidatura — AFTER INSERT ON candidaturas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_n8n_nova_candidatura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
BEGIN
  SELECT decrypted_secret INTO v_base
    FROM vault.decrypted_secrets WHERE name = 'n8n_webhook_base';

  IF v_base IS NULL THEN
    RETURN NEW;  -- secret not set yet — dispatch deferred (no error raised)
  END IF;

  PERFORM net.http_post(
    url := v_base || '/nova-candidatura',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event', 'candidatura.created',
      'timestamp', now(),
      'data', jsonb_build_object(
        'candidatura_id', NEW.id,
        'candidato_id', NEW.candidato_id,
        'vaga_id', NEW.vaga_id,
        'status', NEW.status,
        'etapa_atual', NEW.etapa_atual
      )
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_n8n_nova_candidatura() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_n8n_nova_candidatura ON public.candidaturas;
CREATE TRIGGER trg_n8n_nova_candidatura
  AFTER INSERT ON public.candidaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_n8n_nova_candidatura();

COMMENT ON FUNCTION public.trg_n8n_nova_candidatura() IS
  'SEC-03: fires the n8n nova-candidatura webhook server-side (pg_net + Vault '
  'n8n_webhook_base, graceful skip if NULL). Body = ids/status/event only, no PII. '
  'Never writes candidaturas (RNF-07a). Replaces the client-bundle fetch.';

-- -----------------------------------------------------------------------------
-- (2) status-candidatura — AFTER UPDATE OF status ON candidaturas (status changed)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_n8n_status_candidatura()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
BEGIN
  -- Only dispatch on an actual status transition.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_base
    FROM vault.decrypted_secrets WHERE name = 'n8n_webhook_base';

  IF v_base IS NULL THEN
    RETURN NEW;  -- secret not set yet — dispatch deferred (no error raised)
  END IF;

  PERFORM net.http_post(
    url := v_base || '/status-candidatura',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event', 'candidatura.status_updated',
      'timestamp', now(),
      'data', jsonb_build_object(
        'candidatura_id', NEW.id,
        'candidato_id', NEW.candidato_id,
        'vaga_id', NEW.vaga_id,
        'status_anterior', OLD.status,
        'status_novo', NEW.status,
        'etapa_atual', NEW.etapa_atual
      )
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_n8n_status_candidatura() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_n8n_status_candidatura ON public.candidaturas;
CREATE TRIGGER trg_n8n_status_candidatura
  AFTER UPDATE OF status ON public.candidaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_n8n_status_candidatura();

COMMENT ON FUNCTION public.trg_n8n_status_candidatura() IS
  'SEC-03: fires the n8n status-candidatura webhook server-side on a status '
  'transition (pg_net + Vault n8n_webhook_base, graceful skip if NULL). Body = '
  'ids/status/event only, no PII. Never writes candidaturas (RNF-07a).';

-- -----------------------------------------------------------------------------
-- (3) revisao-decisao — AFTER UPDATE OF revisao_solicitada_em ON decisao_final
--     (fires when a review is first requested: NULL -> NOT NULL)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_n8n_revisao_decisao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
BEGIN
  -- Only on the NULL -> NOT NULL transition (a review just requested — idempotent
  -- with the own-row RPC that never overwrites an existing request).
  IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_base
    FROM vault.decrypted_secrets WHERE name = 'n8n_webhook_base';

  IF v_base IS NULL THEN
    RETURN NEW;  -- secret not set yet — dispatch deferred (no error raised)
  END IF;

  PERFORM net.http_post(
    url := v_base || '/revisao-decisao',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event', 'decisao.revisao_solicitada',
      'timestamp', now(),
      'data', jsonb_build_object(
        'candidatura_id', NEW.candidatura_id
      )
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_n8n_revisao_decisao() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_n8n_revisao_decisao ON public.decisao_final;
CREATE TRIGGER trg_n8n_revisao_decisao
  AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_n8n_revisao_decisao();

COMMENT ON FUNCTION public.trg_n8n_revisao_decisao() IS
  'SEC-03: fires the n8n revisao-decisao webhook server-side when a candidate first '
  'requests a review (revisao_solicitada_em NULL -> NOT NULL). pg_net + Vault '
  'n8n_webhook_base, graceful skip if NULL. Body = candidatura_id only, no PII. '
  'Replaces the explicacaoService client fetch. Never writes candidaturas (RNF-07a).';
