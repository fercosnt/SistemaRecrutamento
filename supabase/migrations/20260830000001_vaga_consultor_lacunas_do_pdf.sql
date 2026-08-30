-- =============================================================================
-- Migration: fecha as lacunas entre o descritivo em PDF e a vaga — vaga comercial
-- Date: 2026-08-30
-- =============================================================================
-- Confronto frase a frase entre `Descritivo_Cargo_SDR_Beauty_Smile_v3_brand.pdf` e a
-- vaga em PROD, feito antes de publicar. Seis trechos do PDF nao tinham
-- correspondencia no banco. O mais grave define o ESCOPO da funcao:
--
--   secao 03 do PDF: "A pessoa agenda para o closer (Dr. Fernando Costa Jr.) fechar;
--                     fecha diretamente apenas em excecao."
--
-- Sem isso o anuncio se le como vaga de vendedor que fecha — e quem se inscrevesse
-- esperando conduzir o fechamento descobriria o contrario depois de contratado. E o
-- tipo de omissao que o candidato so nota tarde.
--
-- Os outros cinco:
--   secao 04  o limite da base — "clientes ativos e recentes seguem com a equipe da
--             clinica". Sem a ressalva, "reativar clientes" se le como a carteira toda;
--   secao 04  o paragrafo inteiro sobre trabalhar junto ao marketing, manter-se
--             atualizado nos tratamentos e identificar fidelizacao e tratamentos
--             complementares — a parte do trabalho que nao e funil;
--   secao 10  a Politica de Remuneracao — SDR/Relacionamento, com valores por evento e
--             simulacao de ganhos, apresentada na entrevista. Sem ela, "premio sem
--             teto" fica no ar e a pessoa nao sabe onde ver os numeros exatos;
--   secao 08  o detalhamento do Pacote Google, fechado por completude.
--
-- Nenhum campo e reescrito: cada edicao e uma insercao pontual no texto existente.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig3$
DECLARE
  v_vaga  uuid;
  v_autor uuid;
  v_sc text; v_rs text; v_bf text; v_rt text;
  v_linha text;
BEGIN
  SELECT user_id INTO v_autor FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN RAISE EXCEPTION 'autor nao resolvido'; END IF;

  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN RAISE EXCEPTION 'vaga nao encontrada'; END IF;

  UPDATE public.vagas
     SET sobre_cargo        = $sc2$Na Beauty Smile, o tratamento entrega. O que estamos construindo agora é a experiência que antecede ele. Todos os dias, pessoas chegam até a clínica querendo resolver algo que carregam há anos — dor, medo, um sorriso que incomoda. Esta vaga existe para cuidar exatamente desse momento: o primeiro contato.

O foco não é "vendedor": é relacionamento. Além dos leads novos, esta pessoa também reativa a base parada e trabalha a segunda venda de quem já é paciente. Você vai trabalhar ao lado de profissionais formados nos principais centros de excelência do mundo, em uma operação enxuta onde cada melhoria aparece no resultado do mês seguinte — com autonomia para construir scripts, cadências e processo, contato direto com a gestão e com o Dr. Fernando Costa Jr., e trilha de carreira definida antes da contratação.

Objetivo do cargo: garantir que nenhum lead se perca entre o primeiro contato e a avaliação — respondendo com velocidade, qualificando com escuta e sustentando o follow-up até uma resposta clara. O sucesso é medido por agenda cheia de gente qualificada e paciente presente. A prioridade número um são os leads novos; a base entra de forma faseada. Você agenda para o closer — hoje o Dr. Fernando Costa Jr. — conduzir o fechamento; fechar diretamente acontece apenas em exceção.

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

Inscrição com algumas perguntas objetivas, análise do currículo, uma avaliação escrita e um caso prático de atendimento — depois entrevista. A avaliação escrita existe porque a função vende por escrito: é a competência que mais pesa aqui.$sc2$,
         responsabilidades  = $rs2$**Captação e primeiro contato.** Receber e responder leads de WhatsApp, Instagram (DMs, comentários e Stories), campanhas, telefone e indicações — sempre com prioridade máxima para o primeiro contato, seguindo roteiro de atendimento para uma experiência personalizada e consultiva.

