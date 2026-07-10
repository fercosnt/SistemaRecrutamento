-- =============================================================================
-- Migration: submit_candidatura_atomic — sanctioned-reject flag for the knockout sweep
-- Date: 2026-07-09
-- Phase: 25 (corre-o-do-funil-lado-rh-enums-colunas-contratos)
-- Requirement: FUNIL-02 (A9 / CI-03 knockout coexistence)
-- SUPERSEDES the body shipped in 20260608000001_inscricao_knockout.sql (verbatim + flag)
-- =============================================================================
--
-- ⚠ VERSION RENUMBER (executor deviation, 25-01 Task 1): the plan named this file
-- 20260709000005_submit_candidatura_flag.sql. Renumbered to 20260709000014 so the whole
-- 25-01 block (guard→historico→registrar→upsert→submit_flag) lands as a fresh contiguous
-- 20260709000010..000014 range that does not collide with the committed Phase-24
-- 20260709000001/000002 SEC remediations. Content/behavior unchanged vs the plan.
--
-- PURPOSE
-- CREATE OR REPLACE submit_candidatura_atomic reproducing the Phase-8 body VERBATIM,
-- inserting a SINGLE new statement — `PERFORM set_config('app.rejeicao_sancionada', 'on',
-- true);` — immediately BEFORE the knockout auto-reject UPDATE. The Phase-25
-- guard_rejeicao_auditada trigger (20260709000010) RAISEs on any status→rejeitado that is
-- neither flagged NOR accompanied by an etapa transition. The knockout (path #4) sets
-- status=rejeitado with etapa_atual staying 'inscricao' (unchanged) → the guard's
-- etapa-transition branch would NOT cover it, so the txn-local flag is REQUIRED here to keep
-- the sanctioned auto-reject working (RNF-07a / CI-03 — the one sanctioned auto-reject path).
--
-- is_local=true → SET LOCAL semantics → the flag is transaction-scoped and auto-resets on
-- commit/rollback (pooler-safe; the Supabase transaction pooler reuses connections).
--
-- NOTHING ELSE CHANGES: the INSERT candidatura, the respostas loop, the texto-join knockout
-- sweep (@> to_jsonb(opcao_texto), tag='knockout'), the explicit single historico row (D-13),
-- the survivor branch, the RETURN jsonb, and the REVOKE/GRANT-to-service_role footer are all
-- byte-for-behavior identical to 20260608000001.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). PL/pgSQL $$
-- body + adjacent COMMENT/REVOKE/GRANT → apply via Supabase MCP apply_migration in the
-- [BLOCKING] wave 25-07 — NOT applied here; version-row reconcile → Phase 27.
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
  v_resposta       jsonb;
  v_ko_opcao_id    uuid;   -- matched knockout option id (NULL if no knockout fired)
  v_ko_texto       text;   -- matched knockout option text (diagnostic)
  v_status         public.status_candidatura;
  v_etapa          public.etapa_processo;
