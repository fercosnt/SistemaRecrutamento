-- =============================================================================
-- Migration: entrevista/cognitivo tables — interview guides + transcript
--            analyses + cognitive items/responses + RLS
-- Date: 2026-06-24
-- Phase: 14 (entrevistas-com-ia-companion-etapas-4-5)
-- Requirement: ENTREV-01/02/03/04/05 (RF-24, RF-26a/c) — interview + cognitive infra
-- =============================================================================
--
-- PURPOSE
-- The Phase-14 schema layer: four NEW M2 tables for the interview/cognitive flow,
-- plus two `vagas` columns (the opt-in cognitive gate + the manual interview
-- datetime). These are NEW M2 tables — the legacy M1 `entrevistas_online`/
-- `entrevistas_presenciais`/`scores_raven` tables (untracked, unaudited-RLS,
-- Bookings/video-shaped) are deliberately NOT reused (14-RESEARCH §Runtime State).
--
--   * entrevista_guias     — the STAR/PEI guide (online|presencial) the EF persists.
--   * entrevista_analises  — the transcript BARS analysis row; carries the
--     server-derived language/accent `bloqueio_avanco` flag + the human-confirmed
--     `revisao_confirmada_em` (read by the avancar_etapa guard, migration 04).
--   * cognitivo_itens      — the CC0 reasoning item bank. `gabarito_idx` is a REGULAR
--     column protected by READ-layer column-omission (the 14-06 candidate read
--     allowlists id/secao/enunciado/alternativas/ordem only); pontuar_cognitivo
--     (SECURITY DEFINER, migration 03) bypasses RLS to read it. There is NO separate
--     gabarito table.
--   * cognitivo_respostas  — the candidate's raw picks (NO score — server re-scores).
--
-- INVARIANT (RNF-07a): no scoring path writes candidaturas. The interview BARS
-- scores land in scores_candidato (tipo='entrevista', migration 03 / EF) + the
-- analysis row here; the language/accent flag SEGURA the advance (held by the
-- avancar_etapa guard), the human confirms. The cognitive band is CONTEXTUAL.
--
-- SECURITY (T-14-03-05 / [[reference_select_star_leaks_pii]]): candidate-DENY RLS
-- on entrevista_guias + entrevista_analises (RH/admin SELECT only — RLS is row-level,
-- cannot hide columns, so the defense is denying the row entirely). cognitivo_itens
-- is readable by authenticated for the prova, but gabarito_idx is NEVER in the
-- candidate projection (14-06 allowlist). cognitivo_respostas is the candidate-
-- writable table → etapa-gated USING + WITH CHECK back-lock (clone respostas_avaliacao).
-- Writes to guias/analises happen ONLY via service_role EF / SECURITY DEFINER RPC —
-- deliberately NO INSERT/UPDATE policy.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- file is table-only DDL (no $$ bodies) → pushes clean. Applied LIVE in the
-- [BLOCKING] 14-04 wave via Supabase MCP apply_migration — NOT applied here.
-- =============================================================================

-- (0) vagas columns — opt-in cognitive gate + manual interview datetime ---------
--     aplica_cognitivo: ENTREV-05 opt-in (default OFF — no candidate reaches the
--       cognitive prova until a vaga turns it on). entrevista_agendada_em: the
--       RH-set datetime backing the in-app 24h marker (ENTREV-02, manual V1 — no
--       email/calendar pipeline this phase).
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS aplica_cognitivo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entrevista_agendada_em timestamptz;

COMMENT ON COLUMN public.vagas.aplica_cognitivo IS
  'Phase 14 / ENTREV-05: opt-in da prova cognitiva (default false). Quando false o candidato NUNCA alcanca a prova de raciocinio.';
COMMENT ON COLUMN public.vagas.entrevista_agendada_em IS
  'Phase 14 / ENTREV-02: datetime manual da entrevista (V1 — sem pipeline de email/calendar). Backing do marcador 24h in-app.';

