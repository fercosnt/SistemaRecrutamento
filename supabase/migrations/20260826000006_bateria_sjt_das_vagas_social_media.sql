-- =============================================================================
-- Migration: declara a bateria do SJT nas vagas de Social Media
-- Date: 2026-08-26
-- =============================================================================
--
-- Depois de 20260826000005, cliente e servidor RECONHECEM o elemento
-- `teste: 'work_sample_sjt'` — mas ele não diz QUAL bateria aplicar. Sem `cargo`
-- nem `itens_ids`, `pontuar_sjt` segue recusando com «bateria SJT nao configurada»,
-- agora pelo motivo verdadeiro, e a tela não apresenta questão nenhuma.
--
-- Este arquivo preenche a lacuna nas duas vagas de Social Media, escolhendo
-- `sdr-social-seller` — é o cargo do banco cuja situação-problema mais se aproxima
-- de produção de conteúdo e relacionamento com público. Não existe bateria de
-- "social media" no banco; a alternativa seria `vaga-generica`, mais neutra e menos
-- informativa.
--
-- ⚠ A BATERIA TEM UMA ÚNICA QUESTÃO, e isso é uma limitação REAL do conteúdo, não
-- desta migration. Medido em 2026-08-26: cada cargo tem 1 questão `mc` ativa, exceto
-- `dentista`, que tem 3. Um SJT de uma questão exercita o FLUXO (apresentar,
-- responder, pontuar) mas não mede nada com confiabilidade — a variância de uma
-- única resposta é alta demais para sustentar decisão sobre pessoas. Antes de usar
-- em processo real, o banco precisa de itens; o peso de 35% em `pesos_avaliacao`
-- pressupõe um instrumento com mais de um item.
--
-- ⚠ `formato='caso_aberto'` NÃO É item defeituoso por não ter alternativas. A
-- questão de dentista com zero opções é um caso aberto, e `pontuar_sjt` já filtra
-- `p.formato='mc'`. Registrado aqui porque a contagem crua de opções sugere defeito
-- onde não há.
--
-- Aditivo e reversível: só acrescenta a chave `cargo` ao elemento do SJT, sem tocar
-- nos demais testes nem nos pesos. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $bat$
DECLARE
  v_autor uuid;
  v_slug  text;
  v_n     int;
BEGIN
  SELECT user_id INTO v_autor FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido';
  END IF;

  -- O cargo escolhido precisa EXISTIR e ter questao `mc` — senao a bateria nasce
  -- vazia e a RPC recusa, que e exatamente o estado que este arquivo vem corrigir.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE status = 'active' AND formato = 'mc' AND cargo = 'sdr-social-seller';
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nenhuma questao mc ativa para o cargo sdr-social-seller — a bateria nasceria vazia';
  END IF;
  RAISE NOTICE 'bateria sdr-social-seller: % questao(oes) mc', v_n;

  FOREACH v_slug IN ARRAY ARRAY['social-media-producao-captacao-conteudo', 'teste-e2e-social-media']
  LOOP
    UPDATE public.vagas v
       SET testes_aplicaveis = (
             SELECT jsonb_agg(
               CASE WHEN elem->>'teste' IN ('sjt','work_sample_sjt') OR elem->>'tipo' = 'sjt'
                    THEN elem || jsonb_build_object('cargo', 'sdr-social-seller')
                    ELSE elem END
             )
             FROM jsonb_array_elements(v.testes_aplicaveis) elem
           ),
           updated_by = v_autor
     WHERE v.slug = v_slug AND v.deleted_at IS NULL;
  END LOOP;

  -- Portao: as duas vagas ficaram com o cargo declarado no elemento do SJT.
  SELECT count(*) INTO v_n FROM public.vagas v
   WHERE v.slug IN ('social-media-producao-captacao-conteudo', 'teste-e2e-social-media')
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(v.testes_aplicaveis) e
        WHERE (e->>'teste' IN ('sjt','work_sample_sjt') OR e->>'tipo' = 'sjt')
          AND e->>'cargo' = 'sdr-social-seller'
     );
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'so % de 2 vagas ficaram com a bateria declarada', v_n;
  END IF;

  RAISE NOTICE 'bateria do SJT declarada nas 2 vagas de Social Media';
END
$bat$;