BEGIN
  -- 1) Insert candidatura. Etapa starts at 'inscricao' (D-11); the knockout sweep below either
  --    keeps it (rejection) or advances it to 'triagem' (survivor).
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
    'inscricao'::public.etapa_processo,
    p_curriculo_url,
    p_curriculo_nome,
    p_curriculo_size,
    now(),
    now()
  )
  RETURNING id INTO v_candidatura_id;

  -- 2) Batch insert respostas (one per element of p_respostas array) — UNCHANGED from Phase 4.
  --    resposta_opcoes is stored as a jsonb passthrough of option TEXT strings (e.g. ["Não"]),
  --    which is what the knockout sweep below joins on (texto-containment).
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
        v_resposta->'resposta_opcoes'  -- jsonb passthrough (option TEXT array)
      );
    END LOOP;
  END IF;

  -- 2.5) KNOCKOUT SWEEP (D-10 strategy A — texto-join, server-authoritative).
  --      Re-evaluate the candidate's stored answers against the knockout-tagged options.
  --      The join matches ONLY on tag='knockout' option TEXT — no trait/score/age is read
  --      anywhere (RNF-07a / D-05, structurally excluded by the predicate). Joining on opcao_id
  --      would silently never fire (Pitfall 1) — the form writes option TEXT, so we match
  --      r.resposta_opcoes @> to_jsonb(m.opcao_texto) (jsonb text containment).
  SELECT m.opcao_id, m.opcao_texto
    INTO v_ko_opcao_id, v_ko_texto
    FROM public.respostas_formulario r
    JOIN public.pergunta_opcao_metadata m ON m.pergunta_id = r.pergunta_id
   WHERE r.candidatura_id = v_candidatura_id
     AND m.tag = 'knockout'
     AND r.resposta_opcoes @> to_jsonb(m.opcao_texto)   -- text containment
   LIMIT 1;

  IF FOUND THEN
    -- KNOCKOUT branch (D-11/D-12/D-15): auto-reject in the same transaction.
    -- etapa_atual stays 'inscricao' (unchanged) → the Phase-6 avancar_etapa() trigger fires
    -- BEFORE UPDATE OF etapa_atual but its `IS NOT DISTINCT FROM` guard skips this UPDATE
    -- (etapa unchanged), so the explicit INSERT below is the ONLY history row (D-13, no
    -- double-write — asserted live by SMOKE-3).
    --
    -- Phase-25 (FUNIL-02): sanction this status→rejeitado for the guard_rejeicao_auditada
    -- trigger. etapa stays 'inscricao' → the guard's etapa branch does NOT cover it, so set
    -- the txn-local flag (is_local=true → SET LOCAL, auto-resets) so the knockout still
    -- auto-rejects under the new guard (CI-03). This is the ONLY new line vs 20260608000001.
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);

    UPDATE public.candidaturas
       SET status            = 'rejeitado'::public.status_candidatura,
           etapa_atual       = 'inscricao'::public.etapa_processo,
           motivo_rejeicao   = 'knockout_automatico',
           opcao_knockout_id = v_ko_opcao_id,
           feedback_rejeicao = 'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'  -- D-15 neutral, criterion never leaked
     WHERE id = v_candidatura_id;

    INSERT INTO public.historico_candidatura
      (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
    VALUES
      (v_candidatura_id, 'inscricao'::public.etapa_processo, 'inscricao'::public.etapa_processo,
       'knockout automático (Etapa 1)', NULL, true, now());

    v_status := 'rejeitado'::public.status_candidatura;
    v_etapa  := 'inscricao'::public.etapa_processo;
  ELSE
    -- SURVIVOR branch (Open Q3 resolution — RESOLVED LIVE in Phase 8 / SMOKE-2+SMOKE-3, 2026-06-08).
    -- The survivor UPDATE changes etapa_atual (inscricao → triagem), so the Phase-6 avancar_etapa()
    -- trigger (BEFORE UPDATE OF etapa_atual) FIRES and writes its OWN history row in the same txn.
    -- An EXPLICIT INSERT here (the originally-authored form) PLUS the trigger row produced TWO
    -- survivor history rows. To land EXACTLY ONE survivor row (D-13 no-double-write), we let the
    -- trigger own the single survivor row, passing etapa_justificativa so its criterio_texto is
    -- honest. Under service_role auth.uid() is NULL, so the trigger marks the row auto_rejeitado=true
    -- (Phase-6 semantics: "system/automatic write", NOT a rejection — status stays
    -- aguardando_resposta and etapa advances to triagem). No status→rejeitado here → the Phase-25
    -- guard does not fire on this branch.
    UPDATE public.candidaturas
       SET etapa_atual        = 'triagem'::public.etapa_processo,
           etapa_justificativa = 'inscrição concluída — encaminhado para triagem'
     WHERE id = v_candidatura_id;

    v_status := 'aguardando_resposta'::public.status_candidatura;
    v_etapa  := 'triagem'::public.etapa_processo;
  END IF;

  -- RETURN now carries status + etapa_atual so the EF/client can branch (D-16) on a knockout.
  RETURN jsonb_build_object(
    'candidatura_id', v_candidatura_id,
    'respostas_count', COALESCE(jsonb_array_length(p_respostas), 0),
    'status', v_status,
    'etapa_atual', v_etapa
  );
END;
$$;

COMMENT ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) IS
  'Phase 8 + Phase 25 / INSCR-04 + FUNIL-02: atomic INSERT candidatura + respostas_formulario, then '
  'a synchronous server-authoritative knockout sweep (texto-join @> to_jsonb(opcao_texto), tag=''knockout''). '
  'On a knockout match: PERFORM set_config(app.rejeicao_sancionada=on, is_local) to sanction the reject '
  'for the Phase-25 guard_rejeicao_auditada trigger (etapa stays inscricao → the guard''s etapa branch '
  'does not cover it), then status=rejeitado, etapa=inscricao, motivo_rejeicao=knockout_automatico, '
  'opcao_knockout_id set, neutral feedback_rejeicao, + exactly one historico_candidatura row '
  '(auto_rejeitado=true, ator NULL). Survivors advance to triagem. On UNIQUE violation '
  '(candidato_id+vaga_id), throws — caller maps to DUPLICATE_CANDIDATURA.';

REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) TO service_role;
