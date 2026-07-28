-- =============================================================================
-- Migration: perguntas (SJT item bank) + perguntas_opcao_sjt (weights) + RLS
--            + get_opcoes_sjt() answer-key-safe reader + seed (8 cargos)
-- Date: 2026-06-11
-- Phase: 11 (avaliacao-assincrona — infra + work-sample/SJT, Etapa 3)
-- Requirement: AVAL-02 (RF-13) — SJT item bank + deterministic MC scoring source
-- =============================================================================
--
-- PURPOSE
-- A NEW SJT item bank (`perguntas`, tipo='sjt'), DISTINCT from the Phase-7
-- `perguntas_formulario` (inscription form questions). MC items carry their option
-- weights in a DEDICATED table `perguntas_opcao_sjt` (same shape as the Phase-7
-- `pergunta_opcao_metadata`, but FK→perguntas) — we do NOT touch the live Phase-7
-- metadata table (its FK targets perguntas_formulario; no live ALTER).
--
-- ANSWER-KEY PROTECTION (T-11-02-04 / [[reference_select_star_leaks_pii]]):
-- peso + tag ON perguntas_opcao_sjt ARE the scoring key. RLS is row-level only and
-- cannot hide columns, so a candidato row-SELECT on that table would leak the
-- answers. Therefore perguntas_opcao_sjt has NO candidato SELECT policy. The
-- candidate reads the options via the SECURITY DEFINER function get_opcoes_sjt(),
-- which projects ONLY (opcao_id, opcao_texto) — never peso/tag — in RANDOMIZED
-- order (anti-cheat). pontuar_sjt joins this table server-side for Σ peso.
--
-- SEED: dentista (3 MC + 1 open-case rubric jsonb 25/20/25/15/15) + ≥1 MC for each
-- of the other 7 cargos (recepcionista, consultor-vendas, sdr-social-seller,
-- assistente-financeiro, asb/tsb shared, vaga-generica) from docs/conhecimento/sjt/
-- banco-sjt-*.md (V1 = 1-2/cargo, D-05). Scale: fortemente_pontua=4, pontua=2,
-- neutro=1, atencao=0. ALL seeded scenario/option text passes the LGPD-04 grep
-- guard (the forbidden-strings test now scans supabase/migrations) — the text is
-- clinical-dental / behavioral framing only, never the LGPD-04-banned product copy.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands).
-- This file has one $$ body (get_opcoes_sjt) + adjacent GRANT/REVOKE → it is a
-- 42601-risk push; if `db push --linked` trips, apply via the D-22 SQL-Editor /
-- Supabase MCP execute_sql workaround + `migration repair --status applied`.
-- enum_tag_opcao already exists (Phase 7, 20260607010001) — reused, not re-created.
-- =============================================================================

-- SJT item bank (NEW table, distinct from perguntas_formulario) -----------------
CREATE TABLE public.perguntas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL DEFAULT 'sjt',
  cargo           text NOT NULL,
  dimensao_primaria text,
  cenario         text NOT NULL,
  formato         text NOT NULL CHECK (formato IN ('mc', 'caso_aberto')),
  tempo_est_min   int,
  rubric          jsonb,                                 -- open-case dimension weights (caso_aberto only)
  content_hash    text,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perguntas IS
  'Phase 11 / AVAL-02: SJT item bank (tipo=sjt). MC items (formato=mc) carry option weights in perguntas_opcao_sjt; open-case items (formato=caso_aberto) carry per-dimension weights in rubric jsonb. Distinct from perguntas_formulario (Phase-7 inscription form). RH manage; candidato reads active items.';

CREATE INDEX idx_perguntas_cargo ON public.perguntas (cargo) WHERE status = 'active';

ALTER TABLE public.perguntas ENABLE ROW LEVEL SECURITY;

-- RH/admin manage (live idiom — 'administrador', never 'admin') ------------------
DROP POLICY IF EXISTS rh_gerencia_perguntas ON public.perguntas;
CREATE POLICY rh_gerencia_perguntas ON public.perguntas
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- Candidato reads ACTIVE items (must read the battery scenarios) -----------------
DROP POLICY IF EXISTS cand_le_perguntas_ativas ON public.perguntas;
CREATE POLICY cand_le_perguntas_ativas ON public.perguntas
  FOR SELECT
  USING (status = 'active');

