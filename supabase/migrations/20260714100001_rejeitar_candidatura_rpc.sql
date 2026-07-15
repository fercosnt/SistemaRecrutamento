-- =============================================================================
-- Migration: Phase 31 — rejeitar_candidatura (SECURITY DEFINER RPC) + motivo enum
--            + legacy DROP of the two dead M1 overloads
-- Date: 2026-07-14
-- Phase: 31 (avancar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil-02)
-- Requirement: OPER-01 / OPER-02 / OPER-03 / OPER-04
-- =============================================================================
--
-- PURPOSE
-- The funnel reject is an auditable, server-authoritative operation. This migration
-- lands the DB contract the whole phase depends on:
--
--   (1) enum public.motivo_rejeicao_rh — the structured reject reason, used as an RPC
--       PARAMETER (validated at the Postgres boundary; an invalid literal → 22P02). The
--       value is stored ::text into candidaturas.motivo_rejeicao (which stays text and
--       already holds 'knockout_automatico') — NO ALTER of the column type.
--
--   (2) RPC public.rejeitar_candidatura(p_candidatura_id, p_motivo, p_justificativa) —
--       SECURITY DEFINER, search_path=''. It is the server authority for OPER-02/04:
--         - btrim + char_length(justificativa) >= 50 → RAISE check_violation
--           (the client character counter is UX only; THIS is the enforcement).
--         - vaga-owner authorization (WR-04, copied from registrar_decisao): role IN
--           (rh, administrador); an rh must own vagas.created_by; administrador bypasses.
--         - ONE UPDATE candidaturas SET etapa_atual='rejeitado', status='rejeitado',
--           motivo_rejeicao=p_motivo::text, etapa_justificativa=<btrim'd text>. Setting
--           BOTH etapa_atual AND status satisfies guard_rejeicao_auditada() (the
--           status-only-reject backstop). Landing the justificativa in etapa_justificativa
--           makes the avancar_etapa BEFORE-UPDATE trigger copy it into
--           historico_candidatura.criterio_texto — so the audit trail literally carries the
--           reason. The RPC NEVER manual-INSERTs historico_candidatura (Phase-8 survivor
--           double-write lesson) — the trigger is the sole audit writer, writing exactly
--           ONE row (ator=auth.uid() GUC-based → auto_rejeitado=false, RNF-07a: no score
--           path, no auto-reject).
--
--   (3) DROP of the two dead M1-era overloads with zero callers (resolves the
--       database.types.ts drift): avancar_etapa(uuid, uuid) and
--       rejeitar_candidato(uuid, text, uuid). EXACT signatures, IF EXISTS, no dependents dropped.
--       ⚠ The zero-argument overload public.avancar_etapa (RETURNS trigger, bound to
--       candidaturas_avancar_etapa_trg) is the LIVE trigger function and is NOT touched.
--
-- The trigger avancar_etapa is reused VERBATIM and is NOT edited by this migration
-- (near-miss P27 — CREATE OR REPLACE of a re-authored body dropped a live guard). The
-- ≥50 + structured-motivo enforcement lives entirely in this RPC layer because the
-- trigger deliberately allows a terminal 'rejeitado' from any stage without justificativa.
--
-- INVARIANT (RNF-07a): no path here auto-rejects or decides by score. Every reject is an
-- explicit human-actor write (ator=auth.uid()) with a ≥50 justificativa + structured motivo.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). This file is
-- PL/pgSQL $$ bodies + adjacent DO/REVOKE/GRANT/COMMENT → the canonical 42601-risk shape.
-- AUTHORED-NOT-APPLIED: applied LIVE via Supabase MCP apply_migration in the [BLOCKING]
-- wave 31-06 AFTER the executor returns, with the user's authorization. NOT applied here;
-- NOT pushed; types NOT regenerated here.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) Structured reject-reason enum (pt-BR). Wrapped in a duplicate_object guard for
--     replay-idempotency — MCP apply_migration may be retried.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE TYPE public.motivo_rejeicao_rh AS ENUM (
    'perfil_desalinhado',
    'reprovado_avaliacao',
    'reprovado_entrevista',
    'nao_compareceu',
    'desistencia',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) rejeitar_candidatura — RH-authorize + server-authoritative ≥50 + auditable reject.
