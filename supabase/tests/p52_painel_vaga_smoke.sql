-- =============================================================================
-- Phase 52 / Plano 52-31 — smoke do PAINEL DO CANDIDATO: a vaga das próprias candidaturas (smoke52p)
--   `public.ler_vagas_das_minhas_candidaturas()` (JORN-59 · G-52-7 · D-52-G7-1..4, D-52-G7-6)
-- =============================================================================
-- O QUE ELE VIGIA (migration 20261011000006, prefixada pelo ensaio até o apply do 52-31 Task 5;
-- depois, contra o vivo com `--sem-migracoes`). NÃO lê GUC do PRE/POS da migration: roda igual
-- nos dois modos.
--   · O G-52-7 fechado: com a vaga da candidatura do dono em CADA status não ativo do enum
--     `status_vaga` (lido na execução), a RLS do dono já não enxerga a vaga (premissa — o gap
--     reproduzido) e a RPC, como o dono, devolve a candidatura com o título e o departamento da
--     vaga (os lidos como postgres DENTRO do envelope).
--   · Posse: outro candidato nunca vê a candidatura do dono; um `sub` sem candidato recebe `[]`.
--   · Allowlist exata: todo elemento devolvido tem exatamente as chaves {candidatura_id,
--     departamento, titulo} — nunca `status`, `salario*`, `descricao`, `requisitos`,
--     `testes_aplicaveis` nem coluna nova.
--
-- ATORES — lidos NA EXECUÇÃO, nunca por UUID escrito aqui; falha alta se faltar algum.
--   dono   o candidato (`candidatos.user_id` não nulo, SEM linha em `usuarios_rh`, por NOT EXISTS)
--          com candidatura viva numa vaga PÚBLICA (`status = 'ativa' AND deleted_at IS NULL`) e o
--          maior número de candidaturas vivas (desempate pela candidatura viva mais antiga); sem
--          nenhum assim, o que tiver candidatura viva em vaga com `deleted_at` nulo.
--   alvo   a candidatura viva mais antiga do dono nessa condição (`52p.alvo=publica|nao_publica`).
--   outro  outro candidato, nas mesmas regras, com candidatura viva (o de mais candidaturas vivas).
--   admin  `usuarios_rh` administrador ativo, não excluído (o mais antigo).
--   rec    `usuarios_rh` recrutador ativo, não excluído (o mais antigo).
--   POPULAÇÃO publicada em `p52.evidencia` (`52p.pop=cand:<candidatos com candidatura viva>,
--   naturais:<candidaturas vivas de candidato com vaga não pública>`) e RECUSADA (`P52P FAIL
--   (baseline)`) se faltar dono, outro, admin ou rec (memória «população vazia mente»).
--
-- ⚠ ESTE SMOKE ESCREVE — só dentro de subtransações PL/pgSQL encerradas por `RAISE EXCEPTION`
-- com SQLSTATE próprio (`P52P1`), capturado logo acima: ROLLBACK de tudo. Escritas, todas como
-- postgres e todas revertidas:
--   (a)/(c) `UPDATE vagas SET status = <s>` na vaga do alvo (triggers medidos em 2026-10-12:
--           `update_vagas_updated_at` BEFORE UPDATE e `vagas_status_soft_delete_sync_trg` BEFORE
--           INSERT OR UPDATE, que só troca `ativa` por `arquivada` quando `deleted_at` é preenchido;
--           nenhum chama rede nem escreve em outra tabela).
--   (h)     `UPDATE candidaturas SET is_rascunho = true` e, noutro envelope, `SET deleted_at =
--           now()` no alvo (para essas colunas só `update_candidaturas_updated_at` dispara — os
--           outros triggers de UPDATE são `OF etapa_atual`/`OF status`/`OF encerrada_a_pedido_em`).
--   (i)     `UPDATE vagas SET deleted_at = now()` na vaga do alvo (o trigger de sincronia leva
--           `ativa` a `arquivada`).
--   E as funções auxiliares `pg_temp.p52p_chamar`/`p52p_vaga_visivel`/`p52p_resumo` (criadas uma
--   vez, somem no aborto do ensaio). Uma reprovação imprime só rótulos, contagens, chaves ou o
--   erro — nunca título, departamento ou e-mail.
--   O arquivo inteiro só roda dentro do ensaio que ABORTA (bloco `$p52_so_ensaio$` abaixo).
--
-- ⚠ CADA chamada vai por `pg_temp.p52p_chamar`, que troca o papel, define os claims, chama e
-- devolve `{ok: <retorno>}` ou `{err: 'SQLSTATE:SQLERRM'}` (o erro desfaz a subtransação dela,
-- inclusive o SET LOCAL ROLE). O julgamento roda FORA dos envelopes, UMA cláusula por bloco `DO`
-- (cada instrução sob o teto de 5 s do ensaio), na ordem das letras: a primeira que reprova
-- encerra a requisição. Julgamento por LISTA DE RÓTULOS (`P52P FAIL (<letra>): [<rótulo>,…]`).
--
-- CLÁUSULAS ((a)–(c): 52-31 Task 1, as três centrais do tracer; (d)–(j): 52-31 Task 2).
--   (a) para CADA valor de `enum_range(NULL::status_vaga)` diferente de `ativa` (conjunto vazio
--       reprova), num envelope: a vaga do alvo vai a esse status; premissa — a vaga é INVISÍVEL
--       sob a RLS do dono (visível = `c_premissa_rls`, controle vácuo: a fixture não reproduz o
--       gap); a RPC como o dono CONTÉM o alvo com `titulo` e `departamento` iguais aos da vaga
--       lidos como postgres dentro do envelope. Julgada por PERTENCIMENTO, nunca por contagem.
--   (b) a RPC como o outro devolve lista NÃO vazia, só com candidaturas do outro (conferidas como
--       postgres, elemento a elemento) e nenhuma do dono; um `sub` sem linha em `candidatos`
--       (`gen_random_uuid()`) com papel `candidato` recebe exatamente `[]`.
--   (c) em todo retorno colhido na cláusula — dono e outro no estado vivo, e o dono num envelope
--       com a vaga do alvo em `inativa` —, o topo é array e CADA elemento é objeto com
--       `jsonb_object_keys` ordenadas = {candidatura_id, departamento, titulo}, `candidatura_id` e
--       `titulo` string, `departamento` string ou null; nenhum elemento checado = reprova.
--   (d) para TODO candidato (`user_id` não nulo, fora de `usuarios_rh`) com candidatura viva, a
--       RPC com o sub dele e papel `candidato`: CONTÉM toda candidatura viva dele (o conjunto pelo
--       predicado de posse, como postgres) com `titulo`/`departamento` = os da vaga — inclusive
--       as de vaga não pública naturais —; nenhum `candidatura_id` aparece duas vezes (contagem
--       distinta = comprimento); e todo id devolvido é candidatura dele. População 0 reprova.
--       (d) confere INCLUSÃO do conjunto vivo, posse e ausência de REPETIÇÃO — não «nada além do
--       vivo»: isso é o papel de (h). Assim a letra de P6 não depende de haver rascunho em PROD.
--   (e) `sem_claims`, `sem_papel` (o sub do dono sem `app_metadata`) e `candidato_sem_sub` → os
--       três `42501:forbidden` (a recusa da GUARDA, pela SQLSTATE e pela mensagem).
--   (f) `has_function_privilege('anon', …, 'EXECUTE')` falso E a chamada como `anon` falha com
--       `42501:permission denied for function ler_vagas_das_minhas_candidaturas` (a recusa do
--       ACL — a mesma SQLSTATE da guarda; é a MENSAGEM que distingue as duas).
--   (g) `administrador` com o sub do admin, `rh` com o sub do recrutador e `administrador` com o
--       sub do DONO → os três `42501:forbidden` (a recusa é pelo papel, não pela linha — D-52-G7-2).
--   (h) num envelope o alvo com `is_rascunho = true` e, noutro, com `deleted_at` preenchido → nos
--       dois a RPC do dono é EXATAMENTE a do estado vivo menos o alvo (o mesmo desfecho da
--       candidatura alheia: a ausência — T-52-103).
--   (i) num envelope a vaga do alvo com `deleted_at` preenchido (o trigger de sincronia a leva a
--       `arquivada` se estava `ativa`); premissa `c_premissa_rls` como em (a); a RPC do dono ainda
--       contém o alvo com título e departamento da vaga — D-52-G7-1.
--   (j) PREMISSA pelo catálogo, sem mutação (D-52-G7-6): `candidaturas.vaga_id` NOT NULL e uma FK
--       de `candidaturas` cuja coluna é `vaga_id` e cujo `confrelid` é `public.vagas` (por
--       `pg_constraint`, nunca pelo nome) — é o que faz a vaga INEXISTENTE com candidatura viva
--       impossível no banco. Não tem mutação: mutá-la exigiria DDL em `candidaturas` (lock
--       exclusivo sobre tabela quente de PROD durante a requisição) — não vale o lock.
--   Razão escrita da cobertura de (d): a P10 faz de (d) a primeira vermelha pela REPETIÇÃO. A
--   parte de COMPLETUDE de (d) (toda candidatura viva de todo candidato, as não públicas naturais
--   inclusive) não tem mutação de âncora única que a faça a primeira vermelha — todo defeito
--   literal que tira uma linha ou troca um título atinge antes o alvo de (a) ou o outro de (b),
--   salvo se depender da população de PROD —; por isso essa parte é a cobertura própria de (d)
--   sobre a população natural, publicada em `52p.pop`.
--
-- COMO RODAR: SÓ pelo envelope que aborta — `node scripts/p52_ensaio.cjs
-- --migracoes=supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql
-- supabase/tests/p52_painel_vaga_smoke.sql` (depois do apply do 52-31: `--sem-migracoes`).
-- ⚠ PROIBIDO: `node p46apply.cjs run` deste arquivo — o `run` COMMITA; o bloco
-- `$p52_so_ensaio$` recusa antes de qualquer escrita.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de cláusulas DESTE arquivo (escopo
-- deliberado), num ÚNICO literal (`smoke52p.esperado`, abaixo). Hoje: 10 — a, b, c, d, e, f, g,
-- h, i, j.
--
-- O PORTÃO MORDE — `scripts/p52_mutacoes.cjs` (entradas P1–P10, 52-31 Task 2): cada mutação,
-- derivada do TEXTO da função na migration por troca literal, numa requisição que aborta, tem de
-- reprovar NA letra dela:
--   P1 posse aberta → (b) · P2 filtro de vaga pública no WHERE → (a) · P3 `'status', v.status`
--   na projeção → (c) · P4 guarda aceita rh/administrador → (g) · P5 `GRANT EXECUTE … TO anon`
--   → (f) · P6 sem o filtro de rascunho → (h) · P7 `v.deleted_at IS NULL` no WHERE → (i) ·
--   P8 sem `v_uid IS NULL OR ` → (e) · P9 sem a guarda → (e) · P10 multiconjunto pela junção → (d).
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
    RAISE EXCEPTION 'P52P RECUSADO (fora do ensaio): este smoke ESCREVE (envelopes P52P1 na linha real da vaga do alvo) e so roda dentro de scripts/p52_ensaio.cjs, que marca a requisicao (p52.tx) e a aborta no sentinela; p46apply.cjs run COMMITA e e proibido. Nada rodou. Use: node scripts/p52_ensaio.cjs [--sem-migracoes] supabase/tests/p52_painel_vaga_smoke.sql';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P52P RECUSADO (fora do ensaio): a marca p52.tx (%) nao e desta transacao (%): a requisicao nao e a que o ensaio abriu. Nada rodou', v_tx, txid_current();
  END IF;
