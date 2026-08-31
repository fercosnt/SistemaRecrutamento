-- =============================================================================
-- Migration: 3 candidatos FICTICIOS para exercitar comparacao e analise de IA
-- Date: 2026-08-30
-- =============================================================================
-- ⚠ DADO DE TESTE EM PRODUCAO, COM PRAZO. Os tres candidatos abaixo NAO
-- correspondem a pessoa alguma: nome, e-mail, telefone e curriculo sao inventados
-- para este teste. Devem ser removidos antes da divulgacao das vagas — o operador
-- aprovou a criacao e a remocao em 2026-08-30. Os UUIDs comecam com `f0000001..3`
-- de proposito, para serem reconheciveis numa varredura.
--
-- POR QUE INSERIR EM VEZ DE CADASTRAR PELA TELA: `trg_candidaturas_analise` dispara
-- AFTER INSERT em `candidaturas` e chama a Edge Function de analise. Ou seja, este
-- caminho exercita exatamente o mesmo motor de IA que o cadastro real — o que muda
-- e so quem escreve a linha.
--
-- ⚠ AS RESPOSTAS DA ETAPA 1 VAO NA MESMA TRANSACAO, e isso nao e detalhe. O
-- `pg_net` enfileira o POST e o worker o envia DEPOIS do commit; a Edge Function
-- monta o bloco "Respostas Etapa 1" lendo `respostas_formulario`. Se as respostas
-- entrassem numa transacao posterior, a IA avaliaria os tres SEM elas — e
-- devolveria score plausivel, sem erro nenhum, medindo menos do que diz medir.
--
-- Os curriculos ja estao em `storage.curriculos` (subidos antes desta migration) e
-- os caminhos abaixo apontam para eles. Caminho errado nao falha: a EF registra o
-- flag `cv_nao_extraido` e avalia sem o curriculo. Por isso ha portao conferindo
-- que os tres arquivos existem ANTES de inserir qualquer linha.
--
-- Os tres perfis sao calibrados contra a rubrica da vaga, para a comparacao ter
-- amplitude:
--   Rafael   — recepcao em clinica odontologica, sem CRM: meio da tabela.
--   Camila   — varejo de ticket baixo, sem comercial estruturado: piso.
--   Beatriz  — perfil bom, boa escrita, RD Station, mas QUATRO MESES de
--              experiencia. A rubrica manda gap `critical` e score abaixo de 40
--              quando falta um eliminatorio, "por melhor que seja o resto do
--              perfil". Este e o caso que verifica se a regra MORDE ou so esta
--              escrita.
--
-- Sem BEGIN/COMMIT (D-22) — o driver ja envolve a migration numa transacao, que e
-- justamente o que faz as respostas chegarem junto.
-- =============================================================================

DO $fakes$
DECLARE
  v_vaga uuid;
  v_faltando int;
