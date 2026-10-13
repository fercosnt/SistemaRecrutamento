-- =============================================================================
-- Phase 52 / Plano 52-19 — smoke da POPULAÇÃO DA LIMPEZA dos dados de teste (smoke52d)
--   D-30 (emenda «por conta, qualquer status» + trava «só candidatos»), D-32, JORN-63
-- =============================================================================
-- SÓ LEITURA. Nenhuma escrita, nenhum objeto criado (nem temporário): só SELECT e set_config
-- de GUCs de sessão (as marcas do ensaio). Recusa rodar fora do ensaio que ABORTA (marca p52.tx).
--
-- AS MESMAS CTEs do `scripts/p52_limpeza_portao.cjs` (`SQL_VARREDURA`) — a população POR CONTA,
-- com duas entradas e a trava do RH:
--   (i)  conta de `candidatos` cujo e-mail (minúsculas) casa um padrão de teste: a lista da D-30 POR
--        INTEIRO (+claudeN, +cand1, @teste.com, @invalido.local) MAIS a semente do p47 menos o
--        candidato do admin — LISTA COPIADA do script (`PADROES_D30` + `SEMENTE_P47`; o
--        `--auto-teste` do script confere que cada padrão está aqui, literal);
--   (ii) toda candidatura em vaga de teste (`titulo ILIKE '%[TESTE%'` ou `slug ILIKE 'teste-%'`,
--        qualquer status e deleted_at), seja qual for a conta;
--   TRAVA: todo `candidatos.user_id` presente em `usuarios_rh` fora das DUAS entradas, por
--        anti-join `NOT EXISTS`.
--
-- CLÁUSULAS (esperado FIXO = 5, escopo deliberado deste arquivo, num ÚNICO literal abaixo):
--   (a) entrada (i) não vazia;
--   (b) entrada (ii) não vazia;
--   (c) `NOT EXISTS` = `NOT IN`, nas DUAS entradas, e zero `user_id` nulo em `usuarios_rh`: a
--       cláusula calcula as duas formas e exige igualdade — prova de que o anti-join é o que está
--       em uso e de que hoje não há nulo do lado do RH. ⚠ A forma `NOT IN` é escrita como
--       `(user_id IS NULL OR user_id NOT IN (SELECT r.user_id FROM usuarios_rh r))`: o `IS NULL` do
--       LADO ESQUERDO é obrigatório porque 8 candidatos legítimos (os 6 fictícios e os tombstones)
--       têm `user_id` nulo e cairiam fora por desconhecido; o que a cláusula vigia é o nulo do
--       LADO DIREITO (um `user_id` nulo em `usuarios_rh` torna `NOT IN` desconhecido para TODO
--       candidato, e o portão veria «0») — esse continua morto pela divergência;
--   (d) a soma das categorias da partição de `candidatos` fecha com o total (nada some do relatório);
--   (e) toda candidatura de `OBRIGATORIAS_NA_POPULACAO` está na população — (i) ∪ (ii), fora da
--       trava. Lista COPIADA de `scripts/p52_limpeza_portao.cjs` (`OBRIGATORIAS_NA_POPULACAO`):
--       hoje só a `3a9254c3` (conta +claude6, aceite do 51-17; `52-18-DECISAO-OPERADOR.md`).
--   As contagens publicadas em `p52.evidencia` (`52d.pop=…`) são a evidência — nunca e-mail ou nome.
--
-- COMO RODAR: SÓ pelo envelope que aborta —
--   node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_populacao_limpeza.sql
-- ⚠ PROIBIDO `node p46apply.cjs run` deste arquivo (o bloco `$p52_so_ensaio$` recusa).
-- =============================================================================

DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52D RECUSADO (fora do ensaio): este smoke so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela. Nada rodou. Use: node scripts/p52_ensaio.cjs --sem-migracoes supabase/tests/p52_populacao_limpeza.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52D RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%). Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;

