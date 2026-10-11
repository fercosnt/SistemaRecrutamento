-- 20261011000005_p52_sjt_uuid_e_nota_completa.sql
--
-- POR QUE ESTA MIGRATION EXISTE (decisao do operador de 2026-10-11, verbatim em
-- .planning/phases/52-hub-do-rh-dados-e-contato/52-DECISAO-2026-10-11-gaps-e-pitr.md, item 1:
-- «Antes do UAT: ... o WR-04 ... e, no mesmo plano, o F13»; plano 52-26).
--
-- (WR-04 do 52-REVIEW-BANCO-1; 52-18-DECISAO-OPERADOR.md item 1 - «consertar ANTES de abrir para
-- candidatos reais», numa migration propria depois do bloco C, sem tocar a 0003) `pontuar_sjt`
-- comparava `pergunta_id` como TEXTO na checagem de duplicata e na de completude: um payload montado
-- a mao com o mesmo id em caixa diferente ('abc...' e 'ABC...') passava como duas perguntas, contava a
-- repetida duas vezes no lugar da omitida e saia com answered = expected. Agora as duas checagens
-- comparam como uuid (P2, P3). Depois de P2, P3 e equivalente ao texto (duplicata por uuid aprovada =>
-- uuids distintos => textos distintos): fica por pedido explicito do operador, como defesa em
-- profundidade, e nenhuma mutacao a isola. Antes delas (P1), payload que nao e array, elemento que nao
-- e objeto, ou `pergunta_id`/`opcao_id` que nao e uuid valido (pg_input_is_valid) e recusado ALTO com
-- 22023 'resposta malformada' - nunca o 22P02 sem rotulo do `::uuid` (o cliente mapeia 22023 para a
-- mensagem neutra, sem eco; um 22P02 cairia no ramo que interpola a mensagem do servidor). A ordem das
-- outras recusas e a pontuacao do conjunto valido nao mudam; a 0003 nao e tocada.
--
-- (F13 do 52-REVIEW-PORTAO-1 IN-03; D-25 com a emenda D-52-U12) `salvar_avaliacao_entrevista` de 4
-- argumentos aceitava notas parciais e ignorava em silencio as fora de 1-5: so recusava zero notas. A
-- regra «Salvar avaliacao so com TODAS as competencias notadas» vivia so no cliente. Agora o servidor
-- recusa (23514) o p_scores_humanos que nao e objeto, que deixa sem nota 1-5 alguma competencia do
-- conjunto da analise nomeada, ou que traz chave fora dele. O conjunto e o que a tela renderiza: os
-- nomes de entrevista_analises.competencias pela regra de normalizeCompetencia (`competencia` string
-- nao vazia, senao `competency` string, senao '') e, sem nenhum, os 4 nomes padrao da tela (espelho
-- vigiado por src/features/entrevista/__tests__/competencias-padrao-servidor.test.ts). A media passa a
-- ser so sobre o conjunto. As recusas anteriores (42501, no_data_found, analise nao vigente, notas
-- vazias) continuam antes, na mesma ordem. A sobrecarga de 3 argumentos NAO e tocada: ela delega a
-- primaria com o mesmo payload e herda a regra.
--
-- pontuar_sjt_prosrc_md5_antes: 66fe507fbf5bf6a98bd7e5eecd84f310
-- pontuar_sjt_prosrc_md5_novo: a63375bdb58b0bd01343081562b43a85
-- salvar4_prosrc_md5_antes: 070e0f1b523bc4879204d5c23da1a2dd
-- salvar4_prosrc_md5_novo: d2d3bc1ddebf59b7896de59608daf45a
-- salvar3_prosrc_md5_intocada: 924dfb99c5c4f8be77bcb990c1b8e742
--
-- ⚠ ESTE SQL FOI GERADO, NAO TRANSCRITO.
-- Gerador: scripts/geradores/gen-p52-gap.cjs (--conferir regenera e compara byte a byte)
-- Corpos vivos (prosrc de PROD byte a byte, capturados so leitura por --capturar):
--   scripts/geradores/pontuar_sjt_vivo_v2.plpgsql             (md5 66fe507fbf5bf6a98bd7e5eecd84f310)
--   scripts/geradores/salvar_avaliacao_entrevista4_vivo.plpgsql (md5 070e0f1b523bc4879204d5c23da1a2dd)
-- O corpo novo = corpo vivo + SO as trocas ancoradas P1-P3 / S1-S2 (cada ancora ocorre exatamente uma
-- vez no corpo vivo). Nao editar este arquivo a mao: muda-se o gerador e gera-se de novo.
--
-- ⚠ SUBSTITUI DUAS FUNCOES VIVAS - o desfazer e recriar os corpos dos dois arquivos capturados (mesma
-- assinatura, mesmo PRE/POS invertido), numa migration corretiva. Esta migration nao escreve dado:
-- desfazer so reabre as duas portas que ela fecha. Nenhum GRANT/REVOKE/COMMENT: CREATE OR REPLACE
-- preserva dono, ACL e comentario, e o POS confere (o EXECUTE de anon em pontuar_sjt FICA como esta -
-- fecha-lo e decisao a parte, UF-2).
--
-- POR QUE 0005 ANTES DA 0004: a 20261011000004 (bloco D, 52-20, destrutiva) ainda nao existe e esta
-- fixada por nome no MIGS do ensaio e em planos ja verificados; nenhum portao da fase depende da ORDEM
-- das versoes (o p46apply.cjs migrate nao confere ordem; a regra (8) do p52_portao.cjs e por FORMA e
-- exige toda _p52_ do pin no ledger, seja qual for a ordem). A ordem fora de sequencia no ledger e
-- PROTECAO: com a 0005 no ar e a 0004 so no disco, `supabase db push` recusa sem --include-all. No
-- MIGS do ensaio a 0005 entra ANTES da 0004 (a lista e a ordem de APLICACAO).
--
-- Sem BEGIN/COMMIT: o endpoint ja roda o corpo inteiro numa unica transacao, e `DO` adjacentes a um
-- BEGIN sao a forma exata do 42601 (CLAUDE.md §Migrations).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
-- SO pelo 52-26 Task 4, atras do `node scripts/p52_portao.cjs --modo apply` (review sem critico,
-- janela unica confirmada pelo operador). NUNCA `supabase db push`.

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52G PRE-PORTAO — os tres corpos vivos tem de ser os que o gerador leu (md5 antes/intocada do
-- cabecalho); senao recusa e nada muda. Guarda em GUCs LOCAIS as propriedades, a ACL, o comentario e
-- o EXECUTE de anon/authenticated das duas funcoes trocadas, e a impressao digital inteira da
-- sobrecarga de 3 argumentos (o POS compara).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_md5   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_exec  text;
  v_fp    text;
