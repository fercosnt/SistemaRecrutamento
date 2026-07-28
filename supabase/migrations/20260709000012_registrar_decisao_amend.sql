-- =============================================================================
-- Migration: registrar_decisao amendment — sanctioned reject + honest justificativa
-- Date: 2026-07-09
-- Phase: 25 (corre-o-do-funil-lado-rh-enums-colunas-contratos)
-- Requirement: FUNIL-02 + FUNIL-09 (A26) — sanction the reject; honest criterio_texto
-- SUPERSEDES the registrar_decisao body shipped in 20260625100001_decisao_final_phase15.sql
-- =============================================================================
--
-- ⚠ VERSION RENUMBER (executor deviation, 25-01 Task 2): plan named this file
-- 20260709000003_registrar_decisao_amend.sql; renumbered to 20260709000012 to keep the
-- whole 25-01 block contiguous (20260709000010..000014) and clear of the committed Phase-24
-- 20260709000001/000002 SEC remediations. Content/behavior unchanged vs the plan.
--
-- PURPOSE
-- CREATE OR REPLACE registrar_decisao keeping the justificativa>=50 check, the vaga-ownership
-- guard, and the UPSERT of the CURRENT decisao_final row VERBATIM. Only the TERMINAL funnel
-- transition changes (was L139-143: set ONLY etapa_atual):
--
--   (a) FUNIL-02: the rejeitado branch now `PERFORM set_config('app.rejeicao_sancionada','on',
--       true)` BEFORE the candidaturas UPDATE, so the Phase-25 guard_rejeicao_auditada trigger
--       (20260709000010) allows the status→rejeitado write. is_local=true → txn-scoped, pooler-safe.
--   (b) FUNIL-09 (Open Q1 = YES): fold status + etapa_atual + honest etapa_justificativa into a
--       SINGLE UPDATE inside the sanctioned-flag context. status='rejeitado' makes the terminal
--       consistent (was stale — dashboard/filter read status). etapa_justificativa=p_justificativa
--       makes the historico_candidatura row honest: avancar_etapa writes criterio_texto :=
--       NEW.etapa_justificativa (20260624000004:87), which previously inherited a STALE value.
--
-- The aprovado branch analogously sets etapa_atual='aprovado' + etapa_justificativa=p_justificativa
-- (no flag needed — no status→rejeitado). em_espera: NO etapa change (decision row only).
--
-- NO manual historico_candidatura INSERT — the candidaturas etapa UPDATE fires avancar_etapa()
-- which writes the ONE audit row same-txn (Phase-8 survivor double-write lesson; the existing
-- Phase-15 comment). The new AFTER UPDATE snapshot_decisao_final trigger (20260709000011)
-- archives the OLD decision on the UPSERT overwrite — no change needed to that path here.
--
-- AUTHZ unchanged: role IN (rh,administrador), rh must own vagas.created_by, administrador bypasses.
-- por_usuario := auth.uid() ALWAYS (LGPD-02 guardrail). SECURITY DEFINER + search_path=''.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (D-22). PL/pgSQL $$ body + adjacent REVOKE/GRANT/COMMENT
-- → apply via Supabase MCP apply_migration in the [BLOCKING] wave 25-07 — NOT applied here;
-- version-row reconcile → Phase 27.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.registrar_decisao(
  p_candidatura_id uuid,
  p_decisao        public.decisao_final_resultado,
  p_justificativa  text
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_row        public.decisao_final;
BEGIN
  -- (0) Re-assert justificativa length server-side (the DB CHECK >= 50 is also live
  --     — defense in depth; surface a clean error before the constraint trips).
  IF p_justificativa IS NULL OR length(p_justificativa) < 50 THEN
    RAISE EXCEPTION 'justificativa deve ter ao menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Resolve the candidatura → its vaga owner. A missing candidatura → not found.
  SELECT v.created_by
    INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Role + own-vaga guard (mirror confirmar_revisao_entrevista :235-245).
  --     candidato/anon → forbidden. rh → must own the vaga. administrador → bypass.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (3) UPSERT the CURRENT decisao_final row (Open Q2 rec a — one current row; amendment
  --     history is archived by the AFTER UPDATE snapshot_decisao_final trigger, Phase 25).
  --     por_usuario := auth.uid() ALWAYS (LGPD-02 — never a null actor).
  INSERT INTO public.decisao_final
    (candidatura_id, decisao, justificativa, por_usuario)
  VALUES
    (p_candidatura_id, p_decisao, p_justificativa, (select auth.uid()))
  ON CONFLICT (candidatura_id)
  DO UPDATE SET decisao       = EXCLUDED.decisao,
                justificativa = EXCLUDED.justificativa,
                por_usuario   = (select auth.uid()),
                em            = now()
  RETURNING * INTO v_row;

  -- (4) Terminal funnel transition (Pitfall 5 + Phase-25 FUNIL-02/09). Map ONLY
  --     aprovado/rejeitado to etapa_atual; em_espera leaves etapa as-is (decisao_final_resultado
  --     has em_espera; etapa_processo does NOT). Fold status + etapa_atual + honest
  --     etapa_justificativa into ONE UPDATE. The candidaturas UPDATE fires avancar_etapa()
  --     which writes the ONE historico_candidatura audit row same-txn — do NOT manual-INSERT
  --     it here (Phase-8 survivor double-write lesson). ator = auth.uid() (GUC, survives DEFINER).
  IF p_decisao = 'aprovado' THEN
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           etapa_justificativa = p_justificativa   -- honest criterio_texto for avancar_etapa
     WHERE id = p_candidatura_id;
  ELSIF p_decisao = 'rejeitado' THEN
    -- FUNIL-02: sanction this status→rejeitado for the guard_rejeicao_auditada trigger
    -- (is_local=true → SET LOCAL, txn-scoped, auto-resets, pooler-safe) BEFORE the UPDATE.
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'rejeitado',
           status = 'rejeitado',                    -- Open Q1: terminal reflects the decision (was stale)
           etapa_justificativa = p_justificativa    -- honest criterio_texto for avancar_etapa
     WHERE id = p_candidatura_id;
  END IF;
  -- em_espera: NO etapa change (decision row only).

  -- RETURN the decisao_final row (readback — no silent no-op).
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION
  public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.registrar_decisao(uuid, public.decisao_final_resultado, text) TO authenticated;

COMMENT ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) IS
  'Phase 15 + Phase 25 / DECISAO-03 + FUNIL-02/09: captura a decisao final de RH gravando '
  'decisao_final (UNICO writer — client INSERT bloqueado WITH CHECK(false)). por_usuario := auth.uid() '
  'SEMPRE (guardrail estrutural LGPD-02). UPSERT da linha corrente via ON CONFLICT(candidatura_id); o '
  'historico de emendas e arquivado pelo trigger AFTER UPDATE snapshot_decisao_final (Phase 25, A26). '
  'Terminal (Phase 25): aprovado -> etapa_atual=aprovado + etapa_justificativa=p_justificativa; rejeitado '
  '-> PERFORM set_config(app.rejeicao_sancionada=on, is_local) e UPDATE unico {etapa_atual=rejeitado, '
  'status=rejeitado, etapa_justificativa=p_justificativa} (sanciona o guard_rejeicao_auditada, terminal '
  'consistente, criterio_texto honesto); em_espera NAO muda etapa. Dispara avancar_etapa (UMA row de '
  'auditoria) — NUNCA INSERT manual em historico_candidatura. SECURITY DEFINER + search_path=''''; guard: '
  'role IN (rh,administrador), rh deve possuir a vaga, administrador bypassa. NUNCA auto-decide (RNF-07a). '
  'RETORNA a row. GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';