END
$p52_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('smoke52p.pass', '0', false);
SELECT set_config('smoke52p.esperado', '10', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- Chamada impersonada da RPC: troca o papel, define os claims, chama e devolve {ok: retorno} ou
-- {err: 'SQLSTATE:SQLERRM'}. p_papel: 'anon' | 'sem_claims' | 'sem_papel' (o sub sem
-- app_metadata) | 'candidato_sem_sub' (papel candidato sem sub) | um papel de app_metadata
-- ('candidato', 'rh', 'administrador') com o sub. Some no aborto do ensaio (pg_temp).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION pg_temp.p52p_chamar(p_papel text, p_sub uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $p52p_chamar$
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
    EXECUTE 'SELECT public.ler_vagas_das_minhas_candidaturas()' INTO v_r;
    RESET ROLE;
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN jsonb_build_object('ok', v_r);
  EXCEPTION WHEN OTHERS THEN
    -- a subtransação deste bloco foi desfeita: papel e claims voltaram ao que eram.
    RETURN jsonb_build_object('err', SQLSTATE || ':' || SQLERRM);
  END;
END
$p52p_chamar$;

-- Sob a RLS de um claim `candidato` com o sub dado: a linha da vaga é visível? (NULL = a sonda
-- falhou — nunca lido como «invisível».)
CREATE FUNCTION pg_temp.p52p_vaga_visivel(p_sub uuid, p_vaga uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $p52p_vaga_visivel$
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
$p52p_vaga_visivel$;

-- O que uma reprovação imprime de um retorno: SÓ o erro, o tipo do topo ou a contagem — nunca
-- título, departamento ou e-mail.
CREATE FUNCTION pg_temp.p52p_resumo(p jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $p52p_resumo$
  SELECT CASE WHEN p IS NULL THEN '<nao rodou>'
              WHEN p ? 'err' THEN 'err:' || left(p ->> 'err', 100)
              WHEN jsonb_typeof(p -> 'ok') = 'array' THEN 'ok:n=' || jsonb_array_length(p -> 'ok')
              ELSE 'ok:tipo=' || coalesce(jsonb_typeof(p -> 'ok'), '<nulo>')
         END
$p52p_resumo$;


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
  -- deles cuja vaga não é pública (os casos naturais do G-52-7).
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

  IF v_dono IS NULL OR v_alvo IS NULL OR v_vaga IS NULL OR v_outro IS NULL OR v_admin IS NULL OR v_rec IS NULL THEN
    RAISE EXCEPTION 'P52P FAIL (baseline): falta ator ou populacao (dono=%, alvo=%, outro=%, admin ativo=%, recrutador ativo=%, candidatos com candidatura viva=%) — ausencia REPROVA, nunca pula',
      v_dono IS NOT NULL, v_alvo IS NOT NULL, v_outro IS NOT NULL, v_admin IS NOT NULL, v_rec IS NOT NULL, v_ncand;
  END IF;

  PERFORM set_config('smoke52p.dono', v_dono::text, false);
  PERFORM set_config('smoke52p.alvo', v_alvo::text, false);
  PERFORM set_config('smoke52p.vaga', v_vaga::text, false);
  PERFORM set_config('smoke52p.outro', v_outro::text, false);
  PERFORM set_config('smoke52p.admin', v_admin::text, false);
  PERFORM set_config('smoke52p.rec', v_rec::text, false);
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' 52p.pop=cand:' || v_ncand || ',naturais:' || v_nnat
          || ' 52p.alvo=' || v_tipo), false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) o G-52-7 fechado: em CADA status não ativo, a vaga some da RLS do dono e a RPC devolve o
--     alvo com o título e o departamento da vaga.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $a$
DECLARE
  v_dono  uuid := current_setting('smoke52p.dono')::uuid;
  v_alvo  uuid := current_setting('smoke52p.alvo')::uuid;
  v_vaga  uuid := current_setting('smoke52p.vaga')::uuid;
  s       text;
  v_vis   boolean;
  v_tit   text;
  v_dep   text;
  v_res   jsonb;
  v_rc    int;
  v_n     int := 0;
  v_err   text;
  v_rot   text[] := '{}';
BEGIN
  FOR s IN SELECT x::text FROM unnest(enum_range(NULL::public.status_vaga)) AS x WHERE x::text <> 'ativa' LOOP
    v_n := v_n + 1;
    v_vis := NULL; v_tit := NULL; v_dep := NULL; v_res := NULL; v_err := NULL;
    BEGIN
      UPDATE public.vagas SET status = s::public.status_vaga WHERE id = v_vaga;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION 'status % atingiu % vaga(s)', s, v_rc; END IF;
      v_vis := pg_temp.p52p_vaga_visivel(v_dono, v_vaga);
      SELECT v.titulo, v.departamento INTO v_tit, v_dep FROM public.vagas v WHERE v.id = v_vaga;
      v_res := pg_temp.p52p_chamar('candidato', v_dono);
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52P1';
    EXCEPTION
      WHEN SQLSTATE 'P52P1' THEN NULL;
      WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
    END;
    IF v_err IS NOT NULL THEN
      RAISE EXCEPTION 'P52P FAIL (a): a subtransacao do status % abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', s, v_err;
    END IF;
    IF v_vis IS DISTINCT FROM false THEN
      v_rot := v_rot || ('c_premissa_rls:' || s || '=' || coalesce(v_vis::text, 'sonda_falhou'));
    END IF;
    IF v_res IS NULL OR v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
      v_rot := v_rot || (s || '_retorno:' || pg_temp.p52p_resumo(v_res));
    ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res -> 'ok') e
                       WHERE jsonb_typeof(e) = 'object'
                         AND e ->> 'candidatura_id' = v_alvo::text
                         AND e -> 'titulo' = to_jsonb(v_tit)
                         AND (e -> 'departamento') IS NOT DISTINCT FROM coalesce(to_jsonb(v_dep), 'null'::jsonb)) THEN
      v_rot := v_rot || (s || '_alvo_sem_titulo_e_departamento_da_vaga:' || pg_temp.p52p_resumo(v_res));
    END IF;
  END LOOP;
  IF v_n = 0 THEN
    v_rot := v_rot || 'status_nao_ativos_vazio'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (a): [%] — o dono nao le o titulo e o departamento da vaga inativada da propria candidatura (ou a fixture nao reproduz o gap)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$a$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (b) posse: o outro candidato vê só as dele, nenhuma do dono; um sub sem candidato recebe [].
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $b$
DECLARE
  v_dono  uuid := current_setting('smoke52p.dono')::uuid;
  v_outro uuid := current_setting('smoke52p.outro')::uuid;
  v_res   jsonb;
  v_nada  jsonb;
  v_alheio int;
  v_dodono int;
  v_rot   text[] := '{}';
