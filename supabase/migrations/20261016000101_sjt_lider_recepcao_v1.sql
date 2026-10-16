-- 20261016000101_sjt_lider_recepcao_v1.sql
--
-- POR QUE ESTA MIGRATION EXISTE
-- Banco SJT NOVO do cargo `lider-recepcao`, criado com o operador em 2026-10-16 ao montar a vaga
-- `lider-recepcao`. O banco `recepcionista` (1 item, de atendimento, sem vaga apontando) mede outra
-- coisa e fica intacto. A lider comeca sozinha na recepcao e monta a equipe, e dona do processo
-- (agenda, confirmacao, padrao de atendimento) e cuida da fidelizacao SEM vender. Entram 6 mc de
-- POSTURA escolhidos pelo operador numa lista de doze (faltas do mes, o erro que foi seu, o
-- checklist que ninguem segue, a reclamacao em voz alta, o paciente que pergunta de clareamento, o
-- feedback que voce da) e um caso aberto: a jornada da paciente nova com medo de dentista, da
-- marcacao ao dia seguinte. Cargo novo: nada a retirar (--cargo-novo).
--
-- FONTE: docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md (md5 83388b25f30e8df9b1f42ec6aefa1025), GERADO por scripts/geradores/gen-sjt-sdr-v3.py — nunca
-- transcrito. Itens de texto identico ao v2 tem o mesmo content_hash e NAO sao reinseridos.
-- Itens que saem sao RETIRADOS (status 'retired'), nunca apagados: as respostas gravadas continuam
-- resolvendo para eles.
--
-- Aditivo e reversivel (desfazer: status 'active' nos retirados, 'retired' nos novos).
-- Sem BEGIN/COMMIT (D-22): o endpoint ja roda o corpo numa transacao.
-- 

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

DO $pre$
DECLARE
  v_n bigint;
BEGIN
  -- Cargo NOVO: nao pode haver item nenhum do cargo, em status nenhum. Se houver, nao e cargo novo,
  -- e pular a retirada esconderia um banco que ja existe.
  SELECT count(*) INTO v_n FROM public.perguntas WHERE tipo = 'sjt' AND cargo = 'lider-recepcao';
  IF v_n > 0 THEN
    RAISE EXCEPTION 'o cargo % ja tem % item(ns) — nao e cargo novo', 'lider-recepcao', v_n;
  END IF;
  PERFORM set_config('sdr3.a_retirar', '0', true);
END
$pre$;

