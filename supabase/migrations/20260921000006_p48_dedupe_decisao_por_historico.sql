-- =============================================================================
-- 20260921000006 — o despacho de transição passa a dizer QUAL decisão anuncia
--                  (JORN-18 / JORN-20)
-- =============================================================================
-- Phase 48 / plano 48-08, Task 1.
--
-- O QUE ESTAVA ERRADO (medido, não presumido). O log da EF `notificar-candidato` de
-- 2026-09-20 16:03:25 UTC registra a rejeição da Etapa 9 da validação em PROD:
--
--   { evento: "decisao", candidatura_id: "bf26ee3c-…",
--     dedupe_key: "bf26ee3c-…:decisao", skipped: "duplicate" }
--
-- A rejeição FOI despachada por este trigger — e descartada pela EF, porque a chave
-- de dedupe era `{candidatura}:decisao` e já estava ocupada pela aprovação de 02:11.
-- Sem erro, sem linha nova no ledger, sem e-mail. É o Defeito 18 (a 2ª decisão não
-- avisa) e é também o Defeito 20 (a rejeição na triagem «não avisa»): o despacho
-- existia; a chave o engolia. Nenhum evento novo é necessário — a rejeição na
-- triagem segue sendo o evento `decisao`, com a mesma cópia neutra.
--
-- POR QUE O `historico_id`. `trg_notif_transicao` é AFTER INSERT em
-- `historico_candidatura`: `NEW.id` É a transição. Cada decisão é uma linha de
-- histórico, logo uma chave (`{candidatura}:decisao:{historico_id}`); o MESMO
-- disparo entregue duas vezes continua colapsando na mesma chave. Vale para
-- `avanco` e `decisao`, que compartilham o builder do corpo: um re-avanço legítimo
-- a `avaliacao_assincrona` depois de retroceder volta a avisar.
-- A EF também passa a tirar o DESFECHO de `historico_candidatura.etapa_para` da
-- linha da chave, e não de `candidaturas.etapa_atual` na hora do envio (L1 da
-- varredura 48-VARREDURA-ETAPA-ATUAL.md).
--
-- ORDEM DE ENTREGA (RESEARCH §L / Pitfall 7 — `net.http_post` é at-most-once).
-- A EF tolerante (aceita o campo, e aceita a ausência dele) foi deployada ANTES
-- desta migration: `notificar-candidato` v10, 2026-09-21T14:20:21Z. O inverso — o
-- trigger mandando um campo que a EF recusasse — faria o e-mail sumir sem rastro.
-- E a trava terminal de `rejeitar_candidatura` (48-01, D3) foi conferida VIVA por
-- catálogo antes deste apply: sem ela, com a chave nova, re-rejeitar um knockout
-- mandaria um 2º e-mail de rejeição.
--
-- BASE: o corpo VIVO, lido por `pg_get_functiondef` em 2026-09-21 —
--   trg_notif_transicao  md5(prosrc) = 231fa1f1f2a6b5c919d979ff55c8b7a0 (1859 octetos)
-- idêntico ao corpo de 20260906000006. UMA mudança: o `jsonb_build_object` do
-- corpo ganha `'historico_id', NEW.id`. CASE de eventos, leitura do Vault com
-- graceful-skip, `EXCEPTION WHEN OTHERS` fail-open: intactos — e o PÓS-PORTÃO do fim
-- PROVA isso: removido o fragmento novo, o corpo instalado tem de voltar ao md5 vivo.
--
-- AUTHZ / ACL: CREATE OR REPLACE preserva o ACL vivo
-- (`postgres, anon, authenticated, service_role` com EXECUTE — grants diretos do
-- `pg_default_acl`; função `RETURNS trigger` não é invocável fora de trigger). O
-- `REVOKE … FROM PUBLIC` da migration base é mantido como estava.
--
-- IDEMPOTÊNCIA: o pré-portão aceita o md5 de ANTES (primeiro apply) e recusa
-- qualquer outro — re-aplicar sobre o corpo novo falharia de propósito, com
-- mensagem, em vez de reinstalar às cegas.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- `DO`/`REVOKE`/`COMMENT` adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000006_p48_dedupe_decisao_por_historico.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — o vivo é o corpo medido.
-- ---------------------------------------------------------------------------
DO $pre_p48_08a$
DECLARE
  v_md5 text;