BEGIN
  v_res  := pg_temp.p52p_chamar('candidato', v_outro);
  v_nada := pg_temp.p52p_chamar('candidato', gen_random_uuid());

  IF v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
    v_rot := v_rot || ('outro_retorno:' || pg_temp.p52p_resumo(v_res));
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
    v_rot := v_rot || ('sub_sem_candidato:' || pg_temp.p52p_resumo(v_nada));
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (b): [%] — a RPC devolve candidatura de outro titular (ou nada ao dono legitimo)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$b$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (c) allowlist exata: todo elemento de todo retorno colhido aqui tem exatamente
--     {candidatura_id, departamento, titulo}, com os tipos do contrato.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $c$
DECLARE
  v_dono  uuid := current_setting('smoke52p.dono')::uuid;
  v_outro uuid := current_setting('smoke52p.outro')::uuid;
  v_vaga  uuid := current_setting('smoke52p.vaga')::uuid;
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
  v_rets := v_rets || pg_temp.p52p_chamar('candidato', v_dono);
  v_rets := v_rets || pg_temp.p52p_chamar('candidato', v_outro);
  BEGIN
    UPDATE public.vagas SET status = 'inativa' WHERE id = v_vaga;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'inativar atingiu % vaga(s)', v_rc; END IF;
    v_r := pg_temp.p52p_chamar('candidato', v_dono);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52P1';
  EXCEPTION
    WHEN SQLSTATE 'P52P1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52P FAIL (c): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  v_rets := v_rets || v_r;

  FOR v_i IN 1 .. cardinality(v_rets) LOOP
    v_r := v_rets[v_i];
    IF v_r IS NULL OR v_r ? 'err' OR jsonb_typeof(v_r -> 'ok') IS DISTINCT FROM 'array' THEN
      v_rot := v_rot || (v_rotul[v_i] || '_topo:' || pg_temp.p52p_resumo(v_r));
      CONTINUE;
    END IF;
    v_ruim := 0;
    FOR e IN SELECT x FROM jsonb_array_elements(v_r -> 'ok') AS x LOOP
      v_chk := v_chk + 1;
      IF jsonb_typeof(e) IS DISTINCT FROM 'object'
         OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(e) AS k)
            IS DISTINCT FROM ARRAY['candidatura_id', 'departamento', 'titulo']
         OR jsonb_typeof(e -> 'candidatura_id') IS DISTINCT FROM 'string'
         OR jsonb_typeof(e -> 'titulo') IS DISTINCT FROM 'string'
         OR jsonb_typeof(e -> 'departamento') NOT IN ('string', 'null') THEN
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
    RAISE EXCEPTION 'P52P FAIL (c): [%] — a RPC devolve chave fora da allowlist {candidatura_id, departamento, titulo} ou tipo fora do contrato', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$c$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) todo candidato com candidatura viva: a RPC dele CONTÉM toda candidatura viva dele com os
