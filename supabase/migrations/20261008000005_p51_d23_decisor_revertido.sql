-- =============================================================================
-- Migration 20261008000005 — o D-23 da Phase 48 FECHADO nas 4 combinações (fonte da reversão × caminho
-- da re-rejeição): `rejeitar_candidatura` e `registrar_decisao`
-- Phase 51 / Plano 51-16 (rodadas de conserto do 51-REVIEW-PORTAO-1 e do 51-REVIEW-PORTAO-2) · JORN-42
-- =============================================================================
--
-- NOME. Até a rodada do review -2 este arquivo era `20261008000005_p51_d23_rejeitar_candidatura.sql` e só
-- tocava `rejeitar_candidatura`. Ele NUNCA foi aplicado (ledger de PROD em 20261008000001, lido em
-- 2026-10-09 antes desta reescrita) — por isso foi reescrito no lugar, com a mesma versão, em vez de
-- ganhar uma 0006: duas migrations seguidas reescrevendo a MESMA função (`rejeitar_candidatura`) dariam
-- dois PRE/POS encadeados sobre um corpo intermediário que nunca existiria sozinho em PROD, e um apply
-- parado entre elas deixaria o D-23 em 2 das 4 combinações. O nome antigo deixou de descrever o conteúdo.
--
-- O QUE ESTAVA ERRADO.
--   · WR-09 do 51-REVIEW-PORTAO-1: o caminho novo do JORN-42 (registro próprio do pedido,
--     `revisao_rejeicao`, migration 20261008000002) não tinha trava equivalente ao D-23 da Phase 48
--     (JORN-19; `registrar_decisao` recusa o decisor revertido do ciclo de `decisao_final`).
--   · WR-01 do 51-REVIEW-PORTAO-2 (provado por execução no ensaio): a primeira versão deste arquivo
--     travava só `rejeitar_candidatura`; o decisor revertido no registro novo re-rejeitava pela RPC irmã,
--     `registrar_decisao` — inclusive pela tela de decisão final, quando a rejeição original foi feita
--     na etapa `decisao_final` (a reabertura volta para lá).
--   · WR-03 do 51-REVIEW-PORTAO-2 (pré-existente desde a P48): reversão no ciclo `decisao_final` seguida
--     de `rejeitar_candidatura` pelo MESMO decisor — `rejeitar_candidatura` nunca leu `decisao_final`.
--
-- DECISÃO DO OPERADOR (`51-16-DECISAO-PENDENTE.md`, respostas de 2026-10-09 ao review -1 e ao review -2):
-- «Fechar as 4». O DECISOR REVERTIDO — quem fez a rejeição que uma revisão reverteu — é recusado ao tentar
-- rejeitar de novo a MESMA candidatura por QUALQUER um dos dois caminhos, venha a reversão de QUALQUER uma
-- das duas fontes. Outro RH pode. O caminho sem revisão revertida não muda.
--
--     reversão \ re-rejeição  | registrar_decisao(rejeitado)        | rejeitar_candidatura
--     ------------------------|-------------------------------------|-------------------------------------
--     ciclo decisao_final     | (2b) da P48 — JÁ existia, intocado   | (2c) NOVO: ramos vigente + arquivo
--     revisao_rejeicao        | (2c) NOVO                            | (2c) NOVO: ramo revisao_rejeicao
--
-- O QUE MUDA — só duas funções, cada uma = o corpo VIVO (medido em PROD em 2026-10-09, = o arquivo
-- 20261005000004 byte a byte) com UM bloco INSERIDO, nada removido nem reescrito:
--   1. `rejeitar_candidatura(uuid, motivo_rejeicao_rh, text)` — md5(prosrc) vivo 75c0d3d0451a6f8c1e1a4425208daa4a.
--      Bloco «(2c)» logo depois da guarda do helper (2b) e antes da trava de encerrada (3). Recusa
--      (42501, a MESMA mensagem do D-23 de `registrar_decisao` — o cliente casa a marca «D-23») se
--      existir para esta candidatura, com o chamador como decisor revertido:
--        · `revisao_rejeicao` com veredito `revertida` e `rejeitado_por` = auth.uid(); OU
--        · `decisao_final` (vigente) OU `decisao_final_historico` (arquivo) com `revisao_veredito =
--          'revertida' AND decisao = 'rejeitado' AND por_usuario = auth.uid()` — o predicado do (2b) da
--          48, copiado (o filtro `decisao = 'rejeitado'` é load-bearing, ver o comentário vivo do (2b)).
--   2. `registrar_decisao(uuid, decisao_final_resultado, text)` — md5(prosrc) vivo 7da195353109938c8e572cb61800de06.
--      Bloco «(2c)» logo depois do (2b) da P48 (que fica byte-igual) e antes do upsert (3). Recusa (42501,
--      a mesma mensagem) se `p_decisao = 'rejeitado'` E existir `revisao_rejeicao` desta candidatura com
--      veredito `revertida` e `rejeitado_por` = v_uid. ESCOPO DO OPERADOR: só a re-REJEIÇÃO («não
--      re-rejeita»); `aprovado`/`em_espera` desse decisor seguem livres para ESTA fonte — ao contrário do
--      (2b) da 48, que trava qualquer `p_decisao` quando a reversão foi do ciclo `decisao_final`. A
--      assimetria é deliberada e está provada nos dois sentidos pela (q) do smoke.
--   Em todos os ramos: a trava vale para TODO pedido/ciclo revertido da candidatura (um ciclo antigo
--   continua travando quem foi revertido nele, como no D-23 da 48) e também para o administrador (sem
--   bypass); no knockout não há decisor (`rejeitado_por` NULL nunca casa); pedido PENDENTE ou MANTIDO não
--   trava (a mantida deixa a candidatura encerrada e a trava de encerrada responde, como antes).
--   Nada mais muda: papel, justificativa ≥ 50, existência, helper, encerrada, o UPDATE/upsert, as
--   propriedades, o ACL e o comentário de cada uma (que ganha um ACRÉSCIMO no fim). O POS prova por md5
--   que cada corpo novo é o capturado no PRE com EXATAMENTE a sua inserção.
--
-- ORDEM. Depende da 20261008000002 (a tabela `revisao_rejeicao` nasce lá — o PRE recusa sem ela) e vem
--   depois da 0004 (a 0002 exige `registrar_decisao` e `rejeitar_candidatura` com o md5 VIVO de hoje:
--   aplicada antes da 0002, esta migration faria o PRE da 0002 recusar).
--
-- PRE-PORTAO (P51-05): `revisao_rejeicao` com candidatura_id/veredito/rejeitado_por; `decisao_final` e
--   `decisao_final_historico` com candidatura_id/revisao_veredito/decisao/por_usuario (os ramos novos
--   leem essas colunas); md5(prosrc) de cada função = o medido (senão RAISE e nada muda — inclusive se
--   esta migration já rodou: os corpos novos têm outro md5); ACL não nula; comentário presente. Captura em
--   GUCs LOCAIS, por função, o corpo, as propriedades, o CONJUNTO do ACL e o comentário; o md5 das outras
--   nove funções do caminho de decisão/revisão; e as contagens de `revisao_rejeicao`, `decisao_final` e
--   `decisao_final_historico`.
-- POS-PORTAO (P51-05): por função — a âncora ocorre EXATAMENTE uma vez no corpo capturado; md5(prosrc
--   novo) = md5(replace(corpo capturado, âncora, âncora || bloco)) E = a constante; propriedades, RETURNS e
--   ACL iguais aos capturados; `anon` sem EXECUTE; o comentário capturado no começo do novo; marcadores no
--   código sem comentários e a ORDEM dos blocos. As outras nove funções byte-iguais; as três tabelas com a
--   mesma contagem (nenhuma escrita); anexa `05:…` a `p51.evidencia`.
--
-- LOCK. CREATE OR REPLACE de função toca só `pg_proc` (lock do objeto, sem lock de tabela de dados).
--   `lock_timeout 3s`/`statement_timeout 5s` são as DUAS primeiras instruções; `55P03`/`57014` = fila,
--   não a migration — repetir o MESMO arquivo depois, pela mesma via; nunca subir o teto.
--
-- IDEMPOTÊNCIA. Não é reaplicável por desenho: o PRE-PORTAO recusa os md5 novos; o `p46apply migrate`
--   recusa versão já no ledger.
--
-- EVIDÊNCIA. `05:…` em `p51.evidencia`; prova comportamental na cláusula (q) de
--   `supabase/tests/p51_revisao_rejeicao_smoke.sql` (as 4 combinações: o decisor revertido recusado pelos
--   dois caminhos e pelas duas fontes; outro RH — o administrador B e um recrutador `rh` não-admin C criado
--   na fixture — aceito; o caminho sem revisão revertida inalterado; o escopo `rejeitado` do (2c) de
--   `registrar_decisao`), só pelo ensaio que aborta; mutações ME1..ME11 em `scripts/p51_mutacoes.cjs`
--   (cada ramo da trava desligado morde); regressão oper31/p42/p48/p50 com esta migration prefixada.
--
-- NÃO APLICADA NA RODADA DE CONSERTO: o apply é da Task 2 do 51-16, depois de um review sem crítico.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta migration +
-- a linha do ledger) numa única transação (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P51-05 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  -- assinatura | prefixo das GUCs | md5(prosrc) medido em PROD, 2026-10-09
  c_fns constant text[] := ARRAY[
    ['public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)',          'rj', '75c0d3d0451a6f8c1e1a4425208daa4a'],
    ['public.registrar_decisao(uuid,public.decisao_final_resultado,text)',        'rd', '7da195353109938c8e572cb61800de06']];
  k     text[];
  v_oid oid;
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
  -- os ramos novos de rejeitar_candidatura leem as colunas do (2b) da 48 nas duas tabelas (escopo: 4 x 2)
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name IN ('decisao_final', 'decisao_final_historico')
         AND column_name IN ('candidatura_id', 'revisao_veredito', 'decisao', 'por_usuario')) <> 8 THEN
    RAISE EXCEPTION 'P51-05 PRE-PORTAO: decisao_final/decisao_final_historico sem candidatura_id/revisao_veredito/decisao/por_usuario — nada mudou';
  END IF;

  FOREACH k SLICE 1 IN ARRAY c_fns LOOP
    v_oid := pg_catalog.to_regprocedure(k[1]);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P51-05 PRE-PORTAO: % nao existe — nada mudou', k[1];
    END IF;
    SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p WHERE p.oid = v_oid;
    IF md5(v_src) IS DISTINCT FROM k[3] THEN
      RAISE EXCEPTION 'P51-05 PRE-PORTAO: md5(prosrc) de % = % (medido em 2026-10-09: %) — o corpo mudou depois da medicao (ou esta migration ja rodou); este arquivo partiu do corpo medido e apagaria a mudanca em silencio. Medir de novo e reconciliar A MAO; nada mudou', k[1], md5(v_src), k[3];
    END IF;
    IF (SELECT p.proacl FROM pg_catalog.pg_proc p WHERE p.oid = v_oid) IS NULL THEN
      RAISE EXCEPTION 'P51-05 PRE-PORTAO: % com proacl NULO (= EXECUTE para PUBLIC por padrao) — medido com ACL explicita; nada mudou', k[1];
    END IF;
    IF pg_catalog.obj_description(v_oid, 'pg_proc') IS NULL THEN
      RAISE EXCEPTION 'P51-05 PRE-PORTAO: % sem comentario — medido com comentario; nada mudou', k[1];
    END IF;

    PERFORM set_config('p51.p05.' || k[2] || '.src', v_src, true);
    PERFORM set_config('p51.p05.' || k[2] || '.props', (
      SELECT concat_ws(' | ',
               'config=' || coalesce(p.proconfig::text, '<nulo>'), 'vol=' || p.provolatile::text,
               'definer=' || p.prosecdef::text, 'lang=' || l.lanname, 'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
               'kind=' || p.prokind::text, 'strict=' || p.proisstrict::text, 'leakproof=' || p.proleakproof::text,
               'parallel=' || p.proparallel::text, 'retset=' || p.proretset::text,
               'args=' || pg_catalog.pg_get_function_arguments(p.oid), 'result=' || pg_catalog.pg_get_function_result(p.oid))
        FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang WHERE p.oid = v_oid), true);
    PERFORM set_config('p51.p05.' || k[2] || '.aclset', (
      SELECT coalesce(string_agg(x, ',' ORDER BY x), '')
        FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS x
                FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(p.proacl) a WHERE p.oid = v_oid) s), true);
    PERFORM set_config('p51.p05.' || k[2] || '.comment', pg_catalog.obj_description(v_oid, 'pg_proc'), true);
  END LOOP;

  -- as OUTRAS funções do caminho de decisão/revisão (as da 0002): nenhuma pode mudar aqui
  PERFORM set_config('p51.p05.outras', (
    SELECT string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc), ',' ORDER BY p.oid::regprocedure::text)
      FROM pg_catalog.pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('avancar_etapa', 'estado_revisao_rejeicao', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada',
                         'responder_revisao_decisao', 'responder_revisao_rejeicao', 'solicitar_revisao_decisao',
                         'solicitar_revisao_rejeicao', 'submit_candidatura_atomic')), true);
  PERFORM set_config('p51.p05.contagens', (
    SELECT concat_ws(',', (SELECT count(*) FROM public.revisao_rejeicao), (SELECT count(*) FROM public.decisao_final),
                     (SELECT count(*) FROM public.decisao_final_historico))), true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · rejeitar_candidatura — corpo vivo + o bloco (2c): as duas fontes da reversão
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

  -- (2c) P51 / o D-23 da Phase 48 ESTENDIDO a rejeitar_candidatura (operador, 2026-10-09: WR-09 do
  --      51-REVIEW-PORTAO-1 e WR-01/WR-03 do 51-REVIEW-PORTAO-2 — as 4 combinacoes): quem teve uma
  --      REJEICAO desta candidatura revertida por uma revisao nao a rejeita de novo — bloqueio duro, no
  --      mesmo espirito do revisor != decisor e com a MESMA mensagem do D-23 de registrar_decisao.
  --      A reversao e procurada nas DUAS fontes:
  --        · revisao_rejeicao (registro proprio do pedido): veredito revertida e decisor = rejeitado_por
  --          (o ator da linha de rejeicao; no knockout e NULL e nunca casa — nao ha decisor a travar);
  --        · o ciclo de decisao_final: a linha VIGENTE ou o ARQUIVO (decisao_final_historico) com
  --          revisao_veredito revertida E decisao rejeitado E por_usuario = o chamador — o MESMO
  --          predicado do (2b) de registrar_decisao (decisao = rejeitado e load-bearing: um em_espera
  --          de C herda a revertida na linha com por_usuario = C, e C nao foi revertido).
  --      Qualquer outro RH/admin rejeita. Pedido pendente ou mantido nao trava (so a revertida reabre).
  IF EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = (select auth.uid()))
     OR EXISTS (SELECT 1 FROM public.decisao_final d
                 WHERE d.candidatura_id = p_candidatura_id
                   AND d.revisao_veredito = 'revertida'
                   AND d.decisao = 'rejeitado'
                   AND d.por_usuario = (select auth.uid()))
     OR EXISTS (SELECT 1 FROM public.decisao_final_historico h
                 WHERE h.candidatura_id = p_candidatura_id
                   AND h.revisao_veredito = 'revertida'
                   AND h.decisao = 'rejeitado'
                   AND h.por_usuario = (select auth.uid())) THEN
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
  'NOMINALMENTE (pg_default_acl concede a anon como grant direto). P51 / D-23 da Phase 48 ESTENDIDO '
  '(operador, 2026-10-09; WR-09 do 51-REVIEW-PORTAO-1 e WR-01/WR-03 do 51-REVIEW-PORTAO-2; migration '
  '20261008000005): quem teve uma REJEICAO desta candidatura revertida por revisao nao a rejeita de '
  'novo — 42501 com a mesma mensagem do D-23 de registrar_decisao, depois do helper e antes da trava '
  'de encerrada. A reversao e lida nas DUAS fontes: revisao_rejeicao (veredito revertida, decisor = '
  'rejeitado_por) e o ciclo de decisao_final (linha vigente ou decisao_final_historico com '
  'revisao_veredito revertida, decisao rejeitado e por_usuario = auth.uid() — o predicado do D-23 de '
  'registrar_decisao). Qualquer outro RH/admin rejeita; knockout (sem decisor), pedido pendente ou '
  'mantido nao travam. Provado por supabase/tests/p51_revisao_rejeicao_smoke.sql (q).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · registrar_decisao — corpo vivo + o bloco (2c): a fonte revisao_rejeicao, só para rejeitado
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.registrar_decisao(p_candidatura_id uuid, p_decisao public.decisao_final_resultado, p_justificativa text)
 RETURNS public.decisao_final
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_row        public.decisao_final;
  v_uid        uuid := (select auth.uid());
