-- =============================================================================
-- Migration: avancar_etapa() flag-block guard (language/accent review gate)
-- Date: 2026-06-24
-- Phase: 14 (entrevistas-com-ia-companion-etapas-4-5)
-- Requirement: ENTREV-03 (RF-24) — block advance until human confirms the lang/accent flag
-- =============================================================================
--
-- PURPOSE
-- CREATE OR REPLACE the BEFORE-UPDATE trigger function avancar_etapa() (Phase 6,
-- 20260607000005) keeping ALL existing transition + audit logic VERBATIM, and ADD a
-- single guard: when a candidatura advances PAST entrevista_online and it has an
-- entrevista_analises row with the language/accent flag firing (bloqueio_avanco=true)
-- that the human has NOT yet confirmed (revisao_confirmada_em IS NULL), RAISE — the
-- advance is HELD until the gestor confirms review.
--
-- WHY HERE (resolved Q2): the block is a funil-state invariant, so it must live in the
-- unbypassable transition validator (avancar_etapa), NOT only in the UI (UI-only
-- blocking is bypassable). The human-confirmed state lives on entrevista_analises
-- .revisao_confirmada_em — set by salvar_avaliacao_entrevista (migration 02). The flag
-- SEGURA the advance (RNF-07a — it holds, it does not decide); the human always confirms.
--
-- This is a CREATE OR REPLACE of the existing function body — the existing trigger
-- binding (candidaturas_avancar_etapa_trg) is preserved; no re-attach needed (the DO
-- block below is the idempotent guard, harmless if the trigger already exists).
--
-- SECURITY DEFINER + SET search_path='' preserved (Phase-6 proof: auth.uid() is
-- GUC-based, survives DEFINER → actor capture D-09 holds).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This
-- uses CREATE FUNCTION + DO $$ + COMMENT (PL/pgSQL bodies) → apply via Supabase MCP
-- apply_migration in the [BLOCKING] 14-04 wave — NOT applied here.
-- =============================================================================

-- (1) Transition-validation + audit-writing function + the Phase-14 flag guard ----
CREATE OR REPLACE FUNCTION public.avancar_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ator    uuid := auth.uid();   -- NULL for service_role/system writes (D-09); GUC-based, survives DEFINER
  v_blocked boolean;
BEGIN
  -- No etapa change: nothing to validate or audit
  IF NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
    RETURN NEW;
  END IF;

  -- Transition validation (D-06)
  IF NEW.etapa_atual IN ('aprovado', 'rejeitado') THEN
    -- terminal: always allowed from any stage
    NULL;
  ELSIF NEW.etapa_atual < OLD.etapa_atual THEN
    -- regression: require a non-empty justificativa (success criterion #2)
    IF NEW.etapa_justificativa IS NULL OR btrim(NEW.etapa_justificativa) = '' THEN
      RAISE EXCEPTION 'Regressão de etapa exige justificativa preenchida';
    END IF;
  END IF;
  -- forward / skip-ahead (NEW > OLD, non-terminal): allowed freely (D-06)

  -- Phase-14 flag guard (ENTREV-03 / RF-24): a FORWARD advance PAST entrevista_online
  -- is HELD while an entrevista_analises row has the language/accent flag firing
  -- (bloqueio_avanco=true) that the human has not yet confirmed
  -- (revisao_confirmada_em IS NULL). Only fires on a forward, non-regression advance
  -- (NEW > OLD past entrevista_online); regressions / terminals are unaffected. The
  -- gestor releases the hold via salvar_avaliacao_entrevista (sets revisao_confirmada_em).
  IF NEW.etapa_atual > OLD.etapa_atual
     AND NEW.etapa_atual > 'entrevista_online'
     AND NEW.etapa_atual NOT IN ('aprovado', 'rejeitado') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.entrevista_analises ea
       WHERE ea.candidatura_id = NEW.id
         AND ea.bloqueio_avanco = true
         AND ea.revisao_confirmada_em IS NULL
    ) INTO v_blocked;
    IF v_blocked THEN
      RAISE EXCEPTION 'bloqueio: revise a bandeira de linguagem/sotaque antes de avancar'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Audit write (FUNIL-03, D-09): one row per transition, same transaction
  INSERT INTO public.historico_candidatura
    (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
  VALUES
    (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
     v_ator, (v_ator IS NULL), now());

  RETURN NEW;
END;
$$;

-- (2) Bind the trigger (idempotent: create only if absent) — preserves the existing
--     candidaturas_avancar_etapa_trg; harmless re-attach guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'candidaturas_avancar_etapa_trg'
      AND tgrelid = 'public.candidaturas'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER candidaturas_avancar_etapa_trg
             BEFORE UPDATE OF etapa_atual ON public.candidaturas
             FOR EACH ROW
             EXECUTE FUNCTION public.avancar_etapa()';
  END IF;
END $$;

COMMENT ON FUNCTION public.avancar_etapa() IS
  'Phase 6 + Phase 14 / FUNIL-02/03 + ENTREV-03: BEFORE UPDATE OF etapa_atual on candidaturas. '
  'Forward/skip free; terminals allowed from any stage; regression blocked unless etapa_justificativa '
  'is non-empty. Phase-14 guard: a forward advance PAST entrevista_online is HELD (RAISE check_violation) '
  'while an entrevista_analises row has bloqueio_avanco=true AND revisao_confirmada_em IS NULL (RF-24, '
  'anti-regional-bias). Writes one historico_candidatura row per transition (ator = auth.uid(), NULL for '
  'system). SECURITY DEFINER + search_path='''' (auth.uid() GUC-based, actor capture D-09 holds).';

-- (3) Harden the SECURITY DEFINER fn (Shared Pattern C) — unchanged from Phase 6.
REVOKE ALL ON FUNCTION public.avancar_etapa() FROM PUBLIC;
