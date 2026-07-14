-- =============================================================================
-- Migration: perfil_rh_rpc_avatars — self-service profile write path + avatar storage
-- Date: 2026-07-14
-- Phase: 30 (Meu Perfil RH — A37 self-service)
-- Plan: 30-03 (Tasks 1 + 2). Authored ONLY — applied to PROD in the [BLOCKING] 30-06
--       via Supabase MCP apply_migration (NOT applied here).
-- Requirements: PERFIL-01 (own name persists), PERFIL-03 (private avatar storage),
--               SEG-03 (self-service path can NEVER escalate a role — by construction).
-- =============================================================================
--
-- NO `BEGIN; ... COMMIT;` WRAPPER (CLAUDE.md §Migrations / D-22): the Supabase MCP
-- apply_migration path wraps each migration in its own implicit transaction. The
-- curriculos precedent (20260425000002) HAS an outer BEGIN/COMMIT — do NOT copy it;
-- that wrapper is the SQLSTATE 42601 trigger on the CLI transaction pooler for
-- adjacent PL/pgSQL $$ bodies + COMMENT/GRANT statements.
--
-- INVERSE PRIVILEGE vs Phase-28 (20260713000003): the Phase-28 usuarios_rh mutation
-- RPCs are admin-only and REVOKE EXECUTE from public/authenticated/anon (only the
-- service_role EF calls them). THIS RPC is the OPPOSITE — GRANT EXECUTE TO authenticated
-- (self-service, low privilege). It is safe precisely because the body is uid-scoped
-- (WHERE user_id = auth.uid()) AND column-limited (nome_completo/avatar_url only). The
-- Phase-28 self-promotion UPDATE policy stays DROPPED — this DEFINER RPC is the ONLY
-- write path to usuarios_rh from a self-service caller; no client UPDATE RLS policy is
-- (re)added here.
--
-- SEG-03 BY CONSTRUCTION: role / ativo / cargo / email / deleted_at are NOT in the RPC
-- SET list. A self-service caller physically cannot escalate a role, reactivate itself,
-- or change its cargo/email through this path — the columns are unreachable. The
-- authoritative proof is the behavioral SEG-03 smoke (30-02 authored; 30-07 GREEN gate).
--
-- log_auditoria() signature (docs/sql/sql/25-functions-configuracoes.sql:63-77):
--   log_auditoria(p_usuario_id uuid, p_usuario_tipo text, p_acao text,
--     p_categoria categoria_log_auditoria, p_descricao text, p_severidade severidade_log,
--     p_recurso_tipo text, p_recurso_id uuid, p_dados_antes jsonb, p_dados_depois jsonb,
--     p_ip_address inet, p_sucesso boolean, p_erro_mensagem text) RETURNS uuid.
--   The audit call here is BEST-EFFORT (wrapped EXCEPTION WHEN OTHERS THEN NULL) so an
--   audit failure never aborts the profile update — a name/avatar change is low-sensitivity.
--
-- %%-free note (Phase-7 publish_vaga RAISE precedent): no format() with a literal percent
-- sign is used below (the descricao is a plain string literal).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (1) atualizar_meu_perfil_rh — self-service DEFINER write of the caller's OWN row.
--     SET list is column-limited to nome_completo + avatar_url (+ updated_by/updated_at)
--     → SEG-03 holds by construction.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_meu_perfil_rh(
  p_nome       text,
  p_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id uuid;
BEGIN
  -- SEG-03 BOUNDARY: only nome_completo + avatar_url are writable here. role / ativo /
  -- cargo / email / deleted_at are DELIBERATELY absent from this SET list — the
  -- self-service path cannot touch them (privilege escalation impossible by construction).
  -- COALESCE preserves the existing avatar when p_avatar_url is NULL (name-only save must
  -- not wipe the stored photo). WHERE user_id = auth.uid() (GUC-based under DEFINER —
  -- Phase-28 precedent) scopes the write to the caller's OWN single row (IDOR impossible).
  UPDATE public.usuarios_rh
    SET nome_completo = p_nome,
        avatar_url    = COALESCE(p_avatar_url, avatar_url),
        updated_by    = auth.uid(),
        updated_at    = now()
    WHERE user_id = auth.uid()
    RETURNING id INTO v_row_id;

  IF v_row_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: caller has no usuarios_rh row'
      USING ERRCODE = 'P0002';
  END IF;

  -- Best-effort audit (categoria=usuario, severidade=info): kept in-RPC (atomic with the
  -- update) but wrapped so an audit failure NEVER aborts the profile save. Lighter than
  -- the Phase-28 dados_antes/depois snapshot — a name/avatar edit is low-sensitivity.
  BEGIN
    PERFORM public.log_auditoria(
      p_usuario_id   := auth.uid(),
      p_usuario_tipo := 'rh',
      p_acao         := 'editar_perfil',
      p_categoria    := 'usuario',
      p_descricao    := 'Usuario RH editou o proprio perfil',
      p_severidade   := 'info',
      p_recurso_tipo := 'usuarios_rh',
      p_recurso_id   := v_row_id,
      p_sucesso      := true
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- swallow — audit is best-effort, the profile update already succeeded
  END;
END;
$$;

COMMENT ON FUNCTION public.atualizar_meu_perfil_rh(text, text) IS
  'Phase 30 / PERFIL-01 + SEG-03: self-service DEFINER write of the caller''s OWN usuarios_rh '
  'row. SET list is column-limited to nome_completo + avatar_url (+ updated_by/updated_at) — '
  'role/ativo/cargo/email/deleted_at are NOT writable here, so a self-service caller cannot '
  'escalate a role BY CONSTRUCTION (SEG-03). WHERE user_id = auth.uid() (GUC-based under '
  'DEFINER) scopes to one row, the caller''s (IDOR impossible); NOT_FOUND -> P0002 when none. '
  'COALESCE preserves the stored avatar on a name-only save. Best-effort in-RPC log_auditoria '
  '(categoria=usuario, best-effort so it never aborts the update). GRANT EXECUTE TO authenticated '
  '(the OPPOSITE of the Phase-28 admin RPCs'' REVOKE) — safe because uid-scoped + column-limited. '
  'No client UPDATE RLS policy exists on usuarios_rh (Phase-28 self-promotion hole stays dropped); '
  'this RPC is the only self-service write path.';

-- Self-service GRANT (the OPPOSITE of Phase-28's REVOKE): every RH user invokes this for
-- their OWN row. Safe because the body is uid-scoped and column-limited (SEG-03). Do NOT
-- REVOKE; do NOT add any RLS UPDATE policy on usuarios_rh.
GRANT EXECUTE ON FUNCTION public.atualizar_meu_perfil_rh(text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- (2) avatars-rh private bucket + 4 OWN-FOLDER RLS policies on storage.objects.
--     Mirrors the curriculos precedent (20260425000002) RETARGETED to avatars-rh, with
--     the "rh/administrador reads any" SELECT clause DROPPED — an RH user's avatar is
--     their OWN only (SEG-03 spirit: no cross-user avatar read/write).
-- -----------------------------------------------------------------------------

-- Idempotent private bucket (2 MB; png/jpeg/webp). Path schema: {auth.uid()}/avatar.<ext>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars-rh',
  'avatars-rh',
  false,                  -- private — read via signed URL / RLS-authorized SELECT only
  2097152,                -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop any prior policies for idempotency (safe — fresh phase install).
DROP POLICY IF EXISTS "avatars_rh_select_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_rh_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_rh_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_rh_delete_own" ON storage.objects;

-- Pitfall 8: (select auth.uid()::text) wraps in a subquery for the RLS perf cache.
-- CRITICAL vs curriculos: NO "rh/administrador reads any" clause — own avatar only.

-- SELECT (download): owner reads ONLY their own folder (no cross-user read).
CREATE POLICY "avatars_rh_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars-rh'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- INSERT (upload): owner writes own folder only.
CREATE POLICY "avatars_rh_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars-rh'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- UPDATE (overwrite): owner updates own folder only (used by upload-with-upsert).
CREATE POLICY "avatars_rh_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars-rh'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars-rh'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- DELETE: owner deletes own folder only.
CREATE POLICY "avatars_rh_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars-rh'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);
