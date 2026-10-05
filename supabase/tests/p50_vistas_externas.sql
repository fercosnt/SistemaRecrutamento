-- =============================================================================
-- Phase 50 — SONDA DE VISTAS EXTERNAS (D-12: «nada abriu para anon/candidato, views inclusive»)
-- =============================================================================
-- SÓ LEITURA. Este arquivo nunca escreve e nunca muda esquema: só consultas, `SET LOCAL ROLE`,
-- `RESET ROLE` e `set_config`. NÃO contém `SET TRANSACTION READ ONLY` de propósito: o modo
-- `--vistas` do `scripts/p50_ensaio.cjs` o roda ANTES e DEPOIS das migrations na MESMA transação
-- (que aborta no sentinela), e uma transação só-leitura recusaria a migration do meio.
--
-- O QUE MEDE. Para cada ator EXTERNO ao alargamento e cada relação do conjunto abaixo, o que o
-- ator vê: `n:<contagem>:<md5 das chaves ordenadas>` ou `e:<SQLSTATE>` (leitura recusada). A
-- chave é a coluna `id` quando existe, senão `candidatura_id`, senão a linha inteira em texto
-- (views não têm ctid). O ensaio compara a fotografia de ANTES com a de DEPOIS na mesma
-- transação: qualquer diferença é exposição nova (`P50V FAIL (vistas)`).
--
-- CONJUNTO DE RELAÇÕES — por FORMA (iteração do catálogo; nenhuma lista literal de objetos):
--   (1) toda tabela de `public` com policy cujo `qual` ou `with_check` casa `created_by` ou
--       `is_active_rh_user` — o mesmo conjunto antes e depois de qualquer migration p50, por
--       construção (a policy reescrita troca uma forma pela outra);
--   (2) toda view (`relkind` v/m) de `public` em que `anon` ou `authenticated` tem SELECT —
--       view de dono postgres sem `security_invoker` ignora RLS (memória «Exposição a anon
--       inclui views»), então ela entra pelo GRANT, não pela policy;
--   (3) `public.usuarios_rh` e `public.vagas` (as duas que o helper e a posse antiga leem).
--   A contagem de relações é publicada (`relacoes`), com a população de cada uma como postgres.
--
-- ATORES — lidos NA EXECUÇÃO, com a mesma seleção do smoke `p50_acesso_recrutador_smoke.sql`:
--   anon        `SET LOCAL ROLE anon`, sem claims;
--   sem_claims  `authenticated` sem claims;
--   candidato   claims `candidato` + `sub` a_cand (candidato com candidatura viva, sem RH);
--   rh_inativo  claim `rh` + `sub` a_inativo (recrutador desativado: o token antigo).
--   Administrador (claim `administrador` + `sub` a_admin): só o booleano «vê exatamente o que o
--   postgres vê» por relação (contagens iguais) — tráfego vivo pode acrescentar linhas entre duas
--   capturas avulsas, então a fotografia completa dele seria frágil, e o booleano não é.
--
-- População vazia mente nas duas direções: cada relação publica a contagem como postgres; uma
-- igualdade «0 = 0» sobre relação vazia não prova nada sobre ela (a leitura disso é do revisor).
--
-- RESULTADO: `json_build_object('atores', …, 'admin_ve_tudo', …, 'populacao', …, 'relacoes', n,
-- 'ids', …)` gravado na GUC de sessão `p50.vistas` e devolvido `AS resultado` no fim.
--
-- COMO RODAR (avulso): `node p46apply.cjs run supabase/tests/p50_vistas_externas.sql`.
-- No ensaio: `node scripts/p50_ensaio.cjs --vistas [--migracoes=…] <smoke>`.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('p50.vistas', '', false);

DO $vistas$
DECLARE
  v_inativo uuid;
  v_admin   uuid;
  v_cand    uuid;
  r         record;
  v_rels    text[] := '{}';
  v_chaves  text[] := '{}';
  v_pop     jsonb := '{}'::jsonb;
  v_admin_ok jsonb := '{}'::jsonb;
  v_atores  jsonb := '{}'::jsonb;
  v_obj     jsonb;
  v_ator    text;
  v_claims  text;
  v_papel   text;
  v_n       bigint;
  v_md5     text;
  v_val     text;
  i         int;
