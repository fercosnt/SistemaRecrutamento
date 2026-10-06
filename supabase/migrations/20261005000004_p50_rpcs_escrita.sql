-- =============================================================================
-- 20261005000004 — as 11 RPCs de ESCRITA passam a aceitar o recrutador ATIVO em qualquer
--                  candidatura ; as duas guardas que falhavam ABERTO fecham ; anon perde EXECUTE
-- =============================================================================
-- Phase 50 / Plano 50-05 · EXPORT-05 (metade «o recrutador age», gap G4-b) · SC1 (escrita), SC5 ·
-- D-01, D-02, D-04, D-06, D-07, D-08, D-12 · EXPANSÃO do tracer: o mesmo helper
-- (`public.is_active_rh_user()`, vivo desde o 50-02, migration 20261005000001).
--
-- POR QUE ESTAS ONZE. São SECURITY DEFINER: o DEFINER ignora a RLS, e a linha de autorização do
--   corpo é o controle INTEIRO sobre a escrita. O 0002 deu ao recrutador ativo a LEITURA de toda
--   candidatura; sem este arquivo, todo botão de ação da tela dele falha com 42501 na candidatura
--   de vaga que ele não criou — decidir, rejeitar, liberar/revogar o cognitivo, salvar a
--   avaliação da entrevista e o guia, revisar a redação, reprocessar a análise, configurar os
--   metadados das opções.
--
-- O QUE ESTAVA ERRADO, POR FUNÇÃO (linha de posse VERBATIM do PROD, RESEARCH §B):
--   · confirmar_revisao_entrevista(uuid), registrar_decisao(uuid,decisao_final_resultado,text),
--     rejeitar_candidatura(uuid,motivo_rejeicao_rh,text), reprocessar_analise(uuid),
--     salvar_avaliacao_entrevista(uuid,jsonb,text), salvar_avaliacao_entrevista(uuid,uuid,jsonb,text),
--     salvar_revisao_redacao(uuid,text,text,jsonb), save_entrevista_guia_edits(uuid,text,jsonb):
--       `IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN … 42501`
--       (o dono vinha de `SELECT v.created_by … JOIN public.vagas v ON v.id = c.vaga_id`).
--   · liberar_cognitivo(uuid,text), revogar_cognitivo(uuid,text):
--       `IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN … 42501`.
--   · upsert_pergunta_opcoes_metadata(uuid,jsonb) (D-06):
--       `IF v_role = 'rh' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN … 42501`.
--
--   AS DUAS QUE FALHAVAM ABERTO (D-04): `reprocessar_analise` e `salvar_revisao_redacao` tinham
--   `IF v_role NOT IN ('rh', 'administrador') THEN` — com papel NULO (claim ausente), `NULL NOT IN
--   (…)` avalia NULL, o IF é PULADO e o corpo segue: `net.http_post` para a EF de análise (custo
--   de IA e escrita de análise, disparados por quem não tem papel) e `UPDATE redacoes_candidato`
--   (decisão do revisor gravada sem revisor). As duas tinham EXECUTE para anon.
--
--   Decisões do operador, verbatim do 50-CONTEXT:
--   D-04 «… corrigir as duas guardas fail-open e revogar `EXECUTE` de `anon` nas funções
--        reescritas que o têm — só nestas funções; o resto do todo 42 continua adiado.»
--   D-06 «`upsert_pergunta_opcoes_metadata` alarga também.»
--   D-08 «Gates de dono por regra de negócio continuam: REVISAO-05 (decisor não responde à
--        própria revisão) e D-23; as funções de autoria … não são tocadas — em especial
--        `anonimizar_candidato` e `plano_exclusao_titular`, cujo md5 o smoke da 45 fixa.»
--
-- O QUE MUDA (e só isso — cada corpo abaixo é o `pg_get_functiondef` VIVO, transformado por
-- PROGRAMA com substituições exatas que exigem 1 ocorrência do trecho antigo):
--   · a linha de posse vira `IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN`, com a
--     MESMA mensagem e a MESMA grafia de errcode de cada função, no MESMO lugar;
--   · a coluna de autoria sai do SELECT, do INTO e do DECLARE. Quando ela era a única coluna, o
--     SELECT vira `PERFORM 1` com o MESMO FROM/JOIN/WHERE — o `IF NOT FOUND` de depois fica
--     byte-idêntico. Os joins ficam (nenhuma linha muda de existir por isso);
--   · save_entrevista_guia_edits (BORDA): o teste de inexistência era `IF v_vaga_owner IS NULL`
--     — e uma candidatura de vaga SEM autor (9 vagas órfãs em PROD) respondia «nao encontrada» a
--     todo mundo, administrador inclusive. Agora `IF NOT FOUND` (RESEARCH Pattern 4.5);
--   · D-04: `reprocessar_analise` e `salvar_revisao_redacao` ganham
--     `IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN`
--     (`v_uid uuid := (select auth.uid())` declarado — nenhuma das duas tinha), no MESMO lugar;
--   · a forma fail-closed `v_role IS NULL OR v_role NOT IN (…)` (rejeitar_candidatura,
--     liberar_cognitivo, revogar_cognitivo, save_entrevista_guia_edits,
--     upsert_pergunta_opcoes_metadata) vira a forma única `coalesce(v_role, '') NOT IN (…)` —
--     MESMA recusa para todo valor de v_role (nulo → '' → recusa; não nulo → idêntico), MESMA
--     mensagem. Existe para que «nenhum `v_role NOT IN (` sem coalesce» seja checável por forma
--     (pós-portão (c), varredura do 50-07) sem exceção de idioma;
--   · anon perde EXECUTE nas 5 que o tinham (D-04), com `anon` NOMEADO no REVOKE;
--   · os 11 COMMENT ON FUNCTION trocam só as frases de posse pela regra nova (P50 / D-0x).
--   FICA, byte a byte: tudo o que vem DEPOIS da linha de autorização (o pós-portão prova pela
--   md5 da CAUDA do corpo, antes × depois) — em particular o D-23 de `registrar_decisao`
--   (`d.por_usuario = v_uid` sobre decisao_final E decisao_final_historico, SC5), os mínimos de
--   justificativa, RNF-07a, as transições sancionadas e o `entrevista_analise_vigente` (49-10).
--   A ordem «guarda de papel antes/depois da busca» de cada função é a de hoje (oper31 (f)).
--   `responder_revisao_decisao` (REVISAO-05) NÃO está neste arquivo.
--
-- MEDIDO EM PROD (2026-10-05, só leitura, re-medido na execução do 50-05 — igual ao RESEARCH §B):
--   função                                               md5(prosrc)                       vol  anon
--   confirmar_revisao_entrevista(uuid)                   43df21b884807c2f9ee57d45bdd70065  v    não
--   liberar_cognitivo(uuid,text)                         5d72a3d5137c82d29e49ef8e9f61e13d  v    não
--   registrar_decisao(uuid,decisao_final_resultado,text) 5042fa9331f21ad873cb462208490dcc  v    não
--   rejeitar_candidatura(uuid,motivo_rejeicao_rh,text)   10498a0bef7c8381d58f7634019778b1  v    SIM
--   reprocessar_analise(uuid)                            e0c0f259bff9a9b3b404ef8b26255f17  v    SIM
--   revogar_cognitivo(uuid,text)                         7bf59ed2770a48463b0bdce1ab582393  v    não
--   salvar_avaliacao_entrevista(uuid,jsonb,text)         874a3244acd9f1426ee1a42af7de7c4a  v    não
--   salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)    53393f15f0901703203bb315795e5e09  v    não
--   salvar_revisao_redacao(uuid,text,text,jsonb)         765e2beca39b7479f960986dcee3f1cb  v    SIM
--   save_entrevista_guia_edits(uuid,text,jsonb)          bfb84079af12449d9563f0ea7af75be7  v    SIM
--   upsert_pergunta_opcoes_metadata(uuid,jsonb)          c6f8728f78a550d92c1af473343a6797  v    SIM
--   Todas SECURITY DEFINER, plpgsql, `search_path=""`, dono postgres, nenhuma com EXECUTE para
--   PUBLIC. D-08: o motor de exclusão tem 2 sobrecargas no total; md5(prosrc)
--   4624854408950110cbfebc971481145a / 35d451416c22e150e48a583d879fe48d.
--
-- D-08 POR CHECAGEM QUE TEM DE PASSAR. Este arquivo não nomeia as duas funções do motor de
--   exclusão em nenhuma forma de DDL, e prova que não as tocou DENTRO da própria transação: o
--   pré-portão guarda a impressão digital da LINHA INTEIRA de cada sobrecarga em `pg_proc`
--   (`md5(to_jsonb(p)::text)` — corpo, ACL, config, dono; não envelhece quando nasce coluna), o
--   pós-portão a recalcula; qualquer diferença aborta o apply inteiro.
--
-- LOCK. `CREATE OR REPLACE FUNCTION` atualiza a linha de `pg_proc` (lock de linha do catálogo,
--   sem lock de tabela de dados). `lock_timeout`/`statement_timeout` ficam no arquivo pela mesma
--   razão do 0002: o `p46apply.cjs migrate` manda o arquivo byte a byte e o md5 do ledger é o dele.
--
-- IDEMPOTÊNCIA: o pré-portão exige o md5(prosrc) medido; reaplicar por cima de si mesma aborta
--   (md5 novo ≠ medido) em vez de sobrescrever em silêncio. Nenhum DML de dado.
--
-- EVIDÊNCIA: a Management API não devolve NOTICE; o pós-portão ANEXA à GUC de sessão
--   `p50.evidencia` `05:<assinatura>=<md5 novo>,…` (11), `05:anon=false` e
--   `05:d08=igual:n=<sobrecargas>`, que o `scripts/p50_ensaio.cjs` copia na linha de veredito.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com COMMENT
-- adjacente é a forma exata do 42601, e o endpoint já roda a requisição inteira numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261005000004_p50_rpcs_escrita.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação). NÃO aplicar
-- antes da review bloqueante do 50-10 (D-12). Pré-requisito: 20261005000001 aplicada (helper).
-- Independe do 0002 e do 0003 (DEFINER: nenhuma destas lê a RLS que o 0002 muda; nenhuma é
-- reescrita pelo 0003).
-- =============================================================================

