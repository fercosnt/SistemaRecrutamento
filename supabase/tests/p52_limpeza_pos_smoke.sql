-- =============================================================================
-- Phase 52 / Plano 52-20 — PROVA PÓS-LIMPEZA dos dados de teste (smoke52d)
--   D-30, D-32, JORN-63 — roda DEPOIS da migration 20261011000004, na MESMA transação do ensaio
-- =============================================================================
-- SÓ LEITURA. Nenhuma escrita, nenhum objeto criado: só SELECT e set_config de GUCs de sessão.
-- Recusa rodar fora do ensaio que ABORTA (marca p52.tx) e sem o PRE da 0004 nesta transação (as
-- GUCs `p52.limpeza.*` que o `DO $pre$` grava são LOCAIS: só existem com a 0004 prefixada).
--
-- CLÁUSULAS (esperado FIXO = 5, escopo deliberado deste arquivo, num ÚNICO literal abaixo):
--   (a) o PRE da 0004 rodou NESTA transação e mediu uma população não vazia (populacao_md5 com 32
--       hex; n_alvo >= 1);
--   (b) a varredura REFEITA agora (cópia das CTEs do `scripts/p52_limpeza_portao.cjs` —
--       `SQL_VARREDURA` —, independente da que a migration usou) dá ZERO conta nas quatro categorias
--       apagadas (`apagar_categorias` de `52-19-DECISAO-ESCOPO.md`, copiada abaixo) e zero
--       candidatura das contas que o PRE mediu;
--   (c) a TRAVA do RH: a impressão digital (as MESMAS expressões do PRE/POS da migration) bate com a
--       que o PRE capturou, e as contas excluídas pela trava continuam com o MESMO número de
--       candidaturas;
--   (d) as fixtures `fixture-p46-*`: impressão digital igual à do PRE;
--   (e) o não-alvo (candidatos e candidaturas fora da população, `historico_acoes` fora das
--       candidaturas-alvo, existência dos logins fora dela, vagas fora das vagas-alvo): impressão
--       digital igual à do PRE.
--   Evidência em `p52.evidencia` (`52d.pos=…`): só contagens — nunca e-mail, nome ou id.
--
-- COMO RODAR: SÓ pelo envelope que aborta, com a 0004 prefixada —
--   node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql supabase/tests/p52_limpeza_pos_smoke.sql
-- ⚠ PROIBIDO `node p46apply.cjs run` deste arquivo (o bloco `$p52_so_ensaio$` recusa).
-- =============================================================================

DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52D RECUSADO (fora do ensaio): este smoke so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela. Nada rodou. Use: node scripts/p52_ensaio.cjs --migracoes=supabase/migrations/20261011000004_p52_limpeza_dados_teste.sql supabase/tests/p52_limpeza_pos_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52D RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%). Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;

SELECT set_config('smoke52d.pass', '0', false);
SELECT set_config('smoke52d.esperado', '5', false);

-- (a) o PRE da 0004 rodou nesta transação
DO $a$
BEGIN
  IF coalesce(current_setting('p52.limpeza.populacao_md5', true), '') !~ '^[0-9a-f]{32}$'
     OR coalesce(nullif(current_setting('p52.limpeza.n_alvo', true), ''), '0')::bigint < 1 THEN
    RAISE EXCEPTION 'P52D FAIL (a): o PRE da 20261011000004 nao rodou nesta transacao (ou mediu populacao vazia) — este smoke so prova algo DEPOIS da migration, no mesmo ensaio';
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$a$;

