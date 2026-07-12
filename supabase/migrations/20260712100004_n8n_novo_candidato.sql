-- =============================================================================
-- Migration: n8n "novo candidato" dispatch SERVER-SIDE (close the 2nd bundle leak)
-- Date: 2026-07-12
-- Phase: 26 (correcao-do-funil-lado-candidato) / Plan 26-03
-- Requirement: n8n 2nd leak (routed pos-P24, SEC-03 pattern)
-- =============================================================================
--
-- PURPOSE
--   The CLIENT service `src/features/cadastro/services/n8nService.ts` hardcoded 18
--   `n8n.srv881294.hstgr.cloud` webhook URLs into the PUBLIC bundle and its
--   `notifyCandidatoCriado()` helper shipped candidate personal data (identity +
--   contact + document fields) from the browser. That subtree has ZERO runtime
--   callers (only a barrel re-export + its test) and is DELETED in this same plan
--   (26-03).
--
--   To preserve the candidato-created dispatch WITHOUT the bundle leak, this migration
--   moves it server-side, mirroring the SEC-03 precedent
--   (20260706110005_sec03_n8n_serverside.sql:52-99) retargeted to `candidatos`: an
--   AFTER INSERT trigger PERFORMs net.http_post to the n8n URL read from the Vault
--   secret `n8n_webhook_base`. The client carries no URL and no personal data.
--
-- CRITICAL DELTA vs SEC-03: the old client payload carried the candidate's identity +
--   contact + document fields. This trigger body carries ONLY `candidato_id` — never
--   any personal data (LGPD / D-n8n-ServerSide). The full rich `notificar-candidato`
--   EF (retries, richer body) is M5.
--
-- GRACEFUL SKIP (mirrors SEC-03 / reprocessar_analise): if the Vault secret is NULL the
--   trigger RETURNs NEW without raising — a not-yet-created secret never breaks an INSERT.
--   The secret VALUE (`n8n_webhook_base`) is Fernando's human-action (deferred); until it
--   is set, the live behavior is graceful-skip. This migration is FILE-ONLY and only READS it.
--
-- RNF-07a: this trigger ONLY PERFORMs an outbound HTTP POST. It NEVER writes candidatos /
--   never changes any candidato field / never auto-rejects. AFTER INSERT returns NEW
--   (row-level, no mutation).
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLAUDE.md D-22 — the CLI driver wraps each
--   migration in its own txn; an outer BEGIN/COMMIT is the 42601 trigger). PROD apply is
--   Plan 26-07 (Wave 4) via Supabase MCP `apply_migration` (bypasses 42601 on the $$ body,
--   writes the version row). Do NOT `db push` this file.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_n8n_novo_candidato()
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

  IF v_base IS NULL THEN RETURN NEW; END IF;  -- graceful-skip: secret not set yet

  PERFORM net.http_post(
    url := v_base || '/novo-candidato',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event', 'candidato.created',
      'timestamp', now(),
      'data', jsonb_build_object(
        'candidato_id', NEW.id  -- ID ONLY — no candidate personal data crosses (LGPD)
      )
    )
  );

  RETURN NEW;  -- RNF-07a: never writes candidatos
END;
$$;

REVOKE ALL ON FUNCTION public.trg_n8n_novo_candidato() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_n8n_novo_candidato ON public.candidatos;
CREATE TRIGGER trg_n8n_novo_candidato
  AFTER INSERT ON public.candidatos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_n8n_novo_candidato();

COMMENT ON FUNCTION public.trg_n8n_novo_candidato() IS
  'n8n 2nd-leak (SEC-03 pattern, Phase 26): fires the n8n novo-candidato webhook '
  'server-side on candidato INSERT (pg_net + Vault n8n_webhook_base, graceful skip if '
  'NULL). Body = candidato_id only, no personal data. Replaces the deleted client '
  'n8nService.ts bundle dispatch. Never writes candidatos (RNF-07a).';
