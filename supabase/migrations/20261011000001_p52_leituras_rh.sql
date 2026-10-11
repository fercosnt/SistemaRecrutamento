-- =============================================================================
-- Migration 20261011000001 — leituras do RH no hub do candidato (Big Five sem percentil)
-- Phase 52 / Plano 52-08 · JORN-56 · D-01, D-04, D-10
-- =============================================================================
--
-- POR QUE EXISTE. O hub do RH passa a mostrar as faixas do Big Five que o CANDIDATO viu na
-- própria devolutiva (D-01/D-04 — Invariante 2: a faixa que o RH vê é a que o candidato viu),
-- mas a leitura direta de `devolutivas_candidato` pelo cliente entregaria o `conteudo_jsonb`
-- inteiro — percentil incluso — e a policy `rh_le_devolutivas` é só de JWT (Achado F5 do
-- 52-RESEARCH: não usa o helper vivo, então um recrutador DESATIVADO com token válido lê). O
-- recorte da D-10 (só RH ATIVO) mora por isso DENTRO da RPC.
--
-- O QUE CRIA.
--   1. `ler_devolutiva_bigfive_rh(uuid) RETURNS jsonb` — `{situacao, dimensoes, disclaimer_emocional,
--      disclaimer_lgpd_crp}`; `dimensoes` = `[{dim, banda, texto_interpretativo}]` montadas por
--      `jsonb_build_object` EXPLÍCITO (allowlist), nunca «linha menos chave»: a banda vem de
--      `conteudo_jsonb.cabecalho.dashboard[]` (a fonte que a devolutiva do candidato desenha), o
--      texto de `conteudo_jsonb.paginas[]`, casados pela `dim`, na ordem O C E A N, só as dimensões
--      presentes com banda do vocabulário (`muito_baixo|mod_baixo|medio|mod_alto|muito_alto`). Os
--      dois avisos vão como vieram (o rodapé negado `_NEG` da EF `gerar-devolutiva-bigfive` é
--      renderizado como veio — exceção decidida pelo operador, CLAUDE.md §Security Rules).
--      `situacao`: `disponivel` | `sem_devolutiva` (há score `big_five`, não há devolutiva) |
--      `sem_big_five` (nem score).
--
-- GUARDA (as três RPCs desta migration, igual ao molde `ler_contexto_knockout_revisao`, 51-10):
--   papel fail-closed (`coalesce(v_role, '') NOT IN ('rh', 'administrador')` e `auth.uid()`
--   obrigatório → 42501) e, no ramo `rh`, `public.is_active_rh_user()` ANTES de qualquer busca
--   — o token de um recrutador desativado recebe 42501 sem aprender se a candidatura existe.
--   CANDIDATURA VIVA: `deleted_at IS NULL AND is_rascunho = false`; ausente, excluída e rascunho
--   dão o MESMO `no_data_found` (espelho do `get-curriculo-url` WR-06; o molde
--   `ler_resposta_caso_aberto_sjt` não filtra — aqui filtra, e a decisão está no COMMENT).
--
-- O QUE NÃO FAZ. Não abre policy, não cria view, não muda tabela nem coluna, não escreve linha.
--   As policies de JWT de `devolutivas_candidato` ficam como estão (o cliente do RH deixa de
--   usá-las no 52-11; fechá-las é outro escopo).
--
-- ACL. `CREATE FUNCTION` nasce com EXECUTE para PUBLIC e — pelo `pg_default_acl` de `public` —
--   para `anon` por grant DIRETO; revogar só de PUBLIC removeria um grant que não é o que dá
--   acesso a anon. Por isso: REVOKE de PUBLIC, REVOKE de anon NOMINALMENTE, GRANT a authenticated.
--
-- PRE-PORTAO (P52-01): helper `public.is_active_rh_user()` presente; as tabelas lidas presentes;
--   as funções desta migration AUSENTES (não é reaplicável). Nada muda se recusar.
-- POS-PORTAO (P52-01): por função, o contrato de catálogo — SECURITY DEFINER, STABLE,
--   `proconfig = {search_path=""}`, retorno `jsonb`, comentário presente, `anon` e PUBLIC sem
--   EXECUTE, `authenticated` com; no código SEM comentários, a guarda fail-closed e o helper
--   ANTES do primeiro `FROM public.` (oráculo de existência), e nenhuma ocorrência da palavra do
--   número cru do Big Five (o POS a procura por `strpos`, sem escrevê-la fora de comentário).
--   Anexa a evidência a `p52.evidencia`.
--
-- LOCK. Só linhas de `pg_proc` (CREATE/REVOKE/GRANT/COMMENT de função nova). `lock_timeout` e
--   `statement_timeout` são as DUAS primeiras instruções; `55P03`/`57014` = fila, não a migration
--   — repetir depois, nunca subir o teto.
--
-- PROVA. `supabase/tests/p52_leituras_rh_smoke.sql` (`smoke52l`), por papel e por projeção, só
--   pelo ensaio que aborta (`node scripts/p52_ensaio.cjs …`); mutações em `scripts/p52_mutacoes.cjs`.
--
-- NÃO APLICADA NO 52-08: o apply é do 52-15, depois do review bloqueante do 52-14 (D-33).
--
-- SEM `BEGIN; … COMMIT;`: o endpoint da Management API já roda a requisição inteira (esta
-- migration + a linha do ledger) numa única transação; o BEGIN/COMMIT externo é o gatilho do
-- 42601 (CLAUDE.md §«Via de apply ATUAL»).
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261011000001_p52_leituras_rh.sql
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- P52-01 PRE-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre$
DECLARE
  v_t   text;
  v_sig text;
