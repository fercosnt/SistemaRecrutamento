-- =============================================================================
-- Migration: guard_rejeicao_auditada — BEFORE UPDATE OF status guard on candidaturas
-- Date: 2026-07-09
-- Phase: 25 (corre-o-do-funil-lado-rh-enums-colunas-contratos)
-- Requirement: FUNIL-02 (A9) — RNF-07a / LGPD-02: no rejection without an audit trail
-- =============================================================================
--
-- ⚠ VERSION RENUMBER (executor deviation, 25-01 Task 1): the plan named this file
-- 20260709000001_guard_rejeicao_auditada.sql, but 20260709000001 was already taken by
-- the committed Phase-24 migration 20260709000001_sec07_rubric_remediation.sql (and
-- 000002 by sec08). Two migrations sharing a version prefix breaks the Supabase version
-- row. Renumbered to the fresh contiguous block 20260709000010..000014 (same 1:1 logical
-- mapping + apply order as the plan's 01..05). Content/behavior unchanged.
--
-- PURPOSE
-- Close the reject-without-trail hole (A9): the UpdateStatusModal reject path writes
-- candidaturas.status='rejeitado' with etapa_atual UNCHANGED and NO historico row. This
-- BEFORE UPDATE OF status trigger RAISEs on any status crossing INTO 'rejeitado' that is
-- NOT sanctioned — i.e. neither a sanctioned DEFINER RPC set the txn-local GUC
-- app.rejeicao_sancionada, NOR the same UPDATE also drives an etapa_atual transition
-- (which fires avancar_etapa BEFORE UPDATE OF etapa_atual → writes the historico row).
--
-- HYBRID guard (both branches required — verified against the 4 write-paths, RESEARCH §1a/1b):
--   path #1 (hole)        : status→rejeitado, etapa unchanged, no flag   → BLOCKED
--   path #2 (comparativo) : status→rejeitado + etapa→rejeitado           → allowed (etapa branch)
--   path #3 (registrar)   : sets flag + etapa→rejeitado                  → allowed (flag branch)
--   path #4 (knockout)    : sets flag, etapa unchanged (inscricao)       → allowed (flag branch)
--
-- GUC idiom (NEW to this repo — RESEARCH §1b): read with current_setting(key, true) (2nd
-- arg true = missing_ok → NULL when unset); the sanctioned RPCs write it with
-- set_config(key, 'on', true) (is_local=true → SET LOCAL → txn-scoped, auto-resets,
-- pooler-safe). Custom dotted-prefix GUC (app.*) needs no postgresql.conf registration.
-- The current_setting(key, true) missing_ok precedent is 20260421000001:100.
--
-- ⚠ CONTEXT/RESEARCH correction: the named precedent avancar_etapa_flag_guard
-- (20260624000004) does NOT use a session GUC — its "flag" is the data column
-- entrevista_analises.bloqueio_avanco. We reuse its BEFORE-UPDATE guard-fn + idempotent
-- re-bind SHAPE only; the set_config/current_setting('app.*') idiom is new here.
--
-- FIRING ORDER (verified, RESEARCH §1d): BEFORE row-triggers fire alphabetically —
-- candidaturas_avancar_etapa_trg (c) < trg_candidaturas_guard_rejeicao (t) → avancar_etapa
-- writes its audit row first, then this guard validates; a RAISE rolls both back atomically.
-- The AFTER trg_n8n_status_candidatura (Phase 24 SEC-03) only fires on statement success →
-- a blocked reject never dispatches n8n. Must NOT break either.
--
-- SECURITY DEFINER + SET search_path='' (Phase-6 proof: auth.uid() is GUC-based, survives DEFINER).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This uses
-- CREATE FUNCTION + DO $$ + COMMENT (PL/pgSQL bodies) → apply via Supabase MCP apply_migration
-- in the [BLOCKING] wave 25-07 — NOT applied here; version-row reconcile → Phase 27.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.guard_rejeicao_auditada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fires when status CROSSES INTO 'rejeitado'.
  IF NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado' THEN
    -- Allowed iff EITHER a sanctioned DEFINER RPC set the txn-local flag, OR this same
    -- UPDATE also drives an etapa_atual transition (audited by avancar_etapa). Otherwise
    -- it is the A9 hole (status-only reject, no trail) → RAISE.
    IF current_setting('app.rejeicao_sancionada', true) IS DISTINCT FROM 'on'
       AND NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
      RAISE EXCEPTION 'Rejeição sem trilha de auditoria não é permitida (RNF-07a / LGPD-02)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Bind the trigger (idempotent: create only if absent) — coexists with the existing
-- candidaturas_avancar_etapa_trg (BEFORE UPDATE OF etapa_atual) and the AFTER
-- trg_n8n_status_candidatura (Phase 24 SEC-03). Alphabetical BEFORE-order: avancar
-- audits first, this guard validates second (RESEARCH §1d).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_candidaturas_guard_rejeicao'
      AND tgrelid = 'public.candidaturas'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_candidaturas_guard_rejeicao
             BEFORE UPDATE OF status ON public.candidaturas
             FOR EACH ROW
             EXECUTE FUNCTION public.guard_rejeicao_auditada()';
  END IF;
END $$;

COMMENT ON FUNCTION public.guard_rejeicao_auditada() IS
  'Phase 25 / FUNIL-02 (A9): BEFORE UPDATE OF status on candidaturas. Fires only when status '
  'CROSSES INTO rejeitado (NEW.status=rejeitado AND OLD IS DISTINCT FROM rejeitado). RAISEs '
  'check_violation (RNF-07a / LGPD-02) UNLESS the reject is sanctioned — either a DEFINER RPC set '
  'the txn-local GUC app.rejeicao_sancionada=on (registrar_decisao / submit_candidatura_atomic), OR '
  'the same UPDATE also transitions etapa_atual (audited by avancar_etapa). Hybrid: flag branch '
  'covers etapa-unchanged knockouts, etapa branch covers the comparativo inline reject. SECURITY '
  'DEFINER + search_path='''' (auth.uid() GUC-based, survives DEFINER). Coexists with '
  'candidaturas_avancar_etapa_trg (audits first) and trg_n8n_status_candidatura (AFTER, only on success).';

-- Harden the SECURITY DEFINER fn (Shared Pattern C).
REVOKE ALL ON FUNCTION public.guard_rejeicao_auditada() FROM PUBLIC;