BEGIN
  -- (P48-11) Role guard FIRST and FAIL-CLOSED. The live guard was `v_role NOT IN (...)`, which
  --     evaluates NULL for a caller without JWT and is NOT taken (the call only failed later, by
  --     accident, on por_usuario NOT NULL) — and it ran AFTER the candidatura lookup, so a caller
  --     without JWT could tell an existing candidatura id (42501) from a missing one (P0002).
  --     coalesce + before any read: no JWT -> 42501, nothing learned. sub is mandatory too.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (0) Re-assert justificativa length server-side (the DB CHECK >= 50 is also live).
  IF p_justificativa IS NULL OR length(p_justificativa) < 50 THEN
    RAISE EXCEPTION 'justificativa deve ter ao menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (1) Resolve the candidatura. A missing candidatura -> not found. (P50 / D-01: the vaga
  --     owner is no longer read; the existence test is unchanged.)
  PERFORM 1
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) P50 / D-01, D-02 (was the own-vaga guard): rh -> must be ACTIVE (live helper
  --     public.is_active_rh_user), any vaga; a deactivated recrutador's token (JWT lives up
  --     to 1 h) -> 42501. administrador -> bypass. D-23 below is untouched (D-08).
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (2b) D-23 (Phase 48 / JORN-19): quem teve a decisao REVERTIDA nao registra a nova decisao
  --     deste caso — bloqueio duro, qualquer p_decisao, no mesmo espirito do revisor != decisor.
  --     A decisao revertida e a linha com revisao_veredito = 'revertida' E decisao = 'rejeitado'
  --     (responder_revisao_decisao so aceita revertida sobre rejeitado). Procurada em DOIS lugares:
  --       · a linha VIGENTE — a janela entre a reabertura e a nova decisao;
  --       · o ARQUIVO (decisao_final_historico) — depois que um em_espera ou a nova decisao
  --         arquivou a linha revertida; impede o decisor revertido de sobrescrever a decisao de outro.
  --     `decisao = 'rejeitado'` e load-bearing: um em_espera registrado por C durante a reabertura
  --     herda revisao_veredito = 'revertida' na linha (em_espera nao zera o ciclo, A5) com
  --     por_usuario = C — sem esse filtro, C ficaria travado pela reversao da decisao de A.
  IF EXISTS (SELECT 1 FROM public.decisao_final d
              WHERE d.candidatura_id = p_candidatura_id
                AND d.revisao_veredito = 'revertida'
                AND d.decisao = 'rejeitado'
                AND d.por_usuario = v_uid)
     OR EXISTS (SELECT 1 FROM public.decisao_final_historico h
                 WHERE h.candidatura_id = p_candidatura_id
                   AND h.revisao_veredito = 'revertida'
                   AND h.decisao = 'rejeitado'
                   AND h.por_usuario = v_uid) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;

  -- (2c) P51 / o D-23 ESTENDIDO ao registro proprio do pedido (operador, 2026-10-09: WR-01 do
  --      51-REVIEW-PORTAO-2 — as 4 combinacoes): quem teve a REJEICAO revertida por uma revisao de
  --      revisao_rejeicao (veredito revertida; o decisor e o rejeitado_por do pedido, o ator da linha de
  --      rejeicao) nao REJEITA de novo esta candidatura por aqui — o espelho do (2c) de
  --      rejeitar_candidatura, com a MESMA mensagem. Escopo do operador: so p_decisao = rejeitado
  --      («nao re-rejeita»); aprovado e em_espera desse decisor seguem livres para esta fonte. O (2b)
  --      acima, da Phase 48, continua travando QUALQUER p_decisao quando a reversao foi do ciclo de
  --      decisao_final. No knockout nao ha decisor (rejeitado_por NULL nunca casa). Outro RH/admin decide.
  IF p_decisao = 'rejeitado' AND EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = v_uid) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;

  -- (3) UPSERT the CURRENT decisao_final row (amendment history archived by the AFTER UPDATE
  --     snapshot_decisao_final trigger). por_usuario := auth.uid() ALWAYS (LGPD-02).
  INSERT INTO public.decisao_final AS df
    (candidatura_id, decisao, justificativa, por_usuario)
  VALUES
    (p_candidatura_id, p_decisao, p_justificativa, (select auth.uid()))
  ON CONFLICT (candidatura_id)
  DO UPDATE SET decisao       = EXCLUDED.decisao,
                justificativa = EXCLUDED.justificativa,
                por_usuario   = (select auth.uid()),
                em            = now(),
                -- (P48-11) the NEW decision (aprovado/rejeitado) of a REOPENED row starts clean:
                -- the revision cycle is zeroed in THIS upsert. It is not lost — the AFTER UPDATE
                -- snapshot_decisao_final reads OLD and has just archived it (20260921000011).
                -- Without this, the new rejection would show «revertida» and solicitar_revisao
                -- would be a no-op (Art. 20 unreachable). em_espera during the reopening is NOT a
                -- new decision (A5): the cycle and the deadline stand. Redecision outside a
                -- reopening (reaberta_em IS NULL) keeps today's behavior: nothing is zeroed.
                explicacao_solicitada_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.explicacao_solicitada_em END,
                revisao_solicitada_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_solicitada_em END,
                revisao_veredito = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_veredito END,
                revisao_resultado = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_resultado END,
                revisao_por_usuario = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_por_usuario END,
                revisao_respondida_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.revisao_respondida_em END,
                reaberta_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.reaberta_em END,
                prazo_nova_decisao_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.prazo_nova_decisao_em END,
                alerta_prazo_enviado_em = CASE WHEN df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN ('aprovado','rejeitado')
                                THEN NULL ELSE df.alerta_prazo_enviado_em END
  RETURNING * INTO v_row;

  -- (4) Terminal funnel transition. Map ONLY aprovado/rejeitado to etapa_atual; em_espera leaves
  --     etapa as-is. Fold status + etapa_atual + etapa_justificativa into ONE UPDATE. The
  --     candidaturas UPDATE fires avancar_etapa() which writes the ONE historico_candidatura row.
  --
  -- (P49-06 / D-35) A candidatura pode JA estar encerrada quando a decisao e registrada — o
  --     caso legado `triagem/finalizado → aprovado` e exatamente esse. «Decisao» e uma das
  --     DUAS transicoes sancionadas: a GUC e ligada antes de CADA UPDATE e zerada logo depois
  --     (Correcao 31: `set_config(…, true)` vale ate o fim da TRANSACAO e vazaria para o
  --     UPDATE seguinte num smoke).
  --
  -- (P49-06 / D-47 / JORN-37 / BD-9) `etapa_justificativa` recebe uma CONSTANTE sem PII, e nao
  --     `p_justificativa`. O motivo e o caminho: avancar_etapa() copia
  --     NEW.etapa_justificativa para historico_candidatura.criterio_texto, e o historico ENTRA
  --     na copia do titular (exportAllowlist). A justificativa da decisao final e deliberacao
  --     interna guardada pelo BD-9 — a trilha registra que HOUVE a decisao, e o TEXTO continua
  --     na fonte, decisao_final.justificativa (gravada no upsert acima, com autor).
  --     ⚠ Isto NAO se estende a rejeitar_candidatura: a justificativa de ETAPA chega ao titular
  --     por decisao ja tomada, com aviso na tela (Correcao 28). So a da decisao final e BD-9.
  IF p_decisao = 'aprovado' THEN
    PERFORM set_config('app.transicao_sancionada', 'decisao', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           status = 'finalizado',
           data_decisao_final = now(),
           etapa_justificativa = 'Decisão final registrada.'
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);
  ELSIF p_decisao = 'rejeitado' THEN
    -- FUNIL-02: sanction this status->rejeitado for the guard_rejeicao_auditada trigger
    -- (is_local=true -> SET LOCAL, txn-scoped, pooler-safe) BEFORE the UPDATE.
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);
    PERFORM set_config('app.transicao_sancionada', 'decisao', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'rejeitado',
           status = 'rejeitado',
           data_decisao_final = now(),
           etapa_justificativa = 'Decisão final registrada.'
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);
  END IF;
  -- em_espera: NO etapa change (decision row only).

  -- RETURN the decisao_final row (readback — no silent no-op).
  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) IS
  'Phase 15 + Phase 25 / DECISAO-03 + FUNIL-02/09: captura a decisao final de RH gravando '
  'decisao_final (UNICO writer). por_usuario := auth.uid() SEMPRE (LGPD-02). UPSERT via ON '
  'CONFLICT(candidatura_id); historico de emendas arquivado pelo trigger snapshot_decisao_final. '
  'rejeitado -> set_config(app.rejeicao_sancionada=on, is_local) + UPDATE unico {etapa_atual, status, '
  'data_decisao_final, etapa_justificativa}; aprovado -> etapa_atual=aprovado + status=finalizado + '
  'data_decisao_final + justificativa; em_espera NAO muda etapa. Dispara avancar_etapa (UMA row). '
  'NUNCA auto-decide (RNF-07a). Phase 48 / 48-11 (JORN-19): (i) FAIL-CLOSED — papel com coalesce e sub '
  'obrigatorio, ANTES de ler a candidatura (sem JWT -> 42501, sem oraculo de existencia). (ii) D-23 — '
  'quem teve a decisao revertida (linha com revisao_veredito=revertida e decisao=rejeitado, na vigente '
  'OU em decisao_final_historico) nao registra a nova decisao do caso, qualquer p_decisao -> 42501; '
  'qualquer outro RH/admin decide. (iii) na NOVA decisao (aprovado/rejeitado) de uma linha REABERTA '
  '(reaberta_em IS NOT NULL) o ciclo e ZERADO no mesmo upsert (explicacao_solicitada_em, revisao_*, '
  'reaberta_em, prazo_nova_decisao_em, alerta_prazo_enviado_em) — depois de o snapshot AFTER UPDATE '
  '(que le OLD) te-lo arquivado nas colunas do ciclo de decisao_final_historico; sem isso a nova '
  'rejeicao pareceria revertida e o Art. 20 ficaria inalcancavel nela. A5: em_espera durante a '
  'reabertura NAO e nova decisao (ciclo e prazo continuam). Redecisao fora de reabertura: '
  'comportamento de antes, nada zerado. Texto vivo transcrito de pg_get_functiondef (o patch dinamico '
  '20260826000004 nao deixava o corpo em arquivo). GRANT EXECUTE TO authenticated, service_role. P50 / '
  'D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) decide em QUALQUER '
  'candidatura, sem posse da vaga; token de recrutador desativado (JWT vale ate 1 h) -> 42501; '
  'administrador inalterado. D-23 intocado (D-08). P51 / D-23 ESTENDIDO ao registro proprio do pedido '
  '(operador, 2026-10-09; WR-01 do 51-REVIEW-PORTAO-2; migration 20261008000005): bloco (2c) depois do '
  '(2b) — p_decisao = rejeitado de quem teve a REJEICAO revertida em revisao_rejeicao (veredito '
  'revertida, decisor = rejeitado_por) -> 42501 com a mesma mensagem. So a re-rejeicao (escopo do '
  'operador): aprovado/em_espera desse decisor seguem livres para esta fonte; o (2b) continua travando '
  'qualquer p_decisao para a reversao do ciclo de decisao_final. Outro RH/admin decide. Provado por '
  'supabase/tests/p51_revisao_rejeicao_smoke.sql (q).';