-- Dedicated SJT option-weight table (FK → perguntas; NOT the Phase-7 metadata) ---
CREATE TABLE public.perguntas_opcao_sjt (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id  uuid NOT NULL REFERENCES public.perguntas(id) ON DELETE CASCADE,
  opcao_id     uuid NOT NULL,
  opcao_texto  text NOT NULL,
  tag          public.enum_tag_opcao NOT NULL DEFAULT 'neutro',
  peso         int  NOT NULL DEFAULT 0 CHECK (peso BETWEEN -999 AND 100),
  ordem        int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pergunta_id, opcao_id)
);

COMMENT ON TABLE public.perguntas_opcao_sjt IS
  'Phase 11 / AVAL-02: SJT option weights (tag/peso). ANSWER KEY — peso/tag must NEVER reach the candidato. NO candidato SELECT policy; candidate reads options ONLY via get_opcoes_sjt() (projects opcao_id+opcao_texto, randomized). pontuar_sjt joins this table by opcao_id server-side for Σ peso ([[reference_select_star_leaks_pii]]).';

CREATE INDEX idx_pos_pergunta ON public.perguntas_opcao_sjt (pergunta_id);

ALTER TABLE public.perguntas_opcao_sjt ENABLE ROW LEVEL SECURITY;

-- RH/admin manage. NO candidato SELECT policy → answer key never leaks to candidato.
DROP POLICY IF EXISTS rh_gerencia_opcoes_sjt ON public.perguntas_opcao_sjt;
CREATE POLICY rh_gerencia_opcoes_sjt ON public.perguntas_opcao_sjt
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- Answer-key-safe option reader for the candidate -------------------------------
-- SECURITY DEFINER so it can read perguntas_opcao_sjt (which the candidato cannot
-- row-SELECT). Projects ONLY opcao_id + opcao_texto (NEVER peso/tag) in randomized
-- order (anti-cheat). Authorizes that the pergunta is an active SJT item; does NOT
-- need ownership (the scenario/options are not candidate PII), but it never exposes
-- the weights, which is the actual secret.
CREATE OR REPLACE FUNCTION public.get_opcoes_sjt(p_pergunta_id uuid)
RETURNS TABLE (opcao_id uuid, opcao_texto text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.perguntas p
     WHERE p.id = p_pergunta_id AND p.status = 'active' AND p.tipo = 'sjt'
  ) THEN
    RAISE EXCEPTION 'pergunta inexistente ou inativa' USING errcode = '42704';
  END IF;

  RETURN QUERY
    SELECT pos.opcao_id, pos.opcao_texto
      FROM public.perguntas_opcao_sjt pos
     WHERE pos.pergunta_id = p_pergunta_id
     ORDER BY random();              -- anti-cheat: randomize option order per call
END;
$$;

REVOKE ALL ON FUNCTION public.get_opcoes_sjt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_opcoes_sjt(uuid) TO authenticated;

-- =============================================================================
-- SEED — stable UUIDs so pontuar_sjt + the container can reference them.
-- Dentista: 3 MC (D1/D2/D3) + 1 open-case (rubric 25/20/25/15/15).
-- Other 7 cargos: ≥1 MC each (V1, D-05). Weights from banco-sjt-*.md tables.
-- =============================================================================