-- Limites de espera e de posse do lock (ver «LOCK»).
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — helper vivo; os 11 corpos com o md5(prosrc) medido; por função, em GUCs locais
-- `p50.p05.f<n>.*`: propriedades (config, volatilidade, DEFINER, linguagem, dono, RETURNS,
-- argumentos…), ACL, literais protegidos presentes no código vivo, a ordem «guarda de papel
-- antes da primeira leitura de tabela», e a md5 da CAUDA do corpo (tudo depois da linha de
-- posse). Escopo em `p50.p05.escopo`; impressão digital D-08 em `p50.d08_antes_05`; a de
-- REVISAO-05 (`responder_revisao_decisao`, que este arquivo não toca) em `p50.p05.rev05_antes`.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  r        record;
  v_oid    oid;
  v_src    text;
  v_cod    text;   -- prosrc SEM comentários `--`: presença e ordem se leem no código
  v_md5    text;
  v_props  text;
  v_acl    text;
  v_marca  text;
  v_n      int;
  m        text;
  v_lits   text[];
  v_esc    text[] := '{}';
  v_d08    text;
  v_d08n   int;
  v_nomes  int;
  v_rev    text;
  -- As 3 formas VIVAS da linha de posse (medidas). Cada corpo tem exatamente uma, uma vez.
  c_posse  constant text[] := ARRAY[
    'IF v_role = ''rh'' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN',
    'IF v_role = ''rh'' AND v_owner IS DISTINCT FROM v_uid THEN',
    'IF v_role = ''rh'' AND v_owner IS DISTINCT FROM (select auth.uid()) THEN'];
  -- Literais que outros portões (prontidão p48/p49, oper31, smokes da 48/49) leem nestes corpos,
  -- e as regras de negócio que a reescrita não pode perder. ESCOPO DELIBERADO: o que estiver
  -- presente no corpo VIVO tem de estar presente no NOVO; o que não estiver não é exigido.
  c_lits   constant text[] := ARRAY[
    'candidatura_encerrada(', 'app.transicao_sancionada', 'app.rejeicao_sancionada',
    'entrevista_analise_vigente', 'etapa_justificativa', 'D-23', 'd.por_usuario = v_uid',
    'h.por_usuario = v_uid', 'coalesce(v_role', 'Decisão final registrada.',
    'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.',
    'char_length(v_just) < 50', 'length(p_justificativa) < 50', 'length(p_notas) < 50',
    'net.http_post(', 'sincronizar_score_redacao(', 'FOR UPDATE OF ea', 'no_data_found'];
