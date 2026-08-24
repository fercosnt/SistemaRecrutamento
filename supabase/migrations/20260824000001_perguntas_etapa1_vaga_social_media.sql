-- =============================================================================
-- Migration: perguntas da Etapa 1 + rubrica revista — vaga social-media-producao-captacao-conteudo
-- Date: 2026-08-24
-- =============================================================================
--
-- A vaga esta ATIVA e publicada com ZERO perguntas: quem se inscreve e analisado so
-- pelo curriculo. Pior, o anuncio (secao 07 do descritivo) diz que o portfolio e
-- "obrigatorio na inscricao" — e nao existia campo nenhum que o coletasse. A rubrica
-- precisou blindar o candidato contra essa falha do sistema. Criar a pergunta e a
-- correcao de verdade; a blindagem sai junto, no mesmo arquivo, senao a IA seguiria
-- perdoando a ausencia de um campo que passou a ser obrigatorio.
--
-- POR QUE UM ARQUIVO, e nao um INSERT no SQL Editor: as 6 perguntas antigas desta
-- base tem created_by nulo, e foi por INSERT ad-hoc que elas ficaram assim. O bloco
-- abaixo resolve o autor e ABORTA se nao achar, em vez de gravar NULL calado.
--
-- ANUNCIO x RUBRICA: sao textos com propositos opostos. O anuncio ATRAI; a rubrica
-- AVALIA. Esta migration nao toca no anuncio. Aditivo e reversivel (soft delete nas
-- perguntas; a rubrica anterior esta no historico do git). Sem BEGIN/COMMIT (D-22).
--
-- ⚠ DESVIO CONSCIENTE, aprovado pelo operador: o bloco de knockout escreve DIRETO em
--   pergunta_opcao_metadata. A via oficial (upsert_pergunta_opcoes_metadata) esta
--   bloqueada duas vezes aqui — recusa vaga que nao seja 'rascunho', e exige
--   auth.jwt() com role rh/admin, que a via de apply nao possui. Despublicar a vaga
--   para usar a RPC seria porta de mao unica: publish_vaga nao a republicaria, porque
--   pesos_avaliacao esta {0,0,0,0} e testes_aplicaveis esta []. O INSERT direto
--   reproduz o que a RPC faria, e funciona porque o sweep de
--   submit_candidatura_atomic casa por TEXTO (resposta_opcoes @> to_jsonb(
--   m.opcao_texto)), nao por opcao_id.
-- =============================================================================

DO $perg$
DECLARE
  v_autor uuid;
  v_vaga  uuid;
  v_base  int;
  v_p2    uuid;
  v_n     int;
