-- 20260929000001_banco_sjt_marketing.sql
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- O banco de itens SJT tinha 10 itens em 7 cargos (dentista 4; todos os outros 1 cada) e
-- NENHUM de marketing, audiovisual ou conteudo. Mesmo assim `work_sample_sjt` nasce
-- `obrigatorio: true` no cargoTemplates, e a vaga de Social Media que ja esta no ar aponta
-- para `cargo: 'sdr-social-seller'` — 1 item, de cenario de vendas, para avaliar quem produz
-- conteudo. `publish_vaga` exige >=1 teste obrigatorio mas NAO confere se o banco tem item:
-- a vaga publica, o teste consta na configuracao, e o candidato responde uma pergunta do
-- cargo errado. Isso gera um numero que PARECE avaliacao, dentro de um peso de 30%.
--
-- As 3 vagas do squad de Marketing (Social Media Senior, Videomaker/Storymaker, Editor de
-- Video) precisam de banco proprio. Sao 3 cargos novos, 21 itens (18 mc + 3 caso aberto).
--
-- TAMANHO: 6 mc + 1 caso aberto por cargo, e NAO os 3+1 do `dentista`.
-- O 3+1 e tamanho herdado que ninguem validou. Com 3 itens o placar maximo e 12 e o
-- threshold de 60% cai em 7,2 — uma unica escolha defensavel move o candidato de faixa.
-- Com 6, o placar vai a 24 e uma escolha isolada pesa metade. Tempo estimado por candidato:
-- 6 x 4 min + 18 = 42 min (o `dentista` declara 7 min por mc, generoso para ler 3 linhas e
-- escolher entre 4 opcoes).
--
-- COMPOSICAO: exatamente 1 item de conformidade (CFO/ANVISA) por cargo, nao mais.
-- A primeira versao tinha 8 de 12 em conformidade — media risco bem e oficio de marketing
-- mal, e reprovaria gente boa pelo motivo errado. Um item por cargo mede se a pessoa
-- reconhece o risco; tres medem se ela decorou a regra.
--
-- DESENHO DAS OPCOES: em todos os 18 mc a opcao `atencao` e o que uma pessoa competente e
-- bem-intencionada faria sob pressao. Opcao errada obvia nao discrimina ninguem — so mede
-- se o candidato sabe o que o avaliador quer ouvir.
--
-- NENHUM item tem opcao `knockout`. Nenhum cenario aqui justifica rejeitar na inscricao, e
-- o score do SJT nunca rejeita sozinho (RNF-07a) — o threshold so marca `pendente_humano`.
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Fonte: docs/specs/DRAFT-banco-sjt-marketing.md (aprovado pelo operador em 2026-09-29).
-- Gerador: scratchpad/gen-sjt.py — parseia o markdown, valida (21 itens, 4 opcoes por mc na
-- ordem fortemente_pontua/pontua/neutro/atencao, rubric somando 100) e emite. Transcricao a
-- mao e por onde conteudo se perde neste repo.
--
-- ⚠ `cenario` e `opcao_texto` sao TEXTO PURO na tela do candidato.
-- SjtMultiplaEscolhaScreen.tsx:215 e SjtCasoAbertoScreen.tsx:225 renderizam com
-- `<p className="... whitespace-pre-line">{cenario}</p>` — sem TextoRico. Qualquer `**` aqui
-- apareceria LITERAL para o candidato (defeito nº 1 desta base, ja visto duas vezes). O
-- gerador tira a enfase markdown na emissao. A quebra dupla (\n\n) do caso aberto FUNCIONA,
-- porque `whitespace-pre-line` a preserva.
--
-- Sem BEGIN/COMMIT (D-22): o driver ja envolve a migration na propria transacao.
-- Idempotente por `content_hash` (sha256 do cenario + textos das opcoes): reaplicar nao
-- duplica, e um item cujo texto mudar entra como item novo, de proposito.

