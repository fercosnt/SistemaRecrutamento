-- =============================================================================
-- Migration: Phase 39 — Rewire dos triggers do funil + aposentadoria do n8n (SEC-03)
-- Date: 2026-07-26
-- Phase: 39 (rewire-dos-triggers-aposentadoria-do-n8n-sec-03)
-- Requirements: DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04
-- =============================================================================
--
-- PURPOSE
--   Trocar a topologia de disparo do funil numa ÚNICA migration ATÔMICA:
--     BLOCO A — DROP dos 4 triggers/funções n8n (os 3 do SEC-03 +
--               trg_n8n_novo_candidato) → aposenta o n8n, resolve SEC-03 por
--               SUBSTITUIÇÃO (não patch); o segredo n8n_webhook_base fica órfão.
--     BLOCO B — CREATE de 3 funções/triggers AFTER INSERT que auto-disparam a EF
--               `notificar-candidato` via net.http_post (Bearer self-auth do Vault,
--               corpo IDS-ONLY, graceful-skip + fail-open):
--                 trg_notif_transicao   (historico_candidatura): avanço + decisão (CASE)
--                 trg_notif_confirmacao (candidaturas):          confirmação (survivor-guard)
--                 trg_notif_convite     (agendamentos_entrevista): convite (+ agendamento_id)
--
--   DROP-and-CREATE na MESMA transação = zero janela interna de double-send (D-10);
--   o UNIQUE(dedupe_key) durável da P37 é o cinto de idempotência.
--
--   Esqueleto do hop copiado verbatim de 20260610000002_analise_trigger.sql:25-70
--   (Vault project_url+edge_invoke_key → graceful-skip se NULL → net.http_post Bearer).
--   Wrapper fail-open copiado de 20260712100004_n8n_novo_candidato.sql:60-74
--   (BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING … END): uma falha de dispatch
--   NUNCA reverte a escrita do funil (AFTER INSERT, RETURN NEW, RNF-07a).
--   Segredos SÓ do Vault, nunca hardcoded/logado; SET search_path='' + refs qualificadas.
--
-- NOTE: SEM wrapper `BEGIN; … COMMIT;` de topo (D-13 / CLAUDE.md — o driver do CLI já
--   envolve cada migration na sua própria transação; o outer BEGIN/COMMIT é o gatilho
--   do 42601). O APPLY em PROD é o plano GATED 39-04, via Supabase MCP `apply_migration`
--   (bypassa 42601 nos corpos $$, grava a version row) + reconcile do ledger. NÃO `db push`.
--
-- NÃO TOCAR (D-12): avancar_etapa(), trg_candidaturas_analise / trg_candidatura_analise(),
--   guard_rejeicao_auditada, notify_cost_anomaly (cost-alerter, NÃO é n8n).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BLOCO A — Aposentadoria do n8n (D-08): DROP dos 4 triggers + 4 funções.
--   Ordem OBRIGATÓRIA trigger-antes-de-função (DROP FUNCTION falha enquanto o
--   trigger a referencia — Pitfall 4). IF EXISTS, NUNCA CASCADE.
-- -----------------------------------------------------------------------------
-- SEC-03 (20260706110005_sec03_n8n_serverside.sql) — os 3 triggers dormentes:
DROP TRIGGER IF EXISTS trg_n8n_nova_candidatura   ON public.candidaturas;
DROP TRIGGER IF EXISTS trg_n8n_status_candidatura ON public.candidaturas;
DROP TRIGGER IF EXISTS trg_n8n_revisao_decisao    ON public.decisao_final;
-- 2ª leak (20260712100004_n8n_novo_candidato.sql) — o 4º trigger:
DROP TRIGGER IF EXISTS trg_n8n_novo_candidato      ON public.candidatos;

DROP FUNCTION IF EXISTS public.trg_n8n_nova_candidatura();
DROP FUNCTION IF EXISTS public.trg_n8n_status_candidatura();
DROP FUNCTION IF EXISTS public.trg_n8n_revisao_decisao();
DROP FUNCTION IF EXISTS public.trg_n8n_novo_candidato();

