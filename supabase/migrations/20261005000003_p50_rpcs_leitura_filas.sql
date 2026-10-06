-- =============================================================================
-- 20261005000003 — as RPCs de LEITURA e de FILA passam a responder ao recrutador ATIVO
--                  exatamente como respondem ao administrador ; anon perde EXECUTE em funil_kpis
-- =============================================================================
-- Phase 50 / Plano 50-04 · EXPORT-05 (metade «visível ao RH», gap G4-b) · SC4 e a metade de
-- leitura do SC1 · D-01, D-02, D-03, D-04, D-08, D-12 · EXPANSÃO do tracer: o mesmo helper
-- (`public.is_active_rh_user()`, vivo desde o 50-02, migration 20261005000001).
--
-- POR QUE ESTAS SETE. São SECURITY DEFINER: o DEFINER ignora a RLS, e a linha de escopo do
--   corpo é o controle INTEIRO. O 0002 alargou as policies; estas funções seguiam escopando o
--   ramo `rh` pela POSSE da vaga dentro do próprio corpo, e por isso a tela do recrutador que
--   não criou a vaga continuava vazia (filas, KPIs, histórico, resposta do caso aberto).
--
-- O QUE ESTAVA ERRADO, POR FUNÇÃO (linha de autorização VERBATIM do PROD, RESEARCH §B/§F):
--   · listar_pedidos_dados(boolean), contar_pedidos_dados_pendentes() — ramo rh:
--       `OR (v_role = 'rh' AND EXISTS (SELECT 1 FROM public.candidaturas cd WHERE
--        cd.candidato_id = s.candidato_id AND cd.deleted_at IS NULL AND cd.is_rascunho = false
--        AND cd.vaga_id IN (SELECT vg.id FROM public.vagas vg WHERE vg.created_by = v_uid)))`
--     → o recrutador não via o pedido de dados de candidato de vaga alheia, nem o ÓRFÃO
--       (pedido de candidato sem candidatura), que é justamente o que queima o prazo do Art. 19, II.
--   · listar_revisoes_decisao(boolean), contar_revisoes_pendentes() — ramo rh:
--       `OR (v_role = 'rh' AND c.deleted_at IS NULL AND c.is_rascunho = false
--        AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))`
--   · funil_kpis(uuid) — nos 4 CTEs: `WHERE (v_is_admin OR v.created_by = v_uid)`. Sem guard de
--     papel e com EXECUTE para anon: o predicado era o ÚNICO escopo.
--   · listar_historico_candidatura(uuid): `IF v_role = 'rh' AND NOT EXISTS (SELECT 1 FROM
--     public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id AND c.id = p_candidatura_id
--     AND v.created_by = (select auth.uid())) THEN RAISE … 42501`.
--   · ler_resposta_caso_aberto_sjt(uuid): `SELECT v.created_by INTO v_dono … ;
--     IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN 42501`.
--
--   Decisão do operador (`44-PENDENCIAS-2026-10-03.md` §G4-b, 2026-10-04), verbatim: «acho nesse
--   momento melhor deixar o recrutador ver todas as vagas abertas, nao precisamos selecionar
--   neste momento, ou se achar melhor assiciar vagas a recrutadores, mas nao ele so ver as que
--   ele criou». 50-CONTEXT D-03: «SC4 lido no sentido estrito: as filas (`listar_pedidos_dados`,
--   `contar_pedidos_dados_pendentes`, `listar_revisoes_decisao`, `contar_revisoes_pendentes`)
--   devolvem ao recrutador ativo **exatamente** o que devolvem ao administrador, órfãos
--   inclusive.» D-04: «… revogar `EXECUTE` de `anon` nas funções reescritas que o têm.»
--   D-08: «Gates de dono por regra de negócio continuam: REVISAO-05 (decisor não responde à
--   própria revisão) e D-23; as funções de autoria … não são tocadas — em especial
--   `anonimizar_candidato` e `plano_exclusao_titular`, cujo md5 o smoke da 45 fixa.»
--
-- O QUE MUDA (e só isso — cada corpo abaixo é o `pg_get_functiondef` VIVO, copiado por programa):
--   · as 4 filas: o ramo rh vira `(v_role = 'rh' AND public.is_active_rh_user())` — o MESMO
--     conjunto do administrador, sem filtro próprio. Guard de papel, `v_uid IS NULL`,
--     `#variable_conflict use_column`, `LIMIT`, `ORDER BY` composto e `pode_responder`
--     (REVISAO-05, por chamador — D-08) ficam byte-idênticos;
--   · funil_kpis: `v_ve_tudo` (administrador, ou rh ativo pelo helper) nos 4 CTEs — nunca um
--     predicado incondicional; o estreitamento por `p_vaga_id` e o `candidatura_encerrada(`
--     (asserido pelos arquivos de prontidão p48/p49) ficam; anon perde EXECUTE (D-04);
--   · listar_historico_candidatura: a checagem de posse vira `IF v_role = 'rh' AND NOT
--     public.is_active_rh_user() THEN 42501`; o join em `vagas` (só servia à posse) sai;
--   · ler_resposta_caso_aberto_sjt: guard fail-closed igual; depois o helper do rh ANTES da
--     busca; depois a busca sem `vagas`, `NOT FOUND → P0002` para os dois papéis; o resto
--     (`disponivel`, `sem_resposta_enviada`, `indisponivel`, `removida`) byte-idêntico.
--   · Nenhum dos 7 tem guard na forma `v_role NOT IN (` sem `coalesce` (medido): nada a trocar.
--   · Assinatura, RETURNS, SECURITY DEFINER, search_path, volatilidade, dono e ACL ficam (exceto
--     a ACL de funil_kpis); o pós-portão compara com os valores capturados na MESMA transação.
--
-- MEDIDO EM PROD (2026-10-05, só leitura, `set transaction read only`, re-medido na execução
-- do 50-04 — igual ao RESEARCH §B):
--   função                                  md5(prosrc)                       vol  proconfig          anon
--   listar_pedidos_dados(boolean)           a161e8ca5a30cacdf2b33b770752f601  s    search_path=""     não
--   contar_pedidos_dados_pendentes()        fea910fd19a23a219307d1068024c06f  s    search_path=""     não
--   listar_revisoes_decisao(boolean)        d3d4c3a3b956af0f84f41b5c048c4ad9  s    search_path=""     não
--   contar_revisoes_pendentes()             14ef44037db54fa70304743ae8ef0010  s    search_path=""     não
--   funil_kpis(uuid)                        c4eb15744881377baac7c0e246d1a538  v    search_path=""     SIM
--   listar_historico_candidatura(uuid)      770e20574cd086d05db796939f8e9298  s    search_path=""     não
--   ler_resposta_caso_aberto_sjt(uuid)      6d15c5cc05edfc370eb48253541cbecd  s    search_path=""     não
--   Todas SECURITY DEFINER, plpgsql, dono postgres; nenhuma com EXECUTE para PUBLIC.
--   D-08: `public.anonimizar_candidato(uuid,boolean)` e `public.plano_exclusao_titular(uuid)`,
--   2 sobrecargas no total; md5(prosrc) 4624854408950110cbfebc971481145a / 35d451416c22e150e48a583d879fe48d.
--
-- D-08 POR CHECAGEM QUE TEM DE PASSAR. Este arquivo não nomeia as duas funções do motor de
--   exclusão em nenhuma forma de DDL. E prova que não as tocou DENTRO da própria transação: o
--   pré-portão guarda a impressão digital da LINHA INTEIRA de cada sobrecarga em `pg_proc`
--   (`md5(to_jsonb(p)::text)` — cobre corpo, ACL, config e dono, e não envelhece quando nasce
--   coluna), o pós-portão a recalcula; qualquer diferença aborta o apply inteiro.
--
-- LOCK. `CREATE OR REPLACE FUNCTION` atualiza a linha de `pg_proc` (lock de linha do catálogo,
--   sem lock de tabela de dados). `lock_timeout`/`statement_timeout` ficam no arquivo pela mesma
--   razão do 0002: o `p46apply.cjs migrate` manda o arquivo byte a byte e o md5 do ledger é o dele.
--
-- IDEMPOTÊNCIA: o pré-portão exige o md5(prosrc) medido; reaplicar por cima de si mesma aborta
--   (md5 novo ≠ medido) em vez de sobrescrever em silêncio. Nenhum DML de dado.
--
-- EVIDÊNCIA: a Management API não devolve NOTICE; o pós-portão ANEXA à GUC de sessão
--   `p50.evidencia` `04:<assinatura>=<md5 novo>,…` (7), `04:anon=false` e
--   `04:d08=igual:n=<sobrecargas>`, que o `scripts/p50_ensaio.cjs` copia na linha de veredito.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com COMMENT
-- adjacente é a forma exata do 42601, e o endpoint já roda a requisição inteira numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação). NÃO aplicar
-- antes da review bloqueante do 50-10 (D-12). Pré-requisito: 20261005000001 aplicada (helper).
-- Independe do 0002 (nenhuma destas funções lê a RLS que o 0002 muda: são DEFINER).
-- =============================================================================

