-- =============================================================================
-- ⛔⛔ DESTRUTIVA E IRREVERSIVEL ⛔⛔
-- Phase 51 / Plano 51-21 — G1a, parte DESTRUTIVA (decisao do operador de 2026-10-10)
-- Apaga as linhas de `public.disponibilidade` que SOBRARAM dos titulares JA anonimizados.
-- =============================================================================
--
-- ⛔ Sem PITR: uma linha apagada aqui nao volta. O apply e do 51-23, depois do checkpoint
--    do operador com a populacao medida de novo — nunca antes, e nunca por ensaio que commita.
--
-- ⚠⚠ ESCOPO NEGATIVO, EM UMA LINHA: **so DML em `public.disponibilidade` — um unico
-- apagamento, escopado aos titulares que o reconhecedor do PROPRIO motor da por anonimizados.**
-- Zero DDL, zero funcao, zero policy, zero view, zero grant, zero linha escrita ou apagada em
-- qualquer outra tabela, e nenhuma constante de populacao neste arquivo (uma contagem fixa
-- seria uma FOTOGRAFIA — CLAUDE.md §Portoes). O vinculo com a populacao que o operador aprovou
-- e feito no COMANDO do apply (51-23), pelo md5 do alvo, nao aqui.
--
-- -----------------------------------------------------------------------------
-- (1) O QUE SOBROU E POR QUE
-- -----------------------------------------------------------------------------
-- WINDOWS 89 / T-51-14: o recibo de exclusao promete que a disponibilidade do titular
-- «vai ser / foi apagada». O motor antigo (`anonimizar_candidato`, corpo da `20261008000004`)
-- nao tocava a tabela, entao os titulares anonimizados por ele ficaram com as linhas de pe
-- (2 titulares / 2 linhas, medido em 2026-10-10, so leitura).
--   · O motor NOVO (`20261010000001`, 51-20) apaga a disponibilidade no passo
--     `tombstone_candidato` — mas so de quem ele anonimiza DAQUI PARA FRENTE. Para quem ja
--     e tombstone ele devolve `ja_anonimizado` sem tocar nada (idempotencia por estado), entao
--     NUNCA volta a esses titulares.
--   · A FK `disponibilidade.candidato_id -> candidatos(id) ON DELETE CASCADE` tambem nao
--     ajuda: o tombstone e um UPDATE, a linha de `candidatos` FICA, e cascata so acontece
--     quando a linha referenciada deixa de existir.
--   Sem este passo, o recibo continuaria falso para esses titulares.
--
-- -----------------------------------------------------------------------------
-- (2) A DECISAO
-- -----------------------------------------------------------------------------
-- G1a do `51-GAPS-DECISAO.md` (operador, 2026-10-10): «o motor apaga», e um passo
-- DESTRUTIVO com portao limpa o que ja sobrou. A parte aditiva (51-20 / 51-22) e esta parte
-- destrutiva (51-21 / 51-23) sao passos SEPARADOS para que cada um tenha a sua prova.
--
-- -----------------------------------------------------------------------------
-- (3) O RECONHECEDOR — o do motor, por IGUALDADE (CR-06)
-- -----------------------------------------------------------------------------
-- O titular anonimizado e reconhecido pelo MESMO predicado do motor (`20261008000004`, o
-- teste de `ja_anonimizado` e a chave `v_anon`) e do `p46_purga_smoke.sql`: o e-mail IGUAL a
-- sentinela derivada do id DESTA linha de `candidatos`, `user_id` nulo E `data_nascimento`
-- na sentinela de 1900. Nunca um padrao (prefixo, LIKE, regex) sobre o e-mail — ele e escrito
-- pela pessoa no cadastro, e um casamento por prefixo pegaria quem se cadastrasse naquele
-- namespace, com a PII intacta. Nunca a sentinela textual do nome. O literal da sentinela de
-- e-mail aparece SO nos predicados abaixo.
--
-- -----------------------------------------------------------------------------
-- (4) ERRO / IDEMPOTENCIA / LOCK / CONCORRENCIA / TRANSPORTE
-- -----------------------------------------------------------------------------
-- ERRO: o `P51-G1L PRE-PORTAO` recusa, sem mudar nada, quando
--   (motor)     o `anonimizar_candidato` em vigor NAO apaga a disponibilidade do titular
--               (a `20261010000001` nao foi aplicada). Limpar antes do motor novo faria
--               toda exclusao futura produzir resíduo de novo — aplicar a 0001 primeiro;
--   (populacao) nenhum titular e reconhecido — populacao vazia nao prova nada;
--   (alvo)      nenhuma linha a apagar — alguem ja limpou: reler antes.
-- E o `P51-G1L POS-PORTAO` recusa (e a transacao inteira volta) quando, NESTA ordem,
--   (restantes) sobrou linha de titular reconhecido;
--   (outros)    as linhas que NAO eram alvo mudaram de contagem ou de impressao digital
--               (md5 do conjunto ordenado de `to_jsonb(linha)`, baseline capturada pelo PRE
--               NESTA execucao — nunca constante);
--   (apagadas)  o ROW_COUNT do apagamento difere das linhas-alvo medidas pelo PRE.
-- IDEMPOTENCIA: reaplicar nao e possivel — o ledger recusa a versao repetida, e o PRE `(alvo)`
--   recusa com zero linhas.
-- LOCK: um DELETE com USING: RowExclusiveLock em `disponibilidade` e lock de linha SO nas
--   linhas-alvo; `candidatos` so e lida. `disponibilidade` nao tem trigger de DELETE, nem
--   regra, nem FK apontando para ela (medido em 2026-10-10). `lock_timeout` e
--   `statement_timeout` sao as duas primeiras instrucoes.
-- CONCORRENCIA (escolha (3) do planejador): em PROD o apply roda em READ COMMITTED. Se uma
--   linha de OUTRO candidato mudar entre o PRE e o POS, o POS recusa `(outros)` e NADA
--   persiste: e fail-closed, e o apply se repete mais tarde pela mesma via. Nao ha
--   `SET TRANSACTION ISOLATION LEVEL` aqui (escolha (4)): a primeira instrucao de uma
--   migration aplicada pelo `p46apply` nao e garantidamente a primeira da transacao, e o
--   ensaio ja roda em REPEATABLE READ.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Migrations): `DO` adjacentes sao a forma exata
-- do 42601, e o endpoint ja roda o corpo inteiro numa unica transacao.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261010000002_p51_limpa_disponibilidade_anonimizados.sql
-- SÓ no 51-23, depois do checkpoint do operador com a população medida, e com a população
-- conferida no MESMO comando (o md5 do alvo, pela expressao canonica
-- `md5(coalesce(string_agg(x, ',' ORDER BY x), ''))` sobre os `candidato_id::text` distintos
-- das linhas-alvo, a mesma que o PRE guarda e o POS devolve em `g1l:...,alvo=<md5>`).
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-G1L PRE-PORTAO — o motor em vigor ja apaga, ha populacao, ha alvo. Guarda em GUCs
-- LOCAIS as contagens, o md5 do alvo e a impressao digital do que NAO e alvo.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_oid       oid;
  v_src       text;
  v_cod       text;
  v_tit       bigint;
  v_com_disp  bigint;
  v_linhas    bigint;
  v_alvo      text;
  v_out_n     bigint;
  v_out_fp    text;
  -- a forma do apagamento no motor (POSIX, nunca a forma literal): DELETE em
  -- public.disponibilidade, com alias opcional, escopado por candidato_id = p_candidato_id
  v_re_motor  constant text :=
    'DELETE[[:space:]]+FROM[[:space:]]+public[.]disponibilidade([[:space:]]+(AS[[:space:]]+)?[a-z_]+)?[[:space:]]+WHERE[[:space:]]+([a-z_]+[.])?candidato_id[[:space:]]*=[[:space:]]*p_candidato_id';
