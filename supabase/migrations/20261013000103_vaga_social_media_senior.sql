-- =============================================================================
-- Migration: vaga social-media-senior-marca-pessoal (Social Media Sênior)
-- Date: 2026-10-13
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
-- FONTE: o documento de validacao docs/vagas/social-media-senior-marca-pessoal.md
-- (validado por Fernando e Amanda). Todo texto abaixo foi EXTRAIDO dele por
-- script, nao transcrito. Autor da vaga e de cada pergunta: Fernando Costa Neto.
--
-- A vaga nasce `rascunho`. Publicar e ato humano separado, com portao proprio
-- (`publish_vaga`). Este arquivo ja confere, depois dos INSERTs, os portoes
-- daquela RPC — para a vaga nao nascer impublicavel.
--
-- KNOCKOUT (decisao do operador D1, 12/10): a opcao "Só tenho disponibilidade
-- para trabalho remoto ou híbrido" da pergunta 2 encerra a candidatura na
-- inscricao. E escrito DIRETO em `pergunta_opcao_metadata`: a RPC oficial
-- (`upsert_pergunta_opcoes_metadata`) le `auth.jwt()`, que a via de apply nao
-- carrega. O sweep de `submit_candidatura_atomic` casa por TEXTO
-- (`resposta_opcoes @> to_jsonb(opcao_texto)`), entao a guarda abaixo aborta se
-- algum texto do metadata nao casar com `opcoes_resposta` — um caractere de
-- diferenca deixaria o knockout verde, silencioso e inerte.
--
-- ANUNCIO x RUBRICA: `sobre_cargo`/`requisitos_*` sao a copia que ATRAI;
-- `rubrica_ia` e o criterio que AVALIA. Sao textos com propositos opostos e
-- nunca o mesmo texto. `qualificacao_etapa1` nao e tocado: e snapshot que o
-- proprio `publish_vaga` escreve a partir das perguntas reais.
-- `aplica_cognitivo` fica false (decisao D2): ele liga a prova textual.
--
-- Aditivo e reversivel. Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $vaga$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_p2    uuid;
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

  IF EXISTS (SELECT 1 FROM public.vagas WHERE slug = 'social-media-senior-marca-pessoal') THEN
    RAISE EXCEPTION 'ja existe vaga com slug % — nada a fazer', 'social-media-senior-marca-pessoal';
  END IF;

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
    'social-media-senior-marca-pessoal', $tit$Social Media Sênior$tit$, $sub$Linha editorial, roteiro e publicação para o perfil do Dr. Fernando Costa Jr., que lidera a clínica · squad de Marketing · PJ presencial$sub$, 'rascunho',
    $dcurta$Você transforma as teses e a voz do Dr. Fernando Costa Jr., que lidera a Beauty Smile em linha editorial, roteiro e publicação. Contrato PJ, presencial na unidade Paraíso, em São Paulo, com início imediato.$dcurta$, 'Marketing', 'PJ', 'Presencial', $nivel$Sênior$nivel$,
    $cid$São Paulo$cid$, 'SP', $ender$Unidade Paraíso — São Paulo/SP$ender$, $jorn$Segunda a sexta, presencial; publicações de fim de semana programadas$jorn$,
    5000, 6900, false, 1,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date, false,
    $scargo$O marketing da Beauty Smile entrou numa fase nova: a produção de conteúdo passou a ser feita por um time interno, com investimento em mídia e contato direto com o Dr. Fernando Costa Jr., cirurgião-dentista que lidera a clínica e é o rosto da marca.

Você é quem transforma as teses e a voz dele em linha editorial, roteiro e publicação. Responde pelo que vai ao ar — pauta, roteiro, legenda, publicação e reaproveitamento. Não responde por verba de mídia nem por estratégia de marca, e não aprova conteúdo clínico: isso é do responsável técnico.

**Onde e quando.** Presencial, na unidade Paraíso, em São Paulo, de segunda a sexta. O endereço fica no bairro Paraíso, perto dos metrôs Brigadeiro e Paraíso. A rotina acontece dentro da clínica, porque o conteúdo nasce do que acontece lá — a leitura semanal de roteiros é em voz alta, com o Dr., e você acompanha gravação quando necessário.