BEGIN
  SELECT id INTO v_vaga FROM public.vagas
   WHERE slug = 'consultor-relacionamento-pre-vendas' AND deleted_at IS NULL;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'vaga consultor-relacionamento-pre-vendas nao encontrada';
  END IF;

  -- ── Portao: os tres PDFs precisam existir ANTES de qualquer insert ──────
  -- Caminho errado nao da erro: a EF marca `cv_nao_extraido` e avalia sem o CV.
  -- O teste inteiro perderia o sentido, com saida perfeitamente bem formada.
  SELECT count(*) INTO v_faltando FROM (VALUES
      ('f0000001-0000-4000-8000-000000000001/a1000001-0000-4000-8000-000000000001.pdf'),
      ('f0000002-0000-4000-8000-000000000002/a1000002-0000-4000-8000-000000000002.pdf'),
      ('f0000003-0000-4000-8000-000000000003/a1000003-0000-4000-8000-000000000003.pdf')
    ) AS c(caminho)
   WHERE NOT EXISTS (
     SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'curriculos' AND o.name = c.caminho
   );
  IF v_faltando > 0 THEN
    RAISE EXCEPTION '% curriculo(s) de teste ausente(s) no bucket — a IA avaliaria sem o CV e o teste nao mediria nada', v_faltando;
  END IF;

  -- ── Os candidatos ficticios (sem login: nao ha conta sendo criada) ──────
  INSERT INTO public.candidatos (id, nome_completo, email, celular, data_nascimento, cidade, estado)
  VALUES
    ('f0000001-0000-4000-8000-000000000001', 'Rafael Souza Lima',
     'rafael.souza.lima.teste@exemplo.com', '(11) 97321-9080', '1998-04-12', 'São Paulo', 'SP'),
    ('f0000002-0000-4000-8000-000000000002', 'Camila Rodrigues dos Santos',
     'camila.rodrigues.teste@exemplo.com', '(11) 96540-1122', '2002-09-30', 'São Paulo', 'SP'),
    ('f0000003-0000-4000-8000-000000000003', 'Beatriz Mendonça Costa',
     'beatriz.mendonca.teste@exemplo.com', '(11) 99187-3355', '2003-02-18', 'São Paulo', 'SP');

  -- ── As candidaturas. O AFTER INSERT dispara a analise de IA nas tres. ───
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, curriculo_url, curriculo_nome_original, status, etapa_atual)
  VALUES
    ('c0000001-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001', v_vaga,
     'f0000001-0000-4000-8000-000000000001/a1000001-0000-4000-8000-000000000001.pdf',
     'CV - Rafael Souza Lima.pdf', 'em_analise', 'triagem'),
    ('c0000002-0000-4000-8000-000000000002', 'f0000002-0000-4000-8000-000000000002', v_vaga,
     'f0000002-0000-4000-8000-000000000002/a1000002-0000-4000-8000-000000000002.pdf',
     'CV - Camila Rodrigues dos Santos.pdf', 'em_analise', 'triagem'),
    ('c0000003-0000-4000-8000-000000000003', 'f0000003-0000-4000-8000-000000000003', v_vaga,
     'f0000003-0000-4000-8000-000000000003/a1000003-0000-4000-8000-000000000003.pdf',
     'CV - Beatriz Mendonça Costa.pdf', 'em_analise', 'triagem');

  -- ── As respostas da Etapa 1, coerentes com cada curriculo ──────────────
  -- ⚠ O texto tem de bater LITERALMENTE com `opcoes_resposta`: a IA le so a
  -- resposta, sem o enunciado, e o sweep do knockout casa por texto.
  INSERT INTO public.respostas_formulario (candidatura_id, pergunta_id, resposta_opcoes)
  VALUES
    -- Rafael: disponivel, 2-5 anos, rotina parcial, ticket baixo, motivacao de carreira
    ('c0000001-0000-4000-8000-000000000001', '04b2b9da-a3c7-4704-b0cc-4f73d84ba1b0',
     to_jsonb(ARRAY['Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial'])),
    ('c0000001-0000-4000-8000-000000000001', '3410a912-67a2-4dc9-a178-461a158e46fe',
     to_jsonb(ARRAY['Entre 2 e 5 anos em atendimento, vendas, recepção ou relacionamento com cliente'])),
    ('c0000001-0000-4000-8000-000000000001', '4eec0f54-372a-4062-b24c-f100cae1072e',
     to_jsonb(ARRAY['Atendimento e venda por WhatsApp, escrevendo eu mesmo as mensagens',
                    'Agendamento, confirmação e trabalho ativo para reduzir falta na agenda'])),
    ('c0000001-0000-4000-8000-000000000001', 'e2f3a53a-68b1-482e-838e-898e5fb39c4a',
     to_jsonb(ARRAY['Atendi cliente final, mas em produto ou serviço de ticket baixo'])),
    ('c0000001-0000-4000-8000-000000000001', 'dbad3d3a-d3ad-4132-8e97-84bf75d25363',
     to_jsonb(ARRAY['A trilha de carreira definida, que pode levar a Coordenação Comercial ou a Closer'])),

    -- Camila: disponivel, menos de 1 ano NAO — ela tem 2 anos de varejo; rotina nenhuma
    ('c0000002-0000-4000-8000-000000000002', '04b2b9da-a3c7-4704-b0cc-4f73d84ba1b0',
     to_jsonb(ARRAY['Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial'])),
    ('c0000002-0000-4000-8000-000000000002', '3410a912-67a2-4dc9-a178-461a158e46fe',
     to_jsonb(ARRAY['Entre 2 e 5 anos em atendimento, vendas, recepção ou relacionamento com cliente'])),
    ('c0000002-0000-4000-8000-000000000002', '4eec0f54-372a-4062-b24c-f100cae1072e',
     to_jsonb(ARRAY['Nenhuma destas ainda é rotina do meu trabalho'])),
    ('c0000002-0000-4000-8000-000000000002', 'e2f3a53a-68b1-482e-838e-898e5fb39c4a',
     to_jsonb(ARRAY['Atendi cliente final, mas em produto ou serviço de ticket baixo'])),
    ('c0000002-0000-4000-8000-000000000002', 'dbad3d3a-d3ad-4132-8e97-84bf75d25363',
     to_jsonb(ARRAY['O prêmio por resultado sem teto, atrelado a comparecimento e a venda'])),

    -- Beatriz: disponivel, MENOS DE 1 ANO (o eliminatorio), rotina forte, ticket baixo
    ('c0000003-0000-4000-8000-000000000003', '04b2b9da-a3c7-4704-b0cc-4f73d84ba1b0',
     to_jsonb(ARRAY['Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial'])),
    ('c0000003-0000-4000-8000-000000000003', '3410a912-67a2-4dc9-a178-461a158e46fe',
     to_jsonb(ARRAY['Menos de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente'])),
    ('c0000003-0000-4000-8000-000000000003', '4eec0f54-372a-4062-b24c-f100cae1072e',
     to_jsonb(ARRAY['Atendimento e venda por WhatsApp, escrevendo eu mesmo as mensagens',
                    'Prospecção ativa e follow-up de quem não respondeu, seguindo uma cadência definida',
                    'Registro de todo contato em CRM (GoHighLevel, RD Station, HubSpot, Pipedrive, Clinicorp ou similar)'])),
    ('c0000003-0000-4000-8000-000000000003', 'e2f3a53a-68b1-482e-838e-898e5fb39c4a',
     to_jsonb(ARRAY['Ainda não atendi cliente final nesse tipo de decisão'])),
    ('c0000003-0000-4000-8000-000000000003', 'dbad3d3a-d3ad-4132-8e97-84bf75d25363',
     to_jsonb(ARRAY['Construir os scripts, as cadências e o processo comercial com autonomia']));

  RAISE NOTICE 'tres candidaturas ficticias criadas na vaga %', v_vaga;
