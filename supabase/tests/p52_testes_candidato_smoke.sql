-- =============================================================================
-- Phase 52 / Plano 52-32 — smoke dos TESTES DA VAGA DO CANDIDATO: as próprias candidaturas (smoke52a)
--   `public.ler_testes_das_minhas_candidaturas()` (JORN-59 · G-52-7-R1 · D-52-G7B-1..3, D-52-G7B-5)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000007, prefixada pelo ensaio até o apply do 52-32 Task 5;
-- depois, contra o vivo com `--sem-migracoes`). NÃO lê GUC do PRE/POS da migration: roda igual
-- nos dois modos.
--   · O R1 do G-52-7 fechado: com a vaga da candidatura do dono em CADA status não ativo do enum
--     `status_vaga` (lido na execução), a RLS do dono já não enxerga a vaga (premissa — o gap
--     reproduzido) e a RPC, como o dono, devolve a candidatura com a bateria de testes e o opt-in
--     cognitivo da vaga (os lidos como postgres DENTRO do envelope, com valores-sentinela gravados
--     nele — uma função que devolve constante não passa).
--   · Posse: outro candidato nunca vê a candidatura do dono; um `sub` sem candidato recebe `[]`.
--   · Allowlist exata: todo elemento devolvido tem exatamente as chaves {aplica_cognitivo,
--     candidatura_id, testes_aplicaveis} — nunca `titulo`, `status`, `salario*`, `descricao`,
--     `requisitos` nem coluna nova.
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum (as regras
-- do smoke52p).
--   dono   o candidato (`candidatos.user_id` não nulo, SEM linha em `usuarios_rh`, por NOT EXISTS)
--          com candidatura viva numa vaga PÚBLICA (`status = 'ativa' AND deleted_at IS NULL`) e o
--          maior número de candidaturas vivas (desempate pela candidatura viva mais antiga); sem
--          nenhum assim, o que tiver candidatura viva em vaga com `deleted_at` nulo.
--   alvo   a candidatura viva mais antiga do dono nessa condição (`52a.alvo=publica|nao_publica`).
--   outro  outro candidato, nas mesmas regras, com candidatura viva (o de mais candidaturas vivas).
--   admin  `usuarios_rh` administrador ativo, não excluído (o mais antigo).
--   rec    `usuarios_rh` recrutador ativo, não excluído (o mais antigo).
--   POPULAÇÃO publicada em `p52.evidencia` (`52a.pop=cand:<candidatos com candidatura viva>,
--   naturais:<candidaturas vivas de candidato com vaga não pública>`) e RECUSADA (`P52A FAIL
--   (baseline)`) se faltar dono, outro, admin ou rec, ou se o enum `status_vaga` tiver menos de
--   DOIS valores diferentes de `ativa` (a alternância do opt-in de (a) precisa de dois — memória
--   «população vazia mente»).
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro de subtransações PL/pgSQL encerradas por `RAISE EXCEPTION`
-- com SQLSTATE próprio (`P52A1`), capturado logo acima: ROLLBACK de tudo. Escritas, todas como
-- postgres e todas revertidas:
--   (a)     `UPDATE vagas SET status = <s>, aplica_cognitivo = <bool>, testes_aplicaveis =
--           <sentinela>` na vaga do alvo; (c) `UPDATE vagas SET status = 'inativa'` na mesma vaga
--           (triggers medidos em 2026-10-12: `update_vagas_updated_at` BEFORE UPDATE e
--           `vagas_status_soft_delete_sync_trg` BEFORE INSERT OR UPDATE, que só troca `ativa` por
--           `arquivada` quando `deleted_at` é preenchido; nenhum chama rede nem escreve em outra
--           tabela; nenhuma constraint de `vagas` sobre `testes_aplicaveis`/`aplica_cognitivo` além
--           do NOT NULL).
--   E as funções auxiliares `pg_temp.p52a_chamar`/`p52a_vaga_visivel`/`p52a_resumo` (criadas uma
--   vez, somem no aborto do ensaio). Uma reprovação imprime só rótulos, contagens, chaves ou o
--   erro — nunca o valor de `testes_aplicaveis`, título ou e-mail.
--   O arquivo inteiro só roda dentro do ensaio que ABORTA (bloco `$p52_so_ensaio$` abaixo).
--
-- ⚠ CADA chamada vai por `pg_temp.p52a_chamar`, que troca o papel, define os claims, chama e
-- devolve `{ok: <retorno>}` ou `{err: 'SQLSTATE:SQLERRM'}` (o erro desfaz a subtransação dela,
-- inclusive o SET LOCAL ROLE). O julgamento roda FORA dos envelopes, UMA cláusula por bloco `DO`
-- (cada instrução sob o teto de 5 s do ensaio), na ordem das letras: a primeira que reprova
-- encerra a requisição. Julgamento por LISTA DE RÓTULOS (`P52A FAIL (<letra>): [<rótulo>,…]`).
--
-- CLÁUSULAS ((a)–(c): 52-32 Task 1, as três centrais do tracer; (d)–(j): 52-32 Task 2).
--   (a) para CADA valor de `enum_range(NULL::status_vaga)` diferente de `ativa`, na ordem do enum,
--       com índice i (conjunto vazio reprova), num envelope: a vaga do alvo vai a esse status, com
--       `aplica_cognitivo` = (i par) e `testes_aplicaveis` = um array-sentinela com o status;
--       premissa — a vaga é INVISÍVEL sob a RLS do dono (visível = `c_premissa_rls`, controle
--       vácuo: a fixture não reproduz o gap); a RPC como o dono CONTÉM o alvo com
--       `testes_aplicaveis` e `aplica_cognitivo` IGUAIS aos da vaga lidos como postgres dentro do
--       envelope. Julgada por PERTENCIMENTO, nunca por contagem. O sentinela e a alternância matam
--       a função que devolve constante (com ≥ 2 status não ativos, um booleano fixo erra um deles).
--   (b) a RPC como o outro devolve lista NÃO vazia, só com candidaturas do outro (conferidas como
--       postgres, elemento a elemento) e nenhuma do dono; um `sub` sem linha em `candidatos`
--       (`gen_random_uuid()`) com papel `candidato` recebe exatamente `[]`.
--   (c) em todo retorno colhido na cláusula — dono e outro no estado vivo, e o dono num envelope
--       com a vaga do alvo em `inativa` —, o topo é array e CADA elemento é objeto com
--       `jsonb_object_keys` ordenadas = {aplica_cognitivo, candidatura_id, testes_aplicaveis},
--       `candidatura_id` string, `aplica_cognitivo` booleano e `testes_aplicaveis` presente; nenhum
--       elemento checado = reprova.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p52_ensaio.cjs
-- --migracoes=supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql
-- supabase/tests/p52_testes_candidato_smoke.sql` (depois do apply do 52-32: `--sem-migracoes`).
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco
-- `$p52_so_ensaio$` recusa antes de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52a.esperado`, abaixo). Hoje: 3 — a, b, c (a Task 2 do
-- 52-32 acrescenta (d)–(j) e leva o literal a 10).
--
-- O PORTÃO MORDE — `scripts/p52_mutacoes.cjs` (entradas A1–A14, 52-32 Task 2): cada mutação,
-- derivada do TEXTO da função na migration por troca literal, numa requisição que aborta, tem de
-- reprovar NA letra dela (ou, A13/A14, ser RECUSADA pelo POS da migration):
--   A1 posse aberta → (b) · A2 filtro de vaga pública no WHERE → (a) · A3 `'titulo', v.titulo`
--   como quarta chave → (c) · A4 guarda aceita rh/administrador → (g) · A5 `GRANT EXECUTE … TO
--   anon` → (f) · A6 sem o filtro de rascunho → (h) · A7 `v.deleted_at IS NULL` no WHERE → (i) ·
--   A8 sem `v_uid IS NULL OR ` → (e) · A9 sem a guarda → (e) · A10 multiconjunto pela junção →
--   (d) · A11 opt-in cognitivo constante → (a) · A12 bateria constante → (a) · A13 `v.Titulo` e
--   A14 `v."titulo"` na migration → RECUSA `P52-07 POS-PORTAO` (a varredura do WR-01).
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
    RAISE EXCEPTION 'P52A RECUSADO (fora do ensaio): este smoke ESCREVE (envelopes P52A1 na linha real da vaga do alvo) e so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs [--sem-migracoes] supabase/tests/p52_testes_candidato_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52A RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke52a.pass', '0', false);