As publicações de fim de semana ficam programadas, com repost pontual quando faz sentido. Não é plantão: é calendário programado na sexta.

**Início imediato.**

**Os primeiros 90 dias.** Esta vaga tem um período de avaliação de 90 dias, com conversas de acompanhamento nos dias 30, 60 e 90. Boa parte do que você vai fazer nesse período não existe ainda — são processos a construir: a linha editorial do perfil do Dr., o guia do personagem com os limites de publicidade em saúde escritos, a grade de quadros, o checklist de conformidade por peça e o fluxo de reaproveitamento.

**O que você encontra pronto.** Brand book, estudos por tratamento, pesquisas e roteiros de 2025. Você não começa do zero — começa de uma base e constrói o método junto com o time.$scargo$,
    $resp$- **Linha editorial e teses.** Extrair as teses do Dr. em sessão estruturada, consolidar a linha editorial e manter o banco de frases dele, com pelo menos 10 frases novas por semana.
- **Roteiros.** Cerca de 5 por semana, com teleprompter e 4 hooks cada. Conduzir a leitura semanal em voz alta com ele e registrar os ajustes pedidos.
- **Calendário e publicação.** Planejar o calendário, deixar as publicações programadas (fim de semana incluso) e publicar com legenda revisada.
- **Quadros e dado.** Testar quadros e apurar alcance e retenção de cada um, com recomendação de manter, ajustar ou cortar — sustentada por número, não por gosto.
- **Reaproveitamento.** Desdobrar cada Reel em frase, carrossel, newsletter ou blog em até 3 dias.
- **Produção audiovisual.** Entregar ao videomaker a pauta de gravação, e aprovar os vídeos do editor ou devolver com orientação escrita.
- **Conformidade.** Garantir que nenhuma peça prometa resultado, use superlativo sem lastro, cite concorrente, crie urgência artificial ou mostre preço. Submeter ao responsável técnico toda peça com procedimento, antes de publicar.$resp$,
    NULL,
    $rexp$- Pelo menos **3 anos** produzindo conteúdo para Instagram e/ou TikTok — perfil próprio, de freelance ou de empresa.
- Portfólio de perfis publicados, que dê para abrir e ver.
- Escopo de sênior demonstrável: já ter construído uma linha editorial do zero, e já ter escrito na voz de outra pessoa.$rexp$,
    $rtec$Instagram em profundidade (Reels, carrossel, stories, agendamento, métricas nativas) · produção de roteiro com hook, ritmo e CTA · leitura de métricas para decidir · Reportei · Canva · Notion · ferramentas de IA para pesquisa, sempre com revisão e checagem de fonte. Conta ponto: CapCut, e plataforma de newsletter ou blog.$rtec$,
    $rhab$Escrita na voz do outro · constância · checagem de fonte · iniciativa · colaboração (devolver ao editor o que mudar e por quê, nunca só "refazer").$rhab$,
    $dif$- Curso superior completo ou em andamento em Marketing, Comunicação, Jornalismo, Publicidade ou área correlata.
Marca pessoal de profissional de saúde ou de outro mercado regulado · humor que funciona em roteiro · newsletter ou blog mantido com constância.$dif$,
    $ben$Contrato de prestação de serviços (PJ), contra nota fiscal. É necessário ter CNPJ ativo.

- **Valor fixo mensal.**
- **Variável por desempenho**, sobre metas de entrega publicadas e apuradas no fim do mês.
- **Participação na meta coletiva do squad.**
- **Evolução:** revisão trimestral do fixo, com as metas recalibradas em dezembro de 2026.

Os valores são combinados na entrevista.

Benefícios: plano de saúde · Wellhub · tratamentos Beauty Smile e desconto para familiares · cursos e treinamentos internos.

