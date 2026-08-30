-- =============================================================================
-- Migration: declara QUAIS redacoes cada vaga aplica
-- Date: 2026-08-30
-- =============================================================================
-- `getRedacaoContext` servia TODAS as `perguntas_redacao` ativas, sem olhar a
-- vaga. Sao ONZE, e `RedacaoEditorScreen` itera a lista mostrando "Pergunta n de
-- total": o candidato de uma vaga comercial escreveria onze redacoes, entre elas
-- "defenda uma abordagem clinica nao-obvia" (feita para dentista) e "de um feedback
-- duro a um subordinado" (para coordenacao).
--
-- ⚠ E A MESMA FORMA do defeito do SJT, consertado em 20260826000006: instrumento
-- sem escopo declarado servindo o banco inteiro. Nao apareceu antes porque a etapa
-- de avaliacao assincrona NUNCA rodou de ponta a ponta — o teste E2E de 26/08
-- passou por ela avancando o funil na mao (respostas_avaliacao 0, redacoes 0,
-- bigfive 0).
--
-- O conserto tem duas metades e esta e a segunda. A primeira esta no cliente:
-- `getRedacaoContext` passou a ler `testes_aplicaveis` da vaga e filtrar por
-- `codigos`, caindo na pergunta `is_padrao` quando nada e declarado.
--
-- Aqui as duas vagas no ar declaram `PADRAO_BS` — a pergunta marcada `is_padrao`,
-- sobre cuidar de alguem em momento de fragilidade. Para o SDR ela e quase a
-- descricao do cargo; para Social Media serve como leitura de escrita e de valores.
--
-- ⚠ `codigos` e ESCOPO DELIBERADO, nao fotografia. A distincao importa porque a
-- lista parece igual nos dois casos: aqui ela diz "esta vaga pede estas perguntas",
-- e nao "estas eram as perguntas que existiam no dia". Acrescentar pergunta ao
-- banco NAO deve mudar esta lista sozinho — e por isso que ela e escrita.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

UPDATE public.vagas v
   SET testes_aplicaveis = (
         SELECT jsonb_agg(
                  CASE WHEN t->>'teste' = 'redacao_cultural'
                       THEN t || jsonb_build_object('codigos', jsonb_build_array('PADRAO_BS'))
                       ELSE t END
                  ORDER BY idx
                )
           FROM jsonb_array_elements(v.testes_aplicaveis) WITH ORDINALITY AS e(t, idx)
       ),
       updated_at = NOW()
 WHERE v.deleted_at IS NULL
   AND v.status = 'ativa'
   AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(v.testes_aplicaveis) t
          WHERE t->>'teste' = 'redacao_cultural'
       );

DO $gate$
DECLARE
  r RECORD;
  v_cod text;
  v_existe int;
  v_com_escopo int := 0;
BEGIN
  FOR r IN
    SELECT v.slug, t AS elem
      FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
     WHERE v.deleted_at IS NULL AND v.status = 'ativa'
       AND t->>'teste' = 'redacao_cultural'
  LOOP
    IF r.elem->'codigos' IS NULL OR jsonb_array_length(r.elem->'codigos') = 0 THEN
      RAISE EXCEPTION 'a vaga % ficou sem `codigos` de redacao — cairia na pergunta padrao por acidente, nao por decisao', r.slug;
    END IF;

    -- ⚠ CADA CODIGO PRECISA EXISTIR E ESTAR ATIVO. Um codigo que nao casa com nada
    -- deixa o filtro verde e a etapa VAZIA: o candidato abriria a redacao e veria
    -- "Nenhuma redacao pendente" numa etapa obrigatoria. E o mesmo modo de falha do
    -- knockout que casa por texto — silencioso, e pior que o erro barulhento.
    FOR v_cod IN SELECT jsonb_array_elements_text(r.elem->'codigos') LOOP
      SELECT count(*) INTO v_existe
        FROM public.perguntas_redacao
       WHERE codigo = v_cod AND ativa IS TRUE;
      IF v_existe <> 1 THEN
        RAISE EXCEPTION 'a vaga % declara o codigo de redacao "%", que casa com % pergunta(s) ativa(s) — esperado exatamente 1; a etapa ficaria vazia', r.slug, v_cod, v_existe;
      END IF;
    END LOOP;

    v_com_escopo := v_com_escopo + 1;
  END LOOP;

  IF v_com_escopo = 0 THEN
    RAISE EXCEPTION 'nenhuma vaga ativa ficou com escopo de redacao declarado — o UPDATE nao pegou nada';
  END IF;

  RAISE NOTICE 'ok: % vaga(s) ativa(s) com escopo de redacao declarado e conferido', v_com_escopo;
END
$gate$;
