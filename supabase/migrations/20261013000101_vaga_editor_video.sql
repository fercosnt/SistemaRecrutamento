-- =============================================================================
-- Migration: vaga editor-video (Editor(a) de Vídeo)
-- Date: 2026-10-13
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro: revisao de redacao, avaliacao de entrevista, decisao final e
-- reprocessamento. O bloco abaixo resolve o autor e ABORTA se nao achar, em vez
-- de gravar NULL calado.
--
-- FONTE: docs/vagas/editor-video.md, validado pelo operador. Os textos foram
-- extraidos do documento POR SCRIPT para docs/vagas/migrations/editor-video.payload.json
-- (validado por plugins/cadastro-de-vaga/skills/cadastro-de-vaga/scripts/validar-payload.mjs),
-- e este SQL foi emitido POR SCRIPT a partir do payload — nenhum texto transcrito a mao.
-- `sobre_empresa` e o texto ja no ar nas vagas publicadas, copiado sem alteracao.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (publish_vaga). `qualificacao_etapa1` NAO e tocada: e snapshot que o proprio
-- publish_vaga escreve a partir das perguntas reais.
--
-- ANUNCIO x RUBRICA: `sobre_cargo`/`requisitos_*` sao a copia que ATRAI;
-- `rubrica_ia` e o criterio que AVALIA. Sao textos com propositos opostos e
-- nunca o mesmo texto — misturar enfia na avaliacao sinais que ninguem decidiu
-- que pesariam.
--
-- ⚠ KNOCKOUT APROVADO PELO OPERADOR (D1, 12/10): a opcao
--   "Só tenho disponibilidade para trabalho remoto ou híbrido"
--   da pergunta 2 encerra a candidatura na inscricao
--   (submit_candidatura_atomic). E a unica rejeicao automatica do funil, e foi
--   decidida por humano, por extenso, no documento da vaga.
--   DESVIO CONSCIENTE: o knockout e escrito DIRETO em pergunta_opcao_metadata.
--   A via oficial (upsert_pergunta_opcoes_metadata) exige auth.jwt() com role
--   rh/admin, que a via de apply (Management API) nao carrega. Funciona porque o
--   sweep de submit_candidatura_atomic casa por TEXTO (resposta_opcoes @>
--   to_jsonb(m.opcao_texto)), nao por opcao_id — e por isso a guarda no fim
--   conta quantas opcoes casam e ABORTA se faltar alguma: um caractere de
--   diferenca deixaria o knockout verde, silencioso e inerte.
--
-- GUARDAS DE INSTRUMENTO: publish_vaga nao confere se o banco SJT do cargo tem
-- itens, nem se o codigo de redacao existe. As duas guardas abaixo abortam se o
-- cargo "editor-video" nao tiver item ativo de cada formato, ou se o codigo de
-- redacao nao casar com exatamente 1 pergunta ativa — a etapa obrigatoria
-- nasceria vazia.
--
-- Aditivo e reversivel (soft delete). Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $vaga$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_pk    uuid;
  v_n     int;
  v_cod   text;
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

  -- Banco SJT do cargo: precisa de item ativo de multipla escolha E de caso aberto.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'editor-video' AND status = 'active' AND formato = 'mc';
  IF v_n < 1 THEN
    RAISE EXCEPTION 'cargo SJT "%" sem item ativo de multipla escolha — a etapa obrigatoria nasceria vazia', 'editor-video';
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'editor-video' AND status = 'active' AND formato = 'caso_aberto';
  IF v_n < 1 THEN
    RAISE EXCEPTION 'cargo SJT "%" sem caso aberto ativo', 'editor-video';
  END IF;

  -- Cada codigo de redacao precisa casar com exatamente 1 pergunta ativa.
  FOREACH v_cod IN ARRAY ARRAY['F1']::text[] LOOP
    SELECT count(*) INTO v_n FROM public.perguntas_redacao WHERE codigo = v_cod AND ativa IS TRUE;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'codigo de redacao "%" casa com % pergunta(s) ativa(s) — esperado exatamente 1', v_cod, v_n;
    END IF;
  END LOOP;

  INSERT INTO public.vagas (
    slug, titulo, subtitulo, status,
    descricao_curta, departamento, tipo_contrato, modelo_trabalho, nivel_senioridade,
    cidade, estado, endereco_completo, jornada_trabalho,
    faixa_salarial_min, faixa_salarial_max, exibir_salario, total_vagas,
    data_abertura, aplica_cognitivo,
    sobre_cargo, responsabilidades,
    requisitos_formacao, requisitos_experiencia,
    requisitos_tecnicos, requisitos_habilidades,
    diferenciais, beneficios,
    sobre_empresa, perfil_ideal,
    secoes_extras, rubrica_ia,
    pesos_avaliacao, testes_aplicaveis,
    created_by, updated_by
  )
  VALUES (
    'editor-video', $tit$Editor(a) de Vídeo$tit$, $subt$Vídeo vertical para marca pessoal em saúde · squad de Marketing · PJ presencial$subt$, 'rascunho',
    $dcurta$Você transforma o material gravado em vídeos prontos para publicar — corte, legenda e cor — no ritmo do calendário, e produz as variações de hook que vão a teste. Contrato PJ, presencial na unidade Paraíso, em São Paulo, com início imediato.$dcurta$,
    'Marketing', 'PJ', 'Presencial', 'Pleno',
    'São Paulo', 'SP', $ender$Unidade Paraíso — São Paulo/SP$ender$,
    $jorn$Segunda a sexta; entregas conforme calendário e fila de edição$jorn$,
    3000, 4400, false, 1,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$O marketing da Beauty Smile entrou numa fase nova: a produção de conteúdo passou a ser feita por um time interno, com investimento em mídia e contato direto com o Dr. Fernando Costa Jr., que é o rosto da marca.

Você responde pela **qualidade técnica e pelo prazo de cada vídeo editado**. Não responde pela mensagem nem pela publicação, que são da social media, nem pela captação, que é do videomaker. O que sai da sua mão é o que vai ao ar.

**O volume:** de 10 a 14 vídeos editados por semana, até 4 por dia na meta cheia, mais 3 a 4 variações de hook por vídeo base selecionado.

**Onde e quando.** Presencial, na unidade Paraíso, em São Paulo, de segunda a sexta. O endereço fica no bairro Paraíso, perto dos metrôs Brigadeiro e Paraíso. As entregas seguem o calendário editorial e a fila de edição.

**Início imediato.**

**Os primeiros 90 dias.** Período de avaliação com conversas nos dias 30, 60 e 90. Parte do trabalho é construir o que não existe: o padrão visual do perfil (legenda, tipografia, paleta, vinheta), os projetos-base por quadro para reduzir o tempo por vídeo, o fluxo de aprovação com a social media, o protocolo de variações de hook com o tráfego, e a biblioteca de trilhas e imagens licenciadas.

**O que você encontra pronto.** Roteiro e material bruto entregues todos os dias, por um fluxo organizado. Você não caça material — ele chega.$scargo$,
    $resp$- **Edição.** De 10 a 14 vídeos por semana: corte, legenda e color grading no padrão visual aprovado, respeitando a estrutura do roteiro e o hook definido pela social media.
- **Variações de hook.** De 3 a 4 versões por vídeo base, em até 2 dias, com nomenclatura que permita comparar resultado.
- **Reaproveitamento.** Editar bastidores, quadros pessoais e hyperlapse; apoiar o desdobramento de Reels em outros formatos.
- **Padrão visual e arquivo.** Manter os templates de legenda, tipografia, paleta e vinheta, e organizar projetos e finais na pasta compartilhada.
- **Conformidade na edição.** Garantir que legenda e texto na tela não prometam resultado, nem tragam superlativo sem lastro, concorrente, urgência, preço ou parcelamento. Cortar ou desfocar paciente identificável sem autorização, além de prontuário, tela de sistema, exame ou documento. Usar apenas trilha, fonte e imagem com licença.$resp$,
    NULL,
    $rexp$- **Portfólio de Reels, TikTok ou Shorts editados** — que dê para abrir e ver.
- Experiência com **entregas frequentes e prazos curtos**.

**Conta ponto, não elimina:** motion graphics · edição para anúncio · experiência com creators ou marca pessoal.$rexp$,
    $rtec$Premiere Pro ou DaVinci Resolve para edição · DaVinci Resolve ou Lumetri para color grading · CapCut Desktop para legenda dinâmica e formatos rápidos · legendagem automática com revisão manual · organização de projeto e arquivos em nuvem. Desejável: After Effects.$rtec$,
    $rhab$Ritmo de edição pensado para retenção · legenda sem erro de português e sincronizada · consistência de paleta entre vídeos da mesma semana · variação de hook que muda o argumento, não só o texto · aviso antecipado quando um prazo vai furar · receptividade a feedback (aplica o ajuste de uma vez) · organização (qualquer pessoa do squad acha o arquivo final) · atenção a detalhe.$rhab$,
    $dif$- Curso superior completo ou em andamento em Produção Audiovisual, Cinema, Comunicação, Design, Publicidade ou área correlata.
Motion graphics · edição para anúncio · já trabalhou com creators ou com marca pessoal.$dif$,
    $ben$Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.**
- **Variável por desempenho**, sobre metas de entrega publicadas e apuradas no fim do mês.
- **Participação na meta coletiva do squad.**
- **Evolução:** revisão trimestral do fixo, com as metas recalibradas em dezembro de 2026.

Os valores são combinados na entrevista.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte.$ben$,
    $semp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$semp$,
    $perfil$Pessoa que sustenta de 10 a 14 vídeos editados por semana sem perder o padrão, e corta pensando em retenção, não em fidelidade ao take. Vem de operação de volume — agência, creator ou time interno — com prazo diário, não por projeto. Entrega variações de hook que mudam o argumento, não só a frase. Repara no que está no fundo do quadro: tela de sistema, documento, paciente. Na entrevista, sondar: como decide onde cortar quando o take é longo e bom, e o que fez ao receber roteiro com problema de conformidade. Riscos a investigar: quem nunca operou com fila diária, e quem refaz até ficar perfeito e atrasa o resto do dia.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$## Requisitos eliminatórios

Três. Cada um que faltar registra lacuna crítica (`critical`) e segura o score abaixo de 40.

1. **Portfólio de Reels, TikTok ou Shorts editados.**
2. **Experiência com entregas frequentes e prazos curtos.**
3. **Disponibilidade presencial em São Paulo**, de segunda a sexta.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

#### 1. Ritmo de edição para retenção — peso ALTO
*Competência central: o hook aparece nos primeiros segundos e o corte não deixa tempo morto.*

- **5** — editou vídeo vertical curto de forma recorrente e descreve decisões de ritmo, corte ou abertura ligadas a retenção ou desempenho.
- **3** — editou vídeo curto sem responder pelo ritmo, ou só formatos longos.
- **1** — nenhuma evidência de edição para vídeo vertical curto.

#### 2. Volume com prazo curto — peso ALTO
*De 10 a 14 vídeos por semana, até 4 por dia. Quem nunca operou nesse ritmo descobre tarde que não sustenta.*

- **5** — sustentou volume recorrente declarado (vídeos por semana ou por mês) por período contínuo, com prazo diário ou semanal.
- **3** — entregou por projeto ou campanha, sem cadência fixa.
- **1** — nenhuma evidência de volume ou de prazo recorrente.

#### 3. Variação de hook — peso MÉDIO
*Entrega esperada: 3 a 4 versões por vídeo base, diferentes entre si, não só troca de frase.*

- **5** — produziu variações de abertura para teste e descreve o que cada uma testava, ou como o resultado era comparado.
- **3** — fez versões alternativas sem critério de teste declarado.
- **1** — nenhuma evidência de trabalho com variação de abertura.

#### 4. Padrão visual e consistência — peso MÉDIO
*Legenda, tipografia, paleta e vinheta iguais entre vídeos da mesma semana; o perfil precisa parecer um só.*

- **5** — definiu ou manteve padrão visual de um perfil ou marca, com templates, e cita os elementos que controlava.
- **3** — seguiu padrão definido por outra pessoa.
- **1** — nenhuma evidência de trabalho com padrão visual consistente.

#### 5. Conteúdo em mercado regulado — peso MÉDIO. Conta ponto, não elimina
*O cargo responde por legenda e texto na tela não prometerem resultado, e por não deixar paciente ou documento identificável no quadro.*

- **5** — editou para saúde ou outro mercado com regra de publicidade, e demonstra conhecer o limite.
- **3** — editou para setor sensível sem regulação formal.
- **1** — nenhuma experiência em mercado com restrição de comunicação.

## O que NÃO pode pesar em nenhuma hipótese

**O padrão:** nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro, regionalismo · tempo em desemprego, número de empregos, troca de área, intervalo entre empregos · adjetivos sem evidência citável.

**Os específicos desta vaga:**

1. **Curso superior.** É **diferencial**, não requisito — no anúncio ele aparece sob Diferenciais.
2. **A qualidade estética do portfólio como prova de competência do candidato.** É a proibição mais importante aqui, e a mais fácil de violar: um Reel bonito é resultado de roteiro, captação, edição e às vezes motion — e só uma dessas é o cargo. A rubrica avalia o que o candidato **declara ter feito**, e por isso a pergunta 1 pede que ele diga o que era dele em cada peça.
3. **Software preferido.** Premiere e DaVinci são intercambiáveis para este trabalho. Quem domina um aprende o outro; quem usa o "nosso" não é melhor por isso.
4. **Número de seguidores de qualquer perfil citado.** É popularidade, não competência.
5. **Os adjetivos do próprio anúncio**: "fluxo organizado", "nova fase", "base pronta". Descrevem a empresa.

## Instruções de calibragem

- **Portfólio que a IA não consegue abrir nunca penaliza.** Ela não assiste a vídeos. Se informou links, considera-se atendido — e **a avaliação real do portfólio é humana**, na etapa do teste prático.
- **Silêncio não é ausência.** Sem menção a disponibilidade, pretensão ou residência, registra-se "evidência insuficiente" (`insufficient_evidence`) — é pergunta de entrevista.
- **Se o anúncio pede algo que o formulário não coleta, não desconta.**
- **Toda afirmação precisa de trecho literal.** Sem trecho que sustente, é "evidência insuficiente" (`insufficient_evidence`), nunca inferência.$rub$,
    $pesos${"triagem":30,"work_sample_sjt":30,"redacao_cultural":15,"entrevista":25}$pesos$::jsonb,
    $testes$[{"teste":"triagem","obrigatorio":true,"customizado":false},{"teste":"work_sample_sjt","cargo":"editor-video","obrigatorio":true,"customizado":false},{"teste":"redacao_cultural","codigos":["F1"],"obrigatorio":true,"customizado":false},{"teste":"big_five","obrigatorio":false,"customizado":false},{"teste":"cognitivo","obrigatorio":false,"customizado":false},{"teste":"entrevista","obrigatorio":true,"customizado":false}]$testes$::jsonb,
    v_autor, v_autor
  )
  RETURNING id INTO v_vaga;

  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, p.ordem, p.texto, p.ajuda,
         p.tipo::public.tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
      ('curriculo', 1, $q1$Cole os links do seu portfólio de vídeos editados: Reels, TikToks ou Shorts que passaram pela sua mão. Pode colar mais de um.$q1$,
       $a1$Pode ser trabalho próprio, de freelance ou de empresa. Diga em uma linha o que era seu em cada um — corte, legenda, cor, motion — porque um vídeo publicado costuma ter a mão de mais de uma pessoa.$a1$,
       'texto_curto', NULL::jsonb,
       true, 500),
      ('jornada', 2, $q2$Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta?$q2$,
       NULL::text,
       'single_choice', $o2$["Tenho disponibilidade integral e presencial em São Paulo, de segunda a sexta","Moro fora de São Paulo, mas pretendo me mudar para assumir a vaga","Só tenho disponibilidade para trabalho remoto ou híbrido","Tenho disponibilidade parcial, apenas alguns dias na semana"]$o2$::jsonb,
       true, NULL::int),
      ('curriculo', 3, $q3$Qual foi o maior volume de vídeos editados que você sustentou por mais de um mês seguido?$q3$,
       NULL::text,
       'single_choice', $o3$["Menos de 5 vídeos editados por semana","Entre 5 e 10 por semana","Entre 10 e 20 por semana","Mais de 20 por semana","Nunca trabalhei com volume recorrente de edição"]$o3$::jsonb,
       true, NULL::int),
      ('curriculo', 4, $q4$Quais destas já foram responsabilidade sua, e não apoio a outra pessoa?$q4$,
       NULL::text,
       'multiple_choice', $o4$["Defini o padrão visual de um perfil (legenda, tipografia, paleta)","Produzi variações de hook para teste, comparando resultado","Fiz color grading mantendo consistência entre vídeos da mesma série","Trabalhei com roteiro e material bruto de outras pessoas, num fluxo diário","Montei templates ou projetos-base para reduzir tempo de edição","Nenhuma destas foi responsabilidade minha até hoje"]$o4$::jsonb,
       true, NULL::int),
      ('tecnologia', 5, $q5$Quais destas você usa sem precisar de ajuda?$q5$,
       NULL::text,
       'multiple_choice', $o5$["Premiere Pro","DaVinci Resolve","Lumetri ou DaVinci para color grading","CapCut Desktop para legenda dinâmica","Legendagem automática com revisão manual","After Effects para motion graphics","Organização de projeto e arquivo em nuvem"]$o5$::jsonb,
       true, NULL::int),
      ('curriculo', 6, $q6$Você já editou conteúdo para saúde, ou para outro mercado com regra de publicidade (jurídico, financeiro, farmacêutico)?$q6$,
       NULL::text,
       'single_choice', $o6$["Sim, para saúde (clínica, médico ou dentista)","Sim, para outro mercado regulado","Sim, para estética ou bem-estar, sem regulação formal","Não editei para mercado com restrição de publicidade"]$o6$::jsonb,
       true, NULL::int),
      ('valores', 7, $q7$O que mais te atrai nesta vaga?$q7$,
       NULL::text,
       'single_choice', $o7$["Construir o padrão visual de um perfil do zero e mantê-lo","Trabalhar num fluxo diário organizado, com roteiro e bruto chegando todo dia","Testar hooks e ver o resultado do que eu edito","Trabalhar com saúde e aprender sobre laser e odontologia","A remuneração e o modelo de contrato"]$o7$::jsonb,
       true, NULL::int)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- Knockout (D1). Ver o bloco de desvio no cabecalho.
  SELECT id INTO v_pk FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 2 AND deleted_at IS NULL;
  IF v_pk IS NULL THEN
    RAISE EXCEPTION 'pergunta de disponibilidade nao localizada — knockout nao seria gravado';
  END IF;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_pk, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho disponibilidade integral e presencial em São Paulo, de segunda a sexta$k1$, 'neutro', 1),
      ($k2$Moro fora de São Paulo, mas pretendo me mudar para assumir a vaga$k2$, 'neutro', 2),
      ($k3$Só tenho disponibilidade para trabalho remoto ou híbrido$k3$, 'knockout', 3),
      ($k4$Tenho disponibilidade parcial, apenas alguns dias na semana$k4$, 'neutro', 4)
    ) AS o(texto, tag, ordem);

  -- O texto do metadata TEM de casar com opcoes_resposta, senao o sweep nunca acha e
  -- o knockout vira letra morta. Conta contra as opcoes da PROPRIA pergunta, nao contra
  -- uma constante: todas as opcoes do metadata casam, e ha exatamente 1 knockout.
  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> (SELECT jsonb_array_length(opcoes_resposta) FROM public.perguntas_formulario WHERE id = v_pk) THEN
    RAISE EXCEPTION 'so % opcoes do metadata casam por texto com opcoes_resposta — o knockout seria letra morta', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_pk AND m.tag = 'knockout' AND f.obrigatoria IS TRUE
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'esperado exatamente 1 opcao knockout armada (casando por texto, em pergunta obrigatoria); achei %', v_n;
  END IF;

  RAISE NOTICE 'vaga % (editor-video) criada como rascunho, autor %, 7 perguntas, knockout armado',
    v_vaga, v_autor;
END
$vaga$;
