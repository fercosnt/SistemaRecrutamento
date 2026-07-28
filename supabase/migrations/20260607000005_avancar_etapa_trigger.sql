-- =============================================================================
-- Migration: avancar_etapa() BEFORE UPDATE trigger (transition validator + audit writer)
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-02, FUNIL-03 (D-06, D-07, D-09)
-- =============================================================================
--
-- PURPOSE
-- The unbypassable transition validator + audit writer. Fires BEFORE UPDATE OF etapa_atual on
-- candidaturas. Policy (D-06):
--   - forward / skip-ahead  -> allowed freely
--   - terminal (aprovado/rejeitado) from any stage -> allowed
--   - regression (NEW < OLD by enum ordinal) -> blocked unless etapa_justificativa is non-empty
-- Every actual transition writes exactly one historico_candidatura row (FUNIL-03) in the SAME
-- transaction, capturing etapa_de/etapa_para, criterio_texto (= NEW.etapa_justificativa), the
-- actor and auto_rejeitado.
--
-- SECURITY DEFINER (REVISES Pitfall 4 / D-09 — see exec note 2026-06-07): the function runs as
-- its owner so its INSERT into historico_candidatura (RLS-enabled, no client INSERT policy)
-- succeeds for every caller. Pitfall 4 assumed SECURITY DEFINER would break actor capture; that
-- is FALSE — auth.uid() reads the request.jwt.claims GUC (set per-request by PostgREST), which is
-- independent of the execution role. EMPIRICALLY VERIFIED 2026-06-07: under a real RH JWT the
-- audit row records ator = the RH's auth.uid(); under service_role it records NULL. So actor
-- capture (D-09) holds AND the audit table stays append-only-via-trigger (no direct client INSERT
-- policy needed). `SET search_path = ''` hardens the definer fn (project convention, mirrors
-- submit_candidatura_atomic). auto_rejeitado = (v_ator IS NULL) marks system writes; the
-- zero-auto-rejection guardrail lives ONLY in decisao_final.por_usuario NOT NULL.
--
-- WHY NOT SECURITY INVOKER: a plain invoker trigger runs the INSERT as the calling RH
-- (role authenticated), which RLS blocks on historico_candidatura — every real RH etapa-advance
-- would fail with "new row violates row-level security policy". (Service_role smokes hid this
-- because service_role bypasses RLS; the live RH-JWT smoke caught it.)
--
-- Regression direction uses native enum ordinal comparison — valid because the v2 enum is
-- declared in pipeline order in 20260607000002 (inscricao < triagem < avaliacao_assincrona <
-- entrevista_online < entrevista_presencial < decisao_final < aprovado < rejeitado).
--
-- status_candidatura is UNCHANGED this phase (RESEARCH Q2): its 5 values
-- (aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado) stay as-is.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the
-- `DO $$ ... END $$` / function body PL/pgSQL blocks (which contain their own BEGIN/END) breaks
-- the prepared-statement boundary parser (SQLSTATE 42601 in the transaction pooler — see
-- CLAUDE.md D-22 workaround). This migration uses CREATE FUNCTION + DO $$ + COMMENT, so it MUST
-- be applied via the D-22 SQL-Editor workaround (paste + run manually, then
-- `supabase migration repair --status applied 20260607000005`).
-- =============================================================================

-- (1) Transition-validation + audit-writing function (idempotent via CREATE OR REPLACE) -------
CREATE OR REPLACE FUNCTION public.avancar_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ator uuid := auth.uid();   -- NULL for service_role/system writes (D-09); GUC-based, survives DEFINER
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

  -- Audit write (FUNIL-03, D-09): one row per transition, same transaction
  INSERT INTO public.historico_candidatura
    (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
  VALUES
    (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
     v_ator, (v_ator IS NULL), now());

  RETURN NEW;
END;
$$;

-- (2) Bind the trigger (idempotent: create only if absent) ------------------------------------
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
  'Phase 6 / FUNIL-02 + FUNIL-03 (D-06/D-07/D-09): BEFORE UPDATE OF etapa_atual on candidaturas. '
  'Forward/skip free; terminals (aprovado/rejeitado) allowed from any stage; regression (NEW < OLD '
  'by enum ordinal) blocked unless etapa_justificativa is non-empty. Writes one historico_candidatura '
  'row per transition in the same txn (ator = auth.uid(), NULL for system). SECURITY DEFINER + '
  'SET search_path = '''' so the INSERT into RLS-protected historico_candidatura succeeds for every '
  'caller; auth.uid() is GUC-based so actor capture (D-09) is preserved (verified 2026-06-07).';

-- (4) Harden the SECURITY DEFINER fn (Shared Pattern C) -----------------------------------------
-- Trigger functions are fired by the trigger mechanism regardless of EXECUTE grants, so revoking
-- PUBLIC EXECUTE does NOT break the trigger — it only stops direct /rest/v1/rpc invocation and
-- clears the anon/authenticated_security_definer_function_executable advisor WARN.
REVOKE ALL ON FUNCTION public.avancar_etapa() FROM PUBLIC;