SELECT set_config('smoke52a.esperado', '3', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Chamada impersonada da RPC: troca o papel, define os claims, chama e devolve {ok: retorno} ou
-- {err: 'SQLSTATE:SQLERRM'}. p_papel: 'anon' | 'sem_claims' | 'sem_papel' (o sub sem
-- app_metadata) | 'candidato_sem_sub' (papel candidato sem sub) | um papel de app_metadata
-- ('candidato', 'rh', 'administrador') com o sub. Some no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.p52a_chamar(p_papel text, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52a_chamar$
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
             WHEN p_papel = 'sem_papel' THEN json_build_object('sub', p_sub::text, 'role', 'authenticated')::text
             WHEN p_papel = 'candidato_sem_sub' THEN json_build_object('role', 'authenticated',
                                                       'app_metadata', json_build_object('role', 'candidato'))::text
             ELSE json_build_object('sub', p_sub::text, 'role', 'authenticated',
                                    'app_metadata', json_build_object('role', p_papel))::text END, true);
    END IF;
    EXECUTE 'SELECT public.ler_testes_das_minhas_candidaturas()' INTO v_r;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    -- a subtransação deste bloco foi desfeita: papel e claims voltaram ao que eram.
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52a_chamar$;

-- Sob a RLS de um claim `candidato` com o sub dado: a linha da vaga é visível? (NULL = a sonda
-- falhou — nunca lido como «invisível».)
CREATE FUNCTION pg_temp.p52a_vaga_visivel(p_sub uuid, p_vaga uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $p52a_vaga_visivel$
DECLARE
  v_b boolean;
BEGIN
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);
    SELECT EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = p_vaga) INTO v_b;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN v_b;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END
