-- 20261013000104_sjt_pratico_e_mc3.sql
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- Decisao do operador (13/10, verbatim): «aplica como esta no documento, com o fluxo que definimos,
-- o documento ja esta revisado e deve seguir assim». Leva ao banco SJT o que a secao «3 · O teste de
-- situacoes do cargo (SJT)» dos tres documentos de vaga revisados em 12/10 manda e que o banco no ar
-- (o da 20261011000003, texto docs/specs/BANCO-SJT-V2.md) ainda nao tem:
--   · o caso aberto de cada cargo passa a ser o TESTE PRATICO (D2/D3 dos documentos): o enunciado
--     por extenso vai no `cenario`, e a rubrica com as dimensoes, pesos e banda do §3;
--   · videomaker-storymaker MC3 («O melhor material do mes, sem autorizacao»), reescrito em 12/10.
-- Os outros 17 itens de multipla escolha dos tres cargos batem com o documento (mesmo content_hash do
-- ar) e NAO mudam: nenhum INSERT para eles; o PRE e o POS os amarram.
--
-- Sai (status = 'retired', nada e apagado — respostas e scores antigos continuam apontando linhas
-- existentes):
--   editor-video · caso_aberto · Caso aberto · Seis minutos densos viram 60 segundos · content_hash c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c
--   videomaker-storymaker · mc · MC3 · O melhor material do mês, sem autorização · content_hash d185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6
--   videomaker-storymaker · caso_aberto · Caso aberto · Um dia inteiro de cobertura · content_hash 98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa
--   social-media · caso_aberto · Caso aberto · O «Professor Sarcástico» encosta no limite · content_hash 31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79
-- Entra:
--   editor-video · caso_aberto · Caso aberto · É o teste prático — o link e o raciocínio · content_hash ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce
--   videomaker-storymaker · mc · MC3 · O melhor material do mês, sem autorização · content_hash a635603b246e12de3f484e31b6767ae7c4a9288af008549fc93271426768bda6
--   videomaker-storymaker · caso_aberto · Caso aberto · É o teste prático — o link e o raciocínio · content_hash 4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81
--   social-media · caso_aberto · Caso aberto · É o teste prático — o link e o raciocínio · content_hash 64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Gerador: docs/vagas/migrations/gen-104-sjt-pratico.py (reusa scripts/geradores/sjt_texto.py)
-- Texto:   docs/vagas/editor-video.md (md5 c17c54dd9925e9441d6c66debe7c3e20) — secao 3
-- Texto:   docs/vagas/videomaker-storymaker.md (md5 5c0b53f831106f0e916f126ebd1d37ad) — secao 3
-- Texto:   docs/vagas/social-media-senior-marca-pessoal.md (md5 b07270c25b8a881c748109006127b167) — secao 3
-- Ar:      docs/specs/BANCO-SJT-V2.md (md5 03b2a0d5d96774bbb73b06b7c693bbe5) — o que ja esta em PROD
-- Nao editar a mao: a mudanca vai no documento ou no gerador, e o SQL e gerado de novo.
--
-- `cenario` e `opcao_texto` sao TEXTO PURO na tela do candidato (whitespace-pre-line, sem TextoRico):
-- o gerador tira o `>` do blockquote e a enfase markdown, e RECUSA o texto se sobrar marcacao. Os links
-- do Drive chegam como texto (a tela nao os torna clicaveis).
--
-- FORA DESTA MIGRATION (codigo/EF, nao dado): o catalogo de criterios do §15 (rotulo, inclusion,
-- exclusion por chave) mora em supabase/functions/_shared/sjt-rubrica.ts; ate ele ser escrito, as
-- chaves novas chegam ao modelo como «sem criterios catalogados» (degradacao honesta, nao quebra).
-- Idem o aviso «a IA nao ve o material» de cada §3: e instrucao de rubrica/prompt, nao coluna.
--
-- Sem BEGIN/COMMIT: o endpoint ja roda o corpo inteiro numa unica transacao (CLAUDE.md §Migrations).
-- APLICAR COM (so com o OK do operador): node p46apply.cjs migrate docs/vagas/migrations/20261013000104_sjt_pratico_e_mc3.sql
-- Um candidato com o caso aberto ANTIGO aberto na tela no momento do apply recebe o novo ao
-- recarregar; o PRE publica quantos estao na avaliacao (evidencia `em_curso`).

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRE-PORTAO — recusa sem mudar nada. Guarda em GUCs LOCAIS os ids que saem.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_cargos     text[] := ARRAY['editor-video', 'videomaker-storymaker', 'social-media']::text[];
  v_sai_cargo  text[] := ARRAY['editor-video', 'videomaker-storymaker', 'videomaker-storymaker', 'social-media']::text[];
  v_sai_fmt    text[] := ARRAY['caso_aberto', 'mc', 'caso_aberto', 'caso_aberto']::text[];
  v_sai_hash   text[] := ARRAY['c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c', 'd185460236a3805e9e6bfdffd0b5cce65ad41a3a00f4f6a6f20c5080b62c23e6', '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa', '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79']::text[];
  v_fica_cargo text[] := ARRAY['editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media']::text[];
  v_fica_hash  text[] := ARRAY['e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9']::text[];
  v_novo_hash  text[] := ARRAY['ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce', 'a635603b246e12de3f484e31b6767ae7c4a9288af008549fc93271426768bda6', '4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81', '64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f']::text[];
  v_n    bigint;
  v_id   text;
  v_ids  text := '';
  v_txt  text;
  v_curso bigint;
  v_rasc  bigint;
  k int;