--     dois campos da vaga, sem repetição, e só candidaturas dele. População 0 reprova.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $d$
DECLARE
  r        record;
  v_res    jsonb;
  v_n      int := 0;
  v_falt   int;
  v_rep    int;
  v_alh    int;
  v_cret   int := 0;
  v_cfalt  int := 0;
  v_lfalt  int := 0;
  v_crep   int := 0;
  v_lrep   int := 0;
  v_calh   int := 0;
  v_lalh   int := 0;
  v_rot    text[] := '{}';
BEGIN
  FOR r IN SELECT ca.user_id AS sub
             FROM public.candidatos ca
            WHERE ca.user_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u WHERE u.user_id = ca.user_id)
              AND EXISTS (SELECT 1 FROM public.candidaturas c
                           WHERE c.candidato_id = ca.id AND c.deleted_at IS NULL AND c.is_rascunho = false)
            ORDER BY ca.id
  LOOP
    v_n := v_n + 1;
    v_res := pg_temp.p52p_chamar('candidato', r.sub);
    IF v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
      v_cret := v_cret + 1;
      IF v_cret = 1 THEN
        v_rot := v_rot || ('retorno:' || pg_temp.p52p_resumo(v_res));
      END IF;
      CONTINUE;
    END IF;

    -- inclusão: toda candidatura viva dele (predicado de posse, como postgres) com os dois campos da vaga.
    SELECT count(*) INTO v_falt
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = r.sub)
       AND c.deleted_at IS NULL AND c.is_rascunho = false
       AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res -> 'ok') e
                        WHERE jsonb_typeof(e) = 'object'
                          AND e ->> 'candidatura_id' = c.id::text
                          AND e -> 'titulo' = to_jsonb(v.titulo)
                          AND (e -> 'departamento') IS NOT DISTINCT FROM coalesce(to_jsonb(v.departamento), 'null'::jsonb));

    -- repetição: contagem distinta = comprimento.
    SELECT jsonb_array_length(v_res -> 'ok') - count(DISTINCT e ->> 'candidatura_id') INTO v_rep
      FROM jsonb_array_elements(v_res -> 'ok') e;

    -- posse: todo id devolvido é candidatura DELE.
    SELECT count(*) INTO v_alh
      FROM jsonb_array_elements(v_res -> 'ok') e
     WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
                        WHERE c.id::text = e ->> 'candidatura_id' AND ca.user_id = r.sub);

    IF v_falt > 0 THEN v_cfalt := v_cfalt + 1; v_lfalt := v_lfalt + v_falt; END IF;
    IF v_rep > 0 THEN v_crep := v_crep + 1; v_lrep := v_lrep + v_rep; END IF;
    IF v_alh > 0 THEN v_calh := v_calh + 1; v_lalh := v_lalh + v_alh; END IF;
  END LOOP;

  IF v_n = 0 THEN
    v_rot := v_rot || 'populacao_vazia'::text;
  END IF;
  IF v_cret > 0 THEN
    v_rot := v_rot || ('candidatos_com_retorno_torto:' || v_cret || '/' || v_n);
  END IF;
  IF v_cfalt > 0 THEN
    v_rot := v_rot || ('faltam:' || v_lfalt || '_linhas_em_' || v_cfalt || '/' || v_n || '_candidatos');
  END IF;
  IF v_crep > 0 THEN
    v_rot := v_rot || ('repetidas:' || v_lrep || '_linhas_em_' || v_crep || '/' || v_n || '_candidatos');
  END IF;
  IF v_calh > 0 THEN
    v_rot := v_rot || ('alheias:' || v_lalh || '_linhas_em_' || v_calh || '/' || v_n || '_candidatos');
  END IF;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (d): [%] — a RPC de algum candidato nao devolve toda candidatura viva dele com titulo e departamento, repete candidatura, ou devolve candidatura que nao e dele', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (e) a guarda fail-closed: sem claims, sem papel e papel sem sub → 42501:forbidden.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $e$