$p52a_vaga_visivel$;

-- O que uma reprovação imprime de um retorno: SÓ o erro, o tipo do topo ou a contagem — nunca
-- o valor de testes_aplicaveis, título ou e-mail.
CREATE FUNCTION pg_temp.p52a_resumo(p jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $p52a_resumo$
  SELECT CASE WHEN p IS NULL THEN '<nao rodou>'
              WHEN p ? 'err' THEN 'err:' || left(p ->> 'err', 100)
              WHEN jsonb_typeof(p -> 'ok') = 'array' THEN 'ok:n=' || jsonb_array_length(p -> 'ok')
              ELSE 'ok:tipo=' || coalesce(jsonb_typeof(p -> 'ok'), '<nulo>')
         END
$p52a_resumo$;


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores e alvo (leitura, como postgres) e a população publicada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $baseline$
DECLARE
  v_dono   uuid;
  v_dcid   uuid;
  v_alvo   uuid;
  v_vaga   uuid;
  v_tipo   text := 'publica';
  v_outro  uuid;
  v_admin  uuid;
  v_rec    uuid;
  v_ncand  bigint;
  v_nnat   bigint;
  v_nstat  int;
BEGIN
  -- dono: candidato fora de usuarios_rh com candidatura viva em vaga PÚBLICA; o de mais
  -- candidaturas vivas, desempate pela candidatura viva mais antiga.
  SELECT ca.user_id, ca.id INTO v_dono, v_dcid
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false
                    AND v.status = 'ativa' AND v.deleted_at IS NULL)
   ORDER BY (SELECT count(*) FROM public.candidaturas c
              WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false) DESC,
            (SELECT min(c.created_at) FROM public.candidaturas c
              WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false),
            ca.id
   LIMIT 1;
  IF v_dono IS NOT NULL THEN
    SELECT c.id, c.vaga_id INTO v_alvo, v_vaga
      FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
     WHERE c.candidato_id = v_dcid AND c.deleted_at IS NULL AND c.is_rascunho = false
       AND v.status = 'ativa' AND v.deleted_at IS NULL
     ORDER BY c.created_at, c.id
     LIMIT 1;
  ELSE
    -- sem nenhum dono com vaga pública: o que tiver candidatura viva em vaga com deleted_at nulo.
    v_tipo := 'nao_publica';
    SELECT ca.user_id, ca.id INTO v_dono, v_dcid
      FROM public.candidatos ca
     WHERE ca.user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
       AND EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
                    WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false
                      AND v.deleted_at IS NULL)
     ORDER BY (SELECT count(*) FROM public.candidaturas c
                WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false) DESC,
              (SELECT min(c.created_at) FROM public.candidaturas c
                WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false),
              ca.id
     LIMIT 1;
    SELECT c.id, c.vaga_id INTO v_alvo, v_vaga
      FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
     WHERE c.candidato_id = v_dcid AND c.deleted_at IS NULL AND c.is_rascunho = false
       AND v.deleted_at IS NULL
     ORDER BY c.created_at, c.id
     LIMIT 1;
  END IF;

  -- outro: outro candidato, nas mesmas regras, com candidatura viva.
  SELECT ca.user_id INTO v_outro
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL
     AND ca.user_id IS DISTINCT FROM v_dono
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
   ORDER BY (SELECT count(*) FROM public.candidaturas c
              WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false) DESC,
            (SELECT min(c.created_at) FROM public.candidaturas c
              WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false),
            ca.id
   LIMIT 1;

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

  -- População: candidatos (fora de usuarios_rh) com candidatura viva, e as candidaturas vivas
  -- deles cuja vaga não é pública (os casos naturais do R1 do G-52-7).
  SELECT count(*) INTO v_ncand
    FROM public.candidatos ca
   WHERE ca.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false);
  SELECT count(*) INTO v_nnat
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE ca.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
     AND c.deleted_at IS NULL AND c.is_rascunho = false
     AND NOT (v.status = 'ativa' AND v.deleted_at IS NULL);

  -- Status não ativos do enum: a alternância do opt-in de (a) exige pelo menos dois.
  SELECT count(*) INTO v_nstat FROM unnest(enum_range(NULL::public.status_vaga)) AS x WHERE x::text <> 'ativa';

  IF v_dono IS NULL OR v_alvo IS NULL OR v_vaga IS NULL OR v_outro IS NULL OR v_admin IS NULL OR v_rec IS NULL
     OR v_nstat < 2 THEN
    RAISE EXCEPTION 'P52A FAIL (baseline): falta ator ou populacao (dono=%, alvo=%, outro=%, admin ativo=%, recrutador ativo=%, candidatos com candidatura viva=%, status nao ativos no enum=%, minimo 2) — ausencia REPROVA, nunca pula',
      v_dono IS NOT NULL, v_alvo IS NOT NULL, v_outro IS NOT NULL, v_admin IS NOT NULL, v_rec IS NOT NULL, v_ncand, v_nstat;
  END IF;

  PERFORM set_config('smoke52a.dono', v_dono::text, false);
  PERFORM set_config('smoke52a.alvo', v_alvo::text, false);
  PERFORM set_config('smoke52a.vaga', v_vaga::text, false);
  PERFORM set_config('smoke52a.outro', v_outro::text, false);
  PERFORM set_config('smoke52a.admin', v_admin::text, false);
  PERFORM set_config('smoke52a.rec', v_rec::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52a.pop=cand:' || v_ncand || ',naturais:' || v_nnat
          || ' 52a.alvo=' || v_tipo), false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) o R1 do G-52-7 fechado: em CADA status não ativo, a vaga some da RLS do dono e a RPC
