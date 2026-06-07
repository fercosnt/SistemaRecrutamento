-- =============================================================================
-- Migration: publish_vaga RPC (server-side D-12 publish gate)
-- Date: 2026-06-07
-- Phase: 07 (configuracao-de-vaga-tags)
-- Requirement: VAGACFG-02 (RF-34) + D-12 gate — server-authoritative publish validation
-- DEPENDS ON: 20260607010001 (pergunta_opcao_metadata), 20260607010002 (vagas.* jsonb columns)
-- =============================================================================
--
-- PURPOSE
-- Defense-in-depth (Pattern 3): the ONLY path that flips a vaga rascunho -> ativa. A buggy or
-- malicious client could otherwise UPDATE status='ativa' directly, skipping D-12. This RPC
-- re-checks all 3 D-12 conditions server-side before the transition:
--   (1) pesos_avaliacao sums to 100 across the 4 weighted keys
--       (triagem + work_sample_sjt + redacao_cultural + entrevista);
--   (2) at least one testes_aplicaveis element has obrigatorio = true;
--   (3) NO pergunta of this vaga has a knockout-tagged option while being obrigatoria = false
--       (every pergunta carrying a tag='knockout' option must itself be obrigatoria).
-- Any failed condition RAISEs with errcode 'P0001' (raise_exception) so the client can map the
-- message to a UX error. Only when all pass does it UPDATE vagas SET status='ativa'
-- WHERE id = p_vaga_id AND status='rascunho' (Pitfall 5 — status_vaga has 4 live values
-- rascunho|ativa|inativa|arquivada; publish only transitions rascunho->ativa).
--
-- Authorization: RLS does NOT apply to a SECURITY DEFINER body, so the RH/admin role check is
-- explicit in-body (raises 42501). REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated
-- (called directly from the authenticated client, NOT service_role).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the `$$ ... $$`
-- PL/pgSQL body + adjacent COMMENT/REVOKE/GRANT breaks the prepared-statement boundary parser
-- and raises SQLSTATE 42601 at push time (CLAUDE.md §Commands / D-22). If `supabase db push`
-- fails with 42601, apply via the D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260607010004`.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.publish_vaga(
  p_vaga_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role            text;
  v_status          public.status_vaga;
  v_pesos           jsonb;
  v_testes          jsonb;
  v_soma            int;
  v_tem_obrigatorio boolean;
  v_knockout_invalido boolean;
  v_updated         int;
BEGIN
  -- Authorization inside the DEFINER body (RLS does not apply here — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Load the vaga config:
  SELECT status, pesos_avaliacao, testes_aplicaveis
    INTO v_status, v_pesos, v_testes
    FROM public.vagas
   WHERE id = p_vaga_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vaga nao encontrada.' USING errcode = 'P0001';
  END IF;

  IF v_status <> 'rascunho' THEN
    RAISE EXCEPTION 'Apenas vagas em rascunho podem ser publicadas (status atual: %).', v_status
      USING errcode = 'P0001';
  END IF;

  -- D-12 condition (1): pesos_avaliacao sums to 100 across the 4 weighted keys.
  v_soma := COALESCE((v_pesos->>'triagem')::int, 0)
          + COALESCE((v_pesos->>'work_sample_sjt')::int, 0)
          + COALESCE((v_pesos->>'redacao_cultural')::int, 0)
          + COALESCE((v_pesos->>'entrevista')::int, 0);
  IF v_soma <> 100 THEN
    RAISE EXCEPTION 'Os pesos de avaliacao precisam somar 100%% (soma atual: %%).', v_soma
      USING errcode = 'P0001';
  END IF;

  -- D-12 condition (2): at least one testes_aplicaveis element has obrigatorio = true.
  SELECT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(COALESCE(v_testes, '[]'::jsonb)) AS t
     WHERE (t->>'obrigatorio')::boolean IS TRUE
  ) INTO v_tem_obrigatorio;
  IF NOT v_tem_obrigatorio THEN
    RAISE EXCEPTION 'Selecione ao menos um teste obrigatorio antes de publicar.'
      USING errcode = 'P0001';
  END IF;

  -- D-12 condition (3): every pergunta with a knockout-tagged option must be obrigatoria.
  -- (a knockout option on a non-obrigatoria pergunta could silently never fire).
  SELECT EXISTS (
    SELECT 1
      FROM public.pergunta_opcao_metadata m
      JOIN public.perguntas_formulario p ON p.id = m.pergunta_id
     WHERE p.vaga_id = p_vaga_id
       AND m.tag = 'knockout'
       AND p.obrigatoria = false
  ) INTO v_knockout_invalido;
  IF v_knockout_invalido THEN
    RAISE EXCEPTION 'Toda pergunta com opcao eliminatoria (knockout) precisa ser obrigatoria.'
      USING errcode = 'P0001';
  END IF;

  -- All D-12 conditions pass -> transition rascunho -> ativa (Pitfall 5).
  UPDATE public.vagas
     SET status = 'ativa', updated_at = now()
   WHERE id = p_vaga_id AND status = 'rascunho';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'vaga_id', p_vaga_id,
    'status', 'ativa',
    'updated', v_updated
  );
END;
$$;

COMMENT ON FUNCTION public.publish_vaga(uuid) IS
  'Phase 7 / D-12: server-side publish gate. Re-checks the 3 D-12 conditions (pesos sum=100, >=1 teste obrigatorio, no knockout option on a non-obrigatoria pergunta) before transitioning vaga rascunho->ativa. RH/admin only (checked in body). Called from the authenticated client.';

REVOKE ALL ON FUNCTION public.publish_vaga(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_vaga(uuid) TO authenticated;
