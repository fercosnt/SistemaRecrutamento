-- =============================================================================
-- Phase 52 / Plano 52-16 — smoke do BANCO SJT v2 (smoke52b) · JORN-52 (D-28, D-29, D-34, D-35, D-37)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000003_p52_banco_sjt_v2, GERADA por
-- `scripts/geradores/gen-sjt-v2.py` a partir de `docs/specs/BANCO-SJT-V2.md`; até o portão de
-- texto do 52-17 ela mora num arquivo temporário e é prefixada pelo ensaio com `--migracoes=`).
--
-- ESCOPO LIDO NA EXECUÇÃO, nunca lista literal: os cargos (`p52.banco_cargos`), os hashes do
-- texto (`p52.banco_hashes`), a baseline da retirada (`p52.banco_retirar_n`/`_ids`) e os casos
-- mantidos (`p52.banco_mantidos`) são as GUCs LOCAIS que o `DO $pre$` da própria migration grava
-- NESTA transação. Sem elas o smoke reprova em (a) — ele só tem sentido com a migration prefixada.
--
-- CLÁUSULAS (como postgres, salvo onde dito).
--   (a) cada cargo do texto: exatamente 6 `mc` + 1 `caso_aberto` ativos.
--   (b) todo item ativo desses cargos tem `content_hash` do texto (nenhum antigo ficou ativo).
--   (c) retirados = baseline: cada id da baseline do PRE está `retired`, e a retirada contou a
--       baseline (`p52.banco_retirados`).
--   (d) como CANDIDATO escolhido na execução (`SET LOCAL ROLE authenticated` + claims de
--       candidato; `candidatos.user_id` sem linha em `usuarios_rh`), `perguntas` de cada cargo
--       devolve 7 linhas — os MESMOS ids ativos que o postgres vê (a RLS `status = 'active'`).
--   (e) como o mesmo candidato, `get_opcoes_sjt` de CADA `mc` ativo do texto devolve 4 linhas com
--       exatamente {opcao_id, opcao_texto} (sem etiqueta, peso ou ordem) e os ids das opções do
--       banco; de um item RETIRADO da baseline, recusa (`42704`).
--   (f) cada `mc` ativo: 4 opções, etiqueta×peso = {fortemente_pontua 4, pontua 2, neutro 1,
--       atencao 0} e `ordem` = {1,2,3,4}.
--   (g) anti-escada (D-37): por cargo, a `fortemente_pontua` ocupa a mesma `ordem` em no máximo 3
--       itens ativos.
--   (h) as respostas SJT antigas (`scores_candidato` `sjt`: `pergunta_id` e
--       `metadata.respostas[].pergunta_id`) continuam apontando para linhas EXISTENTES — nada foi
--       apagado; contagem publicada (`refs`, e quantas apontam para itens retirados).
--   (i) para cada `cargo=id` de `p52.banco_mantidos` (D-35: o caso aberto que FICA), o único
--       `caso_aberto` ativo do cargo é AQUELE id — não reinserido, não retirado. Com a GUC vazia
--       publica `mantidos=0` e não reprova: a intenção «ficar» mora no texto e é conferida pelo
--       gerador, pelo PRE e pelo POS.
--
-- NÃO ESCREVE NADA: só lê, e troca de papel dentro de funções `pg_temp` cujo bloco de exceção
-- desfaz o `SET LOCAL ROLE`. Mesmo assim só roda dentro do ensaio que ABORTA (bloco
-- `$p52_so_ensaio$`): é a migration prefixada que escreve, e ela tem de voltar.
--
-- COMO RODAR: node scripts/p52_ensaio.cjs --migracoes="$TMPDIR/20261011000003_p52_banco_sjt_v2.sql"
--   supabase/tests/p52_banco_sjt_smoke.sql
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52b.esperado`, abaixo). Hoje: 9 — a … i.
-- Reprovação: `P52B FAIL (<letra>): …` — só contagens, ids e hashes; nenhum texto de item.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52B RECUSADO (fora do ensaio): este smoke so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs --migracoes=<banco_v2.sql> supabase/tests/p52_banco_sjt_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52B RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%). Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke52b.pass', '0', false);
SELECT set_config('smoke52b.esperado', '9', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Leituras como CANDIDATO. Cada uma devolve {ok: …} ou {err: 'SQLSTATE:SQLERRM'}; o erro desfaz
-- a subtransação dela, inclusive o SET LOCAL ROLE. Somem no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.p52b_ids_do_cargo(p_cargo text, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52b_ids$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    SELECT coalesce(jsonb_agg(p.id::text ORDER BY p.id::text), '[]'::jsonb) INTO v_r
      FROM public.perguntas p WHERE p.cargo = p_cargo;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52b_ids$;

CREATE FUNCTION pg_temp.p52b_opcoes(p_pergunta uuid, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52b_opcoes$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY g.opcao_id::text), '[]'::jsonb) INTO v_r
      FROM public.get_opcoes_sjt(p_pergunta) g;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52b_opcoes$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) 6 mc + 1 caso aberto ativos por cargo do texto
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_cargos text[] := string_to_array(nullif(current_setting('p52.banco_cargos', true), ''), ',');
  v_rot    text[] := ARRAY[]::text[];
  c        text;
  v_mc     bigint;
  v_ca     bigint;
BEGIN
  IF v_cargos IS NULL OR cardinality(v_cargos) = 0 THEN
    RAISE EXCEPTION 'P52B FAIL (a): p52.banco_cargos vazio — o PRE do banco v2 nao rodou nesta transacao (prefixar a migration com --migracoes=)';
  END IF;
  FOREACH c IN ARRAY v_cargos LOOP
    SELECT count(*) FILTER (WHERE p.formato = 'mc'), count(*) FILTER (WHERE p.formato = 'caso_aberto')
      INTO v_mc, v_ca FROM public.perguntas p WHERE p.tipo = 'sjt' AND p.cargo = c AND p.status = 'active';
    IF v_mc <> 6 OR v_ca <> 1 THEN
      v_rot := v_rot || (c || '=' || v_mc || '+' || v_ca);
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (a): [%] — esperado 6 mc + 1 caso_aberto ativos por cargo', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) todo ativo dos cargos do texto tem hash do texto
-- ─────────────────────────────────────────────────────────────────────────────
DO $b$
DECLARE
  v_cargos text[] := string_to_array(current_setting('p52.banco_cargos'), ',');
  v_hashes text[] := string_to_array(nullif(current_setting('p52.banco_hashes', true), ''), ',');
  v_fora   text;
BEGIN
  IF v_hashes IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (b): p52.banco_hashes vazio';
  END IF;
  SELECT string_agg(p.cargo || ':' || p.id::text, ',' ORDER BY p.cargo, p.id::text) INTO v_fora
    FROM public.perguntas p
   WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active'
     AND (p.content_hash IS NULL OR NOT (p.content_hash = ANY (v_hashes)));
  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'P52B FAIL (b): item(ns) ativo(s) fora do texto [%] — item antigo segue sorteavel', v_fora;
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) retirados = baseline do PRE
-- ─────────────────────────────────────────────────────────────────────────────
DO $c$
DECLARE
  v_base bigint := nullif(current_setting('p52.banco_retirar_n', true), '')::bigint;
  v_ret  bigint := nullif(current_setting('p52.banco_retirados', true), '')::bigint;
  v_ids  text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_retirar_ids', true), ''), ','), ARRAY[]::text[]);
  v_ok   bigint;
BEGIN
  IF v_base IS NULL OR v_ret IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (c): GUCs da baseline/da retirada ausentes (retirar_n=%, retirados=%)', v_base, v_ret;
  END IF;
  SELECT count(*) INTO v_ok FROM public.perguntas p WHERE p.id::text = ANY (v_ids) AND p.status = 'retired';
  IF cardinality(v_ids) <> v_base OR v_ok <> v_base OR v_ret <> v_base THEN
    RAISE EXCEPTION 'P52B FAIL (c): baseline % (ids %), retirada contou %, % da baseline estao retired', v_base, cardinality(v_ids), v_ret, v_ok;
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52b.retirados=' || v_ret::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) o candidato vê, por cargo, exatamente os 7 ativos
-- ─────────────────────────────────────────────────────────────────────────────
DO $d$
DECLARE
  v_cargos text[] := string_to_array(current_setting('p52.banco_cargos'), ',');
  v_sub    uuid;
  v_rot    text[] := ARRAY[]::text[];
  c        text;
  v_vista  jsonb;
  v_esp    jsonb;
BEGIN
  SELECT cd.user_id INTO v_sub
    FROM public.candidatos cd
   WHERE cd.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = cd.user_id)
   ORDER BY cd.created_at, cd.id
   LIMIT 1;
  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (d): nenhum candidato com user_id fora de usuarios_rh — populacao vazia nao prova nada';
  END IF;
  PERFORM set_config('smoke52b.cand', v_sub::text, false);
  FOREACH c IN ARRAY v_cargos LOOP
    v_vista := pg_temp.p52b_ids_do_cargo(c, v_sub);
    SELECT coalesce(jsonb_agg(p.id::text ORDER BY p.id::text), '[]'::jsonb) INTO v_esp
      FROM public.perguntas p WHERE p.cargo = c AND p.status = 'active';
    IF v_vista ? 'err' OR jsonb_array_length(v_vista -> 'ok') <> 7 OR (v_vista -> 'ok') IS DISTINCT FROM v_esp THEN
      v_rot := v_rot || (c || ':' || coalesce(left(v_vista ->> 'err', 80), 've=' || jsonb_array_length(v_vista -> 'ok')::text));
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (d): [%] — o candidato nao ve exatamente os 7 ativos do cargo', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) get_opcoes_sjt como candidato: 4 opções sem gabarito nos novos; recusa no retirado
-- ─────────────────────────────────────────────────────────────────────────────
DO $e$
DECLARE
  v_cargos text[] := string_to_array(current_setting('p52.banco_cargos'), ',');
  v_hashes text[] := string_to_array(current_setting('p52.banco_hashes'), ',');
  v_ids    text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_retirar_ids', true), ''), ','), ARRAY[]::text[]);
  v_sub    uuid   := current_setting('smoke52b.cand')::uuid;
  v_rot    text[] := ARRAY[]::text[];
  r        record;
  v_o      jsonb;
  v_esp    jsonb;
  v_n      int := 0;
BEGIN
  FOR r IN SELECT p.id, p.cargo FROM public.perguntas p
            WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc'
              AND p.content_hash = ANY (v_hashes)
            ORDER BY p.cargo, p.id LOOP
    v_n := v_n + 1;
    v_o := pg_temp.p52b_opcoes(r.id, v_sub);
    SELECT coalesce(jsonb_agg(o.opcao_id::text ORDER BY o.opcao_id::text), '[]'::jsonb) INTO v_esp
      FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = r.id;
    IF v_o ? 'err'
       OR jsonb_array_length(v_o -> 'ok') <> 4
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_o -> 'ok') x
                   WHERE (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(x) k) IS DISTINCT FROM ARRAY['opcao_id', 'opcao_texto'])
       OR (SELECT jsonb_agg(x ->> 'opcao_id' ORDER BY x ->> 'opcao_id') FROM jsonb_array_elements(v_o -> 'ok') x) IS DISTINCT FROM v_esp THEN
      v_rot := v_rot || (r.cargo || ':' || r.id::text || ':' || coalesce(left(v_o ->> 'err', 60), 'forma'));
    END IF;
  END LOOP;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'P52B FAIL (e): nenhum mc ativo do texto — populacao vazia nao prova nada';
  END IF;
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P52B FAIL (e): a baseline da retirada esta vazia — nao ha item retirado para provar a recusa';
  END IF;
  v_o := pg_temp.p52b_opcoes(v_ids[1]::uuid, v_sub);
  IF coalesce(v_o ->> 'err', '') NOT LIKE '42704:%' THEN
    v_rot := v_rot || ('retirado:' || v_ids[1] || ':' || coalesce(left(v_o ->> 'err', 60), 'devolveu ' || jsonb_array_length(v_o -> 'ok')::text || ' opcoes'));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (e): [%] — get_opcoes_sjt fora do contrato (4 opcoes {opcao_id, opcao_texto} no novo; 42704 no retirado)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) etiquetas × pesos {4,2,1,0} e ordem {1..4} por mc ativo
-- ─────────────────────────────────────────────────────────────────────────────
DO $f$
DECLARE
  v_cargos text[] := string_to_array(current_setting('p52.banco_cargos'), ',');
  v_fora   text;
BEGIN
  SELECT string_agg(s.cargo || ':' || s.id::text, ',' ORDER BY s.cargo, s.id::text) INTO v_fora
    FROM (SELECT p.id, p.cargo,
                 (SELECT array_agg(o.tag::text || '=' || o.peso ORDER BY o.tag::text || '=' || o.peso)
                    FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) AS tp,
                 (SELECT array_agg(o.ordem ORDER BY o.ordem) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = p.id) AS ord
            FROM public.perguntas p
           WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc') s
   WHERE s.tp IS DISTINCT FROM ARRAY['atencao=0', 'fortemente_pontua=4', 'neutro=1', 'pontua=2']
      OR s.ord IS DISTINCT FROM ARRAY[1, 2, 3, 4];
  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'P52B FAIL (f): mc ativo(s) fora de {fortemente_pontua 4, pontua 2, neutro 1, atencao 0} x ordem {1..4}: [%]', v_fora;
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) anti-escada por cargo (D-37)
-- ─────────────────────────────────────────────────────────────────────────────
DO $g$
DECLARE
  v_cargos text[] := string_to_array(current_setting('p52.banco_cargos'), ',');
  v_fora   text;
BEGIN
  SELECT string_agg(s.cargo || ':ordem' || s.ordem || 'x' || s.n, ',' ORDER BY s.cargo, s.ordem) INTO v_fora
    FROM (SELECT p.cargo, o.ordem, count(*) AS n
            FROM public.perguntas p JOIN public.perguntas_opcao_sjt o ON o.pergunta_id = p.id
           WHERE p.tipo = 'sjt' AND p.cargo = ANY (v_cargos) AND p.status = 'active' AND p.formato = 'mc'
             AND o.tag = 'fortemente_pontua'
           GROUP BY p.cargo, o.ordem) s
   WHERE s.n > 3;
  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'P52B FAIL (g): a fortemente_pontua ocupa a mesma ordem em mais de 3 itens do cargo [%] — a ordem vira gabarito', v_fora;
  END IF;
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) respostas antigas seguem apontando para linhas existentes
-- ─────────────────────────────────────────────────────────────────────────────
DO $h$
DECLARE
  v_refs bigint;
  v_orf  bigint;
  v_ret  bigint;
BEGIN
  WITH refs AS (
    SELECT s.pergunta_id AS pid FROM public.scores_candidato s
     WHERE s.tipo = 'sjt' AND s.pergunta_id IS NOT NULL
    UNION ALL
    SELECT (e ->> 'pergunta_id')::uuid FROM public.scores_candidato s
     CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array'
                                                  THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e
     WHERE s.tipo = 'sjt' AND jsonb_typeof(e) = 'object' AND e ? 'pergunta_id'
  )
  SELECT count(*),
         count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.perguntas p WHERE p.id = refs.pid)),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.perguntas p WHERE p.id = refs.pid AND p.status = 'retired'))
    INTO v_refs, v_orf, v_ret
    FROM refs;
  IF v_orf <> 0 THEN
    RAISE EXCEPTION 'P52B FAIL (h): % de % referencia(s) de resposta SJT apontam para pergunta inexistente', v_orf, v_refs;
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' 52b.refs=' || v_refs::text || ',em_retirados=' || v_ret::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) casos abertos mantidos (D-35): o caso ativo do cargo é o MESMO id do PRE
-- ─────────────────────────────────────────────────────────────────────────────
DO $i$
DECLARE
  v_mant text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_mantidos', true), ''), ','), ARRAY[]::text[]);
  v_rot  text[] := ARRAY[]::text[];
  m      text;
  v_c    text;
  v_ativo text;
BEGIN
  FOREACH m IN ARRAY v_mant LOOP
    v_c := split_part(m, '=', 1);
    SELECT string_agg(p.id::text, ',' ORDER BY p.id::text) INTO v_ativo
      FROM public.perguntas p
     WHERE p.tipo = 'sjt' AND p.cargo = v_c AND p.formato = 'caso_aberto' AND p.status = 'active';
    IF v_ativo IS DISTINCT FROM split_part(m, '=', 2) THEN
      v_rot := v_rot || (v_c || ':esperado=' || split_part(m, '=', 2) || ',ativo=' || coalesce(v_ativo, '<nenhum>'));
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (i): [%] — o caso aberto mantido foi trocado ou retirado', array_to_string(v_rot, ';');
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' 52b.mantidos=' || cardinality(v_mant)::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$i$;