--     devolve o alvo com a bateria e o opt-in cognitivo da vaga (sentinelas gravados no envelope).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_dono  uuid := current_setting('smoke52a.dono')::uuid;
  v_alvo  uuid := current_setting('smoke52a.alvo')::uuid;
  v_vaga  uuid := current_setting('smoke52a.vaga')::uuid;
  s       text;
  v_vis   boolean;
  v_tes   jsonb;
  v_cog   boolean;
  v_res   jsonb;
  v_rc    int;
  v_n     int := 0;
  v_err   text;
  v_rot   text[] := '{}';
BEGIN
  FOR s IN SELECT x::text FROM unnest(enum_range(NULL::public.status_vaga)) AS x WHERE x::text <> 'ativa' LOOP
    v_n := v_n + 1;
    v_vis := NULL; v_tes := NULL; v_cog := NULL; v_res := NULL; v_err := NULL;
    BEGIN
      UPDATE public.vagas
         SET status = s::public.status_vaga,
             aplica_cognitivo = (v_n % 2 = 0),
             testes_aplicaveis = jsonb_build_array(jsonb_build_object('teste', 'p52a_sentinela', 'status', s))
       WHERE id = v_vaga;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION 'status % atingiu % vaga(s)', s, v_rc; END IF;
      v_vis := pg_temp.p52a_vaga_visivel(v_dono, v_vaga);
      SELECT v.testes_aplicaveis, v.aplica_cognitivo INTO v_tes, v_cog FROM public.vagas v WHERE v.id = v_vaga;
      v_res := pg_temp.p52a_chamar('candidato', v_dono);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52A1';
    EXCEPTION
      WHEN SQLSTATE 'P52A1' THEN NULL;
      WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
    END;
    IF v_err IS NOT NULL THEN
      RAISE EXCEPTION 'P52A FAIL (a): a subtransacao do status % abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', s, v_err;
    END IF;
    IF v_vis IS DISTINCT FROM false THEN
      v_rot := v_rot || ('c_premissa_rls:' || s || '=' || coalesce(v_vis::text, 'sonda_falhou'));
    END IF;
    IF v_res IS NULL OR v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
      v_rot := v_rot || (s || '_retorno:' || pg_temp.p52a_resumo(v_res));
    ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res -> 'ok') e
                       WHERE jsonb_typeof(e) = 'object'
                         AND e ->> 'candidatura_id' = v_alvo::text
                         AND e -> 'testes_aplicaveis' = v_tes
                         AND e -> 'aplica_cognitivo' = to_jsonb(v_cog)) THEN
      v_rot := v_rot || (s || '_alvo_sem_testes_e_opt_in_da_vaga:' || pg_temp.p52a_resumo(v_res));
    END IF;
  END LOOP;
  IF v_n = 0 THEN
    v_rot := v_rot || 'status_nao_ativos_vazio'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52A FAIL (a): [%] — o dono nao le a bateria e o opt-in cognitivo da vaga inativada da propria candidatura (ou a fixture nao reproduz o gap)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52a.pass', (current_setting('smoke52a.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) posse: o outro candidato vê só as dele, nenhuma do dono; um sub sem candidato recebe [].
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_dono  uuid := current_setting('smoke52a.dono')::uuid;
  v_outro uuid := current_setting('smoke52a.outro')::uuid;
  v_res   jsonb;
  v_nada  jsonb;
  v_alheio int;
  v_dodono int;
  v_rot   text[] := '{}';