SELECT set_config('smoke52d.pass', '0', false);
SELECT set_config('smoke52d.esperado', '5', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- MEDIÇÃO — as CTEs do SQL_VARREDURA, uma consulta, contagens em GUCs (nenhum id sai daqui).
-- ─────────────────────────────────────────────────────────────────────────────
DO $med$
DECLARE
  m record;
BEGIN
  WITH
  rh AS (SELECT r.user_id FROM public.usuarios_rh r),
  padroes(p) AS (VALUES
    -- D-30 por inteiro (PADROES_D30)
    ('fernandinho.costa.neto+claude%@gmail.com'), ('fernandinho.costa.neto+cand1@gmail.com'), ('%@teste.com'), ('%@invalido.local'),
    -- semente do p47 menos o candidato do admin (SEMENTE_P47)
    ('test+%@beautysmile.com.br'), ('uat-form-%@beautysmile.com.br'), ('fernandinho.costa.neto+cand%@gmail.com'),
    ('fernando@fotona.com.br'), ('paulista@beautysmile.com.br'), ('%.teste@invalido.local'), ('anonimizado+%@invalido.local')
  ),
  -- OBRIGATORIAS_NA_POPULACAO — cópia de scripts/p52_limpeza_portao.cjs (escopo deliberado)
  ob(id) AS (VALUES ('3a9254c3-8086-42df-8d81-42889c3a1f8d'::uuid)),
  eh_rh AS (SELECT c.id FROM public.candidatos c WHERE EXISTS (SELECT 1 FROM rh WHERE rh.user_id = c.user_id)),
  cand_i AS (
    SELECT c.id FROM public.candidatos c
     WHERE EXISTS (SELECT 1 FROM padroes WHERE lower(c.email) LIKE padroes.p)
       AND NOT EXISTS (SELECT 1 FROM rh WHERE rh.user_id = c.user_id)),
  cand_i_notin AS (
    SELECT c.id FROM public.candidatos c
     WHERE EXISTS (SELECT 1 FROM padroes WHERE lower(c.email) LIKE padroes.p)
       AND (c.user_id IS NULL OR c.user_id NOT IN (SELECT r.user_id FROM public.usuarios_rh r))),
  vaga_teste AS (
    SELECT v.id FROM public.vagas v WHERE v.titulo ILIKE '%[TESTE%' OR v.slug ILIKE 'teste-%'),
  cand_ii AS (
    SELECT DISTINCT k.candidato_id AS id FROM public.candidaturas k JOIN vaga_teste t ON t.id = k.vaga_id
     WHERE NOT EXISTS (SELECT 1 FROM public.candidatos c JOIN rh ON rh.user_id = c.user_id WHERE c.id = k.candidato_id)),
  cand_ii_notin AS (
    SELECT DISTINCT k.candidato_id AS id FROM public.candidaturas k JOIN vaga_teste t ON t.id = k.vaga_id
      JOIN public.candidatos c ON c.id = k.candidato_id
     WHERE (c.user_id IS NULL OR c.user_id NOT IN (SELECT r.user_id FROM public.usuarios_rh r))),
  pop AS (SELECT id FROM cand_i UNION SELECT id FROM cand_ii),
  cls AS (
    SELECT c.id,
      CASE
        WHEN EXISTS (SELECT 1 FROM rh WHERE rh.user_id = c.user_id) THEN 'trava_rh_excluidos'
        WHEN lower(c.email) LIKE 'fixture-p46+%@invalido.local' THEN 'fixtures_p46'
        WHEN lower(c.email) LIKE '%.teste@invalido.local' AND c.user_id IS NULL THEN 'ficticios'
        WHEN c.email = 'anonimizado+' || c.id::text || '@invalido.local' AND c.user_id IS NULL AND c.data_nascimento = date '1900-01-01' THEN 'tombstones'
        WHEN EXISTS (SELECT 1 FROM pop WHERE pop.id = c.id) AND EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.candidato_id = c.id) THEN 'contas_teste_com_candidatura'
        WHEN EXISTS (SELECT 1 FROM pop WHERE pop.id = c.id) THEN 'contas_sem_candidatura'
        ELSE 'fora_da_populacao'
      END AS cat
    FROM public.candidatos c),
  obr AS (
    SELECT ob.id,
      (k.id IS NOT NULL
        AND EXISTS (SELECT 1 FROM pop WHERE pop.id = k.candidato_id)
        AND NOT EXISTS (SELECT 1 FROM eh_rh WHERE eh_rh.id = k.candidato_id)) AS na_pop
    FROM ob LEFT JOIN public.candidaturas k ON k.id = ob.id)
  SELECT
    (SELECT count(*) FROM public.candidatos)                                   AS total,
    (SELECT count(*) FROM cand_i)                                              AS n_i,
    (SELECT count(*) FROM cand_ii)                                             AS n_ii,
    (SELECT count(*) FROM cand_i_notin)                                        AS n_i_notin,
    (SELECT count(*) FROM cand_ii_notin)                                       AS n_ii_notin,
    (SELECT count(*) FROM public.usuarios_rh r WHERE r.user_id IS NULL)        AS rh_nulo,
    (SELECT count(*) FROM eh_rh)                                               AS trava,
    (SELECT count(*) FROM pop)                                                 AS n_pop,
    (SELECT count(*) FROM cls WHERE cls.cat IN ('trava_rh_excluidos', 'fixtures_p46', 'ficticios', 'tombstones',
       'contas_teste_com_candidatura', 'contas_sem_candidatura', 'fora_da_populacao')) AS soma,
    (SELECT count(*) FROM ob)                                                  AS n_ob,
    (SELECT count(*) FROM obr WHERE obr.na_pop)                                AS n_ob_na_pop,
    (SELECT count(*) FROM cls WHERE cls.cat = 'fora_da_populacao')             AS fora
  INTO m;

  PERFORM set_config('smoke52d.total', m.total::text, false);
  PERFORM set_config('smoke52d.n_i', m.n_i::text, false);
  PERFORM set_config('smoke52d.n_ii', m.n_ii::text, false);
  PERFORM set_config('smoke52d.n_i_notin', m.n_i_notin::text, false);
  PERFORM set_config('smoke52d.n_ii_notin', m.n_ii_notin::text, false);
  PERFORM set_config('smoke52d.rh_nulo', m.rh_nulo::text, false);
  PERFORM set_config('smoke52d.soma', m.soma::text, false);
  PERFORM set_config('smoke52d.n_ob', m.n_ob::text, false);
  PERFORM set_config('smoke52d.n_ob_na_pop', m.n_ob_na_pop::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52d.pop=total:' || m.total || ',i:' || m.n_i
      || ',ii:' || m.n_ii || ',pop:' || m.n_pop || ',trava:' || m.trava || ',fora:' || m.fora
      || ',obrig:' || m.n_ob_na_pop || '/' || m.n_ob), false);
