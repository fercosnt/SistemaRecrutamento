-- =============================================================================
-- Migration: perguntas_redacao (essay prompt bank) + 11-row seed + RLS
-- Date: 2026-06-23
-- Phase: 13 (redacao-cultural-revisao-humana — Etapa 3, redacao layer)
-- Requirement: AVAL-05 / AVAL-06 (RF-R-01..09 / RF-16) — essay prompt bank
-- =============================================================================
--
-- PURPOSE
-- The bank of culture-fit essay prompts that drives the candidate editor and the
-- avaliar-redacao-cultural Edge Function. Transcribed VERBATIM from PRD v1.1 §8.1
-- (CREATE TABLE perguntas_redacao, lines 254-274) + §8.2 (RLS, lines 451-454).
-- D-13: the binding PRD is the source of truth — this file is faithful transcription.
--
-- PROMPT TEXT IS NOT AN ANSWER KEY: unlike bigfive_itens / perguntas_opcao_sjt
-- (whose dimensao/peso/tag ARE the scoring key and must NEVER reach the candidate),
-- the essay prompt TEXT is what the candidate is asked to answer — it is candidate-
-- visible by design. So a SELECT-all policy is correct here (PRD §8.2 line 451),
-- UNLIKE the answer-key-protected tables. valor_primario / valor_secundario hint the
-- scoring focus but are not an answer key (the candidate cannot game a free-text essay
-- by knowing which value it targets) and the LLM never sees them as a gabarito.
--
-- LGPD-04: all 11 seed texts are neutral behavioral prompts about past lived
-- situations; none use the clinical-label product copy banned by RNF-11/RNF-12
-- (the forbidden clinical-evaluation term). Product language is always
-- "avaliacao comportamental/cognitiva". The forbidden-strings grep guard scans this dir.
--
-- ROLE-VALUE RECONCILIATION (load-bearing): the PRD §8.2 writes the write policy as
-- role = 'admin'. The LIVE M2 policies (scores_candidato.sql, bigfive_itens.sql) and
-- the custom_access_token_hook emit 'administrador' (NEVER the stale 'admin'). A
-- mismatched role string silently denies every write. We use the LIVE value
-- 'administrador' here so app_metadata.role matches the JWT the hook produces
-- ([[reference_auth_hook_rls_gap]]). We also use the live `#>>` projection idiom.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). The
-- Supabase CLI driver wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with DDL + adjacent policy statements breaks the
-- prepared-statement boundary parser and raises SQLSTATE 42601 at push time. This
-- file is table-only DDL + a multi-row INSERT (no $$ bodies) → pushes clean.
-- NOT applied here — application is the [BLOCKING] 13-04 apply wave (CONTEXT).
-- =============================================================================