**Qualificação consultiva.** Entender queixa, desejo estético, urgência e contexto de decisão; identificar perfil aderente aos tratamentos (ticket alto) e alinhar expectativas antes de ocupar a agenda clínica.

**Nutrição e follow-up.** Aquecer quem ainda não decidiu, sustentar cadências de follow-up até uma resposta clara (agenda, adia com data ou descarta) e contornar objeções iniciais de forma consultiva.

**Agendamento e comparecimento.** Agendar avaliações; confirmar, lembrar e reduzir ativamente o no-show; registrar 100% das interações no CRM em tempo real; enviar o relatório diário.

**Base (faseado).** Desde o início, de forma leve: reativar clientes e leads sem contato há 6+ meses, orçamentos em aberto e pedir indicações — clientes ativos e recentes seguem com a equipe da clínica. As campanhas estruturadas de reativação e upsell entram na etapa 3 da carreira.

**No dia a dia, além do funil.** Trabalhar junto ao marketing para alinhar campanhas, manter-se atualizado sobre os tratamentos da clínica e identificar oportunidades de fidelização e de tratamentos complementares.

### A rotina do dia a dia

A rotina roda em blocos, garantindo que o que gera resultado aconteça todo dia — não só quando sobra tempo.

- **Abertura** — revisão da agenda do dia, leads pendentes e prioridades.
- **Confirmações** — confirmar avaliações do dia e do dia seguinte; recontatar quem faltou.
- **Leads novos** — atendimento imediato de tudo que entrou; resposta rápida é o principal fator de conversão.
- **Follow-up quente** — contato com quem demonstrou interesse claro e ainda não agendou.
- **Follow-up frio / base** — reaquecer quem parou de responder, orçamentos em aberto e reativação de inativos.
- **Fechamento** — atualizar CRM, agendar lembretes e enviar o relatório do dia.

Rituais fixos: relatório diário, revisão semanal de pipeline com a gestão e análise mensal de indicadores.$rs2$,
         beneficios         = $bf2$### Remuneração

Modelo CLT com prêmio por metas — valor fixo por evento, **sem percentual sobre vendas**.

- **Salário fixo:** R$ 3.000/mês (CLT), pago na folha normal.
- **Prêmio por resultado:** valor fixo por comparecimento qualificado e por venda originada por você — lead novo, reativação ou 2ª venda da base. **Sem teto.**
- **Quanto dá na prática:** somando fixo + prêmio, a faixa realista de ganhos fica entre **R$ 4.000 e R$ 5.200+ por mês**, conforme o resultado, com upside livre para performance excepcional.
- **Ramp semestral:** fixo e prêmios evoluem a cada 6 meses conforme metas atingidas.
- **Apuração:** o prêmio por resultado é apurado no 5º dia útil e pago no 10º dia útil do mês seguinte. O salário fixo segue a folha normal.

Os valores por evento, uma simulação de ganhos e as regras completas estão na Política de Remuneração — SDR/Relacionamento, apresentada na entrevista.

### Benefícios

- Vale transporte e plano de saúde.
- Acesso ao Gympass.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Formação e acompanhamento em vendas (SDR, Farmer e CS) com **uma das principais consultorias comerciais do país**, incluindo aula semanal ao vivo, além de cursos e treinamentos internos.

*Benefícios válidos após o período de experiência (3 meses).*$bf2$,
         requisitos_tecnicos= $rt2$Atendimento e venda consultiva por WhatsApp (boa escrita, tom profissional); comunicação telefônica com naturalidade; organização de agenda, confirmações e follow-up; uso de CRM; Pacote Office e Pacote Google (Drive, Docs, Sheets, Gmail); leitura básica de indicadores (volume, conversão, comparecimento).

