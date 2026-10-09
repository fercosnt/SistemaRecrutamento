-- =============================================================================
-- Migration 20261008000005 — o D-23 da Phase 48 ESTENDIDO a `rejeitar_candidatura`
-- Phase 51 / Plano 51-16 (rodada de conserto do 51-REVIEW-PORTAO-1) · JORN-42 · WR-09
-- =============================================================================
--
-- O QUE ESTAVA ERRADO (WR-09 do 51-REVIEW-PORTAO-1). No ciclo de `decisao_final`, o D-23 da Phase 48
-- (JORN-19) trava o decisor revertido: depois que uma revisão reverte a rejeição de A,
-- `registrar_decisao` recusa A (qualquer `p_decisao`, 42501, «no mesmo espírito do revisor ≠
-- decisor»; corpo vivo: 20261005000004, bloco «(2b) D-23»). O caminho novo do JORN-42 (registro
-- próprio do pedido, `revisao_rejeicao`, migration 20261008000002) não tinha trava equivalente:
-- A rejeita na triagem → o titular pede → B reverte → a candidatura volta para `triagem` → A chama
-- `rejeitar_candidatura` de novo, minutos depois, e nada recusa. A revertida do Art. 20 ficava oca.
--
-- DECISÃO DO OPERADOR (2026-10-09, `51-16-DECISAO-PENDENTE.md`, respostas): «Estender o D-23» a
-- `rejeitar_candidatura`, com a semântica do D-23 da 48 — o DECISOR REVERTIDO (quem fez a rejeição que a
-- revisão reverteu) não re-rejeita a mesma candidatura; outro RH pode. Migration própria, no escopo do
-- review -2, aplicada DEPOIS da 0004 (ela lê `revisao_rejeicao`, que a 0002 cria).
--
-- O QUE MUDA. Só `public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)`: o corpo VIVO
-- (md5(prosrc) 75c0d3d0451a6f8c1e1a4425208daa4a, = o arquivo 20261005000004 byte a byte, medido em
-- 2026-10-09) com UM bloco novo, «(2c)», inserido logo depois da guarda do helper (2b) e antes da trava
-- de encerrada (3):
--     IF EXISTS (revisao_rejeicao rr WHERE rr.candidatura_id = p_candidatura_id
--                AND rr.veredito = 'revertida' AND rr.rejeitado_por = auth.uid())
--       → RAISE 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)' (42501)
--   · a MESMA mensagem e o MESMO código do D-23 de `registrar_decisao` (o cliente do 48-15 casa a marca
--     «D-23» na mensagem);
--   · o decisor é `revisao_rejeicao.rejeitado_por` (o `ator` da linha de rejeição, que vem de
--     `auth.uid()` em `avancar_etapa`); no knockout ele é NULL e nunca casa — não há decisor a travar;
--   · como no D-23 da 48, a trava vale para TODO pedido revertido da candidatura (um ciclo antigo
--     continua travando quem foi revertido nele) e também para o administrador (não há bypass);
--   · pedido PENDENTE ou MANTIDO não trava (só a revertida reabre; a mantida deixa a candidatura
--     encerrada e a trava de encerrada responde, como antes).
--   Nada mais muda: papel, justificativa ≥ 50, existência, helper, encerrada, o UPDATE único, as
--   propriedades, o ACL e o comentário (que ganha um ACRÉSCIMO no fim). O POS prova por md5 que o corpo
--   novo é o capturado no PRE com EXATAMENTE esta inserção.
--
-- FORA DO ESCOPO (registrado, não decidido aqui): o caminho `decisao_final` revertido seguido de
-- `rejeitar_candidatura` pelo MESMO decisor (A rejeita por `registrar_decisao`, B reverte, A usa
-- `rejeitar_candidatura` em vez de `registrar_decisao`) já existia antes da P51 e não é tocado: esta
-- migration só lê `revisao_rejeicao`, como o operador decidiu. A cláusula (j) do smoke p51 usa esse
-- caminho na fixture `rev`.
--
-- PRE-PORTAO (P51-05): `revisao_rejeicao` presente com `veredito`/`rejeitado_por` (a 0002 vem antes);
--   md5(prosrc) de `rejeitar_candidatura` = 75c0d3d0451a6f8c1e1a4425208daa4a (senão RAISE e nada muda —
--   inclusive se esta migration já rodou: o corpo novo tem outro md5); captura em GUCs LOCAIS o corpo, as
--   propriedades, o CONJUNTO do ACL, o comentário, o md5 das outras sete funções do caminho de decisão
--   (as da 0002) e a contagem de `revisao_rejeicao`.
-- POS-PORTAO (P51-05): md5(prosrc novo) = md5(replace(corpo capturado, guarda (2b), guarda (2b) || bloco
--   (2c))) E = d144131c651246471e56213dd1f1a8bf; propriedades, RETURNS e ACL iguais aos capturados; `anon` sem EXECUTE; o
--   comentário capturado no começo do novo; marcadores no código sem comentários; as outras sete funções
--   byte-iguais; `revisao_rejeicao` com a mesma contagem (nenhuma escrita); anexa `05:…` a `p51.evidencia`.
--
-- LOCK. CREATE OR REPLACE de função toca só `pg_proc` (lock do objeto, sem lock de tabela de dados).
--   `lock_timeout 3s`/`statement_timeout 5s` são as DUAS primeiras instruções; `55P03`/`57014` = fila,
--   não a migration — repetir o MESMO arquivo depois, pela mesma via; nunca subir o teto.
--
-- IDEMPOTÊNCIA. Não é reaplicável por desenho: o PRE-PORTAO recusa o md5 novo; o `p46apply migrate`
--   recusa versão já no ledger.
--
-- EVIDÊNCIA. `05:…` em `p51.evidencia`; prova comportamental na cláusula (q) de
--   `supabase/tests/p51_revisao_rejeicao_smoke.sql` (o decisor revertido recusado, outro RH aceito, o
--   caminho sem revisão revertida inalterado), só pelo ensaio que aborta; mutações ME1..ME3 em
--   `scripts/p51_mutacoes.cjs`; regressão oper31/p48/p50 com esta migration prefixada.
--
-- NÃO APLICADA NA RODADA DE CONSERTO: o apply é da Task 2 do 51-16, depois do review -2 (D-12 da 50).
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta migration +
-- a linha do ledger) numa única transação (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261008000005_p51_d23_rejeitar_candidatura.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-05 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  c_md5 constant text := '75c0d3d0451a6f8c1e1a4425208daa4a';   -- md5(prosrc) medido em PROD, 2026-10-09
  v_oid oid := pg_catalog.to_regprocedure('public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)');
  v_src text;
BEGIN
  IF pg_catalog.to_regclass('public.revisao_rejeicao') IS NULL THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: public.revisao_rejeicao nao existe — aplicar 20261008000002 primeiro (a trava le o registro do pedido); nada mudou';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'revisao_rejeicao'
         AND column_name IN ('candidatura_id', 'veredito', 'rejeitado_por')) <> 3 THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: revisao_rejeicao sem candidatura_id/veredito/rejeitado_por — nada mudou';
  END IF;
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: public.rejeitar_candidatura(uuid,motivo_rejeicao_rh,text) nao existe — nada mudou';
  END IF;
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p WHERE p.oid = v_oid;
  IF md5(v_src) IS DISTINCT FROM c_md5 THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: md5(prosrc) de rejeitar_candidatura = % (medido em 2026-10-09: %) — o corpo mudou depois da medicao (ou esta migration ja rodou); este arquivo partiu do corpo medido e apagaria a mudanca em silencio. Medir de novo e reconciliar A MAO; nada mudou', md5(v_src), c_md5;
  END IF;
  IF (SELECT p.proacl FROM pg_catalog.pg_proc p WHERE p.oid = v_oid) IS NULL THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: rejeitar_candidatura com proacl NULO (= EXECUTE para PUBLIC por padrao) — medido com ACL explicita; nada mudou';
  END IF;
  IF pg_catalog.obj_description(v_oid, 'pg_proc') IS NULL THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: rejeitar_candidatura sem comentario — medido com comentario; nada mudou';
  END IF;

  PERFORM set_config('p51.p05.src', v_src, true);
  PERFORM set_config('p51.p05.props', (
    SELECT concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'), 'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text, 'lang=' || l.lanname, 'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text, 'strict=' || p.proisstrict::text, 'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text, 'retset=' || p.proretset::text,
             'args=' || pg_catalog.pg_get_function_arguments(p.oid), 'result=' || pg_catalog.pg_get_function_result(p.oid))
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang WHERE p.oid = v_oid), true);
  PERFORM set_config('p51.p05.aclset', (
    SELECT coalesce(string_agg(x, ',' ORDER BY x), '')
      FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS x
              FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(p.proacl) a WHERE p.oid = v_oid) s), true);
  PERFORM set_config('p51.p05.comment', pg_catalog.obj_description(v_oid, 'pg_proc'), true);
  PERFORM set_config('p51.p05.df7', (
    SELECT string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc), ',' ORDER BY p.oid::regprocedure::text)
      FROM pg_catalog.pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('avancar_etapa', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada', 'registrar_decisao',
                         'responder_revisao_decisao', 'solicitar_revisao_decisao', 'submit_candidatura_atomic')), true);
  PERFORM set_config('p51.p05.rr', (SELECT count(*) FROM public.revisao_rejeicao)::text, true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · rejeitar_candidatura — corpo vivo + o bloco (2c), D-23 estendido
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(p_candidatura_id uuid, p_motivo public.motivo_rejeicao_rh, p_justificativa text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_etapa      public.etapa_processo;
  v_status     public.status_candidatura;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Role membership guard FIRST (WR-02): candidato/anon rejected before any lookup -> no existence oracle
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (1) Server-authoritative >=50 gate
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) Resolve candidatura -> etapa + status (P50 / D-01: the vaga owner is no longer read)
  SELECT c.etapa_atual, c.status
    INTO v_etapa, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2b) P50 / D-01, D-02 (was the own-vaga guard, WR-04): rh must be ACTIVE (live helper
  --      public.is_active_rh_user), any vaga; administrador bypasses
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (2c) P51 / WR-09 do 51-REVIEW-PORTAO-1 (operador, 2026-10-09) — o D-23 da Phase 48 ESTENDIDO a
  --      rejeitar_candidatura: quem teve a REJEICAO revertida por uma revisao do registro proprio
  --      (revisao_rejeicao com veredito revertida; o decisor e o rejeitado_por do pedido, o ator da
  --      linha de rejeicao) nao rejeita de novo esta candidatura — bloqueio duro, no mesmo espirito do
  --      revisor != decisor e com a MESMA mensagem do D-23 de registrar_decisao. Qualquer outro
  --      RH/admin rejeita. No knockout nao ha decisor (rejeitado_por NULL nunca casa). Sem pedido
  --      revertido desta candidatura, nada muda (pendente e mantida nao travam).
  IF EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = (select auth.uid())) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;

  -- (3) Early terminal guard — Phase 48 / JORN-26 (D3 da varredura): «encerrada» e o
  --     predicado canonico, etapa E status. O guard antigo so olhava a etapa e aceitava
  --     re-rejeitar um knockout (`inscricao`, `rejeitado`): reescrevia `motivo_rejeicao`,
  --     gravava historico `inscricao -> rejeitado` e, com a chave de dedupe por
  --     transicao do JORN-18, mandaria um SEGUNDO e-mail de rejeicao.
  IF public.candidatura_encerrada(v_etapa, v_status) THEN
    RAISE EXCEPTION 'candidatura já encerrada (etapa %, status %) — não pode ser rejeitada novamente', v_etapa, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- (4) ONE UPDATE -> trigger writes the single audit row + guard_rejeicao_auditada satisfied
  --     Phase 48 / JORN-22 / D-12: `feedback_rejeicao` NEUTRO, no MESMO UPDATE — e o que
  --     faz o cartao «Entenda a decisao» aparecer no painel do candidato. E uma
  --     CONSTANTE: nunca v_just, nunca p_motivo (o texto chega ao candidato).
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just,
         feedback_rejeicao   = 'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.'
   WHERE id = p_candidatura_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) IS
  'Phase 31 / OPER-02/04: rejeicao auditada pelo RH em qualquer etapa. Server-authoritative: btrim + '
  'char_length(justificativa) >= 50 -> RAISE check_violation (contador do cliente e apenas UX). Motivo '
  'estruturado via enum motivo_rejeicao_rh (parametro; invalido -> 22P02), gravado ::text em '
  'candidaturas.motivo_rejeicao. UMA UPDATE seta etapa_atual=rejeitado + status=rejeitado (satisfaz '
  'guard_rejeicao_auditada) + etapa_justificativa (trigger avancar_etapa copia para '
  'historico_candidatura.criterio_texto e escreve UMA row; ator=auth.uid() -> auto_rejeitado=false, '
  'RNF-07a). NUNCA INSERT manual em historico_candidatura, NUNCA auto-rejeita por score. SECURITY '
  'DEFINER + search_path vazio; guard: role IN (rh,administrador) fail-closed (coalesce), ANTES da '
  'busca (sem oraculo de existencia); P50 / D-01, D-02, D-04 (2026-10-05): rh ATIVO (helper vivo '
  'public.is_active_rh_user) em qualquer vaga, sem posse; token de recrutador desativado -> 42501; '
  'administrador bypassa. GRANT EXECUTE TO authenticated, service_role; REVOKE de PUBLIC e de anon '
  'NOMINALMENTE (pg_default_acl concede a anon como grant direto). P51 / WR-09 do 51-REVIEW-PORTAO-1 '
  '(operador, 2026-10-09; migration 20261008000005): o D-23 da Phase 48 ESTENDIDO a '
  'rejeitar_candidatura — quem teve a REJEICAO revertida por uma revisao do registro proprio '
  '(revisao_rejeicao.veredito = revertida, decisor = revisao_rejeicao.rejeitado_por) nao rejeita de '
  'novo esta candidatura: 42501 com a mesma mensagem do D-23 de registrar_decisao, depois do helper e '
  'antes da trava de encerrada. Qualquer outro RH/admin rejeita; knockout (sem decisor), pedido '
  'pendente ou mantido nao travam. Provado por supabase/tests/p51_revisao_rejeicao_smoke.sql (q).';


