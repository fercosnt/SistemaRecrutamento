-- =============================================================================
-- Phase 52 / Plano 52-08 — smoke das LEITURAS DO RH (smoke52l)
--   `public.ler_devolutiva_bigfive_rh(uuid)` (JORN-56 · D-01, D-04, D-10)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000001, prefixada pelo ensaio até o apply do 52-15).
--   · Só o RH ATIVO lê: administrador e recrutador ativo leem; o MESMO recrutador, desativado
--     dentro da transação que aborta, recebe 42501 — o helper vivo vem ANTES da busca, então o
--     token velho não aprende se a candidatura existe (uuid inexistente também dá 42501 a ele).
--     Candidato, sem claims → 42501 (guarda); `anon` → `permission denied for function` (ACL —
--     ACL e guarda dividem o SQLSTATE 42501, só a mensagem os distingue).
--   · Projeção por ALLOWLIST: o retorno tem exatamente as chaves do contrato, nenhuma folha
--     numérica e nenhuma chave `percentil` em nível nenhum (`jsonb_path_exists(r, 'strict
--     $.**.percentil')` falso); a banda e o texto de cada dimensão são OS DA DEVOLUTIVA do
--     candidato (Invariante 2: a faixa que o RH vê é a que o candidato viu).
--   · Candidatura viva: ausente, excluída e rascunho dão o MESMO erro (`P0002`, mesma mensagem).
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum.
--   admin     `usuarios_rh` administrador ativo, não excluído (o mais antigo).
--   rec       `usuarios_rh` RECRUTADOR ativo, não excluído (o mais antigo). (c) e (h) o desativam
--             DENTRO do envelope — o par positivo/negativo difere só em `ativo`.
--   cand      `candidatos.user_id` do titular da candidatura de devolutiva escolhida, sem linha
--             em `usuarios_rh` (claim `candidato`).
--   Candidaturas: dev_cand = a candidatura VIVA com devolutiva de titular com `user_id` (a mais
--   antiga); sem_dev = viva com score `big_five` e sem devolutiva; sem_bf = viva sem nenhum dos
--   dois. POPULAÇÃO publicada em `p52.evidencia` (`52l.pop=dev:<n>`) e RECUSADA se 0 (memória
--   «população vazia mente»).
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro de subtransações PL/pgSQL encerradas por `RAISE EXCEPTION`
-- com SQLSTATE próprio (`P52L1`), capturado logo acima: ROLLBACK de tudo. Escritas, todas como
-- postgres e todas revertidas:
--   (c)/(h) `UPDATE usuarios_rh SET ativo = false` na linha do recrutador (triggers medidos em
--           2026-10-11: `update_usuarios_rh_updated_at` e `trg_usuarios_rh_anti_lockout`, que só
--           age sobre administrador ativo; nenhum chama rede).
--   (h)     `UPDATE candidaturas SET is_rascunho = true` / `SET deleted_at = now()` em dev_cand
--           (triggers de UPDATE medidos: só `update_candidaturas_updated_at` dispara para essas
--           colunas).
--   E a função auxiliar `pg_temp.p52l_chamar` (criada uma vez, some no aborto do ensaio).
--   O arquivo inteiro só roda dentro do ensaio que ABORTA (bloco `$p52_so_ensaio$` abaixo).
--
-- ⚠ CADA chamada vai por `pg_temp.p52l_chamar`, que troca o papel, define os claims, chama e
-- devolve `{ok: <retorno>}` ou `{err: 'SQLSTATE:SQLERRM'}` (o erro desfaz a subtransação dela,
-- inclusive o SET LOCAL ROLE). O julgamento roda FORA dos envelopes, UMA cláusula por bloco `DO`
-- (cada instrução sob o teto de 5 s do ensaio), na ordem das letras: a primeira que reprova
-- encerra a requisição. Julgamento por LISTA DE RÓTULOS (`P52L FAIL (<letra>): [<rótulo>,…]`).
--
-- CLÁUSULAS.
--   (a) admin lê `disponivel` em TODA candidatura viva com devolutiva, com `dimensoes` igual à
--       banda do `cabecalho.dashboard` e ao texto das `paginas` da própria devolutiva, por dim, na
--       ordem O C E A N, e os avisos como vieram; `sem_devolutiva` em sem_dev e `sem_big_five` em
--       sem_bf, com `dimensoes = []`.
--   (b) o recrutador ativo lê dev_cand e recebe EXATAMENTE o retorno do admin.
--   (c) o mesmo recrutador, desativado no envelope → 42501.
--   (d) candidato titular (claim `candidato`) → 42501.
--   (e) `authenticated` sem claims → 42501.
--   (f) `anon`: `has_function_privilege` falso e a chamada falha com `permission denied for
--       function ler_devolutiva_bigfive_rh` (o ACL, não a guarda).
--   (g) projeção, em todos os retornos de (a): chaves de topo = {situacao, dimensoes,
--       disclaimer_emocional, disclaimer_lgpd_crp}; chaves de cada dimensão = {dim, banda,
--       texto_interpretativo}; `strict $.**.percentil` ausente; nenhuma folha numérica; `banda`
--       no vocabulário e `dim` em O C E A N.
--   (h) uuid inexistente → `P0002` para o admin e 42501 para o recrutador desativado (o helper
--       vem antes da busca); dev_cand como rascunho e como excluída → o MESMO `SQLSTATE:SQLERRM`
--       do inexistente.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p52_ensaio.cjs --vistas
-- --migracoes=supabase/migrations/20261011000001_p52_leituras_rh.sql
-- supabase/tests/p52_leituras_rh_smoke.sql` (depois do apply do 52-15: `--sem-migracoes`).
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco
-- `$p52_so_ensaio$` recusa antes de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52l.esperado`, abaixo). Hoje: 8 — a … h.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- GUARDA ESTRUTURAL — PRIMEIRA instrução do arquivo. O PREFIXO do `p52_ensaio.cjs` grava o
-- txid da requisição na GUC LOCAL `p52.tx` e aborta tudo no sentinela. Fora dele a marca não
-- existe e o arquivo para AQUI, antes de qualquer escrita.
-- ─────────────────────────────────────────────────────────────────────────────
DO $p52_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p52.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P52L RECUSADO (fora do ensaio): este smoke ESCREVE (envelopes P52L1 em linhas reais de usuarios_rh e candidaturas) e so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs [--sem-migracoes] supabase/tests/p52_leituras_rh_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52L RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke52l.pass', '0', false);
SELECT set_config('smoke52l.esperado', '8', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Chamada impersonada: troca o papel, define os claims, chama `public.<p_fn>(p_arg)` e devolve
-- {ok: retorno} ou {err: 'SQLSTATE:SQLERRM'}. p_papel: 'anon' | 'sem_claims' | um papel de
-- app_metadata ('administrador', 'rh', 'candidato'). Some no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.p52l_chamar(p_fn text, p_arg uuid, p_papel text, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52l_chamar$
DECLARE
  v_r jsonb;
BEGIN
  BEGIN
    IF p_papel = 'anon' THEN
      SET LOCAL ROLE anon;
      PERFORM set_config('request.jwt.claims', '', true);
    ELSE
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        CASE WHEN p_papel = 'sem_claims' THEN ''
             ELSE json_build_object('sub', p_sub::text, 'role', 'authenticated',
                                    'app_metadata', json_build_object('role', p_papel))::text END, true);
    END IF;
    EXECUTE format('SELECT public.%I($1)', p_fn) INTO v_r USING p_arg;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    -- a subtransação deste bloco foi desfeita: papel e claims voltaram ao que eram.
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52l_chamar$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores e candidaturas vivos (leitura, como postgres) e a população publicada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $baseline$
DECLARE
  v_admin   uuid;
  v_rec     uuid;
  v_cand    uuid;
  v_dev     uuid;
  v_sem_dev uuid;
  v_sem_bf  uuid;
  v_ndev    bigint;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  SELECT u.user_id INTO v_rec
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;

  SELECT count(*) INTO v_ndev
    FROM public.devolutivas_candidato d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false;

  SELECT d.candidatura_id, ca.user_id INTO v_dev, v_cand
    FROM public.devolutivas_candidato d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND ca.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
   ORDER BY d.created_at, d.id
   LIMIT 1;

  SELECT c.id INTO v_sem_dev
    FROM public.candidaturas c
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'big_five')
     AND NOT EXISTS (SELECT 1 FROM public.devolutivas_candidato d WHERE d.candidatura_id = c.id)
   ORDER BY c.created_at, c.id
   LIMIT 1;
  SELECT c.id INTO v_sem_bf
    FROM public.candidaturas c
   WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT EXISTS (SELECT 1 FROM public.scores_candidato s WHERE s.candidatura_id = c.id AND s.tipo = 'big_five')
     AND NOT EXISTS (SELECT 1 FROM public.devolutivas_candidato d WHERE d.candidatura_id = c.id)
   ORDER BY c.created_at, c.id
   LIMIT 1;

  IF v_admin IS NULL OR v_rec IS NULL OR v_cand IS NULL OR v_dev IS NULL OR v_sem_dev IS NULL OR v_sem_bf IS NULL OR v_ndev = 0 THEN
    RAISE EXCEPTION 'P52L FAIL (baseline): falta ator ou populacao (admin ativo=%, recrutador ativo=%, candidato titular=%, candidatura com devolutiva=%, sem devolutiva=%, sem big five=%, devolutivas vivas=%) — ausencia REPROVA, nunca pula',
      v_admin IS NOT NULL, v_rec IS NOT NULL, v_cand IS NOT NULL, v_dev IS NOT NULL, v_sem_dev IS NOT NULL, v_sem_bf IS NOT NULL, v_ndev;
  END IF;

  PERFORM set_config('smoke52l.admin', v_admin::text, false);
  PERFORM set_config('smoke52l.rec', v_rec::text, false);
  PERFORM set_config('smoke52l.cand', v_cand::text, false);
  PERFORM set_config('smoke52l.dev_cand', v_dev::text, false);
  PERFORM set_config('smoke52l.sem_dev', v_sem_dev::text, false);
  PERFORM set_config('smoke52l.sem_bf', v_sem_bf::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52l.pop=dev:' || v_ndev), false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) admin lê `disponivel` em toda candidatura viva com devolutiva — banda e texto da própria
--     devolutiva; e os dois estados sem devolutiva.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_esp   jsonb;
  v_rot   text[] := '{}';
  v_i     int := 0;
BEGIN
  FOR r IN
    SELECT d.candidatura_id, d.conteudo_jsonb
      FROM public.devolutivas_candidato d
      JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY d.created_at, d.id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', r.candidatura_id, 'administrador', v_admin);
    IF v_res ? 'err' THEN
      v_rot := v_rot || ('dev' || v_i || '_erro:' || left(v_res ->> 'err', 80));
      CONTINUE;
    END IF;
    v_res := v_res -> 'ok';
    -- o esperado, lido da devolutiva como postgres (outra formulação: subconsulta por dim).
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'dim', o.dim,
             'banda', (SELECT e ->> 'banda' FROM jsonb_array_elements(r.conteudo_jsonb #> '{cabecalho,dashboard}') e WHERE e ->> 'dim' = o.dim LIMIT 1),
             'texto_interpretativo', (SELECT e ->> 'texto_interpretativo' FROM jsonb_array_elements(r.conteudo_jsonb -> 'paginas') e WHERE e ->> 'dim' = o.dim LIMIT 1))
             ORDER BY o.ord), '[]'::jsonb)
      INTO v_esp
      FROM unnest(ARRAY['O', 'C', 'E', 'A', 'N']) WITH ORDINALITY AS o(dim, ord)
     WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(r.conteudo_jsonb #> '{cabecalho,dashboard}') e WHERE e ->> 'dim' = o.dim);
    IF v_res ->> 'situacao' IS DISTINCT FROM 'disponivel' THEN
      v_rot := v_rot || ('dev' || v_i || '_situacao:' || coalesce(v_res ->> 'situacao', '<nulo>'));
    END IF;
    IF v_res -> 'dimensoes' IS DISTINCT FROM v_esp OR jsonb_array_length(v_esp) = 0 THEN
      v_rot := v_rot || ('dev' || v_i || '_dimensoes_diferem_da_devolutiva');
    END IF;
    IF v_res -> 'disclaimer_emocional' IS DISTINCT FROM r.conteudo_jsonb -> 'disclaimer_emocional'
       OR v_res -> 'disclaimer_lgpd_crp' IS DISTINCT FROM r.conteudo_jsonb -> 'disclaimer_lgpd_crp' THEN
      v_rot := v_rot || ('dev' || v_i || '_avisos');
    END IF;
  END LOOP;
  IF v_i = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;

  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.sem_dev')::uuid, 'administrador', v_admin);
  IF v_res -> 'ok' IS DISTINCT FROM jsonb_build_object('situacao', 'sem_devolutiva', 'dimensoes', '[]'::jsonb,
                                                     'disclaimer_emocional', NULL, 'disclaimer_lgpd_crp', NULL) THEN
    v_rot := v_rot || ('sem_dev:' || left(v_res::text, 120));
  END IF;
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.sem_bf')::uuid, 'administrador', v_admin);
  IF v_res -> 'ok' IS DISTINCT FROM jsonb_build_object('situacao', 'sem_big_five', 'dimensoes', '[]'::jsonb,
                                                     'disclaimer_emocional', NULL, 'disclaimer_lgpd_crp', NULL) THEN
    v_rot := v_rot || ('sem_bf:' || left(v_res::text, 120));
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (a): [%] — o admin nao le a faixa que o candidato viu (ou o estado sem devolutiva saiu errado)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) recrutador ATIVO lê dev_cand — o mesmo retorno do admin.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_cand uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_adm  jsonb;
  v_rec  jsonb;