**O que este contrato não inclui:** vale-refeição e vale-transporte. Eles valem para o quadro CLT, e esta vaga é PJ.$ben$,
    $semp$A Beauty Smile nasceu da união de três trajetórias de inovação: Fernando Costa Jr., pioneiro em implantes no Brasil e fundador das primeiras clínicas dedicadas exclusivamente à especialidade; Fernando Costa Neto, que enxergou o potencial revolucionário do laser na odontologia; e Ricardo Blaustein, que trouxe a tecnologia Fotona ao país. Somos a única clínica do Brasil a trabalhar exclusivamente com o laser Fotona LightWalker, o sistema mais avançado do mundo — para oferecer uma odontologia sem dor, sem trauma e com uma experiência humanizada.

Além da excelência clínica, mantemos um compromisso social real: projetos em parceria com o Instituto Alok e na comunidade do Salgueiro levam odontologia de ponta a quem mais precisa. Aqui, não tratamos apenas sorrisos — transformamos vidas.$semp$,
    $perfil$Pessoa que escreve na voz de outra pessoa e sustenta calendário sem ser cobrada. Vem de operação de conteúdo própria ou de agência, com perfil sob responsabilidade dela, há pelo menos 3 anos. Sabe dizer, com número de alcance ou retenção, por que um conteúdo foi bem e por que outro não foi. Já construiu linha editorial do zero, não só executou pauta de terceiro. Trabalha colada a quem aparece no vídeo, e precisa discordar dele sem desgastar a relação. Na entrevista, sondar: como reage a pedido do chefe que contraria o dado, e o que faz quando uma peça esbarra em norma de publicidade em saúde. Riscos a investigar: quem só executou pauta pronta, e quem nunca precisou segurar uma publicação.$perfil$,
    $sec$[{"titulo":"Conheça a Beauty Smile","conteudo":"- Perfil do Dr. Fernando Costa Jr., onde o trabalho acontece: @fernandocostalaser\n- Instagram da clínica: @beautysmilefotona\n- YouTube: @beautysmilefotona\n- Facebook: BeautySmileFotona\n- Site: beautysmile.com.br"}]$sec$::jsonb,
    $rub$## Requisitos eliminatórios
São três. Cada um que faltar registra uma lacuna de severidade crítica (`critical`) e segura o score abaixo de 40.

1. **Portfólio de perfis publicados.**
2. **Pelo menos 3 anos** produzindo conteúdo para Instagram e/ou TikTok.
3. **Disponibilidade presencial em São Paulo**, de segunda a sexta.

"Eliminatório" aqui significa **segurar o score baixo e acender sinal para o RH** — nunca descartar a pessoa.

- **Portfólio que a IA não consegue abrir nunca penaliza.** Se o candidato informou links, considera-se atendido. Ela não abre páginas; penalizar por isso seria descontar do candidato uma limitação nossa.
- **Silêncio não é ausência.** Currículo não declara "tenho disponibilidade integral". Se o currículo não diz nada sobre disponibilidade, pretensão ou residência, a IA registra "evidência insuficiente" (`insufficient_evidence`) — é pergunta de entrevista, não de currículo.
- **Se o anúncio pede algo que o formulário não coleta, não desconta por isso.** Falha do sistema não penaliza candidato.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

#### 1. Roteiro para vídeo curto — peso ALTO
*É a competência central: a pessoa escreve cerca de 5 roteiros por semana, com 4 hooks cada.*

- **5** — escreveu roteiro para vídeo vertical de forma recorrente, com responsabilidade sobre abertura e retenção, e cita formatos ou resultados.
- **3** — escreveu legenda e post, e participou de roteiro sem responder por ele.
- **1** — nenhuma evidência de escrita para vídeo.

#### 2. Escrita na voz de outra pessoa — peso ALTO
*Todo o conteúdo sai no nome e no tom do cirurgião-dentista, não no da pessoa contratada.*

- **5** — produziu conteúdo assinado por terceiro (executivo, médico, creator, marca com porta-voz) e descreve como capturou o tom.
- **3** — escreveu para marca com manual de tom de voz, sem porta-voz pessoal.
- **1** — só produziu conteúdo em nome próprio.

