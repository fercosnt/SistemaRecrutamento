-- =============================================================================
-- 20261003000001 — ler_resposta_caso_aberto_sjt : o RH dono da vaga lê, na Decisão Final,
--                  o texto que o candidato gravou na resposta do caso aberto da SJT
-- =============================================================================
-- Phase 49 / Plano 49-44 · JORN-41 · WR-07 do 49-REVIEW-GAPS-4 · D-21, D-48, D-52..D-58
--
-- O QUE ESTAVA ERRADO (WR-07).
--   O aviso que o CR-02 pôs na Decisão Final (`decisao-sjt-sinal-revisao`) diz «revise o texto
--   antes de considerar este resultado». O RH não tinha onde fazer isso: a `avaliar-redacao` não
--   persiste o texto que analisa; o autosave grava em `respostas_avaliacao`, que nenhuma policy
--   deixa o RH ler (só `cand_le_respostas_aval` e `cand_escreve_respostas_aval`, do titular).
--   A marca estava cumprida; a revisão, não.
--
--   Decisão do operador (2026-10-01). Opção apresentada, texto literal: «(b) Dar ao RH acesso ao
--   texto da resposta. É maior e mexe em permissão de dados (RLS). Viraria um plano novo, e
--   publico com o aviso atual.» Resposta, verbatim: «B».
--
-- MEDIDO EM PROD (2026-10-03, só leitura, `set transaction read only`):
--   · policies vivas de `respostas_avaliacao`: exatamente `cand_escreve_respostas_aval`
--     (PERMISSIVE, ALL, {public}) e `cand_le_respostas_aval` (PERMISSIVE, SELECT, {public});
--   · `relforcerowsecurity` = false; dono da tabela = postgres;
--   · `anonimizar_candidato(uuid,boolean)`: `prosecdef` = true, dono = postgres;
--   · triggers da tabela: só os dois internos de FK (nenhum de `updated_at`);
--   · a RPC desta migration não existe; o ledger não tem esta versão.
--
-- POR QUE RPC E NÃO COLUNA NEM POLICY (escolhas do PLANEJADOR, vetáveis pelo operador no 49-45).
--   (1) Uma coluna em `scores_candidato` copiaria o texto para um segundo lugar que o motor de
--       exclusão, o recibo e as allowlists teriam de passar a cobrir. Uma policy de SELECT do RH
--       em `respostas_avaliacao` abriria TODOS os `teste` da tabela (respostas cruas de outros
--       instrumentos, contra a minimização do D-31). A RPC projeta só o texto do caso aberto, e a
--       única cópia continua sendo a que o motor já redige (20260923000001, passo 8/13).
--   (2) O predicado de posse é o WR-04, COPIADO e não inventado: o mesmo de `rh_le_scores`
--       (20260625000001), que protege a nota que este texto explica — administrador, ou `rh` dono
--       da vaga (`vagas.created_by = auth.uid()`). Sem filtro de `deleted_at`, como o WR-04.
--   (3) Só depois do envio: o texto sai só quando existe a linha `scores_candidato`
--       `sjt`/`caso_aberto`; o rascunho de um caso aberto não enviado nunca sai.
--
-- ESTADOS (sem causa inventada): `disponivel` (texto inteiro, sem aparar); `sem_resposta_enviada`
--   (sem a linha de score; `texto` nulo mesmo havendo rascunho); `indisponivel` (enviado, e sem
--   texto gravado — a função não alega por quê); `removida_pelo_titular` (o marcador `redigido`
--   que o motor de exclusão grava prova a causa). Sempre as duas chaves, `situacao` e `texto`.
--
-- ERRO: `insufficient_privilege` (42501) na guarda de papel e na de posse — para `rh`,
--   candidatura inexistente e candidatura alheia dão o MESMO 42501 (o RH de outra vaga não
--   distingue inexistente de alheio); `no_data_found` (P0002) só para administrador com
--   candidatura inexistente.
--
-- AUTHZ: `SECURITY DEFINER` / `SET search_path = ''`. Guarda fail-closed ANTES de qualquer
--   leitura: `auth.uid()` nulo recusa, e `coalesce(v_role, '')` faz o papel ausente recusar
--   (a comparação direta sobre um papel nulo devolve NULL e o IF não dispara). ACL:
--   `REVOKE ALL … FROM PUBLIC`, `REVOKE ALL … FROM anon` com `anon` NOMEADO (o `pg_default_acl`
--   concede EXECUTE a `anon` como grant direto), `GRANT EXECUTE … TO authenticated, service_role`.
--
-- IDEMPOTÊNCIA: `CREATE OR REPLACE`; o pré-portão exige que a função NÃO exista, então reaplicar
--   por cima de si mesma aborta em vez de sobrescrever em silêncio.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda a requisição inteira
-- numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — a RPC não existe; as policies vivas são as duas do titular; sem FORCE RLS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  v_pols  text;
  v_force boolean;