BEGIN
  IF to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P50-05 PRE-PORTAO: public.is_active_rh_user() nao existe — aplicar 20261005000001 primeiro (as 11 funcoes chamam o helper).';
  END IF;

  -- ESCOPO DELIBERADO deste arquivo, não fotografia (CLAUDE.md §Portões): as 11 assinaturas que
  -- ele reescreve (RESEARCH §B), cada uma com o md5(prosrc) medido em 2026-10-05. Uma 12ª função
  -- de escrita com posse que nascesse depois não entra aqui — quem a pega é a varredura POR
  -- FORMA do smoke (50-07).
  FOR r IN
    SELECT * FROM (VALUES
      (1,  'public.registrar_decisao(uuid,public.decisao_final_resultado,text)',  '5042fa9331f21ad873cb462208490dcc'),
      (2,  'public.rejeitar_candidatura(uuid,public.motivo_rejeicao_rh,text)',    '10498a0bef7c8381d58f7634019778b1'),
      (3,  'public.liberar_cognitivo(uuid,text)',                                 '5d72a3d5137c82d29e49ef8e9f61e13d'),
      (4,  'public.revogar_cognitivo(uuid,text)',                                 '7bf59ed2770a48463b0bdce1ab582393'),
      (5,  'public.reprocessar_analise(uuid)',                                    'e0c0f259bff9a9b3b404ef8b26255f17'),
      (6,  'public.confirmar_revisao_entrevista(uuid)',                           '43df21b884807c2f9ee57d45bdd70065'),
      (7,  'public.salvar_avaliacao_entrevista(uuid,jsonb,text)',                 '874a3244acd9f1426ee1a42af7de7c4a'),
      (8,  'public.salvar_avaliacao_entrevista(uuid,uuid,jsonb,text)',            '53393f15f0901703203bb315795e5e09'),
      (9,  'public.save_entrevista_guia_edits(uuid,text,jsonb)',                  'bfb84079af12449d9563f0ea7af75be7'),
      (10, 'public.salvar_revisao_redacao(uuid,text,text,jsonb)',                 '765e2beca39b7479f960986dcee3f1cb'),
      (11, 'public.upsert_pergunta_opcoes_metadata(uuid,jsonb)',                  'c6f8728f78a550d92c1af473343a6797')
    ) AS e(n, sig, md5)
    ORDER BY n
  LOOP
    v_oid := to_regprocedure(r.sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P50-05 PRE-PORTAO: % nao existe — medir de novo e decidir A MAO.', r.sig;
    END IF;
    SELECT p.prosrc,
           md5(p.prosrc),
           concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'),
             'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text,
             'lang=' || l.lanname,
             'dono=' || pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text,
             'strict=' || p.proisstrict::text,
             'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text,
             'cost=' || p.procost::text,
             'rows=' || p.prorows::text,
             'retset=' || p.proretset::text,
             'result=' || pg_get_function_result(p.oid),
             'args=' || pg_get_function_arguments(p.oid),
             'idargs=' || pg_get_function_identity_arguments(p.oid)),
           coalesce(p.proacl::text, '')
      INTO v_src, v_md5, v_props, v_acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    IF v_md5 IS DISTINCT FROM r.md5 THEN
      RAISE EXCEPTION 'P50-05 PRE-PORTAO: md5(prosrc) de % = % (medido em 2026-10-05: %) — alguem mudou o corpo depois da medicao (ou esta migration ja rodou); este arquivo transcreveu o corpo medido e apagaria a mudanca em silencio. Medir de novo e reconciliar A MAO.', r.sig, v_md5, r.md5;
    END IF;
    IF v_acl = '' OR EXISTS (SELECT 1 FROM aclexplode(v_acl::aclitem[]) a WHERE a.grantee = 0) THEN
      RAISE EXCEPTION 'P50-05 PRE-PORTAO: % com EXECUTE para PUBLIC (proacl «%») — medido sem; medir de novo e decidir A MAO.', r.sig, v_acl;
    END IF;
    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

    -- a linha de posse viva: exatamente UMA das 3 formas, UMA vez.
    v_n := 0;
    v_marca := NULL;
    FOREACH m IN ARRAY c_posse LOOP
      IF position(m IN v_src) > 0 THEN
        v_n := v_n + (length(v_src) - length(replace(v_src, m, ''))) / length(m);
        v_marca := m;
      END IF;
    END LOOP;
    IF v_n IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'P50-05 PRE-PORTAO: % tem % linhas de posse na forma medida (esperado 1)', r.sig, v_n;
    END IF;

    -- literais protegidos presentes no código vivo
    SELECT coalesce(array_agg(x ORDER BY o), '{}') INTO v_lits
      FROM unnest(c_lits) WITH ORDINALITY AS t(x, o)
     WHERE position(x IN v_cod) > 0;

    PERFORM set_config('p50.p05.f' || r.n || '.props', v_props, true);
    PERFORM set_config('p50.p05.f' || r.n || '.acl', v_acl, true);
    PERFORM set_config('p50.p05.f' || r.n || '.lits', v_lits::text, true);
    -- CAUDA: tudo depois do `THEN` da linha de posse — RAISE, END IF e o resto do corpo.
    PERFORM set_config('p50.p05.f' || r.n || '.cauda',
      md5(substr(v_src, position(v_marca IN v_src) + length(v_marca))), true);
    -- ORDEM: a guarda de papel vem antes da primeira leitura de tabela? (oper31 (f), P48-11)
    PERFORM set_config('p50.p05.f' || r.n || '.ordem',
      (position('NOT IN (''rh'', ''administrador'')' IN v_cod) > 0
       AND position('NOT IN (''rh'', ''administrador'')' IN v_cod) < position('FROM public.' IN v_cod))::text, true);
    v_esc := v_esc || r.sig;
  END LOOP;

  -- D-08 — ESCOPO DELIBERADO, não fotografia: os dois corpos do motor de exclusão que o
  -- `p45_motor_exclusao_smoke.sql` (C3) fixa por md5. A impressão digital é a LINHA INTEIRA de
  -- `pg_proc` (`to_jsonb`): corpo, ACL, config e dono — e não envelhece quando nasce coluna.
  -- Piso: os DOIS nomes presentes. Sem ele, população vazia faria início = fim por vacuidade.
  SELECT count(*)::int,
         count(DISTINCT p.proname)::int,
         string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
    INTO v_d08n, v_nomes, v_d08
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('anonimizar_candidato', 'plano_exclusao_titular');
  IF v_nomes IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'P50-05 PRE-PORTAO: D-08 — so % dos 2 nomes do motor de exclusao (anonimizar_candidato, plano_exclusao_titular) existem em public (% sobrecargas); sem os dois a prova antes = depois seria vacua. Medir de novo e decidir A MAO.', v_nomes, v_d08n;
  END IF;
  PERFORM set_config('p50.d08_antes_05', v_d08, true);
  PERFORM set_config('p50.d08_n_05', v_d08n::text, true);

  -- REVISAO-05 (D-08): `responder_revisao_decisao` não é reescrita aqui; a mesma impressão
  -- digital prova que continua como estava. Piso: existe.
  SELECT string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
    INTO v_rev
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'responder_revisao_decisao';
  IF v_rev IS NULL THEN
    RAISE EXCEPTION 'P50-05 PRE-PORTAO: REVISAO-05 — public.responder_revisao_decisao nao existe; a prova antes = depois seria vacua. Medir de novo e decidir A MAO.';
  END IF;
  PERFORM set_config('p50.p05.rev05_antes', v_rev, true);

  PERFORM set_config('p50.p05.escopo', array_to_string(v_esc, ';'), true);
  RAISE NOTICE 'P50-05 PRE-PORTAO OK — helper presente ; % funcoes com md5(prosrc) medido ; D-08: % sobrecargas capturadas', cardinality(v_esc), v_d08n;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Decisão, rejeição, cognitivo, reprocessamento, confirmação da revisão — corpo VIVO
-- (pg_get_functiondef); só a linha de autorização muda (e a posse sai do SELECT).
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