BEGIN
  SELECT md5(p.prosrc),
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ',authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    INTO v_md5, v_props, v_acl, v_cmt, v_exec
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)');
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (pontuar_sjt): public.pontuar_sjt(uuid,jsonb) nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '66fe507fbf5bf6a98bd7e5eecd84f310' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (pontuar_sjt): md5(prosrc) vivo = % (o gerador leu 66fe507fbf5bf6a98bd7e5eecd84f310) - o corpo vivo mudou depois da captura: recapturar (gen-p52-gap.cjs --capturar) e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_pontuar_props', v_props, true);
  PERFORM set_config('p52.gap_pontuar_acl',   v_acl,   true);
  PERFORM set_config('p52.gap_pontuar_cmt',   v_cmt,   true);
  PERFORM set_config('p52.gap_pontuar_exec',  v_exec,  true);

  v_md5 := NULL;
  SELECT md5(p.prosrc),
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ',authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    INTO v_md5, v_props, v_acl, v_cmt, v_exec
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)');
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar4): public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text) nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '070e0f1b523bc4879204d5c23da1a2dd' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar4): md5(prosrc) vivo = % (o gerador leu 070e0f1b523bc4879204d5c23da1a2dd) - o corpo vivo mudou depois da captura: recapturar (gen-p52-gap.cjs --capturar) e gerar de novo; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_salvar4_props', v_props, true);
  PERFORM set_config('p52.gap_salvar4_acl',   v_acl,   true);
  PERFORM set_config('p52.gap_salvar4_cmt',   v_cmt,   true);
  PERFORM set_config('p52.gap_salvar4_exec',  v_exec,  true);

  v_md5 := NULL;
  SELECT md5(p.prosrc), md5(((to_jsonb(p) - 'proacl' - 'proargdefaults')::text) || '|' || pg_catalog.pg_get_function_arguments(p.oid) || '|' || coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text || ':' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), '') || '|' || coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'))
    INTO v_md5, v_fp
    FROM pg_catalog.pg_proc p
   WHERE p.oid = to_regprocedure('public.salvar_avaliacao_entrevista(uuid,jsonb,text)');
  IF v_md5 IS NULL THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar3): public.salvar_avaliacao_entrevista(uuid,jsonb,text) nao existe; nada mudou';
  END IF;
  IF v_md5 IS DISTINCT FROM '924dfb99c5c4f8be77bcb990c1b8e742' THEN
    RAISE EXCEPTION 'P52G PRE-PORTAO (salvar3): md5(prosrc) vivo = % (esperado 924dfb99c5c4f8be77bcb990c1b8e742, intocada) - a sobrecarga de 3 argumentos mudou depois da captura: rever o plano; nada mudou', v_md5;
  END IF;
  PERFORM set_config('p52.gap_salvar3_fp', v_fp, true);
