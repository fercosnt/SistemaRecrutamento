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
--   (j)–(l) WR-03 do 52-REVIEW-PORTAO-1 — o remapeamento dos `opcao_id` artesanais (o banco semeado
--       gravou ids cujo sufixo é a `ordem`, e a ordem 1 era a certa; `get_opcoes_sjt` entrega o id
--       ao candidato). Escopo e baselines lidos das GUCs `p52.banco_remap_*`, `p52.banco_*_fp` que o
--       PRE grava NESTA transação — nunca lista literal de ids nem contagem fixa. Com escopo vazio
--       (estado já limpo) as três publicam `remap=0` e não reprovam.
--   (j) nenhuma alternativa de item SJT ATIVO (de qualquer cargo) com `opcao_id` fora da forma uuid
--       v4; nenhum id velho sobrou; das alternativas do escopo só o id mudou (texto, etiqueta, peso,
--       `ordem`, pergunta — impressão digital do PRE); e, como o candidato da (d), `get_opcoes_sjt`
--       de cada item remapeado devolve 4 ids v4, nenhum velho.
--   (k) toda resposta SJT gravada (`scores_candidato.metadata.respostas[]`) resolve pelo par
--       (pergunta_id, opcao_id) para a MESMA alternativa de antes — ordem, etiqueta, peso; as do
--       escopo apontam os ids novos (contagem = a do PRE); e o id velho não sobrou em NENHUMA tabela
--       do banco (varredura por forma, `to_jsonb` de cada linha) fora do ledger, que guarda o texto
--       da migration semeadora como história.
--   (l) em toda linha de score SJT, o score gravado e o recomputado pela junção do `pontuar_sjt`
--       (pergunta_id + opcao_id → peso) são os de antes do remapeamento.
--   As expressões das impressões digitais de (j)–(l) são as MESMAS que o gerador emite no PRE e no
--   POS (`FP_ESCOPO`, `FP_RESPOSTAS`, `FP_SCORES`, `RE_V4` em `scripts/geradores/gen-sjt-v2.py`),
--   byte a byte — o `test_gen_sjt_v2.py` reprova se divergirem.
--   (m) WR-01 do 52-REVIEW-PORTAO-2 — o MAPA velho→novo (`supabase_migrations.p52_remap_opcao_sjt`)
--       existe, tem exatamente uma linha por alternativa do escopo do PRE (mesmos ids de linha, mesmos
--       ids velhos, uma versão só), o id novo de cada linha é o que a alternativa tem agora e é v4; e
--       nenhum papel de API o alcança — por privilégio (anon, authenticated, service_role: sem USAGE
--       no esquema, sem privilégio na tabela) e por comportamento (o candidato da (d) recebe 42501).
--       A (k) isenta este mapa da varredura do id velho: guardar o id velho é a função dele.
--   (n) WR-02 do 52-REVIEW-PORTAO-2 — `pontuar_sjt` no ar é o corpo novo (md5 do PRE) e, numa
--       candidatura de fixture (subtransação que REVERTE: vaga descartável com a bateria por cargo de
--       um item remapeado, uma candidatura de candidato real levada à `avaliacao_assincrona`), como o
--       CANDIDATO dono: (1) um conjunto VÁLIDO e completo grava o MESMO score, score_max, status e
--       metadata que o corpo VELHO (cópia `pg_temp` do `prosrc` que o PRE guardou) grava para a mesma
--       entrada; (2) o mesmo conjunto com o id VELHO de um item remapeado → 22023 'opcao fora da
--       pergunta'; (3) com um `opcao_id` forjado → o mesmo 22023; e (4) a mordida da própria
--       entrada: o corpo VELHO aceita (2) em silêncio, com nota parcial (o defeito que a cláusula
--       vigia). Sem escopo de remapeamento (estado já limpo), (2) e (4) usam o id forjado.
--
-- NÃO ESCREVE NADA, salvo a (n): só lê, e troca de papel dentro de funções `pg_temp` cujo bloco de
-- exceção desfaz o `SET LOCAL ROLE`; a (n) escreve só dentro de subtransações que revertem (sem
-- INSERT em `candidaturas`, cujo gatilho dispara e-mail). Mesmo assim só roda dentro do ensaio que ABORTA (bloco
-- `$p52_so_ensaio$`): é a migration prefixada que escreve, e ela tem de voltar.
--
-- COMO RODAR: node scripts/p52_ensaio.cjs --migracoes="$TMPDIR/20261011000003_p52_banco_sjt_v2.sql"
--   supabase/tests/p52_banco_sjt_smoke.sql
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52b.esperado`, abaixo). Hoje: 14 — a … n (o
-- `test_gen_sjt_v2.py` confere que o literal é o número de blocos `DO $<letra>$`).
-- (n) é a única cláusula que ESCREVE — dentro de subtransações que levantam `P52B1` e voltam antes
-- do aborto do ensaio; o ensaio aborta de qualquer forma.
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
SELECT set_config('smoke52b.esperado', '14', false);


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

-- (m) o candidato tenta ler o mapa do remapeamento (dinâmico: a tabela nasce na migration)
CREATE FUNCTION pg_temp.p52b_ler_mapa(p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52b_mapa$
DECLARE
  v_n bigint;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    EXECUTE 'SELECT count(*) FROM supabase_migrations.p52_remap_opcao_sjt' INTO v_n;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_n);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52b_mapa$;

-- (n) `pontuar_sjt` como o CANDIDATO dono (o caminho do cliente: authenticated + JWT)
CREATE FUNCTION pg_temp.p52b_pontuar(p_cdt uuid, p_resp jsonb, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52b_pontuar$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    v_r := public.pontuar_sjt(p_cdt, p_resp);
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52b_pontuar$;

-- (n) o corpo VELHO (cópia `pg_temp` criada na (n) a partir do `prosrc` que o PRE guardou), com o
-- mesmo JWT; roda como o dono do ensaio porque a cópia não é SECURITY DEFINER
CREATE FUNCTION pg_temp.p52b_pontuar_antigo(p_cdt uuid, p_resp jsonb, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52b_antigo$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    EXECUTE 'SELECT pg_temp.p52b_pontuar_velho($1, $2)' INTO v_r USING p_cdt, p_resp;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52b_antigo$;

-- (n) a linha SJT mc que a chamada gravou, sem carimbo de tempo; respostas em ordem de pergunta
CREATE FUNCTION pg_temp.p52b_linha_mc(p_cdt uuid)
 RETURNS jsonb
 LANGUAGE sql
AS $p52b_linha$
  SELECT jsonb_build_object('score', s.score, 'score_max', s.score_max, 'status', s.status,
                            'meta', s.metadata - 'respostas',
                            'resp', (SELECT coalesce(jsonb_agg(x ORDER BY x ->> 'pergunta_id'), '[]'::jsonb)
                                       FROM jsonb_array_elements(s.metadata -> 'respostas') x))
    FROM public.scores_candidato s
   WHERE s.candidatura_id = p_cdt AND s.tipo = 'sjt' AND s.subtipo = 'mc' AND s.pergunta_id IS NULL
$p52b_linha$;


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


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) remapeamento (WR-03) — as alternativas: nenhum item SJT ativo com opcao_id fora da forma
--     uuid v4, nenhum id velho sobrou, só o id mudou, e o CANDIDATO recebe os ids novos
-- ─────────────────────────────────────────────────────────────────────────────
DO $j$
DECLARE
  v_n      text   := nullif(current_setting('p52.banco_remap_n', true), '');
  v_velhos text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_velhos', true), ''), ','), ARRAY[]::text[]);
  v_ids    text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','), ARRAY[]::text[]);
  v_sub    uuid   := current_setting('smoke52b.cand')::uuid;
  v_fora   bigint;
  v_sobra  bigint;
  v_rot    text[] := ARRAY[]::text[];
  r        record;
  v_o      jsonb;
BEGIN
  IF v_n IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (j): p52.banco_remap_n vazio — o PRE do banco v2 nao mediu o escopo do remapeamento nesta transacao';
  END IF;
  IF cardinality(v_ids) <> v_n::bigint OR cardinality(v_velhos) <> v_n::bigint THEN
    RAISE EXCEPTION 'P52B FAIL (j): baseline do remapeamento incoerente (n=%, ids=%, velhos=%)', v_n, cardinality(v_ids), cardinality(v_velhos);
  END IF;
  SELECT count(*) INTO v_fora
    FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE p.tipo = 'sjt' AND p.status = 'active' AND o.opcao_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  SELECT count(*) INTO v_sobra FROM public.perguntas_opcao_sjt o WHERE lower(o.opcao_id::text) = ANY (v_velhos);
  IF v_fora <> 0 OR v_sobra <> 0 THEN
    RAISE EXCEPTION 'P52B FAIL (j): % alternativa(s) de item SJT ativo fora da forma uuid v4 e % ainda com id velho — o gabarito segue no opcao_id', v_fora, v_sobra;
  END IF;
  IF (SELECT md5(coalesce(string_agg(o.id::text || '|' || o.pergunta_id::text || '|' || o.tag::text || '|' || o.peso::text || '|' || o.ordem::text || '|' || md5(o.opcao_texto), E'\n' ORDER BY o.id::text COLLATE "C"), '')) FROM public.perguntas_opcao_sjt o WHERE o.id::text = ANY (string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','))) IS DISTINCT FROM current_setting('p52.banco_escopo_fp', true) THEN
    RAISE EXCEPTION 'P52B FAIL (j): uma alternativa do escopo mudou alem do opcao_id (texto, etiqueta, peso, ordem ou pergunta)';
  END IF;
  -- o que o candidato recebe de cada item remapeado: 4 ids, todos v4, nenhum velho
  FOR r IN SELECT DISTINCT o.pergunta_id FROM public.perguntas_opcao_sjt o WHERE o.id::text = ANY (v_ids) ORDER BY 1 LOOP
    v_o := pg_temp.p52b_opcoes(r.pergunta_id, v_sub);
    IF v_o ? 'err' OR jsonb_array_length(v_o -> 'ok') <> 4
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_o -> 'ok') x
                   WHERE x ->> 'opcao_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' OR lower(x ->> 'opcao_id') = ANY (v_velhos)) THEN
      v_rot := v_rot || (r.pergunta_id::text || ':' || coalesce(left(v_o ->> 'err', 60), 'id fora da forma'));
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (j): [%] — get_opcoes_sjt entrega ao candidato id que nao e uuid v4 novo', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52b.remap=' || v_n), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$j$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (k) remapeamento (WR-03) — as respostas gravadas: cada uma resolve para a MESMA alternativa de
--     antes (ordem, etiqueta, peso), as do escopo apontam os ids novos, e o id velho não sobrou em
--     NENHUMA tabela do banco (varredura por forma) fora do ledger, que guarda o texto da semeadora
-- ─────────────────────────────────────────────────────────────────────────────
DO $k$
DECLARE
  v_velhos text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_velhos', true), ''), ','), ARRAY[]::text[]);
  v_ids    text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','), ARRAY[]::text[]);
  v_refs   bigint;
  v_re     text;
  v_occ    bigint;
  v_fora   text[] := ARRAY[]::text[];
  v_tab    record;
BEGIN
  IF current_setting('p52.banco_respostas_fp', true) IS NULL OR current_setting('p52.banco_respostas_fp', true) = '' THEN
    RAISE EXCEPTION 'P52B FAIL (k): p52.banco_respostas_fp vazio — o PRE nao mediu as respostas gravadas';
  END IF;
  IF (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '#' || r.ord::text || '|' || coalesce(r.e ->> 'pergunta_id', '-') || '|' || coalesce(r.e ->> 'tag', '-') || '|' || coalesce(r.e ->> 'peso', '-') || '|' || coalesce((SELECT string_agg(o.ordem::text || ':' || o.tag::text || ':' || o.peso::text, ';' ORDER BY o.id) FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id::text = lower(r.e ->> 'pergunta_id') AND o.opcao_id::text = lower(r.e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) WITH ORDINALITY AS r(e, ord) WHERE s.tipo = 'sjt') q) IS DISTINCT FROM current_setting('p52.banco_respostas_fp', true) THEN
    RAISE EXCEPTION 'P52B FAIL (k): uma resposta SJT gravada deixou de resolver para a mesma alternativa (ordem, etiqueta, peso) de antes do remapeamento';
  END IF;
  SELECT count(*) INTO v_refs
    FROM public.scores_candidato s
   CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array'
                                                THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e
    JOIN public.perguntas_opcao_sjt o ON o.id::text = ANY (v_ids)
                                     AND o.pergunta_id::text = lower(e ->> 'pergunta_id')
                                     AND o.opcao_id::text = lower(e ->> 'opcao_id')
   WHERE s.tipo = 'sjt' AND jsonb_typeof(e) = 'object';
  IF v_refs::text IS DISTINCT FROM current_setting('p52.banco_remap_refs', true) THEN
    RAISE EXCEPTION 'P52B FAIL (k): % resposta(s) gravada(s) apontam as alternativas remapeadas, o PRE mediu %', v_refs, current_setting('p52.banco_remap_refs', true);
  END IF;
  IF cardinality(v_velhos) > 0 THEN
    v_re := '(' || array_to_string(v_velhos, '|') || ')';
    FOR v_tab IN SELECT format('%I.%I', n.nspname, c.relname) AS t
                   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relkind IN ('r', 'p')
                    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                    AND n.nspname NOT LIKE 'pg\_temp%' AND n.nspname NOT LIKE 'pg\_toast\_temp%'
                    AND c.oid <> 'supabase_migrations.schema_migrations'::regclass
                    -- o mapa do remapeamento (WR-01 do -2) guarda o id velho de propósito; a (m) o confere
                    AND c.oid IS DISTINCT FROM pg_catalog.to_regclass('supabase_migrations.p52_remap_opcao_sjt')
                  ORDER BY 1 LOOP
      EXECUTE format('SELECT count(*) FROM %s x WHERE to_jsonb(x)::text ~* %L', v_tab.t, v_re) INTO v_occ;
      IF v_occ > 0 THEN
        v_fora := v_fora || (v_tab.t || '=' || v_occ);
      END IF;
    END LOOP;
  END IF;
  IF cardinality(v_fora) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (k): id velho de alternativa ainda em [%] — o remapeamento nao alcancou todas as copias', array_to_string(v_fora, ', ');
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52b.refs_remap=' || v_refs::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$k$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (l) remapeamento (WR-03) — a pontuação: em toda linha de score SJT, o score gravado e o score
--     recomputado pela junção do `pontuar_sjt` (pergunta_id + opcao_id → peso) são os de antes
-- ─────────────────────────────────────────────────────────────────────────────
DO $l$
DECLARE
  v_n bigint;
BEGIN
  IF current_setting('p52.banco_scores_fp', true) IS NULL OR current_setting('p52.banco_scores_fp', true) = '' THEN
    RAISE EXCEPTION 'P52B FAIL (l): p52.banco_scores_fp vazio — o PRE nao mediu os scores';
  END IF;
  IF (SELECT md5(coalesce(string_agg(q.x, E'\n' ORDER BY q.x COLLATE "C"), '')) FROM (SELECT s.id::text || '|' || coalesce(s.score::text, '-') || '|' || coalesce(s.score_max::text, '-') || '|' || s.status::text || '|' || coalesce((SELECT sum(o.peso)::text FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.metadata -> 'respostas') = 'array' THEN s.metadata -> 'respostas' ELSE '[]'::jsonb END) e JOIN public.perguntas_opcao_sjt o ON o.pergunta_id::text = lower(e ->> 'pergunta_id') AND o.opcao_id::text = lower(e ->> 'opcao_id')), '-') AS x FROM public.scores_candidato s WHERE s.tipo = 'sjt') q) IS DISTINCT FROM current_setting('p52.banco_scores_fp', true) THEN
    RAISE EXCEPTION 'P52B FAIL (l): o score de uma linha SJT (gravado ou recomputado pelo par pergunta+opcao) mudou com o remapeamento';
  END IF;
  SELECT count(*) INTO v_n FROM public.scores_candidato s WHERE s.tipo = 'sjt';
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52b.scores_sjt=' || v_n::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$l$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (m) WR-01 do 52-REVIEW-PORTAO-2 — o mapa velho→novo do remapeamento: existe, é exatamente o
--     escopo do PRE, aponta os ids vigentes, e nenhum papel de API o alcança
-- ─────────────────────────────────────────────────────────────────────────────
DO $m$
DECLARE
  v_n      text     := nullif(current_setting('p52.banco_remap_n', true), '');
  v_ids    text     := coalesce(current_setting('p52.banco_remap_ids', true), '');
  v_velhos text     := coalesce(current_setting('p52.banco_remap_velhos', true), '');
  v_mapa   regclass := pg_catalog.to_regclass('supabase_migrations.p52_remap_opcao_sjt');
  v_sub    uuid     := current_setting('smoke52b.cand')::uuid;
  v_cnt    bigint;
  v_ok     bigint;
  v_v4     bigint;
  v_vers   bigint;
  v_mids   text;
  v_mvel   text;
  v_papel  text;
  v_lido   jsonb;
  v_rot    text[]   := ARRAY[]::text[];
BEGIN
  IF v_n IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (m): p52.banco_remap_n vazio — o PRE do banco v2 nao mediu o escopo do remapeamento nesta transacao';
  END IF;
  IF v_mapa IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (m): o mapa supabase_migrations.p52_remap_opcao_sjt nao existe — o remapeamento nao deixou registro para o desfazer';
  END IF;
  EXECUTE 'SELECT count(*), '
       || 'count(*) FILTER (WHERE o.opcao_id = m.opcao_id_novo AND o.pergunta_id = m.pergunta_id), '
       || 'count(*) FILTER (WHERE m.opcao_id_novo::text ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'' AND m.opcao_id_novo <> m.opcao_id_velho), '
       || 'count(DISTINCT m.versao), '
       || 'coalesce(string_agg(m.opcao_linha_id::text, '','' ORDER BY m.opcao_linha_id::text COLLATE "C"), ''''), '
       || 'coalesce(string_agg(lower(m.opcao_id_velho::text), '','' ORDER BY m.opcao_linha_id::text COLLATE "C"), '''') '
       || 'FROM supabase_migrations.p52_remap_opcao_sjt m LEFT JOIN public.perguntas_opcao_sjt o ON o.id = m.opcao_linha_id'
    INTO v_cnt, v_ok, v_v4, v_vers, v_mids, v_mvel;
  IF v_cnt::text <> v_n OR v_ok <> v_cnt OR v_v4 <> v_cnt OR v_mids IS DISTINCT FROM v_ids OR v_mvel IS DISTINCT FROM v_velhos
     OR (v_cnt > 0 AND v_vers <> 1) THEN
    v_rot := v_rot || format('conteudo: linhas=%s (PRE=%s), id novo vigente=%s, novo v4 e diferente do velho=%s, versoes=%s, ids iguais=%s, velhos iguais=%s',
                             v_cnt, v_n, v_ok, v_v4, v_vers, v_mids IS NOT DISTINCT FROM v_ids, v_mvel IS NOT DISTINCT FROM v_velhos);
  END IF;
  -- escopo deliberado: os três papéis do PostgREST e das EFs
  FOREACH v_papel IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_schema_privilege(v_papel, 'supabase_migrations', 'USAGE')
       OR has_table_privilege(v_papel, v_mapa, 'SELECT,INSERT,UPDATE,DELETE') THEN
      v_rot := v_rot || ('privilegio:' || v_papel);
    END IF;
  END LOOP;
  v_lido := pg_temp.p52b_ler_mapa(v_sub);
  IF coalesce(v_lido ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('candidato:' || coalesce(left(v_lido ->> 'err', 60), 'leu ' || (v_lido ->> 'ok') || ' linha(s)'));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (m): [%] — o mapa velho→novo nao e o registro do remapeamento, ou esta ao alcance de papel de API', array_to_string(v_rot, '; ');
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52b.mapa=' || v_cnt::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$m$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (n) WR-02 do 52-REVIEW-PORTAO-2 — `pontuar_sjt` recusa alto (22023) a resposta sem alternativa e
--     pontua o conjunto válido exatamente como o corpo velho. Fixture em subtransação que REVERTE.
-- ─────────────────────────────────────────────────────────────────────────────
DO $n$
DECLARE
  v_velho_src text   := nullif(current_setting('p52.banco_pontuar_velho', true), '');
  v_md5_novo  text   := nullif(current_setting('p52.banco_pontuar_md5_novo', true), '');
  v_ids       text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_ids', true), ''), ','), ARRAY[]::text[]);
  v_velhos    text[] := coalesce(string_to_array(nullif(current_setting('p52.banco_remap_velhos', true), ''), ','), ARRAY[]::text[]);
  v_cargo     text;
  v_pid       uuid;
  v_alvo      uuid;
  v_velho_id  text;
  v_esp_code  text   := '22023';
  v_esp_msg   text   := 'opcao fora da pergunta';
  v_forjado   text   := gen_random_uuid()::text;
  v_vaga      uuid   := gen_random_uuid();
  v_cdt       uuid;
  v_sub       uuid;
  v_bateria   bigint;
  v_valido    jsonb;
  v_com_velho jsonb;
  v_com_forj  jsonb;
  v_rc        int;
  v_a         jsonb;  v_la jsonb;
  v_b         jsonb;  v_lb jsonb;
  v_c         jsonb;
  v_d         jsonb;
  v_e         jsonb;  v_le jsonb;
  v_err       text;
  v_fim       boolean := false;
  v_rot       text[] := ARRAY[]::text[];
BEGIN
  IF v_velho_src IS NULL OR v_md5_novo IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (n): p52.banco_pontuar_velho/_md5_novo vazios — o PRE do pontuar_sjt nao rodou nesta transacao';
  END IF;
  IF (SELECT md5(p.prosrc) FROM pg_catalog.pg_proc p WHERE p.oid = to_regprocedure('public.pontuar_sjt(uuid,jsonb)')) IS DISTINCT FROM v_md5_novo THEN
    v_rot := v_rot || 'o pontuar_sjt no ar nao e o corpo novo'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt o WHERE o.opcao_id::text = v_forjado) THEN
    RAISE EXCEPTION 'P52B FAIL (n): o uuid forjado existe — repetir';
  END IF;

  -- a cópia do corpo VELHO, para a prova diferencial (pg_temp; some no aborto do ensaio)
  EXECUTE format('CREATE FUNCTION pg_temp.p52b_pontuar_velho(p_candidatura_id uuid, p_respostas jsonb) RETURNS jsonb LANGUAGE plpgsql AS %L', v_velho_src);

  -- a bateria: por cargo de um item REMAPEADO (o caso do WR-02) — o de MAIOR bateria, para a prova
  -- diferencial cobrir o maior número de itens; sem escopo, um cargo do texto
  SELECT p.cargo, p.id INTO v_cargo, v_pid
    FROM public.perguntas_opcao_sjt o JOIN public.perguntas p ON p.id = o.pergunta_id
   WHERE o.id::text = ANY (v_ids) AND p.status = 'active' AND p.formato = 'mc'
   ORDER BY (SELECT count(*) FROM public.perguntas q WHERE q.status = 'active' AND q.formato = 'mc' AND q.cargo = p.cargo) DESC,
            p.cargo, p.id
   LIMIT 1;
  IF v_cargo IS NULL THEN
    v_cargo := (string_to_array(current_setting('p52.banco_cargos'), ','))[1];
  ELSE
    SELECT v_velhos[i] INTO v_velho_id
      FROM generate_subscripts(v_ids, 1) i JOIN public.perguntas_opcao_sjt o ON o.id::text = v_ids[i]
     WHERE o.pergunta_id = v_pid ORDER BY i LIMIT 1;
  END IF;

  -- o conjunto VÁLIDO: um item por pergunta da bateria (o mesmo predicado do pontuar_sjt para bateria
  -- por cargo), alternativa variada pela posição — para a nota não ser trivial
  WITH bat AS (SELECT p.id, row_number() OVER (ORDER BY p.id) AS rn FROM public.perguntas p
                WHERE p.status = 'active' AND p.formato = 'mc' AND p.cargo = v_cargo),
       esc AS (SELECT b.id, b.rn, (SELECT array_agg(o.opcao_id::text ORDER BY o.ordem, o.id)
                                     FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = b.id) AS ops FROM bat b)
  SELECT (SELECT count(*) FROM bat),
         jsonb_agg(jsonb_build_object('pergunta_id', e.id::text, 'opcao_id', e.ops[1 + ((e.rn - 1) % cardinality(e.ops))::int]) ORDER BY e.id)
    INTO v_bateria, v_valido
    FROM esc e WHERE cardinality(e.ops) > 0;
  IF v_bateria = 0 OR v_valido IS NULL OR jsonb_array_length(v_valido) <> v_bateria THEN
    RAISE EXCEPTION 'P52B FAIL (n): a bateria do cargo % nao tem alternativas para todas as % pergunta(s) — populacao vazia nao prova nada', v_cargo, v_bateria;
  END IF;
  v_alvo := coalesce(v_pid, (v_valido -> 0 ->> 'pergunta_id')::uuid);
  SELECT jsonb_agg(CASE WHEN t.e ->> 'pergunta_id' = v_alvo::text
                        THEN jsonb_set(t.e, '{opcao_id}', to_jsonb(coalesce(v_velho_id, v_forjado))) ELSE t.e END ORDER BY t.ord),
         jsonb_agg(CASE WHEN t.e ->> 'pergunta_id' = v_alvo::text
                        THEN jsonb_set(t.e, '{opcao_id}', to_jsonb(v_forjado)) ELSE t.e END ORDER BY t.ord)
    INTO v_com_velho, v_com_forj
    FROM jsonb_array_elements(v_valido) WITH ORDINALITY AS t(e, ord);

  -- a candidatura do fixture: de um candidato real (user_id, fora do RH), não encerrada, sem linha
  -- SJT mc — levada, NA SUBTRANSAÇÃO, a uma vaga descartável e à etapa da avaliação. Nenhum INSERT
  -- em `candidaturas` (o gatilho de insert dispara e-mail).
  SELECT c.id, cd.user_id INTO v_cdt, v_sub
    FROM public.candidaturas c JOIN public.candidatos cd ON cd.id = c.candidato_id
   WHERE cd.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = cd.user_id)
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'sjt' AND s.subtipo = 'mc')
   ORDER BY c.created_at, c.id LIMIT 1;
  IF v_cdt IS NULL THEN
    RAISE EXCEPTION 'P52B FAIL (n): nenhuma candidatura nao encerrada, de candidato com user_id, sem SJT mc — populacao vazia nao prova nada';
  END IF;

  BEGIN
    INSERT INTO public.vagas (id, titulo, slug, testes_aplicaveis)
    VALUES (v_vaga, '[P52B SMOKE] pontuar_sjt (revertido)', 'p52b-smoke-' || replace(v_vaga::text, '-', ''),
            jsonb_build_array(jsonb_build_object('tipo', 'sjt', 'cargo', v_cargo)));
    UPDATE public.candidaturas
       SET vaga_id = v_vaga, etapa_atual = 'avaliacao_assincrona', etapa_justificativa = 'smoke52b (n): subtransacao revertida'
     WHERE id = v_cdt;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'o fixture atingiu % candidatura(s)', v_rc; END IF;

    -- (1a) corpo NOVO, como o candidato, conjunto válido
    BEGIN
      v_a := pg_temp.p52b_pontuar(v_cdt, v_valido, v_sub);
      v_la := pg_temp.p52b_linha_mc(v_cdt);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
    EXCEPTION WHEN SQLSTATE 'P52B1' THEN NULL;
    END;
    -- (1b) corpo VELHO, mesma entrada
    BEGIN
      v_b := pg_temp.p52b_pontuar_antigo(v_cdt, v_valido, v_sub);
      v_lb := pg_temp.p52b_linha_mc(v_cdt);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
    EXCEPTION WHEN SQLSTATE 'P52B1' THEN NULL;
    END;
    -- (2) corpo NOVO, id velho do item remapeado (ou forjado, sem escopo)
    BEGIN
      v_c := pg_temp.p52b_pontuar(v_cdt, v_com_velho, v_sub);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
    EXCEPTION WHEN SQLSTATE 'P52B1' THEN NULL;
    END;
    -- (3) corpo NOVO, opcao_id forjado
    BEGIN
      v_d := pg_temp.p52b_pontuar(v_cdt, v_com_forj, v_sub);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
    EXCEPTION WHEN SQLSTATE 'P52B1' THEN NULL;
    END;
    -- (4) a mordida da entrada: o corpo VELHO aceita (2) em silêncio, com nota parcial
    BEGIN
      v_e := pg_temp.p52b_pontuar_antigo(v_cdt, v_com_velho, v_sub);
      v_le := pg_temp.p52b_linha_mc(v_cdt);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
    EXCEPTION WHEN SQLSTATE 'P52B1' THEN NULL;
    END;
    v_fim := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52B1';
  EXCEPTION
    WHEN SQLSTATE 'P52B1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_fim THEN
    RAISE EXCEPTION 'P52B FAIL (n): a subtransacao do fixture abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = v_vaga)
     OR EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = v_cdt AND c.vaga_id = v_vaga) THEN
    RAISE EXCEPTION 'P52B FAIL (n): o fixture nao reverteu';
  END IF;

  IF v_a ? 'err' OR v_la IS NULL THEN
    v_rot := v_rot || ('valido(novo):' || coalesce(left(v_a ->> 'err', 80), 'sem linha gravada'));
  END IF;
  IF v_b ? 'err' OR v_lb IS NULL THEN
    v_rot := v_rot || ('valido(velho):' || coalesce(left(v_b ->> 'err', 80), 'sem linha gravada'));
  END IF;
  IF v_la IS NOT NULL AND v_lb IS NOT NULL AND v_la IS DISTINCT FROM v_lb THEN
    v_rot := v_rot || format('valido: o corpo novo gravou score %s/%s %s e o velho %s/%s %s (ou metadata diferente)',
                             v_la ->> 'score', v_la ->> 'score_max', v_la ->> 'status', v_lb ->> 'score', v_lb ->> 'score_max', v_lb ->> 'status');
  END IF;
  IF coalesce(v_c ->> 'err', '') <> v_esp_code || ':' || v_esp_msg THEN
    v_rot := v_rot || ('id ' || CASE WHEN v_velho_id IS NULL THEN 'forjado' ELSE 'velho' END || ':' ||
                       coalesce(left(v_c ->> 'err', 80), 'ACEITO (nota parcial em silencio)'));
  END IF;
  IF coalesce(v_d ->> 'err', '') <> v_esp_code || ':' || v_esp_msg THEN
    v_rot := v_rot || ('id forjado:' || coalesce(left(v_d ->> 'err', 80), 'ACEITO (nota parcial em silencio)'));
  END IF;
  IF v_e ? 'err' OR v_le IS NULL OR jsonb_array_length(v_le -> 'resp') <> v_bateria - 1 THEN
    v_rot := v_rot || ('a entrada nao exercita o defeito: o corpo velho ' ||
                       coalesce('recusou (' || left(v_e ->> 'err', 60) || ')', 'gravou ' || coalesce(jsonb_array_length(v_le -> 'resp')::text, 'nada') || ' de ' || v_bateria));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52B FAIL (n): [%] — o pontuar_sjt nao recusa alto a resposta sem alternativa, ou pontua o valido diferente do corpo velho', array_to_string(v_rot, '; ');
  END IF;
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' 52b.pontuar=bateria:' || v_bateria::text || ',valido=igual,22023=' || CASE WHEN v_velho_id IS NULL THEN 'forjado' ELSE 'velho+forjado' END ||
    ',velho_silencioso=' || jsonb_array_length(v_le -> 'resp')::text || '/' || v_bateria::text), false);
  PERFORM set_config('smoke52b.pass', (current_setting('smoke52b.pass')::int + 1)::text, false);
END
$n$;
