-- =============================================================================
-- Migration: upsert_pergunta_opcoes_metadata RPC (atomic jsonb<->table sync)
-- Date: 2026-06-07
-- Phase: 07 (configuracao-de-vaga-tags)
-- Requirement: VAGACFG-03 (RF-35, RF-36) — atomic option-tag write path (D-10)
-- DEPENDS ON: 20260607010001 (enum_tag_opcao + pergunta_opcao_metadata table)
-- =============================================================================
--
-- PURPOSE
-- The single transactional write path for option tags (D-10). Per pergunta it:
--   1. enforces RH/admin authorization IN-BODY (RLS does NOT apply to a SECURITY DEFINER
--      body, so the role check must be explicit — raises 42501 otherwise);
--   2. DELETEs the existing pergunta_opcao_metadata rows for the pergunta (idempotent);
--   3. loops the input opcoes, COALESCE-ing each opcao_id (or gen_random_uuid() to backfill
--      legacy string[] options / new options), accumulating the id-bearing [{id,texto}] jsonb;
--   4. INSERTs the metadata rows (tag/peso/nota_ia/ordem with COALESCE defaults: neutro/0/0);
--   5. writes the id-bearing jsonb back to perguntas_formulario.opcoes_resposta.
-- This mirrors the shipped submit_candidatura_atomic idiom (20260425000003): SECURITY DEFINER
-- + SET search_path='' + jsonb_array_elements loop + REVOKE/GRANT footer.
--
-- DEVIATION from the analog: submit_candidatura_atomic GRANTs only to service_role because it
-- is called from an Edge Function. THIS RPC is called directly from the authenticated CLIENT
-- (no cross-service orchestration), so it GRANTs EXECUTE to `authenticated` (NOT service_role)
-- and carries the in-body role check as the authorization control (T-07-02-01).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the `$$ ... $$`
-- PL/pgSQL body + adjacent COMMENT/REVOKE/GRANT breaks the prepared-statement boundary parser
-- and raises SQLSTATE 42601 at push time (CLAUDE.md §Commands / D-22). If `supabase db push`
-- fails with 42601, apply via the D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260607010003`.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_pergunta_opcoes_metadata(
  p_pergunta_id uuid,
  -- [{ "opcao_id": uuid|null, "texto": text, "tag": text, "peso": int, "nota_ia": text|null, "ordem": int }]
  p_opcoes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_opcao        jsonb;
  v_opcao_id     uuid;
  v_new_jsonb    jsonb := '[]'::jsonb;
  v_role         text;
BEGIN
  -- Authorization inside the DEFINER body (RLS does not apply here — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Replace metadata for this pergunta (idempotent):
  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id = p_pergunta_id;

  FOR v_opcao IN SELECT * FROM jsonb_array_elements(p_opcoes)
  LOOP
    -- ensure a stable opcao_id (generate if client sent null = new option / backfill):
    v_opcao_id := COALESCE(NULLIF(v_opcao->>'opcao_id','')::uuid, gen_random_uuid());

    -- accumulate the new opcoes_resposta jsonb in object shape [{id, texto}]:
    v_new_jsonb := v_new_jsonb || jsonb_build_object(
      'id',    v_opcao_id,
      'texto', v_opcao->>'texto'
    );

    INSERT INTO public.pergunta_opcao_metadata
      (pergunta_id, opcao_id, opcao_texto, tag, peso, nota_ia, ordem)
    VALUES (
      p_pergunta_id,
      v_opcao_id,
      v_opcao->>'texto',
      COALESCE(v_opcao->>'tag','neutro')::public.enum_tag_opcao,
      COALESCE((v_opcao->>'peso')::int, 0),
      v_opcao->>'nota_ia',
      COALESCE((v_opcao->>'ordem')::int, 0)
    );
  END LOOP;

  -- write the id-bearing jsonb back to the source of truth:
  UPDATE public.perguntas_formulario
     SET opcoes_resposta = v_new_jsonb, updated_at = now()
   WHERE id = p_pergunta_id;

  RETURN jsonb_build_object('pergunta_id', p_pergunta_id,
                            'opcoes_count', jsonb_array_length(v_new_jsonb));
END;
$$;

COMMENT ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) IS
  'Phase 7 / VAGACFG-03: atomic sync of opcoes_resposta jsonb (with stable opcao_id) and pergunta_opcao_metadata. Idempotent (DELETE+re-INSERT). RH/admin only (checked in body). Called from the authenticated client (GRANT to authenticated, not service_role).';

REVOKE ALL ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) TO authenticated;
