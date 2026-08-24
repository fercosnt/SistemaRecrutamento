-- =============================================================================
-- Migration: rubrica_ia das duas vagas publicadas
-- Date: 2026-08-23
-- =============================================================================
--
-- POR QUE ESTA COLUNA EXISTE. `rubrica_ia` e o que a IA le para AVALIAR;
-- `descricao_curta`/`sobre_cargo`/`requisitos_*` sao a copia que ATRAI. Os dois
-- textos tem propositos opostos. Sem rubrica, a Edge Function cai no fallback e usa
-- a copia de divulgacao como criterio — e ai entram na avaliacao sinais que ninguem
-- decidiu que pesariam ("operacao enxuta", "ambicao saudavel"), que e por onde vies
-- entra sem passar por decisao. As duas rubricas PROIBEM explicitamente esses
-- adjetivos, junto com nome, genero, idade, origem e afins.
--
-- ALINHAMENTO RNF-07a: os requisitos eliminatorios mandam registrar gap `critical`
-- e segurar o score abaixo de 40. NUNCA mandam rejeitar. O sistema nao rejeita
-- candidato automaticamente por score — o score baixo e sinal para o RH, nao decisao.
--
-- DUAS DECISOES QUE PROTEGEM O CANDIDATO DE UMA FALHA DO SISTEMA:
--   * Silencio do curriculo sobre disponibilidade vira `insufficient_evidence`, nao
--     ausencia — curriculo nao costuma declarar isso, e trata-lo como falta daria
--     gap critico injusto a todo mundo.
--   * O anuncio da Social Media diz que o portfolio e "OBRIGATORIO na inscricao",
--     mas NAO EXISTE campo que o colete (as duas vagas estao com zero perguntas em
--     perguntas_formulario). A rubrica manda NAO descontar por ausencia de
--     portfolio — a omissao e do sistema, nao do candidato.
--
-- Aditivo e reversivel: as duas colunas estao NULL hoje. Sem BEGIN/COMMIT (D-22).
-- O texto abaixo e extraido dos blocos cercados do documento de revisao, sem
-- transcricao manual.
-- =============================================================================

-- ── consultor-relacionamento-pre-vendas (2668 caracteres) ──
UPDATE public.vagas SET rubrica_ia = $rub_consultor$## Requisitos eliminatórios
Se qualquer um estiver AUSENTE no currículo, registre como gap de severidade `critical`
e mantenha o score composto abaixo de 40, por melhor que seja o resto do perfil.
- Ensino médio completo.
- Pelo menos 1 ano de experiência em atendimento, vendas, recepção ou relacionamento.
- Disponibilidade integral e presencial, de segunda a sexta.
  Se o currículo não disser nada sobre disponibilidade, trate como `insufficient_evidence`
  e NÃO como ausência — é pergunta de entrevista, não de currículo.

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

4. Contexto de decisão que envolve dinheiro e insegurança
   Peso MÉDIO. Conta ponto, não elimina.
   5 = saúde, odontologia ou estética, OU venda de ticket médio/alto com negociação
       de orçamento.
   3 = varejo ou serviço de ticket baixo.
   1 = nenhum contato com cliente final.

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
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.$rub_consultor$
 WHERE slug = 'consultor-relacionamento-pre-vendas';

-- ── social-media-producao-captacao-conteudo (2785 caracteres) ──
UPDATE public.vagas SET rubrica_ia = $rub_social$## Requisitos eliminatórios
Se ausente no currículo, registre como gap `critical` e mantenha o score abaixo de 40.
- Pelo menos 1 ano produzindo conteúdo para Instagram e/ou TikTok.
- Disponibilidade integral e presencial, de segunda a sexta.
  Silêncio do currículo sobre disponibilidade = `insufficient_evidence`, não ausência.

⚠ PORTFÓLIO: o anúncio pede portfólio na inscrição, mas o formulário ainda NÃO coleta
esse campo. Portanto: se houver link ou descrição de portfólio no currículo, use como
evidência forte. A AUSÊNCIA de portfólio NÃO é gap e NÃO reduz o score — o candidato não
teve onde informá-lo.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Produção publicada com constância
   Peso ALTO. O problema que a vaga resolve é constância, não peça isolada.
   5 = responsável por calendário e publicação recorrente, com volume comprovável.
   3 = produziu conteúdo em campanhas pontuais ou como parte de outra função.
   1 = nenhuma evidência de conteúdo publicado.

2. Captação e edição de vídeo vertical
   Peso ALTO.
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
- Os adjetivos do anúncio da vaga sobre a clínica ou sobre o Dr. Fernando Costa Jr.

Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.$rub_social$
 WHERE slug = 'social-media-producao-captacao-conteudo';

-- ── PORTAO: prova por EXECUCAO que as duas rubricas ficaram integras ──
-- md5 do texto conferido contra o computado na geracao. Se qualquer uma divergir,
-- ou se alguma vaga ATIVA ficar sem rubrica, a transacao inteira aborta.
DO $portao$
DECLARE
  v_erro text := '';
  v_sem_rubrica int;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
  ('consultor-relacionamento-pre-vendas', '9376feebed03baaf2213e190b8b29478'),
  ('social-media-producao-captacao-conteudo', 'b3272e5bf422a039d1383884ff6b42ac')
    ) AS e(slug, texto_md5)
  LOOP
    PERFORM 1 FROM public.vagas v
     WHERE v.slug = r.slug
       AND md5(v.rubrica_ia) = r.texto_md5;
    IF NOT FOUND THEN
      v_erro := v_erro || format('  - %s nao confere apos o UPDATE%s', r.slug, chr(10));
    END IF;
  END LOOP;

  SELECT count(*) INTO v_sem_rubrica
    FROM public.vagas
   WHERE status = 'ativa' AND coalesce(btrim(rubrica_ia), '') = '';

  IF v_sem_rubrica > 0 THEN
    v_erro := v_erro || format('  - %s vaga(s) ATIVA(s) seguem sem rubrica%s', v_sem_rubrica, chr(10));
  END IF;

  IF v_erro <> '' THEN
    RAISE EXCEPTION E'rubricas NAO conferem:\n%', v_erro;
  END IF;

  RAISE NOTICE 'portao ok: 2 rubricas gravadas e conferidas por md5; nenhuma vaga ativa sem rubrica';
END
$portao$;