END
$med$;

-- (a) entrada (i) não vazia — população vazia não prova nada
DO $a$
BEGIN
  IF current_setting('smoke52d.n_i')::int < 1 THEN
    RAISE EXCEPTION 'P52D FAIL (a): entrada (i) vazia — nenhuma conta casa os padroes de teste (a populacao vazia mente)';
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$a$;

-- (b) entrada (ii) não vazia
DO $b$
BEGIN
  IF current_setting('smoke52d.n_ii')::int < 1 THEN
    RAISE EXCEPTION 'P52D FAIL (b): entrada (ii) vazia — nenhuma candidatura de candidato em vaga de teste (a populacao vazia mente)';
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$b$;

-- (c) NOT EXISTS = NOT IN nas duas entradas, e nenhum user_id nulo em usuarios_rh
DO $c$
DECLARE
  v_rot text[] := '{}';
BEGIN
  IF current_setting('smoke52d.n_i')::int <> current_setting('smoke52d.n_i_notin')::int THEN
    v_rot := v_rot || ('entrada_i_not_exists_' || current_setting('smoke52d.n_i') || '_not_in_' || current_setting('smoke52d.n_i_notin'));
  END IF;
  IF current_setting('smoke52d.n_ii')::int <> current_setting('smoke52d.n_ii_notin')::int THEN
    v_rot := v_rot || ('entrada_ii_not_exists_' || current_setting('smoke52d.n_ii') || '_not_in_' || current_setting('smoke52d.n_ii_notin'));
  END IF;
  IF current_setting('smoke52d.rh_nulo')::int <> 0 THEN
    v_rot := v_rot || ('usuarios_rh_user_id_nulo_' || current_setting('smoke52d.rh_nulo'));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52D FAIL (c): [%] — NOT EXISTS e NOT IN divergem (um user_id nulo do lado do RH): PARAR', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$c$;

-- (d) a soma das categorias da partição fecha com o total de candidatos
DO $d$
BEGIN
  IF current_setting('smoke52d.soma')::int <> current_setting('smoke52d.total')::int THEN
    RAISE EXCEPTION 'P52D FAIL (d): soma das categorias % != total de candidatos % — alguma conta sumiu do relatorio',
      current_setting('smoke52d.soma'), current_setting('smoke52d.total');
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$d$;

-- (e) toda candidatura obrigatória na população ((i) ∪ (ii), fora da trava)
DO $e$
BEGIN
  IF current_setting('smoke52d.n_ob')::int < 1 THEN
    RAISE EXCEPTION 'P52D FAIL (e): lista de obrigatorias vazia — a asserção nao pode passar por vacuidade';
  END IF;
  IF current_setting('smoke52d.n_ob_na_pop')::int <> current_setting('smoke52d.n_ob')::int THEN
    RAISE EXCEPTION 'P52D FAIL (e): % de % candidatura(s) obrigatoria(s) fora da populacao (fora de (i) e de (ii), barrada pela trava, ou inexistente): os padroes ou a entrada por vaga nao alcancam uma conta que o operador nomeou como teste — PARAR',
      current_setting('smoke52d.n_ob')::int - current_setting('smoke52d.n_ob_na_pop')::int, current_setting('smoke52d.n_ob');
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$e$;