BEGIN
  v_adm := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', current_setting('smoke52l.admin')::uuid);
  v_rec := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'rh', current_setting('smoke52l.rec')::uuid);
  IF NOT (v_adm ? 'ok') OR NOT (v_rec ? 'ok') OR v_rec -> 'ok' IS DISTINCT FROM v_adm -> 'ok'
     OR v_rec #>> '{ok,situacao}' IS DISTINCT FROM 'disponivel' THEN
    RAISE EXCEPTION 'P52L FAIL (b): [rec_ativo] — o recrutador ativo nao le o que o admin le (rec=%, admin=%)',
      left(v_rec::text, 120), left(v_adm::text, 120);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) o MESMO recrutador, desativado dentro do envelope → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_rec  uuid := current_setting('smoke52l.rec')::uuid;
  v_cand uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_res  jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean := false;
BEGIN
  BEGIN
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s), esperado 1', v_rc; END IF;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (c): [rec_inativo] — o recrutador desativado (token ainda valido) leu: %', left(v_res::text, 160);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) candidato titular → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  v_res jsonb;
BEGIN
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'candidato', current_setting('smoke52l.cand')::uuid);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (d): [candidato] — o candidato leu a leitura do RH: %', left(v_res::text, 160);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) authenticated sem claims → 42501.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  v_res jsonb;
BEGIN
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'sem_claims', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:%' THEN
    RAISE EXCEPTION 'P52L FAIL (e): [sem_claims] — authenticated sem claims leu: %', left(v_res::text, 160);
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) anon: sem EXECUTE pelo ACL (não pela guarda).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_oid  oid := pg_catalog.to_regprocedure('public.ler_devolutiva_bigfive_rh(uuid)');
  v_res  jsonb;
  v_rot  text[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52L FAIL (f): [ausente] — public.ler_devolutiva_bigfive_rh(uuid) nao existe';
  END IF;
  IF coalesce(has_function_privilege('anon', v_oid, 'EXECUTE'), true) THEN
    v_rot := v_rot || 'anon_privilegio'::text;
  END IF;
  IF NOT coalesce(has_function_privilege('authenticated', v_oid, 'EXECUTE'), false) THEN
    v_rot := v_rot || 'authenticated_sem_privilegio'::text;
  END IF;
  v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', current_setting('smoke52l.dev_cand')::uuid, 'anon', NULL);
  IF coalesce(v_res ->> 'err', '') NOT LIKE '42501:permission denied for function ler_devolutiva_bigfive_rh%' THEN
    v_rot := v_rot || ('anon_chamada:' || left(v_res::text, 100));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (f): [%] — anon alcanca a funcao (esperado permission denied pelo ACL)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) projeção por allowlist — em todo retorno `disponivel` da população.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  r       record;
  v_res   jsonb;
  v_dim   jsonb;
  v_rot   text[] := '{}';
  v_i     int := 0;
