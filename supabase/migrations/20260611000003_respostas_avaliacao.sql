-- =============================================================================
-- Migration: respostas_avaliacao — autosave/progress table + etapa-gated RLS
-- Date: 2026-06-11
-- Phase: 11 (avaliacao-assincrona — infra + work-sample/SJT, Etapa 3)
-- Requirement: AVAL-09 (RF-18, RF-19) — autosave 30s + back-lock after etapa advance
-- =============================================================================
--
-- PURPOSE
-- The durable, RLS-gated half of the autosave pipeline (the volatile half is a
-- sessionStorage buffer in the candidate UI). The candidate's in-progress answers
-- are debounce-upserted here (30s) so a tab close / reload does not lose work.
--
-- THE BACK-LOCK (AVAL-09 — the only genuinely novel RLS in the phase): the
-- candidate may INSERT/UPDATE their own progress ONLY while their candidatura is
-- in etapa_atual='avaliacao_assincrona'. Once avancar_etapa() moves them past it,
-- every further write is denied by RLS. The etapa predicate lives in BOTH the
-- USING clause (gates the old row on UPDATE) AND the WITH CHECK clause (gates the
-- new row on INSERT/UPDATE) — a one-sided gate would let a stale row be updated.
--
-- Pitfall (RESEARCH Pitfall 3): a post-advance autosave fails RLS (42501). The
-- frontend MUST catch that and render the neutral "Sua etapa avançou…" state, not
-- an error toast. Nothing in THIS phase advances etapa on partial completion, so a
-- mid-assessment autosave always succeeds while in-etapa.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands).
-- Table-only DDL (no $$ bodies) → pushes clean.
-- =============================================================================

CREATE TABLE public.respostas_avaliacao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  teste           text NOT NULL,                          -- which test ('sjt' or a teste id from testes_aplicaveis)
  respostas       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id, teste)
);

COMMENT ON TABLE public.respostas_avaliacao IS
  'Phase 11 / AVAL-09: durable autosave/progress for the async assessment. Candidato own-row RLS + the back-lock (writes allowed ONLY while candidaturas.etapa_atual = avaliacao_assincrona, in BOTH USING and WITH CHECK). Service_role/EF persist scores elsewhere (scores_candidato).';

CREATE INDEX idx_respostas_aval_candidatura ON public.respostas_avaliacao (candidatura_id);

ALTER TABLE public.respostas_avaliacao ENABLE ROW LEVEL SECURITY;

-- Candidato reads OWN progress (ownership-join idiom — Phase 6) ------------------
DROP POLICY IF EXISTS cand_le_respostas_aval ON public.respostas_avaliacao;
CREATE POLICY cand_le_respostas_aval ON public.respostas_avaliacao
  FOR SELECT
  USING (
    candidatura_id IN (
      SELECT id FROM public.candidaturas
       WHERE candidato_id IN (
         SELECT id FROM public.candidatos WHERE user_id = (select auth.uid())
       )
    )
  );

-- Candidato writes OWN progress ONLY while in avaliacao_assincrona (THE BACK-LOCK).
-- The etapa predicate is in BOTH USING (UPDATE old-row) AND WITH CHECK (new-row).
DROP POLICY IF EXISTS cand_escreve_respostas_aval ON public.respostas_avaliacao;
CREATE POLICY cand_escreve_respostas_aval ON public.respostas_avaliacao
  FOR ALL
  USING (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
        JOIN public.candidatos ca ON ca.id = c.candidato_id
       WHERE ca.user_id = (select auth.uid())
         AND c.etapa_atual = 'avaliacao_assincrona'      -- ← BACK-LOCK
    )
  )
  WITH CHECK (
    candidatura_id IN (
      SELECT c.id FROM public.candidaturas c
        JOIN public.candidatos ca ON ca.id = c.candidato_id
       WHERE ca.user_id = (select auth.uid())
         AND c.etapa_atual = 'avaliacao_assincrona'      -- ← BACK-LOCK
    )
  );
