-- =============================================================================
-- Migration: vaga videomaker-storymaker (Videomaker / Storymaker)
-- Date: 2026-10-13
-- Fonte: docs/vagas/videomaker-storymaker.md (documento validado pelo operador)
-- Payload: docs/vagas/migrations/videomaker-storymaker.payload.json
-- =============================================================================
--
-- POR QUE ESTE ARQUIVO EXISTE, e nao um INSERT no SQL Editor. Vaga criada por
-- INSERT ad-hoc foi o que deixou 9 de 12 vagas com `created_by` nulo — e
-- `vagas.created_by = auth.uid()` gateia o escopo de trabalho do recrutador
-- inteiro: revisao de redacao, avaliacao de entrevista, decisao final e
-- reprocessamento. O bloco abaixo resolve o autor por e-mail e ABORTA se nao
-- achar, em vez de gravar NULL calado. O autor vai na vaga E em cada pergunta.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (publish_vaga). `qualificacao_etapa1` NAO e tocada: e snapshot escrito pelo
-- proprio publish_vaga a partir das perguntas reais.
--
-- ANUNCIO x RUBRICA: `sobre_cargo`/`requisitos_*` sao a copia que ATRAI;
-- `rubrica_ia` e o criterio que AVALIA. Sao textos com propositos opostos e
-- nunca o mesmo texto. Todo texto deste arquivo foi EXTRAIDO por script do
-- documento validado (e o SQL gerado por script a partir do payload) — nada
-- foi transcrito a mao.
--
-- KNOCKOUT aprovado explicitamente pelo operador em 2026-10-12 (decisao D1 do
-- documento): «Só tenho disponibilidade para trabalho remoto ou híbrido», na
-- pergunta 2, encerra a candidatura na inscricao. A pergunta e obrigatoria,
-- como o publish_vaga exige. A guarda no fim confere que o texto casa.
--
-- ⚠ LOCAL DO ARQUIVO: emitido em docs/vagas/migrations/ (e nao em
-- supabase/migrations/) por causa do portao de arvore limpa sobre supabase/.
-- O p46apply.cjs tira version e name do NOME do arquivo, nao do diretorio:
--   node p46apply.cjs migrate docs/vagas/migrations/20261013000102_vaga_videomaker_storymaker.sql
-- e o arquivo e movido para supabase/migrations/ depois, sem alteracao de byte
-- (o md5 do ledger e o do arquivo).
--
-- Aditivo e reversivel (soft delete). Sem BEGIN/COMMIT (D-22) — o driver
-- envolve a migration na propria transacao.
-- =============================================================================

DO $vaga$
DECLARE
  v_autor     uuid;
  v_vaga      uuid;
  v_perg_ko   uuid;
  v_casou     int;
  v_total     int;
  v_abertas   int;
  v_soma      int;