-- 01 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i1d$Leitura de dados + Atitude de Dono$i1d$, $i1c$O quadro "Estudo do dia" é o preferido do Dr. e o que ele mais cobra. Depois de 8 semanas, é o de menor retenção do perfil (média de 18%) e quase não recebe salvamento — enquanto os bastidores de consultório, que ele acha "bobos", retêm 46%. Na sexta você apresenta o relatório de quadros.$i1c$, 'mc', 4, NULL, '1f96b67e6f3af08f063064de6935a240217707fb97fbbb850957dbec7816f9be', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '1f96b67e6f3af08f063064de6935a240217707fb97fbbb850957dbec7816f9be')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i1o1$Leva os dois números lado a lado e propõe um teste: manter o Estudo do dia com formato novo (hook diferente, mais curto) por 3 semanas e aumentar a frequência dos bastidores — com o critério de corte combinado antes de começar.$i1o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i1o2$Apresenta os números e recomenda cortar o Estudo do dia, porque o dado é claro.$i1o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i1o3$Apresenta os números sem recomendação e deixa a decisão com o Dr.$i1o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i1o4$Mantém o Estudo do dia como está — é o quadro que o Dr. quer, e insistir só desgasta a relação.$i1o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 02 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i2d$Escrita na voz do outro + Receptividade a feedback$i2d$, $i2c$Na leitura semanal em voz alta, o Dr. trava em três dos cinco roteiros e diz "está bom, mas não é assim que eu falo". Ele não sabe explicar o que mudaria. A gravação é depois de amanhã.$i2c$, 'mc', 4, NULL, '7d10235b7f54fc97fc58594bf4d2ee8ceb185aa952aec0c1d6a7ba13710ed0d6', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '7d10235b7f54fc97fc58594bf4d2ee8ceb185aa952aec0c1d6a7ba13710ed0d6')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i2o1$Pede que ele conte a mesma ideia do jeito dele, grava o áudio ali, e reescreve a partir das palavras que ele usou — alimentando o banco de frases com o que saiu.$i2o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i2o2$Reescreve os três mais curtos e mais coloquiais, e leva de volta para ele.$i2o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i2o3$Mantém os dois que funcionaram, descarta os três e escreve outros do zero.$i2o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i2o4$Grava assim mesmo — no teleprompter ele adapta na hora, e o calendário não pode parar.$i2o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 03 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i3d$Ética + Discrição$i3d$, $i3c$O Dr. manda no grupo um vídeo gravado no consultório mostrando o resultado de uma paciente, e escreve "posta hoje, ficou incrível". Você não encontra o termo de autorização dela no arquivo.$i3c$, 'mc', 4, NULL, '0f2ee16e61a307e12249285f47a2d8d13bf03919fdd7f34a12fc011b5f84855c', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '0f2ee16e61a307e12249285f47a2d8d13bf03919fdd7f34a12fc011b5f84855c')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i3o1$Segura a publicação, avisa o Dr. e a Coordenação de que falta o termo, e pede à recepção que confirme ou colha antes.$i3o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i3o2$Publica cortando o rosto e mostrando só a boca, e providencia o termo depois.$i3o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i3o3$Publica em stories, por ser temporário, e não no feed.$i3o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i3o4$Publica — foi o próprio Dr. quem mandou, e a autorização é responsabilidade da clínica.$i3o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 04 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i4d$Checagem de fonte + Comunicação com o líder$i4d$, $i4c$Para o "Estudo do dia" de amanhã, o Dr. te manda o print de um post de outro dentista afirmando que "laser reduz em 80% a recidiva de cárie". Não há referência. Você procura e acha um estudo parecido — com 34 participantes e sem grupo controle.$i4c$, 'mc', 4, NULL, '6aa0fa38d62e972907b7912d032610874f5fa85f4a563242d682c8f7baa05a8c', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '6aa0fa38d62e972907b7912d032610874f5fa85f4a563242d682c8f7baa05a8c')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i4o1$Leva ao Dr. o que encontrou — o estudo existe, mas é frágil — e propõe trocar por um achado que dê para referenciar, ou manter o tema falando de mecanismo em vez de número.$i4o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i4o2$Publica sem o número, falando só do mecanismo, e não comenta a fragilidade com o Dr.$i4o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i4o3$Tira o tema da pauta e escolhe outro assunto para o dia.$i4o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i4o4$Usa o número citando "estudos mostram" — o Dr. mandou, e é ele quem entende do assunto.$i4o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 05 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i5d$Roteiro para vídeo curto — competência central$i5d$, $i5c$Você precisa escrever um Reel sobre tratamento de ronco e apneia com laser. O tema é forte, mas o mecanismo exige uns 40 segundos de contexto antes de qualquer coisa fazer sentido.$i5c$, 'mc', 4, NULL, 'a616f2e8e088590467ab5db1612acd4e5438c7a19b11222266f6002bed584848', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'a616f2e8e088590467ab5db1612acd4e5438c7a19b11222266f6002bed584848')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i5o1$Abre pelo efeito na vida da pessoa (dormir a noite inteira, o cônjuge voltar para o quarto) e entrega o mecanismo depois, em uma frase — e escreve 4 hooks testando ângulos diferentes do mesmo efeito.$i5o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i5o2$Abre com uma pergunta provocativa sobre ronco e mantém a explicação inteira, cortando o resto.$i5o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i5o3$Divide em dois Reels: um de contexto e um de mecanismo.$i5o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i5o4$Mantém a ordem natural do assunto — contexto primeiro, porque sem ele ninguém entende o resto.$i5o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 06 · social-media · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'social-media', $i6d$Colaboração + Devolutiva técnica$i6d$, $i6c$O editor entrega o terceiro vídeo da semana com o mesmo problema dos dois anteriores: a legenda entra meio segundo atrasada e o corte do hook está frouxo. Você já pediu ajuste duas vezes, por escrito.$i6c$, 'mc', 4, NULL, '5c5cb4223c9c4981a8b8886e59b08b9e0f773dbb1765d4bb7399ecdf4350ed51', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '5c5cb4223c9c4981a8b8886e59b08b9e0f773dbb1765d4bb7399ecdf4350ed51')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i6o1$Chama para uma conversa curta, mostra os três casos lado a lado na tela, combina o padrão explicitamente e registra onde ele fica para consulta.$i6o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i6o2$Devolve de novo por escrito, agora com marcação de tempo exata em cada ponto.$i6o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i6o3$Corrige você mesma o que dá e entrega no prazo, para não travar o calendário.$i6o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i6o4$Escala para a Coordenação cobrar o padrão — você já pediu duas vezes e não é sua função insistir.$i6o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 07 · social-media · caso aberto
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'social-media', NULL, $i7c$O Dr. te manda um áudio empolgado: quer gravar um Reel no tom do "Professor Sarcástico" ironizando clínicas que "vendem lente de contato dental para todo mundo". No áudio, ele cita um concorrente pelo nome. É o quadro que mais engaja no perfil.