BEGIN
  SELECT user_id INTO v_autor
    FROM public.usuarios_rh
   WHERE email = 'fernando@beautysmile.com.br' AND ativo IS TRUE AND deleted_at IS NULL;
  IF v_autor IS NULL THEN
    RAISE EXCEPTION 'autor nao resolvido para % — as perguntas nasceriam com created_by nulo',
      'fernando@beautysmile.com.br';
  END IF;

  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga "%" nao encontrada — nada a fazer', 'social-media-producao-captacao-conteudo';
  END IF;

  -- Conta SEM filtrar deleted_at de proposito: e assim que o publish_vaga conta, e o
  -- teto de 10 e o dele. Pergunta soft-deletada continua ocupando lugar no teto.
  SELECT COALESCE(max(ordem), 0) INTO v_base
    FROM public.perguntas_formulario WHERE vaga_id = v_vaga;

  INSERT INTO public.perguntas_formulario (
    vaga_id, bloco, ordem, texto_pergunta, texto_ajuda,
    tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres,
    created_by, updated_by
  )
  SELECT v_vaga, q.bloco, v_base + q.ordem, q.texto, q.ajuda,
         q.tipo::public.tipo_resposta_pergunta, q.opcoes, q.obrig, q.limite,
         v_autor, v_autor
    FROM (VALUES
      ('curriculo', 1, $q1$Cole os links do seu portfólio: perfis que você produziu (@ do Instagram/TikTok), pasta com peças ou site. Pode colar mais de um.$q1$, $a1$Pode ser perfil próprio, de freelance ou de empresa. Se o perfil for privado ou já não estiver no ar, descreva em uma linha o que você produzia ali.$a1$::text,
       'texto_curto', NULL::jsonb, true, 500::int),
      ('jornada', 2, $q2$Qual é a sua disponibilidade para esta vaga, que é presencial na clínica, de segunda a sexta?$q2$, NULL::text,
       'single_choice', $o2$["Tenho disponibilidade integral e presencial, de segunda a sexta, e flexibilidade para gravações fora do dia fixo","Tenho disponibilidade integral e presencial, de segunda a sexta, mas sem flexibilidade para horários extras","Tenho disponibilidade apenas parcial, em alguns dias da semana","Tenho disponibilidade apenas para trabalho remoto"]$o2$::jsonb, true, NULL::int),
      ('curriculo', 3, $q3$Há quanto tempo você produz conteúdo para Instagram e/ou TikTok (perfil próprio, freelance ou empresa)?$q3$, NULL::text,
       'single_choice', $o3$["Menos de 1 ano produzindo conteúdo para Instagram e/ou TikTok","Entre 1 e 2 anos produzindo conteúdo para Instagram e/ou TikTok","Entre 2 e 4 anos produzindo conteúdo para Instagram e/ou TikTok","Mais de 4 anos produzindo conteúdo para Instagram e/ou TikTok"]$o3$::jsonb, true, NULL::int),
      ('tecnologia', 4, $q4$Quais destas etapas já são rotina do seu trabalho, e não algo que você fez uma vez?$q4$, $a4$Marque quantas quiser.$a4$::text,
       'multiple_choice', $o4$["Captação de vídeo com celular — enquadramento, luz e áudio","Edição de vídeo vertical para Reels e stories (CapCut, Premiere ou equivalente)","Design de carrossel, banner e capa (Canva, Photoshop ou Illustrator)","Escrita de legenda, roteiro, texto de blog ou LinkedIn","Programação e publicação no Meta Business Suite ou no TikTok","Acompanhamento de alcance, salvamentos e compartilhamentos","Campanhas de e-mail marketing (GoHighLevel, RD Station, Mailchimp ou similar)","Nenhuma destas ainda é rotina do meu trabalho"]$o4$::jsonb, true, NULL::int),
      ('curriculo', 5, $q5$Você já produziu conteúdo para clínica de saúde, estética, ou para a marca pessoal de um médico ou dentista?$q5$, NULL::text,
       'single_choice', $o5$["Sim, já produzi conteúdo para clínica de saúde ou de estética","Sim, já produzi para a marca pessoal de um médico, dentista ou outro profissional de saúde","Já produzi para outra área regulada ou sensível (jurídico, financeiro, educação)","Ainda não produzi conteúdo nesse contexto"]$o5$::jsonb, true, NULL::int)
    ) AS q(bloco, ordem, texto, ajuda, tipo, opcoes, obrig, limite);

  -- Rubrica revista. Nenhuma das mudancas mexe nas 5 competencias:
  --  (a) o bloco do portfolio se INVERTE — o campo passa a existir, entao resposta
  --      vazia ou evasiva vira gap. Antes a ausencia era perdoada porque era falha
  --      do sistema, e deixou de ser.
  --  (b) bloco novo explicando que as respostas da Etapa 1 chegam ao modelo SEM o
  --      enunciado e em ordem arbitraria — a query de analise-candidato-individual
  --      (index.ts:186) nao tem .order(), e buildRespostasBlock so monta o texto da
  --      resposta. Sem esse aviso o modelo tenta ler por posicao e erra.
  --  (c) nao ter produzido para saude/estetica deixa de poder virar gap: o descritivo
  --      lista isso como DESEJAVEL, e a pergunta 5 agora coleta.
  -- As competencias 1 e 2 absorveram os dois requisitos obrigatorios do anuncio que
  -- ate aqui nao eram avaliados por nada: prazos/organizacao e captacao presencial.
  UPDATE public.vagas
     SET rubrica_ia = $rub$## Requisitos eliminatórios
Se ausente no currículo, registre como gap `critical` e mantenha o score abaixo de 40.
- Pelo menos 1 ano produzindo conteúdo para Instagram e/ou TikTok.
- Disponibilidade integral e presencial, de segunda a sexta.
  Silêncio do currículo sobre disponibilidade = `insufficient_evidence`, não ausência.

⚠ COMO LER AS RESPOSTAS DA ETAPA 1: elas chegam a você como uma lista solta, SEM o
enunciado de cada pergunta e em ordem arbitrária. Não conte com a posição. Identifique
cada uma pelo próprio conteúdo: links e @ de perfil são o portfólio; frases sobre
segunda a sexta são disponibilidade; faixas de anos são tempo de experiência.

⚠ PORTFÓLIO: o formulário AGORA coleta o portfólio, em campo obrigatório. Se houver
link ou @ de perfil nas respostas ou no currículo, use como evidência forte da
competência 1 e da 2. Se a resposta vier vazia, evasiva ou sem nada que se pareça com
um endereço ou um @, registre gap `major` — o candidato teve onde informar e não
informou. Nunca penalize por portfólio que existe mas você não conseguiu abrir: você
não navega, julga só o que está escrito.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Produção publicada com constância
   Peso ALTO. O problema que a vaga resolve é constância, não peça isolada.
   Conta aqui a evidência de organização e de prazo: calendário editorial, volume
   mensal declarado, rotina de publicação recorrente ou uso de ferramenta de
   planejamento. Atraso ou irregularidade relatada pelo próprio candidato é gap.
   5 = responsável por calendário e publicação recorrente, com volume comprovável.
   3 = produziu conteúdo em campanhas pontuais ou como parte de outra função.
   1 = nenhuma evidência de conteúdo publicado.

