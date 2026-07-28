-- =============================================================================
-- Migration: scores_candidato — generic per-candidatura score sink + enums + RLS
-- Date: 2026-06-11
-- Phase: 11 (avaliacao-assincrona — infra + work-sample/SJT, Etapa 3)
-- Requirement: AVAL-02 / AVAL-03 (RF-13, RF-14) — deterministic + AI score sink
-- =============================================================================
--
-- PURPOSE
-- A SINGLE generic table keyed by candidatura_id + tipo enum, reused by every
-- downstream assessment phase (P12 big_five, P13 redacao, P14 entrevista/cognitivo,
-- P15 decisao). Designed generic ONCE so P12-15 need no `ALTER TYPE ... ADD VALUE`
-- migration each (Postgres can't add enum values inside a txn easily, and can't
-- drop them) — the tipo_score enum forward-declares all of them up front (A1).
--
-- INVARIANT (RNF-07a): this table's `status` is the ONLY scoring output. Scoring
-- NEVER touches candidaturas.etapa_atual — no auto-advance, no auto-reject. A
-- below-threshold / red-flag / atencao result writes status='pendente_humano'.
--
-- SECURITY (T-11-02-03 / [[reference_select_star_leaks_pii]]): the candidato has
-- NO read policy of ANY kind → score/citacoes/red_flags can never leak to the
-- person being scored (RLS is row-level only; it cannot hide columns, so the
-- defense is denying the row entirely). Only RH/admin may SELECT (role-gated);
-- the app layer reads via an explicit allowlist, never select('*'). Writes happen
-- ONLY via the SECURITY DEFINER RPC (pontuar_sjt) / service_role EF (avaliar-redacao)
-- — there is deliberately NO INSERT/UPDATE policy.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22). The Supabase CLI driver
-- already wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with DDL + adjacent GRANT/policy statements breaks the
-- prepared-statement boundary parser and raises SQLSTATE 42601 at push time
-- (CLAUDE.md §Commands). This file is table-only DDL (no $$ bodies) → pushes clean.
-- =============================================================================

-- Forward-declared score-type enum (A1 — P12-15 add NO new enum values) ---------
CREATE TYPE public.tipo_score AS ENUM (
  'sjt',          -- Phase 11 (this phase): both MC (subtipo='mc') and open-case (subtipo='caso_aberto')
  'big_five',     -- Phase 12 (AVAL-04)
  'redacao',      -- Phase 13 (AVAL-05/06)
  'entrevista',   -- Phase 14 (ENTREV-03)
  'cognitivo',    -- Phase 14 (ENTREV-05, contextual)
  'decisao'       -- Phase 15 (DECISAO-01)
);

-- Score outcome status — informational only; NEVER drives etapa (RNF-07a) --------
CREATE TYPE public.status_score AS ENUM (
  'sucesso',           -- score computed, above threshold (informational; never auto-advance)
  'pendente_humano',   -- below threshold OR red_flag/atencao → requires human review
  'falhou'             -- scoring errored (never-absent invariant, like analise)
);

-- Generic score sink ------------------------------------------------------------
CREATE TABLE public.scores_candidato (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  tipo            public.tipo_score NOT NULL,
  subtipo         text,                                  -- 'mc' | 'caso_aberto' for SJT; nullable
  pergunta_id     uuid,                                  -- set for per-item open-case scores; nullable
  score           numeric,                               -- Σ pesos (MC) | composite 0-25 (case)
  score_max       numeric,                               -- denominator (e.g. 12 for a 3-item MC battery; 25 for a case)
  status          public.status_score NOT NULL DEFAULT 'sucesso',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,     -- per-item / per-dimension breakdown
  citacoes        jsonb,                                 -- AI types only (open-case): Citation[]
  red_flags       jsonb,                                 -- AI types only: string[]
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- Idempotent upsert key. NULLS NOT DISTINCT (PG15+, Supabase is PG15 — A2) so the
  -- MC row (subtipo='mc', pergunta_id=NULL) is exactly one per candidatura+tipo:
  -- without it, NULL != NULL would let pontuar_sjt insert a duplicate MC row on
  -- re-submit instead of updating (RESEARCH Pitfall 7).
  UNIQUE NULLS NOT DISTINCT (candidatura_id, tipo, subtipo, pergunta_id)
);

COMMENT ON TABLE public.scores_candidato IS
  'Phase 11 / AVAL-02/03: generic per-candidatura score sink reused by P11-15 (tipo_score forward-declares sjt/big_five/redacao/entrevista/cognitivo/decisao). status (sucesso/pendente_humano/falhou) is the ONLY scoring output — scoring NEVER changes candidaturas.etapa_atual (RNF-07a). Candidato has NO read policy (denied entirely); RH/admin read via allowlist, never select(*) ([[reference_select_star_leaks_pii]]).';

CREATE INDEX idx_scores_candidatura ON public.scores_candidato (candidatura_id);
CREATE INDEX idx_scores_pendente ON public.scores_candidato (candidatura_id)
  WHERE status = 'pendente_humano';

-- RLS: candidato DENY / RH-admin SELECT only ------------------------------------
ALTER TABLE public.scores_candidato ENABLE ROW LEVEL SECURITY;

-- ONLY RH/admin may read. NO candidato/anon policy → candidato denied entirely
-- (live-verified idiom — uses 'administrador', NEVER the stale 'admin').
DROP POLICY IF EXISTS rh_le_scores ON public.scores_candidato;
CREATE POLICY rh_le_scores ON public.scores_candidato
  FOR SELECT
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- (no INSERT/UPDATE policy → only SECURITY DEFINER RPC / service_role EF writes)
