-- =============================================================================
-- Migration 20261011000007 — o candidato lê os testes aplicáveis e o opt-in cognitivo da vaga das PRÓPRIAS candidaturas (R1 do G-52-7)
-- Phase 52 / Plano 52-32 · JORN-59 · G-52-7-R1 · D-52-G7B-1..3, D-52-G7B-5, D-52-G7B-7
-- =============================================================================
--
-- POR QUE EXISTE. A única policy de SELECT de `public.vagas` que alcança o candidato é «Público vê
--   vagas ativas» (`anon`, `authenticated`; `status = 'ativa' AND deleted_at IS NULL`) — viva em
--   PROD e anterior ao ledger (nenhum arquivo de migration a cria; `docs/RLS_POLICIES.md:144`).
--   Inativada a vaga (pausada, fechada, arquivada ou apagada por `deleted_at`), os leitores do embed
--   da vaga sob a RLS do candidato recebem NULO: `avaliacaoService.ts:118`
--   (`getAvaliacaoContext` — sem testes, a página de avaliações diz «Nenhuma avaliação pendente» e
--   o painel nunca diz «Avaliações concluídas — aguardando a equipe»), `redacaoService.ts:150` (o
--   embed com `!inner` faz a linha sumir — «Candidatura não encontrada») e `cognitivoService.ts:124`
--   (o opt-in cognitivo cai em falso — a prova fica «indisponível»). Efeito medido em PROD em
--   2026-10-12 na candidatura `f73682b6` (vaga `a32fe930` arquivada, em `avaliacao_assincrona`):
--   «Nenhuma avaliação pendente» onde a bateria tem duas avaliações. Decisão do operador
--   (2026-10-12, verbatim): «R1: plano-novo (52-32, antes do 52-19: avaliacaoService.ts:118,
--   redacaoService.ts:150 e exportacaoService.ts:1005, mesmo molde do 52-31 — leitura com guarda
--   de posse e allowlist só dos campos que cada leitor usa; regenerar database.types.ts no mesmo
--   plano)».
--
-- O QUE CRIA. `public.ler_testes_das_minhas_candidaturas()` — SEM argumento, `RETURNS jsonb`: o
--   array `[{candidatura_id, testes_aplicaveis, aplica_cognitivo}]` das candidaturas VIVAS do
--   chamador (`deleted_at IS NULL AND is_rascunho = false`), na ordem `created_at DESC, id`; sem
--   candidatura viva → `[]`. Da vaga saem SÓ a bateria de testes e o opt-in cognitivo (D-52-G7B-1:
--   são exatamente os dois campos que os três leitores de avaliação usam; cada leitor copia só o
--   seu), montados por `jsonb_build_object` EXPLÍCITO — allowlist, nunca a linha menos uma chave.
--   STATUS- E `deleted_at`-AGNÓSTICA sobre `vagas` (D-52-G7B-2, que estende aos testes a D-52-G7-1
--   do operador, verbatim: «Decidir explicitamente o caso de vaga com deleted_at (minha inclinação:
--   o candidato continua vendo o título da própria candidatura).»): a função não lê nem filtra
--   `vagas.status` nem `vagas.deleted_at` — o candidato ainda no funil continua vendo e fazendo as
--   avaliações da vaga que o RH pausou, fechou, arquivou ou apagou. O TÍTULO do bloco de currículos
--   (`exportacaoService.ts:1005`) NÃO vem daqui: vem da 20261011000006 (já em PROD), reusada.
--
-- GUARDA. Igual à da 20261011000006, linha por linha (D-52-G7B-3): papel FAIL-CLOSED, antes de
--   qualquer busca — `v_uid` de `auth.uid()` e `v_role` de `(select auth.jwt() #>>
--   '{app_metadata,role}')`, e um único `IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato'`
--   que levanta `forbidden` com ERRCODE 42501: sem `sub`, sem papel, ou com papel diferente de
--   `candidato` — inclusive `rh` e `administrador` — recusa. O `custom_access_token_hook` dá
--   `rh`/`administrador` a quem tem linha ATIVA em `usuarios_rh` e `candidato` a todo o resto; o RH
--   lê vagas pela RLS dele. SEM ARGUMENTO: não há id a forjar — a candidatura de outro candidato, a
--   rascunho e a excluída têm o MESMO desfecho, a ausência. POSSE = o predicado da policy
--   `candidato_le_propria_candidatura` (`20260607000006_rls_policies_m2_backbone.sql:39-42`):
--   `candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())`. CANDIDATURA
--   VIVA: `deleted_at IS NULL AND is_rascunho = false`.
--
-- O QUE NÃO FAZ. Não abre nem cria policy, não cria view, não muda tabela, coluna nem a policy
--   pública de `vagas`, não escreve linha, não lê nenhuma outra coluna de `vagas` além de `id` (a
--   junção) e das duas da allowlist. O RH segue pela RLS dele («RH vê todas vagas») e pelas
--   projeções do serviço que este plano não toca.
--
-- ACL. `CREATE FUNCTION` nasce com EXECUTE para PUBLIC e — pelo `pg_default_acl` de `public`
--   (medido em 2026-10-12: funções de owners `postgres` e `supabase_admin` dão EXECUTE a `anon` e
--   `authenticated`) — para `anon` por grant DIRETO; revogar só de PUBLIC removeria um grant que não
--   é o que dá acesso a anon. Por isso: REVOKE de PUBLIC, REVOKE de anon NOMINALMENTE, GRANT a
--   authenticated.
--
-- PRE-PORTAO (P52-07): `public.candidaturas`, `public.candidatos` e `public.vagas` presentes; a
--   função desta migration AUSENTE (não é reaplicável). Nada muda se recusar.
-- POS-PORTAO (P52-07): o contrato de catálogo — SECURITY DEFINER, STABLE, `proconfig =
--   {search_path=""}`, zero argumentos, retorno `jsonb`, comentário presente; `anon` e PUBLIC sem
--   EXECUTE, `authenticated` com; e, no código SEM comentários: a guarda literal ANTES do primeiro
--   `FROM public.` (oráculo), nenhuma comparação de `v_role` sem `coalesce`, o predicado de posse,
--   a junção e o filtro de candidatura viva presentes, exatamente UM `jsonb_build_object(`, e o
--   conjunto de referências `v.<coluna>` IGUAL a {aplica_cognitivo, id, testes_aplicaveis} — a
--   varredura usa a forma do WR-01 do `52-REVIEW-G7-1` (texto em minúsculas, identificador com ou
--   sem aspas: `v.Titulo` e `v."titulo"` são vistos) e exige IGUALDADE de conjunto, não inclusão;
--   nenhum literal do status público. Anexa ` avaliacao:testes_candidato=ok` a `p52.evidencia`.
--
-- LOCK. Só linhas de `pg_proc` (CREATE/REVOKE/GRANT/COMMENT de função nova). `lock_timeout` e
--   `statement_timeout` são as DUAS primeiras instruções; `55P03`/`57014` = fila, não a migration
--   — repetir depois, nunca subir o teto.
--
-- PROVA. `supabase/tests/p52_testes_candidato_smoke.sql` (`smoke52a`), por papel, por posse e por
--   projeção, só pelo ensaio que aborta (`node scripts/p52_ensaio.cjs …`); mutações A1–A14 em
--   `scripts/p52_mutacoes.cjs` (52-32 Task 2; A13/A14 são RECUSAS do POS por forma).
--
-- O NÚMERO (D-52-G7B-7). `20261011000007` é o próximo p52 depois da 0006; o prefixo `_p52_` é o que
--   a regra (8) do `p52_portao.cjs` e o `52-APLICACOES.json` casam. No `MIGS` do ensaio ela entra
--   DEPOIS da 0006 e ANTES da 0004 (a lista é a ordem de APLICAÇÃO; a 0004 do bloco D ainda não
--   existe). Nenhum portão depende da ordem das versões; com a 0007 no ar e a 0004 só no disco, o
--   `supabase db push` recusa sem `--include-all` — proteção, não defeito.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação; o BEGIN/COMMIT externo é o gatilho do
-- 42601 (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000007_p52_testes_das_minhas_candidaturas.sql
--   — só pelo 52-32 Task 5, atrás do `p52_portao.cjs --modo apply`; NUNCA `supabase db push`.
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52-07 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_t text;
BEGIN
  -- ESCOPO DELIBERADO deste arquivo (CLAUDE.md §Portões): as tabelas que a função lê.
  FOREACH v_t IN ARRAY ARRAY['public.candidaturas', 'public.candidatos', 'public.vagas'] LOOP
    IF pg_catalog.to_regclass(v_t) IS NULL THEN
      RAISE EXCEPTION 'P52-07 PRE-PORTAO: % nao existe; nada mudou', v_t;
    END IF;
  END LOOP;
  -- ESCOPO DELIBERADO: a função que este arquivo cria.
  IF pg_catalog.to_regprocedure('public.ler_testes_das_minhas_candidaturas()') IS NOT NULL THEN
    RAISE EXCEPTION 'P52-07 PRE-PORTAO: public.ler_testes_das_minhas_candidaturas() JA existe — esta migration nao e reaplicavel; nada mudou';
  END IF;
  PERFORM set_config('p52.p07.pre', 'ok', true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ler_testes_das_minhas_candidaturas — D-52-G7B-1..3
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_testes_das_minhas_candidaturas()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text := (select auth.jwt() #>> '{app_metadata,role}');
  v_lista jsonb;
BEGIN
  -- Papel fail-closed (coalesce: sem JWT -> 42501), sub obrigatório, e SÓ o papel candidato
  -- (rh e administrador também recusam — D-52-G7-2), ANTES de qualquer busca.
  IF v_uid IS NULL OR coalesce(v_role, '') <> 'candidato' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Posse pelo predicado da policy candidato_le_propria_candidatura; candidatura viva; da vaga
  -- só a bateria e o opt-in cognitivo (allowlist), em qualquer status e com ou sem deleted_at
  -- (D-52-G7B-2).
  SELECT coalesce(jsonb_agg(jsonb_build_object('candidatura_id', c.id,
                                               'testes_aplicaveis', v.testes_aplicaveis,
                                               'aplica_cognitivo', v.aplica_cognitivo)
                            ORDER BY c.created_at DESC, c.id), '[]'::jsonb)
    INTO v_lista
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)
     AND c.deleted_at IS NULL AND c.is_rascunho = false;

  RETURN v_lista;
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_testes_das_minhas_candidaturas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_testes_das_minhas_candidaturas() FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_testes_das_minhas_candidaturas() TO authenticated;

COMMENT ON FUNCTION public.ler_testes_das_minhas_candidaturas() IS
  'P52 / JORN-59 · G-52-7-R1 (D-52-G7B-1..3): o candidato le a bateria de testes aplicaveis e o opt-in '
  'cognitivo da vaga das PROPRIAS candidaturas vivas, para a pagina de avaliacoes, o painel, a redacao e '
  'a prova cognitiva quando a vaga deixou de ser publica (a policy publica de vagas so mostra vaga ativa e '
  'nao apagada). Sem argumento; devolve jsonb = [{candidatura_id, testes_aplicaveis, aplica_cognitivo}] '
  'das candidaturas vivas do chamador (deleted_at IS NULL AND is_rascunho = false), na ordem '
  'created_at DESC, id; sem nenhuma: []. Da vaga saem SO essas duas colunas, montadas por '
  'jsonb_build_object EXPLICITO (allowlist). Status- e deleted_at-agnostica sobre vagas — D-52-G7B-2, '
  'que estende aos testes a D-52-G7-1 do operador, verbatim: «Decidir explicitamente o caso de vaga com '
  'deleted_at (minha inclinação: o candidato continua vendo o título da própria candidatura).» '
  'Guarda FAIL-CLOSED antes de qualquer busca: sem sub, sem papel ou com papel diferente de candidato '
  '(inclusive rh e administrador): 42501. Posse pelo predicado da policy '
  'candidato_le_propria_candidatura (candidato_id do proprio auth.uid); sem argumento nao ha id a forjar: '
  'candidatura alheia, rascunho e excluida tem o MESMO desfecho, a ausencia (D-52-G7B-3). Nao abre policy, '
  'nao cria view, nao escreve. STABLE SECURITY DEFINER, search_path vazio. REVOKE de PUBLIC e de anon '
  'NOMINALMENTE (pg_default_acl), GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- P52-07 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  c_sig   constant text := 'public.ler_testes_das_minhas_candidaturas()';
  v_oid   oid;
  v_src   text;
  v_cod   text;
  v_sem   text;
  v_guard int;
  v_from  int;
  v_n     int;
  v_cols  text[];
  k       text;
BEGIN
  IF current_setting('p52.p07.pre', true) IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: o PRE-PORTAO nao rodou nesta transacao';
  END IF;

  v_oid := pg_catalog.to_regprocedure(c_sig);
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % nao existe depois do CREATE', c_sig;
  END IF;

  -- Contrato de catálogo.
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
   WHERE p.oid = v_oid AND p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']
     AND p.pronargs = 0
     AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
     AND pg_catalog.obj_description(p.oid, 'pg_proc') IS NOT NULL;
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % fora do contrato de catalogo (DEFINER, STABLE, search_path vazio, 0 argumentos, jsonb, comentario)', c_sig;
  END IF;

  -- ACL: anon e PUBLIC sem EXECUTE, authenticated com.
  IF has_function_privilege('anon', v_oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                 WHERE p.oid = v_oid AND a.grantee = 0) THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: ACL de % fora do contrato (anon/PUBLIC sem EXECUTE, authenticated com)', c_sig;
  END IF;

  -- O código SEM comentários.
  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

  -- A guarda fail-closed, literal, ANTES da primeira busca (oráculo de existência).
  v_guard := strpos(v_cod, 'IF v_uid IS NULL OR coalesce(v_role, '''') <> ''candidato'' THEN');
  v_from  := strpos(v_cod, 'FROM public.');
  IF v_guard = 0 OR v_from = 0 OR v_guard > v_from THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % nao tem a guarda de papel ANTES da primeira busca (guarda=%, primeiro FROM public.=%)',
      c_sig, v_guard, v_from;
  END IF;

  -- Nenhuma comparação de v_role fora do coalesce — falharia ABERTO com papel nulo.
  v_sem := replace(v_cod, 'coalesce(v_role, '''')', '');
  IF v_sem ~* '\mv_role\M\s*(=|<>|!=|<|>|\mIN\M|\mNOT\M|\mIS\M|\mLIKE\M|\mILIKE\M|~)' THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % compara v_role sem coalesce — falha ABERTO com papel nulo', c_sig;
  END IF;

  -- Posse (predicado da policy candidato_le_propria_candidatura) e candidatura viva.
  -- ESCOPO DELIBERADO: os marcadores de código que definem esta função.
  FOREACH k IN ARRAY ARRAY['c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)',
                           'c.deleted_at IS NULL AND c.is_rascunho = false',
                           'JOIN public.vagas v ON v.id = c.vaga_id'] LOOP
    IF strpos(v_cod, k) = 0 THEN
      RAISE EXCEPTION 'P52-07 POS-PORTAO: % (sem comentarios) nao contem «%»', c_sig, k;
    END IF;
  END LOOP;

  -- Allowlist: exatamente UM objeto montado...
  v_n := (length(v_cod) - length(replace(v_cod, 'jsonb_build_object(', ''))) / length('jsonb_build_object(');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % tem % ocorrencia(s) de jsonb_build_object( — a allowlist exige exatamente uma', c_sig, v_n;
  END IF;

  -- ... e o conjunto das referências v.<coluna>, varrido por FORMA (WR-01 do 52-REVIEW-G7-1: texto
  -- em minúsculas, identificador com ou sem aspas), IGUAL a {aplica_cognitivo, id, testes_aplicaveis}.
  SELECT coalesce(array_agg(DISTINCT m[2] ORDER BY m[2]), '{}') INTO v_cols FROM regexp_matches(lower(v_cod), '\mv\.("?)([a-z_]+)\1', 'g') AS m;
  IF v_cols IS DISTINCT FROM ARRAY['aplica_cognitivo', 'id', 'testes_aplicaveis'] THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % le coluna de vagas fora da allowlist {aplica_cognitivo, id, testes_aplicaveis}: %', c_sig, v_cols;
  END IF;

  -- D-52-G7B-2: nenhum filtro pelo status público da vaga.
  IF strpos(lower(v_cod), '''ativa''') > 0 THEN
    RAISE EXCEPTION 'P52-07 POS-PORTAO: % cita o literal do status publico — a funcao e status-agnostica (D-52-G7B-2)', c_sig;
  END IF;

  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' avaliacao:testes_candidato=ok'), false);
END
$pos$;
