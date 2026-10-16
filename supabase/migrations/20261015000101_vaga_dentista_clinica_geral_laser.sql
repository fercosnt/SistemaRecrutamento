-- =============================================================================
-- Migration: vaga dentista-clinica-geral-laser (Cirurgião(ã)-Dentista — Clínica Geral)
-- Date: 2026-10-15
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro. O bloco abaixo resolve o autor e ABORTA se nao achar. A tela do RH nao
-- cria vaga do zero; vaga nova com perguntas so nasce por migration.
--
-- FONTE: docs/vagas/dentista-clinica-geral-laser.md e o payload em
-- docs/vagas/proveniencia/dentista-clinica-geral-laser.payload.json, montado a partir do texto
-- de uma vaga antiga de dentista colado pelo operador (2026-10-15) e das decisoes
-- dele: o dentista EXECUTA o plano (a avaliacao e o fechamento sao do Dr. Fernando);
-- CRO-SP obrigatorio; SEM tempo minimo de clinica; sem harmonizacao
-- orofacial; PJ com fixo mensal, sem valores no anuncio; redacao nova DENT_UAU
-- (texto do operador, criada aqui); pesos do
-- template dentista (20/35/15/30). O banco SJT do cargo e revisto na migration
-- 20261015000102.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (`publish_vaga`). Este arquivo ja confere, depois dos INSERTs, os portoes
-- daquela RPC — para a vaga nao nascer impublicavel.
--
-- KNOCKOUT: 3 opcao(oes) encerram a candidatura na inscricao (aprovadas pelo
-- operador): pergunta 1: "Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP", "Ainda não tenho registro ativo no CRO"; pergunta 2: "Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial". E escrito DIRETO em `pergunta_opcao_metadata`: a RPC
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

  -- ── redacao nova DENT_UAU: o texto exato que o operador aprovou ─────────────
  INSERT INTO public.perguntas_redacao
    (codigo, texto, template_cargo, valor_primario, valor_secundario, is_padrao, default_on, ativa)
  SELECT 'DENT_UAU', $red0$Descreva uma situação específica em que você superou as expectativas de um paciente, proporcionando uma experiência memorável que foi além do tratamento odontológico convencional. O que você fez de diferente e qual foi o resultado?$red0$, 'dentista_padrao', 'uau',
         'atitude_de_dono', false, false, true
   WHERE NOT EXISTS (SELECT 1 FROM public.perguntas_redacao WHERE codigo = 'DENT_UAU');
  -- Se o codigo ja existia, tem de ser com ESTE texto: senao a vaga usaria um enunciado
  -- que ninguem aprovou.
  IF NOT EXISTS (SELECT 1 FROM public.perguntas_redacao
                  WHERE codigo = 'DENT_UAU' AND texto = $redchk0$Descreva uma situação específica em que você superou as expectativas de um paciente, proporcionando uma experiência memorável que foi além do tratamento odontológico convencional. O que você fez de diferente e qual foi o resultado?$redchk0$ AND ativa IS TRUE) THEN
    RAISE EXCEPTION 'redacao % existe com outro texto ou inativa — nada a fazer', 'DENT_UAU';
  END IF;

  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = 'dentista-clinica-geral-laser') THEN
    RAISE EXCEPTION 'ja existe vaga com slug % — nada a fazer', 'dentista-clinica-geral-laser';
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
    'dentista-clinica-geral-laser', $tit$Cirurgião(ã)-Dentista — Clínica Geral$tit$, $sub$Clínica geral de adultos com o laser Fotona LightWalker · PJ presencial · unidade Paraíso$sub$, 'rascunho',
    $dcurta$Atendimento clínico geral de adultos com o laser Fotona LightWalker, seguindo o protocolo da clínica e com treinamento no Centro de Excelência Beauty Smile. PJ, presencial no Paraíso, em São Paulo.$dcurta$, 'Clínico', 'PJ', 'Presencial',
    $cid$São Paulo$cid$, 'SP', $ender$Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP$ender$, $jorn$Segunda a sexta, das 9h às 19h, presencial$jorn$,
    NULL, NULL, false, 1,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$Na Beauty Smile, o tratamento é feito 100% com o laser Fotona LightWalker — uma odontologia sem dor, sem trauma e minimamente invasiva. Estamos buscando um(a) cirurgião(ã)-dentista para a clínica geral de adultos: quem executa os tratamentos e os protocolos de laser da clínica, com rigor técnico e cuidado com o paciente.

