-- =============================================================================
-- Migration: entrevista_guias edit write-path
--            dedup → updated_at → UNIQUE(candidatura_id,tipo) → save_entrevista_guia_edits RPC
-- Date: 2026-06-29
-- Phase: 20 (Refino RH — Editar Guia de Entrevista, SEED-001)
-- Requirement: ENTREV-06 / ENTREV-07 / ENTREV-08 — RH edits the interview guide via a
--              secure authenticate-THEN-authorize write-path (no broad RH UPDATE policy).
-- =============================================================================
--
-- PURPOSE
-- Phase 14 made `entrevista_guias` read-only — the EF INSERTs a fresh row per regen
-- and getGuia reads the latest by created_at DESC. Phase 20 turns the guide editable
-- WITHOUT opening a broad RH UPDATE policy: the ONLY user write-path becomes the
-- SECURITY DEFINER RPC `save_entrevista_guia_edits` (clone of salvar_avaliacao_entrevista
-- with ONE swap — the role source). To make `ON CONFLICT (candidatura_id, tipo)` work,
-- the table first needs a UNIQUE arbiter; to add UNIQUE it must first be deduped.
--
-- STATEMENT ORDER IS LOAD-BEARING (20-RESEARCH Pitfall 2):
--   (1) dedup DELETE  — keep the latest row per (candidatura_id, tipo) [DISTINCT ON].
--   (2) ADD COLUMN updated_at + backfill + DEFAULT now() + SET NOT NULL.
--   (3) ADD CONSTRAINT ... UNIQUE (candidatura_id, tipo)  — the upsert arbiter.
--   (4) CREATE FUNCTION save_entrevista_guia_edits (ON CONFLICT needs (3) to exist).
-- `ADD CONSTRAINT ... UNIQUE` fails with 23505 if duplicates remain → dedup MUST run
-- first. `ON CONFLICT (candidatura_id, tipo)` fails at runtime with "no unique or
-- exclusion constraint matching" if the constraint isn't there yet → UNIQUE before RPC.
--
-- AUTHZ — THE ENTREV-08 DEVIATION (20-RESEARCH Pitfall 1, the highest-risk surface):
--   The role is derived from `public.usuarios_rh` (the authoritative table) — NOT from
--   the JWT app_metadata role claim that every other RPC in this repo reads via
--   auth.jwt(). Same filter as the custom_access_token_hook (ativo + deleted_at IS NULL,
--   recrutador→rh, administrador→administrador). This defeats a forged/stale JWT claim
--   (reference_auth_hook_rls_gap) and matches the EF posture (gerar-guia/index.ts:153-168).
--   Ownership: the candidatura's vaga must be owned by the rh (vagas.created_by =
--   auth.uid()); administrador bypasses. RH-without-ownership + candidato → 42501.
--   auth.uid() reads the request.jwt GUC → survives SECURITY DEFINER (D-09, Phase-6 proof).
--   REVOKE FROM PUBLIC + GRANT EXECUTE TO authenticated. NO broad RH UPDATE RLS policy
--   on entrevista_guias — the RPC is the only write-path (the SELECT-only RLS stays).
--
-- INVARIANT (RNF-07a): this RPC NEVER writes `public.candidaturas`, NEVER advances the
--   funil, NEVER auto-rejects. The guide is a recommendation; the human always decides.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Migrations). This is
-- a PL/pgSQL $$ body + adjacent REVOKE/GRANT/COMMENT → the canonical 42601-risk migration.
-- The Supabase CLI driver wraps each migration in its OWN implicit transaction; an extra
-- BEGIN/COMMIT trips the transaction pooler with SQLSTATE 42601. Applied LIVE in the
-- [BLOCKING] 20-02 wave via Supabase MCP apply_migration — NOT applied here.
-- =============================================================================

-- (1) Dedup: keep the most recent row per (candidatura_id, tipo); delete the rest.
--     DISTINCT ON + ORDER BY (candidatura_id, tipo, created_at DESC, id DESC) → the
--     id DESC is a deterministic tie-break when two rows share created_at.
--     getGuia only ever surfaced the latest, so the deleted orphans were already unread.
DELETE FROM public.entrevista_guias g
 WHERE g.id NOT IN (
   SELECT DISTINCT ON (candidatura_id, tipo) id
     FROM public.entrevista_guias
    ORDER BY candidatura_id, tipo, created_at DESC, id DESC
 );

