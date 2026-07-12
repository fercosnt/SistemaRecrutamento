-- =============================================================================
-- Migration: avancar_etapa() — GUC-gated auto_rejeitado predicate (DBMIG-02 code fix)
-- Date: 2026-07-12
-- Phase: 27 (integridade-de-migrations-fechamento-da-rede-de-testes)
-- Requirement: DBMIG-02 (A28) — honest audit semantics for historico_candidatura.auto_rejeitado
-- SUPERSEDES the function body shipped in 20260624000004_avancar_etapa_flag_guard.sql
--   (the CURRENT live body — Phase 6 base + Phase-14 flag guard), reproduced verbatim
--   EXCEPT the `auto_rejeitado` value written into the historico_candidatura audit INSERT.
--
-- ⚠ CORRECTNESS NOTE (Phase-27 pre-apply catch, 2026-07-12): an earlier draft of this file
-- was derived from 20260607000005 (the Phase-6 body) and therefore DROPPED the Phase-14
-- flag guard (ENTREV-03/RF-24: hold a forward advance PAST entrevista_online while an
-- entrevista_analises row has bloqueio_avanco=true AND revisao_confirmada_em IS NULL).
-- Applying that draft would have regressed a live bias-review control. This file reproduces
-- the CURRENT live definition (verified against PROD via pg_get_functiondef) — including the
-- `v_blocked` declaration and the full Phase-14 guard block — and changes ONLY auto_rejeitado.
-- =============================================================================
--
-- PURPOSE
-- CREATE OR REPLACE public.avancar_etapa() reproducing the CURRENT live body byte-for-behavior
-- (Phase 6 transition/audit logic + Phase-14 ENTREV-03 flag guard), changing ONLY the
-- `auto_rejeitado` value written into the historico_candidatura audit row.
--
-- DEFECT (live body / 20260624000004:88, inherited from 20260607000005): the audit INSERT wrote
-- `auto_rejeitado = (v_ator IS NULL)`, which marks EVERY system write (ator NULL) as an
-- auto-rejection — including the survivor advance (inscricao → triagem written by
-- submit_candidatura_atomic under service_role, where auth.uid() is NULL). That makes the audit
-- trail lie: a survivor being encaminhado for triagem is recorded as `auto_rejeitado=true` even
-- though status stays 'aguardando_resposta' and no rejection happened.
--
-- FIX (RESEARCH §2b — reuse `ator IS NULL` + the txn-local GUC, ZERO new column): a row is an
-- auto-rejection ONLY when all three hold together —
--   (a) v_ator IS NULL                                            → a system/automatic write, AND
--   (b) app.rejeicao_sancionada = 'on'                            → a SANCTIONED auto-reject, AND
--   (c) NEW.etapa_atual = 'rejeitado'                             → landing on the terminal reject.
-- The GUC `app.rejeicao_sancionada` is the same txn-local flag the knockout path already sets
-- via `PERFORM set_config('app.rejeicao_sancionada', 'on', true)` (20260709000014:136, is_local →
-- SET LOCAL, pooler-safe). `current_setting(..., true)` uses missing_ok=true so an ordinary
-- (unsanctioned) transition reads NULL → the predicate is false → auto_rejeitado=false.
--
-- RNF-07a (zero auto-rejection by score): this predicate creates NO new auto-reject PATH. The
-- knockout in submit_candidatura_atomic remains the ONLY sanctioned auto-reject; the
-- guard_rejeicao_auditada backstop (Phase 25) and the Phase-14 flag guard (ENTREV-03) are
-- untouched. This migration only relabels how the audit column is written; it never rejects
-- anyone. The knockout path's OWN explicit history row (`auto_rejeitado=true, ator NULL` at
-- 20260709000014:146-150) is left intact — it does NOT flow through this trigger (etapa unchanged
-- → the `IS NOT DISTINCT FROM` guard below skips) and its literal is already a genuine sanctioned
-- auto-reject.
--
-- SECURITY DEFINER + SET search_path = '' preserved verbatim (see 20260607000005 header for the
-- full Pitfall-4/D-09 rationale: auth.uid() is GUC-based so actor capture survives the definer
-- role). The trigger binding (candidaturas_avancar_etapa_trg) already exists in PROD and
-- references this function by name, so CREATE OR REPLACE updates the body in place — no re-bind.
--
-- NOTE: No outer `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This file is APPLIED
-- via Supabase MCP apply_migration in the [BLOCKING] wave 27-05 — version-row reconcile is part
-- of the DBMIG-01 ledger close in that same wave.
-- =============================================================================

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

  -- Phase-14 flag guard (ENTREV-03 / RF-24) — PRESERVED verbatim from 20260624000004: a FORWARD
  -- advance PAST entrevista_online is HELD while an entrevista_analises row has the language/accent
  -- flag firing (bloqueio_avanco=true) that the human has NOT yet confirmed
  -- (revisao_confirmada_em IS NULL). The gestor releases the hold via salvar_avaliacao_entrevista.
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

  -- Audit write (FUNIL-03, D-09): one row per transition, same transaction.
  -- DBMIG-02: auto_rejeitado is TRUE only for a system write (v_ator IS NULL) that is ALSO a
  -- sanctioned auto-reject (GUC app.rejeicao_sancionada='on') landing on the terminal 'rejeitado'
  -- etapa. A survivor advance (system write, unsanctioned, non-terminal) writes FALSE.
  INSERT INTO public.historico_candidatura
    (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
  VALUES
    (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
     v_ator,
     (v_ator IS NULL AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on'
      AND NEW.etapa_atual = 'rejeitado'),
     now());

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.avancar_etapa() IS
  'Phase 6 + Phase 14 + Phase 27 / FUNIL-02 + FUNIL-03 + ENTREV-03 + DBMIG-02: BEFORE UPDATE OF '
  'etapa_atual on candidaturas. Forward/skip free; terminals (aprovado/rejeitado) allowed from any '
  'stage; regression (NEW < OLD by enum ordinal) blocked unless etapa_justificativa is non-empty. '
  'Phase-14 guard: a forward advance PAST entrevista_online is HELD (RAISE check_violation) while an '
  'entrevista_analises row has bloqueio_avanco=true AND revisao_confirmada_em IS NULL (RF-24, '
  'anti-regional-bias). Writes one historico_candidatura row per transition (ator = auth.uid(), NULL '
  'for system). DBMIG-02: auto_rejeitado = (ator IS NULL AND app.rejeicao_sancionada=''on'' AND '
  'NEW.etapa_atual=''rejeitado'') — system write AND sanctioned AND terminal only; a survivor advance '
  'writes false (no new auto-reject path, RNF-07a). SECURITY DEFINER + SET search_path = '''' so the '
  'INSERT into RLS-protected historico_candidatura succeeds for every caller; auth.uid() is GUC-based '
  'so actor capture (D-09) is preserved.';

-- Harden the SECURITY DEFINER fn (Shared Pattern C): revoking PUBLIC EXECUTE does NOT break the
-- trigger (trigger functions fire regardless of EXECUTE grants) — it only stops direct
-- /rest/v1/rpc invocation and clears the security_definer_function_executable advisor WARN.
REVOKE ALL ON FUNCTION public.avancar_etapa() FROM PUBLIC;