**O seu papel.** A avaliação do paciente e a apresentação do plano de tratamento ficam com o Dr. Fernando. Você executa o plano: conduz as sessões, acompanha a evolução e orienta o paciente. Dúvidas sobre o plano ou sobre valores, você leva ao Dr. Fernando e à equipe.

**Laser sem experiência prévia.** Não exigimos experiência com laser. Você aprende os protocolos no Centro de Excelência Beauty Smile, com a equipe clínica, antes de aplicá-los.

**O que a clínica não faz.** Não fazemos harmonização orofacial nem estética facial.

### Onde e em que horário

Presencial, na clínica: Rua Desembargador Eliseu Guilherme, 53 — Paraíso, São Paulo/SP, a poucos minutos dos metrôs Paraíso e Brigadeiro.

Segunda a sexta, das 9h às 19h.

### Como é o processo seletivo

Inscrição com perguntas objetivas e análise do currículo. Quem avança recebe uma avaliação online, para fazer no seu tempo: seis situações do dia a dia de atendimento, um caso escrito e uma redação curta. Depois, entrevista com a equipe clínica.$scargo$,
    $resp$- **Atendimento clínico.** Realizar consultas e tratamentos odontológicos preventivos e corretivos em adultos, seguindo o protocolo padrão da clínica.
- **Protocolos de laser.** Aplicar os protocolos com o laser Fotona nas diversas especialidades, depois do treinamento no Centro de Excelência Beauty Smile.
- **Execução do plano.** Conduzir as sessões do plano definido na avaliação e acompanhar a evolução do paciente de sessão em sessão.
- **Orientação ao paciente.** Explicar o que vai ser feito em cada sessão, orientar cuidados preventivos e de higiene, e encaminhar as dúvidas comerciais à equipe.
- **Qualidade e segurança.** Seguir as normas de biossegurança, manter o prontuário completo e o ambiente organizado.
- **Equipe.** Trabalhar de forma integrada com a equipe multidisciplinar e contribuir para a melhoria contínua dos protocolos da clínica.$resp$,
    $rform$Graduação em Odontologia e **inscrição ativa no CRO-SP**. Especialização em qualquer área da odontologia conta pontos.$rform$,
    $rexp$Experiência em clínica geral com pacientes adultos. Não exigimos tempo mínimo.

**Contam pontos:** atendimento em clínicas multidisciplinares de alto padrão; experiência com pacientes ansiosos ou com medo de dentista.$rexp$,
    $rtec$Procedimentos de clínica geral em adultos; biossegurança; prontuário completo.

**Contam pontos:** laser odontológico; escaneamento intraoral e radiologia digital; cursos de laser, odontologia digital ou minimamente invasiva. Experiência com laser não é exigida — a clínica treina.$rtec$,
    $rhab$- **Rigor com protocolo** — segue o fluxo clínico definido e propõe melhorias pelo caminho certo.
- **Comunicação com o paciente** — explica sem jargão e lida com perfis diferentes, inclusive quem tem medo.
- **Trabalho em equipe** — atua junto com auxiliares, especialistas e a coordenação clínica.
- **Atualização contínua** — busca formação por conta própria.
- **Ética profissional** — recusa o que não tem indicação, mesmo quando o paciente insiste.$rhab$,
    $dif$- Especialização em áreas da odontologia.
- Experiência em clínicas multidisciplinares de alto padrão.
- Experiência ou interesse comprovado em tecnologias odontológicas de ponta: laser, escaneamento 3D, radiologia digital.
- Cursos complementares em laser odontológico ou novas tecnologias.
- Visão voltada para a odontologia digital e minimamente invasiva.$dif$,
    $ben$Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.** Os valores são combinados na entrevista.