BEGIN
  -- (sai) cada item que sai existe, ativo, EXATAMENTE 1, no cargo e formato esperados
  FOR k IN 1 .. array_length(v_sai_hash, 1) LOOP
    SELECT count(*), min(p.id::text) INTO v_n, v_id FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_sai_cargo[k] AND p.formato = v_sai_fmt[k]
       AND p.status = 'active' AND p.content_hash = v_sai_hash[k];
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'P104 PRE-PORTAO (sai): cargo % %, content_hash %: % item(ns) ativo(s) (esperado 1); nada mudou', v_sai_cargo[k], v_sai_fmt[k], v_sai_hash[k], v_n;
    END IF;
    v_ids := v_ids || CASE WHEN v_ids = '' THEN '' ELSE ',' END || v_id;
  END LOOP;

  -- (fica) cada mc que bate com o documento esta ativo, EXATAMENTE 1, no cargo
  FOR k IN 1 .. array_length(v_fica_hash, 1) LOOP
    SELECT count(*) INTO v_n FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_fica_cargo[k] AND p.formato = 'mc'
       AND p.status = 'active' AND p.content_hash = v_fica_hash[k];
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'P104 PRE-PORTAO (fica): cargo %, content_hash %: % item(ns) ativo(s) (esperado 1) — o banco no ar nao e o que o documento supoe; nada mudou', v_fica_cargo[k], v_fica_hash[k], v_n;
    END IF;
  END LOOP;

  -- (escopo) nos cargos do texto, nada ativo alem do que fica e do que sai: um item ativo fora
  -- dessa lista sobreviveria ao lado do novo e o cargo sortearia 7+ itens
  SELECT string_agg(p.cargo || '/' || p.formato || '/' || coalesce(p.content_hash, '<nulo>'), ', ') INTO v_txt
    FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'
     AND (p.content_hash IS NULL OR NOT (p.content_hash = ANY (v_fica_hash) OR p.content_hash = ANY (v_sai_hash)));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'P104 PRE-PORTAO (escopo): item(ns) ativo(s) fora do texto e do que sai [%]; nada mudou', v_txt;
  END IF;

  -- (novo) nenhum hash novo existe em QUALQUER cargo ou estado: o WHERE NOT EXISTS pularia o INSERT
  SELECT string_agg(p.cargo || '/' || p.status || '/' || p.content_hash, ', ') INTO v_txt
    FROM public.perguntas p WHERE p.content_hash = ANY (v_novo_hash);
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'P104 PRE-PORTAO (novo): content_hash novo ja existe [%]; nada mudou', v_txt;
  END IF;

  -- (itens_ids) vaga de QUALQUER status cuja bateria SJT liste itens por id num cargo do texto, ou
  -- apontando item de um cargo do texto: a troca por cargo nao a alcancaria
  SELECT string_agg(DISTINCT v.id::text || ':' || v.status, ', ') INTO v_txt
    FROM public.vagas v
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v.testes_aplicaveis) = 'array'
                                                THEN v.testes_aplicaveis ELSE '[]'::jsonb END) e
   WHERE (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))
     AND jsonb_typeof(e -> 'itens_ids') = 'array' AND jsonb_array_length(e -> 'itens_ids') > 0
     AND (e ->> 'cargo' = ANY (v_cargos)
          OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(e -> 'itens_ids') x
                       JOIN public.perguntas p ON p.id::text = x WHERE p.cargo = ANY (v_cargos)));
  IF v_txt IS NOT NULL THEN
    RAISE EXCEPTION 'P104 PRE-PORTAO (itens_ids): vaga(s) [%] listam itens por id num cargo do texto; nada mudou', v_txt;
  END IF;

  -- (em curso) candidatura na avaliacao numa vaga cuja bateria SJT e de um cargo do texto, ainda sem
  -- o caso aberto pontuado: ao abrir (ou recarregar) o caso, recebe o NOVO. Contagem e rascunhos de
  -- caso aberto ja salvos — nenhum dado pessoal —, publicados para o operador. Nao recusa.
  SELECT count(*), count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.respostas_avaliacao r
                                                  WHERE r.candidatura_id = c.id AND r.teste = 'sjt_caso_aberto'))
    INTO v_curso, v_rasc
    FROM public.candidaturas c
   WHERE c.etapa_atual = 'avaliacao_assincrona' AND c.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s
                      WHERE s.candidatura_id = c.id AND s.tipo = 'sjt' AND s.subtipo = 'caso_aberto')
     AND EXISTS (SELECT 1 FROM public.vagas v
                  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(v.testes_aplicaveis) = 'array'
                                                               THEN v.testes_aplicaveis ELSE '[]'::jsonb END) e
                  WHERE v.id = c.vaga_id AND (e ->> 'tipo' = 'sjt' OR e ->> 'teste' IN ('sjt', 'work_sample_sjt'))
                    AND e ->> 'cargo' = ANY (v_cargos));

  PERFORM set_config('p104.sai_ids', v_ids, true);
  PERFORM set_config('p104.em_curso', v_curso::text || '/rascunho_caso=' || v_rasc::text, true);