-- (b) resíduo zero pela varredura refeita agora
DO $b$
DECLARE
  -- 52-19-DECISAO-ESCOPO.md, linha apagar_categorias (cópia)
  v_cats constant text[] := ARRAY['ficticios', 'tombstones', 'contas_teste_com_candidatura', 'contas_sem_candidatura'];
  v_ids  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.ids', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_res  bigint;
  v_kres bigint;
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
  cand_i AS (
    SELECT c.id FROM public.candidatos c
     WHERE EXISTS (SELECT 1 FROM padroes WHERE lower(c.email) LIKE padroes.p)
       AND NOT EXISTS (SELECT 1 FROM rh WHERE rh.user_id = c.user_id)),
  vaga_teste AS (
    SELECT v.id FROM public.vagas v WHERE v.titulo ILIKE '%[TESTE%' OR v.slug ILIKE 'teste-%'),
  cand_ii AS (
    SELECT DISTINCT k.candidato_id AS id FROM public.candidaturas k JOIN vaga_teste t ON t.id = k.vaga_id
     WHERE NOT EXISTS (SELECT 1 FROM public.candidatos c JOIN rh ON rh.user_id = c.user_id WHERE c.id = k.candidato_id)),
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
    FROM public.candidatos c)
  SELECT count(*) INTO v_res FROM cls WHERE cls.cat = ANY (v_cats);
  SELECT count(*) INTO v_kres FROM public.candidaturas k WHERE k.candidato_id = ANY (v_ids);
  PERFORM set_config('smoke52d.residuo', v_res::text, false);
  IF v_res <> 0 OR v_kres <> 0 THEN
    RAISE EXCEPTION 'P52D FAIL (b): a varredura refeita depois da limpeza ainda acha % conta(s) nas categorias apagadas e % candidatura(s) das contas medidas — a limpeza nao apagou a populacao', v_res, v_kres;
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$b$;

-- (c) a trava do RH intacta
DO $c$
DECLARE
  v_fp text;
  v_k  bigint;
BEGIN
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'u:' || to_jsonb(r)::text AS x FROM public.usuarios_rh r
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
          UNION ALL SELECT 'c:' || to_jsonb(c)::text FROM public.candidatos c WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)) s;
  SELECT count(*) INTO v_k FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
   WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id);
  PERFORM set_config('smoke52d.trava_k', v_k::text, false);
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_trava', true)
     OR v_k::text IS DISTINCT FROM current_setting('p52.limpeza.trava_k', true) THEN
    RAISE EXCEPTION 'P52D FAIL (c): a trava do RH mudou (candidaturas das contas de RH: antes %, depois %; impressao digital %) — a limpeza alcancou conta de usuarios_rh',
      current_setting('p52.limpeza.trava_k', true), v_k,
      CASE WHEN v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_trava', true) THEN 'diferente' ELSE 'igual' END;
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$c$;

-- (d) as fixtures fixture-p46 intactas
DO $d$
DECLARE
  v_fp text;
BEGIN
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE v.titulo ILIKE 'fixture-p46%') s;
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_fixtures', true) THEN
    RAISE EXCEPTION 'P52D FAIL (d): as fixtures fixture-p46 mudaram (antes %, depois %) — elas tem teardown proprio',
      split_part(coalesce(current_setting('p52.limpeza.fp_fixtures', true), ''), ':', 1), split_part(v_fp, ':', 1);
  END IF;
  PERFORM set_config('smoke52d.fixtures', split_part(v_fp, ':', 1), false);
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
END
$d$;

-- (e) o não-alvo intacto
DO $e$
DECLARE
  v_ids uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.ids', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_usr uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.users', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_vag uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.vagas', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_rem uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.remover', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_fp  text;
BEGIN
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE NOT (c.id = ANY (v_ids))
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k WHERE NOT (k.candidato_id = ANY (v_ids))
          UNION ALL SELECT 'h:' || to_jsonb(h)::text FROM public.historico_acoes h
                     WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.id = h.candidatura_id AND k.candidato_id = ANY (v_ids))
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE NOT (u.id = ANY (v_usr))
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE NOT (v.id = ANY (v_vag || v_rem))) s;
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_nao_alvo', true) THEN
    RAISE EXCEPTION 'P52D FAIL (e): linhas fora da populacao mudaram (antes %, depois %) — a limpeza alcancou o que nao era alvo',
      split_part(coalesce(current_setting('p52.limpeza.fp_nao_alvo', true), ''), ':', 1), split_part(v_fp, ':', 1);
  END IF;
  PERFORM set_config('smoke52d.pass', (current_setting('smoke52d.pass')::int + 1)::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52d.pos=residuo:' || current_setting('smoke52d.residuo', true)
      || ',trava_candidaturas:' || current_setting('smoke52d.trava_k', true)
      || ',fixtures:' || current_setting('smoke52d.fixtures', true)
      || ',nao_alvo:' || split_part(v_fp, ':', 1)), false);
END
$e$;
