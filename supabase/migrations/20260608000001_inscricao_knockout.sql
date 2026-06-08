-- =============================================================================
-- Migration: inscricao & knockout (Etapa 1) — columns + submit_candidatura_atomic
--            knockout sweep + publish_vaga qualificacao_etapa1 snapshot/gate
-- Date: 2026-06-08
-- Phase: 08 (inscri-o-knock-out-etapa-1)
-- Requirement: INSCR-02, INSCR-03, INSCR-04, LGPD-01
--   (D-05, D-06, D-07, D-08, D-10, D-11, D-12, D-13, D-15, D-16)
-- DEPENDS ON: 20260425000003 (submit_candidatura_atomic), 20260607010004 (publish_vaga),
--             20260607000001 (historico_candidatura), 20260607010001 (pergunta_opcao_metadata),
--             20260607010002 (vagas.* jsonb columns)
-- =============================================================================
--
-- PURPOSE
-- The core DB layer of Phase 8. One migration that:
--   (1) adds candidaturas.motivo_rejeicao (text) + candidaturas.opcao_knockout_id (uuid)
--       + a partial index, and vagas.qualificacao_etapa1 (jsonb), and relaxes candidatos.cpf
--       to nullable (D-02);
--   (2) extends submit_candidatura_atomic with a SYNCHRONOUS knockout sweep (texto-join,
--       D-10 strategy A) that auto-rejects in the same transaction + writes exactly one
--       honest audit row, while survivors advance to triagem;
--   (3) extends publish_vaga to write the derived qualificacao_etapa1 snapshot (D-07) and
--       enforce the <=10-perguntas / <=1-aberta server gate (D-09).
--
-- The auto-rejection must be atomic, synchronous, server-authoritative (a crafted client
-- payload cannot self-approve — the sweep re-evaluates answers server-side against
-- pergunta_opcao_metadata) and auditable. The knockout is an OBJECTIVE criterion
-- (presencial/specialty) — no trait/score/age participates (RNF-07a / D-05): the sweep
-- matches ONLY on tag='knockout' option text, structurally excluding any data_nascimento /
-- genero / score read.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps each
-- migration in its own implicit transaction; an outer BEGIN/COMMIT combined with the `$$ ... $$`
-- PL/pgSQL body + adjacent COMMENT/REVOKE/GRANT breaks the prepared-statement boundary parser
-- and raises SQLSTATE 42601 at push time (CLAUDE.md §Commands / D-22). If `supabase db push`
-- fails with 42601, apply via the D-22 SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260608000001`.
-- =============================================================================


-- =============================================================================
-- (1) DDL — new columns + partial index + CPF nullable (D-02, D-12)
-- =============================================================================

-- candidaturas: rejection-reason marker + matched knockout option (logical FK → pergunta_opcao_metadata.opcao_id).
-- motivo_rejeicao is `text` (Open Q2 resolution: text, not enum — Phase 15 adds human-rejection
-- motives; the starter value is 'knockout_automatico'). feedback_rejeicao is REUSED (already exists
-- on candidaturas) for the candidate-facing neutral message — no new message column.
ALTER TABLE public.candidaturas
  ADD COLUMN IF NOT EXISTS motivo_rejeicao   text,
  ADD COLUMN IF NOT EXISTS opcao_knockout_id uuid;

CREATE INDEX IF NOT EXISTS idx_candidaturas_knockout
  ON public.candidaturas (opcao_knockout_id) WHERE opcao_knockout_id IS NOT NULL;

COMMENT ON COLUMN public.candidaturas.motivo_rejeicao IS
  'Phase 8 / D-12: rejection-reason marker (text, not enum — Phase 15 will add human-rejection motives). '
  'Starter value: ''knockout_automatico'' (set by the submit_candidatura_atomic knockout sweep).';
COMMENT ON COLUMN public.candidaturas.opcao_knockout_id IS
  'Phase 8 / D-12: the matched knockout option (logical FK → pergunta_opcao_metadata.opcao_id). '
  'Server-side audit only — NEVER returned to the candidate UI (LGPD: never leaks the criterion).';

-- vagas: derived Etapa-1 qualification snapshot, written at publish (D-07).
ALTER TABLE public.vagas
  ADD COLUMN IF NOT EXISTS qualificacao_etapa1 jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.vagas.qualificacao_etapa1 IS
  'Phase 8 / D-07: derived Etapa-1 qualification snapshot (perguntas + pergunta_opcao_metadata) '
  'written by publish_vaga at the rascunho->ativa transition. Read-only projection; the source of '
  'truth remains perguntas_formulario + pergunta_opcao_metadata.';

-- candidatos.cpf → nullable (D-02). [VERIFY LIVE — A2 / Task 2]: inspect the live `check_cpf_format`
-- CHECK predicate FIRST via Supabase MCP execute_sql. If that CHECK rejects NULL (e.g. `cpf ~ '^...'`
-- with no NULL tolerance), Task 2 must DROP + re-ADD it in the NULL-tolerant form
-- `cpf IS NULL OR <existing predicate>`. Do NOT drop the cpf column (reversible).
ALTER TABLE public.candidatos ALTER COLUMN cpf DROP NOT NULL;

-- [VERIFY LIVE — A2 / Task 2] conditional CHECK relax — RUN ONLY IF the live `check_cpf_format`
-- predicate rejects NULL. The exact existing predicate is read from PROD in Task 2; the form below
-- is the NULL-tolerant wrapper to apply (substitute <existing predicate> with the live body):
--
--   ALTER TABLE public.candidatos DROP CONSTRAINT IF EXISTS check_cpf_format;
--   ALTER TABLE public.candidatos
--     ADD CONSTRAINT check_cpf_format CHECK (cpf IS NULL OR <existing predicate>);
--
-- If the live CHECK already tolerates NULL (Postgres CHECK constraints pass on NULL by default
-- unless the predicate forces a comparison), no DROP/ADD is needed — leave it untouched.


-- =============================================================================
-- (2) submit_candidatura_atomic — synchronous knockout sweep (D-10, D-11, D-13, D-15)
-- =============================================================================
-- Copy the existing signature / DEFINER / search_path / grants exactly. Changes vs. Phase 4:
--   - the initial INSERT sets etapa_atual='inscricao' (was 'triagem');
--   - the respostas loop is UNCHANGED (resposta_opcoes stays a jsonb passthrough of option TEXT);
--   - after the loop, a knockout sweep runs (texto-join @> to_jsonb(opcao_texto)) and either
--     auto-rejects (D-11: status=rejeitado, etapa=inscricao) + writes one audit row (D-13), or
--     advances the survivor to triagem with one honest audit row;
--   - the RETURN jsonb now includes 'status' and 'etapa_atual' so the EF/client can branch (D-16).
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
    -- SURVIVOR branch (Open Q3 resolution — RESOLVED LIVE in Task 2 / SMOKE-2+SMOKE-3, 2026-06-08).
    -- The survivor UPDATE changes etapa_atual (inscricao → triagem), so the Phase-6 avancar_etapa()
    -- trigger (BEFORE UPDATE OF etapa_atual) FIRES and writes its OWN history row in the same txn.
    -- An EXPLICIT INSERT here (the originally-authored form) PLUS the trigger row produced TWO
    -- survivor history rows (confirmed live: 1× auto_rejeitado=false explicit + 1× auto_rejeitado=true
    -- trigger). To land EXACTLY ONE survivor row (D-13 no-double-write), we DROP the explicit INSERT
    -- and let the trigger own the single survivor row, passing etapa_justificativa so its
    -- criterio_texto is honest. Under service_role auth.uid() is NULL, so the trigger marks the row
    -- auto_rejeitado=true — which the Phase-6 trigger semantics define as "system/automatic write"
    -- (NOT a rejection: the candidatura status stays aguardando_resposta and etapa advances to
    -- triagem). This is the OR-branch of the plan's documented resolution
    -- ("set candidaturas.etapa_justificativa so the trigger row is the single honest record").
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
  'Phase 8 / INSCR-04 (D-10/D-11/D-13/D-15): atomic INSERT candidatura + respostas_formulario, then '
  'a synchronous server-authoritative knockout sweep (texto-join @> to_jsonb(opcao_texto), tag=''knockout''). '
  'On a knockout match: status=rejeitado, etapa=inscricao, motivo_rejeicao=knockout_automatico, '
  'opcao_knockout_id set, neutral feedback_rejeicao, + exactly one historico_candidatura row '
  '(auto_rejeitado=true, ator NULL). Survivors advance to triagem. On UNIQUE violation '
  '(candidato_id+vaga_id), throws — caller maps to DUPLICATE_CANDIDATURA.';

REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) TO service_role;


-- =============================================================================
-- (3) publish_vaga — qualificacao_etapa1 snapshot (D-07) + <=10/<=1-aberta gate (D-09)
-- =============================================================================
-- Copy the existing body, keep all 3 D-12 checks, then ADD: (a) the D-09 server gate
-- (>10 Etapa-1 perguntas OR >1 open-ended → RAISE P0001); (b) build + persist the derived
-- qualificacao_etapa1 snapshot BEFORE the rascunho→ativa UPDATE. Authorization-in-body +
-- REVOKE/GRANT authenticated preserved.
CREATE OR REPLACE FUNCTION public.publish_vaga(
  p_vaga_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role              text;
  v_status            public.status_vaga;
  v_pesos             jsonb;
  v_testes            jsonb;
  v_soma              int;
  v_tem_obrigatorio   boolean;
  v_knockout_invalido boolean;
  v_qtd_perguntas     int;
  v_qtd_abertas       int;
  v_qualificacao      jsonb;
  v_updated           int;
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
    RAISE EXCEPTION 'Os pesos de avaliacao precisam somar 100%% (soma atual: %).', v_soma
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

  -- D-09 server gate: at most 10 Etapa-1 perguntas, at most 1 open-ended pergunta.
  -- [FIXED LIVE — Task 2 / 22P02]: the tipo_resposta_pergunta enum has NO 'texto' value; the
  -- open-ended types are 'texto_curto' and 'texto_longo' (live enum:
  -- texto_curto|texto_longo|single_choice|multiple_choice|numerico). The original 'texto' literal
  -- threw 22P02 (invalid enum input) for ANY vaga with perguntas, breaking publish_vaga entirely.
  SELECT count(*),
         count(*) FILTER (WHERE p.tipo_resposta IN ('texto_curto', 'texto_longo'))
    INTO v_qtd_perguntas, v_qtd_abertas
    FROM public.perguntas_formulario p
   WHERE p.vaga_id = p_vaga_id;

  IF v_qtd_perguntas > 10 THEN
    RAISE EXCEPTION 'A Etapa 1 pode ter no maximo 10 perguntas (atual: %).', v_qtd_perguntas
      USING errcode = 'P0001';
  END IF;
  IF v_qtd_abertas > 1 THEN
    RAISE EXCEPTION 'A Etapa 1 pode ter no maximo 1 pergunta aberta (atual: %).', v_qtd_abertas
      USING errcode = 'P0001';
  END IF;

  -- Build the derived qualificacao_etapa1 snapshot (D-07): the Etapa-1 perguntas + their
  -- pergunta_opcao_metadata, projected into a jsonb array. tem_knockout flags a pergunta that
  -- carries any tag='knockout' option. opcoes is the per-pergunta option list (id/texto/tag/peso).
  SELECT COALESCE(jsonb_agg(q ORDER BY q.ordem, q.pergunta_id), '[]'::jsonb)
    INTO v_qualificacao
    FROM (
      SELECT
        p.id                              AS pergunta_id,
        p.texto_pergunta                  AS texto_pergunta,
        p.tipo_resposta                   AS tipo_resposta,
        p.obrigatoria                     AS obrigatoria,
        p.ordem                           AS ordem,
        EXISTS (
          SELECT 1 FROM public.pergunta_opcao_metadata mk
           WHERE mk.pergunta_id = p.id AND mk.tag = 'knockout'
        )                                 AS tem_knockout,
        COALESCE((
          SELECT jsonb_agg(
                   jsonb_build_object(
                     'opcao_id', m.opcao_id,
                     'texto',    m.opcao_texto,
                     'tag',      m.tag,
                     'peso',     m.peso
                   )
                   ORDER BY m.ordem
                 )
            FROM public.pergunta_opcao_metadata m
           WHERE m.pergunta_id = p.id
        ), '[]'::jsonb)                   AS opcoes
      FROM public.perguntas_formulario p
     WHERE p.vaga_id = p_vaga_id
    ) AS q;

  -- Persist the snapshot in the same RPC (before the publish transition).
  UPDATE public.vagas
     SET qualificacao_etapa1 = v_qualificacao
   WHERE id = p_vaga_id;

  -- All gates pass -> transition rascunho -> ativa (Pitfall 5).
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
  'Phase 8 / D-07 + D-09 (extends Phase 7 D-12 gate): server-side publish gate. Re-checks the 3 '
  'D-12 conditions (pesos sum=100, >=1 teste obrigatorio, no knockout option on a non-obrigatoria '
  'pergunta), then enforces the Etapa-1 D-09 limits (<=10 perguntas, <=1 pergunta aberta), writes '
  'the derived qualificacao_etapa1 snapshot, and transitions vaga rascunho->ativa. RH/admin only '
  '(checked in body). Called from the authenticated client.';

REVOKE ALL ON FUNCTION public.publish_vaga(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_vaga(uuid) TO authenticated;