END
$pre$;

-- 01 · editor-video · caso aberto · Caso aberto · É o teste prático — o link e o raciocínio
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'editor-video', NULL, $n1c$Este é o teste prático da vaga de Editor(a) de Vídeo.

O que você vai receber

Dois pacotes de material bruto:

· Fotobiomodulação no pós-operatório — https://drive.google.com/drive/folders/1O5Tzv_Vn_xkhzcBXul7FMYWQY_WAGzIS
· Limpeza a laser — https://drive.google.com/drive/folders/1zxqGWQieUf4zOFEY2JAPL3aiAHcuATZF

Cada pacote tem quatro pastas:

- MONTAGEM — os segmentos de fala, gravados em sequência. São cinco no pacote de fotobiomodulação, e é daí que sai o corpo do vídeo.
- INSERT — cerca de 50 clipes de apoio: mitocôndria, implante dentário, feixe de laser, tecido gengival, vaso sanguíneo. É o seu banco de imagem.
- CTA — a chamada final.
- TRANSCRICOES — o texto de tudo que é falado. Use para trabalhar a estrutura antes de abrir o editor; é mais rápido decidir o corte lendo do que arrastando.

Há também a pasta da marca — https://drive.google.com/drive/folders/1zEUNE3I35Zzj3mySSxCk8MMMghcn26Qw — com logo em vetor e PNG, paleta de cores, fontes e elementos. (A pasta «Logos Antigas» é o que o nome diz — material descontinuado.)

O que você vai fazer

Escolha um dos dois pacotes e entregue:

1. Um Reel vertical de até 60 segundos, com corte, legenda e cor.
2. Três variações de hook para esse mesmo Reel — os primeiros segundos, em três versões, nomeadas de modo que dê para comparar o resultado depois.