BEGIN
  v_res  := pg_temp.p52a_chamar('candidato', v_outro);
  v_nada := pg_temp.p52a_chamar('candidato', gen_random_uuid());

  IF v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
    v_rot := v_rot || ('outro_retorno:' || pg_temp.p52a_resumo(v_res));
  ELSIF jsonb_array_length(v_res -> 'ok') = 0 THEN
    v_rot := v_rot || 'outro_lista_vazia'::text;
  ELSE
    -- cada elemento: candidatura do OUTRO (conferida como postgres).
    SELECT count(*) INTO v_alheio
      FROM jsonb_array_elements(v_res -> 'ok') e
     WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
                        WHERE c.id::text = e ->> 'candidatura_id' AND ca.user_id = v_outro);
    IF v_alheio > 0 THEN
      v_rot := v_rot || ('outro_elementos_que_nao_sao_dele:' || v_alheio);
    END IF;
    -- e nenhuma do dono.
    SELECT count(*) INTO v_dodono
      FROM jsonb_array_elements(v_res -> 'ok') e
     WHERE EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
                    WHERE c.id::text = e ->> 'candidatura_id' AND ca.user_id = v_dono);
    IF v_dodono > 0 THEN
      v_rot := v_rot || ('outro_ve_candidaturas_do_dono:' || v_dodono);
    END IF;
  END IF;

  IF v_nada -> 'ok' IS DISTINCT FROM '[]'::jsonb THEN
    v_rot := v_rot || ('sub_sem_candidato:' || pg_temp.p52a_resumo(v_nada));
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52A FAIL (b): [%] — a RPC devolve candidatura de outro titular (ou nada ao dono legitimo)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52a.pass', (current_setting('smoke52a.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) allowlist exata: todo elemento de todo retorno colhido aqui tem exatamente
--     {aplica_cognitivo, candidatura_id, testes_aplicaveis}, com os tipos do contrato.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_dono  uuid := current_setting('smoke52a.dono')::uuid;
  v_outro uuid := current_setting('smoke52a.outro')::uuid;
  v_vaga  uuid := current_setting('smoke52a.vaga')::uuid;
  v_rets  jsonb[] := '{}';
  v_rotul text[] := ARRAY['dono_vivo', 'outro_vivo', 'dono_vaga_inativa'];
  v_r     jsonb;
  v_rc    int;
  v_err   text;
  v_ran   boolean := false;
  v_i     int;
  e       jsonb;
  v_chk   int := 0;
  v_ruim  int;
  v_rot   text[] := '{}';
