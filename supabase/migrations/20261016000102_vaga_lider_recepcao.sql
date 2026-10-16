-- =============================================================================
-- Migration: vaga lider-recepcao (Líder de Recepção)
-- Date: 2026-10-16
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro. O bloco abaixo resolve o autor e ABORTA se nao achar. A tela do RH nao
-- cria vaga do zero; vaga nova com perguntas so nasce por migration.
--
-- FONTE: docs/vagas/lider-recepcao.md e o payload em
-- docs/vagas/proveniencia/lider-recepcao.payload.json, montado a partir do descritivo
-- antigo de Recepcionista e do formulario antigo colados pelo operador (2026-10-16)
-- e das decisoes dele: a lideranca comeca sozinha na recepcao e monta a equipe;
-- fidelizacao SEM vender (orcamento e valores sao do Dr. Fernando e do pre-vendas);
-- 2+ anos de recepcao/atendimento como eliminatorio da triagem; lideranca formal
-- NAO eliminatoria; CLT presencial, sem valores no anuncio (faixa so no banco, nao
-- exibida); redacao C1 (melhoria de processo); pesos do template recepcionista
-- (25/30/20/25). O banco SJT do cargo NOVO `lider-recepcao` nasce na migration
-- 20261016000101, que tem de estar aplicada antes desta (o portao do banco abaixo
-- aborta sem ela).
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (`publish_vaga`). Este arquivo ja confere, depois dos INSERTs, os portoes
-- daquela RPC — para a vaga nao nascer impublicavel.
--
-- KNOCKOUT: 1 opcao(oes) encerram a candidatura na inscricao (aprovadas pelo
-- operador): pergunta 1: "Tenho disponibilidade apenas para trabalho remoto". E escrito DIRETO em `pergunta_opcao_metadata`: a RPC
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


  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = 'lider-recepcao') THEN
    RAISE EXCEPTION 'ja existe vaga com slug % — nada a fazer', 'lider-recepcao';
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
    'lider-recepcao', $tit$Líder de Recepção$tit$, $sub$Recepção, agenda e experiência do paciente · CLT presencial · unidade Paraíso$sub$, 'rascunho',
    $dcurta$Para quem já é referência em recepção: cuidar da primeira e da última impressão do paciente, responder pela agenda e pelo padrão de atendimento e formar a equipe que vem. CLT, presencial no Paraíso, em São Paulo.$dcurta$, 'Atendimento', 'CLT', 'Presencial',
    $cid$São Paulo$cid$, 'SP', $ender$Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP$ender$, $jorn$Presencial, segunda a sexta, das 9h às 19h com 1h12 de intervalo — 44h semanais, CLT, com compensação do sábado por acordo escrito.$jorn$,
    3000, 4000, false, 1,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Muitos dos nossos pacientes chegam com medo de dentista, e a primeira e a última impressão da clínica acontecem na recepção.

Buscamos alguém que já seja referência em recepção para **responder pela recepção**: cuidar de cada paciente da chegada à saída, organizar a agenda e o padrão de atendimento, e formar a equipe que vem.

**A equipe.** Você começa como a pessoa da recepção. Conforme a clínica cresce, é você quem treina e lidera as próximas recepcionistas.

**O que esta vaga não é.** Não é vaga de vendas. Você cuida do relacionamento e do retorno dos pacientes; orçamento e valores ficam com o Dr. Fernando e a equipe de pré-vendas.

### O que acompanhamos com você

- Confirmação das consultas e faltas na agenda.
- Tempo de resposta no WhatsApp da clínica.
- Satisfação dos pacientes e reclamações resolvidas.
- Retorno e manutenção dos pacientes em tratamento.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h, com 1h12 de intervalo — 44h semanais, em regime CLT, com compensação do sábado por acordo escrito.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia da recepção, um caso escrito e uma redação curta. Depois, entrevista.$scargo$,
    $resp$- **Atendimento.** Receber os pacientes pelo nome, com calma e cuidado — inclusive quem chega com medo — e atender telefone, WhatsApp e e-mail com agilidade.
- **Agenda.** Marcar, confirmar e encaixar consultas, trabalhar para reduzir faltas e avisar o paciente com antecedência quando houver atraso.
- **Documentos e LGPD.** Cuidar do cadastro, dos termos e dos exames dos pacientes, com o arquivamento correto e a proteção de dados que a LGPD exige.
- **Administrativo.** Receber pagamentos, fechar o caixa do dia, controlar o estoque de materiais da recepção e apoiar a equipe em demandas administrativas.
- **Relacionamento.** Acompanhar o retorno dos pacientes em tratamento, coletar a opinião deles, resolver reclamações até o fim e promover o programa de indicação. Interesse em novo procedimento vai para a avaliação, nunca para uma conversa de preço na recepção.
- **Processo e equipe.** Manter os checklists e o padrão de atendimento da recepção, propor melhorias e treinar quem chegar para trabalhar com você.$resp$,
    $rform$Ensino médio completo.$rform$,
    $rexp$**Pelo menos 2 anos em recepção ou atendimento ao cliente.**

