-- =============================================================================
-- Migration: vaga sdr-relacionamento-pre-vendas (Consultor(a) de Relacionamento e Pré-vendas) — nova rodada de SDR
-- Date: 2026-10-14
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro: revisao de redacao, avaliacao de entrevista, decisao final e
-- reprocessamento. O bloco abaixo resolve o autor e ABORTA se nao achar, em vez
-- de gravar NULL calado. A tela do RH nao cria vaga do zero; vaga nova com
-- perguntas so nasce por migration.
--
-- POR QUE UMA VAGA NOVA, e nao reabrir `consultor-relacionamento-pre-vendas`
-- (decisao do operador, 2026-10-14): aquela vaga tem 10 candidaturas de uma
-- rodada encerrada. Reabri-la poria candidatos antigos e novos no mesmo ranking e
-- no mesmo comparativo. Ela fica intacta, com o historico.
--
-- FONTE: docs/vagas/sdr-relacionamento-pre-vendas.md e o payload em
-- docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json. Os campos que nao mudaram
-- foram EXTRAIDOS por script da vaga antiga (lida do banco), nunca transcritos —
-- inclusive a rubrica, aprovada e calibrada na rodada anterior, e as 5 perguntas.
-- O que e novo (decisoes do operador, 2026-10-14): o processo seletivo reescrito em
-- sobre_cargo; a remuneracao SEM valores em reais (o modelo fica, os numeros vao para a
-- entrevista); o perfil_ideal escrito para o guia de entrevista; a REDACAO CULTURAL SAI dos
-- testes (a PADRAO_BS nao media o cargo; o que ela tentava medir entrou no caso aberto, que
-- agora tem follow-up de 7 dias e contorno de objecao — migration 20261014000102); e os pesos
-- 25/40/0/35. Lembrete: consolidar-decisao-final NAO pondera a triagem (UX-09) — o composto
-- usa sjt e entrevista, que renormalizados dao ~53% / ~47%.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (`publish_vaga`). Este arquivo ja confere, depois dos INSERTs, os portoes
-- daquela RPC — para a vaga nao nascer impublicavel.
--
-- KNOCKOUT: a opcao "Tenho disponibilidade apenas para trabalho remoto" da pergunta 1
-- encerra a candidatura na inscricao — o mesmo da vaga antiga, reaprovado pelo
-- operador para esta. E escrito DIRETO em `pergunta_opcao_metadata`: a RPC
-- oficial le `auth.jwt()`, que a via de apply nao carrega. O sweep de
-- `submit_candidatura_atomic` casa por TEXTO, entao a guarda abaixo aborta se
-- algum texto do metadata nao casar com `opcoes_resposta`.
--
-- ANUNCIO x RUBRICA: `sobre_cargo`/`requisitos_*` sao a copia que ATRAI;
-- `rubrica_ia` e o criterio que AVALIA. `qualificacao_etapa1` nao e tocado.
-- `aplica_cognitivo` fica false: ele liga a prova textual, de banco vazio.
--
-- Aditivo e reversivel. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $vaga$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_pk    uuid;
  v_n     int;
  v_m     int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br'
     AND ativo IS TRUE
     AND deleted_at IS NULL;

  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — a vaga nasceria com created_by nulo',
      'fernando@beautysmile.com.br';
  END IF;

  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = 'sdr-relacionamento-pre-vendas') THEN
    RAISE EXCEPTION 'ja existe vaga com slug % — nada a fazer', 'sdr-relacionamento-pre-vendas';
  END IF;

  INSERT INTO public.vagas (
    slug, titulo, subtitulo, status,
    descricao_curta, departamento, tipo_contrato, modelo_trabalho,
    cidade, estado, endereco_completo, jornada_trabalho,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    data_abertura, aplica_cognitivo,
    sobre_cargo, responsabilidades,
    requisitos_formacao, requisitos_experiencia,
    requisitos_tecnicos, requisitos_habilidades,
    diferenciais, beneficios, sobre_empresa, perfil_ideal,
    secoes_extras, rubrica_ia,
    pesos_avaliacao, testes_aplicaveis,
    created_by, updated_by
  )
  VALUES (
    'sdr-relacionamento-pre-vendas', $tit$Consultor(a) de Relacionamento e Pré-vendas$tit$, $sub$Também divulgada como "Analista de Relacionamento Comercial" · função interna: SDR / Pré-vendas · Trilha para Coordenação ou Closer$sub$, 'rascunho',
    $dcurta$A porta de entrada comercial da clínica: responder rápido, entender o que a pessoa procura, construir confiança e levá-la até a avaliação — com ela comparecendo.$dcurta$, 'Comercial', 'CLT', 'Presencial',
    $cid$São Paulo$cid$, 'SP', $ender$Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP$ender$, $jorn$Presencial, segunda a sexta, das 9h às 19h com 1h12 de intervalo — 44h semanais, CLT, com compensação do sábado por acordo escrito.$jorn$,
    3000, 5200, false, 1,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$Na Beauty Smile, o tratamento entrega. O que estamos construindo agora é a experiência que antecede ele. Todos os dias, pessoas chegam até a clínica querendo resolver algo que carregam há anos — dor, medo, um sorriso que incomoda. Esta vaga existe para cuidar exatamente desse momento: o primeiro contato.

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

Inscrição com cinco perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia do pré-vendas e um caso prático — responder por escrito a uma mensagem real de WhatsApp, planejar o follow-up de quem não respondeu e contornar uma objeção de preço. Por fim, entrevista.

O caso prático e a entrevista são as etapas que mais pesam. Esta função vende por escrito, e escrever para alguém inseguro, que pergunta o preço antes de qualquer coisa, é a competência central do cargo.$scargo$,
    $resp$**Captação e primeiro contato.** Receber e responder leads de WhatsApp, Instagram (DMs, comentários e Stories), campanhas, telefone e indicações — sempre com prioridade máxima para o primeiro contato, seguindo roteiro de atendimento para uma experiência personalizada e consultiva.

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

Rituais fixos: relatório diário, revisão semanal de pipeline com a gestão e análise mensal de indicadores.$resp$,
    $rform$Ensino médio completo. Superior cursando ou completo conta pontos.$rform$,
    $rexp$Mínimo de 1 ano em atendimento, vendas, recepção ou relacionamento. Contam pontos: experiência em clínica odontológica, estética ou saúde; venda de ticket médio/alto; experiência como SDR, pré-vendas, social seller ou inside sales.$rexp$,
    $rtec$Atendimento e venda consultiva por WhatsApp (boa escrita, tom profissional); comunicação telefônica com naturalidade; organização de agenda, confirmações e follow-up; uso de CRM; Pacote Office e Pacote Google (Drive, Docs, Sheets, Gmail); leitura básica de indicadores (volume, conversão, comparecimento).

**Ferramentas do dia a dia:** GoHighLevel (CRM), Clinicorp, WhatsApp Business, Instagram e Facebook, Zoom/videoconferência e planilhas de controle.

**Contam pontos:** GoHighLevel, Clinicorp ou CRMs similares; Instagram como canal de relacionamento; noções de funil e marketing digital.$rtec$,
    $rhab$Excelente comunicação escrita; facilidade com tecnologia; disponibilidade integral e presencial (segunda a sexta); rotina organizada e histórico de cumprir prazos.

**Comportamentais:**

- **Comunicação** — fala e escreve bem sobre estética, saúde e dinheiro.
- **Organização** — opera com processo, não com memória.
- **Proatividade.**
- **Empatia** — entende a insegurança por trás de um orçamento.
- **Resiliência** — lida com "não" e com silêncio.
- **Foco em meta** e ambição saudável.$rhab$,
    $dif$Contato direto com a gestão e com o Dr. Fernando Costa Jr., autonomia para construir scripts, cadências e processo, e trilha de carreira definida **antes** da contratação.

### Plano de evolução da carreira

1. **SDR / Relacionamento** *(foco atual)* — captação, 1º contato, qualificação, nutrição, follow-up e agendamento com alto comparecimento. Abre a próxima etapa com metas de agendamento e comparecimento atingidas por 2 meses seguidos e CRM confiável.
2. **Jornada do paciente** — acompanhamento antes e durante a consulta, apoio ao processo comercial e transição gradual do fechamento (hoje conduzido pelo Dr. Fernando Costa Jr.), incluindo pós-venda.
3. **Expansão comercial** — campanhas de reativação da base, upsell e cross-sell, recuperação de oportunidades e programa de indicações; receita ativa a partir da base.
4. **Coordenação Comercial OU Closer** — dois caminhos: liderar o comercial (metas, políticas, formação de time) ou seguir como Closer (condução e fechamento das vendas). A escolha depende do perfil demonstrado.$dif$,
    $ben$### Remuneração

Modelo CLT com prêmio por metas — valor fixo por evento, **sem percentual sobre vendas**.

- **Salário fixo** em regime CLT, pago na folha normal.
- **Prêmio por resultado:** valor fixo por comparecimento qualificado e por venda originada por você — lead novo, reativação ou 2ª venda da base. **Sem teto.**
- **Ramp semestral:** fixo e prêmios evoluem a cada 6 meses conforme metas atingidas.
- **Apuração:** o prêmio por resultado é apurado no 5º dia útil e pago no 10º dia útil do mês seguinte. O salário fixo segue a folha normal.

Os valores, uma simulação de ganhos e as regras completas estão na Política de Remuneração — SDR/Relacionamento, apresentada na entrevista.

### Benefícios

- Vale transporte e plano de saúde.
- Acesso ao Gympass.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Formação e acompanhamento em vendas (SDR, Farmer e CS) com **uma das principais consultorias comerciais do país**, incluindo aula semanal ao vivo, além de cursos e treinamentos internos.

*Benefícios válidos após o período de experiência (3 meses).*$ben$,
    $semp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$semp$,
    $perfil$Já atendeu ou vendeu por escrito como atividade central, com volume, e sustenta follow-up sem constrangimento e sem pressão. Opera com processo e CRM, não com memória. Vende a avaliação, não o tratamento: qualifica antes de agendar, mesmo com a meta apertada. Na entrevista, fazer role-play de WhatsApp — «quanto custa?» logo na primeira mensagem, «vou falar com meu marido» e o lead que sumiu depois de receber horários — e observar se pergunta antes de responder, se propõe horários concretos e se respeita o paciente. Sondar: o que faz com lead fora do perfil no fim do mês, abaixo da meta; como organiza 20 leads novos de uma vez; como já reduziu falta na agenda. Riscos: quem só atendeu de forma passiva, quem agenda sem qualificar e quem promete resultado.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
  A Etapa 1 coleta isso em faixas nomeadas ("Menos de 1 ano em atendimento, vendas,
  recepção ou relacionamento com cliente", "Entre 1 e 2 anos…").
  ⚠ DIVERGÊNCIA entre a faixa declarada e as datas do currículo: fique com a MAIOR
  das duas e comente em `reasoning` — nunca em `gaps`. Gap de experiência só quando
  AMBAS ficam abaixo de 1 ano. Resumo do candidato ("atuo há 2 anos") conflitando
  com as datas que ele mesmo lista é imprecisão de redação, não falta de experiência.
- Disponibilidade integral e presencial, de segunda a sexta.
  ⚠ ISTO NÃO SE JULGA PELO CURRÍCULO, e desde 2026-08-27 não precisa: a Etapa 1 tem
  pergunta obrigatória sobre disponibilidade, e a resposta chega em texto que se explica
  sozinho.
  · "…integral e presencial, de segunda a sexta, no horário comercial" → atendido.
  · "…integral e presencial, mas precisaria ajustar o horário de entrada ou de saída"
    → atendido, com observação sobre o ajuste. Querer negociar horário não é
    indisponibilidade, e tratar como se fosse cortaria gente por um pedido legítimo.
  · "…apenas parcial, em alguns dias da semana" → gap `critical`.
  · nenhuma frase sobre disponibilidade nas respostas → `insufficient_evidence`, nunca
    ausência: seria descontar do candidato uma falha do sistema.
  O silêncio do CURRÍCULO sobre disponibilidade continua não sendo evidência de nada.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo — uma disponibilidade
declarada na Etapa 1 conta tanto quanto se estivesse no CV. Se algum item vier sem a
linha «Pergunta:», identifique-o pelo próprio conteúdo.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`: `critical` segura o score abaixo de 40, e usá-lo numa competência impõe
uma penalidade que ninguém decidiu para aquele caso.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Comunicação escrita profissional
   Peso ALTO. A função é atender e vender por escrito.
   5 = atendimento ou venda por escrito como atividade central, com volume.
   3 = escreveu no trabalho, mas de forma acessória.
   1 = nenhuma evidência de escrita profissional.
   Considere também a clareza e a ortografia do próprio currículo como evidência.

2. Venda consultiva e follow-up
   Peso ALTO.
   5 = responsável por prospecção, cadência e retomada de contato, com meta (SDR,
       pré-vendas, inside sales, social seller).
   3 = vendeu de forma reativa, balcão ou atendimento passivo.
   1 = nenhuma experiência comercial.

3. Disciplina de processo e CRM
   Peso MÉDIO.
   5 = operou CRM diariamente (GoHighLevel, Clinicorp, RD, HubSpot, Pipedrive ou similar).
   3 = organizou agenda ou follow-up por planilha ou sistema próprio.
   1 = nenhuma evidência de registro ou processo.
   A Etapa 1 pergunta isto de frente: marcar "Registro de todo contato em CRM (…)" na
   lista de rotina é evidência forte. Não ter marcado, tendo marcado OUTRAS opções da
   mesma lista, é evidência de ausência — a pessoa teve onde dizer e não disse. Mas
   marcar apenas "Nenhuma destas ainda é rotina do meu trabalho" não anula o que o
   currículo comprovar: some as duas fontes, não substitua uma pela outra.

4. Contexto de decisão que envolve dinheiro e insegurança
   Peso MÉDIO. Conta ponto, não elimina.
   5 = saúde, odontologia ou estética, OU venda de ticket médio/alto com negociação
       de orçamento.
   3 = varejo ou serviço de ticket baixo.
   1 = nenhum contato com cliente final.
   A Etapa 1 coleta isto diretamente, e as respostas mapeiam na régua acima:
   "…em clínica odontológica, estética ou de saúde" e "…em outro setor (imóveis,
   veículos, educação, serviços financeiros)" → faixa 5; "…mas em produto ou serviço de
   ticket baixo" → faixa 3; "Ainda não atendi cliente final nesse tipo de decisão" →
   faixa 1. Isto é ponto, não corte: a faixa 1 aqui NUNCA vira gap `critical`.

5. Consistência
   Peso BAIXO.
   Avalie permanência e histórico de cumprir meta ou prazo, quando houver evidência.
   NÃO penalize número de empregos, troca de área ou intervalo entre empregos —
   isso não é evidência de desempenho.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Ter ou não ter curso superior além do ensino médio exigido; prestígio da instituição.
- Tempo em desemprego.
- "Perfil jovem", "boa energia", "boa aparência", "proatividade" sem evidência citável.
- Os adjetivos do anúncio da vaga — "operação enxuta", "ambição saudável", "trilha de
  carreira". Descrevem a EMPRESA e não são critério sobre o candidato.

Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.$rub$,
    $pesos${"triagem":25,"work_sample_sjt":40,"redacao_cultural":0,"entrevista":35}$pesos$::jsonb,
    $testes$[{"teste":"triagem","customizado":false,"obrigatorio":true},{"cargo":"sdr-social-seller","teste":"work_sample_sjt","customizado":false,"obrigatorio":true},{"teste":"big_five","customizado":false,"obrigatorio":false},{"teste":"cognitivo","customizado":false,"obrigatorio":false},{"teste":"entrevista","customizado":false,"obrigatorio":true}]$testes$::jsonb,
    v_autor, v_autor
  )
  RETURNING id INTO v_vaga;

  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, p.ordem, p.texto, p.ajuda,
         p.tipo::tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
      ('jornada', 1, $q1$Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, de segunda a sexta, das 9h às 19h?$q1$, NULL::text,
       'single_choice', $o1$["Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial","Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída","Tenho disponibilidade apenas parcial, em alguns dias da semana","Tenho disponibilidade apenas para trabalho remoto"]$o1$::jsonb, true, NULL::int),
      ('curriculo', 2, $q2$Há quanto tempo você trabalha com atendimento, vendas, recepção ou relacionamento com cliente?$q2$, NULL::text,
       'single_choice', $o2$["Menos de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente","Entre 1 e 2 anos em atendimento, vendas, recepção ou relacionamento com cliente","Entre 2 e 5 anos em atendimento, vendas, recepção ou relacionamento com cliente","Mais de 5 anos em atendimento, vendas, recepção ou relacionamento com cliente"]$o2$::jsonb, true, NULL::int),
      ('tecnologia', 3, $q3$Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?$q3$, NULL::text,
       'multiple_choice', $o3$["Atendimento e venda por WhatsApp, escrevendo eu mesmo as mensagens","Prospecção ativa e follow-up de quem não respondeu, seguindo uma cadência definida","Registro de todo contato em CRM (GoHighLevel, RD Station, HubSpot, Pipedrive, Clinicorp ou similar)","Agendamento, confirmação e trabalho ativo para reduzir falta na agenda","Atendimento por Direct do Instagram ou por comentários, como canal de vendas","Acompanhamento de indicadores de conversão e de comparecimento","Nenhuma destas ainda é rotina do meu trabalho"]$o3$::jsonb, true, NULL::int),
      ('curriculo', 4, $q4$Você já atendeu ou vendeu em um contexto em que a pessoa decide sobre um valor alto e sente insegurança?$q4$, NULL::text,
       'single_choice', $o4$["Sim, atendi cliente decidindo valor alto em clínica odontológica, estética ou de saúde","Sim, atendi cliente decidindo valor alto em outro setor (imóveis, veículos, educação, serviços financeiros)","Atendi cliente final, mas em produto ou serviço de ticket baixo","Ainda não atendi cliente final nesse tipo de decisão"]$o4$::jsonb, true, NULL::int),
      ('valores', 5, $q5$O que mais te atrai nesta vaga?$q5$, NULL::text,
       'single_choice', $o5$["Ser o primeiro contato de quem chega buscando resolver algo que carrega há anos","A trilha de carreira definida, que pode levar a Coordenação Comercial ou a Closer","Construir os scripts, as cadências e o processo comercial com autonomia","O prêmio por resultado sem teto, atrelado a comparecimento e a venda"]$o5$::jsonb, true, NULL::int)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- ── knockout da pergunta 1 ─────────────────────────────────────────────
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 1 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial$k1$, 'neutro', 1),
      ($k2$Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída$k2$, 'neutro', 2),
      ($k3$Tenho disponibilidade apenas parcial, em alguns dias da semana$k3$, 'neutro', 3),
      ($k4$Tenho disponibilidade apenas para trabalho remoto$k4$, 'knockout', 4)
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta. Compara com o
  -- tamanho do proprio array, nao com constante.
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE f.vaga_id = v_vaga AND m.tag = 'knockout'
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes), esperado exatamente 1', v_n;
  END IF;

  -- ── portoes do publish_vaga, conferidos agora ─────────────────────────────
  -- Os tetos 10 e 1 sao do publish_vaga (escopo deliberado da RPC, nao fotografia).
  SELECT count(*) INTO v_n FROM public.perguntas_formulario WHERE vaga_id = v_vaga;
  IF v_n > 10 THEN
    RAISE EXCEPTION '% perguntas — publish_vaga aceita no maximo 10', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND tipo_resposta IN ('texto_curto', 'texto_longo');
  IF v_n > 1 THEN
    RAISE EXCEPTION '% perguntas abertas — publish_vaga aceita no maximo 1', v_n;
  END IF;
  SELECT count(DISTINCT f.id) INTO v_n
    FROM public.perguntas_formulario f
    JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = f.id AND m.tag = 'knockout'
   WHERE f.vaga_id = v_vaga AND f.obrigatoria IS NOT TRUE;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% pergunta(s) com knockout nao obrigatoria(s) — publish_vaga recusaria', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND created_by IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% pergunta(s) sem autor', v_n;
  END IF;

  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'work_sample_sjt')::int
       + (pesos_avaliacao->>'redacao_cultural')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_n FROM public.vagas WHERE id = v_vaga;
  IF v_n IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'pesos somam % — publish_vaga exige 100', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
   WHERE v.id = v_vaga AND (t->>'obrigatorio')::boolean IS TRUE;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — publish_vaga recusaria';
  END IF;

  -- ── o que o publish_vaga NAO confere: o banco do cargo tem itens? ──────────
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t, public.perguntas q
   WHERE v.id = v_vaga AND t->>'teste' = 'work_sample_sjt'
     AND q.tipo = 'sjt' AND q.status = 'active' AND q.formato = 'mc'
     AND q.cargo = t->>'cargo';
  IF v_n = 0 THEN
    RAISE EXCEPTION 'o banco SJT do cargo apontado nao tem item de multipla escolha ativo';
  END IF;
  SELECT count(*) INTO v_n
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t,
         jsonb_array_elements_text(t->'codigos') c
   WHERE v.id = v_vaga AND t->>'teste' = 'redacao_cultural'
     AND NOT EXISTS (SELECT 1 FROM public.perguntas_redacao r WHERE r.codigo = c AND r.ativa IS TRUE);
  IF v_n > 0 THEN
    RAISE EXCEPTION '% codigo(s) de redacao sem enunciado ativo', v_n;
  END IF;

  RAISE NOTICE 'vaga % criada como rascunho, autor %, knockout armado na pergunta %', v_vaga, v_autor, v_pk;
END
$vaga$;