- **Capacitação** nos protocolos de laser no Centro de Excelência Beauty Smile.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte. Eles valem para o quadro CLT, e esta vaga é PJ.$ben$,
    $semp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$semp$,
    $perfil$Dentista de clínica geral de adultos que executa bem um plano feito pelo Dr. Fernando e cuida da experiência do paciente em cada sessão: explica o que vai fazer, acolhe quem tem medo, combina cuidados em casa e acompanha a evolução. Segue protocolo e biossegurança sob pressão de agenda e não fala de preço com o paciente. Na entrevista, sondar: um paciente com medo que ele conduziu; algo que fez por um paciente sem ele pedir; como organiza a primeira sessão de um paciente novo; quando discordou de um protocolo e como encaminhou. Como não há tempo mínimo de clínica, investigar a prática real por trás do currículo. Riscos: quem promete resultado, quem trata o paciente como dente e não como gente, e quem prefere seguir só a própria experiência.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$⚠ `gaps` LISTA SÓ O QUE FALTA. Requisito atendido não entra, em severidade
nenhuma. Se a nota diria "atende ao requisito", o item não é gap: vira `strengths`
ou não aparece.

## Requisitos eliminatórios
Se algum estiver AUSENTE, registre gap `critical` e mantenha o score abaixo de 40,
por melhor que seja o resto do perfil. Se estiver atendido, não registre nada.
- Graduação em Odontologia.
- Inscrição ativa no CRO-SP. A Etapa 1 pergunta isto de frente:
  · "Tenho inscrição ativa no CRO-SP" → atendido.
  · "Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de
    começar" → atendido, com observação em `reasoning` — nunca em `gaps`.
  · sem resposta e sem número de CRO no currículo → `insufficient_evidence`.
- Disponibilidade presencial, de segunda a sexta. A Etapa 1 também pergunta:
  · "…integral e presencial…" → atendido; "…mas precisaria ajustar o horário…" →
    atendido, com observação. Querer negociar horário não é indisponibilidade.
  · "…apenas em alguns dias ou turnos…" → gap `critical`.
  · nenhuma resposta sobre disponibilidade → `insufficient_evidence`.

⚠ TEMPO DE EXPERIÊNCIA NÃO É ELIMINATÓRIO (decisão do operador): não há mínimo de
anos de clínica. Recém-formado com CRO-SP não recebe gap por pouco tempo de
formado; a experiência pesa só na competência 1.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: cada item chega como «Pergunta: …» seguido de
«Resposta: …», na ordem do formulário. Julgue cada resposta À LUZ DA PERGUNTA que a
gerou, e trate-a como evidência de MESMO PESO que o currículo. Se algum item vier
sem a linha «Pergunta:», identifique-o pelo próprio conteúdo.

⚠ `critical` é SÓ para os três eliminatórios. Gap de competência é no máximo
`important`.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Clínica geral em adultos, como rotina
   Peso ALTO.
   5 = atendimento clínico geral de adultos como atividade principal, com
       procedimentos variados (restauração, periodontia básica, urgência), em
       clínica ou consultório.
   3 = clínica geral em contexto limitado: estágio, clínica-escola, residência,
       plantão ou atendimento esporádico.
   1 = nenhuma evidência de atendimento clínico de adultos.
   A Etapa 1 traz a faixa de experiência clínica e os procedimentos de maior experiência
   (até 3): some as duas fontes ao currículo, não substitua uma pela outra. "Menos de 2
   anos de experiência clínica" não é gap — não há mínimo; só posiciona a faixa.

2. Trabalho dentro de protocolo e biossegurança
   Peso MÉDIO.
   5 = atuou em clínica com protocolos clínicos definidos (rede, clínica
       multidisciplinar, hospital), com prontuário e fluxo padronizados; ou teve
       responsabilidade formal por biossegurança.
   3 = consultório ou clínica pequena, sem evidência de protocolo padronizado.
   1 = nenhuma evidência.
   A Etapa 1 pergunta como a pessoa lida com protocolos. "Sigo os protocolos à risca" e
   "Adapto… mas mantenho a essência deles" são compatíveis com a função. "Prefiro
   desenvolver meus próprios protocolos" e "Sigo os protocolos quando é conveniente…"
   limitam esta competência a no máximo 3 e devem ser comentadas em `reasoning` como
   tema de entrevista.

3. Atualização técnica por iniciativa própria
   Peso MÉDIO. Conta ponto, não elimina.
   5 = especialização, cursos ou formação nos últimos 3 anos em laser, odontologia
       digital, periodontia ou odontologia minimamente invasiva.
   3 = formação complementar antiga ou em área sem relação com a rotina da clínica.
   1 = nenhuma formação além da graduação.
   A Etapa 1 lista as especializações concluídas ou em andamento. Especialização em
   harmonização orofacial não conta nem desconta: a clínica não faz esse procedimento.