-- ── DENTISTA — MC D1 (odontofobia: autonomia + segurança clínica) ──────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000001', 'sjt', 'dentista', 'D6 Humanizacao + D3 Consentimento',
  'Você realiza uma extração de terceiro molar inferior quando, após a anestesia surtir efeito e iniciar a luxação, a paciente (28a) começa a chorar, agarra seu antebraço e diz, em pânico, que não consegue continuar. O alvéolo está parcialmente luxado mas o dente ainda não saiu. A auxiliar espera sua decisão.',
  'mc', 30,
  encode(extensions.digest('sjt:dentista:D1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000001', '11000001-0001-0001-0001-0000000000a1', 'Interrompe, protege o alvéolo provisoriamente, acolhe, oferece opções (retomar com técnica de redução de ansiedade / reagendar com sedação consciente) e documenta tudo', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000001', '11000001-0001-0001-0001-0000000000a2', 'Para o procedimento e pede que a paciente saia, registrando a recusa, sem proteger o alvéolo nem oferecer caminho', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000001', '11000001-0001-0001-0001-0000000000a3', 'Continua rápido para minimizar o trauma de interromper', 'atencao', 0, 3),
  ('11000001-0001-0001-0001-000000000001', '11000001-0001-0001-0001-0000000000a4', 'Pede à auxiliar que segure as mãos da paciente para terminar rápido', 'atencao', 0, 4);

-- ── DENTISTA — MC D2 (pedido estético sem indicação clínica) ───────────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000002', 'sjt', 'dentista', 'D1 Etica + D10 EBM',
  'Paciente de 25 anos, primeira consulta, quer extrair um pré-molar superior saudável para afinar o rosto, influenciada por vídeos. Exame: dente íntegro, sem indicação. Ela diz: "Outras clínicas fazem. Meu dinheiro, minha decisão. Você só executa."',
  'mc', 30,
  encode(extensions.digest('sjt:dentista:D2:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000002', '11000001-0001-0001-0001-0000000000b1', 'Recusa explicando os riscos funcionais/estéticos, oferece alternativas baseadas em evidência, entrega plano por escrito, encaminha a especialista e documenta', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000002', '11000001-0001-0001-0001-0000000000b2', 'Encaminha para outro dentista da clínica sem dar parecer', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000002', '11000001-0001-0001-0001-0000000000b3', 'Realiza a extração, respeitando a autonomia da paciente adulta', 'atencao', 0, 3),
  ('11000001-0001-0001-0001-000000000002', '11000001-0001-0001-0001-0000000000b4', 'Aceita realizar mediante consentimento robusto e pagamento à vista', 'atencao', 0, 4);

-- ── DENTISTA — MC D3 (erro de colega descoberto na radiografia) ────────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000003', 'sjt', 'dentista', 'D1 Etica + D2 Comunicacao + D5 Equipe',
  'Paciente de 47 anos chega com dor persistente no dente 36 após endodontia feita pelo colega anterior. Na radiografia você vê nitidamente uma lima endodôntica fraturada no terço apical + lesão periapical de ~4mm. A paciente nunca foi informada disso.',
  'mc', 30,
  encode(extensions.digest('sjt:dentista:D3:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000003', '11000001-0001-0001-0001-0000000000c1', 'Mostra a radiografia, explica clinicamente sem julgar o colega, apresenta as opções de retratamento, documenta, entrega cópia do exame e sugere que ela converse com o dentista anterior', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000003', '11000001-0001-0001-0001-0000000000c2', 'Encaminha para endodontista sem explicar à paciente o que viu', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000003', '11000001-0001-0001-0001-0000000000c3', 'Trata o dente sem mencionar o achado; comunica o colega depois', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000003', '11000001-0001-0001-0001-0000000000c4', 'Liga para o dentista anterior antes de falar com a paciente, para alinhar narrativa', 'atencao', 0, 4);

-- ── DENTISTA — OPEN CASE ("O sorriso dos sonhos da Mariana"), rubric 25/20/25/15/15
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash)
VALUES (
  '11000001-0001-0001-0001-0000000000ca', 'sjt', 'dentista', 'D10 Raciocinio clinico-estetico',
  'Mariana, 29 anos, paciente nova na Beauty Smile, chega querendo fazer "o sorriso dos sonhos". Mostra fotos de influenciadoras e quer lentes de contato dental em todos os dentes da frente, bem branquinhos e maiores. Ao exame: dentes hígidos, sem cárie, mas com gengivite generalizada (placa e sangramento), apinhamento leve ântero-inferior, facetas de desgaste sugestivas de bruxismo e exposição gengival assimétrica no sorriso. Ela tem um casamento em 2 meses, já pesquisou preço numa clínica que faz rapidinho, quer começar hoje, tem orçamento limitado e pergunta se dá para fazer só os 6 da frente para economizar. Descreva: (1) avaliação diagnóstica estética + funcional + periodontal; (2) conduta na consulta de hoje; (3) plano de tratamento de curto/médio prazo (sequência e opções); (4) como comunica isso à Mariana considerando expectativa, prazo e orçamento; (5) riscos, consentimento e acompanhamento.',
  'caso_aberto', 18,
  jsonb_build_object(
    'dimensoes', jsonb_build_array(
      jsonb_build_object('dimension', 'raciocinio_clinico_estetico', 'peso', 25),
      jsonb_build_object('dimension', 'planejamento_decisao',        'peso', 20),
      jsonb_build_object('dimension', 'comunicacao_expectativa',     'peso', 25),
      jsonb_build_object('dimension', 'etica_minimamente_invasivo',  'peso', 15),
      jsonb_build_object('dimension', 'consentimento_continuidade',  'peso', 15)
    ),
    'banda', jsonb_build_object('avanca', 18, 'entrevista', 13, 'score_max', 25)
  ),
  encode(extensions.digest('sjt:dentista:caso-aberto:v1.0', 'sha256'), 'hex')
);

-- ── RECEPCIONISTA — MC R1 (paciente com dor, sem horário e sem dinheiro) ───────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000004', 'sjt', 'recepcionista', 'D4 Urgencias',
  'Segunda-feira, 11h. Agenda 100% lotada até 18h. Uma mulher de 32 anos entra na recepção segurando o lado direito do rosto, visivelmente inchado, lacrimejando. Diz: "Estou com dor há 3 dias, não consigo dormir, não tenho convênio, não tenho dinheiro hoje, mas posso pagar amanhã. Por favor, me atendam." Outros 4 pacientes observam na sala de espera.',
  'mc', 12,
  encode(extensions.digest('sjt:recepcionista:R1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000004', '11000001-0001-0001-0001-0000000000d1', 'Conduz a paciente a um espaço reservado, comunica imediatamente o dentista responsável (suspeita de urgência), registra os dados e executa o protocolo de urgência sem pagamento imediato', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000004', '11000001-0001-0001-0001-0000000000d2', 'Aceita o encaixe por conta própria como urgência e a coloca na fila, sem avisar a equipe clínica', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000004', '11000001-0001-0001-0001-0000000000d3', 'Educadamente orienta a paciente a ligar às 8h do dia seguinte para tentar encaixe', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000004', '11000001-0001-0001-0001-0000000000d4', 'Pede que ela espere sentada, sem previsão e sem comunicar a equipe', 'atencao', 0, 4);

-- ── CONSULTOR-VENDAS — MC CV-1 (meta do mês × indicação clínica) ───────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000005', 'sjt', 'consultor-vendas', 'Atitude de Dono + Etica',
  'Um paciente está decidido a fechar um tratamento caro com laser, mas no diagnóstico o dentista aponta que parte do que ele quer não tem indicação clínica agora (poderia ser mais simples). Bater sua meta do mês depende desse fechamento.',
  'mc', 7,
  encode(extensions.digest('sjt:consultor-vendas:CV1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000005', '11000001-0001-0001-0001-0000000000e1', 'Mostra o que tem indicação agora e o que pode esperar, fecha o que faz sentido clínico e registra o resto para follow-up estruturado', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000005', '11000001-0001-0001-0001-0000000000e2', 'Fecha só o que tem indicação e abre mão do resto, sem estruturar follow-up', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000005', '11000001-0001-0001-0001-0000000000e3', 'Apresenta tudo e deixa 100% a decisão com o paciente, sem orientar', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000005', '11000001-0001-0001-0001-0000000000e4', 'Fecha o pacote completo porque ele quer e tem dinheiro, e bate a meta', 'atencao', 0, 4);

-- ── SDR-SOCIAL-SELLER — MC SDR-1 (lead que sumiu / follow-up) ──────────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000006', 'sjt', 'sdr-social-seller', 'Atitude de Dono + Comunicacao',
  'Um lead pediu informação no Instagram há 2 dias, você respondeu na hora com um áudio explicando, e ele sumiu (visualizou e não respondeu). Sua meta de agendamentos está apertada.',
  'mc', 7,
  encode(extensions.digest('sjt:sdr-social-seller:SDR1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000006', '11000001-0001-0001-0001-0000000000f1', 'Follow-up com valor agregado (conteúdo ligado ao que ele perguntou + pergunta aberta que reabre a conversa), com timing respeitoso; se não responder após alguns toques espaçados, registra no CRM para nutrir depois', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000006', '11000001-0001-0001-0001-0000000000f2', 'Manda "Oi, ainda tem interesse?" todo dia até ele responder', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000006', '11000001-0001-0001-0001-0000000000f3', 'Espera ele voltar — se tiver interesse, ele responde', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000006', '11000001-0001-0001-0001-0000000000f4', 'Insiste com pressão/escassez falsa (últimas vagas hoje!) para forçar resposta', 'atencao', 0, 4);

-- ── ASSISTENTE-FINANCEIRO — MC AF-1 (discrepância na conciliação) ──────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000007', 'sjt', 'assistente-financeiro', 'Atitude de Dono + Integridade',
  'No fechamento mensal (prazo hoje 18h), você encontra uma discrepância de R$ 2.300 entre o extrato bancário e o sistema. Investigar a fundo vai atrasar o fechamento que a diretoria espera.',
  'mc', 7,
  encode(extensions.digest('sjt:assistente-financeiro:AF1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000007', '11000001-0001-0001-0001-000000000a11', 'Comunica a pendência ao gestor com transparência, isola/documenta a discrepância, investiga a origem e propõe prazo realista — fechamento correto acima de fechamento no prazo com erro', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000007', '11000001-0001-0001-0001-000000000a12', 'Lança um ajuste para bater o número e marca para revisar depois, avisando o gestor', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000007', '11000001-0001-0001-0001-000000000a13', 'Fecha no prazo e deixa a discrepância para resolver quando der', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000007', '11000001-0001-0001-0001-000000000a14', 'Força o batimento com um lançamento de ajuste sem registrar nem avisar ninguém', 'atencao', 0, 4);

-- ── ASB / TSB (shared) — MC ASB-1 (esterilização não confirmada, sob pressão) ──
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000008', 'sjt', 'asb-tsb', 'Biosseguranca / Seguranca do Paciente',
  'Você prepara a sala para o próximo paciente e percebe que o indicador de esterilização do instrumental não mudou de cor (a esterilização pode ter falhado). O dentista está atrasado e diz: "vai logo, usa esse aí que estou com pressa."',
  'mc', 5,
  encode(extensions.digest('sjt:asb-tsb:ASB1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000008', '11000001-0001-0001-0001-000000000a21', 'Não entrega o instrumental não-confirmado; avisa o dentista que o indicador não validou, separa/reprocessa um kit com esterilização confirmada e registra', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000008', '11000001-0001-0001-0001-000000000a22', 'Avisa o dentista da dúvida, mas se ele insistir usa mesmo assim porque ele é o responsável', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000008', '11000001-0001-0001-0001-000000000a23', 'Troca por outro kit qualquer disponível, sem confirmar se aquele está validado', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000008', '11000001-0001-0001-0001-000000000a24', 'Usa o instrumental mesmo para não atrasar — deve estar ok', 'atencao', 0, 4);

-- ── VAGA-GENERICA — MC VG-1 (Atitude de Dono) ──────────────────────────────────
INSERT INTO public.perguntas (id, tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, content_hash)
VALUES (
  '11000001-0001-0001-0001-000000000009', 'sjt', 'vaga-generica', 'Atitude de Dono',
  'Você percebe um problema recorrente no fluxo da sua área que ninguém parece notar — está custando tempo/retrabalho toda semana.',
  'mc', 7,
  encode(extensions.digest('sjt:vaga-generica:VG1:v1.0', 'sha256'), 'hex')
);
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem) VALUES
  ('11000001-0001-0001-0001-000000000009', '11000001-0001-0001-0001-000000000a31', 'Analisa a causa, propõe uma solução concreta (com dados/exemplo) à gestão e se oferece para ajudar a implementar', 'fortemente_pontua', 4, 1),
  ('11000001-0001-0001-0001-000000000009', '11000001-0001-0001-0001-000000000a32', 'Documenta a ideia e apresenta formalmente aos responsáveis', 'pontua', 2, 2),
  ('11000001-0001-0001-0001-000000000009', '11000001-0001-0001-0001-000000000a33', 'Comenta informalmente com colegas para ver se é só impressão', 'neutro', 1, 3),
  ('11000001-0001-0001-0001-000000000009', '11000001-0001-0001-0001-000000000a34', 'Espera alguém de cima notar e resolver — não é meu papel', 'atencao', 0, 4);
