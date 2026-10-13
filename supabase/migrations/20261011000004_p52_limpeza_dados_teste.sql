-- =============================================================================
-- ⛔⛔ DESTRUTIVA E IRREVERSIVEL ⛔⛔
-- Phase 52 / Plano 52-20 — bloco D, limpeza dos dados de TESTE de PROD (D-30, D-32, D-41 emendada,
-- JORN-63), escrita EXATAMENTE para o escopo decidido pelo operador em
-- `.planning/phases/52-hub-do-rh-dados-e-contato/52-19-DECISAO-ESCOPO.md` (2026-10-13).
-- =============================================================================
--
-- ⛔ APLICAR SÓ PELO 52-21-COMANDO-APPLY.sh — `node p46apply.cjs migrate` atrás de
--    `p52_portao.cjs --modo apply`, depois do review bloqueante, do export prévio e do OK escrito do
--    operador sobre os números medidos minutos antes.
-- ⛔ NUNCA `supabase db push` (nem `--linked`, nem `--include-all`, nem «para adiantar»): este arquivo
--    fica commitado em `supabase/migrations/` FORA do ledger até o 52-21, e um `db push` qualquer
--    nesse intervalo o aplicaria inteiro, sem a população aprovada, sem o pin e sem o review.
--    O 52-20 só o ENSAIA (`scripts/p52_ensaio.cjs`, requisição que aborta); não roda `db push` nem
--    `migration repair`.
--
-- O QUE APAGA (uma linha por categoria do `apagar_categorias` da decisão; a população é RECOMPUTADA
-- no PRE pela MESMA varredura do `scripts/p52_limpeza_portao.cjs` — `SQL_VARREDURA` —, nunca lida de
-- lista de ids):
--   · ficticios                     — os candidatos fictícios da comparação (`%.teste@invalido.local`,
--                                     sem conta de login), com as candidaturas deles;
--   · tombstones                    — os titulares já anonimizados (sentinela derivada do id, sem conta
--                                     de login), com as candidaturas que sobraram;
--   · contas_teste_com_candidatura  — as contas de teste (padrões da D-30 + semente do p47, ou
--                                     candidatura em vaga de teste) com candidatura, as candidaturas
--                                     delas (em qualquer vaga, inclusive as ativas) e a conta de login;
--   · contas_sem_candidatura        — as contas de teste sem candidatura, e a conta de login.
--   E em `public.vagas`: `deleted_at = now()` nas vagas de teste que ainda não o têm (decisão: as 8
--   `deleted_at`; `cb413d5d` já tem = `manter`, nada muda nela); NENHUMA vaga é removida
--   (`v_remover_ids8` vazio — remover atravessaria a trava por CASCADE nas colisões).
--
-- O QUE NUNCA TOCA:
--   · as contas de `usuarios_rh` — a TRAVA: todo `candidatos.user_id` presente em `usuarios_rh` fica
--     fora das duas entradas da varredura (anti-join `NOT EXISTS`, nunca `NOT IN`), e o `auth.users`
--     só é apagado com DUPLA GUARDA (sem linha em `usuarios_rh` E sem `candidatos` restante); a conta
--     da trava (`d8ef9db1`) e as candidaturas dela — inclusive nas colisões `53b73af6`/`53f75c81` e na
--     `9f6ccf1a` — ficam intactas, provado pela impressão digital no POS;
--   · as fixtures `fixture-p46-*` (teardown próprio no fecho do M8) — impressão digital no POS;
--   · os 3 `auth.users` órfãos sem padrão de teste (`manter`: backlog do fecho do M8) — o DELETE em
--     `auth.users` é limitado às contas da população, nunca a «órfãos em geral»;
--   · as linhas das vagas ativas `fdbe1a4a`/`e897f709` (só as candidaturas delas saem) e a `9f6ccf1a`
--     (fora do bloco D) — nenhuma é vaga de teste, então nenhum UPDATE as alcança; provado no POS;
--   · dado real: nenhum candidato fora da população (impressão digital do não-alvo no POS).
--
-- ⛔ O PITR foi recusado (D-41 emendada, 2026-10-11): as linhas voltam cirurgicamente pelo export local
--    da população que o 52-21 faz antes do apply (`p52_export_limpeza.cjs`, fora do git), ou, com o
--    banco INTEIRO, pelo backup diário — o apply só roda na manhã seguinte a um backup diário posterior
--    ao export e ao último apply da fase, conferido por máquina no comando do 52-21; o Storage em si
--    não tem backup: o currículo só volta pelo export.
-- ⛔ A remoção de Storage é passo SEPARADO, pela Storage API (`scripts/p52_remove_storage.cjs`), depois
--    do commit desta transação — NUNCA `DELETE FROM storage.objects` (o blob fica órfão para sempre; o
--    trigger `protect_objects_delete` existe por isso, F11). Este arquivo não toca o Storage.
--
-- -----------------------------------------------------------------------------
-- (1) O GRAFO DE FK É LIDO NA EXECUÇÃO (F10, Pitfall 9)
-- -----------------------------------------------------------------------------
-- O PRE lista em `pg_constraint` toda FK `NO ACTION`/`RESTRICT` que referencia `candidaturas`,
-- `historico_candidatura`, `candidatos` ou `auth.users` e RECUSA se houver alguma fora do conjunto
-- tratado aqui (medido em 2026-10-13):
--   → candidaturas:          historico_candidatura, decisao_final, decisao_final_historico,
--                            retencao_hold, revisao_rejeicao (DELETE explícito, nesta ordem);
--   → historico_candidatura: revisao_rejeicao.historico_rejeicao_id (por isso revisao_rejeicao vem
--                            antes de historico_candidatura);
--   → candidatos:            solicitacoes_dados (DELETE explícito) e candidate_ai_decisions.candidato_id —
--                            esta é `SET NULL` sobre coluna `NOT NULL`, o que na prática é RESTRICT
--                            (medido no ensaio do 52-20: `23502` ao apagar o candidato); DELETE explícito;
--   → auth.users:            todo `created_by`/`updated_by`, historico_candidatura.ator,
--                            decisao_final.por_usuario, redacoes_candidato.revisada_por,
--                            sessoes_ativas.revogado_por — tratados por CONFERÊNCIA: antes do DELETE
--                            em `auth.users`, nenhuma linha restante pode referenciar conta a apagar
--                            (as duas últimas não estavam na lista do plano; são colunas de ator do RH,
--                            da mesma família de `decisao_final.por_usuario` — desvio registrado).
-- O PRE trata como RESTRICT toda FK `SET NULL`/`SET DEFAULT` cuja coluna é `NOT NULL` e recusa a que
-- não estiver no conjunto acima. Uma FK nova faz a migration PARAR, não apagar pela metade. O resto é
-- `CASCADE` (some com a linha-mãe) ou `SET NULL` sobre coluna anulável (`ai_call_logs`,
-- `recruiter_alerts`, `logs_acesso`, `autorizacoes.user_id`, `decisao_final.revisao_por_usuario`: trilha
-- de IA, custo e acesso, que sobrevive com a referência nula). ⚠ O p47 dizia que `candidate_ai_decisions`
-- sobrevivia assim; a coluna é `NOT NULL`, então a linha não pode sobreviver ao candidato — sai junto.
-- Antes do DELETE de cada linha-mãe, `(filhos)` exige um passo de DELETE registrado para CADA filho
-- `NO ACTION` do catálogo — um passo esquecido para aqui, com ou sem linhas a apagar.
--
-- ⚠ `historico_acoes` (filho CASCADE de candidaturas) é IMUTÁVEL por trigger: `prevent_delete_historico_acoes`
-- (BEFORE DELETE, `prevent_historico_acoes_modification()`) levanta exceção em TODO DELETE — inclusive
-- o da CASCADE. Medido no ensaio do 52-20 (2026-10-13): a primeira versão desta migration parou ali
-- (`historico_acoes é uma tabela IMUTÁVEL`), com 8 linhas de auditoria, todas de UMA candidatura-alvo.
-- Tratamento, o mais estreito possível: o trigger de DELETE (só ele; o de UPDATE fica) é desligado
-- com `ALTER TABLE … DISABLE TRIGGER` SÓ em volta de um DELETE explícito das linhas de
-- `historico_acoes` das candidaturas-alvo, e religado na instrução seguinte — antes do DELETE de
-- candidaturas, que então não encontra mais nada a cascatear ali. A mudança de catálogo é
-- transacional: nenhuma outra sessão vê o trigger desligado (o commit já o leva religado), e
-- qualquer erro devolve tudo. O PRE recusa se o trigger não for exatamente esse e estiver ligado
-- (`(imutavel)`) ou se aparecer outro trigger de DELETE em public/auth fora do conhecido
-- (`(triggers)`); o POS exige o trigger religado (`tgenabled = 'O'`), resíduo zero e apagadas = alvo.
-- ⚠ DECISÃO PARA O REVIEW BLOQUEANTE (52-21): apagar auditoria imutável de candidatura de teste é
-- consequência do escopo decidido (a FK é CASCADE: a linha não pode sobreviver à candidatura), mas
-- desligar a guarda, mesmo por uma instrução, é escolha que o revisor e o operador confirmam.
--
-- -----------------------------------------------------------------------------
-- (2) PRE / LIMPA / POS
-- -----------------------------------------------------------------------------
-- `P52D PRE-PORTAO` recusa, sem mudar nada: (populacao) vazia ou id em duas categorias; (aprovada) md5 do
-- alvo calculado != `populacao_md5` aprovado (WR-03 mínimo do 52-REVIEW-LIMPEZA-1); (fk) FK não
-- tratada; (imutavel)/(triggers) trigger de DELETE diferente do conhecido; (remover) vaga a remover
-- sem exatamente uma vaga pelo prefixo, fora das vagas de teste, ou com candidatura FORA da população. Guarda em GUCs LOCAIS: a população (ids por categoria, contas de
-- login), o `populacao_md5` canônico (`md5(string_agg(id::text, ',' ORDER BY id::text COLLATE "C"))`
-- sobre os ids distintos — a forma do 52-19: ids distintos, ordem de byte, vírgula), as contagens-alvo,
-- as vagas-alvo e as impressões digitais (md5 de `to_jsonb` das linhas INTEIRAS, baseline capturada
-- NESTA execução, nunca constante — CLAUDE.md §Portões; o p47 com 41/33 era fotografia, F10) de:
-- trava (usuarios_rh + candidatos/candidaturas das contas de RH + existência das contas de login delas),
-- fixtures (candidatos/candidaturas/vagas `fixture-p46`) e não-alvo (candidatos e candidaturas fora da
-- população, `historico_acoes` fora das candidaturas-alvo, existência das contas de login fora da
-- população, vagas fora das vagas-alvo).
-- `LIMPA` — um único `DO`: filhos NO ACTION das candidaturas-alvo → historico_acoes (imutável, ver acima)
-- → candidaturas (o resto é CASCADE) → solicitacoes_dados e candidate_ai_decisions → candidatos → auth.users (só os da população, dupla guarda) → vagas
-- (`deleted_at`; `remover` só sem candidatura restante); `GET DIAGNOSTICS` em cada passo.
-- `P52D POS-PORTAO` recusa — e a transação INTEIRA volta — nesta ordem: (residuo) por categoria,
-- candidaturas, contas e vagas; (apagadas) candidatos e candidaturas = alvo do PRE; (trava); (fixtures);
-- (nao_alvo); (auth) contas apagadas = alvo; (imutavel); (vagas). Evidência em `p52.evidencia`: só contagens e md5.
-- Nenhuma cópia das linhas apagadas é guardada aqui; nenhum e-mail, nome ou CPF sai deste arquivo.
--
-- -----------------------------------------------------------------------------
-- (3) LOCK / TIMEOUT / CONCORRÊNCIA / TRANSPORTE
-- -----------------------------------------------------------------------------
-- `lock_timeout = 3s` limita a espera na fila; `statement_timeout = 5s` limita cada instrução (cada
-- `DO` é uma instrução) — dimensionado pelo ensaio do 52-20 (o `DO $limpa$` inteiro levou bem menos que
-- isso; o valor medido vai no SUMMARY). Em PROD o apply roda em READ COMMITTED: uma linha não-alvo,
-- da trava ou das fixtures que mude entre o PRE e o POS faz o POS recusar e NADA persiste (fail-closed);
-- o apply se repete pela mesma via. Sem wrapper de transação explícito (CLAUDE.md §Migrations): o
-- endpoint já roda o corpo inteiro numa única transação, e `DO` adjacentes num wrapper são a forma
-- exata do 42601.
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52D PRE-PORTAO — população pela varredura, grafo de FK, vagas, impressões digitais.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  -- WR-03 mínimo do 52-REVIEW-LIMPEZA-1: populacao aprovada pelo operador em 52-21-DECISAO.md
  -- (`populacao_md5_aprovado`) — escopo decidido, não fotografia: população nova exige decisão nova e
  -- migration nova. O PRE recusa, antes de qualquer DELETE, se o md5 canônico do alvo que ele calcula
  -- (v_md5) for outro.
  v_md5_aprovado constant text := '1b4b21a93ff00a9d01f7d10926dd1f54';
  -- 52-19-DECISAO-ESCOPO.md, linha `apagar_categorias` (escopo DECIDIDO, não fotografia)
  v_cats constant text[] := ARRAY['ficticios', 'tombstones', 'contas_teste_com_candidatura', 'contas_sem_candidatura'];
  -- 52-19-DECISAO-ESCOPO.md, destinos `vaga_<id8>`: nenhuma vaga `remover`
  v_remover_ids8 constant text[] := '{}'::text[];
  v_pop     jsonb;
  v_ids     uuid[];
  v_users   uuid[];
  v_vagas   uuid[];
  v_remover uuid[] := '{}'::uuid[];
  v_n_alvo  bigint;
  v_k_alvo  bigint;
  v_md5     text;
  v_vmd5    text;
  v_cat     text;
  v_lista   uuid[];
  v_x       text;
  v_trava_k bigint;
  v_ha_alvo bigint;
  v_fp_trava    text;
  v_fp_fixtures text;
  v_fp_nao_alvo text;
