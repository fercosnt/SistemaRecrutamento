-- =============================================================================
-- Migration: submit_candidatura_atomic RPC
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: CAND-02, CAND-03, CAND-04 — atomic candidatura + respostas insert
-- DEPENDS ON: 20260425000004 (UNIQUE constraint provides 23505 raise path
--             for DUPLICATE_CANDIDATURA mapping)
-- =============================================================================
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver
-- already wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with the `$$ ... $$` PL/pgSQL body (which contains
-- its own BEGIN/END) breaks the prepared-statement boundary parser and
-- raises "cannot insert multiple commands into a prepared statement"
-- (SQLSTATE 42601) at push time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_candidatura_atomic(
  p_candidato_id      uuid,
  p_vaga_id           uuid,
  p_curriculo_url     text,
  p_curriculo_nome    text,
  p_curriculo_size    int,
  p_respostas         jsonb   -- [{pergunta_id, resposta_texto?, resposta_numerica?, resposta_opcoes?}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidatura_id uuid;
  v_resposta jsonb;
BEGIN
  -- 1) Insert candidatura with explicit defaults (don't rely on column defaults)
  INSERT INTO public.candidaturas (
    candidato_id,
    vaga_id,
    status,
    etapa_atual,
    curriculo_url,
    curriculo_nome_original,
    curriculo_tamanho_bytes,
    data_candidatura,
    data_formulario_enviado
  ) VALUES (
    p_candidato_id,
    p_vaga_id,
    'aguardando_resposta'::public.status_candidatura,
    'triagem'::public.etapa_processo,
    p_curriculo_url,
    p_curriculo_nome,
    p_curriculo_size,
    now(),
    now()
  )
  RETURNING id INTO v_candidatura_id;

  -- 2) Batch insert respostas (one per element of p_respostas array)
  IF p_respostas IS NOT NULL AND jsonb_array_length(p_respostas) > 0 THEN
    FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)
    LOOP
      INSERT INTO public.respostas_formulario (
        candidatura_id,
        pergunta_id,
        resposta_texto,
        resposta_numerica,
        resposta_opcoes
      ) VALUES (
        v_candidatura_id,
        (v_resposta->>'pergunta_id')::uuid,
        v_resposta->>'resposta_texto',
        CASE
          WHEN v_resposta ? 'resposta_numerica'
            THEN (v_resposta->>'resposta_numerica')::numeric
          ELSE NULL
        END,
        v_resposta->'resposta_opcoes'  -- jsonb passthrough
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'candidatura_id', v_candidatura_id,
    'respostas_count', COALESCE(jsonb_array_length(p_respostas), 0)
  );
END;
$$;

COMMENT ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) IS
  'Phase 4: Atomic INSERT candidatura + respostas_formulario. On UNIQUE violation (candidato_id+vaga_id), throws — caller must catch and map to DUPLICATE_CANDIDATURA error_code.';

REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) TO service_role;