**Contam pontos:** recepção de clínica odontológica ou da área da saúde; ter treinado colegas, montado escala ou respondido pela recepção na ausência da liderança.$rexp$,
    $rtec$Sistema de agendamento (qualquer um); WhatsApp Business; planilhas, como Excel ou Google Planilhas; cuidado com dados de pacientes (LGPD).

**Contam pontos:** Clinicorp; recebimento de pagamentos e fechamento de caixa; controle de estoque. Se você nunca usou o Clinicorp, a clínica treina.$rtec$,
    $rhab$- **Responsável pelo processo** — segue o que está combinado e, quando algo não funciona, propõe a mudança e testa.
- **Comunicação** — escreve e fala com clareza, com o paciente e com a equipe.
- **Calma sob pressão** — agenda cheia, paciente irritado e telefone tocando ao mesmo tempo.
- **Organização** — prioriza o que importa e não deixa nada se perder entre um turno e outro.
- **Discrição** — trata os dados e a história de cada paciente com sigilo.$rhab$,
    $dif$- Experiência em recepção de clínica odontológica ou da área da saúde.
- Experiência com o Clinicorp ou outro sistema de agenda de clínica.
- Experiência com gestão de documentos e LGPD.
- Experiência treinando colegas ou organizando a rotina de uma equipe de atendimento.$dif$,
    $ben$Contrato CLT, com salário fixo. Os valores são apresentados na entrevista.

- Vale-transporte e plano de saúde.
- Wellhub.
- Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna.
- Cursos e treinamentos internos.

*Benefícios válidos após o período de experiência (3 meses).*$ben$,
    $semp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$semp$,
    $perfil$Profissional de recepção experiente que já responde pelo processo e começa a liderar: cuida do paciente da confirmação à saída, chama pelo nome, avisa atraso antes de o paciente perguntar e trata o paciente com medo sem pressa. Mantém agenda, confirmação e checklist funcionando e muda o que não funciona. Não vende: leva interesse em procedimento para a avaliação. Na entrevista, sondar: uma melhoria que a pessoa fez na recepção e como mediu; um erro de agenda que foi dela e o que mudou depois; como trataria uma colega que atende com frieza; como lidou com um paciente irritado na frente de outros. Riscos: quem culpa o sistema ou o paciente, quem passa preço na recepção e quem leva problema de colega à coordenação sem falar com a colega.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Ensino médio completo. Currículo que não menciona escolaridade →
  `insufficient_evidence`, não ausência.
- Pelo menos 2 anos, somados, em recepção ou atendimento ao cliente. Some o
  currículo e a Etapa 1, que pergunta a faixa de tempo:
  · "Entre 2 e 5 anos…" ou "Mais de 5 anos…" → atendido.
  · "Menos de 1 ano…" ou "Entre 1 e 2 anos…" → gap `critical`, A MENOS que o
    currículo mostre 2 anos ou mais; nesse caso, atendido, com observação em
    `reasoning`.
  · sem resposta e currículo sem datas → `insufficient_evidence`.
- Disponibilidade presencial, de segunda a sexta. A Etapa 1 pergunta:
  · "…integral e presencial…" → atendido; "…mas precisaria ajustar o horário…" →
    atendido, com observação. Querer negociar horário não é indisponibilidade.
  · "…apenas parcial, em alguns dias da semana" → gap `critical`.
  · nenhuma resposta sobre disponibilidade → `insufficient_evidence`.

⚠ LIDERANÇA FORMAL NÃO É ELIMINATÓRIA (decisão do operador): a vaga começa com uma
pessoa só na recepção e forma a equipe depois. Nunca ter tido o cargo de líder não é
gap; ter treinado colegas, montado escala ou respondido pela recepção conta ponto na
competência 3.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo. Se algum item vier
sem a linha «Pergunta:», identifique-o pelo próprio conteúdo. A única pergunta
aberta (o que a pessoa fez nos últimos seis meses para trabalhar melhor) é opcional:
use como evidência quando existir; em branco não é gap.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Recepção e atendimento ao paciente, como rotina
   Peso ALTO.
   5 = recepção como função principal, presencial e por telefone ou WhatsApp, em
       clínica, consultório, hospital, laboratório ou serviço de alto padrão
       (hotelaria, por exemplo), com volume diário de pessoas.
   3 = atendimento ao cliente em outro contexto (varejo, call center, balcão) ou
       recepção como parte secundária de outra função.
   1 = nenhuma evidência de atendimento a pessoas.
   A Etapa 1 traz onde foi a experiência de recepção mais longa: clínica ou área da
   saúde posiciona no topo; os outros contextos são legítimos e ficam no meio — nunca
   gap por não ter vindo de clínica.

