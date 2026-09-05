-- =============================================================================
-- Migration: 3 candidatos FICTICIOS para a vaga de Social Media (comparacao + IA)
-- Date: 2026-09-05
-- =============================================================================
-- ⚠ DADO DE TESTE EM PRODUCAO, COM PRAZO. Nenhum dos tres corresponde a pessoa
-- alguma — nome, e-mail, telefone e curriculo sao inventados. Devem ser removidos
-- antes da divulgacao das vagas, junto com os tres da Consultor (…0830000005); o
-- operador aprovou criacao e remocao em 2026-08-30 e reafirmou em 2026-09-05
-- (Bloco A2 do GUIA-VALIDACAO-FINAL). UUIDs `f0000004..6` / `c0000004..6`,
-- reconheciveis numa varredura.
--
-- Mesmo desenho da …0830000005: INSERT direto exercita o MESMO motor (o trigger
-- AFTER INSERT em `candidaturas` chama a EF de analise), e as respostas da Etapa 1
-- vao NA MESMA TRANSACAO — o worker do pg_net so envia depois do commit.
--
-- ORDEM: aplicar DEPOIS do deploy da EF que embute a pergunta no prompt e DEPOIS
-- da …0905000001 (rubrica coerente com o formato novo). Senao as tres analises
-- nascem medindo o formato antigo.
--
-- Perfis calibrados contra a rubrica da Social Media:
--   Larissa  — 3 anos, social media de clinica de estetica, grava e edita no local,
--              calendario editorial, metricas, RD Station: TETO.
--   Thiago   — 1,5 ano freelance so de edicao (nao capta), sem saude, sem metrica,
--              sem flexibilidade de horario: MEIO.
--   Juliana  — 7 MESES no Instagram da loja da familia, so Canva, sem calendario,
--              disponibilidade PARCIAL. Falta o eliminatorio "pelo menos 1 ano" e
--              a disponibilidade integral: gap `critical`, score < 40. E o par da
--              Beatriz — verifica se a regra morde tambem nesta rubrica.
--   A pergunta 1 (portfolio, texto_curto) e respondida pelos tres com @ e links, o
--   que exercita a instrucao "nunca penalize por portfolio que voce nao consegue
--   abrir" — a IA nao navega.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $fakes$
DECLARE
  v_vaga uuid;
  v_faltando int;