-- 01 · lider-recepcao · mc · MC1 · As faltas do mês
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i1d$Dono do processo$i1d$, $i1c$No fechamento do mês, você vê que as faltas na agenda subiram: um em cada cinco pacientes marcados não veio, quase todos de primeira consulta.$i1c$, 'mc', 4, NULL, 'a177346894d77ab11bffbde80fc9822d943c7706958d4b01dedd7a0033889fb7', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a177346894d77ab11bffbde80fc9822d943c7706958d4b01dedd7a0033889fb7')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i1o1$Vê quem faltou e como foi confirmado, testa uma mudança na confirmação e mede no mês seguinte.$i1o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i1o2$Passa a ligar na véspera para todos os pacientes, além da mensagem, e mantém o resto como está.$i1o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i1o3$Leva o número à coordenação na reunião do mês e pergunta o que ela quer que a recepção faça.$i1o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i1o4$Explica que falta em primeira consulta é comum e depende do paciente, não da recepção.$i1o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 02 · lider-recepcao · mc · MC2 · O erro que foi seu
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i2d$Responsabilidade$i2d$, $i2c$Dois pacientes chegam para o mesmo horário com o mesmo dentista. Ao conferir, você vê que foi você quem marcou o segundo, por engano.$i2c$, 'mc', 4, NULL, '1e16b045557b86a9d18bd591e8010d5516e6f500caa56465cf8ce869c396f658', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '1e16b045557b86a9d18bd591e8010d5516e6f500caa56465cf8ce869c396f658')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i2o1$Assume o erro com os dois, dá a cada um uma saída boa e revê como confere a agenda ao marcar.$i2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i2o2$Pede desculpas, encaixa um dos dois e segue o dia sem mudar nada na forma de marcar.$i2o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i2o3$Pede ao dentista que decida qual dos dois atende primeiro e que explique a espera ao outro.$i2o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i2o4$Diz aos pacientes que o sistema às vezes duplica horários e que isso foge do controle da recepção.$i2o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 03 · lider-recepcao · mc · MC3 · O checklist que ninguém segue
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i3d$Dono do processo + Equipe$i3d$, $i3c$A recepção tem um checklist de abertura e de fechamento. Quando as auxiliares cobrem o seu almoço ou a sua folga, ele fica sem preencher, e sempre se perde alguma coisa.$i3c$, 'mc', 4, NULL, 'fd9acd3ff547987ed208228196a662a4eb8c1aa9c803bae002442263ca911d8c', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'fd9acd3ff547987ed208228196a662a4eb8c1aa9c803bae002442263ca911d8c')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i3o1$Pergunta a elas o que atrapalha, simplifica o checklist com essa ajuda e confere junto no começo.$i3o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i3o2$Explica de novo a importância do checklist e pede que elas preencham sempre que cobrirem você.$i3o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i3o3$Deixa de contar com o checklist e, quando volta, confere e corrige tudo por conta própria.$i3o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i3o4$Avisa a coordenação que as auxiliares não seguem o processo e pede que alguém cobre delas.$i3o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 04 · lider-recepcao · mc · MC4 · A reclamação em voz alta
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i4d$Experiência do paciente + Conflito$i4d$, $i4c$Um paciente chega irritado com uma cobrança que considera errada e reclama em voz alta, na sala de espera, na frente de outros pacientes.$i4c$, 'mc', 4, NULL, 'a34a129676bbd1418443fbf31aac0b58670f54813be90b33821e4007a6837c2d', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a34a129676bbd1418443fbf31aac0b58670f54813be90b33821e4007a6837c2d')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i4o1$Leva-o a um lugar reservado, ouve sem interromper, confere a cobrança e diz quando dá o retorno.$i4o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i4o2$Ouve ali mesmo, com calma, pede desculpas e promete que o financeiro vai ligar para ele.$i4o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i4o3$Pede com educação que ele fale mais baixo, por causa dos outros pacientes, e então escuta a queixa.$i4o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i4o4$Explica na hora que a cobrança está certa, para os outros pacientes não ficarem com dúvida.$i4o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 05 · lider-recepcao · mc · MC5 · "E o clareamento, funciona para mim?"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i5d$Fidelização + Limite da função$i5d$, $i5c$Na saída da consulta, um paciente em tratamento pergunta a você se o clareamento a laser funcionaria para ele e quanto custa.$i5c$, 'mc', 4, NULL, '11f3160ea246845dbc756972e2c397d87b58f4266a998ec9482f858bb71150b7', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '11f3160ea246845dbc756972e2c397d87b58f4266a998ec9482f858bb71150b7')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i5o1$Acolhe o interesse, explica que a indicação sai da avaliação, registra o pedido e já combina a data.$i5o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i5o2$Diz que vai perguntar ao dentista e dá retorno depois, sem registrar o pedido nem o próximo passo.$i5o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i5o3$Entrega o material da clínica sobre clareamento e diz que ele pode marcar uma avaliação quando quiser.$i5o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i5o4$Diz que funciona muito bem e passa o valor da tabela, para ele já sair com a decisão encaminhada.$i5o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 06 · lider-recepcao · mc · MC6 · O feedback que você dá
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'lider-recepcao', $i6d$Liderança + Experiência do paciente$i6d$, $i6c$A recepcionista que você ajudou a treinar é rápida e organizada, mas você percebe que ela atende os pacientes de forma fria: não olha nos olhos e não os chama pelo nome.$i6c$, 'mc', 4, NULL, 'df553ffba78269858ee24aae2e64b060fb34970c13de130501c8f23984b47f86', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'df553ffba78269858ee24aae2e64b060fb34970c13de130501c8f23984b47f86')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i6o1$Conversa com ela em particular, com exemplos do que viu, combina o que mudar e acompanha.$i6o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i6o2$Dá um toque rápido entre um atendimento e outro, com gentileza, e confia que ela vai ajustar.$i6o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i6o3$Prefere não falar nada por enquanto, porque ela é eficiente e a agenda está sempre em dia.$i6o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i6o4$Comenta com a coordenação que a colega é fria com os pacientes, para que a coordenação resolva.$i6o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 07 · lider-recepcao · caso aberto · Caso aberto · A jornada da paciente nova
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'lider-recepcao', NULL, $i7c$Uma paciente nova marcou pelo WhatsApp a primeira avaliação com o Dr. Fernando, para a semana que vem. Na conversa, ela contou que tem muito medo de dentista e que não vai a um há anos.

Escreva: passo a passo, o que você faz desde a marcação até o dia seguinte à avaliação: a confirmação, a chegada, a espera, a saída e o contato depois.$i7c$, 'caso_aberto', 20, $i7r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "confirmacao_e_preparo", "peso": 15}, {"dimension": "acolhimento_na_chegada", "peso": 25}, {"dimension": "espera_sem_surpresas", "peso": 20}, {"dimension": "saida_e_proximo_passo", "peso": 20}, {"dimension": "contato_depois", "peso": 20}]}$i7r$::jsonb, 'bc3574922162e4b2ffe28295d85f10252906459be29c0f35e7823b343cee10b2', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'bc3574922162e4b2ffe28295d85f10252906459be29c0f35e7823b343cee10b2');