4. Tecnologia clínica
   Peso BAIXO. Conta ponto, não elimina.
   5 = usou laser odontológico na rotina; ou escâner intraoral e radiologia digital.
   3 = contato com uma dessas tecnologias em curso ou de forma ocasional.
   1 = nenhuma evidência.
   A Etapa 1 traz a lista de tecnologias e, opcionalmente, um relato livre sobre laser
   (tratamento e equipamento) — use o relato como evidência quando existir. A AUSÊNCIA
   de experiência com laser, ou o relato em branco, NÃO é gap: a clínica treina no
   Centro de Excelência Beauty Smile.

5. Experiência do paciente e trabalho em equipe
   Peso MÉDIO.
   5 = evidência de cuidado além do procedimento — acompanhamento depois da sessão,
       manejo de paciente com medo, orientação personalizada — em clínica
       multidisciplinar, integrado com auxiliares e outros especialistas.
   3 = atendimento ao paciente sem evidência de cuidado além do procedimento ou de
       trabalho em equipe.
   1 = nenhuma evidência.
   A Etapa 1 lista as ações que a pessoa diz incorporar na rotina de atendimento. Ações
   concretas marcadas (contato no dia seguinte, tempo extra para dúvidas, antecipar
   necessidades) são evidência declarada, com peso menor que um exemplo citável.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Universidade de formação, prestígio da instituição ou ano de formatura.
- Tempo de formado além do que a competência 1 já mede.
- Ter ou não especialização — conta na competência 3, nunca é corte.
- Experiência ou especialização em harmonização orofacial ou estética facial: a clínica
  não faz esses procedimentos; não conta ponto nem desconta.
- Atender em mais de uma clínica ao mesmo tempo, número de empregos ou tempo em
  desemprego — é comum na profissão e não diz nada sobre desempenho.
- Número de seguidores ou presença em redes sociais.
- "Perfil simpático", "inovador", "mentalidade de crescimento" sem evidência citável, e
  os adjetivos do anúncio sobre a clínica, o laser ou o Dr. Fernando.