CREATE OR REPLACE FUNCTION public.liberar_cognitivo(p_candidatura_id uuid, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role   text;
  v_uid    uuid;
  v_status public.status_candidatura;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT c.status INTO v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Quem saiu do funil nao faz avaliacao.
  IF v_status IN ('rejeitado', 'finalizado') THEN
    RAISE EXCEPTION 'candidatura % — nao se libera avaliacao para quem saiu do funil', v_status
      USING errcode = 'P0001';
  END IF;

  -- Re-liberar uma revogada e legitimo (o operador mudou de ideia, a agenda mudou):
  -- limpa a revogacao e recarimba o autor.
  INSERT INTO public.cognitivo_liberacao (candidatura_id, liberado_por, motivo)
  VALUES (p_candidatura_id, v_uid, p_motivo)
  ON CONFLICT (candidatura_id) DO UPDATE
    SET liberado_por = v_uid,
        liberado_em  = now(),
        revogado_em  = NULL,
        revogado_por = NULL,
        motivo       = COALESCE(EXCLUDED.motivo, public.cognitivo_liberacao.motivo);

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'liberado', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.revogar_cognitivo(p_candidatura_id uuid, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role  text;
  v_uid   uuid;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  PERFORM 1
    FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Revoga sem apagar: o rastro de quem liberou e quando permanece.
  UPDATE public.cognitivo_liberacao
     SET revogado_em = now(), revogado_por = v_uid,
         motivo = COALESCE(p_motivo, motivo)
   WHERE candidatura_id = p_candidatura_id AND revogado_em IS NULL;

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'revogado', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reprocessar_analise(p_candidatura_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_vaga_id       uuid;
  v_uid           uuid := (select auth.uid());
  v_role          text;
  v_project_url   text;
  v_invoke_key    text;
BEGIN
  SELECT c.vaga_id
    INTO v_vaga_id
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF v_vaga_id IS NULL THEN
    RAISE EXCEPTION 'candidatura % not found', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- P50 / D-04: fail-closed. Sem coalesce, um papel nulo dava NULL no `NOT IN` e o IF NAO
  -- disparava; sub obrigatorio tambem (sem chamador identificado nao ha autor).
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';

  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_project_url || '/functions/v1/analise-candidato-individual',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_invoke_key
    ),
    body := jsonb_build_object(
      'candidatura_id', p_candidatura_id,
      'vaga_id', v_vaga_id
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_revisao_entrevista(p_analise_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_confirmada timestamptz;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
BEGIN
  -- O estado da análise entra no MESMO SELECT da busca: são a mesma leitura, e separá-las
  -- abriria uma janela entre «achei» e «ainda vale». (P50 / D-01: a posse da vaga saiu.)
  SELECT ea.superada_em, ea.status_analise, ea.competencias
    INTO v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'analise de entrevista nao encontrada (%)', p_analise_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed (ver a razão no cabeçalho, defeito (3)).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A confirmação só vale na análise VIGENTE. `revisao_confirmada_em` é o que o
  -- `avancar_etapa` lê para LIBERAR a trava de língua/sotaque, e desde o 49-06 ele só
  -- olha a vigente: confirmar numa superada não libera nada (o RH fica sem entender por
  -- que o avanço continua travado), e confirmar numa FALHA liberaria o avanço sem
  -- ninguém ter lido análise nenhuma.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: confirme a revisao da analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid())
   WHERE id = p_analise_id
  RETURNING revisao_confirmada_em INTO v_confirmada;

  RETURN jsonb_build_object(
    'ok', true,
    'id', p_analise_id,
    'revisao_confirmada_em', v_confirmada
  );
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Avaliações da entrevista, guia, revisão da redação, metadados das opções — idem.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_n          integer;
  v_analise_id uuid;
BEGIN
  -- Guard de papel PRIMEIRO, fail-closed: quem chega sem papel recebe 42501 antes de
  -- qualquer leitura (inclusive com duas vigentes — p49_analise_vigente_smoke (h)).
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02 (era a posse da vaga): rh ATIVO ANTES da contagem — um token de
  -- recrutador desativado (o JWT vale ate 1 h) nao aprende quantas vigentes ha. Em qualquer vaga.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Quantas vigentes, pelo predicado único. Uma POR TIPO desde o 49-10.
  SELECT count(*), (array_agg(ea.id))[1]
    INTO v_n, v_analise_id
    FROM public.entrevista_analises ea
   WHERE ea.candidatura_id = p_candidatura_id
     AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'nenhuma analise vigente para revisar na candidatura %', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_n > 1 THEN
    RAISE EXCEPTION 'a candidatura % tem % analises de entrevista vigentes: informe a analise que esta sendo avaliada (p_analise_id)',
      p_candidatura_id, v_n
      USING ERRCODE = 'check_violation';
  END IF;

  -- Exatamente uma: o singular é verdade, e a primária faz o resto (um corpo só).
  RETURN public.salvar_avaliacao_entrevista(p_candidatura_id, v_analise_id, p_scores_humanos, p_notas);
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_avaliacao_entrevista(p_candidatura_id uuid, p_analise_id uuid, p_scores_humanos jsonb, p_notas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role       text;
  v_analise_id uuid;
  v_superada   timestamptz;
  v_status     text;
  v_comp       jsonb;
  v_media      numeric;
  v_n          integer;
BEGIN
  -- A análise a revisar é a que o CLIENTE nomeia — a que a tela mostra (D-39). A condição
  -- de candidatura fecha o IDOR: SECURITY DEFINER ignora RLS, e sem ela um RH dono da vaga
  -- de A gravaria nota numa análise de B. O estado entra no MESMO SELECT (e sob lock) para
  -- não abrir janela entre «é vigente» e o UPDATE.
  SELECT ea.id, ea.superada_em, ea.status_analise, ea.competencias
    INTO v_analise_id, v_superada, v_status, v_comp
    FROM public.entrevista_analises ea
    JOIN public.candidaturas c ON c.id = ea.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE ea.id = p_analise_id
     AND ea.candidatura_id = p_candidatura_id
     FOR UPDATE OF ea;

  IF v_analise_id IS NULL THEN
    RAISE EXCEPTION 'analise de entrevista % nao encontrada na candidatura %', p_analise_id, p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- Fail-closed: sem papel nenhum, RECUSA (a comparação direta sobre um v_role nulo
  -- devolve NULL e o IF não dispara).
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- A nota humana só vale na análise VIGENTE (predicado único do 49-01): numa SUPERADA ela
  -- revisaria um texto que não vale mais; numa FALHA não há competências para pontuar.
  IF NOT public.entrevista_analise_vigente(v_superada, v_status, v_comp) THEN
    RAISE EXCEPTION 'analise superada ou sem resultado: a avaliacao so pode ser registrada na analise vigente (analise %, superada_em %, status %)',
      p_analise_id, v_superada, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(btrim(p_notas)) = 0 THEN
    RAISE EXCEPTION 'notas_humanas obrigatorias' USING ERRCODE = 'check_violation';
  END IF;

  -- Média das notas humanas (BARS 1–5). Só valores numéricos contam; um objeto sem
  -- nenhuma nota numérica é erro de contrato do cliente, não um score zero.
  SELECT avg(kv.v::numeric), count(*)
    INTO v_media, v_n
    FROM jsonb_each_text(coalesce(p_scores_humanos, '{}'::jsonb)) AS kv(k, v)
   WHERE kv.v ~ '^[0-9]+(\.[0-9]+)?$'
     AND kv.v::numeric BETWEEN 1 AND 5;

  IF coalesce(v_n, 0) = 0 THEN
    RAISE EXCEPTION 'scores_humanos sem notas numericas entre 1 e 5' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.entrevista_analises
     SET scores_humanos        = p_scores_humanos,
         notas_humanas         = p_notas,
         revisao_confirmada_em = now(),
         revisada_por          = (select auth.uid()),
         status_analise        = 'concluida'
   WHERE id = v_analise_id;

  -- A linha que o consolidador pondera. status='sucesso' SÓ nasce aqui, pela mão humana
  -- (RNF-07a): a EF de IA deixa pendente_humano e score NULL.
  INSERT INTO public.scores_candidato
    (candidatura_id, tipo, subtipo, pergunta_id, score, score_max, status, metadata)
  VALUES
    (p_candidatura_id, 'entrevista', NULL, NULL, round(v_media, 2), 5, 'sucesso',
     jsonb_build_object(
       'scores_humanos', p_scores_humanos,
       'analise_id', v_analise_id,
       'confirmado_por', (select auth.uid()),
       'fonte', 'salvar_avaliacao_entrevista'))
  ON CONFLICT (candidatura_id, tipo, subtipo, pergunta_id) DO UPDATE
    SET score      = EXCLUDED.score,
        score_max  = EXCLUDED.score_max,
        status     = 'sucesso',
        metadata   = public.scores_candidato.metadata || EXCLUDED.metadata,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'analise_id', v_analise_id,
    'candidatura_id', p_candidatura_id,
    'score_entrevista', round(v_media, 2),
    'score_max', 5);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_entrevista_guia_edits(p_candidatura_id uuid, p_tipo text, p_guia jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role_db    text;
  v_role       text;
BEGIN
  IF p_tipo NOT IN ('online', 'presencial') THEN
    RAISE EXCEPTION 'tipo invalido: %', p_tipo USING ERRCODE = 'check_violation';
  END IF;

  -- Role from public.usuarios_rh (NOT the JWT claim) — the ENTREV-08 deviation.
  SELECT role INTO v_role_db
    FROM public.usuarios_rh
   WHERE user_id = (select auth.uid())
     AND ativo = true
     AND deleted_at IS NULL
   LIMIT 1;
  v_role := CASE
    WHEN v_role_db = 'recrutador'    THEN 'rh'
    WHEN v_role_db = 'administrador' THEN 'administrador'
    ELSE v_role_db
  END;
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Existence (P50 / D-01: ownership is no longer read). `IF NOT FOUND`, never «owner IS
  -- NULL»: a candidatura on a vaga without an author (orphan vaga) EXISTS and is not «nao
  -- encontrada» (BORDA, RESEARCH Pattern 4.5).
  PERFORM 1
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;
  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Shape guard.
  IF p_guia IS NULL OR jsonb_typeof(p_guia) <> 'object' THEN
    RAISE EXCEPTION 'guia invalida' USING ERRCODE = 'check_violation';
  END IF;

  -- Upsert — the single write-path. RNF-07a: never touches public.candidaturas.
  INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, updated_at)
       VALUES (p_candidatura_id, p_tipo, p_guia, now())
  ON CONFLICT (candidatura_id, tipo)
  DO UPDATE SET guia = EXCLUDED.guia, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'candidatura_id', p_candidatura_id, 'tipo', p_tipo);
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_revisao_redacao(p_redacao_id uuid, p_decisao text, p_notas text, p_scores_humanos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid        uuid := (select auth.uid());
  v_role       text;
  v_found      boolean;
  v_candidatura_id uuid;
BEGIN
  SELECT true, r.candidatura_id
    INTO v_found, v_candidatura_id
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v        ON v.id = c.vaga_id
   WHERE r.id = p_redacao_id;

  IF v_found IS NOT TRUE THEN
    RAISE EXCEPTION 'redacao % not found', p_redacao_id USING ERRCODE = 'no_data_found';
  END IF;

  v_role := (select auth.jwt() #>> '{app_metadata,role}');

  -- P50 / D-04: fail-closed. Sem coalesce, um papel nulo dava NULL no `NOT IN` e o IF NAO
  -- disparava; sub obrigatorio tambem (sem chamador identificado nao ha autor).
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem
  -- posse; token de recrutador desativado (o JWT vale ate 1 h) -> 42501. administrador passa.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_decisao NOT IN ('aprovado', 'reprovado', 'duvida') THEN
    RAISE EXCEPTION 'decisao invalida' USING ERRCODE = 'check_violation';
  END IF;

  IF p_notas IS NULL OR length(p_notas) < 50 THEN
    RAISE EXCEPTION 'notas_revisor exige no minimo 50 caracteres' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.redacoes_candidato
     SET scores_humanos = p_scores_humanos,
         notas_revisor  = p_notas,
         decisao_revisor = p_decisao,
         revisada_por   = (select auth.uid()),
         revisada_em    = now(),
         status_analise = CASE
           WHEN p_decisao = 'duvida' THEN status_analise
           ELSE 'concluida'
         END
   WHERE id = p_redacao_id;

  -- 2026-09-06: a linha que o consolidar-decisao-final pondera. Antes disto o peso
  -- `redacao_cultural` era N/A em TODA vaga (ver cabeçalho da migration).
  PERFORM public.sincronizar_score_redacao(v_candidatura_id);

  RETURN jsonb_build_object('ok', true, 'redacao_id', p_redacao_id, 'decisao', p_decisao);
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_pergunta_opcoes_metadata(p_pergunta_id uuid, p_opcoes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_opcao        jsonb;
  v_opcao_id     uuid;
  v_new_jsonb    jsonb := '[]'::jsonb;
  v_role         text;
  v_status       public.status_vaga;
BEGIN
  -- Authorization inside the DEFINER body (RLS does not apply here — must check explicitly):
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (A29) Resolve the pergunta's vaga (status) BEFORE any DELETE/regenerate (P50 / D-06: the
  --       owner is no longer read).
  SELECT v.status
    INTO v_status
    FROM public.perguntas_formulario p
    JOIN public.vagas v ON v.id = p.vaga_id
   WHERE p.id = p_pergunta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pergunta não encontrada' USING ERRCODE = 'no_data_found';
  END IF;

  -- (A29) Status hard-block — editing options of a non-rascunho vaga would orphan
  --       opcao_knockout_id / desync qualificacao_etapa1.
  IF v_status <> 'rascunho' THEN
    RAISE EXCEPTION 'Não é possível editar opções de uma vaga % (apenas rascunho).', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (A29) P50 / D-06 (was ownership, IDOR T-25-03): rh must be ACTIVE (live helper
  --       public.is_active_rh_user), any vaga; administrador bypasses. The rascunho
  --       hard-block above is unchanged.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Replace metadata for this pergunta (idempotent):
  DELETE FROM public.pergunta_opcao_metadata WHERE pergunta_id = p_pergunta_id;

  FOR v_opcao IN SELECT * FROM jsonb_array_elements(p_opcoes)
  LOOP
    -- ensure a stable opcao_id (generate if client sent null = new option / backfill):
    v_opcao_id := COALESCE(NULLIF(v_opcao->>'opcao_id','')::uuid, gen_random_uuid());

    -- accumulate the new opcoes_resposta jsonb in object shape [{id, texto}]:
    v_new_jsonb := v_new_jsonb || jsonb_build_object(
      'id',    v_opcao_id,
      'texto', v_opcao->>'texto'
    );

    INSERT INTO public.pergunta_opcao_metadata
      (pergunta_id, opcao_id, opcao_texto, tag, peso, nota_ia, ordem)
    VALUES (
      p_pergunta_id,
      v_opcao_id,
      v_opcao->>'texto',
      COALESCE(v_opcao->>'tag','neutro')::public.enum_tag_opcao,
      COALESCE((v_opcao->>'peso')::int, 0),
      v_opcao->>'nota_ia',
      COALESCE((v_opcao->>'ordem')::int, 0)
    );
  END LOOP;

  -- write the id-bearing jsonb back to the source of truth:
  UPDATE public.perguntas_formulario
     SET opcoes_resposta = v_new_jsonb, updated_at = now()
   WHERE id = p_pergunta_id;

  RETURN jsonb_build_object('pergunta_id', p_pergunta_id,
                            'opcoes_count', jsonb_array_length(v_new_jsonb));
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ACL (D-04): anon perde EXECUTE nas reescritas que o tinham (medido: 5). anon NOMEADO —
-- o pg_default_acl de public concede EXECUTE a anon como grant DIRETO; revogar só de
-- PUBLIC removeria um grant que nunca existiu. As outras 6 não têm anon: ACL intocada.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reprocessar_analise(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reprocessar_analise(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reprocessar_analise(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) TO authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- Comentários — a regra nova (o texto de contrato que não mudou fica).
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) IS
  'Phase 15 + Phase 25 / DECISAO-03 + FUNIL-02/09: captura a decisao final de RH gravando decisao_final (UNICO writer). por_usuario := auth.uid() SEMPRE (LGPD-02). UPSERT via ON CONFLICT(candidatura_id); historico de emendas arquivado pelo trigger snapshot_decisao_final. rejeitado -> set_config(app.rejeicao_sancionada=on, is_local) + UPDATE unico {etapa_atual, status, data_decisao_final, etapa_justificativa}; aprovado -> etapa_atual=aprovado + status=finalizado + data_decisao_final + justificativa; em_espera NAO muda etapa. Dispara avancar_etapa (UMA row). NUNCA auto-decide (RNF-07a). Phase 48 / 48-11 (JORN-19): (i) FAIL-CLOSED — papel com coalesce e sub obrigatorio, ANTES de ler a candidatura (sem JWT -> 42501, sem oraculo de existencia). (ii) D-23 — quem teve a decisao revertida (linha com revisao_veredito=revertida e decisao=rejeitado, na vigente OU em decisao_final_historico) nao registra a nova decisao do caso, qualquer p_decisao -> 42501; qualquer outro RH/admin decide. (iii) na NOVA decisao (aprovado/rejeitado) de uma linha REABERTA (reaberta_em IS NOT NULL) o ciclo e ZERADO no mesmo upsert (explicacao_solicitada_em, revisao_*, reaberta_em, prazo_nova_decisao_em, alerta_prazo_enviado_em) — depois de o snapshot AFTER UPDATE (que le OLD) te-lo arquivado nas colunas do ciclo de decisao_final_historico; sem isso a nova rejeicao pareceria revertida e o Art. 20 ficaria inalcancavel nela. A5: em_espera durante a reabertura NAO e nova decisao (ciclo e prazo continuam). Redecisao fora de reabertura: comportamento de antes, nada zerado. Texto vivo transcrito de pg_get_functiondef (o patch dinamico 20260826000004 nao deixava o corpo em arquivo). GRANT EXECUTE TO authenticated, service_role. P50 / D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) decide em QUALQUER candidatura, sem posse da vaga; token de recrutador desativado (JWT vale ate 1 h) -> 42501; administrador inalterado. D-23 intocado (D-08).';
COMMENT ON FUNCTION public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text) IS
  'Phase 31 / OPER-02/04: rejeicao auditada pelo RH em qualquer etapa. Server-authoritative: btrim + char_length(justificativa) >= 50 -> RAISE check_violation (contador do cliente e apenas UX). Motivo estruturado via enum motivo_rejeicao_rh (parametro; invalido -> 22P02), gravado ::text em candidaturas.motivo_rejeicao. UMA UPDATE seta etapa_atual=rejeitado + status=rejeitado (satisfaz guard_rejeicao_auditada) + etapa_justificativa (trigger avancar_etapa copia para historico_candidatura.criterio_texto e escreve UMA row; ator=auth.uid() -> auto_rejeitado=false, RNF-07a). NUNCA INSERT manual em historico_candidatura, NUNCA auto-rejeita por score. SECURITY DEFINER + search_path vazio; guard: role IN (rh,administrador) fail-closed (coalesce), ANTES da busca (sem oraculo de existencia); P50 / D-01, D-02, D-04 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem posse; token de recrutador desativado -> 42501; administrador bypassa. GRANT EXECUTE TO authenticated, service_role; REVOKE de PUBLIC e de anon NOMINALMENTE (pg_default_acl concede a anon como grant direto).';
COMMENT ON FUNCTION public.liberar_cognitivo(uuid, text) IS
  'Libera a avaliacao cognitiva para UMA candidatura. Papel rh/administrador (fail-closed, coalesce); P50 / D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem posse; token de recrutador desativado -> 42501. Nao libera para quem saiu do funil. Re-liberar uma revogada e permitido e limpa a revogacao. Ver 20260826000007.';
COMMENT ON FUNCTION public.revogar_cognitivo(uuid, text) IS
  'Revoga a liberacao da avaliacao cognitiva de UMA candidatura, sem apagar (o rastro de quem liberou e quando permanece). Papel rh/administrador (fail-closed, coalesce); P50 / D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem posse; token de recrutador desativado -> 42501. Candidatura inexistente ou removida -> no_data_found. Par de liberar_cognitivo.';
COMMENT ON FUNCTION public.reprocessar_analise(uuid) IS
  'Phase 10 / TRIAGEM-02: re-fires the analise-candidato-individual dispatch on demand (panel reprocess button / backfill). SECURITY DEFINER. P50 / D-04 (2026-10-05): guard FAIL-CLOSED — sub mandatory and role resolved with coalesce, so a caller with no role claim is refused BEFORE net.http_post (before, `v_role NOT IN` evaluated NULL and the IF was skipped); candidato/anon RAISE forbidden. P50 / D-01, D-02: role=rh must be ACTIVE (live helper public.is_active_rh_user), any vaga, no ownership; administrador bypasses. GRANT EXECUTE TO authenticated, service_role; REVOKE FROM PUBLIC and FROM anon by name (D-04).';
COMMENT ON FUNCTION public.confirmar_revisao_entrevista(uuid) IS
  'Marca revisao_confirmada_em/revisada_por na analise de entrevista — o marcador que o avancar_etapa le para LIBERAR a trava de lingua/sotaque (RF-24 / RNF-07a; o humano sempre decide). Phase 49 / 49-10: RECUSA com check_violation quando a analise nao e VIGENTE pelo predicado unico public.entrevista_analise_vigente (superada ou falha) — confirmar numa superada nao libera nada porque o portao so olha a vigente desde o 49-06, e confirmar numa falha liberaria o avanco sem ninguem ter lido analise nenhuma. Guard de papel fail-closed. P50 / D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) em qualquer candidatura, sem posse da vaga; token de recrutador desativado -> 42501. Assinatura inalterada.';
COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, jsonb, text) IS
  'COMPATIBILIDADE (bundle antigo em cache) — Phase 49 / 49-30: NAO escolhe mais a analise. Guard de papel fail-closed e, P50 / D-01, D-02 (2026-10-05), rh ATIVO pelo helper vivo public.is_active_rh_user (era a posse da vaga) primeiro; depois conta as vigentes da candidatura (uma por tipo desde o 49-10): 0 => no_data_found; mais de 1 => check_violation pedindo p_analise_id; exatamente 1 => delega a salvar_avaliacao_entrevista(uuid,uuid,jsonb,text). Antes (20260922000008) escolhia a vigente mais recente entre os dois tipos em silencio (CR-03).';
COMMENT ON FUNCTION public.salvar_avaliacao_entrevista(uuid, uuid, jsonb, text) IS
  'Registra a avaliacao humana da entrevista NA ANALISE QUE O CLIENTE NOMEIA (p_analise_id): scores_humanos, notas, revisao_confirmada_em, status concluida; e grava o score humano em scores_candidato tipo=entrevista (media BARS 1-5, score_max 5, status sucesso, metadata.analise_id) — a unica origem do status sucesso dessa linha (RNF-07a). Phase 49 / 49-30 (CR-03, D-39): a analise tem de ser DA candidatura (IDOR) e VIGENTE pelo predicado unico public.entrevista_analise_vigente. Nao achou: no_data_found; nao vigente: check_violation. Guard de papel fail-closed + P50 / D-01, D-02 (2026-10-05): rh ATIVO pelo helper vivo public.is_active_rh_user, em qualquer vaga (era a posse da vaga); token de recrutador desativado -> 42501. Sem DEFAULT (nao pode casar com a sobrecarga de 3).';
COMMENT ON FUNCTION public.save_entrevista_guia_edits(uuid, text, jsonb) IS
  'Phase 20 / ENTREV-06/07/08: grava edicoes do guia de entrevista via upsert ON CONFLICT (candidatura_id, tipo). SECURITY DEFINER + search_path=. AUTHZ: role de public.usuarios_rh (NAO claim JWT; ativo + deleted_at IS NULL; recrutador->rh, administrador->administrador); P50 / D-01, D-02 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem posse; administrador bypassa; candidato/sem papel -> 42501. Candidatura inexistente -> no_data_found por IF NOT FOUND (vaga sem autor nao e mais «nao encontrada»). NUNCA escreve candidaturas (RNF-07a). GRANT authenticated, service_role; REVOKE PUBLIC e anon NOMINALMENTE (D-04). Sem policy RH UPDATE ampla.';
COMMENT ON FUNCTION public.salvar_revisao_redacao(uuid, text, text, jsonb) IS
  'Grava a revisao humana da redacao cultural em redacoes_candidato E sincroniza a linha scores_candidato tipo=redacao (sincronizar_score_redacao). Antes de 2026-09-06 nao tocava scores_candidato e o peso redacao_cultural era sempre N/A na decisao final. P50 / D-04 (2026-10-05): guard FAIL-CLOSED — sub obrigatorio e papel com coalesce; sem papel o UPDATE de redacoes_candidato nao roda (antes `v_role NOT IN` dava NULL e o IF era pulado). P50 / D-01, D-02: rh ATIVO (helper vivo public.is_active_rh_user) em qualquer vaga, sem posse; administrador passa. GRANT authenticated, service_role; REVOKE PUBLIC e anon NOMINALMENTE.';
COMMENT ON FUNCTION public.upsert_pergunta_opcoes_metadata(uuid, jsonb) IS
  'Phase 7 + Phase 25 / VAGACFG-03 + FUNIL-11 (A29): atomic sync of opcoes_resposta jsonb (with stable opcao_id) and pergunta_opcao_metadata. Idempotent (DELETE+re-INSERT). Guards (in-body): role IN (rh,administrador), fail-closed (coalesce); the pergunta''s vaga must be rascunho (else P0001); P50 / D-06 (2026-10-05): rh must be ACTIVE (live helper public.is_active_rh_user), any vaga, no ownership (else 42501), administrador bypasses. Pergunta-not-found -> no_data_found. GRANT to authenticated, service_role; REVOKE PUBLIC and anon by name (D-04).';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  v_esc    text[] := string_to_array(nullif(current_setting('p50.p05.escopo', true), ''), ';');
  v_i      int;
  v_k      text;
  v_sig    text;
  v_oid    oid;
  v_src    text;
  v_cod    text;   -- prosrc SEM comentários `--`: as checagens de PRESENÇA leem o código, não a prosa
  v_props  text;
  v_acl    text;
  v_antes  text;
  v_depois text;
  v_lit    text;
  v_pos    int;
  v_esc1   int;
  v_ev     text[] := '{}';
  v_d08    text;
  v_d08n   int;
  v_rev    text;
  c_helper constant text := 'IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN';
  c_coal   constant text := 'coalesce(v_role, '''') NOT IN (''rh'', ''administrador'')';
BEGIN
  IF v_esc IS NULL OR cardinality(v_esc) IS DISTINCT FROM 11 THEN
    RAISE EXCEPTION 'P50-05 POS-PORTAO: escopo do pre-portao ausente ou incompleto (%) — o pre-portao nao rodou nesta transacao', v_esc;
  END IF;

  FOR v_i IN 1 .. cardinality(v_esc) LOOP
    v_sig := v_esc[v_i];
    v_k   := 'p50.p05.f' || v_i;
    v_oid := to_regprocedure(v_sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % sumiu (assinatura mudou?)', v_sig;
    END IF;
    SELECT p.prosrc,
           concat_ws(' | ',
             'config=' || coalesce(p.proconfig::text, '<nulo>'),
             'vol=' || p.provolatile::text,
             'definer=' || p.prosecdef::text,
             'lang=' || l.lanname,
             'dono=' || pg_get_userbyid(p.proowner),
             'kind=' || p.prokind::text,
             'strict=' || p.proisstrict::text,
             'leakproof=' || p.proleakproof::text,
             'parallel=' || p.proparallel::text,
             'cost=' || p.procost::text,
             'rows=' || p.prorows::text,
             'retset=' || p.proretset::text,
             'result=' || pg_get_function_result(p.oid),
             'args=' || pg_get_function_arguments(p.oid),
             'idargs=' || pg_get_function_identity_arguments(p.oid)),
           coalesce(p.proacl::text, '')
      INTO v_src, v_props, v_acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    -- Presença se prova no CÓDIGO (um comentário que cita o helper não chama o helper);
    -- ausência da coluna de autoria se prova no corpo INTEIRO, comentários inclusive.
    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

    -- (a) a linha de autorização nova, no código, exatamente UMA vez (D-01, D-02).
    IF position(c_helper IN v_cod) = 0
       OR (length(v_src) - length(replace(v_src, c_helper, ''))) / length(c_helper) <> 1 THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % nao tem exatamente uma «%» no codigo — um token de recrutador desativado passaria (ou a posse ficou)', v_sig, c_helper;
    END IF;
    -- (b) a posse saiu: nem a coluna de autoria (corpo inteiro), nem a variável que a guardava.
    IF v_src ~* 'created_by' THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % ainda casa created_by', v_sig;
    END IF;
    IF v_cod ~ '\mv_(vaga_)?owner\M' THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % ainda usa v_owner/v_vaga_owner — a posse nao saiu inteira', v_sig;
    END IF;
    -- (c) nenhuma guarda na forma que falha ABERTO com papel nulo; a forma única fail-closed
    --     presente (D-04). No código: o comentário P48-11 de registrar_decisao CITA a forma antiga.
    IF v_cod ~* '\mv_role\s+NOT\s+IN\s*\(' THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % tem guard `v_role NOT IN (` sem coalesce — falha ABERTO com v_role nulo (D-04)', v_sig;
    END IF;
    IF position(c_coal IN v_cod) = 0 THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % sem a guarda fail-closed «%» (D-04)', v_sig, c_coal;
    END IF;
    -- (d) assinatura, RETURNS, DEFINER, search_path, volatilidade, dono… iguais aos capturados.
    IF v_props IS DISTINCT FROM current_setting(v_k || '.props', true) THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: propriedades de % mudaram — antes «%», depois «%»', v_sig,
        current_setting(v_k || '.props', true), v_props;
    END IF;
    -- (e) ACL: PUBLIC sem EXECUTE, anon sem EXECUTE (D-04), authenticated e service_role com; e o
    --     conjunto (beneficiário, privilégio) é o capturado MENOS anon — nada mais mudou.
    IF v_acl = '' OR EXISTS (SELECT 1 FROM aclexplode(v_acl::aclitem[]) a WHERE a.grantee = 0) THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % com EXECUTE para PUBLIC (proacl «%»)', v_sig, v_acl;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: anon tem EXECUTE em % (D-04)', v_sig;
    END IF;
    IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: authenticated/service_role sem EXECUTE em % — a tela do RH deixaria de funcionar', v_sig;
    END IF;
    SELECT string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ',' ORDER BY a.grantee::regrole::text || ':' || a.privilege_type)
      INTO v_antes
      FROM (SELECT DISTINCT x.grantee, x.privilege_type
              FROM aclexplode(current_setting(v_k || '.acl', true)::aclitem[]) x
             WHERE x.grantee <> 'anon'::regrole::oid) a;
    SELECT string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ',' ORDER BY a.grantee::regrole::text || ':' || a.privilege_type)
      INTO v_depois
      FROM (SELECT DISTINCT x.grantee, x.privilege_type FROM aclexplode(v_acl::aclitem[]) x) a;
    IF v_depois IS DISTINCT FROM v_antes THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: ACL de % nao e a capturada menos anon — esperado «%», depois «%»', v_sig, v_antes, v_depois;
    END IF;
    -- (f) todo literal protegido presente no corpo vivo continua presente no código novo.
    FOREACH v_lit IN ARRAY coalesce(current_setting(v_k || '.lits', true), '{}')::text[] LOOP
      IF position(v_lit IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-05 POS-PORTAO: % perdeu o literal protegido «%» (presente no corpo vivo)', v_sig, v_lit;
      END IF;
    END LOOP;
    -- (g) CAUDA byte-idêntica: tudo depois do `THEN` da linha de autorização (RAISE com a mesma
    --     mensagem e errcode, D-23, mínimos de justificativa, RNF-07a, transições, escritas).
    IF md5(substr(v_src, position(c_helper IN v_src) + length(c_helper)))
       IS DISTINCT FROM current_setting(v_k || '.cauda', true) THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % mudou DEPOIS da linha de autorizacao — o corpo a partir dali tinha de ser o vivo, byte a byte', v_sig;
    END IF;
    -- (h) a ordem «guarda de papel antes da primeira leitura de tabela» é a de hoje (oper31 (f):
    --     candidato/anon recusado antes de qualquer busca — sem oráculo de existência).
    IF (position('NOT IN (''rh'', ''administrador'')' IN v_cod) > 0
        AND position('NOT IN (''rh'', ''administrador'')' IN v_cod) < position('FROM public.' IN v_cod))::text
       IS DISTINCT FROM current_setting(v_k || '.ordem', true) THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % mudou a ordem entre a guarda de papel e a primeira leitura de tabela (antes: guarda primeiro = %)', v_sig, current_setting(v_k || '.ordem', true);
    END IF;
    -- (i) a autorização vem ANTES da primeira escrita / despacho.
    SELECT min(nullif(position(w IN v_cod), 0)) INTO v_esc1
      FROM unnest(ARRAY['UPDATE public.', 'INSERT INTO public.', 'DELETE FROM public.',
                        'net.http_post(', 'RETURN public.']) AS w;
    IF v_esc1 IS NULL OR position(c_helper IN v_cod) > v_esc1 THEN
      RAISE EXCEPTION 'P50-05 POS-PORTAO: % nao autoriza o rh antes da primeira escrita (helper em %, escrita em %)', v_sig, position(c_helper IN v_cod), v_esc1;
    END IF;

    -- (j) por função.
    IF v_sig IN ('public.reprocessar_analise(uuid)', 'public.salvar_revisao_redacao(uuid,text,text,jsonb)') THEN
      -- D-04: as duas que falhavam ABERTO — sub obrigatório e papel com coalesce.
      IF position('IF v_uid IS NULL OR ' || c_coal || ' THEN' IN v_cod) = 0
         OR v_cod !~ '\mv_uid\s+uuid\s*:=\s*\(select auth\.uid\(\)\);' THEN
        RAISE EXCEPTION 'P50-05 POS-PORTAO: % sem a guarda fail-closed «IF v_uid IS NULL OR coalesce(…) NOT IN» ou sem v_uid := (select auth.uid()) (D-04)', v_sig;
      END IF;
    END IF;
    IF v_sig = 'public.save_entrevista_guia_edits(uuid,text,jsonb)' THEN
      -- BORDA: a inexistência é `IF NOT FOUND` (vaga sem autor existe).
      v_pos := position('PERFORM 1' IN v_cod);
      IF v_pos = 0 OR position('IF NOT FOUND THEN' IN substr(v_cod, v_pos)) = 0 THEN
        RAISE EXCEPTION 'P50-05 POS-PORTAO: save_entrevista_guia_edits sem «PERFORM 1 … IF NOT FOUND» — a candidatura de vaga sem autor voltaria a ser «nao encontrada»';
      END IF;
    END IF;
    IF v_sig LIKE 'public.registrar_decisao(%' THEN
      -- SC5 / D-23 (D-08): o decisor revertido continua sem poder re-rejeitar.
      IF position('d.por_usuario = v_uid' IN v_cod) = 0 OR position('h.por_usuario = v_uid' IN v_cod) = 0
         OR position('(D-23)' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-05 POS-PORTAO: registrar_decisao perdeu o D-23 (d.por_usuario = v_uid / h.por_usuario = v_uid)';
      END IF;
    END IF;

    v_ev := v_ev || (v_oid::regprocedure::text || '=' || md5(v_src));
  END LOOP;

  -- D-08: o motor de exclusão saiu desta transação exatamente como entrou.
  SELECT count(*)::int,
         string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
    INTO v_d08n, v_d08
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('anonimizar_candidato', 'plano_exclusao_titular');
  IF nullif(current_setting('p50.d08_antes_05', true), '') IS NULL
     OR v_d08 IS DISTINCT FROM current_setting('p50.d08_antes_05', true)
     OR v_d08n::text IS DISTINCT FROM current_setting('p50.d08_n_05', true) THEN
    RAISE EXCEPTION 'P50-05 POS-PORTAO: D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration (antes «%», depois «%»)',
      current_setting('p50.d08_antes_05', true), v_d08;
  END IF;

  -- REVISAO-05 (D-08): responder_revisao_decisao também.
  SELECT string_agg(p.oid::regprocedure::text || '=' || md5(to_jsonb(p)::text), ',' ORDER BY p.oid)
    INTO v_rev
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'responder_revisao_decisao';
  IF nullif(current_setting('p50.p05.rev05_antes', true), '') IS NULL
     OR v_rev IS DISTINCT FROM current_setting('p50.p05.rev05_antes', true) THEN
    RAISE EXCEPTION 'P50-05 POS-PORTAO: REVISAO-05 — responder_revisao_decisao mudou dentro desta migration (antes «%», depois «%»)',
      current_setting('p50.p05.rev05_antes', true), v_rev;
  END IF;

  PERFORM set_config('p50.evidencia',
    concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
              '05:' || array_to_string(v_ev, ','),
              '05:anon=false',
              '05:d08=igual:n=' || v_d08n::text),
    false);

  RAISE NOTICE 'P50-05 POS-PORTAO OK — 11 funcoes de escrita com o helper, sem posse, guardas fail-closed (coalesce), cauda byte-identica, propriedades iguais, anon sem EXECUTE ; D-23 intacto ; REVISAO-05 intacto ; D-08 igual (% sobrecargas)', v_d08n;
END
$pos_portao$;
