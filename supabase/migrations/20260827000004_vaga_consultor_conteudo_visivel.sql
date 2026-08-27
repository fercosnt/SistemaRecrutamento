-- =============================================================================
-- Migration: leva ao candidato o que estava preso em campo invisivel — vaga comercial
-- Date: 2026-08-27
-- =============================================================================
-- A vaga `consultor-relacionamento-pre-vendas` tinha TRES campos com conteudo real
-- que NENHUMA tela renderiza (mapa de visibilidade da skill cadastro-de-vaga,
-- medido no app, nao suposto):
--
--   perfil_ideal       687 caracteres — o perfil E os indicadores de desempenho
--   endereco_completo  o endereco da clinica
--   jornada_trabalho   segunda a sexta, 9h-19h, 44h, CLT, compensacao de sabado
--
-- E `sobre_cargo` NAO repetia nada disso. Consequencia medida: quem se inscrevesse
-- nao saberia ONDE nem EM QUE HORARIO trabalharia, nem por quais numeros seria
-- cobrado — sendo que essas metas sao a base da premiacao, que e parte relevante da
-- remuneracao (fixo R$ 3.000 + premio, faixa realista de R$ 4.000 a R$ 5.200).
--
-- ⚠ E O MESMO DEFEITO DA VAGA DE SOCIAL MEDIA, pela mesma causa. La, `perfil_ideal`
-- guardava o teste pratico do processo seletivo e os indicadores; foi movido para
-- `sobre_cargo` em 20260824000002. O campo continua sem tela, entao o conserto e o
-- mesmo: mover o conteudo para onde ele e lido. As duas vagas ficam com a mesma
-- estrutura de secoes.
--
-- Os campos de origem NAO sao apagados: seguem como registro interno, e limpa-los
-- nao acrescenta nada. O que muda e o texto que o candidato le.
--
-- A secao "Como e o processo seletivo" descreve os testes REALMENTE configurados —
-- triagem, caso pratico (work_sample_sjt), avaliacao escrita (redacao_cultural) e
-- entrevista, os quatro obrigatorios de `testes_aplicaveis`. Big Five e cognitivo
-- ficam de fora do texto porque sao opcionais e nao sao aplicados a todo mundo.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig2$
DECLARE
  v_vaga  uuid;
  v_autor uuid;
  v_texto text;
  v_linha text;
BEGIN
  SELECT user_id INTO v_autor FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido';
  END IF;

  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga nao encontrada';
  END IF;

  UPDATE public.vagas
     SET sobre_cargo = $sc$Na Beauty Smile, o tratamento entrega. O que estamos construindo agora é a experiência que antecede ele. Todos os dias, pessoas chegam até a clínica querendo resolver algo que carregam há anos — dor, medo, um sorriso que incomoda. Esta vaga existe para cuidar exatamente desse momento: o primeiro contato.

O foco não é "vendedor": é relacionamento. Além dos leads novos, esta pessoa também reativa a base parada e trabalha a segunda venda de quem já é paciente. Você vai trabalhar ao lado de profissionais formados nos principais centros de excelência do mundo, em uma operação enxuta onde cada melhoria aparece no resultado do mês seguinte — com autonomia para construir scripts, cadências e processo, contato direto com a gestão e com o Dr. Fernando Costa Jr., e trilha de carreira definida antes da contratação.

Objetivo do cargo: garantir que nenhum lead se perca entre o primeiro contato e a avaliação — respondendo com velocidade, qualificando com escuta e sustentando o follow-up até uma resposta clara. O sucesso é medido por agenda cheia de gente qualificada e paciente presente. A prioridade número um são os leads novos; a base entra de forma faseada.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito.

### Quem se dá bem nesta vaga

Alguém que enxerga o primeiro contato como cuidado, e não como abordagem. Que se organiza por processo, sustenta follow-up sem constrangimento e sabe conversar sobre estética, saúde e dinheiro com naturalidade.

### Como o desempenho é medido

As metas abaixo foram calibradas com os dados reais da operação e servem de alvo e de base da premiação. Elas são combinadas antes de você começar, não descobertas depois.