-- ─────────────────────────────────────────────────────────────────────────────
-- P51-05 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  c_md5_novo constant text := 'd144131c651246471e56213dd1f1a8bf';
  c_anc  constant text := $anc$  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
$anc$;
  c_blk  constant text := $blk$
  -- (2c) P51 / WR-09 do 51-REVIEW-PORTAO-1 (operador, 2026-10-09) — o D-23 da Phase 48 ESTENDIDO a
  --      rejeitar_candidatura: quem teve a REJEICAO revertida por uma revisao do registro proprio
  --      (revisao_rejeicao com veredito revertida; o decisor e o rejeitado_por do pedido, o ator da
  --      linha de rejeicao) nao rejeita de novo esta candidatura — bloqueio duro, no mesmo espirito do
  --      revisor != decisor e com a MESMA mensagem do D-23 de registrar_decisao. Qualquer outro
  --      RH/admin rejeita. No knockout nao ha decisor (rejeitado_por NULL nunca casa). Sem pedido
  --      revertido desta candidatura, nada muda (pendente e mantida nao travam).
  IF EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = (select auth.uid())) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;
$blk$;
  v_oid  oid := pg_catalog.to_regprocedure('public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)');
  v_old  text := current_setting('p51.p05.src', true);
  v_src  text;
  v_cod  text;
  v_props text;
  v_acl  text;
  v_com  text;
  k      text;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: rejeitar_candidatura sumiu';
  END IF;
  IF nullif(v_old, '') IS NULL THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: corpo capturado ausente — o PRE nao rodou nesta transacao';
  END IF;
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p WHERE p.oid = v_oid;

  -- o corpo novo é o capturado com EXATAMENTE a inserção do bloco (2c) depois da guarda (2b)
  IF (SELECT count(*) FROM regexp_matches(v_old, 'is_active_rh_user\(\) THEN', 'g')) <> 1 THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: a ancora (guarda do helper) nao ocorre exatamente uma vez no corpo capturado';
  END IF;
  IF md5(v_src) IS DISTINCT FROM md5(replace(v_old, c_anc, c_anc || c_blk)) OR md5(v_src) IS DISTINCT FROM c_md5_novo THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: rejeitar_candidatura mudou ALEM da insercao do bloco (2c) — md5 novo %, esperado %', md5(v_src), c_md5_novo;
  END IF;

  SELECT concat_ws(' | ',
           'config=' || coalesce(p.proconfig::text, '<nulo>'), 'vol=' || p.provolatile::text,
           'definer=' || p.prosecdef::text, 'lang=' || l.lanname, 'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
           'kind=' || p.prokind::text, 'strict=' || p.proisstrict::text, 'leakproof=' || p.proleakproof::text,
           'parallel=' || p.proparallel::text, 'retset=' || p.proretset::text,
           'args=' || pg_catalog.pg_get_function_arguments(p.oid), 'result=' || pg_catalog.pg_get_function_result(p.oid)),
         (SELECT coalesce(string_agg(x, ',' ORDER BY x), '')
            FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS x
                    FROM pg_catalog.aclexplode(p.proacl) a) s),
         coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '')
    INTO v_props, v_acl, v_com
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE p.oid = v_oid;
  IF v_props IS DISTINCT FROM current_setting('p51.p05.props', true) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: propriedades/RETURNS mudaram — antes «%», depois «%»', current_setting('p51.p05.props', true), v_props;
  END IF;
  IF v_acl IS DISTINCT FROM current_setting('p51.p05.aclset', true) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: ACL = «%» (capturado «%»)', v_acl, current_setting('p51.p05.aclset', true);
  END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: anon tem EXECUTE em rejeitar_candidatura';
  END IF;
  IF position(current_setting('p51.p05.comment', true) IN v_com) <> 1 THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: o comentario de rejeitar_candidatura nao comeca pelo comentario capturado (acrescimo, nunca reescrita)';
  END IF;

  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
  FOREACH k IN ARRAY ARRAY['FROM public.revisao_rejeicao rr', 'rr.veredito = ''revertida''',
                           'rr.rejeitado_por = (select auth.uid())', '(D-23)', 'is_active_rh_user',
                           'candidatura_encerrada(', 'coalesce(v_role'] LOOP
    IF position(k IN v_cod) = 0 THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: rejeitar_candidatura (sem comentarios) nao contem «%»', k;
    END IF;
  END LOOP;
  -- a trava vem depois do helper e ANTES da trava de encerrada (a ordem do D-23 de registrar_decisao)
  IF NOT (position('is_active_rh_user' IN v_cod) < position('(D-23)' IN v_cod)
          AND position('(D-23)' IN v_cod) < position('candidatura_encerrada(' IN v_cod)) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: o bloco D-23 nao esta entre a guarda do helper e a trava de encerrada';
  END IF;

  IF (SELECT string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc), ',' ORDER BY p.oid::regprocedure::text)
        FROM pg_catalog.pg_proc p
       WHERE p.pronamespace = 'public'::regnamespace
         AND p.proname IN ('avancar_etapa', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada', 'registrar_decisao',
                           'responder_revisao_decisao', 'solicitar_revisao_decisao', 'submit_candidatura_atomic'))
     IS DISTINCT FROM nullif(current_setting('p51.p05.df7', true), '') THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: uma das outras funcoes do caminho de decisao mudou nesta migration (so rejeitar_candidatura pode mudar)';
  END IF;
  IF (SELECT count(*) FROM public.revisao_rejeicao)::text IS DISTINCT FROM current_setting('p51.p05.rr', true) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: revisao_rejeicao mudou de contagem nesta migration (nenhuma escrita e permitida)';
  END IF;

  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || ' 05:rejeitar_candidatura=' || left(md5(v_src), 12) || ',d23=1,df7=igual,anon=false'), false);
END
$pos$;
