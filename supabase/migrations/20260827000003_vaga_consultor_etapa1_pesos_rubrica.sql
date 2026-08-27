-- =============================================================================
-- Migration: Etapa 1, pesos, testes e rubrica — consultor-relacionamento-pre-vendas
-- Date: 2026-08-27
-- =============================================================================
-- A vaga estava ATIVA — publica — desde 2026-08-23 com ZERO perguntas na Etapa 1,
-- `testes_aplicaveis` VAZIO e os quatro pesos de avaliacao em ZERO. Quem se
-- inscrevesse responderia nada na triagem e sairia com score zero em todas as
-- dimensoes: o funil aceitaria a pessoa e nao teria como avalia-la. Nenhuma
-- inscricao ocorreu, entao ninguem foi prejudicado. A vaga foi despublicada em
-- 20260827000002 e volta ao ar por ato humano, depois disto.
--
-- ⚠ POR QUE A RUBRICA MUDA NO MESMO ARQUIVO. Ela dizia, sobre o requisito de
-- disponibilidade:
--
--     "Se o curriculo nao disser nada sobre disponibilidade, trate como
--      `insufficient_evidence` e NAO como ausencia — e pergunta de entrevista,
--      nao de curriculo."
--
-- Essa ressalva existia porque o formulario NAO COLETAVA disponibilidade. A
-- pergunta 1 passa a coletar, em campo obrigatorio. Deixar a ressalva de pe
-- instruiria a IA a perdoar a ausencia de algo que deixou de ser falha do
-- sistema — ela seguiria absolvendo um buraco que nao existe mais. Campo novo e
-- rubrica andam juntos, ou a rubrica passa a mentir.
--
-- ⚠ E A RUBRICA GANHA O BLOCO "COMO LER AS RESPOSTAS DA ETAPA 1". Ela nao o
-- tinha, porque nao havia perguntas. As respostas chegam ao modelo como lista
-- solta, SEM enunciado e em ordem arbitraria (`analise-candidato-individual`
-- monta o bloco sem ORDER BY). Sem essa instrucao o modelo le por posicao e erra
-- em silencio, devolvendo JSON perfeitamente bem formado.
--
-- Pesos 25/25/15/35 (triagem/redacao/SJT/entrevista), decididos com o operador em
-- 2026-08-27 e diferentes do template `sdr_social_seller` (25/35/15/25) por um
-- motivo medido: a bateria `sdr-social-seller` tem UMA questao. Dar 35% do score a
-- um unico cenario e mais peso do que o instrumento sustenta. A redacao sobe no
-- lugar porque a competencia 1 da propria rubrica e "Comunicacao escrita
-- profissional", com peso ALTO — a funcao vende por escrito.
--
-- KNOCKOUT aprovado explicitamente pelo operador, igual ao da vaga de Social
-- Media: "Tenho disponibilidade apenas para trabalho remoto" rejeita a
-- candidatura na inscricao. A vaga e presencial de segunda a sexta.
--
-- Sem BEGIN/COMMIT (D-22) — o driver envolve a migration na propria transacao.
-- =============================================================================

DO $mig$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_base  int;
  v_perg_disp uuid;
  v_casou int;
  v_total int;
  v_abertas int;
  v_soma int;
