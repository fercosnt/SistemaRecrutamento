-- =============================================================================
-- Migration: salvar_revisao_redacao passa a gravar scores_candidato tipo='redacao'
-- Date: 2026-09-06 (E4/E5 do guia de validação)
-- =============================================================================
-- Irmã da 20260906000002 (entrevista) — MESMO defeito de forma, achado ao varrer os
-- três pesos do consolidar-decisao-final em vez de só o que falhou:
--
--   work_sample_sjt  ← scores_candidato tipo='sjt'        · pontuar_sjt ESCREVE      ✓
--   redacao_cultural ← scores_candidato tipo='redacao'    · NINGUÉM ESCREVIA         ✗
--   entrevista       ← scores_candidato tipo='entrevista' · ninguém escrevia (…0002) ✗
--
-- A EF avaliar-redacao-cultural grava só `redacoes_candidato`, e a RPC de revisão
-- humana também. MEDIDO na T1: redação aprovada em 06/09 02:22 com score ponderado
-- 100, quatro dimensões 5/5 — e NENHUMA linha em scores_candidato. Dos três pesos da
-- decisão final, dois eram sempre N/A e o agregado renormalizava só sobre o SJT.
--
-- Escala (espelha `_local/compute-score.ts:28`, a autoridade da EF):
--   média das dimensões válidas × 20 → 0..100; cap 30 se red_flag_etico; cap 50 se D1≤2.
-- Notas: `scores_humanos` quando o revisor mexeu nos sliders; senão `scores_dimensao`
-- (a sugestão da IA que ele confirmou ao aprovar sem alterar) — a origem fica no
-- metadata, nunca inferida depois.
--
-- `duvida` NÃO grava: a revisão não concluiu (a própria RPC preserva status_analise
-- nesse caso). `reprovado` GRAVA — a nota é a nota; rejeitar é uma decisão de funil à
-- parte (RNF-07a: o sistema nunca rejeita por score).
--
-- Uma linha por candidatura (subtipo/pergunta_id NULL): agrega por MÉDIA as redações
-- culturais revisadas dela. Hoje é sempre uma (`eh_pergunta_padrao`), mas a média não
-- depende de ordem — ao contrário do "primeira linha por tipo" que o consolidador faz.
--
-- Aplicar pela Management API com o SQL lido do arquivo (p46apply.cjs migrate).
-- Sem BEGIN/COMMIT externo — a requisição já é uma transação.
-- =============================================================================