2. Captação e edição de vídeo vertical
   Peso ALTO. O trabalho é presencial e a captação acontece dentro da clínica, com
   pessoas: valorize evidência de captação própria, no local — não apenas edição de
   material gravado por terceiros. Recusa explícita a gravar presencialmente é gap.
   5 = grava e edita Reels/stories como rotina (CapCut, Premiere ou equivalente),
       com domínio de enquadramento, luz e áudio.
   3 = edita vídeo, mas sem evidência de captação própria — ou o contrário.
   1 = nenhuma evidência.

3. Design de peça e consistência visual
   Peso MÉDIO.
   5 = carrossel, banner e capa com padrão de marca (Canva; Photoshop, Illustrator
       ou After Effects contam mais).
   3 = usou ferramenta de design de forma ocasional.
   1 = nenhuma evidência.

4. Escrita
   Peso MÉDIO. Legenda, roteiro, blog e LinkedIn.
   Considere a ortografia e a clareza do próprio currículo como evidência direta.
   5 = escreveu texto publicado como parte central da função.
   1 = nenhuma evidência, ou currículo com erros de ortografia recorrentes.

5. Publicação e leitura de alcance
   Peso BAIXO.
   5 = programou publicação (Meta Business Suite, TikTok) e acompanhou alcance,
       salvamentos e compartilhamentos.
   3 = publicou manualmente, sem evidência de leitura de métrica.
   1 = nenhuma evidência.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Número de seguidores do perfil pessoal do candidato — é popularidade, não competência.
- Aparência, estilo pessoal ou "presença de câmera" inferida do currículo.
- "Ser jovem" ou "nativo digital".
- Ter ou não ter curso superior — o anúncio diz que conta pontos, e é só isso: um ponto,
  nunca um corte.
- Não ter produzido para saúde ou estética antes. É diferencial que soma, jamais um gap:
  a vaga aceita quem vem de outro nicho.
- Os adjetivos do anúncio da vaga sobre a clínica ou sobre o Dr. Fernando Costa Jr.

Todo ponto forte e todo gap deve citar trecho literal do currículo ou da resposta. Se o
material não permite julgar uma competência, use `insufficient_evidence` — é melhor que
chutar.$rub$,
         updated_by = v_autor
   WHERE id = v_vaga;

  -- Knockout na pergunta de disponibilidade. Ver o bloco de desvio no cabecalho.
  SELECT id INTO v_p2 FROM public.perguntas_formulario
   WHERE vaga_id = v_vaga AND ordem = v_base + 2 AND deleted_at IS NULL;
  IF v_p2 IS NULL THEN
    RAISE EXCEPTION 'pergunta de disponibilidade nao localizada — knockout nao seria gravado';
  END IF;

  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id = v_p2;

  INSERT INTO public.pergunta_opcao_metadata
    (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
  SELECT v_p2, gen_random_uuid(), o.texto, o.tag::public.enum_tag_opcao, 0, o.ordem
    FROM (VALUES
      ($k1$Tenho disponibilidade integral e presencial, de segunda a sexta, e flexibilidade para gravações fora do dia fixo$k1$, 'neutro', 1),
      ($k2$Tenho disponibilidade integral e presencial, de segunda a sexta, mas sem flexibilidade para horários extras$k2$, 'neutro', 2),
      ($k3$Tenho disponibilidade apenas parcial, em alguns dias da semana$k3$, 'neutro', 3),
      ($k4$Tenho disponibilidade apenas para trabalho remoto$k4$, 'knockout', 4)
    ) AS o(texto, tag, ordem);

  -- O texto do metadata TEM de casar com opcoes_resposta, senao o sweep nunca acha e
  -- o knockout vira letra morta — verde, silencioso e inutil.
  SELECT count(*) INTO v_n
    FROM public.pergunta_opcao_metadata m
    JOIN public.perguntas_formulario f ON f.id = m.pergunta_id
   WHERE m.pergunta_id = v_p2 AND f.opcoes_resposta @> to_jsonb(m.opcao_texto);
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'so % de 4 opcoes casam por texto com opcoes_resposta — o knockout seria letra morta', v_n;
  END IF;

  RAISE NOTICE 'vaga %: 5 perguntas a partir da ordem %, rubrica revista, knockout armado',
    v_vaga, v_base + 1;
END
$perg$;