Suba tudo num Drive seu, com acesso aberto.

Formato: vertical 9:16. Trilha: entregue sem trilha, ou com trilha livre de direitos — não precisa comprar nada.

O que escrever neste campo (entre 200 e 500 palavras — há um contador na tela)

Cole o link e conte o seu raciocínio. Queremos entender:

- Qual pacote você escolheu e por quê.
- Onde você começou o Reel, e o que cortou do material. O assunto é técnico e não cabe inteiro: a escolha é o trabalho.
- O que cada uma das três variações de hook testa, e como você saberia qual venceu.
- O que você fez com os inserts: quais usou, e quando preferiu ficar na fala.
- O conteúdo é sobre saúde e vale a norma de publicidade do CFO. O material bruto tem trechos que não passariam numa revisão de conformidade — afirmações de resultado com número, sem a referência anexada. Diga quais você identificou e o que faria. Você não precisa resolver sozinho: no cargo, quem decide a mensagem é a social media. O que se espera de você é sinalizar.

Prazo: 3 dias corridos. Tempo estimado: 2h a 3h.$n1c$, 'caso_aberto', 18, $n1r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "decisao_de_corte", "peso": 30}, {"dimension": "logica_das_variacoes", "peso": 25}, {"dimension": "uso_do_material", "peso": 20}, {"dimension": "conformidade_sinalizada", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$n1r$::jsonb, 'ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce');