2. Agenda e controle de faltas
   Peso ALTO.
   5 = gerenciou a agenda de profissionais em sistema, com confirmação ativa,
       encaixes e trabalho para reduzir faltas; ou acompanhou o número de faltas.
   3 = agendou em sistema, planilha ou papel, sem evidência de confirmação ativa
       nem de cuidado com faltas.
   1 = nenhuma evidência de gestão de agenda.
   A Etapa 1 lista os sistemas de agenda que a pessoa já usou e as atividades que
   são rotina dela. Clinicorp conta ponto, mas a AUSÊNCIA dele não é gap: a clínica
   treina. Agenda só em planilha ou papel posiciona no máximo em 3.

3. Responsabilidade pelo processo, e o começo da liderança
   Peso MÉDIO.
   5 = criou ou mudou um processo, checklist, padrão de atendimento ou controle na
       recepção, e acompanhou se funcionou; OU treinou colegas, montou escala ou
       respondeu pela recepção na ausência da liderança.
   3 = seguia os processos com cuidado e era referência informal, sem evidência de
       ter mudado ou ensinado algo.
   1 = nenhuma evidência de responsabilidade além da própria tarefa.
   A Etapa 1 pergunta sobre responsabilidade além da própria função e sobre a
   relação com processos. "Prefiro resolver na hora, pela minha experiência" e
   "Adapto conforme o dia, sem registrar" limitam esta competência a no máximo 3 e
   devem ser comentadas em `reasoning` como tema de entrevista. Liderança formal
   conta ponto, nunca é corte.

4. Administrativo, financeiro básico e LGPD
   Peso MÉDIO.
   5 = recebimento de pagamentos e fechamento de caixa, controle de documentos,
       termos ou exames, e trato de dados sensíveis de pacientes ou clientes.
   3 = uma dessas frentes, ou apoio administrativo genérico.
   1 = nenhuma evidência.
   A Etapa 1 lista essas atividades entre as rotinas e pergunta as ferramentas que
   a pessoa usa (planilhas, WhatsApp Business): use como evidência declarada.

5. Relacionamento e fidelização, sem venda
   Peso BAIXO. Conta ponto, não elimina.
   5 = acompanhou retorno ou recall de pacientes, pesquisa de satisfação, programa
       de indicação, ou levou reclamações até a resolução.
   3 = tratou reclamações ou deu retorno a clientes de forma pontual.
   1 = nenhuma evidência.
   ⚠ A função NÃO vende: orçamento e valores ficam com o Dr. Fernando e o
   pré-vendas. Experiência com meta de venda, comissão ou fechamento não conta ponto
   aqui e não desconta — é outro trabalho.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Aparência, "boa apresentação", altura, voz, sotaque ou estilo pessoal — inferidos
  do currículo ou da foto.
- Tempo em desemprego, número de empregos, troca de área ou intervalo entre empregos.
- Curso superior ou técnico — o requisito é ensino médio; formação além disso não
  conta ponto nem desconta.
- Inglês ou outro idioma — não é requisito da função.
- Ter vindo ou não de clínica odontológica — posiciona na competência 1, nunca é corte.
- Ter ou não usado Clinicorp especificamente.
- Experiência ou meta de vendas, como ponto a favor ou contra.
- "Apaixonada por atendimento", "sorriso genuíno", "proativa", "perfil de líder" sem
  evidência citável, e os adjetivos do anúncio sobre a clínica, o laser ou o Dr. Fernando.