DECLARE
  v_dono  uuid := current_setting('smoke52p.dono')::uuid;
  -- ESCOPO DELIBERADO: os três modos de token incompleto que a guarda recusa.
  v_casos text[] := ARRAY['sem_claims', 'sem_papel', 'candidato_sem_sub'];
  k       text;
  v_r     jsonb;
  v_rot   text[] := '{}';
BEGIN
  FOREACH k IN ARRAY v_casos LOOP
    v_r := pg_temp.p52p_chamar(k, v_dono);
    -- SQLSTATE E mensagem: 42501 também é a do ACL; 'forbidden' é a da guarda.
    IF v_r ->> 'err' IS DISTINCT FROM '42501:forbidden' THEN
      v_rot := v_rot || (k || ':' || pg_temp.p52p_resumo(v_r));
    END IF;
  END LOOP;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (e): [%] — token sem claims, sem papel ou sem sub nao foi recusado pela guarda (42501 forbidden)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$e$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) o ACL: anon sem EXECUTE, e a chamada como anon recusada PELO ACL (não pela guarda).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_priv boolean;
  v_r    jsonb;
  v_rot  text[] := '{}';
BEGIN
  v_priv := has_function_privilege('anon', 'public.ler_vagas_das_minhas_candidaturas()', 'EXECUTE');
  IF v_priv IS DISTINCT FROM false THEN
    v_rot := v_rot || ('anon_com_execute:' || coalesce(v_priv::text, 'nulo'));
  END IF;
  v_r := pg_temp.p52p_chamar('anon', NULL);
  IF v_r ->> 'err' IS DISTINCT FROM '42501:permission denied for function ler_vagas_das_minhas_candidaturas' THEN
    v_rot := v_rot || ('anon_chamada:' || pg_temp.p52p_resumo(v_r));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (f): [%] — anon alcanca a funcao (EXECUTE no ACL) ou a recusa nao e a do ACL', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$f$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (g) papel de RH/admin recusado, inclusive com o sub do DONO (a recusa é pelo papel — D-52-G7-2).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $g$