#### 3. Constância de calendário — peso MÉDIO
*O perfil publica todo dia, fim de semana incluso, e cai se depender de cobrança.*

- **5** — manteve calendário com frequência declarada (posts por semana ou por mês) por período contínuo.
- **3** — produziu por campanha ou por demanda, sem cadência fixa.
- **1** — nenhuma evidência de volume ou frequência.

#### 4. Decisão por métrica — peso MÉDIO
*Testar quadro e cortar o que não funciona é entrega mensal do cargo.*

- **5** — cita alcance, retenção, salvamento ou conversão para justificar uma decisão de conteúdo que tomou.
- **3** — menciona que acompanhava métricas, sem ligá-las a uma decisão.
- **1** — nenhuma menção a dado.

#### 5. Conteúdo em mercado regulado — peso MÉDIO · conta ponto, não elimina
*Saúde tem norma de publicidade; quem já operou sob restrição erra menos no começo.*

- **5** — produziu para saúde, odontologia, farmacêutica, jurídico, financeiro ou outro setor regulado, e demonstra conhecer o limite.
- **3** — produziu para setor sensível sem regulação formal (educação, bem-estar, estética não clínica).
- **1** — nenhuma experiência em mercado com restrição de comunicação.

## O que NÃO pode pesar em nenhuma hipótese
**O padrão, em qualquer vaga:** nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro, regionalismo na escrita · tempo em desemprego, número de empregos, troca de área, intervalo entre empregos · adjetivos sem evidência citável ("perfil jovem", "boa energia", "proatividade", "boa aparência").

**Os quatro específicos desta vaga:**

1. **Curso superior.** É **diferencial**, não requisito — no anúncio ele aparece sob Diferenciais, e em nenhum lugar entre os requisitos.
2. **Número de seguidores do perfil pessoal do candidato.** É popularidade, não competência.
3. **Humor e sarcasmo como traço de personalidade.** O anúncio cita humor como diferencial *de roteiro* — habilidade demonstrável em portfólio. Julgar se alguém "parece" espirituoso pelo currículo é julgar personalidade, e é por aí que viés entra.
4. **Os adjetivos do próprio anúncio**, nominalmente: "nova fase", "autonomia criativa", "base pronta para trabalhar", "espaço para construir o método". Descrevem a empresa, não o candidato.