BEGIN
  v_rets := v_rets || pg_temp.p52a_chamar('candidato', v_dono);
  v_rets := v_rets || pg_temp.p52a_chamar('candidato', v_outro);
  BEGIN
    UPDATE public.vagas SET status = 'inativa' WHERE id = v_vaga;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'inativar atingiu % vaga(s)', v_rc; END IF;
    v_r := pg_temp.p52a_chamar('candidato', v_dono);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52A1';
  EXCEPTION
    WHEN SQLSTATE 'P52A1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52A FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  v_rets := v_rets || v_r;

  FOR v_i IN 1 .. cardinality(v_rets) LOOP
    v_r := v_rets[v_i];
    IF v_r IS NULL OR v_r ? 'err' OR jsonb_typeof(v_r -> 'ok') IS DISTINCT FROM 'array' THEN
      v_rot := v_rot || (v_rotul[v_i] || '_topo:' || pg_temp.p52a_resumo(v_r));
      CONTINUE;
    END IF;
    v_ruim := 0;
    FOR e IN SELECT x FROM jsonb_array_elements(v_r -> 'ok') AS x LOOP
      v_chk := v_chk + 1;
      IF jsonb_typeof(e) IS DISTINCT FROM 'object'
         OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(e) AS k)
            IS DISTINCT FROM ARRAY['aplica_cognitivo', 'candidatura_id', 'testes_aplicaveis']
         OR jsonb_typeof(e -> 'candidatura_id') IS DISTINCT FROM 'string'
         OR jsonb_typeof(e -> 'aplica_cognitivo') IS DISTINCT FROM 'boolean'
         OR NOT (e ? 'testes_aplicaveis') THEN
        v_ruim := v_ruim + 1;
        IF v_ruim = 1 THEN
          -- só as CHAVES do primeiro elemento torto (nunca os valores).
          v_rot := v_rot || (v_rotul[v_i] || '_chaves:' || coalesce(
            CASE WHEN jsonb_typeof(e) = 'object'
                 THEN (SELECT string_agg(k, '|' ORDER BY k) FROM jsonb_object_keys(e) AS k)
                 ELSE 'nao_objeto:' || jsonb_typeof(e) END, '<nenhuma>'));
        END IF;
      END IF;
    END LOOP;
    IF v_ruim > 1 THEN
      v_rot := v_rot || (v_rotul[v_i] || '_elementos_tortos:' || v_ruim);
    END IF;
  END LOOP;
  IF v_chk = 0 THEN
    v_rot := v_rot || 'nenhum_elemento_checado'::text;
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52A FAIL (c): [%] — a RPC devolve chave fora da allowlist {aplica_cognitivo, candidatura_id, testes_aplicaveis} ou tipo fora do contrato', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52a.pass', (current_setting('smoke52a.pass')::int + 1)::text, false);
END
$c$;