-- ─────────────────────────────────────────────────────────────────────────────
-- P51-05 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  c_rj_md5_novo constant text := '703e47e67cc83c1e324d76dfc649b1b8';
  c_rd_md5_novo constant text := '45f65ffc5679cb089350cb5c68ad3ae2';
  c_rj_anc constant text := $anc$  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
$anc$;
  c_rj_blk constant text := $blk$
  -- (2c) P51 / o D-23 da Phase 48 ESTENDIDO a rejeitar_candidatura (operador, 2026-10-09: WR-09 do
  --      51-REVIEW-PORTAO-1 e WR-01/WR-03 do 51-REVIEW-PORTAO-2 — as 4 combinacoes): quem teve uma
  --      REJEICAO desta candidatura revertida por uma revisao nao a rejeita de novo — bloqueio duro, no
  --      mesmo espirito do revisor != decisor e com a MESMA mensagem do D-23 de registrar_decisao.
  --      A reversao e procurada nas DUAS fontes:
  --        · revisao_rejeicao (registro proprio do pedido): veredito revertida e decisor = rejeitado_por
  --          (o ator da linha de rejeicao; no knockout e NULL e nunca casa — nao ha decisor a travar);
  --        · o ciclo de decisao_final: a linha VIGENTE ou o ARQUIVO (decisao_final_historico) com
  --          revisao_veredito revertida E decisao rejeitado E por_usuario = o chamador — o MESMO
  --          predicado do (2b) de registrar_decisao (decisao = rejeitado e load-bearing: um em_espera
  --          de C herda a revertida na linha com por_usuario = C, e C nao foi revertido).
  --      Qualquer outro RH/admin rejeita. Pedido pendente ou mantido nao trava (so a revertida reabre).
  IF EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = (select auth.uid()))
     OR EXISTS (SELECT 1 FROM public.decisao_final d
                 WHERE d.candidatura_id = p_candidatura_id
                   AND d.revisao_veredito = 'revertida'
                   AND d.decisao = 'rejeitado'
                   AND d.por_usuario = (select auth.uid()))
     OR EXISTS (SELECT 1 FROM public.decisao_final_historico h
                 WHERE h.candidatura_id = p_candidatura_id
                   AND h.revisao_veredito = 'revertida'
                   AND h.decisao = 'rejeitado'
                   AND h.por_usuario = (select auth.uid())) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;
