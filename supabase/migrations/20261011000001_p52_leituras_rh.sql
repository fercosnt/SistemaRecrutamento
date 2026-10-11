-- =============================================================================
-- Migration 20261011000001 — leituras do RH no hub do candidato e na fila de revisões
--                            (Big Five sem percentil, SJT MC sem gabarito, contexto da triagem)
-- Phase 52 / Plano 52-08 · JORN-56, JORN-57, JORN-62 · D-01, D-04, D-10, D-21, D-37, D-38
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
--   2. `ler_sjt_mc_rh(uuid) RETURNS jsonb` (D-21, D-37) — `{situacao, itens}`; por elemento de
--      `scores_candidato.metadata.respostas` (linha `tipo='sjt'`, `subtipo='mc'`), NA ORDEM DO ARRAY:
--      `{pergunta_id, cenario, alternativas:[{opcao_id, texto, escolhida}], escolhida_tag,
--      escolhida_peso, escolhida_no_banco}`. Etiqueta e peso SÓ da escolhida (os da resposta
--      gravada); NENHUMA etiqueta, peso ou `ordem` de alternativa sai nem é lida. Alternativas de
--      `perguntas_opcao_sjt` em ORDEM NEUTRA ESTÁVEL `md5(pergunta_id::text || opcao_id::text)` —
--      nunca por `ordem`, que em PROD é o gabarito (Achado F2: `ordem 1 = fortemente_pontua` em 21
--      de 21 itens). `perguntas` lidas SEM filtro de `status`: as respostas apontam para itens que
--      o bloco C (52-16/52-17) retira. Sem linha `sjt/mc` → `sem_sjt_mc` com `itens = []`. Uma linha
--      SEM `metadata.respostas` (versão antiga do motor: medida 1 de 6 em 2026-10-11) sai
--      `disponivel` com `itens = []` — o candidato fez o SJT MC, mas a resposta por item não foi
--      gravada; o cliente (52-11) não tem item a mostrar, e não há estado novo no contrato.
--   3. `ler_contexto_rejeicao_triagem_revisao(uuid) RETURNS jsonb` (D-38, Achado F3) — no molde de
--      `ler_contexto_knockout_revisao` (51-10): ao responder a revisão de uma rejeição PELO RH
--      (`revisao_rejeicao.origem = 'humana_triagem'`), o revisor vê `{situacao, motivo,
--      justificativa}`. `justificativa` = `historico_candidatura.criterio_texto` do registro de
--      rejeição (`revisao_rejeicao.historico_rejeicao_id`); `motivo` = `candidaturas.motivo_rejeicao`
--      — MEDIDO em 2026-10-11: `historico_candidatura` não tem coluna de motivo (só
--      `criterio_texto`), então a fonte é a da candidatura, com a RESSALVA A5 do 52-RESEARCH:
--      uma re-rejeição posterior reescreve `motivo_rejeicao`; no pedido pendente ele é o certo.
--      Pedido inexistente, de outra origem (`automatica`) ou de candidatura excluída/rascunho →
--      `no_data_found`, mesma mensagem. `revisao_rejeicao` não tem policy para o RH (RLS ligada,
--      0 policies, sem SELECT de authenticated): sem a RPC o motivo não chega à tela.
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
--   Em `ler_sjt_mc_rh`, além disso: o `ORDER BY md5(o.pergunta_id::text || o.opcao_id::text)`
--   presente, o objeto das alternativas sem `tag`/`peso`/`ordem`, e nenhuma leitura de coluna
--   `.tag`/`.peso`/`.ordem`. Anexa `leituras:devolutiva=ok,sjt=ok,triagem=ok` a `p52.evidencia`.
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
  FOREACH v_t IN ARRAY ARRAY['public.candidaturas', 'public.devolutivas_candidato', 'public.scores_candidato',
                             'public.perguntas', 'public.perguntas_opcao_sjt',
                             'public.revisao_rejeicao', 'public.historico_candidatura'] LOOP
    IF pg_catalog.to_regclass(v_t) IS NULL THEN
      RAISE EXCEPTION 'P52-01 PRE-PORTAO: % nao existe; nada mudou', v_t;
    END IF;
  END LOOP;
  -- ESCOPO DELIBERADO: as funções que este arquivo cria.
  FOREACH v_sig IN ARRAY ARRAY['public.ler_devolutiva_bigfive_rh(uuid)', 'public.ler_sjt_mc_rh(uuid)',
                               'public.ler_contexto_rejeicao_triagem_revisao(uuid)'] LOOP
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
-- 2 · ler_sjt_mc_rh — D-21, D-37
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_sjt_mc_rh(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_role  text := (select auth.jwt() #>> '{app_metadata,role}');
  v_meta  jsonb;
  v_resp  jsonb;
  v_itens jsonb;
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

  SELECT s.metadata INTO v_meta
    FROM public.scores_candidato s
   WHERE s.candidatura_id = p_candidatura_id
     AND s.tipo = 'sjt'
     AND s.subtipo = 'mc'
   ORDER BY s.created_at DESC, s.id
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'sem_sjt_mc', 'itens', '[]'::jsonb);
  END IF;
  v_resp := CASE WHEN jsonb_typeof(v_meta -> 'respostas') = 'array' THEN v_meta -> 'respostas' ELSE '[]'::jsonb END;

  -- Um item por resposta gravada, na ordem do array. Os ids vêm do jsonb: só um uuid bem formado
  -- casa (um texto torto vira nulo, nunca erro de cast). Etiqueta e peso: os DA RESPOSTA, só da
  -- escolhida. Alternativas: allowlist {opcao_id, texto, escolhida}, em ordem neutra estável.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'pergunta_id', r.e ->> 'pergunta_id',
           'cenario', p.cenario,
           'alternativas', coalesce((
               SELECT jsonb_agg(jsonb_build_object('opcao_id', o.opcao_id,
                                                   'texto', o.opcao_texto,
                                                   'escolhida', coalesce(o.opcao_id = k.escolhida, false))
                                ORDER BY md5(o.pergunta_id::text || o.opcao_id::text))
                 FROM public.perguntas_opcao_sjt o
                WHERE o.pergunta_id = k.pid), '[]'::jsonb),
           'escolhida_tag', r.e ->> 'tag',
           'escolhida_peso', CASE WHEN jsonb_typeof(r.e -> 'peso') = 'number' THEN r.e -> 'peso' END,
           'escolhida_no_banco', EXISTS (SELECT 1 FROM public.perguntas_opcao_sjt x
                                          WHERE x.pergunta_id = k.pid AND x.opcao_id = k.escolhida))
           ORDER BY r.ord), '[]'::jsonb)
    INTO v_itens
    FROM jsonb_array_elements(v_resp) WITH ORDINALITY AS r(e, ord)
    CROSS JOIN LATERAL (
      SELECT CASE WHEN r.e ->> 'pergunta_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  THEN (r.e ->> 'pergunta_id')::uuid END AS pid,
             CASE WHEN r.e ->> 'opcao_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  THEN (r.e ->> 'opcao_id')::uuid END AS escolhida) k
    LEFT JOIN public.perguntas p ON p.id = k.pid
   WHERE jsonb_typeof(r.e) = 'object';

  RETURN jsonb_build_object('situacao', 'disponivel', 'itens', v_itens);
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_sjt_mc_rh(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_sjt_mc_rh(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_sjt_mc_rh(uuid) TO authenticated;

COMMENT ON FUNCTION public.ler_sjt_mc_rh(uuid) IS
  'P52 / JORN-57 (D-21, D-37, D-10): o SJT de multipla escolha legivel no hub do RH, SEM gabarito. Devolve '
  '{situacao, itens}; itens, na ordem de scores_candidato.metadata.respostas (linha tipo=sjt, subtipo=mc): '
  '{pergunta_id, cenario, alternativas:[{opcao_id, texto, escolhida}], escolhida_tag, escolhida_peso, '
  'escolhida_no_banco}. Etiqueta e peso SO da escolhida (os da resposta gravada); nenhuma etiqueta, peso ou '
  'ordem de alternativa sai nem e lida. Alternativas de perguntas_opcao_sjt em ORDEM NEUTRA ESTAVEL '
  'md5(pergunta_id::text || opcao_id::text) — nunca por ordem, que em PROD e o gabarito (Achado F2). perguntas '
  'lidas SEM filtro de status (as respostas apontam para itens retirados do banco). situacao: disponivel | '
  'sem_sjt_mc (sem linha sjt/mc, itens []); linha sem metadata.respostas (versao antiga do motor) sai '
  'disponivel com itens []. Guarda FAIL-CLOSED (sem sub ou sem papel rh/administrador: 42501) e, no ramo rh, '
  'public.is_active_rh_user ANTES de qualquer busca (as policies do banco SJT sao so de JWT — Achado F5). '
  'Candidatura VIVA (deleted_at IS NULL AND is_rascunho = false): ausente, excluida e rascunho dao o MESMO '
  'no_data_found (P0002) — decisao do 52-08. STABLE SECURITY DEFINER, search_path vazio. REVOKE de PUBLIC e '
  'de anon NOMINALMENTE (pg_default_acl), GRANT EXECUTE a authenticated.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · ler_contexto_rejeicao_triagem_revisao — D-38 (Achado F3)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.ler_contexto_rejeicao_triagem_revisao(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_role    text := (select auth.jwt() #>> '{app_metadata,role}');
  v_cand    uuid;
  v_origem  text;
  v_hist    uuid;
  v_motivo  text;
  v_just    text;
BEGIN
  -- Papel fail-closed (coalesce: sem JWT -> 42501) e sub obrigatório.
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- D-10: rh ATIVO, ANTES de qualquer busca — o token velho não aprende se o pedido existe.
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT r.candidatura_id, r.origem, r.historico_rejeicao_id
    INTO v_cand, v_origem, v_hist
    FROM public.revisao_rejeicao r
   WHERE r.id = p_pedido_id;
  IF NOT FOUND OR v_origem IS DISTINCT FROM 'humana_triagem' THEN
    RAISE EXCEPTION 'pedido de revisao de rejeicao pela triagem inexistente' USING ERRCODE = 'no_data_found';
  END IF;

  -- Candidatura viva: excluída e rascunho dão o MESMO erro do pedido inexistente.
  SELECT c.motivo_rejeicao INTO v_motivo
    FROM public.candidaturas c
   WHERE c.id = v_cand AND c.deleted_at IS NULL AND c.is_rascunho = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pedido de revisao de rejeicao pela triagem inexistente' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT h.criterio_texto INTO v_just
    FROM public.historico_candidatura h
   WHERE h.id = v_hist
     AND h.candidatura_id = v_cand;

  RETURN jsonb_build_object('situacao', 'disponivel',
                            'motivo', nullif(btrim(coalesce(v_motivo, '')), ''),
                            'justificativa', nullif(btrim(coalesce(v_just, '')), ''));
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_contexto_rejeicao_triagem_revisao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_contexto_rejeicao_triagem_revisao(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_contexto_rejeicao_triagem_revisao(uuid) TO authenticated;

COMMENT ON FUNCTION public.ler_contexto_rejeicao_triagem_revisao(uuid) IS
  'P52 / JORN-62 (D-38, Achado F3): ao responder a revisao de uma rejeicao PELO RH (revisao_rejeicao.origem = '
  'humana_triagem), o revisor ve {situacao, motivo, justificativa} — situacao sempre disponivel. justificativa = '
  'historico_candidatura.criterio_texto do registro de rejeicao (revisao_rejeicao.historico_rejeicao_id). '
  'motivo = candidaturas.motivo_rejeicao — historico_candidatura nao tem coluna de motivo (medido em '
  '2026-10-11); RESSALVA A5: uma re-rejeicao posterior reescreve motivo_rejeicao; no pedido pendente ele e o '
  'certo. Pedido inexistente, de outra origem (automatica — o knockout tem a sua RPC) ou de candidatura '
  'excluida/rascunho: no_data_found (P0002), mesma mensagem. Guarda FAIL-CLOSED (sem sub ou sem papel '
  'rh/administrador: 42501) e, no ramo rh, public.is_active_rh_user ANTES de qualquer busca (o token de '
  'recrutador desativado recebe 42501 sem aprender se o pedido existe). revisao_rejeicao nao tem policy de RH '
  '(RLS ligada, 0 policies): sem esta RPC o motivo nao chega a tela. STABLE SECURITY DEFINER, search_path '
  'vazio. REVOKE de PUBLIC e de anon NOMINALMENTE (pg_default_acl), GRANT EXECUTE a authenticated.';


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
  v_seg   text;
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
             'texto_interpretativo', 'c.deleted_at IS NULL AND c.is_rascunho = false']),
      ('public.ler_sjt_mc_rh(uuid)', 'sjt',
       ARRAY['FROM public.scores_candidato', 'FROM public.perguntas_opcao_sjt o', 'LEFT JOIN public.perguntas p',
             'ORDER BY md5(o.pergunta_id::text || o.opcao_id::text)', 'ORDER BY r.ord',
             'c.deleted_at IS NULL AND c.is_rascunho = false']),
      ('public.ler_contexto_rejeicao_triagem_revisao(uuid)', 'triagem',
       ARRAY['FROM public.revisao_rejeicao', 'v_origem IS DISTINCT FROM ''humana_triagem''', 'no_data_found',
             'h.criterio_texto', 'h.id = v_hist', 'c.motivo_rejeicao',
             'c.deleted_at IS NULL AND c.is_rascunho = false'])
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
    -- SJT sem gabarito (D-21/D-37, Achado F2): o objeto das alternativas (do rótulo até o ORDER BY
    -- neutro) não carrega etiqueta, peso nem ordem; e nenhuma coluna `.tag`/`.peso`/`.ordem` é lida.
    IF r.rotulo = 'sjt' THEN
      v_seg := substr(v_cod, strpos(v_cod, '''alternativas'''),
                      strpos(v_cod, 'ORDER BY md5(') - strpos(v_cod, '''alternativas'''));
      IF strpos(v_cod, '''alternativas''') = 0 OR v_seg IS NULL OR length(v_seg) = 0
         OR v_seg ~* '(tag|peso|ordem)' THEN
        RAISE EXCEPTION 'P52-01 POS-PORTAO: ler_sjt_mc_rh — o objeto das alternativas (antes do ORDER BY neutro) cita etiqueta/peso/ordem ou nao foi achado: «%»', left(coalesce(v_seg, '<nulo>'), 200);
      END IF;
      IF v_cod ~* '\.(tag|peso|ordem)\M' THEN
        RAISE EXCEPTION 'P52-01 POS-PORTAO: ler_sjt_mc_rh le coluna de etiqueta/peso/ordem do banco (o gabarito)';
      END IF;
    END IF;
    v_ev := v_ev || (r.rotulo || '=ok');
  END LOOP;

  PERFORM set_config('p52.evidencia',
    btrim(coalesce(current_setting('p52.evidencia', true), '') || ' leituras:' || array_to_string(v_ev, ',')), false);
END
$pos$;