BEGIN
  FOR r IN
    SELECT d.candidatura_id
      FROM public.devolutivas_candidato d
      JOIN public.candidaturas c ON c.id = d.candidatura_id
     WHERE c.deleted_at IS NULL AND c.is_rascunho = false
     ORDER BY d.created_at, d.id
  LOOP
    v_i := v_i + 1;
    v_res := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', r.candidatura_id, 'administrador', v_admin) -> 'ok';
    IF v_res IS NULL THEN
      v_rot := v_rot || ('dev' || v_i || '_sem_retorno');
      CONTINUE;
    END IF;
    IF jsonb_path_exists(v_res, 'strict $.**.percentil') THEN
      v_rot := v_rot || ('dev' || v_i || '_percentil');
    END IF;
    IF jsonb_path_exists(v_res, 'strict $.** ? (@.type() == "number")') THEN
      v_rot := v_rot || ('dev' || v_i || '_folha_numerica');
    END IF;
    IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_res) k)
       IS DISTINCT FROM ARRAY['dimensoes', 'disclaimer_emocional', 'disclaimer_lgpd_crp', 'situacao'] THEN
      v_rot := v_rot || ('dev' || v_i || '_chaves_topo');
    END IF;
    FOR v_dim IN SELECT e FROM jsonb_array_elements(v_res -> 'dimensoes') e LOOP
      IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_dim) k)
         IS DISTINCT FROM ARRAY['banda', 'dim', 'texto_interpretativo'] THEN
        v_rot := v_rot || ('dev' || v_i || '_chaves_dimensao');
      END IF;
      IF coalesce(v_dim ->> 'banda', '') NOT IN ('muito_baixo', 'mod_baixo', 'medio', 'mod_alto', 'muito_alto') THEN
        v_rot := v_rot || ('dev' || v_i || '_banda_fora');
      END IF;
      IF coalesce(v_dim ->> 'dim', '') NOT IN ('O', 'C', 'E', 'A', 'N') THEN
        v_rot := v_rot || ('dev' || v_i || '_dim_fora');
      END IF;
    END LOOP;
  END LOOP;
  IF v_i = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (g): [%] — a leitura do RH projeta fora da allowlist (numero cru, chave a mais ou banda fora do vocabulario)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) inexistente, rascunho e excluída — o MESMO erro; o desativado recebe 42501 antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  v_admin uuid := current_setting('smoke52l.admin')::uuid;
  v_rec   uuid := current_setting('smoke52l.rec')::uuid;
  v_cand  uuid := current_setting('smoke52l.dev_cand')::uuid;
  v_fake  uuid := gen_random_uuid();
  v_inex  jsonb;
  v_rasc  jsonb;
  v_excl  jsonb;
  v_inat  jsonb;
  v_rc    int;
  v_err   text;
  v_ran   boolean := false;
  v_rot   text[] := '{}';