BEGIN
  -- ── autor ────────────────────────────────────────────────────────────────
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br'
     AND ativo IS TRUE
     AND deleted_at IS NULL;

  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — a vaga nasceria com created_by nulo',
      'fernando@beautysmile.com.br';
  END IF;

  -- ── a vaga ───────────────────────────────────────────────────────────────
  INSERT INTO public.vagas (
    slug, titulo, subtitulo, status,
    descricao_curta, departamento, tipo_contrato, modelo_trabalho, nivel_senioridade,
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
    'videomaker-storymaker', $tit$Videomaker / Storymaker$tit$, $subt$Captação e publicação em tempo real do dia a dia da clínica e do perfil do cirurgião-dentista · squad de Marketing · PJ presencial$subt$, 'rascunho',
    $dcurta$Você registra e publica, no mesmo dia, a rotina da clínica e do Dr. Fernando Costa Jr., que lidera a Beauty Smile — stories, fotos e bastidores — e grava os roteiros com áudio e luz aproveitáveis. Contrato PJ, presencial na unidade Paraíso, em São Paulo, com início imediato.$dcurta$, 'Marketing', 'PJ', 'Presencial', 'Pleno',
    'São Paulo', 'SP', $ender$Unidade Paraíso — São Paulo/SP$ender$, $jorn$Segunda a sexta, em janelas combinadas em agenda com a Coordenação$jorn$,
    3000, 4200, false, 1,
    -- §13: «a data do cadastro» — a data do APPLY, no fuso da clinica (o banco roda em UTC)
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$O marketing da Beauty Smile entrou numa fase nova: a produção de conteúdo passou a ser feita por um time interno, com investimento em mídia e contato direto com o Dr. Fernando Costa Jr., que é o rosto da marca.

Você é quem está na clínica todos os dias, com a câmera na mão. Responde pela **presença diária do perfil** e pela **qualidade da captação**: o story que sai na hora, a sessão de gravação que começa sem espera, o material bruto que chega ao editor organizado. Não responde pela edição final, que é do editor, nem pela linha editorial, que é da social media.

**Onde e quando.** Presencial, na unidade Paraíso, em São Paulo, de segunda a sexta. O endereço fica no bairro Paraíso, perto dos metrôs Brigadeiro e Paraíso. Este cargo é presencial por definição: o conteúdo é o que acontece dentro da clínica, e não existe versão remota disso.

A cobertura acontece em janelas combinadas em agenda com a Coordenação, mais as sessões de gravação marcadas com o Dr. Não é escala fixa de horário — é presença combinada, com a rotina do consultório como referência.

**Início imediato.**

**Os primeiros 90 dias.** Período de avaliação com conversas nos dias 30, 60 e 90. Boa parte do trabalho é construir o que ainda não existe: o padrão de stories do dia (com a lista do que nunca filmar), o checklist técnico de gravação, o fluxo de autorização de imagem junto com a recepção, o padrão de nomenclatura combinado com o editor, e o mapa de locações da unidade.$scargo$,
    $resp$- **Stories em tempo real.** Cobrir o dia a dia produzindo e publicando de 20 a 30 stories por dia no perfil do Dr., incluindo os quadros recorrentes — "Aprendendo...", pré e pós-atendimento, consultório e quadros pessoais.
- **Gravação dos roteiros.** Agendar as sessões da semana, preparar o set (luz, áudio, teleprompter, enquadramento) e gravar todos os roteiros da pauta, com takes suficientes para os hooks previstos.
- **Fotos, cortes e bastidores.** Produzir diariamente, e semanalmente o conteúdo de estrutura (hyperlapse, obra).
- **Gestão do material bruto.** Entregar na pasta compartilhada, nomeado no padrão, até o fim do dia, com cópia de segurança e o contexto de cada captação para o editor.
- **Conformidade da captação.** Garantir que nenhum paciente apareça de forma identificável sem autorização escrita arquivada. Nunca enquadrar prontuário, tela de sistema, exame, documento ou agenda com dado de paciente. Não guardar imagem de paciente em dispositivo pessoal.$resp$,
    NULL,
    $rexp$- Portfólio com **stories e vídeos verticais publicados** — que dê para abrir e ver.
- Conhecimento demonstrável em captação de áudio, vídeo e iluminação.

**Conta ponto, não elimina:** filmagem com câmera profissional e com celular · experiência em agência, com creators ou com marca pessoal · vivência em ambiente de saúde.$rexp$,
    $rtec$Smartphone e câmera mirrorless em modo manual (exposição, foco, balanço de branco) · microfone de lapela e iluminação portátil · teleprompter · Instagram Stories para publicação em tempo real, com texto, enquete e sequência narrativa · CapCut ou InShot para cortes no celular · Lightroom Mobile · Premiere e Photoshop · pasta compartilhada para entrega do bruto.$rtec$,
    $rhab$Captação em tempo real · narrativa em stories, com começo, meio e fim · organização de arquivo sem precisar ser cobrado · discrição · senso de risco (não publica na dúvida, consulta antes) · leitura de ambiente (capta sem atrapalhar o atendimento) · receptividade a feedback.$rhab$,
    $dif$- Curso superior completo ou em andamento em Marketing, Comunicação, Produção Audiovisual, Design, Publicidade ou área correlata.
Já filmou com câmera profissional e com celular · já atuou em agência, com creators ou com marca pessoal · já trabalhou em ambiente de saúde.$dif$,
    $ben$Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.**
- **Variável por desempenho**, sobre metas de entrega publicadas e apuradas no fim do mês.
- **Participação na meta coletiva do squad.**
- **Evolução:** revisão trimestral do fixo, com as metas recalibradas em dezembro de 2026.

Os valores são combinados na entrevista.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte.$ben$,
    $emp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$emp$,
    $perfil$Pessoa que publica no momento, com o celular na mão, e entrega o material organizado no fim do dia. Vem de cobertura diária — perfil próprio, creator, agência ou evento — e resolve luz e áudio ruins sem parar a cena. Monta set de gravação com luz, lapela e teleprompter antes de a pessoa chegar, porque a janela é curta e não se repete na semana. Circula entre pacientes: discrição aqui não é educação, é requisito de trabalho. Na entrevista, sondar: o que já deixou de filmar e por quê, e o que fez quando a captação deu errado na hora. Riscos a investigar: quem só captou com equipe avisada de antemão, e quem prepara tanto o set que perde a cena.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$## Requisitos eliminatórios
Três. Cada um que faltar registra lacuna de severidade crítica (`critical`) e segura o score abaixo de 40.

1. **Portfólio com stories ou vídeos verticais publicados.**
2. **Conhecimento demonstrável de captação** — áudio, vídeo e iluminação.
3. **Disponibilidade presencial em São Paulo**, de segunda a sexta.

## Competências críticas (avalie APENAS estas, em BARS 1-5)
#### 1. Captação em tempo real — peso ALTO
*É a competência central: 20 a 30 stories por dia, publicados no momento, com imagem nítida e áudio compreensível.*

- **5** — publicou conteúdo no mesmo dia da captação, com constância declarada (diária ou quase), e descreve como resolvia luz e áudio em condição ruim.
- **3** — captou material que outra pessoa publicou depois, ou publicou de forma esporádica.
- **1** — nenhuma evidência de captação com publicação no mesmo dia.

#### 2. Set de gravação — peso ALTO
*Luz, áudio, teleprompter e enquadramento prontos antes de o Dr. chegar; a janela dele é curta e não se repete na semana.*

- **5** — montou set de gravação de forma recorrente e cita os elementos que controlava (luz, áudio externo, teleprompter, enquadramento).
- **3** — gravou com equipamento básico, sem responder pelo preparo do set.
- **1** — nenhuma evidência de preparo técnico de gravação.

#### 3. Narrativa em stories — peso MÉDIO
*A sequência do dia precisa ter começo, meio e fim, não ser um punhado de clipes soltos.*

- **5** — descreve sequências ou quadros recorrentes que criou e manteve, com lógica de início e desfecho.
- **3** — produziu stories avulsos, sem estrutura declarada.
- **1** — nenhuma evidência de trabalho com stories.

#### 4. Discrição em ambiente com pessoas de fora — peso MÉDIO
*O cargo filma dentro de um consultório, com pacientes que não são figurantes.*

- **5** — captou em ambiente de saúde ou equivalente e demonstra conhecer a regra de autorização de imagem.
- **3** — captou em ambiente com público (loja, evento, escola) sem regra formal de imagem.
- **1** — só captou com equipe ou pessoas avisadas de antemão.

#### 5. Organização de arquivo e entrega — peso MÉDIO
*O editor abre a fila de segunda às 8h; material sem nomenclatura trava a semana inteira do time.*

- **5** — entregava material bruto para outra pessoa editar, com padrão de nomenclatura ou pasta declarado.
- **3** — organizava o próprio material, sem entregar para terceiros.
- **1** — nenhuma evidência de entrega organizada a outra pessoa.

## O que NÃO pode pesar em nenhuma hipótese
**O padrão:** nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro, regionalismo · tempo em desemprego, número de empregos, troca de área, intervalo entre empregos · adjetivos sem evidência citável ("perfil jovem", "boa energia", "proatividade", "boa aparência").

**Os específicos desta vaga:**

1. **Curso superior.** É **diferencial**, não requisito — no anúncio ele aparece sob Diferenciais.
2. **Marca do equipamento que a pessoa tem.** Quem filma bem com celular filma bem; quem tem câmera cara não necessariamente. O anúncio pede domínio de captação, não posse de equipamento — e pedir equipamento próprio num contrato PJ filtra por capital, não por competência.
3. **Qualidade estética das peças do portfólio como prova de talento pessoal.** Boa parte do que se vê num portfólio audiovisual é trabalho de edição e direção de outra pessoa. A rubrica avalia o que o candidato **declara ter feito**, não o acabamento final do material.
4. **Número de seguidores de qualquer perfil citado.** É popularidade, não competência.
5. **Os adjetivos do próprio anúncio**: "nova fase", "base pronta para trabalhar", "espaço para construir o método". Descrevem a empresa.

## Instruções de calibragem
- **Portfólio que a IA não consegue abrir nunca penaliza.** Ela não abre páginas nem assiste a vídeos; penalizar por isso seria descontar do candidato uma limitação nossa. Se informou links, considera-se atendido.
- **Silêncio não é ausência.** Currículo não declara "tenho disponibilidade integral". Sem menção a disponibilidade, pretensão ou residência, registra-se "evidência insuficiente" (`insufficient_evidence`) — é pergunta de entrevista.
- **Se o anúncio pede algo que o formulário não coleta, não desconta.**
- **Toda afirmação precisa de trecho literal** do currículo ou da resposta. Sem trecho que sustente, é "evidência insuficiente" (`insufficient_evidence`), nunca inferência.$rub$,
    $pesos${"triagem":30,"work_sample_sjt":30,"redacao_cultural":15,"entrevista":25}$pesos$::jsonb,
    $testes$[{"teste":"triagem","obrigatorio":true,"customizado":false},{"teste":"work_sample_sjt","obrigatorio":true,"customizado":false,"cargo":"videomaker-storymaker"},{"teste":"redacao_cultural","obrigatorio":true,"customizado":false,"codigos":["F1"]},{"teste":"big_five","obrigatorio":false,"customizado":false},{"teste":"cognitivo","obrigatorio":false,"customizado":false},{"teste":"entrevista","obrigatorio":true,"customizado":false}]$testes$::jsonb,
    v_autor, v_autor
  )
  RETURNING id INTO v_vaga;

  -- ── as 7 perguntas da Etapa 1 (§2) ───────────────────────────────────
  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, p.ordem, p.texto, p.ajuda,
         p.tipo::tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
      ('curriculo', 1,
       $q1$Cole os links do seu portfólio: perfis onde seus stories ou vídeos verticais foram publicados (@ do Instagram ou TikTok), pasta com material, ou site. Pode colar mais de um.$q1$,
       $a1$Pode ser perfil próprio, de freelance ou de empresa. Se já não estiver no ar, descreva em uma linha o que você captava ali.$a1$,
       'texto_curto',
       NULL::jsonb,
       true, 500::int),

      ('jornada', 2,
       $q2$Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta?$q2$,
       NULL::text,
       'single_choice',
       $op2$["Tenho disponibilidade integral e presencial em São Paulo, de segunda a sexta","Moro fora de São Paulo, mas pretendo me mudar para assumir a vaga","Só tenho disponibilidade para trabalho remoto ou híbrido","Tenho disponibilidade parcial, apenas alguns dias na semana"]$op2$::jsonb,
       true, NULL::int),

      ('curriculo', 3,
       $q3$Há quanto tempo você capta e publica conteúdo audiovisual (stories, vídeo vertical ou foto) de forma profissional?$q3$,
       NULL::text,
       'single_choice',
       $op3$["Menos de 1 ano captando conteúdo audiovisual profissionalmente","Entre 1 e 3 anos","Entre 3 e 5 anos","Mais de 5 anos"]$op3$::jsonb,
       true, NULL::int),

      ('curriculo', 4,
       $q4$Quais destas já foram responsabilidade sua, e não apoio a outra pessoa?$q4$,
       NULL::text,
       'multiple_choice',
       $op4$["Publiquei stories em tempo real, no mesmo dia da captação, com constância","Montei set de gravação com luz, áudio e teleprompter","Gravei com alguém que não é ator, conduzindo a pessoa durante a gravação","Cobri evento ou rotina de trabalho sem roteiro prévio","Organizei e entreguei material bruto para outra pessoa editar","Nenhuma destas foi responsabilidade minha até hoje"]$op4$::jsonb,
       true, NULL::int),

      ('tecnologia', 5,
       $q5$Quais destes você opera sem precisar de ajuda?$q5$,
       NULL::text,
       'multiple_choice',
       $op5$["Câmera mirrorless ou DSLR em modo manual","Celular em modo manual (exposição, foco, balanço de branco)","Microfone de lapela e captação de áudio externo","Iluminação portátil","Teleprompter","CapCut, InShot ou similar no celular","Lightroom para tratamento de foto","Premiere ou Photoshop"]$op5$::jsonb,
       true, NULL::int),

      ('curriculo', 6,
       $q6$Você já captou conteúdo em ambiente com pacientes, clientes ou pessoas que não são da equipe?$q6$,
       NULL::text,
       'single_choice',
       $op6$["Sim, em ambiente de saúde (clínica, consultório ou hospital)","Sim, em outro ambiente com pessoas de fora da equipe (loja, evento, escola)","Sim, mas só com equipe e pessoas avisadas de antemão","Não captei em ambiente assim"]$op6$::jsonb,
       true, NULL::int),

      ('valores', 7,
       $q7$O que mais te atrai nesta vaga?$q7$,
       NULL::text,
       'single_choice',
       $op7$["Estar na clínica todo dia e transformar a rotina real em conteúdo","Trabalhar perto de quem aparece, conduzindo as gravações com ele","Trabalhar com saúde e aprender sobre laser e odontologia","A remuneração e o modelo de contrato","A estabilidade de um time interno, em vez de freelas avulsos"]$op7$::jsonb,
       true, NULL::int)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- ── knockout (D1, aprovado pelo operador em 2026-10-12), escrito por TEXTO ──
  -- Direto em pergunta_opcao_metadata porque a RPC oficial
  -- (upsert_pergunta_opcoes_metadata) le auth.jwt() — que a Management API nao
  -- carrega — e sairia 'forbidden'. O sweep de submit_candidatura_atomic casa
  -- por TEXTO (r.resposta_opcoes @> to_jsonb(m.opcao_texto)), entao o opcao_id
  -- e gen_random_uuid().
  SELECT id INTO v_perg_ko FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 2 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  VALUES (v_perg_ko, gen_random_uuid(),
          $ko$Só tenho disponibilidade para trabalho remoto ou híbrido$ko$, 'knockout', 0, 3);

  -- ⚠ UM caractere de diferenca entre opcoes_resposta e opcao_texto deixa o
  -- knockout verde, silencioso e INERTE — pior que nao te-lo, porque parece que existe.
  SELECT count(*) INTO v_casou
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
   WHERE p.vaga_id = v_vaga AND m.tag = 'knockout'
     AND p.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_casou <> 1 THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes) das perguntas, esperado exatamente 1 — o texto divergiu e o knockout ficaria inerte', v_casou;
  END IF;

  -- ── portoes do publish_vaga, conferidos aqui para a vaga nao nascer impublicavel ──
  -- Contagem BRUTA (sem filtrar deleted_at), como o publish_vaga conta.
  SELECT count(*), count(*) FILTER (WHERE tipo_resposta::text IN ('texto_curto','texto_longo'))
    INTO v_total, v_abertas
    FROM public.perguntas_formulario WHERE vaga_id = v_vaga;
  IF v_total <> 7 THEN
    RAISE EXCEPTION 'a vaga ficou com % perguntas, e este arquivo inseriu 7', v_total;
  END IF;
  IF v_total > 10 THEN
    RAISE EXCEPTION 'a vaga ficou com % perguntas — o teto do publish_vaga e 10', v_total;
  END IF;
  IF v_abertas > 1 THEN
    RAISE EXCEPTION 'a vaga ficou com % perguntas abertas — o teto do publish_vaga e 1', v_abertas;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.pergunta_opcao_metadata m
      JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
     WHERE p.vaga_id = v_vaga AND m.tag = 'knockout' AND p.obrigatoria IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'pergunta com opcao knockout nao e obrigatoria — o publish_vaga recusaria';
  END IF;

  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'work_sample_sjt')::int
       + (pesos_avaliacao->>'redacao_cultural')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_soma FROM public.vagas WHERE id = v_vaga;
  IF v_soma IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'pesos somam %, e o publish_vaga exige exatamente 100', v_soma;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
     WHERE v.id = v_vaga AND (t->>'obrigatorio')::boolean IS TRUE
  ) THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — o publish_vaga recusaria publicar';
  END IF;

  -- ── portoes do que esta migration prometeu ──────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.vagas
     WHERE id = v_vaga AND (status <> 'rascunho' OR created_by IS NULL OR updated_by IS NULL)
  ) THEN
    RAISE EXCEPTION 'a vaga nasceu fora de rascunho ou sem autor';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.perguntas_formulario
     WHERE vaga_id = v_vaga AND (created_by IS NULL OR updated_by IS NULL)
  ) THEN
    RAISE EXCEPTION 'alguma pergunta ficou com created_by nulo — e exatamente o defeito que esta via existe para nao repetir';
  END IF;

  RAISE NOTICE 'vaga % criada como rascunho, autor %: % perguntas (% aberta), knockout casando por texto, pesos somando %',
    v_vaga, v_autor, v_total, v_abertas, v_soma;
END
$vaga$;