-- Limites de espera e de posse do lock (ver «LOCK»).
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — helper vivo; os 7 corpos com o md5(prosrc) medido; captura das propriedades
-- (config, volatilidade, DEFINER, linguagem, dono, RETURNS, argumentos) e da ACL de cada uma em
-- GUCs locais `p50.p04.<nome>.props` / `.acl`; escopo em `p50.p04.escopo`; impressão digital
-- D-08 em `p50.d08_antes_04`.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  r       record;
  v_oid   oid;
  v_nome  text;
  v_md5   text;
  v_props text;
  v_acl   text;
  v_esc   text[] := '{}';
  v_d08   text;
  v_d08n  int;
  v_nomes int;
BEGIN
  IF to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P50-04 PRE-PORTAO: public.is_active_rh_user() nao existe — aplicar 20261005000001 primeiro (as 7 funcoes chamam o helper).';
  END IF;

  -- ESCOPO DELIBERADO deste arquivo, não fotografia (CLAUDE.md §Portões): as 7 assinaturas que
  -- ele reescreve, cada uma com o md5(prosrc) medido em 2026-10-05. Uma 8ª função com posse que
  -- nascesse depois não entra aqui — quem a pega é a varredura POR FORMA do smoke (50-07).
  FOR r IN
    SELECT * FROM (VALUES
      ('public.listar_pedidos_dados(boolean)',       'a161e8ca5a30cacdf2b33b770752f601'),
      ('public.contar_pedidos_dados_pendentes()',    'fea910fd19a23a219307d1068024c06f'),
      ('public.listar_revisoes_decisao(boolean)',    'd3d4c3a3b956af0f84f41b5c048c4ad9'),
      ('public.contar_revisoes_pendentes()',         '14ef44037db54fa70304743ae8ef0010'),
      ('public.funil_kpis(uuid)',                    'c4eb15744881377baac7c0e246d1a538'),
      ('public.listar_historico_candidatura(uuid)',  '770e20574cd086d05db796939f8e9298'),
      ('public.ler_resposta_caso_aberto_sjt(uuid)',  '6d15c5cc05edfc370eb48253541cbecd')
    ) AS e(sig, md5)
  LOOP
    v_oid := to_regprocedure(r.sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P50-04 PRE-PORTAO: % nao existe — medir de novo e decidir A MAO.', r.sig;
    END IF;
    SELECT p.proname,
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
      INTO v_nome, v_md5, v_props, v_acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    IF v_md5 IS DISTINCT FROM r.md5 THEN
      RAISE EXCEPTION 'P50-04 PRE-PORTAO: md5(prosrc) de % = % (medido em 2026-10-05: %) — alguem mudou o corpo depois da medicao (ou esta migration ja rodou); este arquivo transcreveu o corpo medido e apagaria a mudanca em silencio. Medir de novo e reconciliar A MAO.', r.sig, v_md5, r.md5;
    END IF;
    IF v_acl = '' THEN
      RAISE EXCEPTION 'P50-04 PRE-PORTAO: % com proacl NULO (= EXECUTE para PUBLIC por padrao) — medido com ACL explicita; medir de novo e decidir A MAO.', r.sig;
    END IF;
    PERFORM set_config('p50.p04.' || v_nome || '.props', v_props, true);
    PERFORM set_config('p50.p04.' || v_nome || '.acl', v_acl, true);
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
    RAISE EXCEPTION 'P50-04 PRE-PORTAO: D-08 — so % dos 2 nomes do motor de exclusao (anonimizar_candidato, plano_exclusao_titular) existem em public (% sobrecargas); sem os dois a prova antes = depois seria vacua. Medir de novo e decidir A MAO.', v_nomes, v_d08n;
  END IF;
  PERFORM set_config('p50.d08_antes_04', v_d08, true);
  PERFORM set_config('p50.d08_n_04', v_d08n::text, true);

  PERFORM set_config('p50.p04.escopo', array_to_string(v_esc, ';'), true);
  RAISE NOTICE 'P50-04 PRE-PORTAO OK — helper presente ; % funcoes com md5(prosrc) medido ; D-08: % sobrecargas capturadas', cardinality(v_esc), v_d08n;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- As 4 filas (SC4 por construção, D-03) — corpo VIVO; só o ramo rh muda.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_pedidos_dados(p_incluir_atendidos boolean DEFAULT true)
 RETURNS TABLE(id uuid, candidato_id uuid, candidato_nome text, situacao text, causa text, solicitado_em timestamp with time zone, atendido_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- GUARD DE PAPEL, NULL-SAFE. `IS DISTINCT FROM` e NUNCA `NOT IN`: com v_role NULL
  -- (chamador sem JWT) a expressão `NOT IN` avalia NULL, o `IF` não é tomado, e o
  -- guard FALHA ABERTO justamente para o chamador mais suspeito. Em SECURITY
  -- DEFINER isso é grave porque o DEFINER bypassa RLS e o guard do corpo é o ÚNICO
  -- controle. Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
      s.id,
      s.candidato_id,
      -- LEFT JOIN, não INNER: um pedido cujo candidato não é resolvível continua
      -- aparecendo na fila (a UI mostra "Não identificado"). Sumir com a linha
      -- esconderia justamente o pedido que consome prazo sem ter dono.
      ca.nome_completo::text,
      s.situacao::text,
      s.causa::text,
      s.solicitado_em,
      s.atendido_em
    FROM public.solicitacoes_dados s
    LEFT JOIN public.candidatos ca ON ca.id = s.candidato_id
   WHERE s.tipo = 'acesso'
     AND (p_incluir_atendidos OR s.situacao = 'pendente')
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de contar_pedidos_dados_pendentes.
     -- O administrador vê a fila inteira, INCLUSIVE os órfãos (pedido de candidato
     -- sem candidatura nenhuma): o órfão é precisamente o pedido que queima o
     -- relógio do Art. 19, II sem ter dono natural, e o admin é esse dono.
     -- P50 / D-03 (2026-10-05): o ramo rh é o conjunto do administrador — o rh ATIVO (helper
     -- vivo; o token de um recrutador desativado fica de fora) vê EXATAMENTE a mesma fila,
     -- órfãos inclusive. Antes o ramo rh tinha filtro próprio (candidatura viva, não-rascunho,
     -- em vaga que o próprio recrutador criou) e escondia itens de quem não criou a vaga.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh' AND public.is_active_rh_user())
         )
   -- ORDENAÇÃO COMPOSTA: não atendidos primeiro (do mais antigo ao mais recente),
   -- depois os atendidos (do mais recente ao mais antigo). Ver o COMMENT abaixo —
   -- ela é o que torna VERDADEIRO o aviso de corte da tela.
   ORDER BY (s.situacao = 'atendido'),
            CASE WHEN s.situacao = 'pendente' THEN s.solicitado_em END ASC,
            CASE WHEN s.situacao = 'atendido' THEN s.solicitado_em END DESC
   LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contar_pedidos_dados_pendentes()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
  v_n    integer;
BEGIN
  -- Guard NULL-safe idêntico ao da seção 3. Ver o comentário de lá.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.solicitacoes_dados s
   WHERE s.tipo = 'acesso'
     AND s.situacao = 'pendente'
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de listar_pedidos_dados.
     -- P50 / D-03 (2026-10-05): o ramo rh é o conjunto do administrador — o rh ATIVO (helper
     -- vivo; o token de um recrutador desativado fica de fora) vê EXATAMENTE a mesma fila,
     -- órfãos inclusive. Antes o ramo rh tinha filtro próprio (candidatura viva, não-rascunho,
     -- em vaga que o próprio recrutador criou) e escondia itens de quem não criou a vaga.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh' AND public.is_active_rh_user())
         );

  RETURN v_n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.listar_revisoes_decisao(p_incluir_respondidos boolean DEFAULT false)
 RETURNS TABLE(candidatura_id uuid, candidato_nome text, vaga_titulo text, decisao text, decidido_por_nome text, revisao_solicitada_em timestamp with time zone, revisao_respondida_em timestamp with time zone, revisao_veredito text, revisao_resultado text, respondida_por_nome text, pode_responder boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
      d.candidatura_id,
      ca.nome_completo::text,
      vg.titulo::text,
      d.decisao::text,
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      d.revisao_solicitada_em,
      d.revisao_respondida_em,
      d.revisao_veredito,
      d.revisao_resultado,
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.revisao_por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)
    FROM public.decisao_final d
    JOIN public.candidaturas c  ON c.id  = d.candidatura_id
    JOIN public.candidatos   ca ON ca.id = c.candidato_id
    JOIN public.vagas        vg ON vg.id = c.vaga_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)
     -- P50 / D-03 (2026-10-05): o ramo rh é o conjunto do administrador — o rh ATIVO (helper
     -- vivo; o token de um recrutador desativado fica de fora) vê EXATAMENTE a mesma fila,
     -- órfãos inclusive. Antes o ramo rh tinha filtro próprio (candidatura viva, não-rascunho,
     -- em vaga que o próprio recrutador criou) e escondia itens de quem não criou a vaga.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh' AND public.is_active_rh_user())
         )
   ORDER BY d.revisao_solicitada_em ASC
   LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION public.contar_revisoes_pendentes()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
  v_n    integer;
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.decisao_final d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND d.revisao_respondida_em IS NULL
     -- P50 / D-03 (2026-10-05): o ramo rh é o conjunto do administrador — o rh ATIVO (helper
     -- vivo; o token de um recrutador desativado fica de fora) vê EXATAMENTE a mesma fila,
     -- órfãos inclusive. Antes o ramo rh tinha filtro próprio (candidatura viva, não-rascunho,
     -- em vaga que o próprio recrutador criou) e escondia itens de quem não criou a vaga.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh' AND public.is_active_rh_user())
         );

  RETURN v_n;