Escreva: (a) como você levaria isso ao ar mantendo o tom e o engajamento; (b) o que mudaria e por quê; (c) o que diria ao Dr.; (d) qual é o limite que você não cruzaria.$i7c$, 'caso_aberto', 18, $i7r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "raciocinio_editorial", "peso": 25}, {"dimension": "conformidade_publicidade", "peso": 25}, {"dimension": "preservacao_do_tom", "peso": 20}, {"dimension": "comunicacao_com_o_lider", "peso": 20}, {"dimension": "limite_explicito", "peso": 10}]}$i7r$::jsonb, '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '31741dd1defe05353d84ddf1233d552af1480853a6dfc73431da4d0858833b79');

-- 08 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i8d$Narrativa em stories + Iniciativa$i8d$, $i8c$Quarta fraca: dois pacientes desmarcaram, o Dr. passou a manhã em reunião fechada e a tarde tem só um atendimento longo. São 11h e você tem 4 stories publicados. A meta do dia é 20.$i8c$, 'mc', 4, NULL, '141c5d6b2e9e7b864b158da4ce17115a1c6e6a599d58457cb3bd76db7bdbd593', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '141c5d6b2e9e7b864b158da4ce17115a1c6e6a599d58457cb3bd76db7bdbd593')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i8o1$Usa o tempo morto nos quadros que não dependem de paciente (estudo, academia, obra, equipamento) e combina com a social media puxar um quadro do banco para o dia.$i8o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i8o2$Aproveita o atendimento longo da tarde e faz dele uma sequência completa, com começo, meio e fim.$i8o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i8o3$Publica menos hoje e compensa amanhã, avisando a Coordenação.$i8o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i8o4$Republica cortes de stories antigos que foram bem, para não quebrar a constância.$i8o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 09 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i9d$Planejamento + Comunicação$i9d$, $i9c$A sessão semanal estava marcada para as 14h; são 15h40 e o Dr. segue em atendimento. Há 6 roteiros na pauta, e o editor precisa do material amanhã cedo.$i9c$, 'mc', 4, NULL, '0451582d21f3b4ee2433fc8f6bd5eb85a717c4ace0ca854a8d39aa4f81fafea9', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '0451582d21f3b4ee2433fc8f6bd5eb85a717c4ace0ca854a8d39aa4f81fafea9')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i9o1$Deixa o set pronto para começar em minutos, avisa a social media e a Coordenação do risco de prazo, e prioriza com elas quais roteiros gravar no tempo que restar.$i9o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i9o2$Espera e grava tudo no que sobrar do dia, mesmo com luz e áudio piores.$i9o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i9o3$Remarca a sessão inteira para a semana seguinte.$i9o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i9o4$Grava os roteiros com outra pessoa da equipe no lugar do Dr., para não perder o prazo.$i9o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 10 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i10d$Discrição + Leitura de ambiente$i10d$, $i10c$Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está por perto, e não há câmera à vista.$i10c$, 'mc', 4, NULL, 'aae413708b196908b3cafe63aef33ab651f7781a28b3abede99226b80cd2f63a', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'aae413708b196908b3cafe63aef33ab651f7781a28b3abede99226b80cd2f63a')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i10o1$Não grava. Depois, com calma, pergunta se ele toparia contar de novo em vídeo, com termo assinado.$i10o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i10o2$Grava só o áudio e pede autorização depois, porque o momento não se repete.$i10o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i10o3$Grava, guarda sem publicar, e decide depois com a Coordenação.$i10o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i10o4$Grava e publica em stories — é depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer.$i10o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 11 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i11d$Captação em tempo real — competência central$i11d$, $i11c$O Dr. está no meio de um procedimento com uma paciente que está na lista de termos assinados do dia, e acontece algo que renderia um story ótimo: ele explica a ela, ali, por que não vai extrair o dente que outra clínica tinha condenado. Você está com o celular na mão, a luz está ruim e há barulho de sugador.$i11c$, 'mc', 4, NULL, '5b2e881d3151ed44873d7fe67272c5a4102eca5d960c375dbd271a5c60524457', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '5b2e881d3151ed44873d7fe67272c5a4102eca5d960c375dbd271a5c60524457')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i11o1$Grava assim mesmo priorizando o áudio (aproxima o celular, encosta o microfone) e publica com legenda — a fala é o conteúdo, e ela não volta.$i11o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i11o2$Grava em silêncio e publica só a imagem, com texto na tela resumindo o que aconteceu.$i11o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i11o3$Não grava e pede ao Dr. que reconte depois, num set preparado.$i11o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i11o4$Ajusta a luz e posiciona o lapela antes de começar a gravar, para não publicar material ruim.$i11o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 12 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i12d$Set de gravação + Contingência$i12d$, $i12c$A sessão semanal começa em 20 minutos. Montando o set, você descobre que o microfone de lapela não está carregando e o teleprompter do tablet trava ao rolar o texto. O Dr. tem uma janela de 40 minutos e não haverá outra nesta semana.$i12c$, 'mc', 4, NULL, '55bf0781139ea3e2a899b872016bb73a07316ebc77dc89be12718099918a3f4e', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '55bf0781139ea3e2a899b872016bb73a07316ebc77dc89be12718099918a3f4e')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i12o1$Resolve com o que tem — microfone direcional do celular a curta distância e o roteiro impresso em cartões grandes fora do quadro — e avisa a Coordenação da reposição necessária.$i12o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i12o2$Grava com o áudio do celular e o Dr. lendo do próprio celular na mão.$i12o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i12o3$Usa os 20 minutos tentando consertar o lapela e começa a sessão atrasado.$i12o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i12o4$Remarca a sessão e comunica que, sem equipamento, não dá para garantir qualidade.$i12o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 13 · videomaker-storymaker · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $i13d$Organização de arquivo$i13d$, $i13c$Sexta, 19h. Você tem material de três dias no celular e na câmera: 2 sessões de gravação, fotos de dois photodumps e bastidores da obra. O editor abre a fila segunda às 8h, e você vai emendar o fim de semana.$i13c$, 'mc', 4, NULL, 'fe64e73478e27cf4cb04eb823ae49b0527cea471513ca776ae068e9a1d982ed4', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'fe64e73478e27cf4cb04eb823ae49b0527cea471513ca776ae068e9a1d982ed4')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i13o1$Sobe tudo na pasta compartilhada, nomeado no padrão e separado por dia e por pauta, com um recado curto ao editor sobre o contexto de cada captação e o que é prioridade.$i13o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i13o2$Sobe tudo numa pasta única "semana 39" e manda mensagem ao editor dizendo o que é o quê.$i13o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i13o3$Sobe as sessões de gravação, que são prioridade, e deixa fotos e bastidores para segunda cedo.$i13o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i13o4$Deixa tudo nos dispositivos e sobe na segunda antes das 8h.$i13o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 14 · videomaker-storymaker · caso aberto
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'videomaker-storymaker', NULL, $i14c$É seu primeiro dia sozinho. A agenda tem: 3 atendimentos com laser, uma reunião do Dr. com um fornecedor, o almoço da equipe e uma obra em andamento no segundo andar. A meta é de 20 a 30 stories publicados no dia, com começo, meio e fim.

