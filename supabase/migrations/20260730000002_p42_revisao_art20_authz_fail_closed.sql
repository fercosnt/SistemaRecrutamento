-- =============================================================================
-- Phase 42 / Plano 42-06 (nova rodada do checkpoint da Task 2) — o guard de
-- autorização dos 3 RPCs da revisão Art. 20 passa a FALHAR FECHADO, e `anon`
-- perde o EXECUTE que nunca deveria ter recebido.
-- =============================================================================
-- ORIGEM: o smoke `p42_revisao_art20_smoke.sql` asserção (c) reprovou contra a
-- migration `20260730000001` já aplicada em PROD. A reprovação era LEGÍTIMA —
-- dois defeitos independentes, ambos medidos contra o catálogo vivo, não lidos.
--
-- -----------------------------------------------------------------------------
-- DEFEITO 1 — `anon` tem EXECUTE nos 3 RPCs (inclusive no write-path)
-- -----------------------------------------------------------------------------
-- A `20260730000001` fez, para cada RPC:
--     REVOKE ALL ON FUNCTION … FROM PUBLIC;
--     GRANT EXECUTE ON FUNCTION … TO authenticated;
-- e isso NÃO remove `anon`. Medido em `pg_default_acl`, o schema `public` deste
-- projeto (dono `postgres`, objtype `f`) carrega:
--     {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
-- ou seja: todo `CREATE FUNCTION` em `public` já nasce com EXECUTE concedido a
-- `anon` como grant DIRETO E NOMEADO. `REVOKE … FROM PUBLIC` remove o grant de
-- PUBLIC — que nunca existiu — e deixa `anon=X` de pé. O ACL vivo dos 3 RPCs
-- confirmava: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
--
-- Não é conhecimento novo neste repositório: a migration da P41
-- (`20260727000001`) já revoga de `anon` NOMINALMENTE
-- (`REVOKE ALL ON FUNCTION public.ler_resend_webhook_secret() FROM anon;`).
-- A `20260730000001` regrediu contra um padrão vivo do próprio repo.
--
-- -----------------------------------------------------------------------------
-- DEFEITO 2 (o substantivo) — o guard de papel é NULL-cego
-- -----------------------------------------------------------------------------
-- Os 3 RPCs abriam com a MESMA forma:
--     IF v_role NOT IN ('rh', 'administrador') THEN RAISE … 42501; END IF;
-- Sob lógica de três valores, com `v_role` NULL (chamador SEM JWT algum, que é
-- exatamente o caso `anon`), `NULL NOT IN (…)` avalia para **NULL** — e um `IF`
-- com condição NULL NÃO é tomado. Logo o guard só recusa quando a claim EXISTE e
-- está errada; quando ela está AUSENTE, ele é um no-op e a execução cai no corpo.
-- O guard do decisor tinha o mesmo vício: `v_uid = v_row.por_usuario` com
-- `v_uid` NULL avalia NULL, então nem esse barrava um chamador anônimo.
--
-- O QUE FOI MEDIDO EM PROD (papel `anon`, sem JWT), antes desta correção:
--   · contar_revisoes_pendentes()      -> EXECUTOU, retornou 0
--   · listar_revisoes_decisao(false)   -> EXECUTOU, retornou 0 linhas
--   · responder_revisao_decisao(…)     -> chegou até o UPDATE; barrado por
--     `23514 decisao_final_revisao_resposta_completa_check`, com a linha
--     verificada depois: veredito/autoria/respondida_em TODOS NULL.
--
-- Consequência honesta, sem inflar nem minimizar: **não havia escrita indevida
-- possível e nenhum PII vazou.** Os dois leitores devolviam vazio porque o
-- predicado de escopo (`v_role = 'administrador' OR (v_role = 'rh' AND …)`)
-- também colapsa para NULL, e o escritor era barrado pelo CHECK de completude
-- (veredito exige autor). Mas em TODOS os três casos o que fechou o caminho foi
-- um mecanismo A JUSANTE — predicado de escopo e CHECK — e não o controle de
-- autorização. Isso contraria diretamente a doutrina que este projeto já
-- registrou na STATE.md: "policy PERMISSIVE mal escrita abre acesso; a ausência
-- nunca abre". Um controle que só funciona porque outra coisa o socorre não é um
-- controle; é uma coincidência com prazo de validade — qualquer relaxamento
-- futuro do CHECK ou do predicado converteria isto em falha real.
--
-- O resíduo que ERA exposição real: `responder_revisao_decisao` devolvia
-- SQLSTATEs distinguíveis a um chamador anônimo — `P0002` (decisão inexistente),
-- `22023` (sem pedido de revisão), `22023 revisao ja respondida`, `23514`
-- (respondível). Isso é um ORÁCULO DE ESTADO sobre o pedido de revisão Art. 20 de
-- um titular, alcançável com a anon key pública e um `candidatura_id` válido.
-- Esta migration o fecha: com o guard falhando fechado, todo chamador sem JWT
-- recebe `42501` e nada mais — um único SQLSTATE, zero informação diferencial.
--
-- -----------------------------------------------------------------------------
-- NATUREZA DESTA MIGRATION
-- -----------------------------------------------------------------------------
-- Estritamente CORRETIVA e restritiva: só reescreve corpos de função e REVOGA
-- privilégio. Zero DDL de tabela, zero DML, zero linha de dado tocada. Não é
-- alcançada pelo portão de fase destrutiva do ROADMAP (que na Phase 42 se aplica
-- só ao INVENT-05 / plano 42-12).
--
-- `service_role` MANTÉM o EXECUTE deliberadamente: é o papel de servidor confiável
-- deste projeto (Edge Functions), o smoke não assere nada sobre ele, e revogá-lo
-- aqui quebraria os planos 42-07/42-08 sem que nenhum requisito o peça.
--
-- Sem wrapper BEGIN/COMMIT (CLAUDE.md): o driver envolve cada migration na sua
-- própria transação implícita, e o wrapper externo é o gatilho do 42601 em corpos
-- delimitados por cifrões. Aplicada via MCP `apply_migration`, nunca `db push`.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. responder_revisao_decisao — o WRITE-PATH. Guard fail-closed em três camadas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.responder_revisao_decisao(
  p_candidatura_id uuid,
  p_veredito       text,
  p_justificativa  text
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row  public.decisao_final;
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- (1) PAPEL — `coalesce` é o que torna o guard fail-closed: sem JWT, v_role é
  -- NULL, e a forma anterior (`v_role NOT IN (…)`) avaliava NULL e NÃO tomava o
  -- IF. Com coalesce para '', a comparação é sempre booleana e sempre recusa.
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (2) SUJEITO — uma claim de papel válida com `sub` ausente não pode passar:
  -- v_uid alimenta a autoria gravada E a comparação com o decisor. NULL aqui
  -- tornaria as duas coisas sem sentido.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT * INTO v_row
    FROM public.decisao_final
   WHERE candidatura_id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decisao inexistente' USING errcode = 'no_data_found';
  END IF;

  IF v_row.revisao_solicitada_em IS NULL THEN
    RAISE EXCEPTION 'sem pedido de revisao para esta decisao' USING errcode = '22023';
  END IF;

  -- (3) DECISOR ≠ REVISOR (D-P42-09, absoluto). `por_usuario` NULL significa que
  -- a autoria da decisão original não foi gravada — nesse estado o guard seria
  -- INVERIFICÁVEL, e o key_link do plano 42-06 nomeia exatamente esse risco
  -- ("se aquela coluna deixar de ser preenchida, o guard vira no-op"). Recusar é
  -- a única leitura compatível com "sem override e sem fallback": um guard que
  -- não pode ser verificado tem de barrar, nunca liberar.
  IF v_row.por_usuario IS NULL THEN
    RAISE EXCEPTION 'decisao sem autoria registrada — revisao nao pode ser respondida (decisor indeterminado)'
      USING errcode = '42501';
  END IF;

  IF v_uid = v_row.por_usuario THEN
    RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)'
      USING errcode = '42501';
  END IF;

  IF v_row.revisao_respondida_em IS NOT NULL THEN
    RAISE EXCEPTION 'revisao ja respondida' USING errcode = '22023';
  END IF;

  IF p_veredito NOT IN ('mantida', 'revertida') THEN
    RAISE EXCEPTION 'veredito invalido' USING errcode = '22023';
  END IF;

  IF length(btrim(coalesce(p_justificativa, ''))) < 50 THEN
    RAISE EXCEPTION 'justificativa precisa de ao menos 50 caracteres' USING errcode = '22023';
  END IF;

  UPDATE public.decisao_final
     SET revisao_veredito      = p_veredito,
         revisao_resultado     = p_justificativa,
         revisao_por_usuario   = v_uid,
         revisao_respondida_em = pg_catalog.now()
   WHERE candidatura_id = p_candidatura_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.responder_revisao_decisao(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.responder_revisao_decisao(uuid, text, text) IS
  'Unico write-path da resposta a revisao de decisao (LGPD Art. 20, REVISAO-03). '
  'decisao_final nao tem policy de UPDATE, logo este DEFINER e o unico caminho. '
  'Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501, nunca no-op) '
  'e sub obrigatorio (42501). Recusa 42501 se o chamador for o decisor (REVISAO-05, '
  'sem override de administrador) e tambem se a decisao original nao tiver autoria '
  'registrada (guard inverificavel barra, nao libera). 22023 se nao houver pedido de '
  'revisao, se ja respondida, se veredito fora de mantida/revertida, ou se a '
  'justificativa tiver menos de 50 caracteres. P0002 se a decisao nao existir. '
  'Nao despacha notificacao (o trigger dos planos 42-07/42-08 e o unico despachante). '
  'REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. listar_revisoes_decisao — leitor da fila.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.listar_revisoes_decisao(
  p_incluir_respondidos boolean DEFAULT false
)
RETURNS TABLE(
  candidatura_id         uuid,
  candidato_nome         text,
  vaga_titulo            text,
  decisao                text,
  decidido_por_nome      text,
  revisao_solicitada_em  timestamp with time zone,
  revisao_respondida_em  timestamp with time zone,
  revisao_veredito       text,
  revisao_resultado      text,
  respondida_por_nome    text,
  pode_responder         boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         )
   ORDER BY d.revisao_solicitada_em ASC
   LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_revisoes_decisao(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listar_revisoes_decisao(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.listar_revisoes_decisao(boolean) TO authenticated;

COMMENT ON FUNCTION public.listar_revisoes_decisao(boolean) IS
  'Leitor da fila de revisao Art. 20 (REVISAO-02). RETURNS TABLE com 11 colunas '
  'NOMEADAS — nunca SETOF decisao_final, que arrastaria toda coluna futura — e NAO '
  'projeta decisao_final.justificativa (texto interno do recrutador). Reimplementa o '
  'escopo por vaga DENTRO do DEFINER porque SECURITY DEFINER bypassa RLS. Guard '
  'FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501) e sub obrigatorio. '
  'pode_responder e espelho COSMETICO do guard — quem impede e o RPC de escrita. '
  'REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. contar_revisoes_pendentes — contador do badge da sidebar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.contar_revisoes_pendentes()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         );

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.contar_revisoes_pendentes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contar_revisoes_pendentes() FROM anon;
GRANT EXECUTE ON FUNCTION public.contar_revisoes_pendentes() TO authenticated;

COMMENT ON FUNCTION public.contar_revisoes_pendentes() IS
  'Contador de revisoes Art. 20 pendentes para o badge da sidebar do RH. Mesmo '
  'escopo por vaga de listar_revisoes_decisao, reimplementado dentro do DEFINER. '
  'Guard FAIL-CLOSED: papel resolvido com coalesce (sem JWT -> 42501, nunca no-op) '
  'e sub obrigatorio. Recusa: 42501 se o papel nao for rh/administrador. '
  'REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated.';