BEGIN
  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'social-media-producao-captacao-conteudo' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga social-media-producao-captacao-conteudo nao encontrada';
  END IF;

  -- Portao: os tres PDFs existem no bucket (caminho errado NAO falha na EF).
  SELECT count(*) INTO v_faltando FROM (VALUES
      ('f0000004-0000-4000-8000-000000000004/a1000004-0000-4000-8000-000000000004.pdf'),
      ('f0000005-0000-4000-8000-000000000005/a1000005-0000-4000-8000-000000000005.pdf'),
      ('f0000006-0000-4000-8000-000000000006/a1000006-0000-4000-8000-000000000006.pdf')
    ) AS c(caminho)
   WHERE NOT EXISTS (
     SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'curriculos' AND o.name = c.caminho
   );
  IF v_faltando > 0 THEN
    RAISE EXCEPTION '% curriculo(s) de teste ausente(s) no bucket — a IA avaliaria sem o CV', v_faltando;
  END IF;

  INSERT INTO public.candidatos (id, nome_completo, email, celular, data_nascimento, cidade, estado)
  VALUES
    ('f0000004-0000-4000-8000-000000000004', 'Larissa Ferreira Nogueira',
     'larissa.nogueira.teste@exemplo.com', '(11) 98214-6630', '2000-11-03', 'São Paulo', 'SP'),
    ('f0000005-0000-4000-8000-000000000005', 'Thiago Almeida Barros',
     'thiago.barros.teste@exemplo.com', '(11) 97705-2318', '2004-06-21', 'São Paulo', 'SP'),
    ('f0000006-0000-4000-8000-000000000006', 'Juliana Castro Pires',
     'juliana.pires.teste@exemplo.com', '(11) 96022-8471', '2006-01-15', 'São Paulo', 'SP');

  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, curriculo_url, curriculo_nome_original, status, etapa_atual)
  VALUES
    ('c0000004-0000-4000-8000-000000000004', 'f0000004-0000-4000-8000-000000000004', v_vaga,
     'f0000004-0000-4000-8000-000000000004/a1000004-0000-4000-8000-000000000004.pdf',
     'CV - Larissa Ferreira Nogueira.pdf', 'em_analise', 'triagem'),
    ('c0000005-0000-4000-8000-000000000005', 'f0000005-0000-4000-8000-000000000005', v_vaga,
     'f0000005-0000-4000-8000-000000000005/a1000005-0000-4000-8000-000000000005.pdf',
     'CV - Thiago Almeida Barros.pdf', 'em_analise', 'triagem'),
    ('c0000006-0000-4000-8000-000000000006', 'f0000006-0000-4000-8000-000000000006', v_vaga,
     'f0000006-0000-4000-8000-000000000006/a1000006-0000-4000-8000-000000000006.pdf',
     'CV - Juliana Castro Pires.pdf', 'em_analise', 'triagem');

  -- Pergunta 1 e texto_curto (portfolio) → resposta_texto.
  INSERT INTO public.respostas_formulario (candidatura_id, pergunta_id, resposta_texto)
  VALUES
    ('c0000004-0000-4000-8000-000000000004', 'ac67cf78-f4ec-4f52-a5b5-9ccdc227e50e',
     '@larissa.produz · @espacoderme · @dra.marinacosta · drive.google.com/drive/folders/exemplo-larissa'),
    ('c0000005-0000-4000-8000-000000000005', 'ac67cf78-f4ec-4f52-a5b5-9ccdc227e50e',
     'tiktok.com/@thiagoedita · instagram.com/thiagoedita'),
    ('c0000006-0000-4000-8000-000000000006', 'ac67cf78-f4ec-4f52-a5b5-9ccdc227e50e',
     '@lojacastro.moda');

  -- Perguntas 2-6 sao de escolha → resposta_opcoes, texto LITERAL da opcao.
  INSERT INTO public.respostas_formulario (candidatura_id, pergunta_id, resposta_opcoes)
  VALUES
    -- Larissa (teto)
    ('c0000004-0000-4000-8000-000000000004', '61bb4231-04e0-47c7-b69c-7c50b79ae827',
     to_jsonb(ARRAY['Tenho disponibilidade integral e presencial, de segunda a sexta, e flexibilidade para gravações fora do dia fixo'])),
    ('c0000004-0000-4000-8000-000000000004', 'eadede60-28a0-410b-b66b-2099edd7aa0b',
     to_jsonb(ARRAY['Entre 2 e 4 anos produzindo conteúdo para Instagram e/ou TikTok'])),
    ('c0000004-0000-4000-8000-000000000004', '3cbcf6e7-dba2-4e86-948d-2008c2bd95f3',
     to_jsonb(ARRAY['Captação de vídeo com celular — enquadramento, luz e áudio',
                    'Edição de vídeo vertical para Reels e stories (CapCut, Premiere ou equivalente)',
                    'Design de carrossel, banner e capa (Canva, Photoshop ou Illustrator)',
                    'Escrita de legenda, roteiro, texto de blog ou LinkedIn',
                    'Programação e publicação no Meta Business Suite ou no TikTok',
                    'Acompanhamento de alcance, salvamentos e compartilhamentos',
                    'Campanhas de e-mail marketing (GoHighLevel, RD Station, Mailchimp ou similar)'])),
    ('c0000004-0000-4000-8000-000000000004', '65127ae8-eda8-493f-b014-313caafbe84f',
     to_jsonb(ARRAY['Sim, já produzi conteúdo para clínica de saúde ou de estética'])),
    ('c0000004-0000-4000-8000-000000000004', '36d17976-bec8-4b09-a6b0-e4f9773a4a9b',
     to_jsonb(ARRAY['Produzir dentro da clínica, perto do paciente e do especialista, em vez de agência'])),

    -- Thiago (meio)
    ('c0000005-0000-4000-8000-000000000005', '61bb4231-04e0-47c7-b69c-7c50b79ae827',
     to_jsonb(ARRAY['Tenho disponibilidade integral e presencial, de segunda a sexta, mas sem flexibilidade para horários extras'])),
    ('c0000005-0000-4000-8000-000000000005', 'eadede60-28a0-410b-b66b-2099edd7aa0b',
     to_jsonb(ARRAY['Entre 1 e 2 anos produzindo conteúdo para Instagram e/ou TikTok'])),
    ('c0000005-0000-4000-8000-000000000005', '3cbcf6e7-dba2-4e86-948d-2008c2bd95f3',
     to_jsonb(ARRAY['Edição de vídeo vertical para Reels e stories (CapCut, Premiere ou equivalente)',
                    'Escrita de legenda, roteiro, texto de blog ou LinkedIn'])),
    ('c0000005-0000-4000-8000-000000000005', '65127ae8-eda8-493f-b014-313caafbe84f',
     to_jsonb(ARRAY['Ainda não produzi conteúdo nesse contexto'])),
    ('c0000005-0000-4000-8000-000000000005', '36d17976-bec8-4b09-a6b0-e4f9773a4a9b',
     to_jsonb(ARRAY['A trilha de carreira que sai de execução para análise de conteúdo e marketing'])),

    -- Juliana (piso — eliminatorio ausente; "parcial" e tag neutra, NAO knockout)
    ('c0000006-0000-4000-8000-000000000006', '61bb4231-04e0-47c7-b69c-7c50b79ae827',
     to_jsonb(ARRAY['Tenho disponibilidade apenas parcial, em alguns dias da semana'])),
    ('c0000006-0000-4000-8000-000000000006', 'eadede60-28a0-410b-b66b-2099edd7aa0b',
     to_jsonb(ARRAY['Menos de 1 ano produzindo conteúdo para Instagram e/ou TikTok'])),
    ('c0000006-0000-4000-8000-000000000006', '3cbcf6e7-dba2-4e86-948d-2008c2bd95f3',
     to_jsonb(ARRAY['Design de carrossel, banner e capa (Canva, Photoshop ou Illustrator)'])),
    ('c0000006-0000-4000-8000-000000000006', '65127ae8-eda8-493f-b014-313caafbe84f',
     to_jsonb(ARRAY['Ainda não produzi conteúdo nesse contexto'])),
    ('c0000006-0000-4000-8000-000000000006', '36d17976-bec8-4b09-a6b0-e4f9773a4a9b',
     to_jsonb(ARRAY['Aprender sobre saúde, estética e odontologia enquanto comunico sobre isso']));

  RAISE NOTICE 'tres candidaturas ficticias criadas na vaga %', v_vaga;
