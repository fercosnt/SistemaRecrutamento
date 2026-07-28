-- =============================================================================
-- Migration: upsert_pergunta_opcoes_metadata — vaga status + ownership guard
-- Date: 2026-07-09
-- Phase: 25 (corre-o-do-funil-lado-rh-enums-colunas-contratos)
-- Requirement: FUNIL-11 (A29) — editing options of a non-rascunho vaga is blocked/controlled
-- SUPERSEDES the body shipped in 20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql
-- =============================================================================
--
-- ⚠ VERSION RENUMBER (executor deviation, 25-01 Task 3): plan named this file
-- 20260709000004_upsert_opcoes_status_guard.sql; renumbered to 20260709000013 to keep the
-- 25-01 block contiguous (20260709000010..000014) and clear of the committed Phase-24
-- 20260709000001/000002 SEC remediations. Content/behavior unchanged vs the plan.
--
-- PURPOSE (A29)
-- The current fn (20260607010003) only checks role, then DELETEs all pergunta_opcao_metadata
-- for the pergunta and regenerates opcao_ids with gen_random_uuid(). On an ACTIVE vaga this
-- orphans candidaturas.opcao_knockout_id (logical FK → the old opcao_id) and DESYNCS the
-- vagas.qualificacao_etapa1 snapshot written at publish. FIX: CREATE OR REPLACE keeping the
-- DELETE/regenerate/write-back body UNCHANGED, but adding BEFORE the DELETE:
--   (1) resolve the pergunta's vaga (status + created_by); pergunta-not-found → no_data_found;
--   (2) status hard-block — RAISE P0001 if the vaga is not 'rascunho' (mirror publish_vaga's gate);
--   (3) ownership — role='rh' must own the vaga (created_by = auth.uid()); administrador bypasses
--       (mirror registrar_decisao). RLS does NOT apply inside a SECURITY DEFINER body, so the
--       ownership check must be explicit in-body (T-25-03 IDOR).
-- The pre-existing role IN ('rh','administrador') check is kept as the first gate.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (D-22). PL/pgSQL $$ body + adjacent COMMENT/REVOKE/GRANT
-- → apply via Supabase MCP apply_migration in the [BLOCKING] wave 25-07 — NOT applied here;
-- version-row reconcile → Phase 27.
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
  v_status       public.status_vaga;
  v_owner        uuid;
BEGIN
  -- Authorization inside the DEFINER body (RLS does not apply here — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (A29) Resolve the pergunta's vaga (status + owner) BEFORE any DELETE/regenerate.
  --       Mirror publish_vaga's status-gate load idiom (20260607010004:59-72).
  SELECT v.status, v.created_by
    INTO v_status, v_owner
    FROM public.perguntas_formulario p
    JOIN public.vagas v ON v.id = p.vaga_id
   WHERE p.id = p_pergunta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pergunta não encontrada' USING ERRCODE = 'no_data_found';
  END IF;

  -- (A29) Status hard-block — editing options of a non-rascunho vaga would orphan
  --       opcao_knockout_id / desync qualificacao_etapa1. Mirror publish_vaga's gate.
  IF v_status <> 'rascunho' THEN
    RAISE EXCEPTION 'Não é possível editar opções de uma vaga % (apenas rascunho).', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (A29) Ownership (mirror registrar_decisao :111-117): rh must own the vaga; administrador
  --       bypasses. RLS is inert inside DEFINER, so this in-body check closes the IDOR (T-25-03).
  IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
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
  'Phase 7 + Phase 25 / VAGACFG-03 + FUNIL-11 (A29): atomic sync of opcoes_resposta jsonb (with '
  'stable opcao_id) and pergunta_opcao_metadata. Idempotent (DELETE+re-INSERT). Guards (in-body — RLS '
  'inert in DEFINER): role IN (rh,administrador); the pergunta''s vaga must be rascunho (status hard-block, '
  'else P0001 — editing an active vaga orphans opcao_knockout_id / desyncs qualificacao_etapa1); rh must '
  'own the vaga (created_by = auth.uid()), administrador bypasses (else 42501). Pergunta-not-found → '
  'no_data_found. Called from the authenticated client (GRANT to authenticated, not service_role).';

REVOKE ALL ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) TO authenticated;