$blk$;
  c_rd_anc constant text := $anc$    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;
$anc$;
  c_rd_blk constant text := $blk$
  -- (2c) P51 / o D-23 ESTENDIDO ao registro proprio do pedido (operador, 2026-10-09: WR-01 do
  --      51-REVIEW-PORTAO-2 — as 4 combinacoes): quem teve a REJEICAO revertida por uma revisao de
  --      revisao_rejeicao (veredito revertida; o decisor e o rejeitado_por do pedido, o ator da linha de
  --      rejeicao) nao REJEITA de novo esta candidatura por aqui — o espelho do (2c) de
  --      rejeitar_candidatura, com a MESMA mensagem. Escopo do operador: so p_decisao = rejeitado
  --      («nao re-rejeita»); aprovado e em_espera desse decisor seguem livres para esta fonte. O (2b)
  --      acima, da Phase 48, continua travando QUALQUER p_decisao quando a reversao foi do ciclo de
  --      decisao_final. No knockout nao ha decisor (rejeitado_por NULL nunca casa). Outro RH/admin decide.
  IF p_decisao = 'rejeitado' AND EXISTS (SELECT 1 FROM public.revisao_rejeicao rr
              WHERE rr.candidatura_id = p_candidatura_id
                AND rr.veredito = 'revertida'
                AND rr.rejeitado_por = v_uid) THEN
    RAISE EXCEPTION 'quem teve a decisao revertida nao registra a nova decisao deste caso (D-23)'
      USING ERRCODE = '42501';
  END IF;
