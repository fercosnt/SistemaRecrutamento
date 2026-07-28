-- =============================================================================
-- Migration: historico_candidatura (append-only transition audit trail)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-03 (D-09)
-- =============================================================================
--
-- PURPOSE
-- Append-only audit table that records every candidatura etapa transition (FUNIL-03). The
-- 06-04 avancar_etapa() BEFORE UPDATE trigger writes one row here per transition, inside the
-- SAME transaction as the candidaturas UPDATE, capturing etapa_de/etapa_para, the criterio
-- text, the actor (auth.uid() — NULL for service_role/system writes, D-09) and auto_rejeitado.
--
-- COEXISTENCE WITH LEGACY historico_acoes (Pitfall 5 — do NOT conflate):
-- A legacy `public.historico_acoes` table already exists (Figma-Make era) with
-- (candidatura_id, tipo_acao enum, usuario_id FK usuarios_rh.id, descricao, metadata). This
-- new table is DELIBERATELY different and is NOT a reuse of it: it carries explicit
-- etapa_de/etapa_para enum columns, auto_rejeitado boolean, and `ator` FK to **auth.users**
-- (NOT usuarios_rh). Leave historico_acoes untouched (out of scope).
--
-- APPLY ORDER (manual, single SQL-Editor session — D-22 workaround):
-- This table references public.etapa_processo, which becomes the v2 enum ONLY AFTER the
-- 20260607000002 cutover RENAMEs etapa_processo_v2 -> etapa_processo. Therefore apply the
-- cutover (20260607000002) FIRST, then this file, in the SAME SQL-Editor session.
-- (File timestamp is 000001 only so it reconciles cleanly via `migration repair`.)
--
-- RLS is ENABLED here but NO policies are added — the FUNIL-04 policies land in 06-05
-- (20260607000006). The trigger that writes this table runs SECURITY INVOKER inside the
-- authorized candidaturas UPDATE transaction, so no INSERT policy is needed.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (CLI wraps each migration in its own
-- implicit transaction — CLAUDE.md D-22). This file is pure DDL (no $$ blocks) but is applied
-- in the same SQL-Editor session as the cutover, so it follows the same no-wrapper convention.
-- After manual apply: `supabase migration repair --status applied 20260607000001`.
-- =============================================================================

CREATE TABLE public.historico_candidatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id),
  etapa_de public.etapa_processo,                  -- NULL-able: first transition / orphan-collapse log
  etapa_para public.etapa_processo NOT NULL,
  criterio_texto text,                             -- copied from candidaturas.etapa_justificativa
  ator uuid REFERENCES auth.users(id),             -- NULL-able (D-09): auth.uid() for humans, NULL for system/service_role
  auto_rejeitado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Audit-query performance (RESEARCH discretion)
CREATE INDEX historico_candidatura_candidatura_criado_idx
  ON public.historico_candidatura (candidatura_id, criado_em);

-- RLS enabled; policies deferred to 06-05 (20260607000006)
ALTER TABLE public.historico_candidatura ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.historico_candidatura IS
  'Phase 6 / FUNIL-03: append-only audit of every candidatura etapa transition, written by '
  'the avancar_etapa() trigger (06-04) in the same txn as the candidaturas UPDATE. Coexists '
  'with — and is NOT — the legacy historico_acoes table (which FKs usuarios_rh.id, Figma-Make '
  'era). This table FKs auth.users(id) and carries etapa_de/etapa_para + auto_rejeitado (D-09). '
  'ator IS NULL marks a system/service_role action; a human action carries auth.uid().';