-- Score 0..100 de UMA redação, a partir das notas que valem (humanas > IA confirmada).
CREATE OR REPLACE FUNCTION public.redacao_score_0_100(p_redacao_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_notas   jsonb;
  v_media   numeric;
  v_d1      numeric;
  v_score   numeric;
  v_red_flag boolean;
BEGIN
  SELECT CASE
           WHEN r.scores_humanos IS NOT NULL
                AND jsonb_typeof(r.scores_humanos) = 'object'
                AND r.scores_humanos <> '{}'::jsonb
             THEN r.scores_humanos
           ELSE r.scores_dimensao
         END,
         coalesce(r.red_flag_etico, false)
    INTO v_notas, v_red_flag
    FROM public.redacoes_candidato r
   WHERE r.id = p_redacao_id;

  IF v_notas IS NULL OR jsonb_typeof(v_notas) <> 'object' THEN
    RETURN NULL;
  END IF;

  SELECT avg(kv.v::numeric)
    INTO v_media
    FROM jsonb_each_text(v_notas) AS kv(k, v)
   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'
     AND kv.v::numeric BETWEEN 1 AND 5;

  IF v_media IS NULL THEN
    RETURN NULL;
  END IF;

  v_score := round(v_media * 20, 2);

  -- Caps de compute-score.ts, na MESMA ordem.
  IF v_red_flag THEN
    v_score := least(v_score, 30);
  END IF;

  v_d1 := NULLIF(v_notas ->> 'D1', '')::numeric;
  IF v_d1 IS NOT NULL AND v_d1 <= 2 THEN
    v_score := least(v_score, 50);
  END IF;

  RETURN v_score;
END;
$function$;

COMMENT ON FUNCTION public.redacao_score_0_100(uuid) IS
  'Score 0..100 de uma redacao cultural: media das dimensoes validas x 20, cap 30 com '
  'red_flag_etico, cap 50 com D1<=2 — espelha _local/compute-score.ts. Usa scores_humanos '
  'quando existem, senao scores_dimensao (sugestao da IA confirmada na aprovacao).';

-- Consolida as redações revisadas de UMA candidatura numa linha de scores_candidato.
CREATE OR REPLACE FUNCTION public.sincronizar_score_redacao(p_candidatura_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_score  numeric;
  v_n      integer;
  v_meta   jsonb;
BEGIN
  SELECT round(avg(public.redacao_score_0_100(r.id)), 2), count(*),
         jsonb_agg(jsonb_build_object(
           'redacao_id', r.id,
           'decisao_revisor', r.decisao_revisor,
           'classificacao_cor', r.classificacao_cor,
           'origem_notas', CASE
             WHEN r.scores_humanos IS NOT NULL
                  AND jsonb_typeof(r.scores_humanos) = 'object'
                  AND r.scores_humanos <> '{}'::jsonb
               THEN 'humano' ELSE 'ia_confirmada' END,
           'score_0_100', public.redacao_score_0_100(r.id)
         ) ORDER BY r.ordem, r.id)
    INTO v_score, v_n, v_meta
    FROM public.redacoes_candidato r
   WHERE r.candidatura_id = p_candidatura_id
     AND r.revisada_em IS NOT NULL
     AND r.decisao_revisor IN ('aprovado', 'reprovado')
     AND public.redacao_score_0_100(r.id) IS NOT NULL;

  IF coalesce(v_n, 0) = 0 OR v_score IS NULL THEN
    RETURN; -- nada revisado ainda: a linha pendente_humano (se houver) fica como está
  END IF;

  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'redacao', NULL, NULL, v_score, 100, 'sucesso',
     jsonb_build_object('redacoes', v_meta, 'fonte', 'sincronizar_score_redacao'))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
    SET score      = EXCLUDED.score,
        score_max  = EXCLUDED.score_max,
        status     = 'sucesso',
        metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
        updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.sincronizar_score_redacao(uuid) IS
  'Consolida as redacoes culturais REVISADAS de uma candidatura numa linha '
  'scores_candidato tipo=redacao (media 0..100, score_max 100, status sucesso) — a unica '
  'origem dessa linha, chamada por salvar_revisao_redacao. duvida nao entra.';

CREATE OR REPLACE FUNCTION public.salvar_revisao_redacao(
  p_redacao_id uuid,
  p_decisao text,
  p_notas text,
  p_scores_humanos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_found      boolean;
  v_candidatura_id uuid;
BEGIN
  SELECT v.created_by, true, r.candidatura_id
    INTO v_vaga_owner, v_found, v_candidatura_id
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE r.id = p_redacao_id;

  IF v_found IS NOT TRUE THEN
    RAISE EXCEPTION 'redacao % not found', p_redacao_id USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_decisao NOT IN ('aprovado', 'reprovado', 'duvida') THEN
    RAISE EXCEPTION 'decisao invalida' USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(p_notas) < 50 THEN
    RAISE EXCEPTION 'notas_revisor exige no minimo 50 caracteres' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.redacoes_candidato
     SET scores_humanos = p_scores_humanos,
         notas_revisor  = p_notas,
         decisao_revisor = p_decisao,
         revisada_por   = (select auth.uid()),
         revisada_em    = now(),
         status_analise = CASE
           WHEN p_decisao = 'duvida' THEN status_analise
           ELSE 'concluida'
         END
   WHERE id = p_redacao_id;

  -- 2026-09-06: a linha que o consolidar-decisao-final pondera. Antes disto o peso
  -- `redacao_cultural` era N/A em TODA vaga (ver cabeçalho da migration).
  PERFORM public.sincronizar_score_redacao(v_candidatura_id);

  RETURN jsonb_build_object('ok', true, 'redacao_id', p_redacao_id, 'decisao', p_decisao);
END;
$function$;

COMMENT ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) IS
  'Grava a revisao humana da redacao cultural em redacoes_candidato E sincroniza a linha '
  'scores_candidato tipo=redacao (sincronizar_score_redacao). Antes de 2026-09-06 nao '
  'tocava scores_candidato e o peso redacao_cultural era sempre N/A na decisao final.';

-- Backfill: redações JÁ revisadas antes desta migration nunca tiveram a linha. Aditivo e
-- derivado — recomputa do que já está gravado, não inventa nota nenhuma.
DO $backfill$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT rc.candidatura_id
      FROM public.redacoes_candidato rc
     WHERE rc.revisada_em IS NOT NULL
       AND rc.decisao_revisor IN ('aprovado', 'reprovado')
  LOOP
    PERFORM public.sincronizar_score_redacao(r.candidatura_id);
    v_n := v_n + 1;
  END LOOP;
  RAISE NOTICE 'backfill: % candidatura(s) com redacao revisada sincronizada(s)', v_n;
END
$backfill$;

-- Portão: a RPC chama o sincronizador, e nenhuma redação revisada ficou sem linha.
DO $$
DECLARE
  v_orfas integer;
BEGIN
  IF position('sincronizar_score_redacao' IN
              pg_get_functiondef('public.salvar_revisao_redacao(uuid,text,text,jsonb)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'salvar_revisao_redacao instalada sem a sincronizacao do score';
  END IF;

  SELECT count(*) INTO v_orfas
    FROM (SELECT DISTINCT rc.candidatura_id
            FROM public.redacoes_candidato rc
           WHERE rc.revisada_em IS NOT NULL
             AND rc.decisao_revisor IN ('aprovado', 'reprovado')
             AND public.redacao_score_0_100(rc.id) IS NOT NULL) x
   WHERE NOT EXISTS (
     SELECT 1 FROM public.scores_candidato sc
      WHERE sc.candidatura_id = x.candidatura_id
        AND sc.tipo = 'redacao'
        AND sc.status = 'sucesso');

  IF v_orfas > 0 THEN
    RAISE EXCEPTION 'backfill incompleto: % candidatura(s) com redacao revisada e sem linha de score', v_orfas;
  END IF;
END $$;