**Ferramentas do dia a dia:** GoHighLevel (CRM), Clinicorp, WhatsApp Business, Instagram e Facebook, Zoom/videoconferência e planilhas de controle.

**Contam pontos:** GoHighLevel, Clinicorp ou CRMs similares; Instagram como canal de relacionamento; noções de funil e marketing digital.$rt2$,
         updated_at = NOW(),
         updated_by = v_autor
   WHERE id = v_vaga;

  SELECT sobre_cargo, responsabilidades, beneficios, requisitos_tecnicos
    INTO v_sc, v_rs, v_bf, v_rt FROM public.vagas WHERE id = v_vaga;

  -- ── Portao 1: os seis trechos do PDF chegaram ao texto visivel ──────────
  IF v_sc NOT LIKE '%agenda para o closer%' THEN
    RAISE EXCEPTION 'o escopo do fechamento nao entrou — o anuncio seguiria se lendo como vaga de quem fecha';
  END IF;
  IF v_rs NOT LIKE '%clientes ativos e recentes seguem com a equipe%' THEN
    RAISE EXCEPTION 'o limite da base nao entrou';
  END IF;
  IF v_rs NOT LIKE '%junto ao marketing%' THEN
    RAISE EXCEPTION 'o paragrafo de marketing e fidelizacao nao entrou';
  END IF;
  IF v_bf NOT LIKE '%Política de Remuneração%' THEN
    RAISE EXCEPTION 'a referencia a Politica de Remuneracao nao entrou';
  END IF;
  IF v_rt NOT LIKE '%Drive, Docs, Sheets%' THEN
    RAISE EXCEPTION 'o detalhamento do Pacote Google nao entrou';
  END IF;

  -- ── Portao 2: o que JA existia continua la ─────────────────────────────
  -- Uma edicao pontual que apagasse o resto passaria em todos os portoes acima.
  IF v_sc NOT LIKE '%Eliseu Guilherme%' OR v_sc NOT LIKE '%### Como o desempenho é medido%' THEN
    RAISE EXCEPTION 'a edicao comeu o conteudo que a migration anterior levou ao sobre_cargo';
  END IF;
  IF v_rs NOT LIKE '%### A rotina do dia a dia%' THEN
    RAISE EXCEPTION 'a edicao comeu a secao de rotina das responsabilidades';
  END IF;
  IF v_bf NOT LIKE '%Gympass%' OR v_bf NOT LIKE '%### Benefícios%' THEN
    RAISE EXCEPTION 'a edicao comeu a secao de beneficios';
  END IF;

  -- ── Portao 3: marcas que o TextoRico nao entende, nos QUATRO campos ────
  FOR v_linha IN
    SELECT unnest(string_to_array(v_sc, E'\n'))
    UNION ALL SELECT unnest(string_to_array(v_rs, E'\n'))
    UNION ALL SELECT unnest(string_to_array(v_bf, E'\n'))
    UNION ALL SELECT unnest(string_to_array(v_rt, E'\n'))
  LOOP
    IF v_linha ~ '^#[^#]' OR v_linha ~ '^#{5,}' THEN
      RAISE EXCEPTION 'titulo fora da faixa 2-4 "#" em "%"', left(v_linha, 60);
    END IF;
    IF v_linha ~ '\[[^]]*\]\([^)]*\)' THEN
      RAISE EXCEPTION 'link markdown em "%" — vira texto literal', left(v_linha, 60);
    END IF;
    IF v_linha LIKE '%`%' OR v_linha LIKE '%~~%' OR v_linha LIKE '%***%' THEN
      RAISE EXCEPTION 'marca que o TextoRico nao entende em "%"', left(v_linha, 60);
    END IF;
    IF (length(v_linha) - length(replace(v_linha, '**', ''))) / 2 % 2 <> 0 THEN
      RAISE EXCEPTION 'negrito desemparelhado em "%" — o asterisco apareceria na tela', left(v_linha, 60);
    END IF;
  END LOOP;

  RAISE NOTICE 'ok: as seis lacunas do PDF fechadas';
END
$mig3$;