BEGIN
  -- ── autor ────────────────────────────────────────────────────────────────
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido — as perguntas nasceriam com created_by nulo, que e a doenca que esta via existe para nao repetir';
  END IF;

  -- ── vaga ─────────────────────────────────────────────────────────────────
  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga "consultor-relacionamento-pre-vendas" nao encontrada — nada a fazer';
  END IF;

  -- Continua a numeracao. Conta SEM filtrar deleted_at de proposito: e assim que
  -- o publish_vaga conta, e o teto de 10 e o dele.
  SELECT COALESCE(max(ordem), 0) INTO v_base
    FROM public.perguntas_formulario WHERE vaga_id = v_vaga;

  -- ── as 5 perguntas ───────────────────────────────────────────────────────
  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, p.bloco, v_base + p.ordem, p.texto, p.ajuda,
         p.tipo::tipo_resposta_pergunta, p.opcoes, p.obrig, p.limite,
         v_autor, v_autor
    FROM (VALUES
      ('jornada', 1,
       $q1$Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, de segunda a sexta, das 9h às 19h?$q1$,
       NULL::text, 'single_choice',
       jsonb_build_array(
         'Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial',
         'Tenho disponibilidade integral e presencial, mas precisaria ajustar o horário de entrada ou de saída',
         'Tenho disponibilidade apenas parcial, em alguns dias da semana',
         'Tenho disponibilidade apenas para trabalho remoto'
       ), true, NULL::int),

      ('curriculo', 2,
       $q2$Há quanto tempo você trabalha com atendimento, vendas, recepção ou relacionamento com cliente?$q2$,
       NULL, 'single_choice',
       jsonb_build_array(
         'Menos de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente',
         'Entre 1 e 2 anos em atendimento, vendas, recepção ou relacionamento com cliente',
         'Entre 2 e 5 anos em atendimento, vendas, recepção ou relacionamento com cliente',
         'Mais de 5 anos em atendimento, vendas, recepção ou relacionamento com cliente'
       ), true, NULL),

      ('tecnologia', 3,
       $q3$Quais destas atividades já são rotina do seu trabalho, e não algo que você fez uma vez?$q3$,
       NULL, 'multiple_choice',
       jsonb_build_array(
         'Atendimento e venda por WhatsApp, escrevendo eu mesmo as mensagens',
         'Prospecção ativa e follow-up de quem não respondeu, seguindo uma cadência definida',
         'Registro de todo contato em CRM (GoHighLevel, RD Station, HubSpot, Pipedrive, Clinicorp ou similar)',
         'Agendamento, confirmação e trabalho ativo para reduzir falta na agenda',
         'Atendimento por Direct do Instagram ou por comentários, como canal de vendas',
         'Acompanhamento de indicadores de conversão e de comparecimento',
         'Nenhuma destas ainda é rotina do meu trabalho'
       ), true, NULL),

      ('curriculo', 4,
       $q4$Você já atendeu ou vendeu em um contexto em que a pessoa decide sobre um valor alto e sente insegurança?$q4$,
       NULL, 'single_choice',
       jsonb_build_array(
         'Sim, atendi cliente decidindo valor alto em clínica odontológica, estética ou de saúde',
         'Sim, atendi cliente decidindo valor alto em outro setor (imóveis, veículos, educação, serviços financeiros)',
         'Atendi cliente final, mas em produto ou serviço de ticket baixo',
         'Ainda não atendi cliente final nesse tipo de decisão'
       ), true, NULL),

      ('valores', 5,
       $q5$O que mais te atrai nesta vaga?$q5$,
       NULL, 'single_choice',
       jsonb_build_array(
         'Ser o primeiro contato de quem chega buscando resolver algo que carrega há anos',
         'A trilha de carreira definida, que pode levar a Coordenação Comercial ou a Closer',
         'Construir os scripts, as cadências e o processo comercial com autonomia',
         'O prêmio por resultado sem teto, atrelado a comparecimento e a venda'
       ), true, NULL)
    ) AS p(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- ── knockout: aprovado pelo operador, escrito por TEXTO ──────────────────
  -- Direto em pergunta_opcao_metadata porque a RPC oficial
  -- (upsert_pergunta_opcoes_metadata) recusa duas vezes nesta via: so edita vaga
  -- em rascunho, e le auth.jwt() — que a Management API nao carrega.
  SELECT id INTO v_perg_disp FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = v_base + 1 AND deleted_at IS NULL;

  INSERT INTO public.pergunta_opcao_metadata (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  VALUES (v_perg_disp, gen_random_uuid(),
          'Tenho disponibilidade apenas para trabalho remoto', 'knockout', 0, 4);

  -- ⚠ O knockout casa por TEXTO no sweep de submit_candidatura_atomic
  -- (`r.resposta_opcoes @> to_jsonb(m.opcao_texto)`). UM caractere de diferenca
  -- entre opcoes_resposta e opcao_texto deixa o knockout verde, silencioso e
  -- INERTE — pior que nao te-lo, porque parece que existe.
  SELECT count(*) INTO v_casou
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
   WHERE p.vaga_id = v_vaga AND m.tag = 'knockout'
     AND p.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_casou <> 1 THEN
    RAISE EXCEPTION 'knockout casou com % opcao(oes) das perguntas, esperado exatamente 1 — o texto divergiu e o knockout ficaria inerte', v_casou;
  END IF;

  -- ── rubrica, pesos e testes ─────────────────────────────────────────────
  UPDATE public.vagas
     SET rubrica_ia = $rub$## Requisitos eliminatórios
Se qualquer um estiver AUSENTE no currículo, registre como gap de severidade `critical`
e mantenha o score composto abaixo de 40, por melhor que seja o resto do perfil.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
  A Etapa 1 coleta isso em faixas nomeadas ("Menos de 1 ano em atendimento, vendas,
  recepção ou relacionamento com cliente", "Entre 1 e 2 anos…"). A faixa declarada vale
  SOBRE o silêncio do currículo. Se as duas fontes divergirem, fique com a evidência
  maior e registre a divergência como observação — nunca como gap.
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

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: elas chegam a você como uma lista solta, SEM o
enunciado de cada pergunta e em ordem arbitrária. Não conte com a posição — identifique
cada resposta pelo próprio conteúdo:
- frases sobre segunda a sexta, horário comercial ou trabalho remoto → disponibilidade;
- faixas de anos "em atendimento, vendas, recepção ou relacionamento" → tempo de experiência;
- a lista de atividades de rotina (WhatsApp, cadência de follow-up, CRM, agenda,
  Direct do Instagram, indicadores) → ferramentas e processo;
- frases sobre atender quem decide valor alto e sente insegurança → contexto de decisão;
- a frase sobre o que atrai na vaga → motivação.

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
         pesos_avaliacao = jsonb_build_object(
           'triagem', 25, 'redacao_cultural', 25, 'work_sample_sjt', 15, 'entrevista', 35
         ),
         testes_aplicaveis = jsonb_build_array(
           jsonb_build_object('teste','triagem','obrigatorio',true,'customizado',false),
           jsonb_build_object('teste','work_sample_sjt','obrigatorio',true,'customizado',false,'cargo','sdr-social-seller'),
           jsonb_build_object('teste','redacao_cultural','obrigatorio',true,'customizado',false),
           jsonb_build_object('teste','big_five','obrigatorio',false,'customizado',false),
           jsonb_build_object('teste','cognitivo','obrigatorio',false,'customizado',false),
           jsonb_build_object('teste','entrevista','obrigatorio',true,'customizado',false)
         ),
         updated_at = NOW(),
         updated_by = v_autor
   WHERE id = v_vaga;

  -- ── portoes do publish_vaga, conferidos aqui para a vaga nao nascer impublicavel ──
  SELECT count(*), count(*) FILTER (WHERE tipo_resposta::text IN ('texto_curto','texto_longo'))
    INTO v_total, v_abertas
    FROM public.perguntas_formulario WHERE vaga_id = v_vaga;

  IF v_total > 10 THEN
    RAISE EXCEPTION 'a vaga ficou com % perguntas (contagem BRUTA, como o publish_vaga conta) — o teto e 10', v_total;
  END IF;
  IF v_abertas > 1 THEN
    RAISE EXCEPTION 'a vaga ficou com % perguntas abertas — o teto do publish_vaga e 1', v_abertas;
  END IF;

  SELECT (pesos_avaliacao->>'triagem')::int + (pesos_avaliacao->>'redacao_cultural')::int
       + (pesos_avaliacao->>'work_sample_sjt')::int + (pesos_avaliacao->>'entrevista')::int
    INTO v_soma FROM public.vagas WHERE id = v_vaga;
  IF v_soma <> 100 THEN
    RAISE EXCEPTION 'pesos somam %, e o publish_vaga exige exatamente 100', v_soma;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) t
     WHERE v.id = v_vaga AND (t->>'obrigatorio')::boolean IS TRUE
  ) THEN
    RAISE EXCEPTION 'nenhum teste obrigatorio — o publish_vaga recusaria devolver a vaga ao ar';
  END IF;

  -- ── portoes do que esta migration prometeu ──────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.perguntas_formulario
     WHERE vaga_id = v_vaga AND deleted_at IS NULL AND created_by IS NULL
  ) THEN
    RAISE EXCEPTION 'alguma pergunta ficou com created_by nulo — e exatamente o defeito que esta via existe para nao repetir';
  END IF;

  -- A rubrica tem de ter PERDIDO a ressalva velha e GANHO o bloco novo. Conferir
  -- so o tamanho, ou so que "Etapa 1" aparece, passaria com a ressalva de pe.
  IF EXISTS (
    SELECT 1 FROM public.vagas
     WHERE id = v_vaga AND rubrica_ia LIKE '%é pergunta de entrevista, não de currículo%'
  ) THEN
    RAISE EXCEPTION 'a ressalva velha sobre disponibilidade continua na rubrica — a IA seguiria perdoando a ausencia de algo que o formulario agora coleta';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vagas
     WHERE id = v_vaga AND rubrica_ia LIKE '%COMO LER AS RESPOSTAS DA ETAPA 1%'
  ) THEN
    RAISE EXCEPTION 'a rubrica ficou sem o bloco COMO LER AS RESPOSTAS DA ETAPA 1 — o modelo leria as respostas por posicao';
  END IF;

  RAISE NOTICE 'ok: % perguntas, pesos somando %, knockout casando por texto', v_total, v_soma;
END
$mig$;
