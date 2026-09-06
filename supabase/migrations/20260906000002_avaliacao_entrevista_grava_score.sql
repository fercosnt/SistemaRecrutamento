-- 20260906000002 — salvar_avaliacao_entrevista passa a gravar o score humano em
-- scores_candidato (tipo='entrevista', status='sucesso').
--
-- Achado no E3/E4 do guia de validação (2026-09-06): a nota humana da entrevista ficava
-- SÓ em entrevista_analises.scores_humanos. O consolidar-decisao-final lê
-- scores_candidato tipo='entrevista' e só pondera com status='sucesso' e score/score_max
-- preenchidos — que NADA escrevia: a EF de transcrição grava a linha como
-- pendente_humano com score NULL e esta RPC não tocava a tabela. Resultado: o peso
-- «entrevista» de TODA vaga era sempre N/A na decisão final (o «Open Q1» anotado no
-- consolidador nunca fechou), e o agregado renormalizava só sobre SJT + redação.
--
-- Conserto: após confirmar a análise, a RPC faz UPSERT da linha de entrevista com
-- score = média das notas humanas (escala BARS 1–5), score_max = 5, status = 'sucesso',
-- preservando no metadata o que a IA já tinha gravado (competencias, recommendation,
-- bloqueio). A unique (candidatura_id, tipo, subtipo, pergunta_id) NULLS NOT DISTINCT
-- garante que o ON CONFLICT casa com a linha pendente_humano que a EF criou.
--
-- Aplicar pela Management API com o SQL lido do arquivo (p46apply.cjs migrate).
-- Sem BEGIN/COMMIT externo — a requisição já é uma transação.

CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(
  p_candidatura_id uuid,
  p_scores_humanos jsonb,
  p_notas text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_analise_id uuid;
  v_media      numeric;
  v_n          integer;
BEGIN
  SELECT ea.id, v.created_by
    INTO v_analise_id, v_vaga_owner
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.candidatura_id = p_candidatura_id
   ORDER BY ea.created_at DESC
   LIMIT 1;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada para a candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- Média das notas humanas (BARS 1–5). Só valores numéricos contam; um objeto sem
  -- nenhuma nota numérica é erro de contrato do cliente, não um score zero.
  SELECT avg(kv.v::numeric), count(*)
    INTO v_media, v_n
    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)
   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'
     AND kv.v::numeric BETWEEN 1 AND 5;

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET scores_humanos        = p_scores_humanos,
         notas_humanas         = p_notas,
         revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid()),
         status_analise        = 'concluida'
   WHERE id = v_analise_id;

  -- A linha que o consolidador pondera. status='sucesso' SÓ nasce aqui, pela mão humana
  -- (RNF-07a): a EF de IA deixa pendente_humano e score NULL.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'entrevista', NULL, NULL, round(v_media, 2), 5, 'sucesso',
     jsonb_build_object(
       'scores_humanos', p_scores_humanos,
       'analise_id', v_analise_id,
       'confirmado_por', (select auth.uid()),
       'fonte', 'salvar_avaliacao_entrevista'))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
    SET score      = EXCLUDED.score,
        score_max  = EXCLUDED.score_max,
        status     = 'sucesso',
        metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'analise_id', v_analise_id,
    'candidatura_id', p_candidatura_id,
    'score_entrevista', round(v_media, 2),
    'score_max', 5);
END;
$function$;

COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) IS
  'Confirma a análise de entrevista (entrevista_analises: scores_humanos, notas, revisao_confirmada_em, '
  'status concluida) E grava o score humano em scores_candidato tipo=entrevista (media BARS 1-5, '
  'score_max 5, status sucesso) — a unica origem do status sucesso dessa linha (RNF-07a). Antes de '
  '2026-09-06 nao tocava scores_candidato e o peso entrevista era sempre N/A na decisao final.';

-- Portão: a definição instalada tem de conter o upsert (falha alto se a função não subiu inteira).
DO $$
BEGIN
  IF position('ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)' IN
              pg_get_functiondef('public.salvar_avaliacao_entrevista(uuid, jsonb, text)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'salvar_avaliacao_entrevista instalada sem o upsert em scores_candidato';
  END IF;
END $$;