$blk$;
  c_d23 constant text := 'nao registra a nova decisao deste caso (D-23)';
  -- assinatura | prefixo | âncora | bloco | md5 novo
  v_fns text[];
  k     text[];
  v_oid oid;
  v_old text;
  v_src text;
  v_cod text;
  v_props text;
  v_acl  text;
  v_com  text;
  x      text;
  v_rj   text;
  v_rd   text;
BEGIN
  v_fns := ARRAY[
    ['public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)',   'rj', c_rj_anc, c_rj_blk, c_rj_md5_novo],
    ['public.registrar_decisao(uuid,public.decisao_final_resultado,text)', 'rd', c_rd_anc, c_rd_blk, c_rd_md5_novo]];

  FOREACH k SLICE 1 IN ARRAY v_fns LOOP
    v_oid := pg_catalog.to_regprocedure(k[1]);
    v_old := current_setting('p51.p05.' || k[2] || '.src', true);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: % sumiu', k[1];
    END IF;
    IF nullif(v_old, '') IS NULL THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: corpo capturado de % ausente — o PRE nao rodou nesta transacao', k[1];
    END IF;
    SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p WHERE p.oid = v_oid;

    -- o corpo novo é o capturado com EXATAMENTE a inserção do bloco depois da âncora (que ocorre UMA vez)
    IF (length(v_old) - length(replace(v_old, k[3], ''))) / length(k[3]) <> 1 THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: a ancora de % nao ocorre exatamente uma vez no corpo capturado', k[1];
    END IF;
    IF md5(v_src) IS DISTINCT FROM md5(replace(v_old, k[3], k[3] || k[4])) OR md5(v_src) IS DISTINCT FROM k[5] THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: % mudou ALEM da insercao do bloco (2c) — md5 novo %, esperado %', k[1], md5(v_src), k[5];
    END IF;

    SELECT concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'), 'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text, 'lang=' || l.lanname, 'dono=' || pg_catalog.pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text, 'strict=' || p.proisstrict::text, 'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text, 'retset=' || p.proretset::text,
             'args=' || pg_catalog.pg_get_function_arguments(p.oid), 'result=' || pg_catalog.pg_get_function_result(p.oid)),
           (SELECT coalesce(string_agg(y, ',' ORDER BY y), '')
              FROM (SELECT coalesce(nullif(a.grantee, 0)::regrole::text, 'PUBLIC') || ':' || a.privilege_type || ':' || a.is_grantable::text AS y
                      FROM pg_catalog.aclexplode(p.proacl) a) s),
           coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '')
      INTO v_props, v_acl, v_com
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    IF v_props IS DISTINCT FROM current_setting('p51.p05.' || k[2] || '.props', true) THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: propriedades/RETURNS de % mudaram — antes «%», depois «%»', k[1], current_setting('p51.p05.' || k[2] || '.props', true), v_props;
    END IF;
    IF v_acl IS DISTINCT FROM current_setting('p51.p05.' || k[2] || '.aclset', true) THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: ACL de % = «%» (capturado «%»)', k[1], v_acl, current_setting('p51.p05.' || k[2] || '.aclset', true);
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: anon tem EXECUTE em %', k[1];
    END IF;
    IF position(current_setting('p51.p05.' || k[2] || '.comment', true) IN v_com) <> 1 THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: o comentario de % nao comeca pelo comentario capturado (acrescimo, nunca reescrita)', k[1];
    END IF;

    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
    IF k[2] = 'rj' THEN
      v_rj := v_cod;
    ELSE
      v_rd := v_cod;
    END IF;
  END LOOP;

  -- rejeitar_candidatura: as DUAS fontes, depois do helper e ANTES da trava de encerrada
  FOREACH x IN ARRAY ARRAY['FROM public.revisao_rejeicao rr', 'rr.veredito = ''revertida''',
                           'rr.rejeitado_por = (select auth.uid())', 'FROM public.decisao_final d',
                           'FROM public.decisao_final_historico h', 'd.decisao = ''rejeitado''', 'h.decisao = ''rejeitado''',
                           'd.por_usuario = (select auth.uid())', 'h.por_usuario = (select auth.uid())',
                           c_d23, 'is_active_rh_user', 'candidatura_encerrada(', 'coalesce(v_role'] LOOP
    IF position(x IN v_rj) = 0 THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: rejeitar_candidatura (sem comentarios) nao contem «%»', x;
    END IF;
  END LOOP;
  IF NOT (position('is_active_rh_user' IN v_rj) < position(c_d23 IN v_rj)
          AND position(c_d23 IN v_rj) < position('candidatura_encerrada(' IN v_rj)) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: o bloco D-23 de rejeitar_candidatura nao esta entre a guarda do helper e a trava de encerrada';
  END IF;

  -- registrar_decisao: o (2b) da 48 intacto E o (2c) novo, nesta ordem, antes do upsert
  FOREACH x IN ARRAY ARRAY['FROM public.revisao_rejeicao rr', 'rr.veredito = ''revertida''', 'rr.rejeitado_por = v_uid',
                           'p_decisao = ''rejeitado'' AND EXISTS', 'd.por_usuario = v_uid', 'h.por_usuario = v_uid',
                           c_d23, 'is_active_rh_user', 'INSERT INTO public.decisao_final AS df'] LOOP
    IF position(x IN v_rd) = 0 THEN
      RAISE EXCEPTION 'P51-05 POS-PORTAO: registrar_decisao (sem comentarios) nao contem «%»', x;
    END IF;
  END LOOP;
  IF (length(v_rd) - length(replace(v_rd, c_d23, ''))) / length(c_d23) <> 2 THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: registrar_decisao deveria ter EXATAMENTE dois RAISE do D-23 (o (2b) da 48 e o (2c) novo)';
  END IF;
  IF NOT (position('is_active_rh_user' IN v_rd) < position('h.por_usuario = v_uid' IN v_rd)
          AND position('h.por_usuario = v_uid' IN v_rd) < position('rr.rejeitado_por = v_uid' IN v_rd)
          AND position('rr.rejeitado_por = v_uid' IN v_rd) < position('INSERT INTO public.decisao_final AS df' IN v_rd)) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: em registrar_decisao a ordem nao e helper < (2b) da 48 < (2c) novo < upsert';
  END IF;

  IF (SELECT string_agg(p.oid::regprocedure::text || ':' || md5(p.prosrc), ',' ORDER BY p.oid::regprocedure::text)
        FROM pg_catalog.pg_proc p
       WHERE p.pronamespace = 'public'::regnamespace
         AND p.proname IN ('avancar_etapa', 'estado_revisao_rejeicao', 'explicacao_rejeicao_origem', 'guard_rejeicao_auditada',
                           'responder_revisao_decisao', 'responder_revisao_rejeicao', 'solicitar_revisao_decisao',
                           'solicitar_revisao_rejeicao', 'submit_candidatura_atomic'))
     IS DISTINCT FROM nullif(current_setting('p51.p05.outras', true), '') THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: uma das outras funcoes do caminho de decisao/revisao mudou nesta migration (so rejeitar_candidatura e registrar_decisao podem mudar)';
  END IF;
  IF concat_ws(',', (SELECT count(*) FROM public.revisao_rejeicao), (SELECT count(*) FROM public.decisao_final),
               (SELECT count(*) FROM public.decisao_final_historico)) IS DISTINCT FROM current_setting('p51.p05.contagens', true) THEN
    RAISE EXCEPTION 'P51-05 POS-PORTAO: revisao_rejeicao/decisao_final/decisao_final_historico mudaram de contagem nesta migration (nenhuma escrita e permitida)';
  END IF;

  PERFORM set_config('p51.evidencia',
    btrim(coalesce(current_setting('p51.evidencia', true), '') || ' 05:rejeitar_candidatura=' || left(c_rj_md5_novo, 12)
          || ',registrar_decisao=' || left(c_rd_md5_novo, 12) || ',d23=4,outras=igual,anon=false'), false);
END
$pos$;