-- (2) updated_at column (NULLs backfilled from created_at so reads never see a null),
--     then DEFAULT now() + NOT NULL. Both writers (this RPC + the EF upsert in 20-04)
--     set updated_at = now() explicitly → no trigger needed (no double-write ambiguity).
ALTER TABLE public.entrevista_guias
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE public.entrevista_guias SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.entrevista_guias
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- (3) The UNIQUE arbiter the RPC's (and the EF's, 20-04) ON CONFLICT needs.
--     Must come AFTER the dedup (else 23505) and BEFORE the CREATE FUNCTION.
ALTER TABLE public.entrevista_guias
  ADD CONSTRAINT entrevista_guias_candidatura_tipo_key UNIQUE (candidatura_id, tipo);

-- (4) save_entrevista_guia_edits — the ONLY user write-path to entrevista_guias.
--     Clone of salvar_avaliacao_entrevista (migration 20260624000002) with the role
--     source swapped from the JWT claim to public.usuarios_rh (ENTREV-08 deviation).
CREATE OR REPLACE FUNCTION public.save_entrevista_guia_edits(
  p_candidatura_id uuid,
  p_tipo           text,
  p_guia           jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role_db    text;
  v_role       text;
BEGIN
  -- (0) tipo guard (mirror the table CHECK — online | presencial).
  IF p_tipo NOT IN ('online', 'presencial') THEN
    RAISE EXCEPTION 'tipo invalido: %', p_tipo USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Role from public.usuarios_rh (NOT the JWT claim) — the ENTREV-08 deviation.
  --     IDENTICAL filter to custom_access_token_hook (20260420000002:43-56):
  --     ativo + deleted_at IS NULL, recrutador→rh, administrador→administrador.
  --     A SECURITY DEFINER body with search_path='' CAN SELECT public tables (owner
  --     postgres has SELECT). auth.uid() is GUC-based → survives DEFINER (D-09).
  --     candidato/anon (no usuarios_rh row) → v_role_db NULL → v_role NULL → DENY 42501.
  SELECT role INTO v_role_db
    FROM public.usuarios_rh
   WHERE user_id = (select auth.uid())
     AND ativo = true
     AND deleted_at IS NULL
   LIMIT 1;
  v_role := CASE
    WHEN v_role_db = 'recrutador'    THEN 'rh'
    WHEN v_role_db = 'administrador' THEN 'administrador'
    ELSE v_role_db
  END;
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';  -- 42501
  END IF;

  -- (2) Ownership: resolve the candidatura's vaga owner. rh must OWN the vaga;
  --     administrador bypasses. Unknown candidatura → no_data_found.
  SELECT v.created_by INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id
   LIMIT 1;
  IF v_vaga_owner IS NULL THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';  -- 42501
  END IF;

  -- (3) Shape guard (defense in depth): the guide must be a jsonb object carrying the
  --     edited questions array. The RPC stores it opaquely (no score/band semantics).
  IF p_guia IS NULL OR jsonb_typeof(p_guia) <> 'object' THEN
    RAISE EXCEPTION 'guia invalida' USING ERRCODE = 'check_violation';
  END IF;

  -- (4) Upsert — the single write-path. updated_at set here (no trigger). The
  --     UNIQUE(candidatura_id, tipo) arbiter collapses to exactly one row.
  --     RNF-07a: this body NEVER touches public.candidaturas.
  INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, updated_at)
       VALUES (p_candidatura_id, p_tipo, p_guia, now())
  ON CONFLICT (candidatura_id, tipo)
  DO UPDATE SET guia = EXCLUDED.guia, updated_at = now();

  -- Neutral, RH-facing acknowledgement (no candidaturas mutation occurred).
  RETURN jsonb_build_object('ok', true, 'candidatura_id', p_candidatura_id, 'tipo', p_tipo);
END;
$$;

REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) IS
  'Phase 20 / ENTREV-06/07/08: grava as edicoes do guia de entrevista (perguntas editadas/adicionadas/removidas/reordenadas) via upsert ON CONFLICT (candidatura_id, tipo). SECURITY DEFINER + search_path=''''. AUTHZ: role derivado de public.usuarios_rh (NAO do claim JWT — desvio ENTREV-08; ativo + deleted_at IS NULL; recrutador->rh, administrador->administrador); rh deve possuir a vaga (vagas.created_by=auth.uid()); administrador bypassa; RH-sem-posse + candidato -> 42501. NUNCA escreve candidaturas, NUNCA avanca o funil (RNF-07a). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC). NAO existe policy RH UPDATE ampla em entrevista_guias — este RPC e o unico write-path.';