END
$fakes$;

-- ── Portao: cada resposta tem de casar LITERALMENTE com uma opcao da pergunta ──
-- Um acento ou uma virgula fora deixa a resposta orfa: a IA le um texto que nao
-- corresponde a opcao nenhuma, e o sweep do knockout nao a encontraria. Falharia
-- em silencio, que e o modo de falha que mais custou nesta base.
DO $gate$
DECLARE
  v_orfas int;
  v_total int;
BEGIN
  SELECT count(*) INTO v_total
    FROM public.respostas_formulario r
   WHERE r.candidatura_id IN ('c0000001-0000-4000-8000-000000000001',
                              'c0000002-0000-4000-8000-000000000002',
                              'c0000003-0000-4000-8000-000000000003');
  IF v_total <> 15 THEN
    RAISE EXCEPTION 'esperava 15 respostas (3 candidatos x 5 perguntas), achei %', v_total;
  END IF;

  SELECT count(*) INTO v_orfas
    FROM public.respostas_formulario r
    JOIN public.perguntas_formulario p ON p.id = r.pergunta_id,
         jsonb_array_elements_text(r.resposta_opcoes) AS esc(texto)
   WHERE r.candidatura_id IN ('c0000001-0000-4000-8000-000000000001',
                              'c0000002-0000-4000-8000-000000000002',
                              'c0000003-0000-4000-8000-000000000003')
     AND NOT (p.opcoes_resposta @> to_jsonb(esc.texto));
  IF v_orfas > 0 THEN
    RAISE EXCEPTION '% resposta(s) nao casam com nenhuma opcao da propria pergunta — a IA leria texto orfao', v_orfas;
  END IF;

  RAISE NOTICE 'portao ok: 15 respostas, todas casando por texto com as opcoes';
END
$gate$;
