-- =============================================================================
-- Phase 52 / Plano 52-26 — smoke do GAP DE SERVIDOR (smoke52g) · JORN-52 (WR-04) e JORN-61 (F13)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000005_p52_sjt_uuid_e_nota_completa, GERADA por
-- `scripts/geradores/gen-p52-gap.cjs` a partir dos corpos vivos capturados):
--   · `public.pontuar_sjt` (WR-04 do 52-REVIEW-BANCO-1): duplicata e completude comparam
--     `pergunta_id` como UUID; payload malformado é recusado com 22023 'resposta malformada'.
--   · `public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)` (F13, IN-03 do 52-REVIEW-PORTAO-1):
--     nota 1–5 para TODA competência da análise nomeada (regra de `normalizeCompetencia`; sem
--     nenhuma, os 4 nomes de DEFAULT_COMPETENCIAS) e nenhuma chave fora; média só sobre o conjunto.
--
-- RODA COM A 0005 PREFIXADA E CONTRA O VIVO: não lê GUC nenhuma do PRE da migration (só a marca
-- `p52.tx` do ensaio). Antes do apply ele só fica verde com `--migracoes=<0005>`; depois do apply,
-- com `--sem-migracoes`.
--
-- ESCOPO LIDO NA EXECUÇÃO, nunca uuid nem contagem literal (fotografias do planejamento: 3
-- administradores ativos, 9 candidaturas no critério do fixture — a escolha é aqui, e população
-- vazia reprova):
--   · o cargo SJT: o de mais itens `mc` ativos (desempate por nome) — a bateria da vaga descartável
--     é a bateria POR CARGO (o mesmo predicado do `pontuar_sjt`: `status = 'active'`, `formato =
--     'mc'`, `cargo`);
--   · o conjunto VÁLIDO: um item por pergunta da bateria, alternativa variada pela posição;
--   · a candidatura: REAL, de candidato com `user_id` fora do RH, não encerrada, sem linha SJT `mc`,
--     sem `entrevista_analises` e sem linha `entrevista` em `scores_candidato` (desempate por
--     `created_at`, id). Nas cláusulas SJT ela é levada, dentro da subtransação da cláusula, a uma
--     vaga descartável (`testes_aplicaveis` do cargo) e à `avaliacao_assincrona` — nenhum INSERT em
--     `candidaturas` (o gatilho de insert dispara e-mail); o UPDATE dispara a cadeia de etapa e quem
--     protege é o ROLLBACK da subtransação (IN-01 do 52-REVIEW-BANCO-1). Nas cláusulas de
--     entrevista ela fica onde está (a `salvar_avaliacao_entrevista` só exige a análise ser DELA);
--   · o candidato dono: `SET LOCAL ROLE authenticated` + claims de candidato com `sub` = `user_id`;
--   · o RH: `SET LOCAL ROLE authenticated` + claims de `administrador` com `sub` = `user_id` de uma
--     linha de `usuarios_rh` com `role = 'administrador'`, `ativo`, sem `deleted_at`;
--   · as análises de fixture: INSERT em `entrevista_analises` dentro da subtransação da cláusula.
-- Cada cláusula roda na SUA subtransação, que reverte por SQLSTATE próprio (`P52G1`); depois dela
-- o smoke confere que nada ficou (vaga descartável, candidatura movida, análise, score).
--
-- CLÁUSULAS
--   (a) a mesma pergunta duas vezes — o `pergunta_id` em minúsculas e de novo em MAIÚSCULAS no lugar
--       do último item, que fica de fora — devolve exatamente 22023 'resposta duplicada', e nenhuma
--       linha SJT `mc` foi gravada para a candidatura.
--   (b) o conjunto válido completo grava `score` = soma dos `peso` escolhidos e `score_max` = soma do
--       maior `peso` de cada item (recomputados pela junção com `perguntas_opcao_sjt`), e
--       `metadata.answered` = `metadata.expected` = tamanho da bateria.
--   (c) análise de fixture com competências [Comunicação (competency), Atitude de Dono (competency,
--       duas vezes), Liderança (competencia, com competency 'X')] — conjunto esperado {Comunicação,
--       Atitude de Dono, Liderança}: a primária com 2 das 3 notas devolve 23514 'scores_humanos
--       incompleto', a análise segue com `scores_humanos`/`status_analise` de antes e nenhuma linha
--       `entrevista` em `scores_candidato`.
--   (d) a mesma análise com as 3 notas (4, 5, 3) grava: retorno `score_entrevista` = 4.00,
--       `status_analise` 'concluida', linha `entrevista` com `score` 4.00.
--
-- Toda recusa é conferida por SQLSTATE E pelo rótulo da mensagem (sem o rótulo, uma recusa por
-- outro motivo passaria por esta).
--
-- COMO RODAR: node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql
--   supabase/tests/p52_gap_servidor_smoke.sql            (antes do apply)
--             node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_gap_servidor_smoke.sql (depois)
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo (ele COMMITA): a guarda abaixo recusa.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52g.esperado`, abaixo). Hoje: 4 — a … d.
-- Reprovação: `P52G FAIL (<letra>): …` — só SQLSTATE, rótulos, contagens e notas; nenhum dado pessoal.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52G RECUSADO (fora do ensaio): este smoke so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs --migracoes=<0005> supabase/tests/p52_gap_servidor_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52G RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%). Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke52g.pass', '0', false);
SELECT set_config('smoke52g.esperado', '4', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Chamadas pelos papéis do cliente. Cada uma devolve {ok: …} ou {err: 'SQLSTATE:SQLERRM'}; o erro
-- desfaz a subtransação dela, inclusive o SET LOCAL ROLE. Somem no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
-- `pontuar_sjt` como o CANDIDATO dono (authenticated + JWT de candidato)
CREATE FUNCTION pg_temp.p52g_pontuar(p_cdt uuid, p_resp jsonb, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52g_pontuar$
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
$p52g_pontuar$;

-- `salvar_avaliacao_entrevista` de 4 argumentos como o RH (authenticated + JWT de administrador)
CREATE FUNCTION pg_temp.p52g_salvar4(p_cdt uuid, p_analise uuid, p_scores jsonb, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52g_salvar4$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'administrador'))::text, true);
    v_r := public.salvar_avaliacao_entrevista(p_cdt, p_analise, p_scores, 'Notas do gestor no smoke P52G.');
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52g_salvar4$;

-- leva a candidatura do escopo à vaga descartável (bateria por cargo) e à avaliação assíncrona —
-- SÓ dentro da subtransação da cláusula, que reverte
CREATE FUNCTION pg_temp.p52g_fixture_sjt(p_vaga uuid, p_cdt uuid, p_cargo text)
 RETURNS void
 LANGUAGE plpgsql
AS $p52g_fixture$
DECLARE
  v_rc int;
BEGIN
  INSERT INTO public.vagas (id, titulo, slug, testes_aplicaveis)
  VALUES (p_vaga, '[P52G SMOKE] gap de servidor (revertido)', 'p52g-smoke-' || replace(p_vaga::text, '-', ''),
          jsonb_build_array(jsonb_build_object('tipo', 'sjt', 'cargo', p_cargo)));
  UPDATE public.candidaturas
     SET vaga_id = p_vaga, etapa_atual = 'avaliacao_assincrona', etapa_justificativa = 'smoke52g: subtransacao revertida'
   WHERE id = p_cdt;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  IF v_rc <> 1 THEN RAISE EXCEPTION 'o fixture atingiu % candidatura(s)', v_rc; END IF;
END
$p52g_fixture$;

-- análise de fixture da candidatura do escopo (vigente: não superada, não falhou, competências não nulas)
CREATE FUNCTION pg_temp.p52g_analise(p_cdt uuid, p_comp jsonb)
 RETURNS uuid
 LANGUAGE sql
AS $p52g_analise$
  INSERT INTO public.entrevista_analises (candidatura_id, tipo, competencias, bloqueio_avanco, status_analise, prompt_version)
  VALUES (p_cdt, 'online', p_comp, false, 'pendente_humano', 'p52g-smoke')
  RETURNING id
$p52g_analise$;

-- a linha SJT mc da candidatura (score, score_max, answered, expected), ou nula
CREATE FUNCTION pg_temp.p52g_linha_mc(p_cdt uuid)
 RETURNS jsonb
 LANGUAGE sql
AS $p52g_linha$
  SELECT jsonb_build_object('score', s.score, 'score_max', s.score_max,
                            'answered', s.metadata -> 'answered', 'expected', s.metadata -> 'expected')
    FROM public.scores_candidato s
   WHERE s.candidatura_id = p_cdt AND s.tipo = 'sjt' AND s.subtipo = 'mc' AND s.pergunta_id IS NULL
$p52g_linha$;

-- depois de cada cláusula: nada do fixture ficou
CREATE FUNCTION pg_temp.p52g_reverteu(p_letra text, p_vaga uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $p52g_reverteu$
DECLARE
  v_cdt uuid := current_setting('p52g.cdt')::uuid;
BEGIN
  IF (p_vaga IS NOT NULL AND EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = p_vaga))
     OR (p_vaga IS NOT NULL AND EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = v_cdt AND c.vaga_id = p_vaga))
     OR EXISTS (SELECT 1 FROM public.entrevista_analises ea WHERE ea.candidatura_id = v_cdt)
     OR EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = v_cdt
                   AND ((s.tipo = 'sjt' AND s.subtipo = 'mc') OR s.tipo = 'entrevista')) THEN
    RAISE EXCEPTION 'P52G FAIL (%): o fixture nao reverteu', p_letra;
  END IF;
END
$p52g_reverteu$;

CREATE FUNCTION pg_temp.p52g_passou(p_ev text)
 RETURNS void
 LANGUAGE sql
AS $p52g_passou$
  SELECT set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') || ' ' || p_ev), false),
         set_config('smoke52g.pass', (current_setting('smoke52g.pass')::int + 1)::text, false)
$p52g_passou$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ESCOPO — lido NESTA execução; população vazia reprova (nada a provar sobre o vazio).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $escopo$
DECLARE
  v_cargo   text;
  v_bateria bigint;
  v_valido  jsonb;
  v_cdt     uuid;
  v_sub     uuid;
  v_admin   uuid;
BEGIN
  SELECT p.cargo INTO v_cargo
    FROM public.perguntas p
   WHERE p.status = 'active' AND p.formato = 'mc' AND p.cargo IS NOT NULL
   GROUP BY p.cargo
   ORDER BY count(*) DESC, p.cargo
   LIMIT 1;
  IF v_cargo IS NULL THEN
    RAISE EXCEPTION 'P52G FAIL (escopo): nenhum cargo com item SJT mc ativo — populacao vazia nao prova nada';
  END IF;

  -- o conjunto VÁLIDO: um item por pergunta da bateria (o predicado do pontuar_sjt para bateria por
  -- cargo), alternativa variada pela posição — para a nota não ser trivial
  WITH bat AS (SELECT p.id, row_number() OVER (ORDER BY p.id) AS rn FROM public.perguntas p
                WHERE p.status = 'active' AND p.formato = 'mc' AND p.cargo = v_cargo),
       esc AS (SELECT b.id, b.rn, (SELECT array_agg(o.opcao_id::text ORDER BY o.ordem, o.id)
                                     FROM public.perguntas_opcao_sjt o WHERE o.pergunta_id = b.id) AS ops FROM bat b)
  SELECT (SELECT count(*) FROM bat),
         jsonb_agg(jsonb_build_object('pergunta_id', e.id::text, 'opcao_id', e.ops[1 + ((e.rn - 1) % cardinality(e.ops))::int]) ORDER BY e.rn)
    INTO v_bateria, v_valido
    FROM esc e WHERE cardinality(e.ops) > 0;
  IF v_bateria < 2 OR v_valido IS NULL OR jsonb_array_length(v_valido) <> v_bateria THEN
    RAISE EXCEPTION 'P52G FAIL (escopo): a bateria do cargo % tem % pergunta(s) e % com alternativas — sem 2+ itens completos a duplicata nao se exercita', v_cargo, v_bateria, coalesce(jsonb_array_length(v_valido), 0);
  END IF;

  SELECT c.id, cd.user_id INTO v_cdt, v_sub
    FROM public.candidaturas c JOIN public.candidatos cd ON cd.id = c.candidato_id
   WHERE cd.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = cd.user_id)
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'sjt' AND s.subtipo = 'mc')
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'entrevista')
     AND NOT EXISTS (SELECT 1 FROM public.entrevista_analises ea WHERE ea.candidatura_id = c.id)
   ORDER BY c.created_at, c.id LIMIT 1;
  IF v_cdt IS NULL THEN
    RAISE EXCEPTION 'P52G FAIL (escopo): nenhuma candidatura nao encerrada, de candidato com user_id fora do RH, sem SJT mc, sem analise e sem score de entrevista — populacao vazia nao prova nada';
  END IF;

  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P52G FAIL (escopo): nenhum administrador ATIVO — sem ele a salvar_avaliacao_entrevista nao tem quem a chame';
  END IF;

  PERFORM set_config('p52g.cargo',   v_cargo,           true);
  PERFORM set_config('p52g.bateria', v_bateria::text,   true);
  PERFORM set_config('p52g.valido',  v_valido::text,    true);
  PERFORM set_config('p52g.cdt',     v_cdt::text,       true);
  PERFORM set_config('p52g.sub',     v_sub::text,       true);
  PERFORM set_config('p52g.admin',   v_admin::text,     true);
  PERFORM set_config('p52.evidencia', btrim(coalesce(current_setting('p52.evidencia', true), '') ||
    ' 52g.escopo=cargo:' || v_cargo || ',bateria:' || v_bateria::text), false);
END
$escopo$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) WR-04 — a mesma pergunta em caixa diferente: 22023 'resposta duplicada', nada gravado
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_cdt    uuid  := current_setting('p52g.cdt')::uuid;
  v_sub    uuid  := current_setting('p52g.sub')::uuid;
  v_cargo  text  := current_setting('p52g.cargo');
  v_valido jsonb := current_setting('p52g.valido')::jsonb;
  v_n      int   := current_setting('p52g.bateria')::int;
  v_vaga   uuid  := gen_random_uuid();
  v_pid    text  := current_setting('p52g.valido')::jsonb -> 0 ->> 'pergunta_id';
  v_pay    jsonb;
  v_r      jsonb;
  v_linhas bigint;
  v_err    text;
  v_fim    boolean := false;
BEGIN
  IF upper(v_pid) = v_pid THEN
    RAISE EXCEPTION 'P52G FAIL (a): o pergunta_id escolhido nao tem letra — a entrada nao exercita a caixa';
  END IF;
  -- o 1º item em minúsculas (como está) e de novo em MAIÚSCULAS no lugar do último, que fica de fora
  SELECT jsonb_agg(CASE WHEN t.ord = v_n
                        THEN jsonb_build_object('pergunta_id', upper(v_pid), 'opcao_id', v_valido -> 0 ->> 'opcao_id')
                        ELSE t.e END ORDER BY t.ord)
    INTO v_pay
    FROM jsonb_array_elements(v_valido) WITH ORDINALITY AS t(e, ord);
  BEGIN
    PERFORM pg_temp.p52g_fixture_sjt(v_vaga, v_cdt, v_cargo);
    v_r := pg_temp.p52g_pontuar(v_cdt, v_pay, v_sub);
    SELECT count(*) INTO v_linhas FROM public.scores_candidato s
     WHERE s.candidatura_id = v_cdt AND s.tipo = 'sjt' AND s.subtipo = 'mc';
    v_fim := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52G1';
  EXCEPTION
    WHEN SQLSTATE 'P52G1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  PERFORM pg_temp.p52g_reverteu('a', v_vaga);
  IF v_err IS NOT NULL OR NOT v_fim THEN
    RAISE EXCEPTION 'P52G FAIL (a): a subtransacao do fixture abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_r ->> 'err', '') <> '22023:resposta duplicada' OR v_linhas <> 0 THEN
    RAISE EXCEPTION 'P52G FAIL (a): a mesma pergunta em caixa diferente devolveu [%] e gravou % linha(s) SJT mc — esperado 22023 resposta duplicada e nada gravado',
      coalesce(left(v_r ->> 'err', 120), 'ACEITO'), v_linhas;
  END IF;
  PERFORM pg_temp.p52g_passou('52g.a=22023:dup');
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) WR-04 — o conjunto válido é pontuado igual à junção
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_cdt     uuid  := current_setting('p52g.cdt')::uuid;
  v_sub     uuid  := current_setting('p52g.sub')::uuid;
  v_cargo   text  := current_setting('p52g.cargo');
  v_valido  jsonb := current_setting('p52g.valido')::jsonb;
  v_n       int   := current_setting('p52g.bateria')::int;
  v_vaga    uuid  := gen_random_uuid();
  v_esp     numeric;
  v_esp_max numeric;
  v_r       jsonb;
  v_l       jsonb;
  v_err     text;
  v_fim     boolean := false;
BEGIN
  SELECT sum(o.peso) INTO v_esp
    FROM jsonb_array_elements(v_valido) e
    JOIN public.perguntas_opcao_sjt o ON o.pergunta_id = (e ->> 'pergunta_id')::uuid AND o.opcao_id = (e ->> 'opcao_id')::uuid;
  SELECT sum(m.mx) INTO v_esp_max
    FROM (SELECT max(o.peso) AS mx FROM public.perguntas_opcao_sjt o
           WHERE o.pergunta_id IN (SELECT (e ->> 'pergunta_id')::uuid FROM jsonb_array_elements(v_valido) e)
           GROUP BY o.pergunta_id) m;
  IF v_esp IS NULL OR v_esp_max IS NULL OR v_esp_max = 0 THEN
    RAISE EXCEPTION 'P52G FAIL (b): a juncao do conjunto valido nao recomputa nota (score %, max %) — o defeito e do SMOKE', v_esp, v_esp_max;
  END IF;
  BEGIN
    PERFORM pg_temp.p52g_fixture_sjt(v_vaga, v_cdt, v_cargo);
    v_r := pg_temp.p52g_pontuar(v_cdt, v_valido, v_sub);
    v_l := pg_temp.p52g_linha_mc(v_cdt);
    v_fim := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52G1';
  EXCEPTION
    WHEN SQLSTATE 'P52G1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  PERFORM pg_temp.p52g_reverteu('b', v_vaga);
  IF v_err IS NOT NULL OR NOT v_fim THEN
    RAISE EXCEPTION 'P52G FAIL (b): a subtransacao do fixture abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF v_r ? 'err' OR v_l IS NULL
     OR (v_l ->> 'score')::numeric IS DISTINCT FROM v_esp
     OR (v_l ->> 'score_max')::numeric IS DISTINCT FROM v_esp_max
     OR (v_l ->> 'answered')::int IS DISTINCT FROM v_n
     OR (v_l ->> 'expected')::int IS DISTINCT FROM v_n THEN
    RAISE EXCEPTION 'P52G FAIL (b): o conjunto valido devolveu [%] e gravou %; esperado score %/% e answered = expected = %',
      coalesce(left(v_r ->> 'err', 120), 'ok'), coalesce(v_l::text, 'nada'), v_esp, v_esp_max, v_n;
  END IF;
  PERFORM pg_temp.p52g_passou('52g.b=' || v_esp::text || '/' || v_esp_max::text);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) F13 — a avaliação sem uma competência é recusada (23514) e nada muda
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_cdt   uuid := current_setting('p52g.cdt')::uuid;
  v_admin uuid := current_setting('p52g.admin')::uuid;
  v_an    uuid;
  v_r     jsonb;
  v_sh_antes jsonb;  v_st_antes text;
  v_sh    jsonb;  v_st text;
  v_sc    bigint;
  v_err   text;
  v_fim   boolean := false;
BEGIN
  BEGIN
    v_an := pg_temp.p52g_analise(v_cdt,
      '[{"competency":"Comunicação"},{"competency":"Atitude de Dono"},{"competency":"Atitude de Dono"},{"competencia":"Liderança","competency":"X"}]'::jsonb);
    SELECT ea.scores_humanos, ea.status_analise INTO v_sh_antes, v_st_antes FROM public.entrevista_analises ea WHERE ea.id = v_an;
    v_r := pg_temp.p52g_salvar4(v_cdt, v_an, '{"Comunicação":4,"Atitude de Dono":5}'::jsonb, v_admin);
    SELECT ea.scores_humanos, ea.status_analise INTO v_sh, v_st FROM public.entrevista_analises ea WHERE ea.id = v_an;
    SELECT count(*) INTO v_sc FROM public.scores_candidato s WHERE s.candidatura_id = v_cdt AND s.tipo = 'entrevista';
    v_fim := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52G1';
  EXCEPTION
    WHEN SQLSTATE 'P52G1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  PERFORM pg_temp.p52g_reverteu('c', NULL);
  IF v_err IS NOT NULL OR NOT v_fim THEN
    RAISE EXCEPTION 'P52G FAIL (c): a subtransacao do fixture abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_r ->> 'err', '') NOT LIKE '23514:scores_humanos incompleto%'
     OR v_sh IS DISTINCT FROM v_sh_antes OR v_st IS DISTINCT FROM v_st_antes OR v_sc <> 0 THEN
    RAISE EXCEPTION 'P52G FAIL (c): 2 de 3 competencias devolveu [%]; a analise ficou scores_humanos=% status=% (antes %/%) e % linha(s) entrevista — esperado 23514 scores_humanos incompleto e nada mudado',
      coalesce(left(v_r ->> 'err', 120), 'ACEITO'), coalesce(v_sh::text, 'null'), v_st, coalesce(v_sh_antes::text, 'null'), v_st_antes, v_sc;
  END IF;
  PERFORM pg_temp.p52g_passou('52g.c=23514:incompleto');
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) F13 — a avaliação completa grava, com a média só sobre o conjunto
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_cdt   uuid := current_setting('p52g.cdt')::uuid;
  v_admin uuid := current_setting('p52g.admin')::uuid;
  v_an    uuid;
  v_r     jsonb;
  v_st    text;
  v_sc    numeric;
  v_err   text;
  v_fim   boolean := false;
BEGIN
  BEGIN
    v_an := pg_temp.p52g_analise(v_cdt,
      '[{"competency":"Comunicação"},{"competency":"Atitude de Dono"},{"competency":"Atitude de Dono"},{"competencia":"Liderança","competency":"X"}]'::jsonb);
    v_r := pg_temp.p52g_salvar4(v_cdt, v_an, '{"Comunicação":4,"Atitude de Dono":5,"Liderança":3}'::jsonb, v_admin);
    SELECT ea.status_analise INTO v_st FROM public.entrevista_analises ea WHERE ea.id = v_an;
    SELECT s.score INTO v_sc FROM public.scores_candidato s WHERE s.candidatura_id = v_cdt AND s.tipo = 'entrevista';
    v_fim := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52G1';
  EXCEPTION
    WHEN SQLSTATE 'P52G1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  PERFORM pg_temp.p52g_reverteu('d', NULL);
  IF v_err IS NOT NULL OR NOT v_fim THEN
    RAISE EXCEPTION 'P52G FAIL (d): a subtransacao do fixture abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF v_r ? 'err' OR (v_r -> 'ok' ->> 'score_entrevista')::numeric IS DISTINCT FROM 4.00
     OR v_st IS DISTINCT FROM 'concluida' OR v_sc IS DISTINCT FROM 4.00 THEN
    RAISE EXCEPTION 'P52G FAIL (d): a avaliacao completa devolveu [%]; status %, score entrevista % — esperado 4.00, concluida, 4.00',
      coalesce(left(v_r ->> 'err', 120), v_r -> 'ok' ->> 'score_entrevista'), v_st, v_sc;
  END IF;
  PERFORM pg_temp.p52g_passou('52g.d=4.00');
END
$d$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
