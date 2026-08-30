-- =============================================================================
-- Migration: vaga comercial de `inativa` para `rascunho`, para publicar PELA RPC
-- Date: 2026-08-30
-- =============================================================================
-- O conteudo da vaga foi conferido contra o descritivo em PDF
-- (Descritivo_Cargo_SDR_Beauty_Smile_v3_brand.pdf): 42 trechos, zero lacunas.
-- Falta so publicar.
--
-- ⚠ POR QUE NAO BASTA UM UPDATE PARA 'ativa'. `publish_vaga` e o validador
-- canonico: ele confere os pesos somando 100, a existencia de teste obrigatorio,
-- o teto de 10 perguntas e 1 aberta, e que toda pergunta com opcao knockout seja
-- obrigatoria. As duas vagas de producao nasceram com os pesos ZERADOS por terem
-- sido publicadas FORA dela — e a de consultor passou tres dias no ar sem
-- perguntas e sem pesos por causa disso. Repetir o atalho seria repetir a causa.
--
-- ⚠ A RPC nao e alcancavel pela via de apply desta base: o corpo le
-- `auth.jwt() #>> '{app_metadata,role}'` e a Management API nao carrega JWT, entao
-- o papel resolve para NULL e sai `forbidden` (42501). Ela precisa ser chamada de
-- dentro do app, por um usuario rh/administrador autenticado.
--
-- E ela so aceita vaga em `rascunho` (`IF v_status <> 'rascunho' THEN RAISE`).
-- Esta migration existe unicamente para satisfazer essa precondicao. `rascunho` e
-- tao invisivel ao candidato quanto `inativa`: nada muda para quem esta de fora.
--
-- Nota de contexto: `publish_vaga` tambem grava o snapshot derivado
-- `qualificacao_etapa1`. Medido hoje, TODAS as vagas do banco o tem vazio — a de
-- Social Media inclusive, que esta no ar — e nada no codigo o le. Ou seja, o
-- snapshot nao e o motivo de passar pela RPC; o motivo sao os portoes.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

UPDATE public.vagas
   SET status = 'rascunho', updated_at = NOW()
 WHERE slug = 'consultor-relacionamento-pre-vendas'
   AND deleted_at IS NULL
   AND status = 'inativa';

DO $gate$
DECLARE
  v_status text;
  v_soma int;
  v_perg int;
  v_abertas int;
  v_ko_nao_obrig int;
BEGIN
  SELECT status::text INTO v_status FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;

  IF v_status IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'a vaga ficou com status %, esperado rascunho — a RPC recusaria publicar', v_status;
  END IF;

  -- Os portoes do publish_vaga, conferidos AQUI para que o clique do operador nao
  -- esbarre neles. Isto NAO substitui a RPC: e para ela nao falhar na mao dele.
  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'redacao_cultural')::int
       + (pesos_avaliacao->>'work_sample_sjt')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_soma FROM public.vagas WHERE slug = 'consultor-relacionamento-pre-vendas';
  IF v_soma <> 100 THEN
    RAISE EXCEPTION 'pesos somam %, e a RPC exige 100', v_soma;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
     WHERE v.slug = 'consultor-relacionamento-pre-vendas' AND (t->>'obrigatorio')::boolean IS TRUE
  ) THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — a RPC recusaria';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE tipo_resposta::text IN ('texto_curto','texto_longo'))
    INTO v_perg, v_abertas
    FROM public.perguntas_formulario
   WHERE vaga_id = (SELECT id FROM public.vagas WHERE slug = 'consultor-relacionamento-pre-vendas');
  IF v_perg > 10 THEN RAISE EXCEPTION 'a Etapa 1 tem % perguntas (teto 10)', v_perg; END IF;
  IF v_abertas > 1 THEN RAISE EXCEPTION 'a Etapa 1 tem % abertas (teto 1)', v_abertas; END IF;

  -- Toda pergunta com opcao knockout precisa ser obrigatoria.
  SELECT count(DISTINCT p.id) INTO v_ko_nao_obrig
    FROM public.perguntas_formulario p
    JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = p.id AND m.tag = 'knockout'
   WHERE p.vaga_id = (SELECT id FROM public.vagas WHERE slug = 'consultor-relacionamento-pre-vendas')
     AND p.obrigatoria IS NOT TRUE;
  IF v_ko_nao_obrig > 0 THEN
    RAISE EXCEPTION '% pergunta(s) com knockout nao sao obrigatorias — a RPC recusaria', v_ko_nao_obrig;
  END IF;

  RAISE NOTICE 'pronta para publicar: rascunho, pesos %, % perguntas, % aberta(s)', v_soma, v_perg, v_abertas;
END
$gate$;
