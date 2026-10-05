-- =============================================================================
-- Phase 50 — smoke do ACESSO DO RECRUTADOR (EXPORT-05, metade «visível ao RH», gap G4-b)
-- v1 (Plano 50-01, TRACER): helper `public.is_active_rh_user()` + `candidaturas.rh_le_candidaturas`
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261005000001).
--   · `public.is_active_rh_user()`: plpgsql SECURITY DEFINER STABLE, `search_path=''`;
--     verdadeiro sse o chamador tem linha ATIVA e não excluída em `usuarios_rh` (lida ao vivo);
--     `anon` sem EXECUTE, `authenticated` com.
--   · `rh_le_candidaturas` (`TO authenticated`): o RH ATIVO que não criou vaga nenhuma vê as
--     candidaturas VIVAS de todas as vagas, de qualquer status (D-01); o recrutador DESATIVADO
--     com token antigo (claim `rh` ainda válido) não vê nada (D-02, D-11); candidato só as
--     próprias; sem claims e `anon` nada; o administrador tudo, com o disjunto de hoje (D-02).
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum.
--   a_ativo    linha `usuarios_rh` ativa e não excluída que NÃO criou vaga nenhuma, preferindo
--              `role = 'recrutador'` (hoje não há recrutador ativo em PROD: cai num administrador
--              ativo sem vaga — o helper é role-agnóstico e a impersonação usa o claim `rh`).
--   a_inativo  `role = 'recrutador' AND NOT ativo` — o token antigo de um recrutador desativado.
--   a_admin    administrador ativo.
--   a_cand     `candidatos.user_id` com ≥ 1 candidatura viva e sem linha em `usuarios_rh`.
--   a_ativo e a_inativo são escolhidos SEM linha em `candidatos`: assim nenhuma policy de
--   candidato lhes mostra candidatura, e o que eles veem é obra de `rh_le_candidaturas`.
--   Vagas: por status (`ativa`, `inativa`, `arquivada`, `deleted_at IS NULL`), a de MAIS
--   candidaturas vivas; cada uma com ≥ 1. Dado de teste (`fixture-p46`, `[TESTE]`) entra como
--   qualquer outro (D-07).
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro da subtransação PL/pgSQL encerrada por `RAISE EXCEPTION` com
-- SQLSTATE próprio (`P50C1`), capturado logo acima: ROLLBACK de tudo. Nesta v1 NENHUMA cláusula
-- escreve (só SELECT, `SET LOCAL ROLE` e `set_config`); o envelope existe para as cláusulas que
-- os planos seguintes acrescentam.
--
-- ⚠ CADA sonda vai no SEU PRÓPRIO bloco `BEGIN … EXCEPTION WHEN OTHERS` que guarda
-- `SQLSTATE:SQLERRM` (ou a contagem). O julgamento roda FORA da subtransação. Uma cláusula por
-- bloco `DO` (cada instrução fica sob o teto de 5 s do ensaio), na ordem a, b, c, d, e, f, z: a
-- PRIMEIRA cláusula quebrada reprova a requisição inteira.
--
-- CLÁUSULAS.
--   (a) forma e ACL do helper: existe, `prosecdef`, STABLE, `search_path=""`; `anon` sem EXECUTE
--       E a chamada sob `SET LOCAL ROLE anon` falha com `permission denied for function
--       is_active_rh_user` (ACL e guarda dividem o SQLSTATE 42501; só a mensagem os distingue);
--       `authenticated` com EXECUTE.
--   (b) semântica do helper: verdadeiro para a_ativo e a_admin; falso para a_inativo, `sub`
--       aleatório, sem claims e a_cand. Rótulos na reprovação: `P50C FAIL (b): [<rótulo>,…]`.
--   (c) SC1 por impersonação: claim `rh` + `sub` a_ativo ⇒ por vaga escolhida, `count(*)` de
--       `candidaturas` = contagem viva como postgres, cada uma > 0; total visível = total vivo.
--   (d) SC2, cada negativa PAREADA com o positivo de (c) na mesma execução: claim `rh` + `sub`
--       a_inativo ⇒ 0; `sub` a_ativo (a MESMA linha ativa do positivo) com claim `visualizador`,
--       `gerente` e sem `role` ⇒ 0 cada [ativo_visualizador, ativo_gerente, ativo_sem_role] —
--       o conjunto do claim `rh` é o único filtro de papel do ramo (o helper é role-agnóstico);
--       claims `candidato` + `sub` a_cand ⇒ ≥ 1 linha própria [c_cand = controle]
--       E 0 alheias; `authenticated` sem claims ⇒ 0; `anon` ⇒ 0 linhas ou 42501, nunca ≥ 1
--       (o JSON registra qual dos dois).
--   (e) administrador: claim `administrador` + `sub` a_admin ⇒ `count(*)` = total de TODAS as
--       candidaturas como postgres (mortas e rascunhos inclusive); e o disjunto do administrador
--       do qual vivo de `rh_le_candidaturas` é EXATAMENTE
--       `(( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text)`.
--       Esse literal é ESCOPO deliberado (D-02: «o ramo do administrador fica byte-idêntico»),
--       não fotografia: mudar o disjunto É o defeito que a cláusula existe para pegar.
--   (f) forma da policy (escopo do tracer, nome literal deliberado): roles `{authenticated}`; o
--       qual chama `is_active_rh_user` e não casa `created_by`. BORDA: imprime a contagem, como
--       postgres, de candidaturas com `deleted_at IS NOT NULL OR is_rascunho`; se > 0, o rh ativo
--       vê 0 delas e o administrador vê todas. ⚠ População medida em 2026-10-05: 0 — a borda
--       fica VÁCUA enquanto não houver candidatura morta; o JSON publica `n_borda`.
--   (z) resíduo: contagens globais de `candidaturas`, `vagas` e `usuarios_rh` = baseline
--       capturada no início DESTA execução.
--
-- O PORTÃO MORDE — mutações provadas por `scripts/p50_mutacoes.cjs` (Plano 50-01, Task 3,
-- 2026-10-05), cada uma numa requisição que aborta: `SET LOCAL lock_timeout/statement_timeout` +
-- migration 20261005000001 (enquanto não aplicada) + MUTAÇÃO (DDL avulsa) + este smoke +
-- `RAISE 'ENSAIO_P50_TERMINOU'`. Cada uma tem de reprovar na letra abaixo e NÃO chegar ao
-- sentinela. A próxima redefinição destes objetos tem de re-provar esta tabela — uma cláusula
-- nova sem mutação que a reprove é cláusula não vigiada:
--   | Mutação | Inversão                                                          | Reprova | Medido (2026-10-05)            |
--   |---------|-------------------------------------------------------------------|---------|--------------------------------|
--   | M1      | helper sempre verdadeiro (mesmo ACL)                              | (b)     | (b) [inativo,aleatorio,sem_claims,candidato], 517 ms |
--   | M2      | ramo `rh` só pelo JWT (sem o helper)                              | (d)     | (d) [inativo], 684 ms          |
--   | M3      | `GRANT EXECUTE` do helper a `anon`                                | (a)     | (a), 503 ms                    |
--   | M4      | ramo `rh` de volta à posse (`vagas.created_by = auth.uid()`)      | (c)     | (c), 522 ms                    |
--   | M5      | policy de volta a `TO public`                                     | (f)     | (f), 577 ms                    |
--   | M6      | disjunto do administrador alterado (`= ANY (ARRAY[…])`)           | (e)     | (e), 623 ms                    |
--   CONTROLE (migration intacta + smoke) chegou ao sentinela com smoke50=7/7 em 641 ms; depois do
--   laço, a leitura só-leitura (ledger das 4 versões p50, helper, md5|roles das 14 policies que
--   casam a forma) foi idêntica à de antes: nada persistiu. Sob M5 a cláusula (d) segue verde —
--   `anon` continua recusado (42501) também com a policy `{public}`; quem pega é (f).
--
-- Varredura (forma) — 2026-10-05, padrão do CLAUDE.md §«Portões» sobre `supabase/tests/*.sql`
-- (`grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.'`).
--   População da forma: 336 linhas (re-medida na execução do 50-01; igual à do planejamento).
--   Achados que tocam objetos da fase (as 18 funções / 14 policies), todos ESCOPO e não
--   fotografia: `oper31_rejeitar_candidatura_smokes.sql:224` (`v_after - v_before <> 1`, delta
--   da própria fixture); `p44_pedidos_dados_smoke.sql:357` (as duas RPCs que o p44 especifica);
--   `p49_prontidao_prod.sql:142,144` (as duas RPCs nomeadas daquela prontidão).
--   Achados que tocam o objeto DESTE plano (`candidaturas` sob claim `rh`): `sec05_08_smokes.sql:189,196`
--   (`n <> 0` / `v_upd <> 0` — «rh não-dono lê/atualiza 0 candidaturas da vaga alheia»). É
--   ESCOPO, não fotografia, mas a PREMISSA dele é exatamente o que o D-01 inverte: depois do
--   apply ele reprova trabalho correto. Está na tabela «Legacy test disposition» do 50-RESEARCH
--   (par positivo/negativo), reescrito em plano posterior — não aqui.
--   Fora dos objetos da fase: `p46_teardown_fixture.sql:293` (resíduo da fixture, escopo) e
--   `p43_previa_smoke.sql:667` (RPCs da P43).
--   Este arquivo tem constantes deliberadas: o esperado 7 (número de cláusulas DESTE arquivo), o
--   0 das negativas e o literal do disjunto do administrador em (e) — escopo; as contagens de
--   (c), (e) e (z) são baseline capturada na execução.
--
-- COMO RODAR:
--   · antes do apply (50-01/50-02): só dentro do ensaio que aborta —
--     `node scripts/p50_ensaio.cjs supabase/tests/p50_acesso_recrutador_smoke.sql`
--     (prefixa a migration que falta no ledger, roda este arquivo e aborta no sentinela).
--   · depois do apply: `node p46apply.cjs run supabase/tests/p50_acesso_recrutador_smoke.sql` —
--     UMA requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer
--     FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), não uma fotografia do banco. Vive num ÚNICO literal (`smoke50.esperado`, abaixo);
-- o bloco do gate e o JSON final LEEM a GUC. Hoje: 7 — a, b, c, d, e, f, z.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke50.pass', '0', false);
SELECT set_config('smoke50.esperado', '7', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura, como postgres), vagas por status e populações.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_ativo    uuid;
  v_inativo  uuid;
  v_admin    uuid;
  v_cand     uuid;
  v_cand_ids text;
  v_vaga     uuid;
  v_n        bigint;
  s          text;
