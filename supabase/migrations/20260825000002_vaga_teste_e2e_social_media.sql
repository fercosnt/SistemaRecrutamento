-- =============================================================================
-- Migration: vaga de TESTE E2E — copia de social-media com as perguntas
-- Date: 2026-08-25
-- =============================================================================
--
-- POR QUE UMA COPIA, e nao testar na vaga real. A de Social Media esta ATIVA e
-- publicada: uma candidatura de teste nela polui o funil real, entra nos
-- relatorios e teria de ser desfeita depois. A copia isola o teste.
--
-- ⚠ POR QUE NAO USA O BOTAO "DUPLICAR" DA TELA. `VagasRHPage.duplicarMutation`
-- copia SOMENTE a linha de `vagas` — as perguntas ficam na original. Uma copia
-- feita por ali nasceria com ZERO perguntas, que e justamente o que este teste
-- precisa exercitar. Ela tambem nasce `inativa`, e o formulario publico so
-- enxerga vaga `ativa` (politica RLS "Publico ve perguntas de vagas ativas").
--
-- Esta migration copia a vaga E as perguntas, resolve o autor das duas coisas, e
-- nasce ATIVA de proposito — o alvo do teste e o fluxo publico do candidato.
--
-- ⚠ A COPIA CARREGA O KNOCKOUT. `pergunta_opcao_metadata` casa por TEXTO
-- (submit_candidatura_atomic), entao a opcao "apenas para trabalho remoto"
-- REJEITA a candidatura na inscricao tambem aqui. Isso e deliberado: e um dos
-- caminhos que o teste precisa exercitar. Quem quiser testar o caminho feliz
-- escolhe outra opcao.
--
-- LIMPEZA: `[TESTE E2E]` no titulo e `teste-e2e-` no slug tornam a vaga
-- identificavel para arquivamento depois. Ela NAO deve sobreviver ao teste.
--
-- Aditivo e reversivel. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $copia$
DECLARE
  v_autor    uuid;
  v_origem   uuid;
  v_nova     uuid;
  v_p        record;
  v_nova_p   uuid;
  v_n        int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido — a vaga de teste nasceria com created_by nulo';
  END IF;

  SELECT id INTO v_origem FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_origem IS NULL THEN
    RAISE EXCEPTION 'vaga de origem nao encontrada';
  END IF;

  -- Idempotencia: se a vaga de teste ja existe, nao duplica.
  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = 'teste-e2e-social-media' AND deleted_at IS NULL) THEN
    RAISE NOTICE 'vaga de teste ja existe — nada a fazer';
    RETURN;
  END IF;

  INSERT INTO public.vagas (
    slug, titulo, status, descricao_curta, subtitulo, departamento, tipo_contrato,
    modelo_trabalho, cidade, estado, jornada_trabalho, endereco_completo,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    sobre_cargo, sobre_empresa, perfil_ideal, responsabilidades,
    requisitos_formacao, requisitos_experiencia, requisitos_tecnicos,
    requisitos_habilidades, diferenciais, beneficios,
    secoes_extras, rubrica_ia, pesos_avaliacao, testes_aplicaveis,
    created_by, updated_by
  )
  SELECT
    'teste-e2e-social-media', '[TESTE E2E] ' || titulo, 'ativa',
    descricao_curta, subtitulo, departamento, tipo_contrato,
    modelo_trabalho, cidade, estado, jornada_trabalho, endereco_completo,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    sobre_cargo, sobre_empresa, perfil_ideal, responsabilidades,
    requisitos_formacao, requisitos_experiencia, requisitos_tecnicos,
    requisitos_habilidades, diferenciais, beneficios,
    secoes_extras, rubrica_ia, pesos_avaliacao, testes_aplicaveis,
    v_autor, v_autor
    FROM public.vagas WHERE id = v_origem
  RETURNING id INTO v_nova;

  -- As perguntas, uma a uma, para poder copiar o metadata de opcoes de cada.
  FOR v_p IN
    SELECT * FROM public.perguntas_formulario
     WHERE vaga_id = v_origem AND deleted_at IS NULL ORDER BY ordem
  LOOP
    INSERT INTO public.perguntas_formulario (
      vaga_id, bloco, ordem, texto_pergunta, texto_ajuda, tipo_resposta,
      opcoes_resposta, obrigatoria, limite_caracteres, created_by, updated_by
    ) VALUES (
      v_nova, v_p.bloco, v_p.ordem, v_p.texto_pergunta, v_p.texto_ajuda,
      v_p.tipo_resposta, v_p.opcoes_resposta, v_p.obrigatoria,
      v_p.limite_caracteres, v_autor, v_autor
    )
    RETURNING id INTO v_nova_p;

    -- Tags das opcoes (knockout inclusive). opcao_id novo: o sweep casa por TEXTO.
    INSERT INTO public.pergunta_opcao_metadata
      (pergunta_id, opcao_id, opcao_texto, tag, peso, nota_ia, ordem)
    SELECT v_nova_p, gen_random_uuid(), m.opcao_texto, m.tag, m.peso, m.nota_ia, m.ordem
      FROM public.pergunta_opcao_metadata m WHERE m.pergunta_id = v_p.id;
  END LOOP;

  -- Portao 1: as perguntas vieram todas, e com autor.
  SELECT count(*) INTO v_n FROM public.perguntas_formulario
   WHERE vaga_id = v_nova AND deleted_at IS NULL AND created_by IS NOT NULL;
  IF v_n <> (SELECT count(*) FROM public.perguntas_formulario
              WHERE vaga_id = v_origem AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'copiadas % perguntas com autor, mas a origem tem outra quantidade', v_n;
  END IF;

  -- Portao 2: o knockout casa por texto na COPIA. Sem isso ele seria letra morta
  -- aqui, e o teste concluiria que a rejeicao automatica nao funciona.
  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE f.vaga_id = v_nova AND m.tag = 'knockout'
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n < 1 THEN
    RAISE EXCEPTION 'nenhuma opcao knockout casa por texto na copia — o sweep nao a encontraria';
  END IF;

  RAISE NOTICE 'vaga de teste % criada, ativa, com perguntas e knockout', v_nova;
END
$copia$;