Escreva: (a) a sequência que publicaria ao longo do dia, e qual é o arco dela; (b) quais três momentos você transformaria depois em conteúdo de feed, e por quê; (c) o que NÃO filmaria e por quê; (d) o que faria se o dia rendesse pouco material.$i14c$, 'caso_aberto', 18, $i14r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "narrativa_do_dia", "peso": 30}, {"dimension": "olho_editorial_e_reaproveitamento", "peso": 25}, {"dimension": "conformidade_e_autorizacao", "peso": 20}, {"dimension": "planejamento_e_contingencia", "peso": 15}, {"dimension": "leitura_de_ambiente", "peso": 10}]}$i14r$::jsonb, '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '98f7fde92440dc76639dff43530bb06dd18380bf5a126e6ea05a8273ab9db0aa');

-- 15 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i15d$Ritmo para retenção + Colaboração$i15d$, $i15c$O Dr. gravou uma explicação de 90 segundos e pediu que saísse "inteira, porque cada parte importa". Você sabe que os primeiros 25 segundos são preâmbulo, e a retenção do perfil cai forte antes dos 15s.$i15c$, 'mc', 4, NULL, 'e89831d85eebd69a9bb0d6ebeac2b443e142e915fb01175d9466349fc5ca5e75', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'e89831d85eebd69a9bb0d6ebeac2b443e142e915fb01175d9466349fc5ca5e75')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i15o1$Monta as duas versões — a inteira e uma de 45s começando pelo ponto mais forte — e leva ambas à social media com o número de retenção, para decidirem com ele.$i15o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i15o2$Entrega a versão curta, explicando na entrega por que cortou.$i15o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i15o3$Entrega inteira como pedido, registrando a preocupação com a retenção.$i15o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i15o4$Entrega inteira e não comenta — o pedido veio de quem aparece no vídeo.$i15o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 16 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i16d$Conformidade + Alçada$i16d$, $i16c$A social media te manda um roteiro cujo hook é "Seu dentista nunca te contou isso: dá pra tratar canal sem dor nenhuma". O vídeo já foi gravado com esse texto no teleprompter, e é o hook mais forte da semana.$i16c$, 'mc', 4, NULL, '6e600e111a914a7b6dc37a4cbe5037058127dfe995c74fcd310398111bdb48ed', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '6e600e111a914a7b6dc37a4cbe5037058127dfe995c74fcd310398111bdb48ed')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i16o1$Edita e entrega, sinalizando à social media que "sem dor nenhuma" é promessa de resultado, e propõe duas variações de hook sem a promessa para teste.$i16o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i16o2$Edita como está e registra a dúvida na entrega.$i16o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i16o3$Edita como está — o texto é da social media, que responde pela mensagem.$i16o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i16o4$Reescreve o hook por conta própria e entrega já alterado, sem avisar.$i16o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 17 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i17d$Cumprimento de prazo + Comunicação$i17d$, $i17c$São 4 vídeos para hoje. No terceiro, você descobre que o material bruto do quarto chegou sem áudio aproveitável. Faltam 2 horas para a entrega.$i17c$, 'mc', 4, NULL, 'e57aaaa0e19869d6276800fc1cd2471ae083fc4d80874ae1a81950341bed2967', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'e57aaaa0e19869d6276800fc1cd2471ae083fc4d80874ae1a81950341bed2967')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i17o1$Avisa a Coordenação e a social media na hora e propõe entregar 3 hoje e o quarto amanhã, com regravação do áudio.$i17o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i17o2$Entrega os 3 e deixa o quarto para amanhã, avisando no fim do dia.$i17o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i17o3$Entrega os 4, salvando o quarto com legenda e trilha por cima do áudio ruim.$i17o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i17o4$Entrega os 4 no prazo e não menciona o problema de áudio.$i17o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 18 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i18d$Variação de hook$i18d$, $i18c$O tráfego pediu 4 variações de hook para o Reel que melhor performou no orgânico. O vídeo fala sobre clareamento sem sensibilidade.$i18c$, 'mc', 4, NULL, '669df37be29d8353fe9177796a5dbc42589bd5a0b91b562b58a6aaa0adda6376', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '669df37be29d8353fe9177796a5dbc42589bd5a0b91b562b58a6aaa0adda6376')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i18o1$Faz quatro aberturas testando ângulos distintos — dor evitada, prova visual, quebra de crença, pergunta direta — mantendo o corpo igual, e nomeia os arquivos de modo que dê para comparar resultado.$i18o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i18o2$Faz quatro aberturas com o mesmo argumento, variando a frase e o ritmo do corte.$i18o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i18o3$Entrega duas variações fortes e explica que as outras duas seriam repetição.$i18o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i18o4$Troca a primeira frase do texto na tela nas quatro versões, mantendo a imagem idêntica.$i18o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 19 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i19d$Atenção a detalhe + Conformidade$i19d$, $i19c$Você finaliza o último vídeo do dia, com entrega marcada para as 18h. No segundo 14, ao fundo, a tela do computador da recepção aparece desfocada — mas dá para ler o nome de um paciente na agenda.$i19c$, 'mc', 4, NULL, 'f6f1d597795aa835d8723568036436a52eff78aeb9115cf0e9c9c2602a2fd130', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'f6f1d597795aa835d8723568036436a52eff78aeb9115cf0e9c9c2602a2fd130')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i19o1$Cobre ou corta o trecho e entrega, sinalizando à social media o ajuste que fez.$i19o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i19o2$Entrega no prazo sinalizando que há uma tela legível ao fundo, para a social media decidir antes de publicar.$i19o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i19o3$Aumenta o desfoque até não se ler mais, e entrega sem comentar.$i19o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i19o4$Entrega como está — está desfocado, e ninguém vai pausar o vídeo para ler.$i19o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 20 · editor-video · mc
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'editor-video', $i20d$Padrão visual + Prioridade$i20d$, $i20c$Chega material gravado por outra pessoa, enquanto o videomaker estava de folga: enquadramento diferente, temperatura de cor mais fria, áudio com outro timbre. É o único material do quadro desta semana.$i20c$, 'mc', 4, NULL, '9e0936f247b570cb1e2f13475c28fbfd42c1e7dda4a53342a184bc70ef9bbca3', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '9e0936f247b570cb1e2f13475c28fbfd42c1e7dda4a53342a184bc70ef9bbca3')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($i20o1$Aproxima cor e áudio do padrão até onde dá, entrega sinalizando o que não foi possível igualar, e propõe um mínimo de captação para quem substituir o videomaker.$i20o1$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($i20o2$Ajusta só a cor, que é o que mais salta, e comenta na entrega.$i20o2$, 'pontua'::enum_tag_opcao, 2, 2),
    ($i20o3$Entrega como veio, sinalizando que o material fugiu do padrão.$i20o3$, 'neutro'::enum_tag_opcao, 1, 3),
    ($i20o4$Refaz o grading até bater exatamente com o padrão, mesmo atrasando as outras entregas do dia.$i20o4$, 'atencao'::enum_tag_opcao, 0, 4)
) AS v(texto, tag, peso, ordem);

-- 21 · editor-video · caso aberto
INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
SELECT 'sjt', 'editor-video', NULL, $i21c$Você recebe um vídeo de 6 minutos: o Dr. explicando, em linguagem técnica, por que a limpeza a laser mata bactéria que a raspagem não alcança. É denso e é bom. A meta é um Reel de até 60 segundos, e a social media pediu 3 variações de hook.

Escreva: (a) como escolheria os 60 segundos; (b) as 3 variações de hook que proporia e o que cada uma testa; (c) o que faria com o resto do material; (d) o que checaria antes de entregar.$i21c$, 'caso_aberto', 18, $i21r${"banda": {"avanca": 18, "entrevista": 13, "score_max": 25}, "dimensoes": [{"dimension": "ritmo_e_retencao", "peso": 30}, {"dimension": "variacao_de_hook", "peso": 25}, {"dimension": "conformidade_na_entrega", "peso": 20}, {"dimension": "reaproveitamento", "peso": 15}, {"dimension": "clareza_de_processo", "peso": 10}]}$i21r$::jsonb, 'c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = 'c9964c17ace4d2962642ea2a63ef2131bc883cb9f8e92de27643299e2b86123c');