BEGIN
  -- ── atores (como postgres) ────────────────────────────────────────────────
  SELECT u.user_id INTO v_inativo
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND NOT u.ativo AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT ca.user_id INTO v_cand
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL AND ca.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
   ORDER BY ca.created_at, ca.user_id
   LIMIT 1;
  IF v_inativo IS NULL OR v_admin IS NULL OR v_cand IS NULL THEN
    RAISE EXCEPTION 'P50V FAIL (sonda): ator ausente — rh_inativo=% admin=% candidato=% (sem ator a fotografia seria vacua)',
      v_inativo, v_admin, v_cand;
  END IF;

  -- ── relações, por forma ───────────────────────────────────────────────────
  FOR r IN
    SELECT c.oid, format('%I.%I', n.nspname, c.relname) AS rel,
           CASE
             WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
                           WHERE a.attrelid = c.oid AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped)
               THEN 't.id::text'
             WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
                           WHERE a.attrelid = c.oid AND a.attname = 'candidatura_id' AND a.attnum > 0 AND NOT a.attisdropped)
               THEN 't.candidatura_id::text'
             ELSE 't::text'
           END AS chave
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND (
             -- (1) tabelas com policy que casa a posse antiga ou o helper novo
             (c.relkind IN ('r', 'p') AND EXISTS (
                SELECT 1 FROM pg_catalog.pg_policies p
                 WHERE p.schemaname = n.nspname AND p.tablename = c.relname
                   AND (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* '(created_by|is_active_rh_user)'))
             -- (2) views legíveis por anon ou authenticated
          OR (c.relkind IN ('v', 'm') AND (has_table_privilege('anon', c.oid, 'SELECT')
                                           OR has_table_privilege('authenticated', c.oid, 'SELECT')))
             -- (3) as duas que o helper e a posse antiga leem
          OR (c.relkind IN ('r', 'p') AND c.relname IN ('usuarios_rh', 'vagas'))
           )
     ORDER BY 2
  LOOP
    v_rels   := v_rels || r.rel;
    v_chaves := v_chaves || r.chave;
  END LOOP;
  IF cardinality(v_rels) = 0 THEN
    RAISE EXCEPTION 'P50V FAIL (sonda): conjunto de relacoes vazio — a varredura por forma nao achou nada';
  END IF;

  -- ── população como postgres ───────────────────────────────────────────────
  RESET ROLE;
  FOR i IN 1 .. cardinality(v_rels) LOOP
    EXECUTE format('SELECT count(*) FROM %s t', v_rels[i]) INTO v_n;
    v_pop := v_pop || jsonb_build_object(v_rels[i], v_n);
  END LOOP;

  -- ── atores externos ───────────────────────────────────────────────────────
  FOREACH v_ator IN ARRAY ARRAY['anon', 'sem_claims', 'candidato', 'rh_inativo'] LOOP
    v_papel  := CASE v_ator WHEN 'anon' THEN 'anon' ELSE 'authenticated' END;
    v_claims := CASE v_ator
                  WHEN 'candidato'  THEN json_build_object('sub', v_cand::text, 'role', 'authenticated',
                                           'app_metadata', json_build_object('role', 'candidato'))::text
                  WHEN 'rh_inativo' THEN json_build_object('sub', v_inativo::text, 'role', 'authenticated',
                                           'app_metadata', json_build_object('role', 'rh'))::text
                  ELSE ''
                END;
    v_obj := '{}'::jsonb;
    IF v_papel = 'anon' THEN SET LOCAL ROLE anon; ELSE SET LOCAL ROLE authenticated; END IF;
    PERFORM set_config('request.jwt.claims', v_claims, true);
    FOR i IN 1 .. cardinality(v_rels) LOOP
      BEGIN
        EXECUTE format('SELECT count(*), md5(coalesce(string_agg(%1$s, '','' ORDER BY %1$s), '''')) FROM %2$s t',
                       v_chaves[i], v_rels[i])
           INTO v_n, v_md5;
        v_val := format('n:%s:%s', v_n, v_md5);
      EXCEPTION WHEN OTHERS THEN
        v_val := 'e:' || SQLSTATE;
      END;
      v_obj := v_obj || jsonb_build_object(v_rels[i], v_val);
    END LOOP;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    v_atores := v_atores || jsonb_build_object(v_ator, v_obj);
  END LOOP;

  -- ── administrador: vê exatamente o que o postgres vê? ─────────────────────
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
            'app_metadata', json_build_object('role', 'administrador'))::text, true);
  FOR i IN 1 .. cardinality(v_rels) LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM %s t', v_rels[i]) INTO v_n;
      v_admin_ok := v_admin_ok || jsonb_build_object(v_rels[i], v_n = (v_pop ->> v_rels[i])::bigint);
    EXCEPTION WHEN OTHERS THEN
      v_admin_ok := v_admin_ok || jsonb_build_object(v_rels[i], false);
    END;
  END LOOP;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);

  PERFORM set_config('p50.vistas', jsonb_build_object(
      'atores',        v_atores,
      'admin_ve_tudo', v_admin_ok,
      'populacao',     v_pop,
      'relacoes',      cardinality(v_rels),
      'ids',           jsonb_build_object('rh_inativo', v_inativo, 'admin', v_admin, 'candidato', v_cand)
    )::text, false);
END
$vistas$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT current_setting('p50.vistas')::json AS resultado;