BEGIN
  -- (motor) o corpo EM VIGOR nesta transacao, lido sem comentarios
  v_oid := pg_catalog.to_regprocedure('public.anonimizar_candidato(uuid,boolean)');
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P51-G1L PRE-PORTAO (motor): public.anonimizar_candidato(uuid,boolean) nao existe; nada mudou';
  END IF;
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p WHERE p.oid = v_oid;
  v_cod := regexp_replace(regexp_replace(v_src, '/\*.*?\*/', '', 'g'), '--[^' || chr(10) || ']*', '', 'g');
  IF length(v_cod) >= length(v_src) THEN
    RAISE EXCEPTION 'P51-G1L PRE-PORTAO (motor): a remocao de comentarios do motor nao removeu nada — um portao que nao consegue medir nao pode responder ok; nada mudou';
  END IF;
  IF v_cod !~* v_re_motor THEN
    RAISE EXCEPTION 'P51-G1L PRE-PORTAO (motor): o anonimizar_candidato em vigor NAO apaga a disponibilidade do titular — aplicar a 20261010000001 primeiro (limpar antes do motor novo faria toda exclusao futura deixar residuo de novo); nada mudou';
  END IF;

  -- (populacao) titulares reconhecidos pelo predicado do motor, por IGUALDADE
  SELECT count(*) INTO v_tit
    FROM public.candidatos a
   WHERE a.email = ('anonimizado+' || a.id::text || '@invalido.local')
     AND a.user_id IS NULL
     AND a.data_nascimento = DATE '1900-01-01';
  IF v_tit < 1 THEN
    RAISE EXCEPTION 'P51-G1L PRE-PORTAO (populacao): nenhum titular anonimizado reconhecido — populacao vazia nao prova nada; medir de novo; nada mudou';
  END IF;

  -- (alvo) as linhas de disponibilidade desses titulares
  SELECT count(*), count(DISTINCT t.candidato_id) INTO v_linhas, v_com_disp
    FROM public.disponibilidade t
   WHERE EXISTS (SELECT 1 FROM public.candidatos a
                  WHERE a.id = t.candidato_id
                    AND a.email = ('anonimizado+' || a.id::text || '@invalido.local')
                    AND a.user_id IS NULL
                    AND a.data_nascimento = DATE '1900-01-01');
  IF v_linhas < 1 THEN
    RAISE EXCEPTION 'P51-G1L PRE-PORTAO (alvo): % titular(es) reconhecido(s) e nenhuma linha de disponibilidade deles — alguem ja limpou; reler antes de aplicar; nada mudou', v_tit;
  END IF;

  -- md5 do alvo, pela expressao CANONICA (a mesma que o 51-23 usa para medir e vincular o apply)
  SELECT md5(coalesce(string_agg(x, ',' ORDER BY x), '')) INTO v_alvo
    FROM (SELECT DISTINCT d.candidato_id::text AS x
            FROM public.disponibilidade d
           WHERE EXISTS (SELECT 1 FROM public.candidatos a
                          WHERE a.id = d.candidato_id
                            AND a.email = ('anonimizado+' || a.id::text || '@invalido.local')
                            AND a.user_id IS NULL
                            AND a.data_nascimento = DATE '1900-01-01')) s;

  -- baseline do que NAO e alvo: contagem e impressao digital da linha INTEIRA
  SELECT count(*), md5(coalesce(string_agg(to_jsonb(o)::text, E'\n' ORDER BY to_jsonb(o)::text), ''))
    INTO v_out_n, v_out_fp
    FROM public.disponibilidade o
   WHERE NOT EXISTS (SELECT 1 FROM public.candidatos a
                      WHERE a.id = o.candidato_id
                        AND a.email = ('anonimizado+' || a.id::text || '@invalido.local')
                        AND a.user_id IS NULL
                        AND a.data_nascimento = DATE '1900-01-01');

  PERFORM set_config('p51.g1l.titulares', v_tit::text,      true);
  PERFORM set_config('p51.g1l.com_disp',  v_com_disp::text, true);
  PERFORM set_config('p51.g1l.linhas',    v_linhas::text,   true);
  PERFORM set_config('p51.g1l.alvo',      v_alvo,           true);
  PERFORM set_config('p51.g1l.outros_n',  v_out_n::text,    true);
  PERFORM set_config('p51.g1l.outros_fp', v_out_fp,         true);