--     The ONLY structured reject write-path (OPER-02/04). RETURNS void — the client hook
--     invalidates + refetches; no readback needed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(
  p_candidatura_id uuid,
  p_motivo         public.motivo_rejeicao_rh,
  p_justificativa  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_etapa      public.etapa_processo;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Server-authoritative ≥50 gate (OPER-02) — btrim'd length, pt-BR message.
  --     This is the enforcement; the client counter is only UX. 'outro' is not exempt.
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Resolve the candidatura → its vaga owner + current etapa. Missing → not found.
  SELECT v.created_by, c.etapa_atual
    INTO v_vaga_owner, v_etapa
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard (WR-04 — mirror registrar_decisao :107-117).
  --     candidato/anon → forbidden. rh → must own the vaga. administrador → bypass.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) Early terminal guard (A3 / Pitfall 6): a candidatura already in a terminal etapa
  --     would UPDATE to the same 'rejeitado' etapa → the trigger short-circuits (no audit
  --     row) → a silent no-op. RAISE a clean pt-BR message instead. (UI hides the action
  --     on terminals; this only catches a direct/stale call.)
  IF v_etapa IN ('aprovado', 'rejeitado') THEN
    RAISE EXCEPTION 'candidatura ja esta em etapa terminal (%) — nao pode ser rejeitada novamente', v_etapa
      USING ERRCODE = 'check_violation';
  END IF;

  -- (4) ONE UPDATE only — fires the avancar_etapa BEFORE-UPDATE trigger (writes the ONE
  --     historico_candidatura audit row) AND satisfies guard_rejeicao_auditada()
  --     (status→rejeitado WITH an etapa move). NEVER a manual INSERT INTO
  --     historico_candidatura (Phase-8 double-write). motivo stored ::text — the column
  --     stays text (holds 'knockout_automatico'); the enum validates at the param boundary.
  --     v_just → etapa_justificativa so the trigger copies it into criterio_texto.
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just
   WHERE id = p_candidatura_id;
END;
$$;

REVOKE ALL ON FUNCTION
  public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO authenticated;

COMMENT ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) IS
  'Phase 31 / OPER-02/04: rejeicao auditada pelo RH em qualquer etapa. Server-authoritative: '
  'btrim + char_length(justificativa) >= 50 → RAISE check_violation (o contador do cliente e '
  'apenas UX). Motivo estruturado via enum motivo_rejeicao_rh (parametro; invalido → 22P02), '
  'gravado ::text em candidaturas.motivo_rejeicao. UMA UPDATE seta etapa_atual=rejeitado + '
  'status=rejeitado (satisfaz guard_rejeicao_auditada) + etapa_justificativa (o trigger '
  'avancar_etapa copia para historico_candidatura.criterio_texto e escreve UMA row de auditoria; '
  'ator=auth.uid() → auto_rejeitado=false, RNF-07a). NUNCA INSERT manual em historico_candidatura, '
  'NUNCA auto-rejeita por score. SECURITY DEFINER + search_path=''''; guard: role IN '
  '(rh,administrador), rh deve possuir a vaga (vagas.created_by=auth.uid()), administrador bypassa, '
  'senao insufficient_privilege. GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) Legacy cleanup — DROP the two dead M1-era overloads (zero callers), resolving the
--     database.types.ts drift. EXACT verified signatures, IF EXISTS, no dependent-dropping.
--     avancar_etapa(uuid, uuid) {candidatura_uuid, usuario_rh_uuid}
--     rejeitar_candidato(uuid, uuid, text) {candidatura_uuid, usuario_rh_uuid, motivo}
--       (NOTE: database.types.ts:4620 rendered the args as (uuid,text,uuid); the LIVE identity
--        signature is (uuid,uuid,text) — verified via pg_get_function_identity_arguments at
--        apply time in wave 31-06. The DROP below uses the real positional signature.)
--     ⚠ HIGH-SEVERITY LANDMINE (Pitfall 1): the zero-argument overload public.avancar_etapa
--       (RETURNS trigger, bound to candidaturas_avancar_etapa_trg) is the LIVE trigger
--       function and must NEVER be dropped. Specify the exact two-arg signature; a
--       zero-arg drop (or dropping dependents) would silently break ALL funnel auditing.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.avancar_etapa(uuid, uuid);            -- dead M1 RPC ONLY
DROP FUNCTION IF EXISTS public.rejeitar_candidato(uuid, uuid, text); -- dead M1 RPC ONLY (real signature: uuid,uuid,text)
