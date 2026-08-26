-- =============================================================================
-- Migration: registrar_decisao passa a gravar data_decisao_final (e o status do aprovado)
-- Date: 2026-08-26
-- =============================================================================
--
-- ⛔ O DEFEITO TEM CONSEQUÊNCIA LEGAL, e ficou visível num teste E2E que levou uma
-- candidatura até a contratação em 2026-08-26.
--
-- `candidaturas.data_decisao_final` NUNCA é escrita. Varredura em `src/`,
-- `supabase/functions/` e `supabase/migrations/`: a coluna aparece só em SELECTs.
-- Medido: NULL em 100% das candidaturas que chegaram ao fim do funil (0 de 7).
--
-- E é ela que gateia o cartão de decisão final no painel do candidato:
--
--   DashboardCandidatoPage.hasDecisaoFinal()
--     etapa ∈ {decisao_final, aprovado, rejeitado}
--     AND (data_decisao_final OU feedback_rejeicao)
--
-- O CTA desse cartão é o único caminho in-app para a tela de explicação do
-- **LGPD Art. 20** (`/candidato/explicacao/:id`) — o direito à explicação sobre
-- decisão automatizada. Sem a data:
--
--   · quem é REJEITADO por knockout enxerga o cartão, porque `feedback_rejeicao`
--     é preenchido por `submit_candidatura_atomic`;
--   · quem é APROVADO não enxerga NADA — nem a decisão, nem o caminho para a
--     explicação. O ramo que dá a boa notícia é o que não avisa ninguém.
--
-- ⚠ E HAVIA UMA SEGUNDA ASSIMETRIA, no mesmo IF. O ramo `rejeitado` grava
-- `status = 'rejeitado'`; o ramo `aprovado` não mexia em `status`, deixando a
-- candidatura em `aguardando_resposta` depois de aprovada. Medido: as 5 aprovadas
-- antigas estão `finalizado` (vieram de outro caminho), e a deste teste ficou em
-- `aguardando_resposta` — o mesmo desfecho com dois estados diferentes no banco.
--
-- Os dois ramos passam a gravar `data_decisao_final = now()`, e o de aprovação
-- passa a fechar o `status` como os outros já fazem.
--
-- ⚠ NÃO faz backfill das 7 antigas. A data seria INVENTADA — não há registro de
-- quando aquelas decisões foram tomadas, e `decisao_final.em` só existe para as
-- que passaram por esta RPC. Carimbar `now()` num fato de meses atrás é pior que
-- deixar nulo: vira dado falso com aparência de auditoria. Quem precisar da data
-- histórica tem `decisao_final.em` e `historico_candidatura`.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $fix$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'registrar_decisao';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'registrar_decisao nao existe — nada a corrigir';
  END IF;

  -- Portao: as duas assinaturas alvo precisam estar como esperado. Se alguem ja
  -- mexeu na funcao, o replace cego apagaria a mudanca dessa pessoa.
  IF position('data_decisao_final' in v_def) > 0 THEN
    RAISE NOTICE 'registrar_decisao ja grava data_decisao_final — nada a fazer';
    RETURN;
  END IF;

  v_def := replace(
    v_def,
    E'SET etapa_atual = ''aprovado'',\n           etapa_justificativa = p_justificativa',
    E'SET etapa_atual = ''aprovado'',\n           status = ''finalizado'',\n           data_decisao_final = now(),\n           etapa_justificativa = p_justificativa'
  );

  v_def := replace(
    v_def,
    E'SET etapa_atual = ''rejeitado'',\n           status = ''rejeitado'',\n           etapa_justificativa = p_justificativa',
    E'SET etapa_atual = ''rejeitado'',\n           status = ''rejeitado'',\n           data_decisao_final = now(),\n           etapa_justificativa = p_justificativa'
  );

  IF position('data_decisao_final' in v_def) = 0 THEN
    RAISE EXCEPTION 'as substituicoes nao pegaram — o corpo da funcao mudou desde 2026-08-26; revise a mao';
  END IF;

  EXECUTE v_def;
  RAISE NOTICE 'registrar_decisao passa a gravar data_decisao_final nos dois ramos';
END
$fix$;