**Toda afirmação precisa de trecho literal.** Todo ponto forte e toda lacuna deve citar trecho do currículo ou da resposta. Sem trecho que sustente, é "evidência insuficiente" (`insufficient_evidence`) — nunca inferência.$rub$,
    $pesos${"triagem":25,"work_sample_sjt":30,"redacao_cultural":20,"entrevista":25}$pesos$::jsonb,
    $testes$[{"teste":"triagem","obrigatorio":true,"customizado":false},{"teste":"work_sample_sjt","obrigatorio":true,"customizado":false,"perguntas":[],"cargo":"social-media"},{"teste":"redacao_cultural","obrigatorio":true,"customizado":false,"codigos":["F1"]},{"teste":"big_five","obrigatorio":false,"customizado":false},{"teste":"cognitivo","obrigatorio":false,"customizado":false},{"teste":"entrevista","obrigatorio":true,"customizado":false}]$testes$::jsonb,
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
      ('curriculo', 1, $q1$Cole os links do seu portfólio: perfis que você produziu (@ do Instagram ou TikTok), pasta com peças, ou site. Pode colar mais de um.$q1$, $a1$Pode ser perfil próprio, de freelance ou de empresa. Se o perfil for privado ou já não estiver no ar, descreva em uma linha o que você produzia ali.$a1$,
       'texto_curto', NULL::jsonb, true, 500),
      ('jornada', 2, $q2$Qual é a sua disponibilidade para esta vaga, que é presencial na unidade Paraíso, em São Paulo, de segunda a sexta?$q2$, NULL::text,
       'single_choice', $o2$["Tenho disponibilidade integral e presencial em São Paulo, de segunda a sexta","Moro fora de São Paulo, mas pretendo me mudar para assumir a vaga","Só tenho disponibilidade para trabalho remoto ou híbrido","Tenho disponibilidade parcial, apenas alguns dias na semana"]$o2$::jsonb, true, NULL::int),
      ('curriculo', 3, $q3$Há quanto tempo você produz conteúdo para Instagram e/ou TikTok (perfil próprio, freelance ou empresa)?$q3$, NULL::text,
       'single_choice', $o3$["Menos de 1 ano produzindo conteúdo para Instagram e/ou TikTok","Entre 1 e 3 anos produzindo conteúdo para Instagram e/ou TikTok","Entre 3 e 5 anos produzindo conteúdo para Instagram e/ou TikTok","Mais de 5 anos produzindo conteúdo para Instagram e/ou TikTok"]$o3$::jsonb, true, NULL::int),
      ('curriculo', 4, $q4$Quais destas você já fez com responsabilidade sua, e não como apoio a outra pessoa?$q4$, NULL::text,
       'multiple_choice', $o4$["Construí a linha editorial de um perfil do zero","Escrevi conteúdo assinado por outra pessoa","Cortei ou mudei um quadro com base em métrica","Mantive um calendário publicando toda semana por pelo menos 6 meses","Escrevi roteiro de vídeo vertical com hook e CTA","Nenhuma destas foi responsabilidade minha até hoje"]$o4$::jsonb, true, NULL::int),
      ('curriculo', 5, $q5$Você já produziu conteúdo para clínica de saúde, estética, ou para a marca pessoal de um médico ou dentista?$q5$, NULL::text,
       'single_choice', $o5$["Sim, saúde ou marca pessoal de profissional de saúde","Sim, outro mercado com restrição de publicidade","Sim, estética ou bem-estar sem regulação formal","Não produzi para saúde nem para mercado regulado"]$o5$::jsonb, true, NULL::int),
      ('tecnologia', 6, $q6$Quais destas ferramentas já são rotina do seu trabalho, e não algo que você usou uma vez?$q6$, NULL::text,
       'multiple_choice', $o6$["Métricas nativas do Instagram","Reportei ou similar","Canva","Notion ou similar","Ferramentas de IA para roteiro","CapCut ou similar","Plataforma de newsletter ou blog"]$o6$::jsonb, true, NULL::int),
      ('valores', 7, $q7$O que mais te atrai nesta vaga?$q7$, NULL::text,
       'single_choice', $o7$["Construir a linha editorial do zero, com contato direto com quem aparece","Trabalhar com saúde e aprender sobre laser","Autonomia para testar formatos e decidir com dado","A remuneração e o modelo de contrato","A estabilidade de um time interno"]$o7$::jsonb, true, NULL::int)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- ── knockout da pergunta 2 (D1) ───────────────────────────────────────────
  SELECT id INTO v_p2 FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = 2 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_p2, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho disponibilidade integral e presencial em São Paulo, de segunda a sexta$k1$, 'neutro', 1),
      ($k2$Moro fora de São Paulo, mas pretendo me mudar para assumir a vaga$k2$, 'neutro', 2),
      ($k3$Só tenho disponibilidade para trabalho remoto ou híbrido$k3$, 'knockout', 3),
      ($k4$Tenho disponibilidade parcial, apenas alguns dias na semana$k4$, 'neutro', 4)
    ) AS o(texto, tag, ordem);

  -- Todo texto do metadata TEM de casar com opcoes_resposta. Compara com o
  -- tamanho do proprio array, nao com constante.
  SELECT count(*), max(jsonb_array_length(f.opcoes_resposta)) INTO v_n, v_m
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_p2 AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n IS DISTINCT FROM v_m THEN
    RAISE EXCEPTION 'so % de % opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n, v_m;
  END IF;

  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE f.vaga_id = v_vaga AND m.tag = 'knockout'
     AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes), esperado exatamente 1 (D1)', v_n;
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
  -- (references/avaliacoes.md §1 — vaga apontando para banco vazio publica verde.)
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

  RAISE NOTICE 'vaga % criada como rascunho, autor %, knockout armado na pergunta %', v_vaga, v_autor, v_p2;
END
$vaga$;