BEGIN
  -- (populacao) A MESMA varredura do scripts/p52_limpeza_portao.cjs (SQL_VARREDURA): duas entradas,
  -- trava do RH por NOT EXISTS sobre a CTE rh (única definição da trava neste arquivo), partição por
  -- precedência. Padrões COPIADOS do script (PADROES_D30 + SEMENTE_P47, padroes_md5 fa46cb9e…).
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
    SELECT c.id, c.user_id,
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
  SELECT coalesce(jsonb_object_agg(q.cat, q.itens), '{}'::jsonb) INTO v_pop
    FROM (SELECT cls.cat, jsonb_agg(jsonb_build_object('id', cls.id, 'user_id', cls.user_id) ORDER BY cls.id::text COLLATE "C") AS itens
            FROM cls WHERE cls.cat = ANY (v_cats) GROUP BY cls.cat) q;

  v_ids := ARRAY(SELECT DISTINCT (e ->> 'id')::uuid FROM jsonb_each(v_pop) AS c(k, a), jsonb_array_elements(c.a) AS e);
  SELECT coalesce(sum(jsonb_array_length(c.a)), 0) INTO v_n_alvo FROM jsonb_each(v_pop) AS c(k, a);
  -- contas de login da população: os fictícios e os tombstones não têm (user_id nulo) — são raiz sem auth.users
  v_users := ARRAY(SELECT DISTINCT (e ->> 'user_id')::uuid FROM jsonb_each(v_pop) AS c(k, a), jsonb_array_elements(c.a) AS e
                    WHERE e ->> 'user_id' IS NOT NULL);
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (populacao): nenhuma conta nas categorias decididas — populacao vazia nao prova nada; medir de novo; nada mudou';
  END IF;
  IF v_n_alvo <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (populacao): % entradas para % ids distintos — uma conta em duas categorias quebra a particao; nada mudou', v_n_alvo, cardinality(v_ids);
  END IF;
  SELECT md5(coalesce(string_agg(x::text, ',' ORDER BY x::text COLLATE "C"), '')) INTO v_md5 FROM unnest(v_ids) AS x;
  -- (aprovada) WR-03 mínimo: o alvo calculado AGORA é a população aprovada, ou nada é apagado
  IF v_md5 IS DISTINCT FROM v_md5_aprovado THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (aprovada): populacao calculada % != aprovada % — nada apagado', v_md5, v_md5_aprovado;
  END IF;
  SELECT count(*) INTO v_k_alvo FROM public.candidaturas k WHERE k.candidato_id = ANY (v_ids);

  -- (fk) o grafo, lido agora
  SELECT string_agg(f.t, ', ' ORDER BY f.t) INTO v_x
    FROM (SELECT tn.nspname || '.' || tr.relname || '.' || coalesce(a.attname, '?') || ' -> ' || rn.nspname || '.' || rr.relname AS t,
                 tn.nspname || '.' || tr.relname AS tab, a.attname AS col, rn.nspname || '.' || rr.relname AS ref,
                 cardinality(c.conkey) AS ncol, c.confdeltype AS tipo
            FROM pg_catalog.pg_constraint c
            JOIN pg_catalog.pg_class tr ON tr.oid = c.conrelid
            JOIN pg_catalog.pg_namespace tn ON tn.oid = tr.relnamespace
            JOIN pg_catalog.pg_class rr ON rr.oid = c.confrelid
            JOIN pg_catalog.pg_namespace rn ON rn.oid = rr.relnamespace
            LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
           WHERE c.contype = 'f'
             AND (c.confdeltype IN ('a', 'r') OR (c.confdeltype IN ('n', 'd') AND (a.attnotnull OR cardinality(c.conkey) <> 1)))
             AND c.confrelid IN ('public.candidaturas'::regclass, 'public.historico_candidatura'::regclass,
                                 'public.candidatos'::regclass, 'auth.users'::regclass)) f
   WHERE NOT (f.ncol = 1 AND (
           (f.ref = 'public.candidaturas' AND f.col = 'candidatura_id'
              AND f.tab = ANY (ARRAY['public.historico_candidatura', 'public.decisao_final', 'public.decisao_final_historico',
                                     'public.retencao_hold', 'public.revisao_rejeicao']))
        OR (f.ref = 'public.historico_candidatura' AND f.tab = 'public.revisao_rejeicao' AND f.col = 'historico_rejeicao_id')
        OR (f.ref = 'public.candidatos' AND f.tab = 'public.solicitacoes_dados' AND f.col = 'candidato_id')
        OR (f.ref = 'public.candidatos' AND f.tab = 'public.candidate_ai_decisions' AND f.col = 'candidato_id')
        OR (f.ref = 'auth.users' AND f.tipo IN ('a', 'r') AND (f.col IN ('created_by', 'updated_by')
              OR f.tab || '.' || f.col = ANY (ARRAY['public.historico_candidatura.ator', 'public.decisao_final.por_usuario',
                                                    'public.redacoes_candidato.revisada_por', 'public.sessoes_ativas.revogado_por'])))));
  IF v_x IS NOT NULL THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (fk): FK NO ACTION/RESTRICT (ou SET NULL sobre coluna NOT NULL) fora do conjunto tratado: [%] — tratar na migration (DELETE na ordem, ou conferencia de referencia) antes de aplicar; nada mudou', v_x;
  END IF;

  -- (imutavel) o trigger que guarda historico_acoes é o conhecido, e está ligado
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
                  WHERE t.tgrelid = 'public.historico_acoes'::regclass AND t.tgname = 'prevent_delete_historico_acoes'
                    AND NOT t.tgisinternal AND t.tgenabled = 'O' AND (t.tgtype & 8) <> 0
                    AND t.tgfoid = 'public.prevent_historico_acoes_modification()'::regprocedure) THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (imutavel): o trigger prevent_delete_historico_acoes nao e o conhecido (ausente, desligado ou com outra funcao) — revisar o tratamento de historico_acoes antes de aplicar; nada mudou';
  END IF;
  -- (triggers) nenhum outro trigger de DELETE em public/auth fora do conhecido
  SELECT string_agg(n.nspname || '.' || c.relname || '.' || t.tgname, ', ' ORDER BY n.nspname || '.' || c.relname || '.' || t.tgname) INTO v_x
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE NOT t.tgisinternal AND (t.tgtype & 8) <> 0 AND n.nspname IN ('public', 'auth')
     AND n.nspname || '.' || c.relname || '.' || t.tgname <> ALL (ARRAY['public.historico_acoes.prevent_delete_historico_acoes',
                                                                       'public.usuarios_rh.trg_usuarios_rh_anti_lockout']);
  IF v_x IS NOT NULL THEN
    RAISE EXCEPTION 'P52D PRE-PORTAO (triggers): trigger de DELETE fora do conjunto conhecido: [%] — medir o efeito dele na limpeza antes de aplicar; nada mudou', v_x;
  END IF;
  SELECT count(*) INTO v_ha_alvo FROM public.historico_acoes h
   WHERE EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.id = h.candidatura_id AND k.candidato_id = ANY (v_ids));

  -- (remover) vagas a remover: cada prefixo = exatamente uma vaga de teste, sem candidatura fora da população
  IF cardinality(v_remover_ids8) > 0 THEN
    SELECT string_agg(p, ',' ORDER BY p) INTO v_x FROM unnest(v_remover_ids8) AS p
     WHERE (SELECT count(*) FROM public.vagas v WHERE left(v.id::text, 8) = p) <> 1;
    IF v_x IS NOT NULL THEN
      RAISE EXCEPTION 'P52D PRE-PORTAO (remover): prefixo(s) [%] sem exatamente uma vaga; nada mudou', v_x;
    END IF;
    v_remover := ARRAY(SELECT v.id FROM public.vagas v WHERE left(v.id::text, 8) = ANY (v_remover_ids8));
    IF EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = ANY (v_remover) AND NOT (v.titulo ILIKE '%[TESTE%' OR v.slug ILIKE 'teste-%')) THEN
      RAISE EXCEPTION 'P52D PRE-PORTAO (remover): vaga marcada para remover nao e vaga de teste; nada mudou';
    END IF;
    IF EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.vaga_id = ANY (v_remover) AND NOT (k.candidato_id = ANY (v_ids))) THEN
      RAISE EXCEPTION 'P52D PRE-PORTAO (remover): vaga marcada para remover tem candidatura fora da populacao — a remocao atravessaria por CASCADE uma candidatura que fica; nada mudou';
    END IF;
    SELECT string_agg(tn.nspname || '.' || tr.relname, ', ' ORDER BY tn.nspname || '.' || tr.relname) INTO v_x
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class tr ON tr.oid = c.conrelid
      JOIN pg_catalog.pg_namespace tn ON tn.oid = tr.relnamespace
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND c.confrelid = 'public.vagas'::regclass
       AND (c.confdeltype IN ('a', 'r') OR (c.confdeltype IN ('n', 'd') AND (a.attnotnull OR cardinality(c.conkey) <> 1)))
       AND NOT (c.confdeltype IN ('a', 'r') AND cardinality(c.conkey) = 1 AND tn.nspname || '.' || tr.relname = 'public.agendamentos_entrevista' AND a.attname = 'vaga_id');
    IF v_x IS NOT NULL THEN
      RAISE EXCEPTION 'P52D PRE-PORTAO (remover): FK NO ACTION/RESTRICT para vagas fora do conjunto tratado: [%]; nada mudou', v_x;
    END IF;
  END IF;

  -- vagas-alvo do deleted_at: as vagas de teste ainda sem deleted_at (decisão: as 8; cb413d5d já tem)
  v_vagas := ARRAY(SELECT v.id FROM public.vagas v
                    WHERE (v.titulo ILIKE '%[TESTE%' OR v.slug ILIKE 'teste-%') AND v.deleted_at IS NULL
                      AND NOT (v.id = ANY (v_remover)) ORDER BY v.id);
  SELECT md5(coalesce(string_agg(left(x::text, 8), ',' ORDER BY left(x::text, 8) COLLATE "C"), '')) INTO v_vmd5 FROM unnest(v_vagas) AS x;

  -- impressões digitais (baseline DESTA execução) — as MESMAS expressões no POS e no smoke52d
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp_trava
    FROM (SELECT 'u:' || to_jsonb(r)::text AS x FROM public.usuarios_rh r
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
          UNION ALL SELECT 'c:' || to_jsonb(c)::text FROM public.candidatos c WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)) s;
  SELECT count(*) INTO v_trava_k FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
   WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id);
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp_fixtures
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE v.titulo ILIKE 'fixture-p46%') s;
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp_nao_alvo
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE NOT (c.id = ANY (v_ids))
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k WHERE NOT (k.candidato_id = ANY (v_ids))
          UNION ALL SELECT 'h:' || to_jsonb(h)::text FROM public.historico_acoes h
                     WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.id = h.candidatura_id AND k.candidato_id = ANY (v_ids))
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE NOT (u.id = ANY (v_users))
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE NOT (v.id = ANY (v_vagas || v_remover))) s;

  -- GUCs LOCAIS (só desta transação): população e baseline para o LIMPA, o POS e o smoke52d
  PERFORM set_config('p52.limpeza.cats', array_to_string(v_cats, ','), true);
  FOREACH v_cat IN ARRAY v_cats LOOP
    v_lista := ARRAY(SELECT (e ->> 'id')::uuid FROM jsonb_array_elements(coalesce(v_pop -> v_cat, '[]'::jsonb)) AS e);
    PERFORM set_config('p52.limpeza.n_' || v_cat, cardinality(v_lista)::text, true);
    PERFORM set_config('p52.limpeza.ids_' || v_cat, array_to_string(v_lista, ','), true);
  END LOOP;
  PERFORM set_config('p52.limpeza.ids', array_to_string(v_ids, ','), true);
  PERFORM set_config('p52.limpeza.users', array_to_string(v_users, ','), true);
  PERFORM set_config('p52.limpeza.vagas', array_to_string(v_vagas, ','), true);
  PERFORM set_config('p52.limpeza.remover', array_to_string(v_remover, ','), true);
  PERFORM set_config('p52.limpeza.populacao_md5', v_md5, true);
  PERFORM set_config('p52.limpeza.n_alvo', v_n_alvo::text, true);
  PERFORM set_config('p52.limpeza.k_alvo', v_k_alvo::text, true);
  PERFORM set_config('p52.limpeza.auth_alvo', cardinality(v_users)::text, true);
  PERFORM set_config('p52.limpeza.vagas_alvo', cardinality(v_vagas)::text, true);
  PERFORM set_config('p52.limpeza.vagas_md5', v_vmd5, true);
  PERFORM set_config('p52.limpeza.trava_k', v_trava_k::text, true);
  PERFORM set_config('p52.limpeza.ha_alvo', v_ha_alvo::text, true);
  PERFORM set_config('p52.limpeza.fp_trava', v_fp_trava, true);
  PERFORM set_config('p52.limpeza.fp_fixtures', v_fp_fixtures, true);
  PERFORM set_config('p52.limpeza.fp_nao_alvo', v_fp_nao_alvo, true);
