-- 20261014000102_sjt_sdr_v3.sql
--
-- POR QUE ESTA MIGRATION EXISTE
-- Revisao do banco SJT do cargo `sdr-social-seller`, pedida pelo operador em 2026-10-14 ao montar a vaga
-- `sdr-relacionamento-pre-vendas`: sai o item de indicacao de tratamento (o SDR nao julga
-- indicacao — e do dentista) e o de reclamacao publica; entram contorno de objecao e reativacao
-- da base; "lente" vira "clareamento" no item de preco; o caso aberto ganha follow-up de 7 dias e
-- contorno de objecao de preco.
--
-- FONTE: docs/specs/BANCO-SJT-V3-SDR.md (md5 49aa5d7c35ff70a4c0b6ef9abc4b9ac1), GERADO por scripts/geradores/gen-sjt-sdr-v3.py — nunca
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
  -- Os itens que o texto MANTEM tem de estar vivos agora; senao o texto descreve outro banco.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'sdr-social-seller' AND status = 'active'
     AND content_hash = ANY (ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86', '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5', '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95']::text[]);
  PERFORM set_config('sdr3.mantidos', v_n::text, true);
  -- Quantos ativos do cargo NAO estao no texto: e o que a retirada tem de tirar, nem mais nem menos.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'sdr-social-seller' AND status = 'active'
     AND content_hash <> ALL (ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86', '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5', '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95']::text[]);
  PERFORM set_config('sdr3.a_retirar', v_n::text, true);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nada a retirar no cargo % — o texto ja esta no ar?', 'sdr-social-seller';
  END IF;
END
$pre$;

-- 01 · sdr-social-seller · mc · MC1 · O lead que visualizou e sumiu
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i1d$Atitude de Dono + Comunicação$i1d$, $i1c$Um lead pediu informação pelo Instagram há dois dias. Você respondeu na hora, com um áudio explicando o tratamento, e ele visualizou e não respondeu mais. A meta de agendamentos do mês está apertada.$i1c$, 'mc', 4, NULL, 'f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i1o1$Manda um conteúdo ligado à dúvida dele com uma pergunta aberta, espaça os próximos toques e anota no CRM.$i1o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i1o2$Manda todo dia um "oi, ainda tem interesse?" até ele responder, porque lead que some precisa ser lembrado.$i1o2$, 'pontua'::enum_tag_opcao, 2, 4),
    ($i1o3$Espera ele voltar sozinho: quem tem interesse de verdade responde quando estiver pronto para decidir.$i1o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i1o4$Oferece um desconto na avaliação que você não pode autorizar, para destravar a resposta dele ainda hoje.$i1o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 02 · sdr-social-seller · mc · MC2 · "Preciso ver com meu marido"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i2d$Contorno de objeção + Condução$i2d$, $i2c$Pelo WhatsApp, uma lead conversou com você sobre clareamento e gostou do que ouviu. Quando você ofereceu dois horários para a avaliação, ela respondeu: "Preciso ver com meu marido antes de marcar."$i2c$, 'mc', 4, NULL, '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i2o1$Diz que faz sentido, pergunta o que ele vai querer saber e propõe a avaliação para os dois juntos.$i2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i2o2$Manda um resumo do tratamento para ela mostrar ao marido e combina de chamá-la de novo em dois dias.$i2o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i2o3$Diz que entende e que fica à disposição, para ela voltar a chamar quando os dois tiverem decidido.$i2o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i2o4$Avisa que aqueles são os últimos horários do mês, para ela decidir hoje e falar com o marido depois.$i2o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 03 · sdr-social-seller · mc · MC3 · O orçamento aprovado que nunca virou consulta
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i3d$Base + Atitude de Dono$i3d$, $i3c$No CRM há uma paciente que aprovou um orçamento de clareamento há oito meses e nunca marcou o início. O último registro diz só "vai ver a melhor data". Você vai fazer o primeiro contato de reativação.$i3c$, 'mc', 4, NULL, '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i3o1$Chama pelo nome, lembra o que ela queria resolver, pergunta por que adiou e oferece dois horários.$i3o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i3o2$Manda a mensagem padrão de reativação da clínica e espera ela responder antes de oferecer um horário.$i3o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i3o3$Liga uma vez e, se ela não atender, marca o contato como frio no CRM e passa ao próximo da lista.$i3o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i3o4$Avisa que o orçamento venceu e que, se ela não marcar nesta semana, o valor do tratamento vai subir.$i3o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 04 · sdr-social-seller · mc · MC4 · Pediu o preço antes de qualquer conversa
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i4d$Qualificação consultiva + Comunicação de valor$i4d$, $i4c$Pelo WhatsApp, um lead manda: "Quanto custa o clareamento? Só quero o valor." É a terceira mensagem dele, e ele já contou que está pesquisando em outras clínicas.$i4c$, 'mc', 4, NULL, '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i4o1$Dá a faixa de preço, diz que o valor exato sai na avaliação e pergunta o que ele quer mudar no sorriso.$i4o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i4o2$Passa a faixa de preço e já convida para a avaliação, sem perguntar nada sobre o caso nem o que ele busca.$i4o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i4o3$Passa a faixa de preço e encerra dizendo que, quando ele quiser agendar a avaliação, é só chamar de novo.$i4o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i4o4$Passa o menor valor da tabela para não perder o lead para a concorrência e deixa o detalhe para a clínica.$i4o4$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);

-- 05 · sdr-social-seller · mc · MC5 · A confirmação que não volta
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i5d$Comparecimento + Organização$i5d$, $i5c$Amanhã às 9h há uma avaliação marcada. Você mandou a confirmação ontem e hoje de manhã; as duas mensagens foram entregues e não lidas. São 17h, e a agenda de amanhã tem lista de espera.$i5c$, 'mc', 4, NULL, 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i5o1$Liga ainda hoje; se ele não atender, manda recado, deixa a lista de espera de sobreaviso e anota no CRM.$i5o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i5o2$Manda mais uma mensagem agora e, se não houver resposta até amanhã cedo, oferece o horário à lista.$i5o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i5o3$Mantém o horário como está e confia na confirmação de ontem, que foi entregue, mesmo sem ter sido lida.$i5o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i5o4$Libera o horário para a lista de espera agora, porque mensagem sem leitura costuma virar falta amanhã.$i5o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 06 · sdr-social-seller · mc · MC6 · Vinte leads novos de uma vez
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'sdr-social-seller', $i6d$Velocidade de resposta + Processo$i6d$, $i6c$Uma campanha nova entrou no ar às 10h. Ao meio-dia há 20 leads sem resposta no WhatsApp e no Instagram, e você está no meio dos follow-ups quentes do dia.$i6c$, 'mc', 4, NULL, 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i6o1$Pausa os follow-ups, manda a cada lead novo uma primeira mensagem curta e pessoal e depois os retoma.$i6o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i6o2$Termina os follow-ups quentes, que estão perto de agendar, e só depois responde os novos, um por um.$i6o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i6o3$Pede à recepção que responda os novos com a mensagem padrão enquanto você termina os follow-ups quentes.$i6o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i6o4$Manda a mesma resposta automática a todos os novos e volta a eles no fim do dia, com mais calma.$i6o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 07 · sdr-social-seller · caso aberto · Caso aberto · Responda, retome e contorne
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'sdr-social-seller', NULL, $i7c$Chega esta mensagem no WhatsApp da Beauty Smile, vinda de um anúncio: "Oi, vi o vídeo de vocês sobre o laser. Tenho um dente da frente meio escuro que me incomoda há anos e tenho vergonha de sorrir. Vocês fazem? Quanto custa?"

Escreva: (a) a resposta que você mandaria a esse lead, do jeito que mandaria de verdade (pode quebrar em várias mensagens). (b) Ele leu e não respondeu. Monte o seu follow-up para os próximos 7 dias: em que dia, por qual canal (mensagem, áudio, ligação, Instagram) e o que você diria em cada contato para chamar a atenção dele e conseguir uma resposta. (c) Dias depois, ele responde: "Achei caro. Vi uma clínica que faz clareamento por menos da metade." Escreva a sua resposta.$i7c$, 'caso_aberto', 20, $i7r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "acolhimento", "peso": 15}, {"dimension": "descoberta_e_qualificacao", "peso": 20}, {"dimension": "conducao_ao_agendamento", "peso": 15}, {"dimension": "cadencia_de_follow_up", "peso": 25}, {"dimension": "contorno_de_objecao", "peso": 25}]}$i7r$::jsonb, 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95');