BEGIN
  IF pg_catalog.to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P52-01 PRE-PORTAO: public.is_active_rh_user() nao existe — as funcoes desta migration chamam o helper; nada mudou';
  END IF;
  -- ESCOPO DELIBERADO deste arquivo (CLAUDE.md §Portões): as tabelas que as funções leem.
  FOREACH v_t IN ARRAY ARRAY['public.candidaturas', 'public.devolutivas_candidato', 'public.scores_candidato'] LOOP
    IF pg_catalog.to_regclass(v_t) IS NULL THEN
      RAISE EXCEPTION 'P52-01 PRE-PORTAO: % nao existe; nada mudou', v_t;
    END IF;
  END LOOP;
  -- ESCOPO DELIBERADO: as funções que este arquivo cria.
  FOREACH v_sig IN ARRAY ARRAY['public.ler_devolutiva_bigfive_rh(uuid)'] LOOP
    IF pg_catalog.to_regprocedure(v_sig) IS NOT NULL THEN
      RAISE EXCEPTION 'P52-01 PRE-PORTAO: % JA existe — esta migration nao e reaplicavel; nada mudou', v_sig;
    END IF;
  END LOOP;
  PERFORM set_config('p52.p01.pre', 'ok', true);
END
$pre$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · ler_devolutiva_bigfive_rh — D-01, D-04, D-10
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_devolutiva_bigfive_rh(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text := (select auth.jwt() #>> '{app_metadata,role}');
  v_cont  jsonb;
  v_dash  jsonb;
  v_pags  jsonb;
  v_dims  jsonb;
BEGIN
  -- Papel fail-closed (coalesce: sem JWT -> 42501) e sub obrigatório.
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- D-10: rh ATIVO, ANTES de qualquer busca — o token velho não aprende se a candidatura existe.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Candidatura viva: ausente, excluída e rascunho dão o MESMO erro.
  IF NOT EXISTS (SELECT 1 FROM public.candidaturas c
                  WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL AND c.is_rascunho = false) THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT d.conteudo_jsonb INTO v_cont
    FROM public.devolutivas_candidato d
   WHERE d.candidatura_id = p_candidatura_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'situacao', CASE WHEN EXISTS (SELECT 1 FROM public.scores_candidato s
                                     WHERE s.candidatura_id = p_candidatura_id AND s.tipo = 'big_five')
                       THEN 'sem_devolutiva' ELSE 'sem_big_five' END,
      'dimensoes', '[]'::jsonb,
      'disclaimer_emocional', NULL,
      'disclaimer_lgpd_crp', NULL);
  END IF;

  v_dash := CASE WHEN jsonb_typeof(v_cont #> '{cabecalho,dashboard}') = 'array' THEN v_cont #> '{cabecalho,dashboard}' ELSE '[]'::jsonb END;
  v_pags := CASE WHEN jsonb_typeof(v_cont -> 'paginas') = 'array' THEN v_cont -> 'paginas' ELSE '[]'::jsonb END;

  -- Allowlist: só dim, banda e texto_interpretativo saem — nada do resto do objeto da dimensão.
  SELECT coalesce(jsonb_agg(jsonb_build_object('dim', o.dim,
                                               'banda', b.banda,
                                               'texto_interpretativo', t.texto)
                            ORDER BY o.ord), '[]'::jsonb)
    INTO v_dims
    FROM unnest(ARRAY['O', 'C', 'E', 'A', 'N']) WITH ORDINALITY AS o(dim, ord)
    JOIN LATERAL (SELECT e ->> 'banda' AS banda
                    FROM jsonb_array_elements(v_dash) AS e
                   WHERE jsonb_typeof(e) = 'object'
                     AND e ->> 'dim' = o.dim
                     AND e ->> 'banda' IN ('muito_baixo', 'mod_baixo', 'medio', 'mod_alto', 'muito_alto')
                   LIMIT 1) b ON true
    LEFT JOIN LATERAL (SELECT e ->> 'texto_interpretativo' AS texto
                         FROM jsonb_array_elements(v_pags) AS e
                        WHERE jsonb_typeof(e) = 'object'
                          AND e ->> 'dim' = o.dim
                          AND jsonb_typeof(e -> 'texto_interpretativo') = 'string'
                        LIMIT 1) t ON true;

  RETURN jsonb_build_object(
    'situacao', 'disponivel',
    'dimensoes', v_dims,
    'disclaimer_emocional', CASE WHEN jsonb_typeof(v_cont -> 'disclaimer_emocional') = 'string'
                                 THEN v_cont ->> 'disclaimer_emocional' END,
    'disclaimer_lgpd_crp', CASE WHEN jsonb_typeof(v_cont -> 'disclaimer_lgpd_crp') = 'string'
                                THEN v_cont ->> 'disclaimer_lgpd_crp' END);
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_devolutiva_bigfive_rh(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_devolutiva_bigfive_rh(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_devolutiva_bigfive_rh(uuid) TO authenticated;

COMMENT ON FUNCTION public.ler_devolutiva_bigfive_rh(uuid) IS
  'P52 / JORN-56 (D-01, D-04, D-10): a faixa do Big Five que o CANDIDATO viu na propria devolutiva, para o hub '
  'do RH. Devolve {situacao, dimensoes, disclaimer_emocional, disclaimer_lgpd_crp}; dimensoes = '
  '[{dim, banda, texto_interpretativo}] montadas por jsonb_build_object EXPLICITO (allowlist — nunca a linha '
  'menos uma chave): banda de conteudo_jsonb.cabecalho.dashboard[] e texto de conteudo_jsonb.paginas[], '
  'casados pela dim, na ordem O C E A N, so dimensoes presentes com banda do vocabulario; NENHUM numero cru '
  'da escala sai (UX-07/RNF-07a). situacao: disponivel | sem_devolutiva (ha score big_five, nao ha '
  'devolutiva) | sem_big_five. Os avisos vao como vieram (o rodape negado e excecao decidida, CLAUDE.md). '
  'Guarda FAIL-CLOSED (sem sub ou sem papel rh/administrador: 42501) e, no ramo rh, '
  'public.is_active_rh_user ANTES de qualquer busca (a policy rh_le_devolutivas e so de JWT — Achado F5). '
  'Candidatura VIVA (deleted_at IS NULL AND is_rascunho = false): ausente, excluida e rascunho dao o MESMO '
  'no_data_found (P0002) — decisao do 52-08, espelho do get-curriculo-url WR-06. STABLE SECURITY DEFINER, '
  'search_path vazio. REVOKE de PUBLIC e de anon NOMINALMENTE (pg_default_acl), GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- P52-01 POS-PORTAO
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos$
DECLARE
  r       record;
  v_oid   oid;
  v_src   text;
  v_cod   text;
  v_guard int;
  v_help  int;
  v_from  int;
  k       text;
  v_ev    text[] := '{}';
BEGIN
  IF current_setting('p52.p01.pre', true) IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'P52-01 POS-PORTAO: o PRE-PORTAO nao rodou nesta transacao';
  END IF;

  -- ESCOPO DELIBERADO: as funções que este arquivo cria, cada uma com o rótulo da evidência e os
  -- marcadores de código que a definem.
  FOR r IN
    SELECT * FROM (VALUES
      ('public.ler_devolutiva_bigfive_rh(uuid)', 'devolutiva',
       ARRAY['FROM public.devolutivas_candidato', 'jsonb_build_object(''dim'', o.dim', 'cabecalho,dashboard',
             'texto_interpretativo', 'c.deleted_at IS NULL AND c.is_rascunho = false'])
    ) AS e(sig, rotulo, marcas)
  LOOP
    v_oid := pg_catalog.to_regprocedure(r.sig);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: % nao existe depois do CREATE', r.sig;
    END IF;
    SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
     WHERE p.oid = v_oid AND p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']
       AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
       AND pg_catalog.obj_description(p.oid, 'pg_proc') IS NOT NULL;
    IF v_src IS NULL THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: % fora do contrato de catalogo (DEFINER, STABLE, search_path vazio, jsonb, comentario)', r.sig;
    END IF;
    IF has_function_privilege('anon', v_oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
       OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                   WHERE p.oid = v_oid AND a.grantee = 0) THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: ACL de % fora do contrato (anon/PUBLIC sem EXECUTE, authenticated com)', r.sig;
    END IF;

    v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
    IF v_cod ~* '\mv_role\s+NOT\s+IN\s*\(' THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: % tem guarda `v_role NOT IN (` sem coalesce — falha ABERTO com papel nulo', r.sig;
    END IF;
    FOREACH k IN ARRAY r.marcas LOOP
      IF strpos(v_cod, k) = 0 THEN
        RAISE EXCEPTION 'P52-01 POS-PORTAO: % (sem comentarios) nao contem «%»', r.sig, k;
      END IF;
    END LOOP;
    v_guard := strpos(v_cod, 'IF v_uid IS NULL OR coalesce(v_role, '''') NOT IN (''rh'', ''administrador'') THEN');
    v_help  := strpos(v_cod, 'IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN');
    v_from  := strpos(v_cod, 'FROM public.');
    IF v_guard = 0 OR v_help = 0 OR v_from = 0 OR v_guard > v_help OR v_help > v_from THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: % nao tem a guarda de papel e o helper do rh ANTES da primeira busca (guarda=%, helper=%, primeiro FROM public.=%) — oraculo de existencia',
        r.sig, v_guard, v_help, v_from;
    END IF;
    -- o número cru da escala não aparece no código (nem lido, nem projetado); a palavra é montada
    -- por concatenação para este arquivo não a conter fora de comentário.
    IF strpos(lower(v_cod), 'percen' || 'til') > 0 THEN
      RAISE EXCEPTION 'P52-01 POS-PORTAO: % cita o numero cru do Big Five no codigo', r.sig;
    END IF;
    v_ev := v_ev || (r.rotulo || '=ok');
  END LOOP;

  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' leituras:' || array_to_string(v_ev, ',')), false);
END
$pos$;