-- Essay prompt bank (PRD §8.1 lines 254-274 — verbatim) -------------------------
CREATE TABLE public.perguntas_redacao (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text UNIQUE NOT NULL,            -- 'PADRAO_BS','D1','D2','D3','R1','R2','R3','C1','C2','C3','F1'
  texto            text NOT NULL CHECK (length(texto) >= 30),
  template_cargo   text CHECK (template_cargo IN ('dentista_padrao','recepcao_padrao','coord_admin_padrao','freela_simples') OR template_cargo IS NULL),
  valor_primario   text CHECK (valor_primario IN ('uau','inovacao','atitude_de_dono','sede_de_crescimento','etica','multi')),
  valor_secundario text CHECK (valor_secundario IN ('uau','inovacao','atitude_de_dono','sede_de_crescimento','etica','multi') OR valor_secundario IS NULL),
  is_padrao        boolean NOT NULL DEFAULT false,
  default_on       boolean NOT NULL DEFAULT false,  -- marcada como ON no template
  ativa            boolean NOT NULL DEFAULT true,
  versao           smallint NOT NULL DEFAULT 1,
  criada_em        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perguntas_redacao IS
  'Phase 13 / AVAL-05: banco de prompts de redacao cultural (PRD v1.1 §8.1). O TEXTO do prompt e candidate-visible (nao e answer key); valor_primario/secundario hint o foco de scoring mas nao gabaritam uma redacao livre. RLS: SELECT-all (authenticated); ALL (write) so administrador.';

-- Apenas UMA pergunta com is_padrao=true ativa (PRD §8.1 lines 268-270).
-- NOTE: index names redacao-prefixed — `idx_perguntas_cargo` collides with the
-- Phase-11 SJT `perguntas` table index (index names are schema-unique). Applied
-- to PROD with these renamed identifiers (13-04 apply wave).
CREATE UNIQUE INDEX idx_perguntas_redacao_padrao_unica
  ON public.perguntas_redacao (is_padrao) WHERE is_padrao = true AND ativa = true;

CREATE INDEX idx_perguntas_redacao_cargo
  ON public.perguntas_redacao (template_cargo) WHERE ativa = true;

-- RLS (PRD §8.2 lines 451-454) --------------------------------------------------
ALTER TABLE public.perguntas_redacao ENABLE ROW LEVEL SECURITY;

-- Candidate reads the prompt text (it is NOT an answer key) → SELECT-all is correct
-- (PRD §8.2 line 451). UNLIKE bigfive_itens, there is no scoring key to hide here.
DROP POLICY IF EXISTS perguntas_select_all ON public.perguntas_redacao;
CREATE POLICY perguntas_select_all ON public.perguntas_redacao
  FOR SELECT TO authenticated
  USING (true);

-- Only administrador manages the bank (PRD §8.2 lines 452-454, role reconciled to the
-- live 'administrador' value + live `#>>` projection — see header).
DROP POLICY IF EXISTS perguntas_admin_write ON public.perguntas_redacao;
CREATE POLICY perguntas_admin_write ON public.perguntas_redacao
  FOR ALL TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador')
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

-- =============================================================================
-- SEED — the 11 prompt rows from docs/conhecimento/fit-cultural/pergunta-padrao-redacao.md v1.1.
--
-- 11 rows per pergunta-padrao-redacao.md v1.1; PRD prose '13' overcounted freela
-- (F1 only). The PRD §8.1 line 276 ships NO seed INSERT — it is prose pointing to
-- pergunta-padrao-redacao.md as the authoritative seed source, which defines exactly
-- 11 codes (PADRAO_BS, D1, D2, D3, R1, R2, R3, C1, C2, C3, F1). The "13 rows" in the
-- PRD prose assumed 3 freela codes, but freela_simples ships only F1 (default OFF).
-- The seed file wins (the PRD references it, not the reverse). Seed count MUST be 11,
-- is_padrao=true MUST be exactly 1 (the apply-wave SMOKE check asserts both).
--
-- valor_primario/valor_secundario + default_on per the source's ON/OFF column.
-- PADRAO_BS: is_padrao=true, valor_primario='multi', template_cargo=NULL, universal.
-- =============================================================================
INSERT INTO public.perguntas_redacao
  (codigo, texto, template_cargo, valor_primario, valor_secundario, is_padrao, default_on, ativa)
VALUES
  -- Q1 — pergunta padrao Beauty Smile (obrigatoria em toda vaga; universal).
  ('PADRAO_BS',
   'Descreva uma situação real em que você precisou cuidar de uma pessoa (cliente, paciente, colega ou liderado) em momento de fragilidade, dúvida ou insatisfação. Conte: o contexto; o que VOCÊ decidiu fazer (e por quê); o que aprendeu com a experiência.',
   NULL, 'multi', NULL, true, true, true),

  -- Template dentista_padrao (D1+D2 default ON; D3 OFF).
  ('D1',
   'Conte uma situação em que você defendeu uma abordagem clínica/técnica não-óbvia (baseada em evidência ou raciocínio próprio) contra o costume da equipe ou de um colega mais sênior. Como conduziu a discussão e o que ficou ao final?',
   'dentista_padrao', 'inovacao', 'atitude_de_dono', false, true, true),
  ('D2',
   'Qual foi o último curso, livro, congresso ou estudo que você buscou POR INICIATIVA PRÓPRIA (não exigido pela clínica/empresa empregadora) nos últimos 12 meses? O que aprendeu e como aplicou na prática?',
   'dentista_padrao', 'sede_de_crescimento', 'inovacao', false, true, true),
  ('D3',
   'Descreva uma situação em que você se viu em conflito entre pressão de meta/comissão e o que era melhor para o paciente. O que pesou, o que decidiu e como o paciente reagiu?',
   'dentista_padrao', 'etica', 'atitude_de_dono', false, false, true),

  -- Template recepcao_padrao (R1 default ON; R2/R3 OFF).
  ('R1',
   'Conte uma situação em que você viu um problema que ninguém tinha apontado ainda — pode ser pequeno, do dia a dia — e decidiu resolver por conta própria. O que era, o que fez e o que aconteceu depois?',
   'recepcao_padrao', 'atitude_de_dono', 'uau', false, true, true),
  ('R2',
   'Descreva uma situação em que você fez algo extra por um cliente/paciente SEM que ele tivesse pedido — você antecipou alguma coisa. O que percebeu, o que fez, qual foi a reação dele?',
   'recepcao_padrao', 'uau', 'atitude_de_dono', false, false, true),
  ('R3',
   'Conte uma situação em que você recebeu uma crítica direta (de chefia, colega ou cliente) e o que mudou na sua forma de trabalhar depois disso. Seja específico no "antes" e no "depois".',
   'recepcao_padrao', 'sede_de_crescimento', NULL, false, false, true),

  -- Template coord_admin_padrao (C1+C2 default ON; C3 OFF).
  ('C1',
   'Descreva uma melhoria de processo (operacional, de equipe, de comunicação ou de cliente) que você PROPÔS E IMPLEMENTOU no último ano. Como identificou o problema, o que tentou, como mediu o resultado e o que faria diferente?',
   'coord_admin_padrao', 'inovacao', 'atitude_de_dono', false, true, true),
  ('C2',
   'Conte uma situação em que precisou dar um feedback duro/desconfortável a alguém (subordinado, par ou superior). Como conduziu a conversa e o que aprendeu sobre você nesse processo?',
   'coord_admin_padrao', 'sede_de_crescimento', 'uau', false, true, true),
  ('C3',
   'Descreva uma decisão difícil que tomou com informação incompleta ou sob pressão de tempo — entre velocidade vs. qualidade, meta vs. cuidado com pessoa, ou autonomia vs. consultar. Como decidiu, o que daria certo e o que daria errado?',
   'coord_admin_padrao', 'atitude_de_dono', 'inovacao', false, false, true),

  -- Template freela_simples (F1 only, default OFF).
  ('F1',
   'Em poucas palavras: o que te atrai na proposta de odontologia "sem dor, sem trauma, com tecnologia laser" da Beauty Smile? O que essa tese significa para você, e por que faz sentido (ou não) com o que você acredita?',
   'freela_simples', 'multi', NULL, false, false, true);