Todo ponto forte e todo gap deve citar trecho literal do currículo ou da resposta. Se
não há trecho que permita julgar uma competência, use `insufficient_evidence` — é
melhor que chutar.$rub$,
    $pesos${"triagem":25,"work_sample_sjt":30,"redacao_cultural":20,"entrevista":25}$pesos$::jsonb,
    $testes$[{"teste":"triagem","obrigatorio":true,"customizado":false},{"teste":"work_sample_sjt","obrigatorio":true,"customizado":false,"cargo":"lider-recepcao"},{"teste":"redacao_cultural","obrigatorio":true,"customizado":false,"codigos":["C1"]},{"teste":"big_five","obrigatorio":false,"customizado":false},{"teste":"cognitivo","obrigatorio":false,"customizado":false},{"teste":"entrevista","obrigatorio":true,"customizado":false}]$testes$::jsonb,
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
      ('jornada', 1, $q1$Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, no Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?$q1$, NULL::text,
       'single_choice', $o1$["Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica","Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída","Tenho disponibilidade apenas parcial, em alguns dias da semana","Tenho disponibilidade apenas para trabalho remoto"]$o1$::jsonb, true, NULL::int),
      ('curriculo', 2, $q2$Há quanto tempo, somando todos os empregos, você trabalha com recepção ou atendimento ao cliente?$q2$, NULL::text,
       'single_choice', $o2$["Menos de 1 ano em recepção ou atendimento ao cliente","Entre 1 e 2 anos em recepção ou atendimento ao cliente","Entre 2 e 5 anos em recepção ou atendimento ao cliente","Mais de 5 anos em recepção ou atendimento ao cliente"]$o2$::jsonb, true, NULL::int),
      ('curriculo', 3, $q3$Onde foi a sua experiência mais longa em recepção?$q3$, NULL::text,
       'single_choice', $o3$["Recepção em clínica odontológica","Recepção em outra clínica ou serviço de saúde (médica, estética, laboratório, hospital)","Recepção em hotelaria, eventos ou outro serviço de alto padrão","Recepção ou atendimento em varejo, call center ou outro tipo de empresa","Ainda não trabalhei em recepção"]$o3$::jsonb, true, NULL::int),
      ('curriculo', 4, $q4$Além da sua própria função, que responsabilidade você já teve na recepção ou no atendimento?$q4$, NULL::text,
       'multiple_choice', $o4$["Liderei formalmente uma equipe de recepção ou de atendimento","Sem ter o cargo, treinei colegas novos, montei escala ou respondi pela recepção na ausência da liderança","Criei ou mudei processos, checklists ou controles da recepção","Ainda não tive responsabilidade além da minha própria função"]$o4$::jsonb, true, NULL::int),
      ('curriculo', 5, $q5$Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?$q5$, NULL::text,
       'multiple_choice', $o5$["Recepção presencial de pacientes ou clientes","Atendimento por WhatsApp e telefone","Confirmação de consultas e trabalho ativo para reduzir faltas","Recebimento de pagamentos e fechamento de caixa","Controle de documentos, termos ou exames de pacientes, com cuidado de LGPD","Controle de estoque de materiais da recepção","Atendimento de reclamações até a resolução","Retorno, recall ou pesquisa de satisfação de pacientes","Acompanhamento de indicadores, como faltas, tempo de resposta ou satisfação","Nenhuma destas ainda é rotina do meu trabalho"]$o5$::jsonb, true, NULL::int),
      ('tecnologia', 6, $q6$Com quais sistemas de agendamento você já trabalhou?$q6$, NULL::text,
       'multiple_choice', $o6$["Clinicorp","Doctoralia","Feegow","iClinic","Clínica nas Nuvens","Outro sistema de agenda de clínica, hospital ou laboratório (Tasy, MV, sistema próprio)","Só agenda em planilha, Google Agenda ou papel","Nunca trabalhei com agendamento"]$o6$::jsonb, true, NULL::int),
      ('tecnologia', 7, $q7$Quais destas ferramentas você usa no trabalho com segurança?$q7$, NULL::text,
       'multiple_choice', $o7$["Planilhas (Excel ou Google Planilhas), com filtros e fórmulas simples","WhatsApp Business, com etiquetas e respostas rápidas","E-mail corporativo","ChatGPT ou outra IA, para escrever ou organizar o trabalho","Ferramentas de tarefas, como Trello, Notion ou ClickUp","Nenhuma destas ferramentas"]$o7$::jsonb, true, NULL::int),
      ('valores', 8, $q8$Em relação aos processos e checklists da recepção, qual frase mais se parece com você?$q8$, NULL::text,
       'single_choice', $o8$["Sigo os processos à risca e, quando algo não funciona, proponho a mudança e testo","Sigo os processos à risca, sem exceções","Adapto conforme o dia, sem registrar o que mudei","Prefiro resolver na hora, pela minha experiência, a seguir checklist"]$o8$::jsonb, true, NULL::int),
      ('valores', 9, $q9$O que você fez nos últimos seis meses para trabalhar melhor — um curso, uma leitura, uma mudança na sua rotina? Conte em poucas linhas.$q9$, $a9$Opcional.$a9$,
       'texto_curto', NULL::jsonb, false, 500)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);


  -- ── knockout da pergunta 1 ──────────────────────────────────────────
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 1 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica$k1$, 'neutro', 1),
      ($k2$Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída$k2$, 'neutro', 2),
      ($k3$Tenho disponibilidade apenas parcial, em alguns dias da semana$k3$, 'neutro', 3),
      ($k4$Tenho disponibilidade apenas para trabalho remoto$k4$, 'knockout', 4)
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta (compara com o tamanho do array).
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'pergunta 1: so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
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

  RAISE NOTICE 'vaga % criada como rascunho, autor %, % knockout(s) armado(s)', v_vaga, v_autor, 1;
END
$vaga$;