-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA (D-35 b) — depois dos INSERTs, no MESMO arquivo: os itens ativos dos cargos do texto
-- cujo hash NAO esta no texto deixam de ser sorteados. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_n bigint;
BEGIN
  UPDATE public.perguntas SET status = 'retired'
   WHERE tipo = 'sjt' AND cargo = ANY (ARRAY['sdr-social-seller']::text[]) AND status = 'active'
     AND content_hash <> ALL (ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86', '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5', '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95']::text[]);
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
    FROM public.perguntas WHERE tipo = 'sjt' AND cargo = 'sdr-social-seller' AND status = 'active';
  IF (v_mc, v_ca) IS DISTINCT FROM (6::bigint, 1::bigint) THEN
    RAISE EXCEPTION 'cargo % ficou com % mc + % caso ativos', 'sdr-social-seller', v_mc, v_ca;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'sdr-social-seller' AND status = 'active'
     AND content_hash = ANY (ARRAY['f51d7b14e47bdd7b051e36222ed08ad11903f978514238a24f2ff545e5ee6ee0', '10592a3d2910281159a674fc6eb2367e14b3f4c116ad87e5748f71113175db86', '21c4baca4756fec32a7b966bc8681d0b94302aa20e21daeeb9ca581f8a4863f5', '1b48fa6850cc280bb90f592c36f455265a34d7e2be0ee145b4e5bd71f7f4d0ad', 'a7d646dab103fe1f6ce0e9e8af79fa05b294b53fb821c8287c713d0d39786d50', 'c839fcd9fefbb7874de1edf18987cfecca5fccc869ce31cce0e849c5660750fa', 'b9d7843f0369d02f537f7910df277a0472196f01b52db81b91b8d1f75c2cea95']::text[]);
  IF v_n IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'so % dos % itens do texto estao ativos', v_n, 7;
  END IF;
  IF current_setting('p52.banco_retirados')::bigint IS DISTINCT FROM current_setting('sdr3.a_retirar')::bigint THEN
    RAISE EXCEPTION 'retirou % itens, o PRE mediu % a retirar',
      current_setting('p52.banco_retirados'), current_setting('sdr3.a_retirar');
  END IF;
  -- Toda alternativa dos mc ativos tem opcao_id uuid v4 (o gabarito nao viaja no id).
  SELECT count(*) INTO v_n FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.cargo = 'sdr-social-seller' AND p.status = 'active'
     AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  IF v_n > 0 THEN
    RAISE EXCEPTION '% alternativa(s) ativa(s) com opcao_id fora de uuid v4', v_n;
  END IF;
  -- Cada mc ativo tem as 4 etiquetas, uma de cada.
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = 'sdr-social-seller' AND p.status = 'active' AND p.formato = 'mc'
     AND (SELECT count(DISTINCT o.tag) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) <> 4;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% item(ns) mc sem as 4 etiquetas', v_n;
  END IF;
  -- Anti-escada (D-37) sobre o banco VIVO: a certa nao ocupa a mesma posicao em mais de 3.
  SELECT max(c) INTO v_max FROM (
    SELECT o.ordem, count(*) AS c FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
     WHERE p.tipo = 'sjt' AND p.cargo = 'sdr-social-seller' AND p.status = 'active' AND o.tag = 'fortemente_pontua'
     GROUP BY o.ordem) x;
  IF v_max > 3 THEN
    RAISE EXCEPTION 'a alternativa certa cai na mesma posicao em % itens (maximo 3)', v_max;
  END IF;
  RAISE NOTICE 'banco %: % mc + % caso ativos; % retirados', 'sdr-social-seller', v_mc, v_ca,
    current_setting('p52.banco_retirados');
END
$pos$;