-- 02 · videomaker-storymaker · mc · MC3 · O melhor material do mês, sem autorização
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $n2d$Discrição + Leitura de ambiente$n2d$, $n2c$Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está por perto, e não há câmera à vista.$n2c$, 'mc', 4, NULL, 'a635603b246e12de3f484e31b6767ae7c4a9288af008549fc93271426768bda6', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a635603b246e12de3f484e31b6767ae7c4a9288af008549fc93271426768bda6')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($n2o1$Grava, e assim que o momento passa pergunta a ele se pode publicar — ou pede ao Dr. que pergunte. Nada vai ao ar sem o sim dele.$n2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 3),
    ($n2o2$Grava e leva à Coordenação, para decidirem juntos se vale pedir a autorização depois.$n2o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($n2o3$Não grava, e depois pergunta se ele toparia contar de novo em vídeo, com termo assinado.$n2o3$, 'neutro'::enum_tag_opcao, 1, 1),
    ($n2o4$Grava e publica em stories — é depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer.$n2o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 03 · videomaker-storymaker · caso aberto · Caso aberto · É o teste prático — o link e o raciocínio
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'videomaker-storymaker', NULL, $n3c$Este é o teste prático da vaga de Videomaker / Storymaker.

O que você vai receber

Um Drive com seis pastas — https://drive.google.com/drive/folders/1gzNWeoCt_pP-BJ_PqoUc4WLMiQRVZUHG

Cinco delas são dias reais de gravação na clínica — nomeadas pela data (260220, 260226, 260508, 260519, 260525) — com os stories brutos, do jeito que saíram do celular e da câmera: de 4 a 11 arquivos por dia, sem edição, sem ordem, sem corte. É o material cru de um dia de trabalho.

A sexta pasta se chama RESERVAS e é diferente: não é um dia, é conteúdo guardado por tema — DEPOIMENTOS, CLAREAMENTO, RONCO E APNEIA, LIMPEZA, ALINHADOR. É o banco que a clínica usa quando um dia rende pouco.

O que você vai fazer

Escolha um dos cinco dias, assista ao material daquele dia, e monte a sequência de stories que iria ao ar naquele dia — de 15 a 25 stories, editados: a ordem, os cortes, o texto na tela.

Suba a sequência num Drive seu, com acesso aberto.

O que escrever neste campo (entre 200 e 500 palavras — há um contador na tela)

Cole o link e conte o seu raciocínio. Não é um relatório: é a conversa que você teria com a coordenação explicando o dia. Queremos entender:

- Qual dia você escolheu, e por quê — entre os cinco, o que te fez ficar com aquele.
- Que storytelling você quis fazer naquele dia: o que abre, o que sustenta, como termina. Qual é o fio.
- O que você cortou e por quê — material bruto sempre tem mais do que entra.
- O que você decidiu não publicar, e a razão.
- Se foi à pasta RESERVAS e o que buscou lá. Se não precisou, diga por quê.

Formato de saída: vertical 9:16, como stories.

Prazo: 3 dias corridos. Tempo estimado: 1h30 a 2h, contando o tempo de assistir ao material.$n3c$, 'caso_aberto', 18, $n3r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "criterio_de_selecao", "peso": 30}, {"dimension": "arco_do_dia", "peso": 25}, {"dimension": "uso_da_reserva", "peso": 20}, {"dimension": "o_que_ficou_de_fora", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$n3r$::jsonb, '4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81');

-- 04 · social-media · caso aberto · Caso aberto · É o teste prático — o link e o raciocínio
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'social-media', NULL, $n4c$Este é o teste prático da vaga de Social Media Sênior.

Para quem você vai escrever

Para o perfil do Dr. Fernando Costa Jr. — @fernandocostalaser. Ele é cirurgião-dentista com 40 anos de clínica, pioneiro do implante dentário no Brasil, e é o rosto da Beauty Smile. É o perfil que esta vaga cuida.

Comece assistindo o Instagram dele. Veja o que quiser, quanto quiser. É daí que sai o jeito de falar: o ritmo, o vocabulário, o tipo de analogia, quanto ele explica antes de chegar ao ponto, onde ele põe o termo técnico. Assistir pouco aparece no texto.

De onde vem o assunto

Deste material: https://drive.google.com/drive/folders/1O5Tzv_Vn_xkhzcBXul7FMYWQY_WAGzIS

É um conteúdo sobre fotobiomodulação no pós-operatório — o uso do laser de neodímio para reduzir dor e inchaço depois de implante, extração e canal. Na pasta você encontra:

- MONTAGEM — cinco vídeos com a explicação completa, gravados em sequência.
- TRANSCRICOES — o texto de tudo que é falado. Comece por aqui se preferir ler a assistir: é mais rápido para entender o conteúdo.
- INSERT e CTA — material de apoio e a chamada final. Não são necessários para este exercício, mas estão lá se quiser entender como o conteúdo é montado.

⚠ Quem fala nesses vídeos NÃO é o Dr. Fernando Costa Jr. — é o filho dele, o Dr. Fernando Costa Neto, que responde pela parte de laser da clínica. O conteúdo serve; a voz não. Hoje quem aparece mais no Instagram é o pai, e é na voz dele que o perfil fala.

Essa é a tarefa inteira, em uma frase: pegar este assunto e escrevê-lo como o Dr. Fernando Costa Jr. falaria.

O que entregar — tudo aqui neste campo, por escrito. Não precisa subir nada em Drive nenhum.

1. O roteiro de um Reel de até 60 segundos sobre fotobiomodulação, na voz dele, pronto para gravar com teleprompter.

2. Quatro variações de hook para esse Reel — os primeiros segundos, em quatro versões que testem ângulos diferentes, não a mesma frase reescrita.

3. O esqueleto de um segundo formato, à sua escolha, desdobrando o mesmo conteúdo. Só o esqueleto, não a peça pronta:
· carrossel — 6 a 8 cards, uma linha cada
· frase para feed — a frase, mais uma linha de legenda
· abertura de post de blog — título e os dois primeiros parágrafos em três linhas
· roteiro de stories — 4 a 5 telas, uma linha cada

E diga por que escolheu esse formato e não os outros.

4. Duas ou três linhas sobre a voz dele como você a entendeu: o que ele faz que outra pessoa não faria.

5. O que sobrar do seu espaço, use para contar como você chegou nisso — o que descartou do material e por quê, e como resolveu o problema de um assunto técnico que precisa prender nos primeiros segundos.

O campo aceita entre 200 e 500 palavras, com contador na tela. A entrega acima ocupa cerca de 300; o resto é seu para explicar. Escreva apertado de propósito — é o mesmo exercício de caber que o Reel exige.

O conteúdo é sobre saúde, e vale a norma de publicidade do CFO.

Prazo: 3 dias corridos. Tempo estimado: 1h30.$n4c$, 'caso_aberto', 18, $n4r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "leitura_da_voz", "peso": 30}, {"dimension": "decisao_de_recorte", "peso": 25}, {"dimension": "criterio_do_desdobramento", "peso": 20}, {"dimension": "conformidade_percebida", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$n4r$::jsonb, '64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f');