END
$pre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A LIMPEZA — um único DO, na ordem do grafo; GET DIAGNOSTICS em cada passo.
-- ─────────────────────────────────────────────────────────────────────────────
DO $limpa$
DECLARE
  v_ids    uuid[] := string_to_array(nullif(current_setting('p52.limpeza.ids', true), ''), ',')::uuid[];
  v_users  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.users', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_vagas  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.vagas', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_remov  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.remover', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_kids   uuid[];
  v_apagar uuid[];
  v_n      bigint;
  v_passos jsonb := '{}'::jsonb;
  v_x      text;
  v_tab    text;
  v_con    text;
  v_fk     record;
BEGIN
  IF v_ids IS NULL OR coalesce(current_setting('p52.limpeza.populacao_md5', true), '') = '' THEN
    RAISE EXCEPTION 'P52D LIMPA-PORTAO (pre): as GUCs do PRE nao estao definidas nesta transacao — nada a apagar sem a populacao medida';
  END IF;
  v_kids := ARRAY(SELECT k.id FROM public.candidaturas k WHERE k.candidato_id = ANY (v_ids));

  BEGIN
    -- filhos NO ACTION das candidaturas-alvo (revisao_rejeicao antes de historico_candidatura: FK historico_rejeicao_id)
    DELETE FROM public.revisao_rejeicao x WHERE x.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.revisao_rejeicao', v_n);
    DELETE FROM public.retencao_hold x WHERE x.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.retencao_hold', v_n);
    DELETE FROM public.decisao_final_historico x WHERE x.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.decisao_final_historico', v_n);
    DELETE FROM public.decisao_final x WHERE x.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.decisao_final', v_n);
    DELETE FROM public.historico_candidatura x WHERE x.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.historico_candidatura', v_n);

    -- (filhos) cada filho NO ACTION de candidaturas/historico_candidatura no catálogo tem o seu passo
    SELECT string_agg(t, ', ' ORDER BY t) INTO v_x
      FROM (SELECT DISTINCT tn.nspname || '.' || tr.relname AS t
              FROM pg_catalog.pg_constraint c
              JOIN pg_catalog.pg_class tr ON tr.oid = c.conrelid
              JOIN pg_catalog.pg_namespace tn ON tn.oid = tr.relnamespace
             WHERE c.contype = 'f' AND c.confdeltype IN ('a', 'r')
               AND c.confrelid IN ('public.candidaturas'::regclass, 'public.historico_candidatura'::regclass)) f
     WHERE NOT (v_passos ? f.t);
    IF v_x IS NOT NULL THEN
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (filhos): filho NO ACTION sem passo de DELETE: [%] — a migration nao trata o grafo que o catalogo tem; nada persiste', v_x;
    END IF;

    -- historico_acoes (CASCADE, mas IMUTÁVEL por trigger): DELETE explícito com SÓ o trigger de DELETE
    -- desligado, religado na instrução seguinte (ver o cabeçalho)
    ALTER TABLE public.historico_acoes DISABLE TRIGGER prevent_delete_historico_acoes;
    DELETE FROM public.historico_acoes h WHERE h.candidatura_id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    ALTER TABLE public.historico_acoes ENABLE TRIGGER prevent_delete_historico_acoes;
    PERFORM set_config('p52.limpeza.apagadas_ha', v_n::text, true);

    DELETE FROM public.candidaturas k WHERE k.id = ANY (v_kids);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM set_config('p52.limpeza.apagadas_k', v_n::text, true);

    DELETE FROM public.solicitacoes_dados x WHERE x.candidato_id = ANY (v_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.solicitacoes_dados', v_n);
    DELETE FROM public.candidate_ai_decisions x WHERE x.candidato_id = ANY (v_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_passos := v_passos || jsonb_build_object('public.candidate_ai_decisions', v_n);
    SELECT string_agg(t, ', ' ORDER BY t) INTO v_x
      FROM (SELECT DISTINCT tn.nspname || '.' || tr.relname AS t
              FROM pg_catalog.pg_constraint c
              JOIN pg_catalog.pg_class tr ON tr.oid = c.conrelid
              JOIN pg_catalog.pg_namespace tn ON tn.oid = tr.relnamespace
              LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
             WHERE c.contype = 'f' AND c.confrelid = 'public.candidatos'::regclass
               AND (c.confdeltype IN ('a', 'r') OR (c.confdeltype IN ('n', 'd') AND (a.attnotnull OR cardinality(c.conkey) <> 1)))) f
     WHERE NOT (v_passos ? f.t);
    IF v_x IS NOT NULL THEN
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (filhos): filho NO ACTION (ou SET NULL sobre NOT NULL) de candidatos sem passo de DELETE: [%]; nada persiste', v_x;
    END IF;

    DELETE FROM public.candidatos ca WHERE ca.id = ANY (v_ids);
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM set_config('p52.limpeza.apagadas_c', v_n::text, true);
  EXCEPTION
    WHEN foreign_key_violation THEN
      GET STACKED DIAGNOSTICS v_tab = TABLE_NAME, v_con = CONSTRAINT_NAME;
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (filhos): FK violada ao apagar (tabela %, constraint %) — um filho ficou sem passo de DELETE; nada persiste', v_tab, v_con;
  END;

  -- auth.users: só as contas da população, com DUPLA GUARDA (sem usuarios_rh E sem candidatos restante)
  v_apagar := ARRAY(SELECT u.id FROM auth.users u
                     WHERE u.id = ANY (v_users)
                       AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
                       AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id));
  -- (auth_ref) nenhuma linha restante referencia, por FK NO ACTION/RESTRICT, uma conta a apagar
  FOR v_fk IN
    SELECT tn.nspname AS esq, tr.relname AS tab, a.attname AS col
      FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_class tr ON tr.oid = c.conrelid
      JOIN pg_catalog.pg_namespace tn ON tn.oid = tr.relnamespace
      JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'f' AND c.confdeltype IN ('a', 'r') AND c.confrelid = 'auth.users'::regclass
     ORDER BY 1, 2, 3
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I = ANY ($1)', v_fk.esq, v_fk.tab, v_fk.col) INTO v_n USING v_apagar;
    IF v_n > 0 THEN
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (auth_ref): %.%.% ainda referencia % conta(s) da populacao — nada persiste', v_fk.esq, v_fk.tab, v_fk.col, v_n;
    END IF;
  END LOOP;
  DELETE FROM auth.users u
   WHERE u.id = ANY (v_apagar)
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM set_config('p52.limpeza.apagadas_auth', v_n::text, true);

  -- vagas: deleted_at nas vagas-alvo; remover só sem candidatura (nem agendamento) restante
  UPDATE public.vagas v SET deleted_at = now() WHERE v.id = ANY (v_vagas) AND v.deleted_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM set_config('p52.limpeza.vagas_deleted_at', v_n::text, true);
  v_n := 0;
  IF cardinality(v_remov) > 0 THEN
    IF EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.vaga_id = ANY (v_remov)) THEN
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (remover): vaga a remover ainda tem candidatura depois da limpeza; nada persiste';
    END IF;
    IF EXISTS (SELECT 1 FROM public.agendamentos_entrevista g WHERE g.vaga_id = ANY (v_remov)) THEN
      RAISE EXCEPTION 'P52D LIMPA-PORTAO (remover): vaga a remover ainda tem agendamento; nada persiste';
    END IF;
    DELETE FROM public.vagas v WHERE v.id = ANY (v_remov);
    GET DIAGNOSTICS v_n = ROW_COUNT;
  END IF;
  PERFORM set_config('p52.limpeza.vagas_removidas', v_n::text, true);