END
$pre$;

-- `pontuar_sjt`: o corpo VIVO + P1-P3 (WR-04). Mesma assinatura, mesmas propriedades.
CREATE OR REPLACE FUNCTION public.pontuar_sjt(p_candidatura_id uuid, p_respostas jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga        uuid; v_cargo text; v_itens_ids uuid[]; v_battery uuid[];
  v_expected int; v_answered int; v_score int := 0; v_max int := 0;
  v_has_atencao boolean := false; v_status public.status_score; v_breakdown jsonb;
  v_mc_min_pct numeric := 60;
BEGIN
  SELECT c.vaga_id INTO v_vaga
    FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id AND ca.user_id = auth.uid() AND c.etapa_atual = 'avaliacao_assincrona';
  IF v_vaga IS NULL THEN RAISE EXCEPTION 'forbidden' USING errcode = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.scores_candidato
     WHERE candidatura_id = p_candidatura_id AND tipo='sjt' AND subtipo='mc' AND pergunta_id IS NULL AND status <> 'falhou') THEN
    RAISE EXCEPTION 'avaliacao ja registrada' USING errcode = '42501';
  END IF;

  SELECT elem->>'cargo', ARRAY(SELECT jsonb_array_elements_text(elem->'itens_ids'))::uuid[]
    INTO v_cargo, v_itens_ids
    FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
   WHERE v.id = v_vaga
     AND (elem->>'tipo' = 'sjt'
          OR elem->>'teste' IN ('sjt', 'work_sample_sjt'))
   LIMIT 1;

  SELECT array_agg(p.id) INTO v_battery FROM public.perguntas p
   WHERE p.status='active' AND p.formato='mc'
     AND ((v_itens_ids IS NOT NULL AND array_length(v_itens_ids,1)>0 AND p.id = ANY(v_itens_ids))
          OR ((v_itens_ids IS NULL OR array_length(v_itens_ids,1) IS NULL) AND p.cargo = v_cargo));
  v_expected := COALESCE(array_length(v_battery,1),0);
  IF v_expected = 0 THEN RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023'; END IF;

  -- WR-04 (52-REVIEW-BANCO-1; 52-18-DECISAO-OPERADOR item 1; Phase 52 / 52-26): o payload tem de
  -- ter a forma que o resto do corpo supoe ANTES de qualquer `::uuid` - um array de objetos com
  -- `pergunta_id` e `opcao_id` uuid validos. Sem isto o cast levantava 22P02 sem rotulo; agora a
  -- recusa e 22023 'resposta malformada', como as outras recusas de payload. Dois IFs separados:
  -- `jsonb_array_elements` nunca roda sobre o que nao e array.
  IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'array' THEN
    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r
              WHERE jsonb_typeof(r) <> 'object'
                 OR NOT coalesce(pg_input_is_valid(r->>'pergunta_id', 'uuid'), false)
                 OR NOT coalesce(pg_input_is_valid(r->>'opcao_id', 'uuid'), false)) THEN
    RAISE EXCEPTION 'resposta malformada' USING errcode = '22023';
  END IF;

  -- WR-04: duplicata e completude comparam `pergunta_id` como UUID, nao como texto - o mesmo id
  -- em outra caixa e a MESMA pergunta, e contava duas vezes no lugar da omitida.
  IF (SELECT count(*) FROM jsonb_array_elements(p_respostas))
     <> (SELECT count(DISTINCT (r->>'pergunta_id')::uuid) FROM jsonb_array_elements(p_respostas) r) THEN
    RAISE EXCEPTION 'resposta duplicada' USING errcode = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_respostas) r WHERE (r->>'pergunta_id')::uuid <> ALL(v_battery)) THEN
    RAISE EXCEPTION 'pergunta fora da bateria' USING errcode = '42501';
  END IF;

  SELECT count(DISTINCT (r->>'pergunta_id')::uuid) INTO v_answered FROM jsonb_array_elements(p_respostas) r;
  IF v_answered <> v_expected THEN
    RAISE EXCEPTION 'bateria incompleta (% de %)', v_answered, v_expected USING errcode = '22023';
  END IF;

  SELECT COALESCE((SELECT (elem->'threshold'->>'mc_min_pct')::numeric
      FROM public.vagas v, jsonb_array_elements(v.testes_aplicaveis) elem
     WHERE v.id = v_vaga AND elem->>'tipo'='sjt' AND (elem->'threshold'->>'mc_min_pct') IS NOT NULL LIMIT 1), 60)
    INTO v_mc_min_pct;

  WITH marked AS (
    SELECT (r->>'pergunta_id')::uuid AS pergunta_id, (r->>'opcao_id')::uuid AS opcao_id
      FROM jsonb_array_elements(p_respostas) r
  ), scored AS (
    SELECT m.pergunta_id, pos.opcao_id, pos.tag, pos.peso
      FROM marked m JOIN public.perguntas_opcao_sjt pos ON pos.pergunta_id=m.pergunta_id AND pos.opcao_id=m.opcao_id
  ), maxes AS (
    SELECT pergunta_id, MAX(peso) AS peso_max FROM public.perguntas_opcao_sjt WHERE pergunta_id = ANY(v_battery) GROUP BY pergunta_id
  )
  SELECT COALESCE(SUM(s.peso),0), COALESCE((SELECT SUM(peso_max) FROM maxes),0),
         COALESCE(bool_or(s.tag='atencao'),false),
         COALESCE(jsonb_agg(jsonb_build_object('pergunta_id',s.pergunta_id,'opcao_id',s.opcao_id,'tag',s.tag,'peso',s.peso)),'[]'::jsonb)
    INTO v_score, v_max, v_has_atencao, v_breakdown FROM scored s;

  -- WR-01: gabarito-less battery (v_max=0) must fail loudly, not score 0/0 'sucesso'.
  IF v_max = 0 THEN RAISE EXCEPTION 'bateria SJT nao configurada' USING errcode = '22023'; END IF;

  -- WR-02 (52-REVIEW-PORTAO-2, Phase 52 / 52-16): toda resposta tem de casar uma alternativa da
  -- propria pergunta. O JOIN de `scored` descartava em silencio o par sem correspondencia (um
  -- opcao_id remapeado, retirado ou forjado) e a bateria saia com nota parcial definitiva; agora a
  -- submissao inteira e recusada alto e nada e gravado. (pergunta_id, opcao_id) e UNIQUE em
  -- perguntas_opcao_sjt: cada resposta que casa da exatamente 1 linha em `scored`.
  IF jsonb_array_length(v_breakdown) <> v_answered THEN
    RAISE EXCEPTION 'opcao fora da pergunta' USING errcode = '22023';
  END IF;

  v_status := CASE
    WHEN v_has_atencao OR (v_max > 0 AND (v_score::numeric / v_max) * 100 < v_mc_min_pct)
    THEN 'pendente_humano'::public.status_score ELSE 'sucesso'::public.status_score END;

  INSERT INTO public.scores_candidato (candidatura_id, tipo, subtipo, score, score_max, status, metadata)
  VALUES (p_candidatura_id,'sjt','mc',v_score,v_max,v_status,
     jsonb_build_object('respostas',v_breakdown,'has_atencao',v_has_atencao,'mc_min_pct',v_mc_min_pct,'expected',v_expected,'answered',v_answered,'versao',2))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id)
  DO UPDATE SET score=EXCLUDED.score, score_max=EXCLUDED.score_max, status=EXCLUDED.status, metadata=EXCLUDED.metadata, updated_at=now()
  WHERE public.scores_candidato.status = 'falhou';

  RETURN jsonb_build_object('ok', true, 'registrado', true);
