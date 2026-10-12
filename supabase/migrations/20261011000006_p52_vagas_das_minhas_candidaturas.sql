-- =============================================================================
-- Migration 20261011000006 — o candidato lê título e departamento da vaga das PRÓPRIAS candidaturas (G-52-7)
-- Phase 52 / Plano 52-31 · JORN-59 · G-52-7 · D-52-G7-1..4, D-52-G7-6, D-52-G7-7
-- =============================================================================
--
-- POR QUE EXISTE. A única policy de SELECT de `public.vagas` que alcança o candidato é «Público vê
--   vagas ativas» (`anon`, `authenticated`; `status = 'ativa' AND deleted_at IS NULL`) — viva em
--   PROD e anterior ao ledger (nenhum arquivo de migration a cria; `docs/RLS_POLICIES.md:144`). A
--   outra, «RH vê todas vagas», é só de quem tem linha ativa em `usuarios_rh`. Inativada a vaga
--   (pausada, fechada, arquivada ou apagada por `deleted_at`), o embed `vaga:vagas (...)` de
--   `listCandidaturas` volta NULO para o candidato ainda no funil, e o cartão do painel cai em
--   «Vaga não encontrada» / «N/A» (G-52-7, observado em PROD na candidatura `d31c78bb`, vaga
--   `629a5f31`, em 2026-10-12). Preferência do operador que AMARRA o desenho (2026-10-12, verbatim):
--   «Preferência do operador para o G-52-7: RPC SECURITY DEFINER com guarda de posse (só
--   candidaturas do próprio candidato), devolvendo APENAS os campos que o card usa (título e
--   departamento), no molde das leituras da 52 (allowlist, prova por papel, smoke com mordida). Não
--   abrir a linha inteira de vagas por policy. Decidir explicitamente o caso de vaga com deleted_at
--   (minha inclinação: o candidato continua vendo o título da própria candidatura).»
--
-- O QUE CRIA. `public.ler_vagas_das_minhas_candidaturas()` — SEM argumento, `RETURNS jsonb`: o array
--   `[{candidatura_id, titulo, departamento}]` das candidaturas VIVAS do chamador
--   (`deleted_at IS NULL AND is_rascunho = false`), na ordem `created_at DESC, id` (a da lista
--   `mais_recentes` do painel); sem candidatura viva → `[]`. Da vaga saem SÓ `titulo` e
--   `departamento` (D-52-G7-4, medido: o cartão lê `vaga?.titulo` 2× e `vaga?.departamento` 1× e
--   navega por `candidatura.vaga_id`), montados por `jsonb_build_object` EXPLÍCITO — allowlist,
--   nunca a linha menos uma chave. STATUS- E `deleted_at`-AGNÓSTICA sobre `vagas` (D-52-G7-1,
--   decisão do operador, a inclinação dele adotada: «Decidir explicitamente o caso de vaga com
--   deleted_at (minha inclinação: o candidato continua vendo o título da própria candidatura).»):
--   a função não lê nem filtra `vagas.status` nem `vagas.deleted_at` — o candidato vê título e
--   departamento da vaga da própria candidatura viva em todo status do enum `status_vaga` e com a
--   vaga apagada por `deleted_at`.
--
-- GUARDA. Papel FAIL-CLOSED, antes de qualquer busca: `v_uid` de `auth.uid()` e `v_role` de
--   `(select auth.jwt() #>> '{app_metadata,role}')`, e um único `IF v_uid IS NULL OR
--   coalesce(v_role, '') <> 'candidato'` que levanta `forbidden` com ERRCODE 42501 (D-52-G7-2): sem
--   `sub`, sem papel, ou com papel diferente de `candidato` — inclusive `rh` e `administrador` —
--   recusa. O `custom_access_token_hook` (lido em PROD em 2026-10-12) dá `rh`/`administrador` a quem
--   tem linha ATIVA em `usuarios_rh` e `candidato` a todo o resto; o RH lê vagas pela RLS dele e
--   não há chamador de RH para esta função. SEM ARGUMENTO (D-52-G7-3): não há id a forjar — IDOR e
--   oráculo de existência são impossíveis por construção; a candidatura de outro candidato, a
--   rascunho e a excluída têm o MESMO desfecho, a ausência. POSSE = o predicado da policy
--   `candidato_le_propria_candidatura` (`20260607000006_rls_policies_m2_backbone.sql:39-42`)
--   verbatim: `candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())`
--   (`candidatos.user_id` é UNIQUE, medido). CANDIDATURA VIVA: `deleted_at IS NULL AND
--   is_rascunho = false`.
--
-- O QUE NÃO FAZ. Não abre nem cria policy, não cria view, não muda tabela, coluna nem a policy
--   pública de `vagas`, não escreve linha, não lê nenhuma outra coluna de `vagas` além de `id`
--   (a junção), `titulo` e `departamento`. O RH segue pela RLS dele («RH vê todas vagas») e pelas
--   projeções do serviço que este plano não toca. A vaga INEXISTENTE com candidatura viva é
--   impossível no banco (D-52-G7-6: `candidaturas.vaga_id` NOT NULL, FK para `vagas` com `ON DELETE
--   CASCADE`) — o fallback do cartão fica e é provado no cliente.
--
-- ACL. `CREATE FUNCTION` nasce com EXECUTE para PUBLIC e — pelo `pg_default_acl` de `public`
--   (medido em 2026-10-12: funções de owners `postgres` e `supabase_admin` dão EXECUTE a `anon` e
--   `authenticated`) — para `anon` por grant DIRETO; revogar só de PUBLIC removeria um grant que não
--   é o que dá acesso a anon. Por isso: REVOKE de PUBLIC, REVOKE de anon NOMINALMENTE, GRANT a
--   authenticated.
--
-- PRE-PORTAO (P52-06): `public.candidaturas`, `public.candidatos` e `public.vagas` presentes; a
--   função desta migration AUSENTE (não é reaplicável). Nada muda se recusar.
-- POS-PORTAO (P52-06): o contrato de catálogo — SECURITY DEFINER, STABLE, `proconfig =
--   {search_path=""}`, zero argumentos, retorno `jsonb`, comentário presente; `anon` e PUBLIC sem
--   EXECUTE, `authenticated` com; e, no código SEM comentários: a guarda literal ANTES do primeiro
--   `FROM public.` (oráculo), nenhuma comparação de `v_role` sem `coalesce`, o predicado de posse e
--   o filtro de candidatura viva presentes, exatamente UM `jsonb_build_object(`, toda referência
--   `v.<coluna>` (varredura por FORMA) dentro de {id, titulo, departamento}, e nenhum literal do
--   status público. Anexa ` painel:vagas_candidato=ok` a `p52.evidencia`.
--
-- LOCK. Só linhas de `pg_proc` (CREATE/REVOKE/GRANT/COMMENT de função nova). `lock_timeout` e
--   `statement_timeout` são as DUAS primeiras instruções; `55P03`/`57014` = fila, não a migration
--   — repetir depois, nunca subir o teto.
--
-- PROVA. `supabase/tests/p52_painel_vaga_smoke.sql` (`smoke52p`), por papel, por posse e por
--   projeção, só pelo ensaio que aborta (`node scripts/p52_ensaio.cjs …`); mutações P1–P10 em
--   `scripts/p52_mutacoes.cjs` (52-31 Task 2).
--
-- O NÚMERO (D-52-G7-7). `20261011000006` é o próximo p52 depois da 0005; o prefixo `_p52_` é o que
--   a regra (8) do `p52_portao.cjs` e o `52-APLICACOES.json` casam. No `MIGS` do ensaio ela entra
--   DEPOIS da 0005 e ANTES da 0004 (a lista é a ordem de APLICAÇÃO; a 0004 do bloco D ainda não
--   existe). Nenhum portão depende da ordem das versões; com a 0006 no ar e a 0004 só no disco, o
--   `supabase db push` recusa sem `--include-all` — proteção, não defeito.
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação; o BEGIN/COMMIT externo é o gatilho do
-- 42601 (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000006_p52_vagas_das_minhas_candidaturas.sql
--   — só pelo 52-31 Task 5, atrás do `p52_portao.cjs --modo apply`; NUNCA `supabase db push`.
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52-06 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_t text;
BEGIN
  -- ESCOPO DELIBERADO deste arquivo (CLAUDE.md §Portões): as tabelas que a função lê.
  FOREACH v_t IN ARRAY ARRAY['public.candidaturas', 'public.candidatos', 'public.vagas'] LOOP
    IF pg_catalog.to_regclass(v_t) IS NULL THEN
      RAISE EXCEPTION 'P52-06 PRE-PORTAO: % nao existe; nada mudou', v_t;
    END IF;
  END LOOP;
  -- ESCOPO DELIBERADO: a função que este arquivo cria.
  IF pg_catalog.to_regprocedure('public.ler_vagas_das_minhas_candidaturas()') IS NOT NULL THEN
    RAISE EXCEPTION 'P52-06 PRE-PORTAO: public.ler_vagas_das_minhas_candidaturas() JA existe — esta migration nao e reaplicavel; nada mudou';
  END IF;
  PERFORM set_config('p52.p06.pre', 'ok', true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- ler_vagas_das_minhas_candidaturas — D-52-G7-1..4
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_vagas_das_minhas_candidaturas()
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
  -- só titulo e departamento (allowlist), em qualquer status e com ou sem deleted_at (D-52-G7-1).
  SELECT coalesce(jsonb_agg(jsonb_build_object('candidatura_id', c.id,
                                               'titulo', v.titulo,
                                               'departamento', v.departamento)
                            ORDER BY c.created_at DESC, c.id), '[]'::jsonb)
    INTO v_lista
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)
     AND c.deleted_at IS NULL AND c.is_rascunho = false;

  RETURN v_lista;
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_vagas_das_minhas_candidaturas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_vagas_das_minhas_candidaturas() FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_vagas_das_minhas_candidaturas() TO authenticated;

COMMENT ON FUNCTION public.ler_vagas_das_minhas_candidaturas() IS
  'P52 / JORN-59 · G-52-7 (D-52-G7-1..4, D-52-G7-6): o candidato le titulo e departamento da vaga das '
  'PROPRIAS candidaturas vivas, para o cartao do painel quando a vaga deixou de ser publica (a policy '
  'publica de vagas so mostra vaga ativa e nao apagada). Sem argumento; devolve jsonb = '
  '[{candidatura_id, titulo, departamento}] das candidaturas vivas do chamador (deleted_at IS NULL AND '
  'is_rascunho = false), na ordem created_at DESC, id; sem nenhuma: []. Da vaga saem SO titulo e '
  'departamento, montados por jsonb_build_object EXPLICITO (allowlist). Status- e deleted_at-agnostica '
  'sobre vagas — D-52-G7-1, decisao do operador, verbatim: «Decidir explicitamente o caso de vaga com '
  'deleted_at (minha inclinação: o candidato continua vendo o título da própria candidatura).» '
  'Guarda FAIL-CLOSED antes de qualquer busca: sem sub, sem papel ou com papel diferente de candidato '
  '(inclusive rh e administrador): 42501 (D-52-G7-2). Posse pelo predicado da policy '
  'candidato_le_propria_candidatura (candidato_id do proprio auth.uid); sem argumento nao ha id a forjar: '
  'candidatura alheia, rascunho e excluida tem o MESMO desfecho, a ausencia (D-52-G7-3). Nao abre policy, '
  'nao cria view, nao escreve. STABLE SECURITY DEFINER, search_path vazio. REVOKE de PUBLIC e de anon '
  'NOMINALMENTE (pg_default_acl), GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- P52-06 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  c_sig   constant text := 'public.ler_vagas_das_minhas_candidaturas()';
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
  IF current_setting('p52.p06.pre', true) IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: o PRE-PORTAO nao rodou nesta transacao';
  END IF;

  v_oid := pg_catalog.to_regprocedure(c_sig);
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % nao existe depois do CREATE', c_sig;
  END IF;

  -- Contrato de catálogo.
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
   WHERE p.oid = v_oid AND p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']
     AND p.pronargs = 0
     AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
     AND pg_catalog.obj_description(p.oid, 'pg_proc') IS NOT NULL;
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % fora do contrato de catalogo (DEFINER, STABLE, search_path vazio, 0 argumentos, jsonb, comentario)', c_sig;
  END IF;

  -- ACL: anon e PUBLIC sem EXECUTE, authenticated com.
  IF has_function_privilege('anon', v_oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                 WHERE p.oid = v_oid AND a.grantee = 0) THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: ACL de % fora do contrato (anon/PUBLIC sem EXECUTE, authenticated com)', c_sig;
  END IF;

  -- O código SEM comentários.
  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');

  -- A guarda fail-closed, literal, ANTES da primeira busca (oráculo de existência).
  v_guard := strpos(v_cod, 'IF v_uid IS NULL OR coalesce(v_role, '''') <> ''candidato'' THEN');
  v_from  := strpos(v_cod, 'FROM public.');
  IF v_guard = 0 OR v_from = 0 OR v_guard > v_from THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % nao tem a guarda de papel ANTES da primeira busca (guarda=%, primeiro FROM public.=%)',
      c_sig, v_guard, v_from;
  END IF;

  -- Nenhuma comparação de v_role fora do coalesce — falharia ABERTO com papel nulo.
  v_sem := replace(v_cod, 'coalesce(v_role, '''')', '');
  IF v_sem ~* '\mv_role\M\s*(=|<>|!=|<|>|\mIN\M|\mNOT\M|\mIS\M|\mLIKE\M|\mILIKE\M|~)' THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % compara v_role sem coalesce — falha ABERTO com papel nulo', c_sig;
  END IF;

  -- Posse (predicado da policy candidato_le_propria_candidatura) e candidatura viva.
  -- ESCOPO DELIBERADO: os marcadores de código que definem esta função.
  FOREACH k IN ARRAY ARRAY['c.candidato_id IN (SELECT ca.id FROM public.candidatos ca WHERE ca.user_id = v_uid)',
                           'c.deleted_at IS NULL AND c.is_rascunho = false',
                           'JOIN public.vagas v ON v.id = c.vaga_id'] LOOP
    IF strpos(v_cod, k) = 0 THEN
      RAISE EXCEPTION 'P52-06 POS-PORTAO: % (sem comentarios) nao contem «%»', c_sig, k;
    END IF;
  END LOOP;

  -- Allowlist: exatamente UM objeto montado...
  v_n := (length(v_cod) - length(replace(v_cod, 'jsonb_build_object(', ''))) / length('jsonb_build_object(');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % tem % ocorrencia(s) de jsonb_build_object( — a allowlist exige exatamente uma', c_sig, v_n;
  END IF;

  -- ... e toda referência v.<coluna>, varrida por FORMA, dentro de {id, titulo, departamento}.
  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]), '{}')
    INTO v_cols
    FROM regexp_matches(v_cod, '\mv\.([a-z_]+)', 'g') AS m;
  IF cardinality(v_cols) = 0
     OR EXISTS (SELECT 1 FROM unnest(v_cols) x WHERE x NOT IN ('id', 'titulo', 'departamento')) THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % le coluna de vagas fora da allowlist {id, titulo, departamento}: %', c_sig, v_cols;
  END IF;

  -- D-52-G7-1: nenhum filtro pelo status público da vaga.
  IF strpos(lower(v_cod), '''ativa''') > 0 THEN
    RAISE EXCEPTION 'P52-06 POS-PORTAO: % cita o literal do status publico — a funcao e status-agnostica (D-52-G7-1)', c_sig;
  END IF;

  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' painel:vagas_candidato=ok'), false);
END
$pos$;