END;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- funil_kpis — escopo por v_ve_tudo nos 4 CTEs (D-02, D-04); anon perde EXECUTE.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  -- P50 / D-02, D-04 (2026-10-05): o escopo é v_ve_tudo — administrador, ou rh ATIVO pelo
  -- helper vivo — e ele é o ÚNICO controle desta função (ela não tem guard de papel). Nunca
  -- um predicado incondicional: anon (que perde EXECUTE aqui), candidato, sem claims e o token
  -- de um recrutador desativado recebem KPIs vazios. Antes: administrador OU posse da vaga.
  v_role     text    := (select auth.jwt() #>> '{app_metadata,role}');
  v_ve_tudo  boolean := coalesce(v_role = 'administrador' OR (v_role = 'rh' AND public.is_active_rh_user()), false);
  r          jsonb;
BEGIN
  WITH scoped_hist AS (
    SELECT h.candidatura_id, h.etapa_de, h.etapa_para, h.criado_em, c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE v_ve_tudo
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  deltas AS (
    SELECT etapa_para AS stage,
           (LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) - criado_em) AS dwell
      FROM scoped_hist
  ),
  median AS (
    SELECT stage, percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM dwell)) AS median_seconds
      FROM deltas WHERE dwell IS NOT NULL GROUP BY stage
  ),
  conversion AS (
    SELECT etapa_de AS from_stage, etapa_para AS to_stage, COUNT(*) AS n
      FROM scoped_hist WHERE etapa_de IS NOT NULL GROUP BY etapa_de, etapa_para
  ),
  -- Phase 48 / JORN-26 (D6): o volume de uma etapa de TRABALHO nao conta candidatura
  -- encerrada (knockout em `inscricao`, `finalizado` legado parado em etapa de
  -- trabalho). Os baldes terminais `aprovado`/`rejeitado` contam tudo o que esta
  -- neles, como antes. O knockout segue medido em `knockout_rate`.
  volume AS (
    SELECT c.etapa_atual AS stage, COUNT(*) AS n
      FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
     WHERE v_ve_tudo
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND (c.etapa_atual IN ('aprovado', 'rejeitado')
            OR NOT public.candidatura_encerrada(c.etapa_atual, c.status))
     GROUP BY c.etapa_atual
  ),
  tth AS (
    SELECT EXTRACT(EPOCH FROM (sh.criado_em - COALESCE(c.data_candidatura, c.created_at))) AS secs
      FROM scoped_hist sh
      JOIN public.candidaturas c ON c.id = sh.candidatura_id
     WHERE sh.etapa_para = 'aprovado'
       AND COALESCE(c.data_candidatura, c.created_at) IS NOT NULL
       AND sh.criado_em >= COALESCE(c.data_candidatura, c.created_at)
  ),
  ko AS (
    SELECT count(*) FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico') AS knockouts,
           count(*)                                                          AS total
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE v_ve_tudo
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  ),
  drop_flow AS (
    SELECT sh.etapa_de AS stage,
           count(*) FILTER (WHERE sh.etapa_para = 'rejeitado') AS dropped,
           count(*)                                            AS saidas
      FROM scoped_hist sh
     WHERE sh.etapa_de IS NOT NULL
       AND sh.etapa_de <> sh.etapa_para
       AND sh.etapa_de NOT IN ('aprovado', 'rejeitado')
     GROUP BY sh.etapa_de
  ),
  ns AS (
    SELECT count(*) FILTER (WHERE a.compareceu = false) AS no_shows,
           count(*)                                     AS total
      FROM public.agendamentos_entrevista a
      JOIN public.candidaturas c ON c.id = a.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE v_ve_tudo
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND a.deleted_at IS NULL
       AND a.compareceu IS NOT NULL
  )
  SELECT jsonb_build_object(
    'median_time_per_stage', COALESCE((SELECT jsonb_object_agg(stage, round(median_seconds)::bigint) FROM median), '{}'::jsonb),
    'conversion_stage_to_stage', COALESCE((SELECT jsonb_agg(jsonb_build_object('de', from_stage, 'para', to_stage, 'n', n)) FROM conversion), '[]'::jsonb),
    'volume_by_stage', COALESCE((SELECT jsonb_object_agg(stage, n) FROM volume), '{}'::jsonb),
    'time_to_hire', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs))::bigint FROM tth WHERE secs IS NOT NULL),
    'knockout_rate', (SELECT jsonb_build_object(
        'knockouts', knockouts, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(knockouts::numeric / total, 4) ELSE NULL END) FROM ko),
    'drop_per_stage', COALESCE((SELECT jsonb_object_agg(stage, jsonb_build_object(
        'dropped', dropped, 'saidas', saidas,
        'taxa', CASE WHEN saidas > 0 THEN round(dropped::numeric / saidas, 4) ELSE NULL END)) FROM drop_flow), '{}'::jsonb),
    'no_show_rate', (SELECT jsonb_build_object(
        'no_shows', no_shows, 'total', total,
        'taxa', CASE WHEN total > 0 THEN round(no_shows::numeric / total, 4) ELSE NULL END) FROM ns)
  ) INTO r;
  RETURN r;