DECLARE
  v_dono  uuid := current_setting('smoke52p.dono')::uuid;
  v_admin uuid := current_setting('smoke52p.admin')::uuid;
  v_rec   uuid := current_setting('smoke52p.rec')::uuid;
  v_r     jsonb;
  v_rot   text[] := '{}';
BEGIN
  v_r := pg_temp.p52p_chamar('administrador', v_admin);
  IF v_r ->> 'err' IS DISTINCT FROM '42501:forbidden' THEN
    v_rot := v_rot || ('administrador_sub_do_admin:' || pg_temp.p52p_resumo(v_r));
  END IF;
  v_r := pg_temp.p52p_chamar('rh', v_rec);
  IF v_r ->> 'err' IS DISTINCT FROM '42501:forbidden' THEN
    v_rot := v_rot || ('rh_sub_do_recrutador:' || pg_temp.p52p_resumo(v_r));
  END IF;
  v_r := pg_temp.p52p_chamar('administrador', v_dono);
  IF v_r ->> 'err' IS DISTINCT FROM '42501:forbidden' THEN
    v_rot := v_rot || ('administrador_sub_do_dono:' || pg_temp.p52p_resumo(v_r));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (g): [%] — token de RH ou administrador nao foi recusado pela guarda (42501 forbidden)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$g$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) candidatura rascunho e excluída: a RPC do dono é EXATAMENTE a do estado vivo menos o alvo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  v_dono uuid := current_setting('smoke52p.dono')::uuid;
  v_alvo uuid := current_setting('smoke52p.alvo')::uuid;
  v_vivo jsonb;
  v_esp  jsonb;
  v_r    jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean;
  k      text;
  v_rot  text[] := '{}';
