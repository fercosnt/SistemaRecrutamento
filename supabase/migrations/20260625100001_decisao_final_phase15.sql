-- =============================================================================
-- Migration: Phase 15 — Decisão Final auditável + LGPD Art. 20 (4 SECURITY DEFINER RPCs)
-- Date: 2026-06-25
-- Phase: 15 (decis-o-final-audit-vel-lgpd-art-20)
-- Requirement: DECISAO-03 / DECISAO-04 / LGPD-03 (+ LGPD-02 structural guardrail)
-- =============================================================================
--
-- PURPOSE
-- The decisao_final + bias_audit_log tables block ALL client writes (decisao_final
-- has `FOR INSERT WITH CHECK (false)` + no client UPDATE policy; bias_audit_log has
-- no client write policy). These 4 SECURITY DEFINER RPCs are therefore the ONLY
-- writers, each authorizing BEFORE it writes:
--
--   (1) registrar_decisao(candidatura, decisao, justificativa) — DECISAO-03
--       RH-authorize (role IN rh/administrador; rh must own vagas.created_by;
--       administrador bypasses). UPSERTs the CURRENT decisao_final row
--       (ON CONFLICT(candidatura_id) — Open Q2 rec a: one current row, amendment
--       history lives in historico_candidatura via the avancar_etapa() trigger).
--       por_usuario := auth.uid() ALWAYS (the LGPD-02 guardrail — a decision with
--       no human actor is structurally unrepresentable). Terminal map (Pitfall 5):
--       aprovado→etapa_atual='aprovado', rejeitado→'rejeitado', em_espera→NO change.
--       The candidaturas UPDATE fires avancar_etapa() which writes the ONE
--       historico_candidatura audit row same-txn — we do NOT manual-INSERT it
--       (Phase-8 survivor double-write lesson).
--
--   (2) solicitar_revisao_decisao(candidatura) — DECISAO-04 / LGPD Art. 20
--       Candidate own-row (candidatos.user_id=auth.uid()). Requires a
--       decisao='rejeitado' row exists (reachability — Pitfall 6). Idempotent set
--       of revisao_solicitada_em (does NOT overwrite an existing request).
--
--   (3) stamp_explicacao_acessada(candidatura) — DECISAO-04 / LGPD Art. 20
--       Candidate own-row. Stamps explicacao_solicitada_em on FIRST access only
--       (COALESCE — evidence of transparency provision).
--
--   (4) gerar_bias_snapshot(periodo) — LGPD-03 / EEOC 4/5 adverse-impact
--       Admin-only. Derives age server-side (date_part('year', age(data_nascimento)))
--       from candidatos joined through candidaturas that HAVE a decisao_final row
--       (applicants := has decisao_final; selected := decisao='aprovado' — Open Q4
--       rec). Buckets into age bands; per band computes applicants/selected/
--       selection_rate; reference_band = highest rate; razao_4_5 = rate/ref_rate;
--       flag = razao_4_5 < 0.8. Inserts ONE bias_audit_log row with BANDED
--       AGGREGATES ONLY (no per-candidate rows; age never persisted per-row).
--       AGE-ONLY by design — race/gender NOT collected (LGPD-01 minimization),
--       documented honestly in dados.limitacao.
--
-- INVARIANT (RNF-07a): no path here auto-rejects or auto-decides. registrar_decisao
-- requires an explicit human actor (por_usuario NOT NULL); the bias snapshot is a
-- read-only aggregate that NEVER touches candidaturas. The consolidated/aggregate
-- numbers are advisory; the human always decides.
--
-- AUTHZ idiom (Phase-6 proof): auth.uid() / auth.jwt() read the request.jwt GUC and
-- survive SECURITY DEFINER. SET search_path = '' on every DEFINER function. The RH
-- guard mirrors confirmar_revisao_entrevista (20260625000001:235-245); the candidate
-- own-row guard mirrors pontuar_cognitivo (20260625000001:91-103).
--
-- IDEMPOTENCY: CREATE OR REPLACE FUNCTION on all four. Re-runnable.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). These
-- are PL/pgSQL $$ bodies + adjacent REVOKE/GRANT → the canonical 42601-risk shape.
-- AUTHORED-NOT-APPLIED: the orchestrator applies this LIVE via Supabase MCP
-- apply_migration (Plan 15-06 [BLOCKING]) AFTER the executor returns, with the
-- user's authorization. NOT applied here; NOT pushed; types NOT regenerated here.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 1 — registrar_decisao : RH-authorize + terminal transition (DECISAO-03)
-- ─────────────────────────────────────────────────────────────────────────────
-- The ONLY writer of decisao_final (client INSERT blocked WITH CHECK(false), no
-- client UPDATE policy). por_usuario := auth.uid() is the structural LGPD-02
-- guardrail. UPSERT the current decision row; the audit trail (every transition)
-- lives in historico_candidatura via avancar_etapa() — so an amendment is still
-- auditable while the UNIQUE(candidatura_id) is respected (Open Q2 rec a).
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

  -- (3) UPSERT the CURRENT decisao_final row (Open Q2 rec a — one current row;
  --     amendment history lives in historico_candidatura via the trigger below).
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

  -- (4) Terminal funnel transition (Pitfall 5): map ONLY aprovado/rejeitado to
  --     etapa_atual. em_espera writes the decision row but leaves etapa_atual as-is
  --     (decisao_final_resultado has em_espera; etapa_processo does NOT). The
  --     candidaturas UPDATE fires avancar_etapa() which writes the ONE
  --     historico_candidatura audit row same-txn — do NOT manual-INSERT it here
  --     (Phase-8 survivor double-write lesson). ator = auth.uid() (GUC, survives DEFINER).
  IF p_decisao = 'aprovado' THEN
    UPDATE public.candidaturas SET etapa_atual = 'aprovado' WHERE id = p_candidatura_id;
  ELSIF p_decisao = 'rejeitado' THEN
    UPDATE public.candidaturas SET etapa_atual = 'rejeitado' WHERE id = p_candidatura_id;
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
  'Phase 15 / DECISAO-03: captura a decisao final de RH (aprovado/rejeitado/em_espera) gravando '
  'decisao_final (UNICO writer — client INSERT bloqueado WITH CHECK(false)). por_usuario := auth.uid() '
  'SEMPRE (guardrail estrutural LGPD-02 — nenhuma decisao persiste sem ator humano). UPSERT da linha '
  'corrente via ON CONFLICT(candidatura_id); historico de emendas vive em historico_candidatura via '
  'o trigger avancar_etapa (Open Q2 rec a). Mapa terminal: aprovado/rejeitado -> candidaturas.etapa_atual '
  '(dispara avancar_etapa, escreve UMA row de auditoria); em_espera NAO muda etapa. SECURITY DEFINER + '
  'search_path=''''; guard: role IN (rh,administrador), rh deve possuir a vaga (vagas.created_by=auth.uid()), '
  'administrador bypassa, senao insufficient_privilege. NUNCA auto-decide, NUNCA INSERT manual em '
  'historico_candidatura (RNF-07a). RETORNA a row. GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 2 — solicitar_revisao_decisao : candidate own-row (DECISAO-04 / LGPD Art.20)
-- ─────────────────────────────────────────────────────────────────────────────
-- The candidate requests a human review of their rejection. Own-row guard via
-- candidatos.user_id=auth.uid() (mirror pontuar_cognitivo :91-103). Reachability:
-- only when a decisao='rejeitado' row exists (Pitfall 6). Idempotent: does NOT
-- overwrite an existing revisao_solicitada_em. RETURNS the updated row (readback).
CREATE OR REPLACE FUNCTION public.solicitar_revisao_decisao(
  p_candidatura_id uuid
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns boolean;
  v_row  public.decisao_final;
BEGIN
  -- (1) Candidate own-row guard (NEVER candidato_id===user.id; via candidatos.user_id).
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (2) Reachability (Pitfall 6): a revision is only meaningful after a rejection.
  IF NOT EXISTS (
    SELECT 1 FROM public.decisao_final
     WHERE candidatura_id = p_candidatura_id
       AND decisao = 'rejeitado'
  ) THEN
    RAISE EXCEPTION 'revisao indisponivel: nao ha decisao rejeitada para esta candidatura'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (3) Idempotent set — do NOT overwrite an existing request (preserve the first
  --     request timestamp). RETURN the row so the client asserts the marker landed.
  UPDATE public.decisao_final
     SET revisao_solicitada_em = now()
   WHERE candidatura_id = p_candidatura_id
     AND revisao_solicitada_em IS NULL;

  SELECT * INTO v_row
    FROM public.decisao_final
   WHERE candidatura_id = p_candidatura_id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_revisao_decisao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_revisao_decisao(uuid) TO authenticated;

COMMENT ON FUNCTION public.solicitar_revisao_decisao(uuid) IS
  'Phase 15 / DECISAO-04 (LGPD Art. 20): o candidato solicita revisao por pessoa natural da sua '
  'decisao. Seta decisao_final.revisao_solicitada_em (idempotente — nao sobrescreve um pedido '
  'existente). SECURITY DEFINER + search_path=''''; guard: candidato dono via '
  'candidatos.user_id=auth.uid(), senao 42501. Reachability: exige uma decisao=''rejeitado'' '
  '(Pitfall 6), senao no_data_found. NAO grava candidaturas, NAO muda etapa. RETORNA a row '
  '(readback). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 3 — stamp_explicacao_acessada : candidate own-row (DECISAO-04 / LGPD Art.20)
