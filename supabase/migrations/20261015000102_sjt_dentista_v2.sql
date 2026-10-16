-- 20261015000102_sjt_dentista_v2.sql
--
-- POR QUE ESTA MIGRATION EXISTE
-- Revisao do banco SJT do cargo `dentista`, feita com o operador em 2026-10-15/16 ao montar a vaga
-- `dentista-clinica-geral-laser`, cujo dentista EXECUTA as sessoes (a avaliacao, o plano e o
-- orcamento sao do Dr. Fernando). Saem os 3 mc e o caso aberto de junho: itens clinicos genericos,
-- a certa bem mais longa que as outras (D-34), um item com duas `atencao` e nenhuma `neutro`, 30 min
-- por item; e um caso de avaliacao diagnostica de lentes, tratamento que a clinica nao faz. Entram 6
-- mc de POSTURA escolhidos pelo operador no sentido do formulario antigo de dentista da clinica
-- (feedback, comunicacao com o paciente, relacao com o Dr. Fernando, responsabilidade, atitude de
-- dono, equipe) e um caso aberto sobre a primeira sessao de um paciente novo. Regra do operador:
-- nada de plano errado nem de protocolo que "nao funcionou".
--
-- FONTE: docs/specs/BANCO-SJT-DENTISTA-V2.md (md5 29f56345c1208009c617490c57cc6d5f), GERADO por scripts/geradores/gen-sjt-sdr-v3.py — nunca
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
   WHERE tipo = 'sjt' AND cargo = 'dentista' AND status = 'active'
     AND content_hash = ANY (ARRAY['79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40', 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5', '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068', '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca', 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de', 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00', '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22']::text[]);
  PERFORM set_config('sdr3.mantidos', v_n::text, true);
  -- Quantos ativos do cargo NAO estao no texto: e o que a retirada tem de tirar, nem mais nem menos.
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'dentista' AND status = 'active'
     AND content_hash <> ALL (ARRAY['79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40', 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5', '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068', '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca', 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de', 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00', '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22']::text[]);
  PERFORM set_config('sdr3.a_retirar', v_n::text, true);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'nada a retirar no cargo % — o texto ja esta no ar?', 'dentista';
  END IF;
END
$pre$;

-- 01 · dentista · mc · MC1 · O retorno da coordenação
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i1d$Abertura a feedback + Atitude de Dono$i1d$, $i1c$Na revisão do mês, a coordenação mostra que os seus pacientes elogiam muito o atendimento, mas que as suas sessões atrasam, em média, 15 minutos e desorganizam a agenda da clínica.$i1c$, 'mc', 4, NULL, '79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i1o1$Pergunta os detalhes, propõe um ajuste concreto nas sessões e combina como acompanhar.$i1o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i1o2$Agradece o retorno, diz que vai prestar mais atenção ao horário e segue a rotina como estava.$i1o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i1o3$Explica que atrasa porque dá atenção aos pacientes, e que prefere manter o cuidado ao horário.$i1o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i1o4$Explica que o atraso vem da recepção e da auxiliar, que não deixam a sala pronta no horário.$i1o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 02 · dentista · mc · MC2 · "Por que laser, e não a limpeza de sempre?"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i2d$Comunicação com o paciente$i2d$, $i2c$Na primeira sessão da limpeza a laser, a paciente pergunta por que o Dr. Fernando indicou o laser, se ela sempre fez a limpeza comum e achava suficiente.$i2c$, 'mc', 4, NULL, 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i2o1$Explica primeiro o que muda para ela, ligado ao caso dela, e depois como o laser age, sem prometer.$i2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i2o2$Explica com cuidado como o laser funciona, mas em termos técnicos que ela tem dificuldade de seguir.$i2o2$, 'pontua'::enum_tag_opcao, 2, 1),
    ($i2o3$Diz que a indicação foi do Dr. Fernando e que é melhor ela perguntar a ele na próxima consulta.$i2o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i2o4$Diz que a limpeza comum desgasta os dentes e que, com o laser, ela nunca mais vai ter tártaro.$i2o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 03 · dentista · mc · MC3 · O paciente que quer falar com o Dr. Fernando
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i3d$Segurança + Relação com o paciente$i3d$, $i3c$Um paciente executivo questiona cada etapa da sessão e, sobre um detalhe que você mesmo poderia responder, pede para falar direto com o Dr. Fernando.$i3c$, 'mc', 4, NULL, '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i3o1$Responde o que é seu com segurança e, se ele ainda preferir, combina a conversa com o Dr. Fernando.$i3o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i3o2$Chama o Dr. Fernando na mesma hora, interrompendo a agenda dele, para evitar qualquer atrito.$i3o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i3o3$Responde a dúvida e segue a sessão, sem acolher o pedido dele de falar com o Dr. Fernando.$i3o3$, 'neutro'::enum_tag_opcao, 1, 2),
    ($i3o4$Diz que ele não precisa incomodar o Dr. Fernando com isso, porque a sessão é responsabilidade sua.$i3o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 04 · dentista · mc · MC4 · O cuidado que você esqueceu de passar
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i4d$Responsabilidade + Experiência do paciente$i4d$, $i4c$No fim do dia, você percebe que não orientou um paciente sobre um cuidado importante depois da sessão. Ele já foi embora.$i4c$, 'mc', 4, NULL, '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i4o1$Liga ou manda mensagem pessoalmente, assume o esquecimento e registra a orientação dada.$i4o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 4),
    ($i4o2$Pede à recepção que mande ao paciente a orientação padrão, sem explicar a ele o que aconteceu.$i4o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i4o3$Deixa para orientar na próxima sessão, já que o paciente volta à clínica daqui a alguns dias.$i4o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i4o4$Não fala nada a ninguém, para não parecer que errou, e confia que o paciente vai se cuidar.$i4o4$, 'atencao'::enum_tag_opcao, 0, 2)
) AS v(texto, tag, peso, ordem);

-- 05 · dentista · mc · MC5 · "Não é minha função"
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i5d$Atitude de Dono + Equipe$i5d$, $i5c$Outro dentista da clínica está com a agenda atrasada. A recepção pergunta se você, que está com 30 minutos livres, pode atender um paciente dele.$i5c$, 'mc', 4, NULL, 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i5o1$Atende o paciente, alinhando antes com o colega o que precisa ser feito naquela sessão.$i5o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 2),
    ($i5o2$Atende o paciente seguindo o prontuário, sem falar com o colega sobre o que foi feito nele.$i5o2$, 'pontua'::enum_tag_opcao, 2, 3),
    ($i5o3$Diz que atende, mas só se o colega pedir pessoalmente, porque o paciente é dele, não seu.$i5o3$, 'neutro'::enum_tag_opcao, 1, 4),
    ($i5o4$Diz que o paciente não é seu e usa o horário livre para organizar as suas coisas.$i5o4$, 'atencao'::enum_tag_opcao, 0, 1)
) AS v(texto, tag, peso, ordem);

-- 06 · dentista · mc · MC6 · A reclamação sobre a recepção
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'dentista', $i6d$Equipe + Experiência do paciente$i6d$, $i6c$Na cadeira, a paciente reclama que foi mal atendida pela recepção quando tentou remarcar a sessão.$i6c$, 'mc', 4, NULL, 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i6o1$Acolhe a queixa sem culpar a colega, pede desculpas e leva o retorno à coordenação.$i6o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($i6o2$Pede desculpas em nome da clínica e segue a sessão, sem levar a queixa a ninguém da equipe.$i6o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i6o3$Muda de assunto com gentileza, para não criar clima ruim, e começa logo o procedimento.$i6o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($i6o4$Concorda que a recepção às vezes deixa a desejar e diz que vai falar com eles sobre isso.$i6o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 07 · dentista · caso aberto · Caso aberto · A primeira sessão com você
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'dentista', NULL, $i7c$Um paciente novo começa amanhã com você a limpeza a laser que o Dr. Fernando planejou na avaliação. É a primeira sessão dele na Beauty Smile.

Escreva: passo a passo, como seria essa primeira sessão com você: o que faz antes de ele chegar, como o recebe, como conduz a sessão, como encerra e o que faz até o dia seguinte.$i7c$, 'caso_aberto', 20, $i7r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "preparacao_e_acolhimento", "peso": 15}, {"dimension": "escuta_e_personalizacao", "peso": 20}, {"dimension": "conducao_sem_surpresas", "peso": 25}, {"dimension": "orientacao_de_saida", "peso": 20}, {"dimension": "cuidado_depois_da_sessao", "peso": 20}]}$i7r$::jsonb, '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22');

-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA (D-35 b) — depois dos INSERTs, no MESMO arquivo: os itens ativos dos cargos do texto
-- cujo hash NAO esta no texto deixam de ser sorteados. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_n bigint;
BEGIN
  UPDATE public.perguntas SET status = 'retired'
   WHERE tipo = 'sjt' AND cargo = ANY (ARRAY['dentista']::text[]) AND status = 'active'
     AND content_hash <> ALL (ARRAY['79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40', 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5', '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068', '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca', 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de', 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00', '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22']::text[]);
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
    FROM public.perguntas WHERE tipo = 'sjt' AND cargo = 'dentista' AND status = 'active';
  IF (v_mc, v_ca) IS DISTINCT FROM (6::bigint, 1::bigint) THEN
    RAISE EXCEPTION 'cargo % ficou com % mc + % caso ativos', 'dentista', v_mc, v_ca;
  END IF;
  SELECT count(*) INTO v_n FROM public.perguntas
   WHERE tipo = 'sjt' AND cargo = 'dentista' AND status = 'active'
     AND content_hash = ANY (ARRAY['79b736464c23ea105b4167714be2a5ca29a7f1eef86670b614bfbb8fd6441c40', 'd9b143470334f0e2c1de2afcdcfbbbd6d636607aec6c66eaa61e64e57020a2d5', '94652bccc3059b7852faebbd91ff1305a751b5a13f75058d699d0a5a889e6068', '2dd6a4ab06862bb911e997ffe8821855bbb0b7e290ae0431a0a3ae6cbf551cca', 'faf8655cce6b3d14b9b5c763bd230738500f5754295e580aeebd7694d271b4de', 'f5e596f8f130ab3b8fd7d49d108cea4a519266a9f61af77d52aa2f312e636b00', '8e21c7d784f4a9aa8d8728f498b30c25299490d85ad82c6d27d6edbc643b9f22']::text[]);
  IF v_n IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'so % dos % itens do texto estao ativos', v_n, 7;
  END IF;
  IF current_setting('p52.banco_retirados')::bigint IS DISTINCT FROM current_setting('sdr3.a_retirar')::bigint THEN
    RAISE EXCEPTION 'retirou % itens, o PRE mediu % a retirar',
      current_setting('p52.banco_retirados'), current_setting('sdr3.a_retirar');
  END IF;
  -- Toda alternativa dos mc ativos tem opcao_id uuid v4 (o gabarito nao viaja no id).
  SELECT count(*) INTO v_n FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.cargo = 'dentista' AND p.status = 'active'
     AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  IF v_n > 0 THEN
    RAISE EXCEPTION '% alternativa(s) ativa(s) com opcao_id fora de uuid v4', v_n;
  END IF;
  -- Cada mc ativo tem as 4 etiquetas, uma de cada.
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = 'dentista' AND p.status = 'active' AND p.formato = 'mc'
     AND (SELECT count(DISTINCT o.tag) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) <> 4;
  IF v_n > 0 THEN
    RAISE EXCEPTION '% item(ns) mc sem as 4 etiquetas', v_n;
  END IF;
  -- Anti-escada (D-37) sobre o banco VIVO: a certa nao ocupa a mesma posicao em mais de 3.
  SELECT max(c) INTO v_max FROM (
    SELECT o.ordem, count(*) AS c FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
     WHERE p.tipo = 'sjt' AND p.cargo = 'dentista' AND p.status = 'active' AND o.tag = 'fortemente_pontua'
     GROUP BY o.ordem) x;
  IF v_max > 3 THEN
    RAISE EXCEPTION 'a alternativa certa cai na mesma posicao em % itens (maximo 3)', v_max;
  END IF;
  RAISE NOTICE 'banco %: % mc + % caso ativos; % retirados', 'dentista', v_mc, v_ca,
    current_setting('p52.banco_retirados');
END
$pos$;