BEGIN
  SELECT u.user_id INTO v_ativo
    FROM public.usuarios_rh u
   WHERE u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY (u.role = 'recrutador') DESC, u.created_at, u.user_id
   LIMIT 1;
  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhuma linha usuarios_rh ATIVA sem vaga propria e sem linha de candidato — sem ela (c) nao teria ator';
  END IF;

  SELECT u.user_id INTO v_inativo
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND NOT u.ativo AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_inativo IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum recrutador INATIVO (sem linha de candidato) — a negativa do token antigo (d) nao teria ator';
  END IF;

  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum administrador ATIVO — a clausula (e) nao teria ator';
  END IF;

  SELECT ca.user_id INTO v_cand
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL AND ca.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
   ORDER BY ca.created_at, ca.user_id
   LIMIT 1;
  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (baseline): nenhum candidato com candidatura viva e sem linha usuarios_rh — a negativa do candidato (d) nao teria ator';
  END IF;
  SELECT string_agg(ca.id::text, ',' ORDER BY ca.id) INTO v_cand_ids
    FROM public.candidatos ca WHERE ca.user_id = v_cand;

  FOREACH s IN ARRAY ARRAY['ativa', 'inativa', 'arquivada'] LOOP
    v_vaga := NULL;
    SELECT v.id, count(*) INTO v_vaga, v_n
      FROM public.vagas v
      JOIN public.candidaturas c ON c.vaga_id = v.id AND c.deleted_at IS NULL AND c.is_rascunho = false
     WHERE v.status::text = s AND v.deleted_at IS NULL
     GROUP BY v.id
     ORDER BY count(*) DESC, v.id
     LIMIT 1;
    IF v_vaga IS NULL THEN
      RAISE EXCEPTION 'P50C FAIL (baseline): nenhuma vaga % (viva) com candidatura viva — SC1 exige uma por status', s;
    END IF;
    PERFORM set_config('smoke50.vaga_' || s, v_vaga::text, false);
    PERFORM set_config('smoke50.n_' || s, v_n::text, false);
  END LOOP;

  PERFORM set_config('smoke50.a_ativo',   v_ativo::text,   false);
  PERFORM set_config('smoke50.a_inativo', v_inativo::text, false);
  PERFORM set_config('smoke50.a_admin',   v_admin::text,   false);
  PERFORM set_config('smoke50.a_cand',    v_cand::text,    false);
  PERFORM set_config('smoke50.cand_ids',  v_cand_ids,      false);

  PERFORM set_config('smoke50.n_total', (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke50.n_vivas', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.deleted_at IS NULL AND c.is_rascunho = false)::text, false);
  PERFORM set_config('smoke50.n_borda', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.deleted_at IS NOT NULL OR c.is_rascunho)::text, false);
  PERFORM set_config('smoke50.n_cand_proprias', (SELECT count(*) FROM public.candidaturas c
                                          WHERE c.candidato_id = ANY (string_to_array(v_cand_ids, ',')::uuid[]))::text, false);

  -- (z) baseline
  PERFORM set_config('smoke50.z_cand',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke50.z_vagas', (SELECT count(*) FROM public.vagas)::text, false);
  PERFORM set_config('smoke50.z_urh',   (SELECT count(*) FROM public.usuarios_rh)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) forma e ACL do helper.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_err       text;
  v_ran       boolean := false;
  v_b         boolean;
  a_oid       regprocedure := to_regprocedure('public.is_active_rh_user()');
  a_secdef    boolean;
  a_vol       "char";
  a_conf      text[];
  a_anon_priv boolean;
  a_auth_priv boolean;
  a_anon_call text := '<nao rodou>';
BEGIN
  IF a_oid IS NULL THEN
    RAISE EXCEPTION 'P50C FAIL (a): public.is_active_rh_user() nao existe — a migration 20261005000001 nao foi aplicada nem prefixada';
  END IF;
  SELECT p.prosecdef, p.provolatile, p.proconfig INTO a_secdef, a_vol, a_conf
    FROM pg_catalog.pg_proc p WHERE p.oid = a_oid;
  a_anon_priv := coalesce(has_function_privilege('anon',          a_oid, 'EXECUTE'), true);
  a_auth_priv := coalesce(has_function_privilege('authenticated', a_oid, 'EXECUTE'), false);

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN
      v_b := public.is_active_rh_user();
      a_anon_call := 'ACEITO:' || coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN a_anon_call := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (a): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF a_secdef IS DISTINCT FROM true OR a_vol IS DISTINCT FROM 's'
     OR a_conf IS NULL OR NOT ('search_path=""' = ANY (a_conf)) THEN
    RAISE EXCEPTION 'P50C FAIL (a): forma do helper — prosecdef=% provolatile=% proconfig=% (esperado true, s, search_path="")',
      a_secdef, a_vol, a_conf;
  END IF;
  IF a_anon_priv OR NOT a_auth_priv THEN
    RAISE EXCEPTION 'P50C FAIL (a): ACL do helper — anon=% authenticated=% (esperado false/true: o grant do pg_default_acl a anon e DIRETO; a policy roda com o papel de quem consulta)',
      a_anon_priv, a_auth_priv;
  END IF;
  IF a_anon_call NOT LIKE '42501:%permission denied for function is_active_rh_user%' THEN
    RAISE EXCEPTION 'P50C FAIL (a): sob SET LOCAL ROLE anon a chamada deu «%» (esperado 42501 permission denied for function is_active_rh_user — o ACL, nao a guarda)',
      a_anon_call;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) semântica do helper — verdadeiro só para linha usuarios_rh ATIVA.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_ativo   uuid := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid := current_setting('smoke50.a_inativo')::uuid;
  v_admin   uuid := current_setting('smoke50.a_admin')::uuid;
  v_cand    uuid := current_setting('smoke50.a_cand')::uuid;
  v_err     text;
  v_ran     boolean := false;
  v_b       boolean;
  b_ativo   text := '<nao rodou>';  b_admin text := '<nao rodou>';  b_inativo text := '<nao rodou>';
  b_rand    text := '<nao rodou>';  b_sem   text := '<nao rodou>';  b_cand    text := '<nao rodou>';
  b_rot     text[] := '{}';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_ativo := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_ativo := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_admin := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_admin := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_inativo := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_inativo := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_rand := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_rand := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN v_b := public.is_active_rh_user(); b_sem := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_sem := SQLSTATE || ':' || SQLERRM; END;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cand::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_cand := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_cand := SQLSTATE || ':' || SQLERRM; END;

    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (b): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  -- positivos (controles) primeiro: um falso aqui torna os falsos abaixo VACUOS.
  IF b_ativo  IS DISTINCT FROM 'true'  THEN b_rot := b_rot || 'c_ativo'::text; END IF;
  IF b_admin  IS DISTINCT FROM 'true'  THEN b_rot := b_rot || 'c_admin'::text; END IF;
  IF b_inativo IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'inativo'::text; END IF;
  IF b_rand   IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'aleatorio'::text; END IF;
  IF b_sem    IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'sem_claims'::text; END IF;
  IF b_cand   IS DISTINCT FROM 'false' THEN b_rot := b_rot || 'candidato'::text; END IF;
  IF cardinality(b_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (b): [%]: ativo=% admin=% inativo=% aleatorio=% sem_claims=% candidato=% (esperado true,true,false,false,false,false; rotulo c_* = controle, nao portao aberto)',
      array_to_string(b_rot, ','), b_ativo, b_admin, b_inativo, b_rand, b_sem, b_cand;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) SC1 por impersonação — rh ativo SEM vaga própria vê as candidaturas das três vagas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_ativo uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_va    uuid   := current_setting('smoke50.vaga_ativa')::uuid;
  v_vi    uuid   := current_setting('smoke50.vaga_inativa')::uuid;
  v_vq    uuid   := current_setting('smoke50.vaga_arquivada')::uuid;
  n_va    bigint := current_setting('smoke50.n_ativa')::bigint;
  n_vi    bigint := current_setting('smoke50.n_inativa')::bigint;
  n_vq    bigint := current_setting('smoke50.n_arquivada')::bigint;
  n_vivas bigint := current_setting('smoke50.n_vivas')::bigint;
  v_err   text;
  v_ran   boolean := false;
  v_n     bigint;
  c_va    text := '<nao rodou>';  c_vi text := '<nao rodou>';  c_vq text := '<nao rodou>';  c_tot text := '<nao rodou>';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_va; c_va := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_va := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_vi; c_vi := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_vi := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.vaga_id = v_vq; c_vq := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_vq := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; c_tot := v_n::text;
    EXCEPTION WHEN OTHERS THEN c_tot := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF n_va < 1 OR n_vi < 1 OR n_vq < 1 THEN
    RAISE EXCEPTION 'P50C FAIL (c): populacao vazia — vivas por vaga ativa=% inativa=% arquivada=% (cada uma >= 1; senao a igualdade e vacua)', n_va, n_vi, n_vq;
  END IF;
  IF c_va IS DISTINCT FROM n_va::text OR c_vi IS DISTINCT FROM n_vi::text OR c_vq IS DISTINCT FROM n_vq::text
     OR c_tot IS DISTINCT FROM n_vivas::text THEN
    RAISE EXCEPTION 'P50C FAIL (c): rh ativo sem vaga propria (%) viu ativa=«%» inativa=«%» arquivada=«%» total=«%» (esperado %, %, %, % — as vivas como postgres; D-01: todas as vagas, qualquer status)',
      v_ativo, c_va, c_vi, c_vq, c_tot, n_va, n_vi, n_vq, n_vivas;
  END IF;
  PERFORM set_config('smoke50.c_visto', c_tot, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) SC2 — token antigo, candidato, sem claims e anon não veem o que não é deles.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_ativo   uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_inativo uuid   := current_setting('smoke50.a_inativo')::uuid;
  v_cand    uuid   := current_setting('smoke50.a_cand')::uuid;
  v_ids     uuid[] := string_to_array(current_setting('smoke50.cand_ids'), ',')::uuid[];
  v_err     text;
  v_ran     boolean := false;
  v_n       bigint;
  d_inativo text := '<nao rodou>';
  d_proprias text := '<nao rodou>';
  d_alheias text := '<nao rodou>';
  d_sem     text := '<nao rodou>';
  d_anon    text := '<nao rodou>';
  d_visual  text := '<nao rodou>';
  d_gerente text := '<nao rodou>';
  d_semrole text := '<nao rodou>';
  d_rot     text[] := '{}';
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    -- recrutador DESATIVADO com token ainda válido (claim rh) — D-02 / D-11
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_inativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_inativo := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_inativo := SQLSTATE || ':' || SQLERRM; END;

    -- WR-01: a MESMA linha ATIVA do positivo de (c), com claim DIFERENTE de `rh`. O helper é
    -- role-agnóstico de propósito; o único filtro de papel do ramo é o conjunto do claim `rh`.
    -- `visualizador`/`gerente` passam no `check_role` e o hook os emite; sem `role` = token sem
    -- papel. a_ativo não tem linha em `candidatos`: o esperado é 0 exato.
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'visualizador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_visual := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_visual := SQLSTATE || ':' || SQLERRM; END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'gerente'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_gerente := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_gerente := SQLSTATE || ':' || SQLERRM; END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object())::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_semrole := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_semrole := SQLSTATE || ':' || SQLERRM; END;

    -- candidato: as próprias (controle) e nenhuma alheia
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cand::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'candidato'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.candidato_id = ANY (v_ids); d_proprias := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_proprias := SQLSTATE || ':' || SQLERRM; END;
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE NOT (c.candidato_id = ANY (v_ids)); d_alheias := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_alheias := SQLSTATE || ':' || SQLERRM; END;

    -- authenticated sem claims
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_sem := v_n::text;
    EXCEPTION WHEN OTHERS THEN d_sem := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;

    -- anon
    SET LOCAL ROLE anon;
    PERFORM set_config('request.jwt.claims', '', true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; d_anon := 'contagem=' || v_n::text;
    EXCEPTION WHEN OTHERS THEN d_anon := 'recusada=' || SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (d): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF d_proprias !~ '^[0-9]+$' OR d_proprias::bigint < 1 THEN d_rot := d_rot || 'c_cand'::text; END IF;
  IF d_inativo  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'inativo'::text; END IF;
  IF d_visual   IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_visualizador'::text; END IF;
  IF d_gerente  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_gerente'::text; END IF;
  IF d_semrole  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'ativo_sem_role'::text; END IF;
  IF d_alheias  IS DISTINCT FROM '0' THEN d_rot := d_rot || 'cand_alheias'::text; END IF;
  IF d_sem      IS DISTINCT FROM '0' THEN d_rot := d_rot || 'sem_claims'::text; END IF;
  IF d_anon IS DISTINCT FROM 'contagem=0' AND d_anon NOT LIKE 'recusada=42501:%' THEN d_rot := d_rot || 'anon'::text; END IF;
  IF cardinality(d_rot) > 0 THEN
    RAISE EXCEPTION 'P50C FAIL (d): [%]: rh inativo (token antigo)=«%» ; ativo com claim visualizador=«%» gerente=«%» sem role=«%» ; candidato proprias=«%» alheias=«%» ; sem claims=«%» ; anon=«%» (esperado 0, 0, 0, 0, >=1, 0, 0, contagem=0 ou recusada 42501; rotulo c_* = controle vacuo)',
      array_to_string(d_rot, ','), d_inativo, d_visual, d_gerente, d_semrole, d_proprias, d_alheias, d_sem, d_anon;
  END IF;
  PERFORM set_config('smoke50.d_anon', d_anon, false);
  PERFORM set_config('smoke50.d_proprias', d_proprias, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) administrador — vê TODAS; disjunto dele = o de hoje (D-02).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  -- ESCOPO deliberado (D-02), não fotografia: o texto desparseado do ramo do administrador.
  c_admin constant text := '(( SELECT (auth.jwt() #>> ''{app_metadata,role}''::text[])) = ''administrador''::text)';
  v_admin  uuid   := current_setting('smoke50.a_admin')::uuid;
  n_total  bigint := current_setting('smoke50.n_total')::bigint;
  v_err    text;
  v_ran    boolean := false;
  v_n      bigint;
  e_count  text := '<nao rodou>';
  v_qual   text;
  v_disj   text;
  v_depth  int := 0;
  v_inq    boolean := false;
  v_cut    int;
  v_ch     text;
  i        int;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c; e_count := v_n::text;
    EXCEPTION WHEN OTHERS THEN e_count := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (e): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF n_total < 1 OR e_count IS DISTINCT FROM n_total::text THEN
    RAISE EXCEPTION 'P50C FAIL (e): o administrador ativo (%) viu «%» candidaturas (esperado o total como postgres = %, > 0) — o administrador nao pode perder nada',
      v_admin, e_count, n_total;
  END IF;

  SELECT p.qual INTO v_qual
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';
  FOR i IN 1 .. coalesce(length(v_qual), 0) LOOP
    v_ch := substr(v_qual, i, 1);
    IF v_ch = '''' THEN
      v_inq := NOT v_inq;
    ELSIF NOT v_inq AND v_ch = '(' THEN
      v_depth := v_depth + 1;
    ELSIF NOT v_inq AND v_ch = ')' THEN
      v_depth := v_depth - 1;
    ELSIF NOT v_inq AND v_depth = 1 AND substr(v_qual, i, 4) = ' OR ' THEN
      v_cut := i;
      EXIT;
    END IF;
  END LOOP;
  v_disj := CASE WHEN v_cut IS NULL OR left(v_qual, 1) <> '(' THEN NULL ELSE substr(v_qual, 2, v_cut - 2) END;
  IF v_disj IS DISTINCT FROM c_admin THEN
    RAISE EXCEPTION 'P50C FAIL (e): o disjunto do administrador em rh_le_candidaturas e «%» (esperado «%» — D-02: byte-identico ao de antes)',
      v_disj, c_admin;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) forma da policy + BORDA (mortas e rascunhos fora do alcance do rh).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_ativo  uuid   := current_setting('smoke50.a_ativo')::uuid;
  v_admin  uuid   := current_setting('smoke50.a_admin')::uuid;
  n_borda  bigint := current_setting('smoke50.n_borda')::bigint;
  v_err    text;
  v_ran    boolean := false;
  v_n      bigint;
  f_rh     text := '<nao rodou>';
  f_adm    text := '<nao rodou>';
  v_roles  text;
  v_qual   text;
  v_wc     text;
BEGIN
  SELECT p.roles::text, p.qual, p.with_check INTO v_roles, v_qual, v_wc
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';

  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NOT NULL OR c.is_rascunho; f_rh := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_rh := SQLSTATE || ':' || SQLERRM; END;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'administrador'))::text, true);
    BEGIN SELECT count(*) INTO v_n FROM public.candidaturas c WHERE c.deleted_at IS NOT NULL OR c.is_rascunho; f_adm := v_n::text;
    EXCEPTION WHEN OTHERS THEN f_adm := SQLSTATE || ':' || SQLERRM; END;
    RESET ROLE;
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P50C1';
  EXCEPTION
    WHEN SQLSTATE 'P50C1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P50C FAIL (f): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF v_roles IS DISTINCT FROM '{authenticated}' THEN
    RAISE EXCEPTION 'P50C FAIL (f): roles de rh_le_candidaturas = % (esperado {authenticated} — anon nao pode avaliar a policy que chama o helper)', v_roles;
  END IF;
  -- Desparse mostra o helper sem schema: casar o nome solto.
  IF position('is_active_rh_user' IN coalesce(v_qual, '')) = 0 THEN
    RAISE EXCEPTION 'P50C FAIL (f): o qual de rh_le_candidaturas nao chama is_active_rh_user: %', v_qual;
  END IF;
  IF coalesce(v_qual, '') || coalesce(v_wc, '') ~* 'created_by' THEN
    RAISE EXCEPTION 'P50C FAIL (f): rh_le_candidaturas ainda casa created_by (posse como autorizacao): %', v_qual;
  END IF;
  -- BORDA: com populacao, o rh ativo nao ve morta nem rascunho; o administrador ve todas.
  IF n_borda > 0 AND (f_rh IS DISTINCT FROM '0' OR f_adm IS DISTINCT FROM n_borda::text) THEN
    RAISE EXCEPTION 'P50C FAIL (f): BORDA — % candidatura(s) morta(s)/rascunho; rh ativo viu «%» (esperado 0), administrador «%» (esperado %)',
      n_borda, f_rh, f_adm, n_borda;
  END IF;
  PERFORM set_config('smoke50.f_borda_rh', f_rh, false);
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) resíduo — contagens globais iguais à baseline DESTA execução.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  g_cand  bigint;
  g_vagas bigint;
  g_urh   bigint;
BEGIN
  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_vagas FROM public.vagas;
  SELECT count(*) INTO g_urh   FROM public.usuarios_rh;
  IF g_cand     IS DISTINCT FROM current_setting('smoke50.z_cand')::bigint
     OR g_vagas IS DISTINCT FROM current_setting('smoke50.z_vagas')::bigint
     OR g_urh   IS DISTINCT FROM current_setting('smoke50.z_urh')::bigint THEN
    RAISE EXCEPTION 'P50C FAIL (z): contagem global mudou (candidaturas % -> %, vagas % -> %, usuarios_rh % -> %) — este smoke nao escreve; o delta e de trafego concorrente commitado durante a requisicao: rodar de novo',
      current_setting('smoke50.z_cand'), g_cand, current_setting('smoke50.z_vagas'), g_vagas,
      current_setting('smoke50.z_urh'), g_urh;
  END IF;
  PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado (contrato: `JSON.parse(...)[0].resultado`).
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke50.pass')::int <> current_setting('smoke50.esperado')::int THEN
    RAISE EXCEPTION 'P50C FAIL (gate): pass = % de % — alguma clausula nao incrementou o contador',
      current_setting('smoke50.pass'), current_setting('smoke50.esperado');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',          'p50_acesso_recrutador',
  'pass',           current_setting('smoke50.pass')::int,
  'esperado',       current_setting('smoke50.esperado')::int,
  'a_ativo',        current_setting('smoke50.a_ativo'),
  'a_inativo',      current_setting('smoke50.a_inativo'),
  'a_admin',        current_setting('smoke50.a_admin'),
  'a_cand',         current_setting('smoke50.a_cand'),
  'vaga_ativa',     current_setting('smoke50.vaga_ativa'),
  'n_ativa',        current_setting('smoke50.n_ativa')::int,
  'vaga_inativa',   current_setting('smoke50.vaga_inativa'),
  'n_inativa',      current_setting('smoke50.n_inativa')::int,
  'vaga_arquivada', current_setting('smoke50.vaga_arquivada'),
  'n_arquivada',    current_setting('smoke50.n_arquivada')::int,
  'n_total',        current_setting('smoke50.n_total')::int,
  'n_vivas',        current_setting('smoke50.n_vivas')::int,
  'c_visto_rh',     current_setting('smoke50.c_visto')::int,
  'n_cand_proprias', current_setting('smoke50.n_cand_proprias')::int,
  'd_cand_proprias', current_setting('smoke50.d_proprias'),
  'd_anon',         current_setting('smoke50.d_anon'),
  'n_borda',        current_setting('smoke50.n_borda')::int,
  'f_borda_rh',     current_setting('smoke50.f_borda_rh')
) AS resultado;