BEGIN
  IF EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = v_fake) THEN
    RAISE EXCEPTION 'P52L FAIL (h): o uuid sorteado existe — repetir';
  END IF;
  v_inex := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_fake, 'administrador', v_admin);
  BEGIN
    UPDATE public.candidaturas SET is_rascunho = true WHERE id = v_cand;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'rascunho atingiu % linha(s)', v_rc; END IF;
    v_rasc := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', v_admin);
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  BEGIN
    UPDATE public.candidaturas SET deleted_at = now() WHERE id = v_cand;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'exclusao atingiu % linha(s)', v_rc; END IF;
    v_excl := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_cand, 'administrador', v_admin);
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := coalesce(v_err, format('%s: %s', SQLSTATE, SQLERRM));
  END;
  BEGIN
    UPDATE public.usuarios_rh SET ativo = false WHERE user_id = v_rec;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'desativar o recrutador atingiu % linha(s)', v_rc; END IF;
    v_inat := pg_temp.p52l_chamar('ler_devolutiva_bigfive_rh', v_fake, 'rh', v_rec);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52L1';
  EXCEPTION
    WHEN SQLSTATE 'P52L1' THEN NULL;
    WHEN OTHERS THEN v_err := coalesce(v_err, format('%s: %s', SQLSTATE, SQLERRM));
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52L FAIL (h): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;

  IF coalesce(v_inex ->> 'err', '') NOT LIKE 'P0002:%' THEN
    v_rot := v_rot || ('inexistente:' || left(v_inex::text, 80));
  END IF;
  IF v_rasc IS DISTINCT FROM v_inex THEN
    v_rot := v_rot || ('rascunho:' || left(v_rasc::text, 80));
  END IF;
  IF v_excl IS DISTINCT FROM v_inex THEN
    v_rot := v_rot || ('excluida:' || left(v_excl::text, 80));
  END IF;
  IF coalesce(v_inat ->> 'err', '') NOT LIKE '42501:%' THEN
    v_rot := v_rot || ('inativo_inexistente:' || left(v_inat::text, 80));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52L FAIL (h): [%] — inexistente/rascunho/excluida nao dao o mesmo no_data_found, ou o desativado aprende a existencia', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52l.pass', (current_setting('smoke52l.pass')::int + 1)::text, false);
END
$h$;