END;
$function$;

-- `salvar_avaliacao_entrevista` de 4 argumentos: o corpo VIVO + S1-S2 (F13). Mesma assinatura,
-- mesmas propriedades. A de 3 argumentos nao e tocada.
CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_analise_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_analise_id uuid;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
  v_media      numeric;
  v_n          integer;
  v_conj       text[];
  v_falta      integer;
  v_fora       integer;
BEGIN
  -- A análise a revisar é a que o CLIENTE nomeia — a que a tela mostra (D-39). A condição
  -- de candidatura fecha o IDOR: SECURITY DEFINER ignora RLS, e sem ela um RH dono da vaga
  -- de A gravaria nota numa análise de B. O estado entra no MESMO SELECT (e sob lock) para
  -- não abrir janela entre «é vigente» e o UPDATE.
  SELECT ea.id, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_analise_id, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id
     AND ea.candidatura_id = p_candidatura_id
     FOR UPDATE OF ea;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista % nao encontrada na candidatura %', p_analise_id, p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed: sem papel nenhum, RECUSA (a comparação direta sobre um v_role nulo
  -- devolve NULL e o IF não dispara).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A nota humana só vale na análise VIGENTE (predicado único do 49-01): numa SUPERADA ela
  -- revisaria um texto que não vale mais; numa FALHA não há competências para pontuar.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: a avaliacao so pode ser registrada na analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- F13 (52-REVIEW-PORTAO-1 IN-03; D-25 com a emenda D-52-U12; Phase 52 / 52-26): «Salvar
  -- avaliacao» so com TODAS as competencias notadas - agora tambem no servidor. O conjunto e o que
  -- a tela renderiza: os nomes de `competencias` da analise nomeada pela regra de
  -- `normalizeCompetencia` (`competencia` string nao vazia, senao `competency` string, senao '') e,
  -- sem nenhum nome, os 4 nomes padrao da tela. Nota de 1 a 5 para cada um, nenhuma chave fora do
  -- conjunto; a media e so sobre o conjunto.
  IF p_scores_humanos IS NULL OR jsonb_typeof(p_scores_humanos) <> 'object' THEN
    RAISE EXCEPTION 'scores_humanos tem de ser um objeto {competencia: nota}' USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(array_agg(DISTINCT n.nome), ARRAY[]::text[])
    INTO v_conj
    FROM (SELECT CASE
                   WHEN jsonb_typeof(e->'competencia') = 'string' AND length(e->>'competencia') > 0 THEN e->>'competencia'
                   WHEN jsonb_typeof(e->'competency') = 'string' THEN e->>'competency'
                   ELSE ''
                 END AS nome
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_comp) = 'array' THEN v_comp ELSE '[]'::jsonb END) AS e) AS n;
  IF cardinality(v_conj) = 0 THEN
    v_conj := ARRAY['Experiência UAU', 'Inovação', 'Atitude de Dono', 'Sede de Crescimento']; -- F13: espelho de DEFAULT_COMPETENCIAS (EntrevistaScorecardInline.tsx)
  END IF;

  SELECT count(*) INTO v_falta
    FROM unnest(v_conj) AS c(nome)
   WHERE NOT EXISTS (SELECT 1 FROM jsonb_each_text(p_scores_humanos) AS kv(k, v)
                      WHERE kv.k = c.nome AND CASE WHEN kv.v ~ '^[0-9]+(\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END);
  IF v_falta > 0 THEN
    RAISE EXCEPTION 'scores_humanos incompleto: % de % competencia(s) da analise sem nota de 1 a 5', v_falta, cardinality(v_conj)
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_fora
    FROM jsonb_object_keys(p_scores_humanos) AS k(nome)
   WHERE k.nome <> ALL (v_conj);
  IF v_fora > 0 THEN
    RAISE EXCEPTION 'scores_humanos com % chave(s) fora das competencias da analise', v_fora
      USING ERRCODE = 'check_violation';
  END IF;

  -- Media das notas humanas (BARS 1-5), so sobre o conjunto da analise.
  SELECT avg(kv.v::numeric), count(*)
    INTO v_media, v_n
    FROM jsonb_each_text(p_scores_humanos) AS kv(k, v)
   WHERE kv.k = ANY (v_conj) AND CASE WHEN kv.v ~ '^[0-9]+(\.[0-9]+)?$' THEN kv.v::numeric BETWEEN 1 AND 5 ELSE false END;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- P52G POS-PORTAO — os dois corpos novos sao os do cabecalho; propriedades, ACL, comentario e EXECUTE
-- de anon/authenticated iguais aos do PRE; a sobrecarga de 3 argumentos com a MESMA impressao digital.
-- Qualquer diferenca levanta e nada persiste.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_md5   text;
  v_props text;
  v_acl   text;
  v_cmt   text;
  v_exec  text;
  v_fp    text;
BEGIN
  IF coalesce(current_setting('p52.gap_salvar3_fp', true), '') = '' THEN
    RAISE EXCEPTION 'P52G POS-PORTAO: as GUCs do PRE estao vazias - o PRE nao rodou nesta transacao; nada persiste';
  END IF;
  SELECT md5(p.prosrc),
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ',authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    INTO v_md5, v_props, v_acl, v_cmt, v_exec
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)');
  IF v_md5 IS DISTINCT FROM 'a63375bdb58b0bd01343081562b43a85' THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (pontuar_sjt): md5(prosrc) = % (esperado a63375bdb58b0bd01343081562b43a85); nada persiste', v_md5;
  END IF;
  IF v_props IS DISTINCT FROM current_setting('p52.gap_pontuar_props', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (pontuar_sjt): propriedades mudaram (% -> %); nada persiste', current_setting('p52.gap_pontuar_props', true), v_props;
  END IF;
  IF v_acl IS DISTINCT FROM current_setting('p52.gap_pontuar_acl', true)
     OR v_exec IS DISTINCT FROM current_setting('p52.gap_pontuar_exec', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (pontuar_sjt): ACL mudou (% -> %; EXECUTE % -> %); nada persiste', current_setting('p52.gap_pontuar_acl', true), v_acl, current_setting('p52.gap_pontuar_exec', true), v_exec;
  END IF;
  IF v_cmt IS DISTINCT FROM current_setting('p52.gap_pontuar_cmt', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (pontuar_sjt): o comentario da funcao mudou; nada persiste';
  END IF;

  SELECT md5(p.prosrc),
         concat_ws('|', p.prosecdef, p.provolatile, p.proparallel, p.prokind, p.proisstrict, p.proleakproof, p.proretset,
                   coalesce(p.proconfig::text, '<null>'), l.lanname, pg_catalog.pg_get_userbyid(p.proowner),
                   pg_catalog.pg_get_function_arguments(p.oid), pg_catalog.pg_get_function_result(p.oid)),
         coalesce((SELECT string_agg(x, ',' ORDER BY x)
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':'
                         || a.is_grantable::text || ':' || a.grantor::regrole::text AS x
                    FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), ''),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'),
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ',authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
    INTO v_md5, v_props, v_acl, v_cmt, v_exec
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = to_regprocedure('public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)');
  IF v_md5 IS DISTINCT FROM 'd2d3bc1ddebf59b7896de59608daf45a' THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar4): md5(prosrc) = % (esperado d2d3bc1ddebf59b7896de59608daf45a); nada persiste', v_md5;
  END IF;
  IF v_props IS DISTINCT FROM current_setting('p52.gap_salvar4_props', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar4): propriedades mudaram (% -> %); nada persiste', current_setting('p52.gap_salvar4_props', true), v_props;
  END IF;
  IF v_acl IS DISTINCT FROM current_setting('p52.gap_salvar4_acl', true)
     OR v_exec IS DISTINCT FROM current_setting('p52.gap_salvar4_exec', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar4): ACL mudou (% -> %; EXECUTE % -> %); nada persiste', current_setting('p52.gap_salvar4_acl', true), v_acl, current_setting('p52.gap_salvar4_exec', true), v_exec;
  END IF;
  IF v_cmt IS DISTINCT FROM current_setting('p52.gap_salvar4_cmt', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar4): o comentario da funcao mudou; nada persiste';
  END IF;

  SELECT md5(p.prosrc), md5(((to_jsonb(p) - 'proacl' - 'proargdefaults')::text) || '|' || pg_catalog.pg_get_function_arguments(p.oid) || '|' || coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text || ':' || a.grantor::regrole::text AS x FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a) s), '') || '|' || coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<null>'))
    INTO v_md5, v_fp
    FROM pg_catalog.pg_proc p
   WHERE p.oid = to_regprocedure('public.salvar_avaliacao_entrevista(uuid,jsonb,text)');
  IF v_md5 IS DISTINCT FROM '924dfb99c5c4f8be77bcb990c1b8e742' OR v_fp IS DISTINCT FROM current_setting('p52.gap_salvar3_fp', true) THEN
    RAISE EXCEPTION 'P52G POS-PORTAO (salvar3): a sobrecarga de 3 argumentos mudou (md5 %, impressao digital % -> %); nada persiste', v_md5, current_setting('p52.gap_salvar3_fp', true), v_fp;
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' gap:pontuar_sjt=a63375bdb58b0bd01343081562b43a85,salvar4=d2d3bc1ddebf59b7896de59608daf45a,salvar3=igual'), false);
END
$pos$;