END;
$function$;

REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.funil_kpis(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.funil_kpis(uuid) TO authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- Leituras de uma candidatura — histórico e resposta do caso aberto.
-- (As outras 6 funções não têm EXECUTE para anon nem para PUBLIC — medido; CREATE OR REPLACE
-- preserva a ACL, e o pós-portão a compara com a capturada.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_historico_candidatura(p_candidatura_id uuid)
 RETURNS TABLE(etapa_de etapa_processo, etapa_para etapa_processo, ator_rotulo text, criterio_texto text, criado_em timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- (1) GUARD DE PAPEL — PRIMEIRO STATEMENT, E NULL-SAFE.
  --
  -- ⚠ `IS DISTINCT FROM`, NUNCA o idioma difundido `NOT IN ('rh','administrador')`.
  -- Com a claim ausente a expressão de pertinência negativa avalia NULL, o `IF` **não
  -- é tomado**, e o guard FALHA ABERTO exatamente para o chamador mais suspeito.
  -- Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  --
  -- ⚠ E aqui ele é o ÚNICO controle contra um vazamento NOVO: a policy própria do
  -- candidato (`candidato_le_proprio_historico`, 20260607000006:60-70) continua VIVA,
  -- então o candidato não é recusado pelo banco — só por este guard. Sem ele, o
  -- `GRANT EXECUTE TO authenticated` abaixo entregaria `nome_completo` de recrutadores
  -- a qualquer candidato autenticado.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas rh ou administrador podem ler o historico da candidatura'
      USING ERRCODE = '42501';
  END IF;

  -- (2) ESCOPO — P50 / D-01, D-02 (2026-10-05).
  --
  -- ⚠ `SECURITY DEFINER` BYPASSA a RLS de linha: a regra de `rh_le_historico` tem de ser
  -- reimposta AQUI. A regra mudou: até a Phase 50 o ramo `rh` era escopado pela POSSE da vaga
  -- (o recrutador só lia candidaturas de vagas criadas por ele); agora o recrutador ATIVO lê o
  -- histórico de QUALQUER candidatura, como o administrador (D-01: «Recrutador ativo vê
  -- **todas** as vagas e tudo que pende delas»).
  --
  -- O que este bloco ainda recusa é o token ANTIGO: o JWT vive 3600 s e desativar não desloga,
  -- então um recrutador desativado segue com a claim `rh` por até 1 h. O helper vivo
  -- `public.is_active_rh_user()` lê `usuarios_rh.ativo` em tempo real (D-02). Sem este bloco,
  -- o token velho leria o histórico de todas as candidaturas.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas rh ativo ou administrador podem ler o historico da candidatura'
      USING ERRCODE = '42501';
  END IF;

  -- (3) A PROJEÇÃO E OS QUATRO RÓTULOS (D-47-U08).
  --
  -- ⚠ A ORDEM DOS RAMOS É CONTRATO, NÃO ESTILO. O ramo de ator nulo vem PRIMEIRO:
  -- se ele não viesse, a comparação `h.ator = cand.user_id` avaliaria NULL para a
  -- transição automática, o `CASE` cairia no `ELSE`, e "Sistema" viraria "Recrutador
  -- removido" — a colisão que a Correção factual 3 da 47-UI-SPEC identificou,
  -- reintroduzida por ordem de cláusula. `ator IS NULL` JÁ significa "Sistema" hoje
  -- (`HistoricoBlock.tsx:68`), e é o caso MAJORITÁRIO da trilha.
  RETURN QUERY
  SELECT h.etapa_de,
         h.etapa_para,
         CASE
           -- 1 · transição automática/serviço: `ator` nulo (D-09). O RAMO É O PRIMEIRO.
           WHEN h.ator IS NULL THEN 'Sistema'::text
           -- 2 · o ator é o próprio titular daquela candidatura (a inscrição, tipicamente)
           WHEN h.ator = cand.user_id THEN 'O próprio candidato'::text
           -- 3 · resolveu para um usuário RH vivo → o NOME COMPLETO, nunca abreviado.
           --     ⚠ `::text` OBRIGATÓRIO: `nome_completo` é varchar(255) e `RETURN QUERY`
           --     sob `RETURNS TABLE` exige IDENTIDADE de tipo — sem o cast, 42804 em
           --     TODA chamada bem-sucedida. Já aconteceu neste repositório.
           WHEN u.nome_completo IS NOT NULL THEN u.nome_completo::text
           -- 4 · ator NÃO-nulo que não resolve para nenhum usuário vivo → falha de
           --     RESOLUÇÃO (nunca derivada de `ator IS NULL`, que é o ramo 1).
           ELSE 'Recrutador removido'::text
         END,
         h.criterio_texto,
         h.criado_em
    FROM public.historico_candidatura h
    JOIN public.candidaturas cv   ON cv.id = h.candidatura_id
    JOIN public.candidatos   cand ON cand.id = cv.candidato_id
    -- ⚠ ARMADILHA 1, DESARMADA AQUI: a junção é por `u.user_id`, NUNCA por `u.id`.
    -- `ator` é FK para **auth.users** (20260607000001:43); `usuarios_rh.id` é a PK
    -- interna e nunca aparece em `historico_candidatura`. Junção pelo outro lado ⇒
    -- ZERO linhas resolvem e todas caem no ramo 4, em silêncio.
    --
    -- ⚠ `u.deleted_at IS NULL` vive NO `ON`, jamais no `WHERE`: no `WHERE` o `LEFT
    -- JOIN` viraria `INNER` e apagaria justamente as linhas que o ramo 4 existe para
    -- mostrar. E só `deleted_at` participa — `ativo = false` com `deleted_at` nulo
    -- CONTINUA exibindo o nome: desativado não é removido, e quem agiu naquela data
    -- agiu (regra travada da 47-UI-SPEC).
    LEFT JOIN public.usuarios_rh u
           ON u.user_id = h.ator
          AND u.deleted_at IS NULL
   WHERE h.candidatura_id = p_candidatura_id
   ORDER BY h.criado_em DESC
   LIMIT 100;   -- espelha o bound defensivo que o serviço já aplica hoje (WR-05)
END;
$function$;

CREATE OR REPLACE FUNCTION public.ler_resposta_caso_aberto_sjt(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_resp  jsonb;
BEGIN
  -- (i) Guarda de papel ANTES de qualquer leitura (não revela existência a quem não é RH).
  --     Fail-closed: sem `sub` recusa; sem papel recusa.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (ii) P50 / D-01, D-02 (2026-10-05): o rh tem de ser ATIVO (helper vivo — o JWT de um
  --      recrutador desativado vale até 1 h), checado ANTES da busca: o token velho não
  --      aprende se a candidatura existe. A posse da vaga deixou de ser regra: para o rh ativo
  --      toda candidatura está no escopo, então «inexistente» e «alheia» não precisam mais dar o
  --      mesmo 42501 — inexistente dá P0002 aos dois papéis. Sem filtro de `deleted_at`, como antes.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = p_candidatura_id) THEN
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

  -- (iv) O texto gravado. `removida` não nomeia causa: o marcador prova a redação pelo motor,
  --      e o motor grava o mesmo marcador no direito do titular e na purga de retenção.
  SELECT ra.respostas INTO v_resp
    FROM public.respostas_avaliacao ra
   WHERE ra.candidatura_id = p_candidatura_id
     AND ra.teste = 'sjt_caso_aberto';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object' AND v_resp ? 'redigido' THEN
    RETURN jsonb_build_object('situacao', 'removida', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object'
     AND jsonb_typeof(v_resp -> 'texto') = 'string'
     AND btrim(v_resp ->> 'texto') <> '' THEN
    RETURN jsonb_build_object('situacao', 'disponivel', 'texto', v_resp ->> 'texto');
  END IF;
  RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
END
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Comentários — a regra nova (o texto de contrato que não mudou fica).
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.listar_pedidos_dados(boolean) IS
  'Phase 44 / EXPORT-05 (LGPD Art. 18, II / Art. 19, II): fila de SUPERVISAO dos pedidos de copia de dados. RETURNS TABLE com EXATAMENTE 7 colunas nomeadas — jamais a row inteira: RLS e row-level e nao esconde coluna, e a fila e sobre o PEDIDO e nao sobre o DADO (Invariante 5 da 44-UI-SPEC). Zero e-mail, CPF, documento ou caminho de Storage. SECURITY DEFINER + STABLE com search_path vazio, porque o nome do candidato vive em public.candidatos atras de RLS que um recrutador nao atravessa para candidato que nao e dele. Como o DEFINER bypassa RLS, o escopo e predicado EXPLICITO (BD-8): administrador ve tudo, INCLUSIVE os orfaos (pedido de candidato sem candidatura nenhuma) — o orfao e justamente o pedido que consome prazo legal sem ter dono natural, e o admin e esse dono; P50 / D-03 (2026-10-05): rh ATIVO (helper vivo public.is_active_rh_user; token de recrutador desativado fica de fora) ve EXATAMENTE a fila do administrador, orfaos inclusive — sem posse da vaga e sem filtro proprio do ramo rh. ⚠ INVARIANTE: este predicado e o de contar_pedidos_dados_pendentes sao O MESMO. Se divergirem, o badge do menu conta o que a tela nao mostra, e o operador vai cacar trabalho invisivel num relogio de 15 dias corridos. Filtro fixo tipo = ''acesso'' no SERVIDOR: sem ele, as linhas de exclusao da Phase 45 entram nesta tela em silencio. Guard NULL-safe com IS DISTINCT FROM (nunca NOT IN, que falha ABERTO para chamador sem claim); recusa 42501. ⚠ ORDENACAO COMPOSTA (nao atendidos ASC, depois atendidos DESC) e cap de 200 linhas no servidor. A ordenacao e o que torna VERDADEIRA a copy do aviso de corte ("todos os nao atendidos aparecem; os atendidos mais antigos podem ter ficado de fora"). MUDAR ESTA ORDENACAO SEM MUDAR AQUELA COPY FAZ A FILA MENTIR POR OMISSAO. REVOKE de PUBLIC e de anon NOMINALMENTE (o pg_default_acl de public concede EXECUTE a anon em todo CREATE FUNCTION, como grant direto: revogar so de PUBLIC remove um grant que nunca existiu), GRANT EXECUTE a authenticated.';
COMMENT ON FUNCTION public.contar_pedidos_dados_pendentes() IS
  'Phase 44 / EXPORT-05: contagem dos pedidos de acesso PENDENTES que alimenta o badge do menu do RH. SECURITY DEFINER + STABLE com search_path vazio, com o MESMO guard de papel, o MESMO filtro tipo = ''acesso'' e o MESMO escopo do BD-8 de listar_pedidos_dados. ⚠ SE OS DOIS PREDICADOS DIVERGIREM, O BADGE CONTA O QUE A FILA NAO MOSTRA — e aqui esse trabalho invisivel corre contra o prazo de 15 dias corridos do Art. 19, II. O smoke (m) assere a igualdade entre esta contagem e as linhas pendentes devolvidas pela fila, em dois papeis distintos, exatamente para que essa divergencia nao possa nascer em silencio. Sem cap: um contador truncado mentiria por construcao. Guard NULL-safe com IS DISTINCT FROM; recusa 42501. REVOKE de PUBLIC e de anon NOMINALMENTE, GRANT EXECUTE a authenticated. P50 / D-03 (2026-10-05): no escopo, rh ATIVO (helper vivo public.is_active_rh_user) = administrador, orfaos inclusive — sem posse da vaga.';
COMMENT ON FUNCTION public.listar_revisoes_decisao(boolean) IS
  'Leitor da fila de revisao Art. 20 (REVISAO-02). RETURNS TABLE com 11 colunas NOMEADAS — nunca SETOF decisao_final, que arrastaria toda coluna futura — e NAO projeta decisao_final.justificativa (texto interno do recrutador). Escopo explicito DENTRO do DEFINER porque SECURITY DEFINER bypassa RLS — P50 / D-03 (2026-10-05): administrador, ou rh ATIVO pelo helper vivo public.is_active_rh_user, com a MESMA fila (sem posse da vaga, sem filtro proprio do ramo rh). Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501) e sub obrigatorio. pode_responder (por chamador: REVISAO-05, intocado — D-08) e espelho COSMETICO do guard — quem impede e o RPC de escrita. REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';
COMMENT ON FUNCTION public.contar_revisoes_pendentes() IS
  'Contador de revisoes Art. 20 pendentes para o badge da sidebar do RH. Mesmo escopo de listar_revisoes_decisao (P50 / D-03, 2026-10-05: administrador, ou rh ATIVO pelo helper vivo public.is_active_rh_user — a MESMA fila do administrador, sem posse da vaga), reimplementado dentro do DEFINER. Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501, nunca no-op) e sub obrigatorio. Recusa: 42501 se o papel nao for rh/administrador. REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';
COMMENT ON FUNCTION public.funil_kpis(uuid) IS
  'Phase 32 (3 keys) + Phase 34 KPI-04 (4 keys). SECURITY DEFINER, scoped by v_ve_tudo (P50 / D-02, D-04, 2026-10-05: administrador, or rh ATIVO by the live helper public.is_active_rh_user — every vaga; anyone else, including a deactivated recrutador with a still-valid token, gets empty KPIs; no unconditional predicate; anon has no EXECUTE), PII-free by construction (never ator/candidatos). Keys: median_time_per_stage, conversion_stage_to_stage, volume_by_stage (P32) + time_to_hire, knockout_rate, drop_per_stage, no_show_rate (0-agendamento -> taxa=null). Single-arg (uuid) all-time cohort. Proven by supabase/tests/funil34_kpis_smokes.sql. Phase 48 / JORN-26 (D6): volume_by_stage of a WORKING stage excludes candidaturas encerradas (public.candidatura_encerrada — knockout in inscricao, legacy finalizado); the terminal buckets aprovado/rejeitado count everything in them, as before. Proven by supabase/tests/p48_candidatura_encerrada_smoke.sql (g).';
COMMENT ON FUNCTION public.listar_historico_candidatura(uuid) IS
  'Phase 47 / CONSOL-02 (VISRH-03): le a trilha de transicoes de UMA candidatura com o ROTULO de quem agiu ja resolvido no servidor. O uuid do ator NUNCA sai da funcao. STABLE SECURITY DEFINER com search_path vazio. Existe para que a tela de RH nunca precise de acesso a usuarios_rh (admin-only desde a SEG-02). CHAVE DE JUNCAO: usuarios_rh.user_id = historico_candidatura.ator. ⚠ NAO e a chave do precedente listar_matriz_retencao, que junta pela PK interna: ator e FK de auth.users (20260607000001:43), nao de usuarios_rh. usuarios_rh tem AS DUAS colunas e ambas sao uuid, entao a juncao pelo lado errado nao falha — ela resolve ZERO linhas em silencio. CAST: nome_completo e varchar(255) e o RETURNS TABLE declara text; sem ::text a funcao levanta 42804 em toda chamada bem-sucedida (defeito ja shippado nesta coluna, STATE.md:752). ESCOPO NO CORPO (P50 / D-01, D-02, 2026-10-05): DEFINER bypassa a RLS rh_le_historico, e o bloco 2 reimpoe a regra dela — administrador, ou rh ATIVO pelo helper vivo public.is_active_rh_user, em QUALQUER candidatura (sem posse da vaga). O token de um recrutador desativado (JWT vale ate 1 h) recebe 42501. Sem esse bloco o token velho leria tudo, em silencio. GUARD DE PAPEL NULL-SAFE (IS DISTINCT FROM, nunca NOT IN — o NOT IN falha ABERTO com claim nula, defeito medido na 42-06): e o unico controle que impede o CANDIDATO de chamar esta funcao, porque a policy candidato_le_proprio_historico continua VIVA no banco e o GRANT e a authenticated. QUATRO ROTULOS, e a ORDEM DOS RAMOS e contrato: (1) ator nulo -> Sistema, PRIMEIRO ramo; (2) ator = user_id do titular -> O proprio candidato; (3) resolveu para RH vivo -> nome_completo completo, nunca abreviado; (4) nao resolveu -> Recrutador removido. Se (1) nao vier primeiro, a comparacao com o titular avalia nulo, cai no ELSE, e Sistema vira Recrutador removido. deleted_at IS NULL vive no ON do LEFT JOIN (no WHERE viraria INNER e apagaria as linhas do rotulo 4); ativo NAO participa — desativado nao e removido e quem agiu naquela data agiu. ⚠ RESIDUO DECLARADO, ACEITO POR DECISAO (D-47-U09): depois de uma exclusao da Phase 45 o ponteiro do titular e severado (ator := NULL, 20260805000006) e a linha de inscricao passa a ler Sistema. Um 5o rotulo descreveria o fato — e informaria a um recrutador, numa tela de funil, que aquela pessoa exerceu o direito de exclusao, vazamento proibido textualmente pela Invariante 9 da 45-UI-SPEC. Entre imprecisao de autoria numa linha e vazamento de exercicio de direito, o contrato escolhe a imprecisao — escrita aqui, nao descoberta depois.';
COMMENT ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) IS
  'P49-44 / WR-07: devolve ao RH o texto que o candidato gravou na resposta do caso aberto da SJT, para revisar o sinal da Decisao Final. P50 / D-01, D-02 (2026-10-05): administrador, ou rh ATIVO pelo helper vivo public.is_active_rh_user, checado ANTES da busca — qualquer candidatura, sem posse da vaga; guarda fail-closed (sem sub ou sem papel: 42501). Candidatura inexistente: P0002 (no_data_found) para os dois papeis. So depois do envio (linha scores_candidato sjt/caso_aberto) — nunca o rascunho. Retorno {situacao, texto}: disponivel | sem_resposta_enviada | indisponivel | removida. removida e neutro: o marcador redigido prova a redacao pelo motor de exclusao, nao quem a pediu (o motor grava o mesmo marcador no direito do titular e na purga de retencao).';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  v_esc   text[] := string_to_array(nullif(current_setting('p50.p04.escopo', true), ''), ';');
  v_sig   text;
  v_oid   oid;
  v_nome  text;
  v_src   text;
  v_cod   text;   -- prosrc SEM comentários `--`: as checagens de PRESENÇA leem o código, não a prosa
  v_res   text;
  v_props text;
  v_acl   text;
  v_frag  text;
  v_ev    text[] := '{}';
  v_d08   text;
  v_d08n  int;
  c_rh    constant text := 'OR (v_role = ''rh'' AND public.is_active_rh_user())';
BEGIN
  IF v_esc IS NULL OR cardinality(v_esc) IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'P50-04 POS-PORTAO: escopo do pre-portao ausente ou incompleto (%) — o pre-portao nao rodou nesta transacao', v_esc;
  END IF;

  FOREACH v_sig IN ARRAY v_esc LOOP
    v_oid := to_regprocedure(v_sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: % sumiu (assinatura mudou?)', v_sig;
    END IF;
    SELECT p.proname,
           p.prosrc,
           pg_get_function_result(p.oid),
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
      INTO v_nome, v_src, v_res, v_props, v_acl
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
     WHERE p.oid = v_oid;
    -- Presença se prova no CÓDIGO (um comentário que cita o helper não chama o helper);
    -- ausência se prova no corpo INTEIRO, comentários inclusive (mais estrito).
    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

    -- (a) toda função chama o helper vivo (D-02).
    IF position('is_active_rh_user' IN v_cod) = 0 THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: % nao chama is_active_rh_user — um token de recrutador desativado passaria', v_sig;
    END IF;
    -- (b) a posse saiu: nenhum uso da coluna de autoria (nestas 7 não existe uso de autoria).
    IF v_src ~* 'created_by' THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: % ainda casa created_by', v_sig;
    END IF;
    -- (c) nenhum guard na forma que falha ABERTO com claim nula (D-04).
    IF v_src ~* '\mv_role\s+NOT\s+IN\s*\(' THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: % tem guard `v_role NOT IN (` sem coalesce — falha ABERTO com v_role nulo', v_sig;
    END IF;
    -- (d) assinatura, RETURNS, DEFINER, search_path, volatilidade, dono… iguais aos capturados.
    IF v_props IS DISTINCT FROM current_setting('p50.p04.' || v_nome || '.props', true) THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: propriedades de % mudaram — antes «%», depois «%»', v_sig,
        current_setting('p50.p04.' || v_nome || '.props', true), v_props;
    END IF;
    -- (e) ACL: anon sem EXECUTE, PUBLIC sem EXECUTE, authenticated e service_role com; fora de
    --     funil_kpis (D-04), a ACL é a capturada, byte a byte.
    IF v_acl = '' OR EXISTS (SELECT 1 FROM aclexplode(v_acl::aclitem[]) a WHERE a.grantee = 0) THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: % com EXECUTE para PUBLIC (proacl «%»)', v_sig, v_acl;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: anon tem EXECUTE em % (D-04)', v_sig;
    END IF;
    IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: authenticated/service_role sem EXECUTE em % — a tela do RH deixaria de funcionar', v_sig;
    END IF;
    IF v_nome <> 'funil_kpis' AND v_acl IS DISTINCT FROM current_setting('p50.p04.' || v_nome || '.acl', true) THEN
      RAISE EXCEPTION 'P50-04 POS-PORTAO: ACL de % mudou — antes «%», depois «%»', v_sig,
        current_setting('p50.p04.' || v_nome || '.acl', true), v_acl;
    END IF;

    -- (f) por função: o que tinha de ficar e o que tinha de entrar.
    IF v_nome IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes',
                  'listar_revisoes_decisao', 'contar_revisoes_pendentes') THEN
      -- D-03: o ramo rh é o conjunto do administrador — sem filtro próprio.
      IF position(c_rh IN v_cod) = 0 OR position('v_role = ''administrador''' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: a fila % nao tem o escopo «administrador OR (rh AND helper)» (D-03)', v_sig;
      END IF;
      IF v_src ~ 'is_rascunho' OR v_src ~ '\mcd?\.deleted_at\M' THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: a fila % ainda filtra o ramo rh (candidatura viva / vaga) — a fila do rh nao seria a do administrador (D-03)', v_sig;
      END IF;
    END IF;
    IF v_nome IN ('listar_pedidos_dados', 'contar_pedidos_dados_pendentes') THEN
      IF position('IF v_role IS DISTINCT FROM ''administrador'' AND v_role IS DISTINCT FROM ''rh'' THEN' IN v_cod) = 0
         OR position('s.tipo = ''acesso''' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: % perdeu o guard NULL-safe ou o filtro tipo = acesso', v_sig;
      END IF;
    END IF;
    IF v_nome IN ('listar_revisoes_decisao', 'contar_revisoes_pendentes') THEN
      IF position('IF coalesce(v_role, '''') NOT IN (''rh'', ''administrador'') THEN' IN v_cod) = 0
         OR position('IF v_uid IS NULL THEN' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: % perdeu o guard fail-closed (coalesce) ou o de v_uid nulo', v_sig;
      END IF;
    END IF;
    IF v_nome = 'listar_pedidos_dados' OR v_nome = 'listar_revisoes_decisao' THEN
      IF position('#variable_conflict use_column' IN v_cod) = 0 OR position('LIMIT 200;' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: % perdeu #variable_conflict use_column ou o LIMIT 200', v_sig;
      END IF;
    END IF;
    IF v_nome = 'listar_pedidos_dados' THEN
      IF position('ORDER BY (s.situacao = ''atendido''),' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: listar_pedidos_dados perdeu a ordenacao composta (a copy do aviso de corte mentiria)';
      END IF;
    END IF;
    IF v_nome = 'listar_revisoes_decisao' THEN
      -- REVISAO-05 / D-08: pode_responder é por chamador e NÃO muda.
      IF position('pode_responder boolean' IN v_res) = 0
         OR position('(d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: listar_revisoes_decisao perdeu pode_responder = (respondida IS NULL AND por_usuario IS DISTINCT FROM v_uid) (REVISAO-05)';
      END IF;
    END IF;
    IF v_nome = 'funil_kpis' THEN
      IF v_src ~* '\mWHERE\s+true\M' THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: funil_kpis tem predicado incondicional — sem guard de papel, o predicado e o UNICO escopo (D-02, D-04)';
      END IF;
      IF (SELECT count(*) FROM regexp_matches(v_cod, '\mWHERE\s+v_ve_tudo\M', 'g')) < 4
         OR position('v_ve_tudo  boolean := coalesce(v_role = ''administrador'' ' || c_rh || ', false);' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: funil_kpis sem v_ve_tudo nos 4 CTEs ou sem a definicao «administrador OR (rh AND helper)»';
      END IF;
      IF position('candidatura_encerrada(' IN v_cod) = 0 OR position('p_vaga_id IS NULL OR v.id = p_vaga_id' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: funil_kpis perdeu candidatura_encerrada( ou o estreitamento por p_vaga_id';
      END IF;
    END IF;
    IF v_nome = 'listar_historico_candidatura' THEN
      IF position('IF v_role IS DISTINCT FROM ''administrador'' AND v_role IS DISTINCT FROM ''rh'' THEN' IN v_cod) = 0
         OR position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: listar_historico_candidatura sem o guard NULL-safe ou sem o rh pelo helper';
      END IF;
    END IF;
    IF v_nome = 'ler_resposta_caso_aberto_sjt' THEN
      v_frag := 'IF v_uid IS NULL OR coalesce(v_role, '''') NOT IN (''rh'', ''administrador'') THEN';
      IF position(v_frag IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: ler_resposta_caso_aberto_sjt perdeu o guard fail-closed';
      END IF;
      IF position('no_data_found' IN v_cod) = 0 THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: ler_resposta_caso_aberto_sjt sem P0002 (no_data_found) para candidatura inexistente';
      END IF;
      -- o helper vem ANTES da busca: o token velho não aprende se a candidatura existe.
      IF position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) = 0
         OR position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod)
            > position('FROM public.candidaturas' IN v_cod) THEN
        RAISE EXCEPTION 'P50-04 POS-PORTAO: ler_resposta_caso_aberto_sjt nao checa o helper do rh ANTES da busca da candidatura';
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
  IF nullif(current_setting('p50.d08_antes_04', true), '') IS NULL
     OR v_d08 IS DISTINCT FROM current_setting('p50.d08_antes_04', true)
     OR v_d08n::text IS DISTINCT FROM current_setting('p50.d08_n_04', true) THEN
    RAISE EXCEPTION 'P50-04 POS-PORTAO: D-08 — anonimizar_candidato/plano_exclusao_titular mudaram dentro desta migration (antes «%», depois «%»)',
      current_setting('p50.d08_antes_04', true), v_d08;
  END IF;

  PERFORM set_config('p50.evidencia',
    concat_ws(';', nullif(current_setting('p50.evidencia', true), ''),
              '04:' || array_to_string(v_ev, ','),
              '04:anon=false',
              '04:d08=igual:n=' || v_d08n::text),
    false);

  RAISE NOTICE 'P50-04 POS-PORTAO OK — 7 funcoes com o helper, sem posse, sem guard fail-open, propriedades iguais, anon sem EXECUTE ; filas = conjunto do administrador ; pode_responder intacto ; D-08 igual (% sobrecargas)', v_d08n;
END
$pos_portao$;