END
$pre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A LIMPEZA — o unico apagamento deste arquivo, com o reconhecedor do motor.
-- ─────────────────────────────────────────────────────────────────────────────
DO $limpa$
DECLARE
  v_apagadas bigint;
BEGIN
  DELETE FROM public.disponibilidade d
   USING public.candidatos c
   WHERE d.candidato_id = c.id
     AND c.email = ('anonimizado+' || c.id::text || '@invalido.local')
     AND c.user_id IS NULL
     AND c.data_nascimento = DATE '1900-01-01';
  GET DIAGNOSTICS v_apagadas = ROW_COUNT;
  PERFORM set_config('p51.g1l.apagadas', v_apagadas::text, true);
END
$limpa$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-G1L POS-PORTAO — nesta ordem: (restantes), (outros), (apagadas).
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_rest     bigint;
  v_out_n    bigint;
  v_out_fp   text;
  v_apagadas bigint := nullif(current_setting('p51.g1l.apagadas', true), '')::bigint;
  v_linhas   bigint := nullif(current_setting('p51.g1l.linhas', true), '')::bigint;
BEGIN
  IF v_apagadas IS NULL OR v_linhas IS NULL THEN
    RAISE EXCEPTION 'P51-G1L POS-PORTAO (apagadas): as GUCs do PRE/da limpeza nao estao definidas nesta transacao — o POS nao pode medir';
  END IF;

  -- (restantes) zero linha de disponibilidade de titular reconhecido
  SELECT count(*) INTO v_rest
    FROM public.disponibilidade r
   WHERE EXISTS (SELECT 1 FROM public.candidatos a
                  WHERE a.id = r.candidato_id
                    AND a.email = ('anonimizado+' || a.id::text || '@invalido.local')
                    AND a.user_id IS NULL
                    AND a.data_nascimento = DATE '1900-01-01');
  IF v_rest <> 0 THEN
    RAISE EXCEPTION 'P51-G1L POS-PORTAO (restantes): % linha(s) de disponibilidade de titular anonimizado continuam de pe depois da limpeza (alvo do PRE: % linha(s)); nada persiste', v_rest, v_linhas;
  END IF;

  -- (outros) o que nao era alvo: mesma contagem e mesma impressao digital que o PRE capturou
  SELECT count(*), md5(coalesce(string_agg(to_jsonb(o)::text, E'\n' ORDER BY to_jsonb(o)::text), ''))
    INTO v_out_n, v_out_fp
    FROM public.disponibilidade o
   WHERE NOT EXISTS (SELECT 1 FROM public.candidatos a
                      WHERE a.id = o.candidato_id
                        AND a.email = ('anonimizado+' || a.id::text || '@invalido.local')
                        AND a.user_id IS NULL
                        AND a.data_nascimento = DATE '1900-01-01');
  IF v_out_n::text IS DISTINCT FROM current_setting('p51.g1l.outros_n', true)
     OR v_out_fp IS DISTINCT FROM current_setting('p51.g1l.outros_fp', true) THEN
    RAISE EXCEPTION 'P51-G1L POS-PORTAO (outros): ⛔ as linhas de disponibilidade que NAO eram alvo mudaram (antes % linha(s), depois %; impressao digital %) — a limpeza alcancou candidato que nao e titular anonimizado; nada persiste',
      current_setting('p51.g1l.outros_n', true), v_out_n,
      CASE WHEN v_out_fp IS DISTINCT FROM current_setting('p51.g1l.outros_fp', true) THEN 'diferente' ELSE 'igual' END;
  END IF;

  -- (apagadas) o ROW_COUNT do apagamento = as linhas-alvo do PRE
  IF v_apagadas IS DISTINCT FROM v_linhas THEN
    RAISE EXCEPTION 'P51-G1L POS-PORTAO (apagadas): o apagamento contou % linha(s) e o alvo do PRE era % — a limpeza nao apagou exatamente o alvo; nada persiste', v_apagadas, v_linhas;
  END IF;

  -- evidencia: so contagens e md5 — nenhum id, nome ou e-mail
  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') ||
      ' g1l:titulares=' || current_setting('p51.g1l.titulares', true) ||
      ',com_disp=' || current_setting('p51.g1l.com_disp', true) ||
      ',linhas=' || v_linhas::text ||
      ',apagadas=' || v_apagadas::text ||
      ',restantes=' || v_rest::text ||
      ',outros=igual' ||
      ',alvo=' || current_setting('p51.g1l.alvo', true)), false);
  RAISE NOTICE 'P51-G1L POS-PORTAO ok — % titular(es) anonimizado(s), % com linha; % linha(s) apagada(s) = alvo; 0 restante; % linha(s) fora do alvo identicas as de antes',
    current_setting('p51.g1l.titulares', true), current_setting('p51.g1l.com_disp', true), v_apagadas, v_out_n;
END
$pos$;