BEGIN
  v_vivo := pg_temp.p52p_chamar('candidato', v_dono);
  IF v_vivo ? 'err' OR jsonb_typeof(v_vivo -> 'ok') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'P52P FAIL (h): [vivo_retorno:%] — a RPC do dono no estado vivo nao devolveu lista', pg_temp.p52p_resumo(v_vivo);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_vivo -> 'ok') e WHERE e ->> 'candidatura_id' = v_alvo::text) THEN
    RAISE EXCEPTION 'P52P FAIL (h): [c_alvo_ausente_do_vivo] — o alvo nao esta no retorno vivo do dono: a comparacao seria vacua';
  END IF;
  SELECT coalesce(jsonb_agg(t.e ORDER BY t.o), '[]'::jsonb) INTO v_esp
    FROM jsonb_array_elements(v_vivo -> 'ok') WITH ORDINALITY AS t(e, o)
   WHERE t.e ->> 'candidatura_id' IS DISTINCT FROM v_alvo::text;

  -- ESCOPO DELIBERADO: os dois estados de candidatura NÃO viva.
  FOREACH k IN ARRAY ARRAY['rascunho', 'excluida'] LOOP
    v_r := NULL; v_err := NULL; v_ran := false;
    BEGIN
      IF k = 'rascunho' THEN
        UPDATE public.candidaturas SET is_rascunho = true WHERE id = v_alvo;
      ELSE
        UPDATE public.candidaturas SET deleted_at = now() WHERE id = v_alvo;
      END IF;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      IF v_rc <> 1 THEN RAISE EXCEPTION '% atingiu % candidatura(s)', k, v_rc; END IF;
      v_r := pg_temp.p52p_chamar('candidato', v_dono);
      v_ran := true;
      RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52P1';
    EXCEPTION
      WHEN SQLSTATE 'P52P1' THEN NULL;
      WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
    END;
    IF v_err IS NOT NULL OR NOT v_ran THEN
      RAISE EXCEPTION 'P52P FAIL (h): a subtransacao % abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', k, coalesce(v_err, 'nao chegou ao fim');
    END IF;
    IF v_r ? 'err' OR jsonb_typeof(v_r -> 'ok') IS DISTINCT FROM 'array' THEN
      v_rot := v_rot || (k || '_retorno:' || pg_temp.p52p_resumo(v_r));
    ELSIF (v_r -> 'ok') IS DISTINCT FROM v_esp THEN
      v_rot := v_rot || (k || '_diferente_do_vivo_menos_o_alvo:n=' || jsonb_array_length(v_r -> 'ok')
                        || '/esperado=' || jsonb_array_length(v_esp));
    END IF;
  END LOOP;

  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (h): [%] — candidatura rascunho ou excluida ainda aparece (ou o resto mudou): o desfecho nao e o da candidatura alheia, a ausencia', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (i) vaga apagada por deleted_at: some da RLS do dono e a RPC ainda devolve o alvo com o título e
