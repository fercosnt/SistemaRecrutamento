-- =============================================================================
-- Migration: quem é rejeitado no knockout passa a receber e-mail
-- Date: 2026-09-06 (E6 do guia de validação — decisão do responsável pelo produto)
-- =============================================================================
-- MEDIDO ao vivo: a candidata T2 foi reprovada no knockout da inscrição (resposta
-- eliminatória de disponibilidade) e `notificacoes_enviadas` para a candidatura ficou
-- VAZIA. Ela só saberia do resultado se voltasse ao site por conta própria.
--
-- A causa é uma linha do `trg_notif_transicao` (P39, migration 20260726000001):
--
--   ELSIF NEW.etapa_para IN ('aprovado','rejeitado') AND NEW.auto_rejeitado = false THEN
--     v_evento := 'decisao';  -- decisão registrada por humano (auto-rejeição NÃO notifica)
--
-- Duas condições excluíam o knockout: ele mantém `etapa_para = 'inscricao'` (por desenho,
-- para o trigger de avanço não disparar) e marca `auto_rejeitado = true`.
--
-- O efeito combinado era o inverso do que o Art. 20 da LGPD protege: quem foi reprovado
-- POR UM HUMANO recebia e-mail, e quem foi reprovado SEM NENHUM HUMANO OLHAR não recebia
-- nada. Não há razão de produto para isso — a copy de rejeição já é neutra e congelada
-- (COPY_REJEICAO, D-15/RNF-07a), e vale igual nos dois casos.
--
-- ESCOPO desta migration: apenas o e-mail. A página de explicação do Art. 20 e o pedido
-- de revisão continuam restritos à decisão final — são outra decisão, registrada em
-- .planning/GUIA-VALIDACAO-FINAL.md §7.18.
--
-- `auto_rejeitado = true` tem semântica precisa e estreita (20260712110001:107): escrita
-- do SISTEMA (ator NULL) que é ALÉM DISSO uma auto-rejeição sancionada pelo GUC
-- `app.rejeicao_sancionada`. Hoje o único produtor é o knockout da inscrição; qualquer
-- auto-rejeição futura herda a notificação, que é o comportamento desejado.
--
-- A EF `notificar-candidato` não precisa mudar: o evento é o mesmo `decisao`, o desfecho
-- é derivado de `candidaturas.etapa_atual` ('inscricao' ≠ 'aprovado' → rejeitado, que é o
-- fail-safe correto) e o `dedupe_key` `{candidatura_id}:decisao` não colide — uma
-- candidatura eliminada no knockout nunca chega à decisão final.
--
-- Aplicar pela Management API com o SQL lido do arquivo (p46apply.cjs migrate).
-- Sem BEGIN/COMMIT externo — a requisição já é uma transação.
-- =============================================================================

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

COMMENT ON FUNCTION public.trg_notif_transicao() IS
  'Fonte canonica das notificacoes de transicao do funil: avanco (etapa_para='
  '''avaliacao_assincrona''), decisao humana (etapa_para terminal com auto_rejeitado=false) '
  'e, desde 2026-09-06, decisao AUTOMATICA (auto_rejeitado=true — o knockout da inscricao, '
  'que preserva etapa_para=''inscricao''). Toda outra transicao e silenciosa.';

-- Portão: as três condições têm de estar na definição instalada, e o trigger, vivo.
DO $$
DECLARE
  v_def text := pg_get_functiondef('public.trg_notif_transicao()'::regprocedure);
BEGIN
  IF position('ELSIF NEW.auto_rejeitado THEN' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao instalada SEM o ramo de rejeicao automatica';
  END IF;
  IF position('NEW.etapa_para = ''avaliacao_assincrona''' IN v_def) = 0
     OR position('auto_rejeitado = false' IN v_def) = 0 THEN
    RAISE EXCEPTION 'trg_notif_transicao perdeu um dos ramos anteriores (avanco/decisao humana)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.historico_candidatura'::regclass
       AND tgname = 'trg_notif_transicao'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trigger trg_notif_transicao ausente em historico_candidatura';
  END IF;
END $$;