-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA (D-35 b) — depois dos INSERTs, no MESMO arquivo: os itens ativos dos cargos do texto
-- cujo hash NAO esta no texto deixam de ser sorteados. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_n bigint;
BEGIN
  UPDATE public.perguntas SET status = 'retired'
   WHERE tipo = 'sjt' AND cargo = ANY (ARRAY['lider-recepcao']::text[]) AND status = 'active'
     AND content_hash <> ALL (ARRAY['a177346894d77ab11bffbde80fc9822d943c7706958d4b01dedd7a0033889fb7', '1e16b045557b86a9d18bd591e8010d5516e6f500caa56465cf8ce869c396f658', 'fd9acd3ff547987ed208228196a662a4eb8c1aa9c803bae002442263ca911d8c', 'a34a129676bbd1418443fbf31aac0b58670f54813be90b33821e4007a6837c2d', '11f3160ea246845dbc756972e2c397d87b58f4266a998ec9482f858bb71150b7', 'df553ffba78269858ee24aae2e64b060fb34970c13de130501c8f23984b47f86', 'bc3574922162e4b2ffe28295d85f10252906459be29c0f35e7823b343cee10b2']::text[]);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM set_config('p52.banco_retirados', v_n::text, true);
END
$retira$;

DO $pos$
DECLARE
  v_n bigint;
  v_mc bigint;
  v_ca bigint;
  v_max bigint;
BEGIN
  SELECT count(*) FILTER (WHERE formato = 'mc'), count(*) FILTER (WHERE formato = 'caso_aberto')
    INTO v_mc, v_ca
    FROM public.perguntas WHERE tipo = 'sjt' AND cargo = 'lider-recepcao' AND status = 'active';
  IF (v_mc, v_ca) IS DISTINCT FROM (6::bigint, 1::bigint) THEN
    RAISE EXCEPTION 'cargo % ficou com % mc + % caso ativos', 'lider-recepcao', v_mc, v_ca;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'lider-recepcao' AND status = 'active'
     AND content_hash = ANY (ARRAY['a177346894d77ab11bffbde80fc9822d943c7706958d4b01dedd7a0033889fb7', '1e16b045557b86a9d18bd591e8010d5516e6f500caa56465cf8ce869c396f658', 'fd9acd3ff547987ed208228196a662a4eb8c1aa9c803bae002442263ca911d8c', 'a34a129676bbd1418443fbf31aac0b58670f54813be90b33821e4007a6837c2d', '11f3160ea246845dbc756972e2c397d87b58f4266a998ec9482f858bb71150b7', 'df553ffba78269858ee24aae2e64b060fb34970c13de130501c8f23984b47f86', 'bc3574922162e4b2ffe28295d85f10252906459be29c0f35e7823b343cee10b2']::text[]);
  IF v_n IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'so % dos % itens do texto estao ativos', v_n, 7;
  END IF;
  IF current_setting('p52.banco_retirados')::bigint IS DISTINCT FROM current_setting('sdr3.a_retirar')::bigint THEN
    RAISE EXCEPTION 'retirou % itens, o PRE mediu % a retirar',
      current_setting('p52.banco_retirados'), current_setting('sdr3.a_retirar');
  END IF;
  -- Toda alternativa dos mc ativos tem opcao_id uuid v4 (o gabarito nao viaja no id).
  SELECT count(*) INTO v_n FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.cargo = 'lider-recepcao' AND p.status = 'active'
     AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  IF v_n > 0 THEN
    RAISE EXCEPTION '% alternativa(s) ativa(s) com opcao_id fora de uuid v4', v_n;
  END IF;
  -- Cada mc ativo tem as 4 etiquetas, uma de cada.
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = 'lider-recepcao' AND p.status = 'active' AND p.formato = 'mc'
     AND (SELECT count(DISTINCT o.tag) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) <> 4;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% item(ns) mc sem as 4 etiquetas', v_n;
  END IF;
  -- Anti-escada (D-37) sobre o banco VIVO: a certa nao ocupa a mesma posicao em mais de 3.
  SELECT max(c) INTO v_max FROM (
    SELECT o.ordem, count(*) AS c FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
     WHERE p.tipo = 'sjt' AND p.cargo = 'lider-recepcao' AND p.status = 'active' AND o.tag = 'fortemente_pontua'
     GROUP BY o.ordem) x;
  IF v_max > 3 THEN
    RAISE EXCEPTION 'a alternativa certa cai na mesma posicao em % itens (maximo 3)', v_max;
  END IF;
  RAISE NOTICE 'banco %: % mc + % caso ativos; % retirados', 'lider-recepcao', v_mc, v_ca,
    current_setting('p52.banco_retirados');
END
$pos$;