--     o departamento dela (D-52-G7-1).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $i$
DECLARE
  v_dono uuid := current_setting('smoke52p.dono')::uuid;
  v_alvo uuid := current_setting('smoke52p.alvo')::uuid;
  v_vaga uuid := current_setting('smoke52p.vaga')::uuid;
  v_vis  boolean;
  v_tit  text;
  v_dep  text;
  v_res  jsonb;
  v_rc   int;
  v_err  text;
  v_ran  boolean := false;
  v_rot  text[] := '{}';
BEGIN
  BEGIN
    UPDATE public.vagas SET deleted_at = now() WHERE id = v_vaga;
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    IF v_rc <> 1 THEN RAISE EXCEPTION 'deleted_at atingiu % vaga(s)', v_rc; END IF;
    v_vis := pg_temp.p52p_vaga_visivel(v_dono, v_vaga);
    SELECT v.titulo, v.departamento INTO v_tit, v_dep FROM public.vagas v WHERE v.id = v_vaga;
    v_res := pg_temp.p52p_chamar('candidato', v_dono);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P52P1';
  EXCEPTION
    WHEN SQLSTATE 'P52P1' THEN NULL;
    WHEN OTHERS THEN v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;
  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P52P FAIL (i): a subtransacao abortou por erro INESPERADO (%) — nada foi julgado; o defeito e do SMOKE', coalesce(v_err, 'nao chegou ao fim');
  END IF;
  IF v_vis IS DISTINCT FROM false THEN
    v_rot := v_rot || ('c_premissa_rls:deleted_at=' || coalesce(v_vis::text, 'sonda_falhou'));
  END IF;
  IF v_res IS NULL OR v_res ? 'err' OR jsonb_typeof(v_res -> 'ok') IS DISTINCT FROM 'array' THEN
    v_rot := v_rot || ('retorno:' || pg_temp.p52p_resumo(v_res));
  ELSIF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res -> 'ok') e
                     WHERE jsonb_typeof(e) = 'object'
                       AND e ->> 'candidatura_id' = v_alvo::text
                       AND e -> 'titulo' = to_jsonb(v_tit)
                       AND (e -> 'departamento') IS NOT DISTINCT FROM coalesce(to_jsonb(v_dep), 'null'::jsonb)) THEN
    v_rot := v_rot || ('alvo_sem_titulo_e_departamento_da_vaga_apagada:' || pg_temp.p52p_resumo(v_res));
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (i): [%] — com a vaga apagada por deleted_at o dono perde o titulo e o departamento da propria candidatura (D-52-G7-1), ou a fixture nao reproduz o gap', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$i$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) PREMISSA pelo catálogo (D-52-G7-6), sem mutação: candidaturas.vaga_id NOT NULL e uma FK
--     validada de candidaturas sobre a coluna vaga_id que aponta public.vagas — por pg_constraint,
--     nunca pelo nome. É o que torna impossível a vaga INEXISTENTE com candidatura viva.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $j$
DECLARE
  v_nn  boolean;
  v_att smallint;
  v_fk  int;
  v_rot text[] := '{}';
BEGIN
  SELECT a.attnotnull, a.attnum INTO v_nn, v_att
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.candidaturas'::regclass AND a.attname = 'vaga_id' AND NOT a.attisdropped;
  IF v_att IS NULL THEN
    v_rot := v_rot || 'coluna_vaga_id_ausente'::text;
  ELSIF v_nn IS DISTINCT FROM true THEN
    v_rot := v_rot || 'vaga_id_aceita_nulo'::text;
  END IF;
  SELECT count(*) INTO v_fk
    FROM pg_catalog.pg_constraint k
   WHERE k.conrelid = 'public.candidaturas'::regclass
     AND k.contype = 'f'
     AND k.convalidated
     AND k.conkey = ARRAY[v_att]
     AND k.confrelid = 'public.vagas'::regclass;
  IF v_fk < 1 THEN
    v_rot := v_rot || 'sem_fk_validada_de_vaga_id_para_vagas'::text;
  END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52P FAIL (j): [%] — a premissa da D-52-G7-6 caiu: candidatura viva com vaga inexistente deixou de ser impossivel no banco (o fallback do cartao vira caminho real)', array_to_string(v_rot, ',');
  END IF;
  PERFORM set_config('smoke52p.pass', (current_setting('smoke52p.pass')::int + 1)::text, false);
END
$j$;