-- -----------------------------------------------------------------------------
-- BLOCO B — Nova topologia canônica. Vocabulário do evento IMUTÁVEL (EventoLedger
--   da EF, helpers.ts:11 / index.ts:58): 'confirmacao' | 'avanco' | 'convite' | 'decisao'.
-- -----------------------------------------------------------------------------

-- (1) trg_notif_transicao — fonte canônica das transições (avanço + decisão), CASE.
CREATE OR REPLACE FUNCTION public.trg_notif_transicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  v_evento      text;
BEGIN
  -- CASE sobre a etapa de destino (D-01/D-02). SÓ dois pontos disparam; toda outra
  -- transição (triagem, entrevistas, inscricao, decisao_final intermediário) é silenciosa.
  IF NEW.etapa_para = 'avaliacao_assincrona' THEN
    v_evento := 'avanco';
  ELSIF NEW.etapa_para IN ('aprovado', 'rejeitado') AND NEW.auto_rejeitado = false THEN
    v_evento := 'decisao';  -- decisão registrada por humano (auto-rejeição NÃO notifica)
  ELSE
    RETURN NEW;  -- nenhuma notificação para esta transição
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, funil intacto (graceful-skip)
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', v_evento,
        'candidatura_id', NEW.candidatura_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_transicao: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notif_transicao() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notif_transicao ON public.historico_candidatura;
CREATE TRIGGER trg_notif_transicao
  AFTER INSERT ON public.historico_candidatura
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_transicao();

COMMENT ON FUNCTION public.trg_notif_transicao() IS
  'Phase 39 / DISPATCH-01: fonte canônica das transições do funil. AFTER INSERT em '
  'historico_candidatura. CASE em etapa_para: avaliacao_assincrona -> evento avanco; '
  'aprovado/rejeitado com auto_rejeitado=false -> evento decisao; qualquer outra etapa '
  '-> RETURN NEW sem dispatch. Corpo ids-only (evento + candidatura_id) via Bearer '
  'self-auth do Vault (project_url + edge_invoke_key), graceful-skip + fail-open.';

-- (2) trg_notif_confirmacao — confirmação de candidatura, survivor-guarded.
CREATE OR REPLACE FUNCTION public.trg_notif_confirmacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Survivor-guard verbatim do trg_candidatura_analise (20260610000002:37): knockout
  -- não dispara confirmação (D-03/D-05).
  IF NEW.status = 'rejeitado' OR NEW.opcao_knockout_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- graceful-skip
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'confirmacao',
        'candidatura_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_confirmacao: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notif_confirmacao() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notif_confirmacao ON public.candidaturas;
CREATE TRIGGER trg_notif_confirmacao
  AFTER INSERT ON public.candidaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_confirmacao();

COMMENT ON FUNCTION public.trg_notif_confirmacao() IS
  'Phase 39 / DISPATCH-02: AFTER INSERT em candidaturas. Survivor-guard: knockout '
  '(status=rejeitado OU opcao_knockout_id IS NOT NULL) faz RETURN NEW sem dispatch. '
  'Coexiste ORTOGONALMENTE com trg_candidaturas_analise (dispatch de análise IA). Corpo '
  'ids-only (evento=confirmacao + candidatura_id=NEW.id) via Bearer do Vault, '
  'graceful-skip + fail-open.';

-- (3) trg_notif_convite — convite de entrevista (sempre dispara; carrega agendamento_id).
CREATE OR REPLACE FUNCTION public.trg_notif_convite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- graceful-skip
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'convite',
        'candidatura_id', NEW.candidatura_id,
        'agendamento_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_convite: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notif_convite() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notif_convite ON public.agendamentos_entrevista;
CREATE TRIGGER trg_notif_convite
  AFTER INSERT ON public.agendamentos_entrevista
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notif_convite();

COMMENT ON FUNCTION public.trg_notif_convite() IS
  'Phase 39 / DISPATCH-03: AFTER INSERT em agendamentos_entrevista. Sempre dispara (sem '
  'predicado — novo agendamento = novo convite). Corpo ids-only (evento=convite + '
  'candidatura_id=NEW.candidatura_id + agendamento_id=NEW.id — a EF exige agendamento_id '
  'no convite, index.ts:107-113). Bearer do Vault, graceful-skip + fail-open.';