- **Tempo médio de 1ª resposta** — até 5 minutos.
- **Leads contatados no mesmo dia** — 100%.
- **Taxa de agendamento**, agendamentos sobre leads trabalhados — 15%.
- **Taxa de comparecimento** — acima de 70%, com no-show abaixo de 30%.
- **Registro no CRM**, com etapa e próximo passo — 100%.
- **Reativações e indicações geradas na base** — meta mensal.

### Como é o processo seletivo

Inscrição com algumas perguntas objetivas, análise do currículo, uma avaliação escrita e um caso prático de atendimento — depois entrevista. A avaliação escrita existe porque a função vende por escrito: é a competência que mais pesa aqui.$sc$,
         updated_at = NOW(),
         updated_by = v_autor
   WHERE id = v_vaga;

  SELECT sobre_cargo INTO v_texto FROM public.vagas WHERE id = v_vaga;

  -- ── Portao 1: as quatro secoes chegaram ────────────────────────────────
  IF v_texto NOT LIKE '%### Onde e em que horário%' THEN
    RAISE EXCEPTION 'sobre_cargo ficou sem a secao de local e horario — o candidato voltaria a nao saber onde trabalharia';
  END IF;
  IF v_texto NOT LIKE '%### Como o desempenho é medido%' THEN
    RAISE EXCEPTION 'sobre_cargo ficou sem os indicadores — eles sao a base da premiacao e estavam invisiveis';
  END IF;
  IF v_texto NOT LIKE '%### Quem se dá bem nesta vaga%' THEN
    RAISE EXCEPTION 'sobre_cargo ficou sem a secao de perfil';
  END IF;
  IF v_texto NOT LIKE '%### Como é o processo seletivo%' THEN
    RAISE EXCEPTION 'sobre_cargo ficou sem a secao do processo seletivo';
  END IF;

  -- ── Portao 2: o endereco e o horario precisam estar LA DENTRO ──────────
  -- Conferir so o titulo da secao passaria com a secao vazia.
  IF v_texto NOT LIKE '%Eliseu Guilherme%' THEN
    RAISE EXCEPTION 'o endereco nao entrou no texto visivel';
  END IF;
  IF v_texto NOT LIKE '%9h às 19h%' THEN
    RAISE EXCEPTION 'o horario nao entrou no texto visivel';
  END IF;

  -- ── Portao 3: marcas que o TextoRico NAO entende viram texto literal ───
  -- Este e o defeito nº 1 desta base: ja apareceu duas vezes, literal na tela, e
  -- nenhum teste unitario o pegou. O portao varre o texto FINAL, nao o payload.
  FOR v_linha IN SELECT unnest(string_to_array(v_texto, E'\n')) LOOP
    IF v_linha ~ '^#[^#]' THEN
      RAISE EXCEPTION 'titulo de um "#" em "%" — o TextoRico so entende 2 a 4 e este apareceria literal', left(v_linha, 60);
    END IF;
    IF v_linha ~ '^#{5,}' THEN
      RAISE EXCEPTION 'titulo com 5+ "#" em "%"', left(v_linha, 60);
    END IF;
    IF v_linha ~ '\[[^]]*\]\([^)]*\)' THEN
      RAISE EXCEPTION 'link markdown em "%" — vira texto literal com colchetes e parenteses', left(v_linha, 60);
    END IF;
    IF v_linha LIKE '%`%' THEN
      RAISE EXCEPTION 'crase em "%" — o TextoRico nao entende codigo', left(v_linha, 60);
    END IF;
    IF v_linha LIKE '%~~%' THEN
      RAISE EXCEPTION 'riscado em "%"', left(v_linha, 60);
    END IF;
    IF v_linha LIKE '%***%' THEN
      RAISE EXCEPTION 'tres asteriscos em "%" — o parser casa ** primeiro e sobra um * orfao', left(v_linha, 60);
    END IF;
    -- ** desemparelhado apareceria como asterisco na tela.
    IF (length(v_linha) - length(replace(v_linha, '**', ''))) / 2 % 2 <> 0 THEN
      RAISE EXCEPTION 'negrito desemparelhado em "%" — o asterisco apareceria na tela', left(v_linha, 60);
    END IF;
  END LOOP;

  RAISE NOTICE 'ok: sobre_cargo com % caracteres e as quatro secoes', length(v_texto);
END
$mig2$;
