-- =============================================================================
-- Migration: Social Media para `rascunho`, para ser REpublicada pela RPC
-- Date: 2026-08-30
-- =============================================================================
-- `social-media-producao-captacao-conteudo` esta no ar desde 2026-08-23 com o
-- snapshot `qualificacao_etapa1` VAZIO, porque foi publicada FORA de
-- `publish_vaga`. E a mesma causa que a deixou com os pesos zerados ate 25/08.
--
-- O contraste ficou visivel hoje, quando a vaga de consultor foi publicada PELA
-- RPC e nasceu com o snapshot preenchido (5 perguntas, 1 com knockout) enquanto
-- esta seguia vazia.
--
-- ⚠ O QUE ESTA E O QUE NAO ESTA EM RISCO. Hoje nada no codigo LE
-- `qualificacao_etapa1` — a unica mencao em src/ e um comentario de tipo. Entao a
-- vaga funciona: as perguntas vem de `perguntas_formulario` e o knockout de
-- `pergunta_opcao_metadata`, que e o que `submit_candidatura_atomic` consulta. O
-- que se conserta aqui e a DIVIDA: um campo derivado que deveria refletir a vaga
-- publicada e nao reflete, e que a proxima pessoa a le-lo tomaria por verdade.
--
-- ⚠ ESTA MIGRATION TIRA A VAGA DO AR e NAO a devolve. `publish_vaga` nao e
-- alcancavel pela via de apply (le `auth.jwt()`, que a Management API nao carrega)
-- e so aceita `rascunho`. A republicacao e um clique no app, autenticado, logo
-- depois. O operador confirmou em 2026-08-30 que nenhuma vaga foi divulgada e que
-- nao ha candidatura em andamento — a janela fora do ar nao custa nada.
--
-- Os quatro portoes da RPC foram conferidos ANTES: pesos somam 100, 3 testes
-- obrigatorios, 6 perguntas (teto 10), 1 aberta (teto 1), e o knockout esta em
-- pergunta obrigatoria. Sem essa conferencia previa, uma recusa da RPC deixaria a
-- vaga presa fora do ar.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

UPDATE public.vagas
   SET status = 'rascunho', updated_at = NOW()
 WHERE slug = 'social-media-producao-captacao-conteudo'
   AND deleted_at IS NULL
   AND status = 'ativa';

DO $gate$
DECLARE
  v_status text; v_soma int; v_obrig int; v_perg int; v_abertas int; v_ko int;
BEGIN
  SELECT status::text INTO v_status FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_status IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'ficou com status %, esperado rascunho', v_status;
  END IF;

  -- Reconferir os portoes DEPOIS da transicao: se algum falhar, a excecao aborta a
  -- transacao inteira e a vaga NAO sai do ar. E este o ponto de conferir aqui.
  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'redacao_cultural')::int
       + (pesos_avaliacao->>'work_sample_sjt')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_soma FROM public.vagas WHERE slug = 'social-media-producao-captacao-conteudo';
  IF v_soma <> 100 THEN
    RAISE EXCEPTION 'pesos somam % — a RPC recusaria e a vaga ficaria presa fora do ar', v_soma;
  END IF;

  SELECT count(*) INTO v_obrig FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
   WHERE v.slug = 'social-media-producao-captacao-conteudo' AND (t->>'obrigatorio')::boolean IS TRUE;
  IF v_obrig = 0 THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — a RPC recusaria e a vaga ficaria presa fora do ar';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE tipo_resposta::text IN ('texto_curto','texto_longo'))
    INTO v_perg, v_abertas FROM public.perguntas_formulario
   WHERE vaga_id = (SELECT id FROM public.vagas WHERE slug = 'social-media-producao-captacao-conteudo');
  IF v_perg > 10 OR v_abertas > 1 THEN
    RAISE EXCEPTION '% perguntas / % abertas — a RPC recusaria e a vaga ficaria presa fora do ar', v_perg, v_abertas;
  END IF;

  SELECT count(DISTINCT p.id) INTO v_ko FROM public.perguntas_formulario p
    JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = p.id AND m.tag = 'knockout'
   WHERE p.vaga_id = (SELECT id FROM public.vagas WHERE slug = 'social-media-producao-captacao-conteudo')
     AND p.obrigatoria IS NOT TRUE;
  IF v_ko > 0 THEN
    RAISE EXCEPTION '% pergunta(s) com knockout nao obrigatorias — a RPC recusaria', v_ko;
  END IF;

  RAISE NOTICE 'em rascunho e apta: pesos %, % testes obrigatorios, % perguntas, % aberta', v_soma, v_obrig, v_perg, v_abertas;
END
$gate$;