BEGIN
  IF to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: public.ler_resposta_caso_aberto_sjt(uuid) JA existe — esta migration a cria; reaplicar por cima sobrescreveria um corpo que ninguem mediu.';
  END IF;

  SELECT string_agg(p.policyname || ':' || p.permissive, ',' ORDER BY p.policyname) INTO v_pols
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao';
  IF v_pols IS DISTINCT FROM 'cand_escreve_respostas_aval:PERMISSIVE,cand_le_respostas_aval:PERMISSIVE' THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: as policies vivas de respostas_avaliacao sao «%», e o medido em 2026-10-03 era so as duas do titular. Uma policy a mais pode ja abrir leitura ao RH — medir de novo e decidir A MAO.', v_pols;
  END IF;

  SELECT c.relforcerowsecurity INTO v_force
    FROM pg_catalog.pg_class c WHERE c.oid = 'public.respostas_avaliacao'::regclass;
  IF v_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: respostas_avaliacao tem FORCE ROW LEVEL SECURITY = % — o desenho desta migration supoe que o dono da tabela (o motor de exclusao) nao e alcancado por RLS.', v_force;
  END IF;

  RAISE NOTICE 'P49-44 PRE-PORTAO OK — RPC ausente ; policies = % ; force_rls = %', v_pols, v_force;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- public.ler_resposta_caso_aberto_sjt(uuid) — a leitura do RH, predicado WR-04.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ler_resposta_caso_aberto_sjt(p_candidatura_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $ler$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_dono  uuid;
  v_achou boolean;
  v_resp  jsonb;
BEGIN
  -- (i) Guarda de papel ANTES de qualquer leitura (não revela existência a quem não é RH).
  --     Fail-closed: sem `sub` recusa; sem papel recusa.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (ii) Posse da vaga — o predicado WR-04 de `rh_le_scores`. Para `rh`, inexistente e alheia
  --      dão o MESMO 42501. Sem filtro de `deleted_at`, como o WR-04.
  SELECT v.created_by INTO v_dono
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  v_achou := FOUND;

  IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT v_achou THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  -- (iii) Só depois do envio: sem a linha de score do caso aberto, o rascunho NUNCA sai.
  IF NOT EXISTS (
    SELECT 1 FROM public.scores_candidato sc
     WHERE sc.candidatura_id = p_candidatura_id
       AND sc.tipo = 'sjt'
       AND sc.subtipo = 'caso_aberto'
  ) THEN
    RETURN jsonb_build_object('situacao', 'sem_resposta_enviada', 'texto', NULL);
  END IF;

  -- (iv) O texto gravado. Só `removida_pelo_titular` nomeia causa (o marcador do motor a prova).
  SELECT ra.respostas INTO v_resp
    FROM public.respostas_avaliacao ra
   WHERE ra.candidatura_id = p_candidatura_id
     AND ra.teste = 'sjt_caso_aberto';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object' AND v_resp ? 'redigido' THEN
    RETURN jsonb_build_object('situacao', 'removida_pelo_titular', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object'
     AND jsonb_typeof(v_resp -> 'texto') = 'string'
     AND btrim(v_resp ->> 'texto') <> '' THEN
    RETURN jsonb_build_object('situacao', 'disponivel', 'texto', v_resp ->> 'texto');
  END IF;
  RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
END
$ler$;

REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) IS
  'P49-44 / WR-07: devolve ao RH o texto que o candidato gravou na resposta do caso aberto da SJT, para revisar o sinal da Decisao Final. Predicado WR-04 (o de rh_le_scores): administrador, ou rh dono da vaga (vagas.created_by = auth.uid()); guarda fail-closed. So depois do envio (linha scores_candidato sjt/caso_aberto) — nunca o rascunho. Retorno {situacao, texto}: disponivel | sem_resposta_enviada | indisponivel | removida_pelo_titular.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig constant text := 'public.ler_resposta_caso_aberto_sjt(uuid)';
  v_secdef boolean;
  v_conf   text[];
  v_md5    text;
  v_anon   boolean;
  v_auth   boolean;
BEGIN
  SELECT p.prosecdef, p.proconfig, md5(p.prosrc) INTO v_secdef, v_conf, v_md5
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig::regprocedure;
  IF v_secdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % nao e SECURITY DEFINER — sem ela a leitura cairia na RLS do titular e o RH leria zero', c_sig;
  END IF;
  IF v_conf IS NULL OR NOT ('search_path=""' = ANY (v_conf)) THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % sem search_path vazio (proconfig = %)', c_sig, v_conf;
  END IF;
  v_anon := has_function_privilege('anon',          c_sig::regprocedure, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', c_sig::regprocedure, 'EXECUTE');
  IF v_anon THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: anon tem EXECUTE em % — o grant do pg_default_acl e DIRETO; o REVOKE nominal falhou', c_sig;
  END IF;
  IF NOT v_auth THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: authenticated sem EXECUTE em % — o RH nao conseguiria ler pela tela', c_sig;
  END IF;
  RAISE NOTICE 'P49-44 POS-PORTAO OK — md5(prosrc) ler_resposta_caso_aberto_sjt = % ; anon=% authenticated=%', v_md5, v_anon, v_auth;
END
$pos_portao$;