BEGIN
  SELECT md5(p.prosrc) INTO v_md5
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_transicao()'::regprocedure;
  IF v_md5 IS DISTINCT FROM '231fa1f1f2a6b5c919d979ff55c8b7a0' THEN
    RAISE EXCEPTION 'P48-08 PRE-PORTAO: trg_notif_transicao vivo md5 = %, medido = 231fa1f1f2a6b5c919d979ff55c8b7a0 — reler o vivo (pg_get_functiondef) e refazer esta migration', v_md5;
  END IF;
END
$pre_p48_08a$;

-- ---------------------------------------------------------------------------
-- trg_notif_transicao — corpo vivo + `'historico_id', NEW.id` no corpo do despacho.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notif_transicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  v_evento      text;
BEGIN
  -- CASE sobre a transição (D-01/D-02). Toda transição não listada é silenciosa
  -- (triagem, entrevistas, decisao_final intermediário).
  IF NEW.etapa_para = 'avaliacao_assincrona' THEN
    v_evento := 'avanco';
  ELSIF NEW.etapa_para IN ('aprovado', 'rejeitado') AND NEW.auto_rejeitado = false THEN
    v_evento := 'decisao';  -- decisão de desfecho registrada por um humano
  ELSIF NEW.auto_rejeitado THEN
    -- 2026-09-06: REJEIÇÃO AUTOMÁTICA (hoje, só o knockout da inscrição). Antes desta
    -- linha ela era o ÚNICO desfecho do funil sem aviso ao candidato — justamente o
    -- que nenhum humano avaliou. Mesma copy neutra e congelada da rejeição humana.
    -- `etapa_para` NÃO entra na condição: o knockout preserva a etapa de propósito.
    v_evento := 'decisao';
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
        'candidatura_id', NEW.candidatura_id,
        'historico_id', NEW.id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_transicao: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_notif_transicao() FROM PUBLIC;

COMMENT ON FUNCTION public.trg_notif_transicao() IS
  'Fonte canonica das notificacoes de transicao do funil: avanco (etapa_para='
  '''avaliacao_assincrona''), decisao humana (etapa_para terminal com auto_rejeitado=false) '
  'e, desde 2026-09-06, decisao AUTOMATICA (auto_rejeitado=true — o knockout da inscricao, '
  'que preserva etapa_para=''inscricao''). Toda outra transicao e silenciosa. '
  'Desde 2026-09-21 (48-08, JORN-18/JORN-20) o corpo carrega historico_id = NEW.id: a EF '
  'versiona a chave de dedupe por transicao (uma chave por decisao, nao por candidatura) e '
  'tira o desfecho de historico_candidatura.etapa_para dessa linha.';

-- ---------------------------------------------------------------------------
-- PÓS-PORTÃO — o ramo novo E os antigos estão na definição instalada; a mudança é
-- UMA só (sem o fragmento novo, o corpo volta ao md5 vivo); o trigger está vivo.
-- ---------------------------------------------------------------------------
DO $pos_p48_08a$
DECLARE
  v_def text := pg_get_functiondef('public.trg_notif_transicao()'::regprocedure);
  v_src text;
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_transicao()'::regprocedure;

  IF position('''historico_id'', NEW.id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao instalada SEM o historico_id no corpo do despacho';
  END IF;
  IF position('ELSIF NEW.auto_rejeitado THEN' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao instalada SEM o ramo de rejeicao automatica';
  END IF;
  IF position('NEW.etapa_para = ''avaliacao_assincrona''' IN v_def) = 0
     OR position('auto_rejeitado = false' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao perdeu um dos ramos anteriores (avanco/decisao humana)';
  END IF;
  IF position('edge_invoke_key' IN v_def) = 0
     OR position('EXCEPTION WHEN OTHERS' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao perdeu o Vault ou o fail-open';
  END IF;
  IF md5(replace(v_src, E',\n        ''historico_id'', NEW.id', ''))
     IS DISTINCT FROM '231fa1f1f2a6b5c919d979ff55c8b7a0' THEN
    RAISE EXCEPTION 'trg_notif_transicao: a mudanca NAO e so o historico_id — sem o fragmento novo o corpo deveria voltar ao md5 vivo 231fa1f1…, e nao voltou';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.historico_candidatura'::regclass
       AND tgname = 'trg_notif_transicao'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trigger trg_notif_transicao ausente em historico_candidatura';
  END IF;
END
$pos_p48_08a$;