-- ─────────────────────────────────────────────────────────────────────────────
-- Stamps explicacao_solicitada_em on FIRST access (evidence of transparency
-- provision). Same candidate own-row guard. COALESCE → first-access only. Idempotent.
CREATE OR REPLACE FUNCTION public.stamp_explicacao_acessada(
  p_candidatura_id uuid
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owns boolean;
  v_row  public.decisao_final;
BEGIN
  -- (1) Candidate own-row guard (via candidatos.user_id=auth.uid()).
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (2) Stamp first-access only (COALESCE preserves the original access timestamp).
  UPDATE public.decisao_final
     SET explicacao_solicitada_em = COALESCE(explicacao_solicitada_em, now())
   WHERE candidatura_id = p_candidatura_id
  RETURNING * INTO v_row;

  -- A candidate with no decisao_final row → nothing to stamp (returns NULL row).
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_explicacao_acessada(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stamp_explicacao_acessada(uuid) TO authenticated;

COMMENT ON FUNCTION public.stamp_explicacao_acessada(uuid) IS
  'Phase 15 / DECISAO-04 (LGPD Art. 20): marca decisao_final.explicacao_solicitada_em no PRIMEIRO '
  'acesso do candidato a pagina de explicacao (COALESCE — evidencia de provimento da transparencia). '
  'SECURITY DEFINER + search_path=''''; guard: candidato dono via candidatos.user_id=auth.uid(), senao '
  '42501. NAO grava candidaturas, NAO muda etapa, NAO expoe score/banda (RNF-07a/LGPD-04). RETORNA a '
  'row (readback). GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC 4 — gerar_bias_snapshot : admin-only EEOC 4/5 age-band snapshot (LGPD-03)
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin-triggered. Derives age server-side; bands the applicant cohort (has a
-- decisao_final row); per band computes selection_rate; reference_band = highest
-- rate; razao_4_5 = rate/ref_rate; flag = razao_4_5 < 0.8 (the four-fifths rule).
-- Inserts ONE bias_audit_log row with BANDED AGGREGATES ONLY (no per-candidate
-- rows; age never persisted per-row). AGE-ONLY — race/gender NOT collected (LGPD-01).
CREATE OR REPLACE FUNCTION public.gerar_bias_snapshot(
  p_periodo text
)
RETURNS public.bias_audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role        text;
  v_ref_rate    numeric := 0;
  v_ref_band    text;
  v_n_total     int := 0;
  v_excluidos   int := 0;
  v_small       boolean := false;
  v_bands       jsonb := '[]'::jsonb;
  v_dados       jsonb;
  v_row         public.bias_audit_log;
  r             record;
BEGIN
  -- (1) Admin-only guard (Pitfall — non-admin must NOT generate a bias snapshot).
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (2) Build the per-band aggregate over the APPLICANT cohort := candidaturas that
  --     HAVE a decisao_final row (Open Q4 rec). Age derived server-side via
  --     date_part('year', age(data_nascimento)) — NEVER a naive year subtraction
  --     (Pitfall 4). Bands: 18-24 / 25-34 / 35-44 / 45-54 / 55+. Null/invalid
  --     data_nascimento (or age < 18) is EXCLUDED and counted (Pitfall 4).
  CREATE TEMP TABLE _bias_cohort ON COMMIT DROP AS
  SELECT
    df.candidatura_id,
    (df.decisao = 'aprovado') AS selected,
    CASE
      WHEN ca.data_nascimento IS NULL THEN NULL
      ELSE date_part('year', age(ca.data_nascimento))::int
    END AS idade
  FROM public.decisao_final df
  JOIN public.candidaturas c ON c.id = df.candidatura_id
  JOIN public.candidatos  ca ON ca.id = c.candidato_id;

  -- Excluded = null/invalid birthdate (or age below the youngest band floor).
  SELECT count(*) INTO v_excluidos
    FROM _bias_cohort
   WHERE idade IS NULL OR idade < 18;

  -- Per-band applicants / selected / selection_rate over the valid-age cohort.
  CREATE TEMP TABLE _bias_bands ON COMMIT DROP AS
  SELECT
    band.faixa,
    count(*) FILTER (WHERE band.idade IS NOT NULL)            AS applicants,
    count(*) FILTER (WHERE band.idade IS NOT NULL AND band.selected) AS selected
  FROM (
    SELECT
      selected,
      idade,
      CASE
        WHEN idade BETWEEN 18 AND 24 THEN '18-24'
        WHEN idade BETWEEN 25 AND 34 THEN '25-34'
        WHEN idade BETWEEN 35 AND 44 THEN '35-44'
        WHEN idade BETWEEN 45 AND 54 THEN '45-54'
        WHEN idade >= 55              THEN '55+'
        ELSE NULL
      END AS faixa
    FROM _bias_cohort
    WHERE idade IS NOT NULL AND idade >= 18
  ) band
  WHERE band.faixa IS NOT NULL
  GROUP BY band.faixa;

  SELECT COALESCE(sum(applicants), 0) INTO v_n_total FROM _bias_bands;

  -- (3) reference_band = the band with the HIGHEST selection_rate (EEOC).
  SELECT faixa,
         CASE WHEN applicants > 0 THEN selected::numeric / applicants ELSE 0 END
    INTO v_ref_band, v_ref_rate
    FROM _bias_bands
   WHERE applicants > 0
   ORDER BY (selected::numeric / applicants) DESC, faixa ASC
   LIMIT 1;

  -- small_sample_warning when ANY band has applicants < 30 (Pitfall 3).
  SELECT EXISTS (SELECT 1 FROM _bias_bands WHERE applicants < 30) INTO v_small;

  -- (4) Build the self-describing bands[] jsonb with razao_4_5 + flag per band.
  --     Bands ordered by the canonical age order for a readable snapshot.
  FOR r IN
    SELECT
      b.faixa,
      b.applicants,
      b.selected,
      CASE WHEN b.applicants > 0 THEN round(b.selected::numeric / b.applicants, 4) ELSE NULL END AS selection_rate
    FROM _bias_bands b
    ORDER BY array_position(ARRAY['18-24','25-34','35-44','45-54','55+'], b.faixa)
  LOOP
    v_bands := v_bands || jsonb_build_object(
      'faixa', r.faixa,
      'applicants', r.applicants,
      'selected', r.selected,
      'selection_rate', r.selection_rate,
      'razao_4_5',
        CASE
          WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
            THEN round(r.selection_rate / v_ref_rate, 4)
          ELSE NULL
        END,
      'flag',
        CASE
          WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
            THEN (r.selection_rate / v_ref_rate) < 0.8
          ELSE false
        END
    );
  END LOOP;

  -- (5) Self-describing dados jsonb — banded aggregates ONLY (NO per-candidate rows;
  --     age never persisted per-row). Honest AGE-ONLY limitation (LGPD-01).
  v_dados := jsonb_build_object(
    'metodo', 'eeoc_4_5_age_band_v1',
    'limitacao', 'apenas faixa etária — raça/gênero não coletados (LGPD-01)',
    'populacao', jsonb_build_object(
      'definicao_applicants', 'tem decisao_final',
      'definicao_selected', 'decisao=''aprovado'''
    ),
    'faixa_referencia', v_ref_band,
    'bands', v_bands,
    'n_total', v_n_total,
    'small_sample_warning', v_small,
    'excluidos_sem_data', v_excluidos
  );

  -- (6) Insert ONE bias_audit_log row (banded aggregates only). RETURN it.
  INSERT INTO public.bias_audit_log (periodo, dados)
  VALUES (p_periodo, v_dados)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_bias_snapshot(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_bias_snapshot(text) TO authenticated;

COMMENT ON FUNCTION public.gerar_bias_snapshot(text) IS
  'Phase 15 / LGPD-03: gera UM snapshot de adverse-impact por FAIXA ETARIA (regra 4/5 EEOC) e grava '
  'UMA linha em bias_audit_log(periodo, dados) com AGREGADOS POR FAIXA APENAS (sem rows por candidato; '
  'idade nunca persistida por-row). applicants := tem decisao_final; selected := decisao=''aprovado'' '
  '(Open Q4). Idade derivada server-side via date_part(''year'', age(data_nascimento)) (Pitfall 4); '
  'faixa_referencia = maior selection_rate; razao_4_5 = rate/ref_rate; flag = razao_4_5 < 0.8; '
  'small_sample_warning quando alguma faixa < 30 (Pitfall 3); excluidos_sem_data contados. AGE-ONLY '
  'por design — raça/gênero NAO coletados (LGPD-01). SECURITY DEFINER + search_path=''''; guard: '
  'role=''administrador'' apenas, senao insufficient_privilege. NAO grava candidaturas (RNF-07a). '
  'RETORNA a row inserida. GRANT EXECUTE TO authenticated (REVOKE FROM PUBLIC).';
