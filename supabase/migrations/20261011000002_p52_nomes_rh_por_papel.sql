-- =============================================================================
-- Migration 20261011000002 — nomes POR PAPEL no cadastro de RH (as duas contas de teste)
-- Phase 52 / Plano 52-08 · JORN-62 · D-39 com a EMENDA do operador (2026-10-10)
-- =============================================================================
--
-- ESCRITA DE DADO CONTROLADA, CORRETIVA E REVERSÍVEL: o valor anterior de cada linha está
-- escrito no PRE-PORTAO abaixo (literal), e desfazer é o UPDATE inverso com os mesmos portões.
--
-- ORIGEM. UAT do 51-17: o cadastro de RH tinha os nomes TROCADOS em relação aos apelidos de conta
-- que o operador usa — o ADMINISTRADOR (`66412f96…`) se chamava «RH2» e o RECRUTADOR
-- (`af4ebf97…`) «RH3» (achado «nomes trocados no cadastro»,
-- `.planning/DECISAO-2026-10-10-hub-rh-dados-e-contato.md`; 52-RESEARCH §RH2/RH3). A D-39 mandava
-- inverter os dois; a EMENDA do operador de 2026-10-10 substitui a troca por NOMES POR PAPEL, que
-- eliminam o descasamento entre nome e apelido em vez de só invertê-lo:
--     recrutador `af4ebf97-793c-42bb-a090-7ff19b401d06`  «RH3»  →  «Recrutador (teste)»
--     admin      `66412f96-1ee9-4621-853e-a79cd7f1b235`  «RH2»  →  «Admin (teste)»
-- Os literais novos estão escritos aqui; nenhum vem da outra linha.
--
-- MEDIDO EM PROD (só leitura, 2026-10-11, 52-08 Task 3): exatamente uma linha por `user_id`,
--   `af4ebf97…` papel `recrutador`, ativo, nome «RH3»; `66412f96…` papel `administrador`, ativo,
--   nome «RH2». Triggers de `usuarios_rh` em UPDATE: `update_usuarios_rh_updated_at` (carimba
--   `updated_at` — por isso essa coluna das duas linhas fica FORA da comparação delas) e
--   `trg_usuarios_rh_anti_lockout` (só age sobre rebaixar/desativar/excluir administrador ativo;
--   aqui o papel e o `ativo` não mudam). Nada em `src/`, `supabase/tests/` ou
--   `supabase/functions/` fixa os nomes antigos — as ocorrências de «RH2» no repositório são
--   apelido de conta ou nome de variável (`scripts/p51_aceite.cjs`, `scripts/p50_sessao_real.cjs`,
--   comentários), não `nome_completo`. Nenhum outro arquivo muda.
--
-- O QUE NÃO FAZ. Não toca nenhuma outra coluna das duas linhas (papel, `ativo`, e-mail…), nem
--   nenhuma outra linha de `usuarios_rh`, nem `auth.users`; nada de DDL.
--
-- PRE-PORTAO (P52N): exatamente 1 linha por `user_id`, papel esperado e `nome_completo` IGUAL ao
--   medido (literal) — senão RECUSA e nada muda (o estado mudou desde a medição; a decisão foi
--   tomada sobre o estado medido). Guarda em GUCs LOCAIS a impressão digital (`md5` de `to_jsonb`
--   da linha INTEIRA — não envelhece quando nasce coluna nova) das DEMAIS linhas e a das duas
--   linhas SEM `nome_completo` e `updated_at`.
-- ESCRITA: dois UPDATE por `user_id`, cada um com `GET DIAGNOSTICS` = 1.
-- POS-PORTAO (P52N): relê os dois literais EXATOS; as demais linhas com a mesma impressão
--   digital; as duas linhas iguais fora de `nome_completo`/`updated_at`. Anexa
--   `nomes:recrutador_por_papel=true,admin_por_papel=true` a `p52.evidencia` (sem nome, sem e-mail).
--
-- LOCK. Lock de LINHA nas duas linhas de `usuarios_rh` (UPDATE por chave única). `lock_timeout`
--   e `statement_timeout` são as DUAS primeiras instruções; `55P03`/`57014` = fila — repetir
--   depois, nunca subir o teto.
--
-- NÃO APLICADA NO 52-08: vai ao ar no MESMO portão das leituras (review bloqueante 52-14 →
-- apply 52-15). Todo uso em PROD neste plano é ensaio que aborta.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira numa única
-- transação (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52N PRE-PORTAO — o estado é o medido; guarda as impressões digitais.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  r      record;
  v_n    bigint;
  v_role text;
  v_nome text;
  v_out  text;
  v_dois text;
BEGIN
  -- ESCOPO DELIBERADO deste arquivo (CLAUDE.md §Portões): as duas linhas, o papel e o nome MEDIDOS.
  FOR r IN
    SELECT * FROM (VALUES
      ('af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid, 'recrutador',    'RH3'),
      ('66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid, 'administrador', 'RH2')
    ) AS e(uid, papel, nome_antes)
  LOOP
    SELECT count(*), max(u.role::text), max(u.nome_completo::text) INTO v_n, v_role, v_nome
      FROM public.usuarios_rh u
     WHERE u.user_id = r.uid;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'P52N PRE-PORTAO (linhas): % linha(s) em usuarios_rh para o user_id % (esperado 1) — o estado mudou desde a medicao; nada mudou', v_n, r.uid;
    END IF;
    IF v_role IS DISTINCT FROM r.papel THEN
      RAISE EXCEPTION 'P52N PRE-PORTAO (papel): user_id % tem papel % (medido %) — o estado mudou desde a medicao; nada mudou', r.uid, v_role, r.papel;
    END IF;
    IF v_nome IS DISTINCT FROM r.nome_antes THEN
      RAISE EXCEPTION 'P52N PRE-PORTAO (nome): o nome atual do % (%) nao e o medido — o estado mudou desde a medicao (a D-39 emendada foi decidida sobre o estado medido); nada mudou', r.papel, r.uid;
    END IF;
  END LOOP;

  -- impressão digital das DEMAIS linhas (linha inteira) e das duas linhas sem nome/updated_at.
  SELECT count(*)::text || ':' || md5(coalesce(string_agg(to_jsonb(u)::text, E'\n' ORDER BY to_jsonb(u)::text), ''))
    INTO v_out
    FROM public.usuarios_rh u
   WHERE u.user_id IS DISTINCT FROM 'af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid
     AND u.user_id IS DISTINCT FROM '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid;
  SELECT md5(string_agg((to_jsonb(u) - 'nome_completo' - 'updated_at')::text, E'\n' ORDER BY u.user_id))
    INTO v_dois
    FROM public.usuarios_rh u
   WHERE u.user_id IN ('af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid, '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid);

  PERFORM set_config('p52.p02.outros', v_out, true);
  PERFORM set_config('p52.p02.dois', v_dois, true);
END
$pre$;

-- ─────────────────────────────────────────────────────────────────────────────
-- A ESCRITA — dois UPDATE por user_id, cada um exatamente 1 linha.
-- ─────────────────────────────────────────────────────────────────────────────
DO $nomes$
DECLARE
  v_rc int;
BEGIN
  UPDATE public.usuarios_rh SET nome_completo = 'Recrutador (teste)'
   WHERE user_id = 'af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  IF v_rc <> 1 THEN
    RAISE EXCEPTION 'P52N ESCRITA (recrutador): o UPDATE atingiu % linha(s) (esperado 1); nada persiste', v_rc;
  END IF;

  UPDATE public.usuarios_rh SET nome_completo = 'Admin (teste)'
   WHERE user_id = '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid;
  GET DIAGNOSTICS v_rc = ROW_COUNT;
  IF v_rc <> 1 THEN
    RAISE EXCEPTION 'P52N ESCRITA (admin): o UPDATE atingiu % linha(s) (esperado 1); nada persiste', v_rc;
  END IF;
END
$nomes$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P52N POS-PORTAO — os dois literais exatos; nada mais mudou.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  v_rec  text;
  v_adm  text;
  v_out  text;
  v_dois text;
BEGIN
  IF nullif(current_setting('p52.p02.outros', true), '') IS NULL OR nullif(current_setting('p52.p02.dois', true), '') IS NULL THEN
    RAISE EXCEPTION 'P52N POS-PORTAO: as GUCs do PRE nao estao definidas nesta transacao — o POS nao pode medir';
  END IF;

  SELECT u.nome_completo::text INTO v_rec FROM public.usuarios_rh u
   WHERE u.user_id = 'af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid AND u.role = 'recrutador';
  SELECT u.nome_completo::text INTO v_adm FROM public.usuarios_rh u
   WHERE u.user_id = '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid AND u.role = 'administrador';
  IF v_rec IS DISTINCT FROM 'Recrutador (teste)' THEN
    RAISE EXCEPTION 'P52N POS-PORTAO (recrutador): o nome relido nao e «Recrutador (teste)»; nada persiste';
  END IF;
  IF v_adm IS DISTINCT FROM 'Admin (teste)' THEN
    RAISE EXCEPTION 'P52N POS-PORTAO (admin): o nome relido nao e «Admin (teste)»; nada persiste';
  END IF;

  SELECT count(*)::text || ':' || md5(coalesce(string_agg(to_jsonb(u)::text, E'\n' ORDER BY to_jsonb(u)::text), ''))
    INTO v_out
    FROM public.usuarios_rh u
   WHERE u.user_id IS DISTINCT FROM 'af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid
     AND u.user_id IS DISTINCT FROM '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid;
  IF v_out IS DISTINCT FROM current_setting('p52.p02.outros', true) THEN
    RAISE EXCEPTION 'P52N POS-PORTAO (outros): ⛔ as demais linhas de usuarios_rh mudaram (contagem antes %, depois %; impressao digital %) — a escrita alcancou linha fora do escopo; nada persiste',
      split_part(current_setting('p52.p02.outros', true), ':', 1), split_part(v_out, ':', 1),
      CASE WHEN split_part(v_out, ':', 2) IS DISTINCT FROM split_part(current_setting('p52.p02.outros', true), ':', 2) THEN 'diferente' ELSE 'igual' END;
  END IF;
  SELECT md5(string_agg((to_jsonb(u) - 'nome_completo' - 'updated_at')::text, E'\n' ORDER BY u.user_id))
    INTO v_dois
    FROM public.usuarios_rh u
   WHERE u.user_id IN ('af4ebf97-793c-42bb-a090-7ff19b401d06'::uuid, '66412f96-1ee9-4621-853e-a79cd7f1b235'::uuid);
  IF v_dois IS DISTINCT FROM current_setting('p52.p02.dois', true) THEN
    RAISE EXCEPTION 'P52N POS-PORTAO (colunas): ⛔ uma coluna das duas linhas alem de nome_completo/updated_at mudou; nada persiste';
  END IF;

  -- evidência: só booleanos — nenhum nome, id ou e-mail.
  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' nomes:recrutador_por_papel=true,admin_por_papel=true'), false);
END
$pos$;