Todo ponto forte e todo gap deve citar trecho literal do currículo ou da resposta. Se
não há trecho que permita julgar uma competência, use `insufficient_evidence` — é
melhor que chutar.$rub$,
    $pesos${"triagem":20,"work_sample_sjt":35,"redacao_cultural":15,"entrevista":30}$pesos$::jsonb,
    $testes$[{"teste":"triagem","obrigatorio":true,"customizado":false},{"teste":"work_sample_sjt","obrigatorio":true,"customizado":false,"cargo":"dentista"},{"teste":"redacao_cultural","obrigatorio":true,"customizado":false,"codigos":["DENT_UAU"]},{"teste":"big_five","obrigatorio":false,"customizado":false},{"teste":"cognitivo","obrigatorio":false,"customizado":false},{"teste":"entrevista","obrigatorio":true,"customizado":false}]$testes$::jsonb,
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
      ('curriculo', 1, $q1$Qual é a sua situação no Conselho Regional de Odontologia?$q1$, NULL::text,
       'single_choice', $o1$["Tenho inscrição ativa no CRO-SP","Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de começar","Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP","Ainda não tenho registro ativo no CRO"]$o1$::jsonb, true, NULL::int),
      ('valores', 2, $q2$Você está ciente de que a Beauty Smile não realiza harmonização orofacial nem estética facial?$q2$, NULL::text,
       'single_choice', $o2$["Sim, estou ciente de que a clínica não realiza harmonização orofacial nem estética facial","Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial"]$o2$::jsonb, true, NULL::int),
      ('jornada', 3, $q3$Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta, das 9h às 19h?$q3$, NULL::text,
       'single_choice', $o3$["Tenho disponibilidade integral e presencial, de segunda a sexta, no horário da clínica","Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída","Tenho disponibilidade apenas em alguns dias ou turnos, porque atendo em outro lugar"]$o3$::jsonb, true, NULL::int),
      ('curriculo', 4, $q4$Qual é o seu tempo total de experiência clínica?$q4$, NULL::text,
       'single_choice', $o4$["Menos de 2 anos de experiência clínica","Entre 2 e 5 anos de experiência clínica","Entre 5 e 10 anos de experiência clínica","Mais de 10 anos de experiência clínica"]$o4$::jsonb, true, NULL::int),
      ('curriculo', 5, $q5$Em quais áreas você tem especialização concluída ou em andamento?$q5$, $a5$Marque as concluídas e as que está cursando.$a5$,
       'multiple_choice', $o5$["Especialização em Dentística","Especialização em Endodontia","Especialização em Implantodontia","Especialização em Ortodontia","Especialização em Periodontia","Especialização em Prótese","Especialização em Radiologia","Especialização em Odontopediatria","Especialização em Harmonização orofacial","Não tenho especialização concluída nem em andamento"]$o5$::jsonb, true, NULL::int),
      ('curriculo', 6, $q6$Em quais procedimentos você tem mais experiência? Selecione até 3.$q6$, NULL::text,
       'multiple_choice', $o6$["Tratamentos restauradores e estéticos","Endodontia","Periodontia","Cirurgias orais menores","Implantodontia","Próteses","Ortodontia","Odontopediatria","Outros procedimentos"]$o6$::jsonb, true, NULL::int),
      ('tecnologia', 7, $q7$Com quais destas tecnologias odontológicas você tem experiência?$q7$, NULL::text,
       'multiple_choice', $o7$["Scanner intraoral","Radiografia digital","Microscópio operatório","CAD/CAM","Laser odontológico","Fotografia odontológica","Impressão 3D","Planejamento digital","Nenhuma destas tecnologias"]$o7$::jsonb, true, NULL::int),
      ('tecnologia', 8, $q8$Você já usou laser na odontologia? Se sim, conte para qual tratamento e com qual equipamento.$q8$, $a8$Se nunca usou, tudo bem: a clínica treina. Pode deixar em branco.$a8$,
       'texto_curto', NULL::jsonb, false, 500),
      ('valores', 9, $q9$Em relação a protocolos clínicos estabelecidos, qual frase mais se parece com você?$q9$, NULL::text,
       'single_choice', $o9$["Sigo os protocolos à risca, sem exceções","Adapto os protocolos conforme a necessidade do caso, mas mantenho a essência deles","Prefiro desenvolver meus próprios protocolos, baseados em evidências científicas","Sigo os protocolos quando é conveniente, mas priorizo a minha experiência clínica"]$o9$::jsonb, true, NULL::int),
      ('valores', 10, $q10$Quais destas ações você costuma incorporar na sua rotina de atendimento?$q10$, NULL::text,
       'multiple_choice', $o10$["Entro em contato com o paciente no dia seguinte a procedimentos mais invasivos","Personalizo o ambiente conforme as preferências do paciente","Ofereço opções adicionais de conforto durante o tratamento","Reservo tempo extra para responder a todas as dúvidas do paciente","Preparo materiais educativos personalizados para o paciente","Guardo detalhes pessoais do paciente para retomar na próxima consulta","Comemoro marcos e resultados do tratamento com o paciente","Antecipo necessidades do paciente antes que ele peça"]$o10$::jsonb, true, NULL::int)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);


  -- ── knockout da pergunta 1 ──────────────────────────────────────────
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 1 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho inscrição ativa no CRO-SP$k1$, 'neutro', 1),
      ($k2$Tenho CRO ativo de outro estado e vou pedir a inscrição no CRO-SP antes de começar$k2$, 'neutro', 2),
      ($k3$Tenho CRO ativo de outro estado e não pretendo me inscrever no CRO-SP$k3$, 'knockout', 3),
      ($k4$Ainda não tenho registro ativo no CRO$k4$, 'knockout', 4)
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta (compara com o tamanho do array).
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'pergunta 1: so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
  END IF;

  -- ── knockout da pergunta 2 ──────────────────────────────────────────
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 2 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k5$Sim, estou ciente de que a clínica não realiza harmonização orofacial nem estética facial$k5$, 'neutro', 1),
      ($k6$Não, eu procurava uma vaga que incluísse harmonização orofacial ou estética facial$k6$, 'knockout', 2)
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta (compara com o tamanho do array).
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'pergunta 2: so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE f.vaga_id = v_vaga AND m.tag = 'knockout'
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes), esperado exatamente 3', v_n;
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

  RAISE NOTICE 'vaga % criada como rascunho, autor %, % knockout(s) armado(s)', v_vaga, v_autor, 3;
END
$vaga$;