END
$limpa$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P52D POS-PORTAO — (residuo), (apagadas), (trava), (fixtures), (nao_alvo), (auth), (imutavel), (vagas).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_pop_ids  uuid[] := string_to_array(nullif(current_setting('p52.limpeza.ids', true), ''), ',')::uuid[];
  v_pop_usr  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.users', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_pop_vag  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.vagas', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_pop_rem  uuid[] := coalesce(string_to_array(nullif(current_setting('p52.limpeza.remover', true), ''), ',')::uuid[], '{}'::uuid[]);
  v_cats     text[] := string_to_array(nullif(current_setting('p52.limpeza.cats', true), ''), ',');
  v_cat      text;
  v_n        bigint;
  v_rot      text[] := '{}';
  v_porcat   text := '';
  v_fp       text;
BEGIN
  IF v_pop_ids IS NULL OR v_cats IS NULL OR coalesce(current_setting('p52.limpeza.apagadas_c', true), '') = '' THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (residuo): as GUCs do PRE/da limpeza nao estao definidas nesta transacao — o POS nao pode medir';
  END IF;

  -- (residuo) zero por categoria, zero candidatura da população, zero conta a apagar, zero vaga-alvo sem deleted_at
  FOREACH v_cat IN ARRAY v_cats LOOP
    SELECT count(*) INTO v_n FROM public.candidatos c
     WHERE c.id = ANY (coalesce(string_to_array(nullif(current_setting('p52.limpeza.ids_' || v_cat, true), ''), ',')::uuid[], '{}'::uuid[]));
    IF v_n <> 0 THEN v_rot := v_rot || (v_cat || ':' || v_n); END IF;
    v_porcat := v_porcat || ',' || v_cat || '=' || coalesce(current_setting('p52.limpeza.n_' || v_cat, true), '?');
  END LOOP;
  SELECT count(*) INTO v_n FROM public.candidaturas k WHERE k.candidato_id = ANY (v_pop_ids);
  IF v_n <> 0 THEN v_rot := v_rot || ('candidaturas:' || v_n); END IF;
  SELECT count(*) INTO v_n FROM auth.users u
   WHERE u.id = ANY (v_pop_usr)
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id);
  IF v_n <> 0 THEN v_rot := v_rot || ('auth:' || v_n); END IF;
  SELECT count(*) INTO v_n FROM public.vagas v WHERE v.id = ANY (v_pop_vag) AND v.deleted_at IS NULL;
  IF v_n <> 0 THEN v_rot := v_rot || ('vagas_sem_deleted_at:' || v_n); END IF;
  SELECT count(*) INTO v_n FROM public.vagas v WHERE v.id = ANY (v_pop_rem);
  IF v_n <> 0 THEN v_rot := v_rot || ('vagas_a_remover:' || v_n); END IF;
  IF cardinality(v_rot) > 0 THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (residuo): [%] continua(m) de pe depois da limpeza; nada persiste', array_to_string(v_rot, ',');
  END IF;

  -- (apagadas) o ROW_COUNT = o alvo que o PRE mediu pela varredura
  IF current_setting('p52.limpeza.apagadas_c', true) IS DISTINCT FROM current_setting('p52.limpeza.n_alvo', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (apagadas): o apagamento contou % candidato(s) e o alvo do PRE era % — a limpeza nao apagou exatamente a populacao medida; nada persiste',
      current_setting('p52.limpeza.apagadas_c', true), current_setting('p52.limpeza.n_alvo', true);
  END IF;
  IF current_setting('p52.limpeza.apagadas_k', true) IS DISTINCT FROM current_setting('p52.limpeza.k_alvo', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (apagadas): o apagamento contou % candidatura(s) e o alvo do PRE era %; nada persiste',
      current_setting('p52.limpeza.apagadas_k', true), current_setting('p52.limpeza.k_alvo', true);
  END IF;

  -- (trava) as contas de RH, as linhas de candidato/candidatura delas e a existência dos logins: iguais ao PRE
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'u:' || to_jsonb(r)::text AS x FROM public.usuarios_rh r
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
          UNION ALL SELECT 'c:' || to_jsonb(c)::text FROM public.candidatos c WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = c.user_id)) s;
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_trava', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (trava): ⛔ as linhas da trava do RH mudaram (antes %, depois %) — a limpeza alcancou conta de usuarios_rh; nada persiste',
      split_part(current_setting('p52.limpeza.fp_trava', true), ':', 1), split_part(v_fp, ':', 1);
  END IF;

  -- (fixtures) fixture-p46: iguais ao PRE
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k JOIN public.candidatos c ON c.id = k.candidato_id
                     WHERE lower(c.email) LIKE 'fixture-p46+%@invalido.local'
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE v.titulo ILIKE 'fixture-p46%') s;
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_fixtures', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (fixtures): ⛔ as fixtures fixture-p46 mudaram (antes %, depois %) — elas tem teardown proprio; nada persiste',
      split_part(current_setting('p52.limpeza.fp_fixtures', true), ':', 1), split_part(v_fp, ':', 1);
  END IF;

  -- (nao_alvo) tudo o que não era alvo: igual ao PRE
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(s.x, E'\n' ORDER BY s.x COLLATE "C"), '')) INTO v_fp
    FROM (SELECT 'c:' || to_jsonb(c)::text AS x FROM public.candidatos c WHERE NOT (c.id = ANY (v_pop_ids))
          UNION ALL SELECT 'k:' || to_jsonb(k)::text FROM public.candidaturas k WHERE NOT (k.candidato_id = ANY (v_pop_ids))
          UNION ALL SELECT 'h:' || to_jsonb(h)::text FROM public.historico_acoes h
                     WHERE NOT EXISTS (SELECT 1 FROM public.candidaturas k WHERE k.id = h.candidatura_id AND k.candidato_id = ANY (v_pop_ids))
          UNION ALL SELECT 'a:' || u.id::text FROM auth.users u WHERE NOT (u.id = ANY (v_pop_usr))
          UNION ALL SELECT 'v:' || to_jsonb(v)::text FROM public.vagas v WHERE NOT (v.id = ANY (v_pop_vag || v_pop_rem))) s;
  IF v_fp IS DISTINCT FROM current_setting('p52.limpeza.fp_nao_alvo', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (nao_alvo): ⛔ linhas fora da populacao mudaram (antes %, depois %) — a limpeza alcancou o que nao era alvo; nada persiste',
      split_part(current_setting('p52.limpeza.fp_nao_alvo', true), ':', 1), split_part(v_fp, ':', 1);
  END IF;

  -- (auth) contas de login apagadas = as da população
  IF current_setting('p52.limpeza.apagadas_auth', true) IS DISTINCT FROM current_setting('p52.limpeza.auth_alvo', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (auth): % conta(s) de login apagada(s) e a populacao tem %; nada persiste',
      current_setting('p52.limpeza.apagadas_auth', true), current_setting('p52.limpeza.auth_alvo', true);
  END IF;

  -- (imutavel) o trigger de historico_acoes religado; auditoria apagada = a das candidaturas-alvo
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
                  WHERE t.tgrelid = 'public.historico_acoes'::regclass AND t.tgname = 'prevent_delete_historico_acoes' AND t.tgenabled = 'O') THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (imutavel): o trigger prevent_delete_historico_acoes nao esta ligado depois da limpeza; nada persiste';
  END IF;
  IF current_setting('p52.limpeza.apagadas_ha', true) IS DISTINCT FROM current_setting('p52.limpeza.ha_alvo', true) THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (imutavel): % linha(s) de historico_acoes apagada(s) e o alvo do PRE era %; nada persiste',
      current_setting('p52.limpeza.apagadas_ha', true), current_setting('p52.limpeza.ha_alvo', true);
  END IF;

  -- (vagas) deleted_at = vagas-alvo; removidas = a lista de remover
  IF current_setting('p52.limpeza.vagas_deleted_at', true) IS DISTINCT FROM current_setting('p52.limpeza.vagas_alvo', true)
     OR current_setting('p52.limpeza.vagas_removidas', true) IS DISTINCT FROM cardinality(v_pop_rem)::text THEN
    RAISE EXCEPTION 'P52D POS-PORTAO (vagas): deleted_at em % (alvo %), removidas % (alvo %); nada persiste',
      current_setting('p52.limpeza.vagas_deleted_at', true), current_setting('p52.limpeza.vagas_alvo', true),
      current_setting('p52.limpeza.vagas_removidas', true), cardinality(v_pop_rem);
  END IF;

  -- evidência: só contagens e md5 (a ordem dos quatro primeiros campos é lida pelo 52-21)
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') ||
      ' limpeza:populacao_md5=' || current_setting('p52.limpeza.populacao_md5', true) ||
      ',candidatos=' || current_setting('p52.limpeza.apagadas_c', true) ||
      ',candidaturas=' || current_setting('p52.limpeza.apagadas_k', true) ||
      ',auth=' || current_setting('p52.limpeza.apagadas_auth', true) ||
      ',vagas_deleted_at=' || current_setting('p52.limpeza.vagas_deleted_at', true) ||
      ',vagas_removidas=' || current_setting('p52.limpeza.vagas_removidas', true) ||
      v_porcat ||
      ',historico_acoes=' || current_setting('p52.limpeza.apagadas_ha', true) ||
      ',vagas_md5=' || current_setting('p52.limpeza.vagas_md5', true) ||
      ',trava=igual,fixtures=igual,nao_alvo=igual'), false);
END
$pos$;