-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRADA — depois dos INSERTs: so os ids que o PRE amarrou. Nada e apagado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $retira$
DECLARE
  v_ids text[] := string_to_array(nullif(current_setting('p104.sai_ids', true), ''), ',');
  v_n   bigint;
BEGIN
  IF coalesce(array_length(v_ids, 1), 0) <> 4 THEN
    RAISE EXCEPTION 'P104 RETIRADA: o PRE amarrou % id(s), o texto manda retirar 4; nada persiste', coalesce(array_length(v_ids, 1), 0);
  END IF;
  UPDATE public.perguntas SET status = 'retired' WHERE id::text = ANY (v_ids) AND status = 'active';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'P104 RETIRADA: % de 4 item(ns) retirado(s); nada persiste', v_n;
  END IF;
END
$retira$;

-- ─────────────────────────────────────────────────────────────────────────────
-- POS-PORTAO — por cargo: 6 mc ativos com 4 alternativas de pesos {4,2,1,0} e etiqueta coerente;
-- exatamente 1 caso aberto ativo, e e o NOVO, com a rubrica do documento (soma dos pesos inclusa);
-- todo item ativo e do texto e o content_hash RECALCULADO NO BANCO bate (o texto que chegou e o do
-- documento); escada D-37; os que sairam estao retired com as alternativas intactas; md5 da tabela
-- de comprimentos igual ao do gerador.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_cargos    text[] := ARRAY['editor-video', 'videomaker-storymaker', 'social-media']::text[];
  v_ativo_c   text[] := ARRAY['editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'editor-video', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'videomaker-storymaker', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'social-media', 'editor-video', 'videomaker-storymaker', 'videomaker-storymaker', 'social-media']::text[];
  v_ativo_h   text[] := ARRAY['e4bd9ba06c1020db93b8b93772ce1983fb3a9df0ee720b6b0975421940a5bac3', '09b29ae2399a45274ac355bf078ed13ae8d559c128c02a90332a1df4de39c404', 'd52fbe3e027d4721cf792a139a86312aea5e2ecfd41d8bd2176f4854e7fae76a', 'a50ce621b769984dcef6237486186b70f7ddd5481eead0c5dcd18f865c120334', '8dff2b09bec6b930601b0960343d0b18a8c0676aa993ec653281100fe3825f13', '586311e4a47f584fc57909cbced5c1ddfebac69bdf8646ee8a24ef6835e1e05e', '479bc6d918284700afebea9888b3e22dff0476215bbb7d283f91f9c0e13ec0d2', '6caee594b0484d83e074ea09fceb43938a134e1542d3c6b0c3fd6208416957a1', 'ae2f1d339a80d168bcfca35e635e6269755f97a603078f1064d137fa6c1a65c4', '90d5ef9a32379be60b10714b26430e9fd26795b0a2e1f017c9064382cfb81170', '93e75df28db38a199267ad8b2ecdaa648a30bb3f2de2d14a24a77f8df408e1e9', '54a2cb3f7114f9272ae8bd1b5435a7b48b9474db9d4957dc260879416f6b2bec', 'da3d73ac52483923393f1a6c3fb417a064e1a13a907868112d34609cbfcab17f', 'a5afc110964d2293ce1a74abd2fb97b7b50feec16ec43a4c7fd229ee22847f98', '0e2a5cb9cdfdef69f667d3c65f3b56e255e4f61e9a91a3261b08ef0328c772ec', '4322993ccd75434a48ce1069527b491e4e234d7a2564308d8fcc0d48aa86fce2', 'bae7a01d6917b925dd6e5a2da55ce31822fa2d9084699dc59c095754c2b68ba9', 'ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce', 'a635603b246e12de3f484e31b6767ae7c4a9288af008549fc93271426768bda6', '4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81', '64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f']::text[];
  v_caso_c    text[] := ARRAY['editor-video', 'videomaker-storymaker', 'social-media']::text[];
  v_caso_h    text[] := ARRAY['ca6dd92a796e8c47d0e42a42334b36cb4701f2844b9d2244bcd9f1bd233c92ce', '4e0f8084c54a219be93db296d6f1d88018189d2186d2c02702a2a97102782e81', '64546ae00b03199ee6da31308f286a6251082189f62226829a9bcf835962c73f']::text[];
  v_caso_soma int[]  := ARRAY[100, 100, 100]::int[];
  v_caso_rub  jsonb[] := ARRAY[$r1${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "decisao_de_corte", "peso": 30}, {"dimension": "logica_das_variacoes", "peso": 25}, {"dimension": "uso_do_material", "peso": 20}, {"dimension": "conformidade_sinalizada", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$r1$::jsonb, $r2${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "criterio_de_selecao", "peso": 30}, {"dimension": "arco_do_dia", "peso": 25}, {"dimension": "uso_da_reserva", "peso": 20}, {"dimension": "o_que_ficou_de_fora", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$r2$::jsonb, $r3${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "leitura_da_voz", "peso": 30}, {"dimension": "decisao_de_recorte", "peso": 25}, {"dimension": "criterio_do_desdobramento", "peso": 20}, {"dimension": "conformidade_percebida", "peso": 15}, {"dimension": "clareza_do_processo", "peso": 10}]}$r3$::jsonb]::jsonb[];
  v_sai_ids   text[] := string_to_array(nullif(current_setting('p104.sai_ids', true), ''), ',');
  v_tab_md5   text   := '896a36eb223eae2e660a4a8d2d4d9521';
  c      text;
  k      int;
  v_mc   bigint;
  v_ca   bigint;
  v_n    bigint;
  v_id   uuid;
  v_h    text;
  v_rub  jsonb;
  v_md5  text;
BEGIN
  IF v_sai_ids IS NULL THEN
    RAISE EXCEPTION 'P104 POS-PORTAO: a GUC do PRE nao esta definida nesta transacao — o POS nao pode medir';
  END IF;

  FOREACH c IN ARRAY v_cargos LOOP
    SELECT count(*) FILTER (WHERE p.formato = 'mc'), count(*) FILTER (WHERE p.formato = 'caso_aberto')
      INTO v_mc, v_ca FROM public.perguntas p WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active';
    IF v_mc <> 6 OR v_ca <> 1 THEN
      RAISE EXCEPTION 'P104 POS-PORTAO (contagem): cargo % com % mc + % caso aberto ativos (esperado 6+1); nada persiste', c, v_mc, v_ca;
    END IF;
    -- cada mc ativo: 4 alternativas, pesos {4,2,1,0} e etiqueta coerente com o peso
    SELECT count(*) INTO v_n FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active' AND p.formato = 'mc'
       AND (SELECT coalesce(array_agg(o.peso ORDER BY o.peso DESC), ARRAY[]::int[]) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id)
           IS DISTINCT FROM ARRAY[4, 2, 1, 0]
        OR EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id
                    AND o.peso <> CASE o.tag::text WHEN 'fortemente_pontua' THEN 4 WHEN 'pontua' THEN 2 WHEN 'neutro' THEN 1 WHEN 'atencao' THEN 0 END);
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'P104 POS-PORTAO (alternativas): cargo % tem % mc ativo(s) sem 4 alternativas de pesos {4,2,1,0} coerentes com a etiqueta; nada persiste', c, v_n;
    END IF;
    -- escada D-37: a fortemente_pontua nao ocupa a mesma ordem em mais de 3 mc do cargo
    SELECT coalesce(max(s.n), 0) INTO v_n FROM (
      SELECT o.ordem, count(*) AS n FROM public.perguntas p JOIN public.perguntas_opcao_sjt o ON o.pergunta_id = p.id
       WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active' AND p.formato = 'mc' AND o.tag = 'fortemente_pontua'
       GROUP BY o.ordem) s;
    IF v_n > 3 THEN
      RAISE EXCEPTION 'P104 POS-PORTAO (escada): cargo %, fortemente_pontua na mesma ordem em % itens (maximo 3); nada persiste', c, v_n;
    END IF;
  END LOOP;

  -- todo item ativo dos cargos e um item do texto, e o content_hash recalculado no banco bate com o
  -- gravado: sha256(cenario || alternativas na ordem fortemente_pontua, pontua, neutro, atencao)
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'
     AND (NOT EXISTS (SELECT 1 FROM unnest(v_ativo_c, v_ativo_h) AS e(c, h) WHERE e.c = p.cargo AND e.h = p.content_hash)
          OR encode(sha256(convert_to(p.cenario || coalesce((SELECT string_agg(o.opcao_texto, '' ORDER BY array_position(ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao']::text[], o.tag::text))
                                                            FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id), ''), 'UTF8')), 'hex')
             IS DISTINCT FROM p.content_hash);
  IF v_n <> 0 OR (SELECT count(*) FROM public.perguntas p WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active') <> 21 THEN
    RAISE EXCEPTION 'P104 POS-PORTAO (texto): % item(ns) ativo(s) fora do texto ou com content_hash que nao bate com o texto gravado (esperado 21 itens do texto); nada persiste', v_n;
  END IF;

  -- o caso aberto ativo de cada cargo e o NOVO, com a rubrica do documento e a soma dos pesos dele
  FOR k IN 1 .. array_length(v_caso_c, 1) LOOP
    SELECT p.content_hash, p.rubric INTO v_h, v_rub FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_caso_c[k] AND p.formato = 'caso_aberto' AND p.status = 'active';
    IF v_h IS DISTINCT FROM v_caso_h[k] THEN
      RAISE EXCEPTION 'P104 POS-PORTAO (caso): o caso aberto ativo de % tem content_hash % (esperado o novo, %); nada persiste', v_caso_c[k], v_h, v_caso_h[k];
    END IF;
    IF v_rub IS DISTINCT FROM v_caso_rub[k]
       OR (SELECT sum((d ->> 'peso')::int) FROM jsonb_array_elements(v_rub -> 'dimensoes') d) IS DISTINCT FROM v_caso_soma[k] THEN
      RAISE EXCEPTION 'P104 POS-PORTAO (rubrica): a rubrica do caso aberto de % nao e a do documento (soma esperada %); nada persiste', v_caso_c[k], v_caso_soma[k];
    END IF;
  END LOOP;

  -- os que sairam: retired, e as alternativas deles intactas (nada apagado)
  SELECT count(*) INTO v_n FROM public.perguntas p
   WHERE p.id::text = ANY (v_sai_ids) AND p.status = 'retired'
     AND (p.formato = 'caso_aberto' OR (SELECT count(*) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) = 4);
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'P104 POS-PORTAO (retirados): % de 4 item(ns) retired com as alternativas intactas; nada persiste', v_n;
  END IF;

  -- md5 da tabela de comprimentos (a MESMA linha canonica de scripts/geradores/tabela-comprimento-sjt.py):
  -- <cargo>|<content_hash>|<fortemente_pontua>,<pontua>,<neutro>,<atencao>, ordem de bytes
  SELECT md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_md5
    FROM (SELECT p.cargo || '|' || p.content_hash || '|' ||
                 (SELECT string_agg(char_length(o.opcao_texto)::text, ','
                                    ORDER BY array_position(ARRAY['fortemente_pontua', 'pontua', 'neutro', 'atencao']::text[], o.tag::text))
                    FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) AS x
            FROM public.perguntas p
           WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc') s;
  IF v_md5 IS DISTINCT FROM v_tab_md5 THEN
    RAISE EXCEPTION 'P104 POS-PORTAO (tabela): md5 da tabela de comprimentos % (o gerador mediu %); nada persiste', v_md5, v_tab_md5;
  END IF;

  PERFORM set_config('p104.evidencia', 'sjt104:' || array_to_string(v_cargos, '+') || '=6+1;retirados=' ||
    array_length(v_sai_ids, 1)::text || ';tabela_md5=' || v_md5 || ';em_curso=' || current_setting('p104.em_curso', true), false);
END
$pos$;