END
$fakes$;

-- Portao: 18 respostas (3 x 6) e toda opcao casando LITERALMENTE com a pergunta.
DO $gate$
DECLARE
  v_orfas int;
  v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.respostas_formulario r
   WHERE r.candidatura_id IN ('c0000004-0000-4000-8000-000000000004',
                              'c0000005-0000-4000-8000-000000000005',
                              'c0000006-0000-4000-8000-000000000006');
  IF v_total <> 18 THEN
    RAISE EXCEPTION 'esperava 18 respostas (3 candidatos x 6 perguntas), achei %', v_total;
  END IF;

  SELECT count(*) INTO v_orfas
    FROM public.respostas_formulario r
    JOIN public.perguntas_formulario p ON p.id = r.pergunta_id,
         jsonb_array_elements_text(r.resposta_opcoes) AS esc(texto)
   WHERE r.candidatura_id IN ('c0000004-0000-4000-8000-000000000004',
                              'c0000005-0000-4000-8000-000000000005',
                              'c0000006-0000-4000-8000-000000000006')
     AND NOT (p.opcoes_resposta @> to_jsonb(esc.texto));
  IF v_orfas > 0 THEN
    RAISE EXCEPTION '% resposta(s) nao casam com nenhuma opcao da propria pergunta', v_orfas;
  END IF;
  RAISE NOTICE 'portao ok: 18 respostas, opcoes casando por texto';
END
$gate$;