-- (1) entrevista_guias — the STAR/PEI guide (ENTREV-01/04) ----------------------
CREATE TABLE public.entrevista_guias (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  tipo            text NOT NULL CHECK (tipo IN ('online', 'presencial')),
  guia            jsonb NOT NULL,                          -- the InterviewGuideSchema output
  prompt_version  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.entrevista_guias IS
  'Phase 14 / ENTREV-01/04: roteiro STAR/PEI (online|presencial) gerado pela EF gerar-guia-entrevista. Candidate-DENY RLS (RH/admin only). Escrito so via service_role EF.';

CREATE INDEX idx_entrevista_guias_candidatura ON public.entrevista_guias (candidatura_id);

-- (2) entrevista_analises — transcript BARS analysis + the flag state (ENTREV-03)
--     bloqueio_avanco: the server-DERIVED language/accent flag (NOT the LLM).
--     revisao_confirmada_em / revisada_por: set when the human confirms review —
--     the avancar_etapa guard (migration 04) reads these to release the hold.
CREATE TABLE public.entrevista_analises (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id         uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  competencias           jsonb,                            -- per-competency BARS scores
  citacoes               jsonb,                            -- cited_evidence per competency
  bias_flags             jsonb,                            -- per-competency bias_flags
  bloqueio_avanco        boolean NOT NULL DEFAULT false,   -- DERIVED lang/accent flag (SEGURA o avanco)
  revisao_confirmada_em  timestamptz,                      -- set when human confirms (releases the guard)
  revisada_por           uuid,                             -- the RH who confirmed
  notas_humanas          text,                             -- human override notes (salvar_avaliacao_entrevista)
  scores_humanos         jsonb,                            -- human override BARS (salvar_avaliacao_entrevista)
  status_analise         text NOT NULL DEFAULT 'pendente_humano',
  prompt_version         text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.entrevista_analises IS
  'Phase 14 / ENTREV-03: analise BARS da transcricao + flag de lingua/sotaque (bloqueio_avanco, server-DERIVED). status_analise pendente_humano SEMPRE; bloqueio_avanco SEGURA o avanco ate revisao_confirmada_em (lido pelo guard avancar_etapa). Candidate-DENY RLS. NUNCA escreve candidaturas (RNF-07a).';

CREATE INDEX idx_entrevista_analises_candidatura ON public.entrevista_analises (candidatura_id);

-- (3) cognitivo_itens — the CC0 reasoning item bank (ENTREV-05) ------------------
--     gabarito_idx is a REGULAR column protected by READ-layer column-omission:
--     the candidate read (14-06) allowlists id/secao/enunciado/alternativas/ordem;
--     pontuar_cognitivo (DEFINER) bypasses RLS to read gabarito_idx server-side.
--     There is NO separate gabarito table.
CREATE TABLE public.cognitivo_itens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao         text NOT NULL CHECK (secao IN ('matriz', 'letra_numero')),
  enunciado     text NOT NULL,
  alternativas  jsonb NOT NULL,                            -- discrete options (text[])
  ordem         int NOT NULL DEFAULT 0,
  gabarito_idx  int NOT NULL,                              -- SERVER-ONLY (never in candidate projection)
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cognitivo_itens IS
  'Phase 14 / ENTREV-05: banco de itens CC0 de raciocinio (matriz | letra_numero). gabarito_idx e SERVER-ONLY — a leitura do candidato (14-06) projeta apenas id/secao/enunciado/alternativas/ordem; pontuar_cognitivo (DEFINER) bypassa RLS para ler o gabarito. NAO existe tabela de gabarito separada.';

CREATE INDEX idx_cognitivo_itens_secao ON public.cognitivo_itens (secao, ordem);

-- (4) cognitivo_respostas — the candidate's raw picks (ENTREV-05) ----------------
--     NO score column — the server re-scores server-side (pontuar_cognitivo).
CREATE TABLE public.cognitivo_respostas (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id           uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  raw_responses            jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { itemId -> optionIndex }
  shuffle_seed             text,
  completion_time_seconds  int,
  proctoring               jsonb NOT NULL DEFAULT '{}'::jsonb,   -- tab-blur/paste-block context (NEVER auto-rejects)
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id)
);

COMMENT ON TABLE public.cognitivo_respostas IS
  'Phase 14 / ENTREV-05: escolhas brutas do candidato (sem score — o servidor re-pontua via pontuar_cognitivo). proctoring leve (tab-blur/paste) e contexto, NUNCA auto-rejeita. Back-lock etapa-gated (clone respostas_avaliacao).';

CREATE INDEX idx_cognitivo_respostas_candidatura ON public.cognitivo_respostas (candidatura_id);

-- =============================================================================
-- RLS
-- =============================================================================

-- entrevista_guias: candidate-DENY / RH-admin SELECT only -----------------------
ALTER TABLE public.entrevista_guias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rh_le_entrevista_guias ON public.entrevista_guias;
CREATE POLICY rh_le_entrevista_guias ON public.entrevista_guias
  FOR SELECT
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- (no INSERT/UPDATE policy → only service_role EF writes)

-- entrevista_analises: candidate-DENY / RH-admin SELECT only --------------------
ALTER TABLE public.entrevista_analises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rh_le_entrevista_analises ON public.entrevista_analises;
CREATE POLICY rh_le_entrevista_analises ON public.entrevista_analises
  FOR SELECT
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));
-- (no INSERT/UPDATE policy → only service_role EF / SECURITY DEFINER RPC writes)

-- cognitivo_itens: authenticated may READ the prova (but the candidate projection
-- NEVER includes gabarito_idx — that allowlist lives in the 14-06 service). The
-- gabarito is read server-side only by pontuar_cognitivo (DEFINER bypasses RLS).
ALTER TABLE public.cognitivo_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_le_cognitivo_itens ON public.cognitivo_itens;
CREATE POLICY auth_le_cognitivo_itens ON public.cognitivo_itens
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');
-- (no INSERT/UPDATE policy → only service_role / migration seed writes)

-- cognitivo_respostas: candidato own-row + the etapa-gated back-lock -------------
-- (clone respostas_avaliacao — the candidate writes ONLY while their candidatura is
--  in an interview etapa; once avancar_etapa moves them past it, RLS denies further
--  writes; the predicate is in BOTH USING and WITH CHECK).
ALTER TABLE public.cognitivo_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cand_le_cognitivo_respostas ON public.cognitivo_respostas;
CREATE POLICY cand_le_cognitivo_respostas ON public.cognitivo_respostas
  FOR SELECT
  USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );

-- The back-lock: candidato writes OWN progress ONLY while in an interview etapa.
-- The etapa predicate is in BOTH USING (UPDATE old-row) AND WITH CHECK (new-row).
DROP POLICY IF EXISTS cand_escreve_cognitivo_respostas ON public.cognitivo_respostas;
CREATE POLICY cand_escreve_cognitivo_respostas ON public.cognitivo_respostas
  FOR ALL
  USING (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
        JOIN public.candidatos ca ON ca.id = c.candidato_id
       WHERE ca.user_id = (select auth.uid())
         AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial')   -- ← BACK-LOCK
    )
  )
  WITH CHECK (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
        JOIN public.candidatos ca ON ca.id = c.candidato_id
       WHERE ca.user_id = (select auth.uid())
         AND c.etapa_atual IN ('entrevista_online', 'entrevista_presencial')   -- ← BACK-LOCK
    )
  );
