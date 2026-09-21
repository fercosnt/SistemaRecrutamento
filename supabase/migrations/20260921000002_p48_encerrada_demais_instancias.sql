-- =============================================================================
-- 20260921000002 — candidatura_encerrada nas demais instâncias vivas:
--                  retirar (D2), rejeitar (D3), fila de trabalho (D4), KPI do funil (D6)
-- =============================================================================
-- Phase 48 / Plano 48-01 · JORN-26 · D-11 · D-21 ·
-- `.planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-ETAPA-ATUAL.md` §5
--
-- A `…000001` criou `public.candidatura_encerrada(etapa, status)` e consertou D1
-- (`registrar_pedido_exclusao`). Esta migration aplica o MESMO predicado às outras
-- quatro instâncias vivas da mesma forma — código que decide «acabou / está em
-- andamento» olhando só `etapa_atual`:
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-21):
--   D2 · `retirar_candidatura(uuid)` — guard `v_etapa IN ('aprovado','rejeitado')` e
--        UPDATE `etapa_atual NOT IN (...)`. A UI esconde a ação (o front usa `status`),
--        mas o caminho NÃO-UI (EF `executar-direito-titular`, acao=`retirar_candidatura`)
--        retirava uma candidatura de knockout e disparava o aviso ao RH.
--   D3 · `rejeitar_candidatura(...)` — guard terminal `IF v_etapa IN (...)`. Aceitava
--        rejeitar DE NOVO um knockout: reescrevia `motivo_rejeicao = 'knockout_automatico'`
--        pelo motivo do RH, gravava histórico `inscricao → rejeitado` e — DEPOIS do
--        JORN-18 (plano 48-08, chave de dedupe por transição) — geraria um SEGUNDO
--        e-mail de rejeição. Esta trava é PRÉ-REQUISITO daquele plano.
--   D4 · `v_fila_trabalho` — `WHERE c.etapa_atual <> ALL (ARRAY['aprovado','rejeitado'])`.
--        A fila de trabalho do RH mostrava 3 knockouts + 3 `finalizado` legados como
--        trabalho pendente, com selo de SLA vencido.
--   D6 · `funil_kpis(uuid)` CTE `volume` — `GROUP BY c.etapa_atual` como «volume atual
--        por etapa»: o knockout somava em `inscricao`, o `finalizado` legado na etapa
--        de trabalho onde ficou parado.
--
-- O QUE NÃO MUDA, DE PROPÓSITO:
--   · O UPDATE único de `rejeitar_candidatura` é BYTE A BYTE o que era — o
--     `feedback_rejeicao` neutro é do plano 48-09, que parte do corpo instalado aqui.
--     Provado abaixo por md5 do trecho, antes e depois.
--   · D6 preserva os baldes terminais: `aprovado` e `rejeitado` continuam contando
--     tudo o que está NAQUELA etapa. Só as etapas de TRABALHO deixam de contar linha
--     encerrada. O knockout continua medido onde sempre foi: `knockout_rate`.
--   · As colunas de `v_fila_trabalho`, nome e ordem — provado abaixo contra a lista
--     lida no pré-portão (T-48-01-05).
--   · A purga (`candidaturas_alem_da_janela`) — D-21. md5 conferido no fim.
--   · Mensagem e SQLSTATE do D2 (`CANDIDATURA_NAO_RETIRAVEL`, 22023): a EF e o front
--     casam o prefixo (`executar-direito-titular/index.ts:308`,
--     `useRetirarCandidatura.ts:65`).
--
-- BASE DOS CORPOS. Cada `CREATE OR REPLACE` parte da definição VIVA
-- (`pg_get_functiondef` / `pg_get_viewdef`, 2026-09-21). Divergências do vivo contra
-- os arquivos de origem, registradas no SUMMARY do 48-01: só COMENTÁRIOS (o vivo de
-- `rejeitar_candidatura` e `funil_kpis` tem comentários resumidos/ausentes — a
-- transcrição do `apply_migration` do MCP, que o CLAUDE.md descreve) e uma linha em
-- branco em `retirar_candidatura`. Nenhuma divergência de código.
--   retirar_candidatura   md5(prosrc) = c55efb56825bb31908a216855717f9d0  (base 20260805000007:163-234)
--   rejeitar_candidatura  md5(prosrc) = 04312b1054eabe5c9de0e7e33af925d2  (base 20260714100001:88-152)
--   funil_kpis            md5(prosrc) = 375d2fc7cbda3984db300d883fea9c65  (base 20260716000003:65-159)
--   v_fila_trabalho       md5(pg_get_viewdef(.., true)) = 598378aa29bb1c1003b4b19adb934197
--
-- AUTHZ. `CREATE OR REPLACE` preserva o ACL de cada objeto. ACL vivo lido em
-- 2026-09-21 e reafirmado abaixo onde o plano pede:
--   · retirar_candidatura: postgres, service_role, authenticated (sem anon) — a
--     `20260805000009:170-171` concedeu `authenticated`; o COMMENT antigo da função
--     ainda diz «o ÚNICO GRANT é para o papel de servidor», e está desatualizado
--     desde então. Reafirmado como está VIVO (fora do escopo deste plano mudá-lo).
--   · v_fila_trabalho: `GRANT SELECT … TO authenticated` reafirmado. A view é
--     `security_invoker`, então a função canônica roda com o papel de quem consulta —
--     por isso `candidatura_encerrada` concede EXECUTE a `authenticated`.
--   · rejeitar_candidatura e funil_kpis: ACL NÃO tocado (preservado). Registrado no
--     SUMMARY: ambos concedem EXECUTE a `anon` hoje; os guards de corpo (papel em
--     rh/administrador; escopo por `created_by = auth.uid()`) fecham o acesso.
--
-- IDEMPOTÊNCIA. `CREATE OR REPLACE`. Os pré-portões RECUSAM uma segunda execução (o
-- vivo deixa de ser o medido) — de propósito: re-rodar sobre um corpo que outra
-- migration já alterou apagaria essa alteração em silêncio. O `p46apply.cjs` também
-- recusa reaplicar uma `version` que já está no ledger.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/GRANT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000002_p48_encerrada_demais_instancias.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação,
-- md5 de statements[1] conferido por leitura de volta. A `version` nasce correta).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — um por objeto. E captura, na própria transação, as duas linhas de
-- base que a auto-verificação do fim compara: as colunas da view e o md5 do UPDATE
-- único de `rejeitar_candidatura`.
-- ---------------------------------------------------------------------------
DO $pre_portao_p48_02$
DECLARE
  v_md5     text;
  v_src     text;
  v_upd     text;
  v_cols    text;
BEGIN
  IF to_regprocedure('public.candidatura_encerrada(public.etapa_processo, public.status_candidatura)') IS NULL THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: public.candidatura_encerrada NAO existe — aplicar 20260921000001 antes desta';
  END IF;

  SELECT md5(p.prosrc) INTO v_md5 FROM pg_proc p
   WHERE p.oid = 'public.retirar_candidatura(uuid)'::regprocedure;
  IF v_md5 IS DISTINCT FROM 'c55efb56825bb31908a216855717f9d0' THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: retirar_candidatura vivo md5 = %, medido = c55efb56825bb31908a216855717f9d0 — reler o vivo e refazer', v_md5;
  END IF;

  SELECT md5(p.prosrc), p.prosrc INTO v_md5, v_src FROM pg_proc p
   WHERE p.oid = 'public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM '04312b1054eabe5c9de0e7e33af925d2' THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: rejeitar_candidatura vivo md5 = %, medido = 04312b1054eabe5c9de0e7e33af925d2 — reler o vivo e refazer', v_md5;
  END IF;
  v_upd := substring(v_src FROM '(UPDATE public\.candidaturas.*?WHERE id = p_candidatura_id;)');
  IF v_upd IS NULL THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: nao achei o UPDATE unico no corpo vivo de rejeitar_candidatura — a prova de byte-identidade nao teria base';
  END IF;
  PERFORM set_config('p48_02.upd_md5', md5(v_upd), true);

  SELECT md5(p.prosrc) INTO v_md5 FROM pg_proc p
   WHERE p.oid = 'public.funil_kpis(uuid)'::regprocedure;
  IF v_md5 IS DISTINCT FROM '375d2fc7cbda3984db300d883fea9c65' THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: funil_kpis vivo md5 = %, medido = 375d2fc7cbda3984db300d883fea9c65 — reler o vivo e refazer', v_md5;
  END IF;

  v_md5 := md5(pg_get_viewdef('public.v_fila_trabalho'::regclass, true));
  IF v_md5 IS DISTINCT FROM '598378aa29bb1c1003b4b19adb934197' THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: v_fila_trabalho viva md5(viewdef) = %, medido = 598378aa29bb1c1003b4b19adb934197 — reler a viva e refazer', v_md5;
  END IF;

  SELECT string_agg(c.column_name || ':' || c.udt_name, ',' ORDER BY c.ordinal_position)
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'v_fila_trabalho';
  PERFORM set_config('p48_02.fila_cols', v_cols, true);

  SELECT md5(p.prosrc) INTO v_md5 FROM pg_proc p
   WHERE p.oid = 'public.candidaturas_alem_da_janela()'::regprocedure;
  IF v_md5 IS DISTINCT FROM 'b4fdb3a1243f9375cd15a61ef27189f1' THEN
    RAISE EXCEPTION 'P48-02 PRE-PORTAO: a purga mudou (md5 %) — a prova de nao-toque (D-21) perderia a linha de base', v_md5;
  END IF;
END
$pre_portao_p48_02$;


-- ---------------------------------------------------------------------------
-- D2 — retirar_candidatura. Duas trocas: o guard (que passa a ler `status`) e o
-- predicado do UPDATE. Mensagem e SQLSTATE do guard INALTERADOS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retirar_candidatura(p_candidatura_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $retirar_candidatura$
DECLARE
  v_uid     uuid := auth.uid();
  v_dono    uuid;
  v_ja      timestamptz;
  v_deleted timestamptz;
  v_etapa   public.etapa_processo;
  v_status  public.status_candidatura;
  v_out     timestamptz;
BEGIN
  -- ── GUARD, DUAS METADES ────────────────────────────────────────────────────
  -- (a) chamador SEM claim nenhuma e recusado EXPLICITAMENTE. Toda funcao DEFINER
  --     nova neste projeto nasce executavel por `anon` (`pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO), e o REVOKE do BLOCO D e a
  --     outra metade — mas um guard que dependesse so do ACL seria um guard
  --     confiado a uma configuracao de schema.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao retira candidatura'
      USING ERRCODE = '42501';
  END IF;

  SELECT cd.user_id, c.encerrada_a_pedido_em, c.deleted_at, c.etapa_atual, c.status
    INTO v_dono, v_ja, v_deleted, v_etapa, v_status
    FROM public.candidaturas c
    JOIN public.candidatos cd ON cd.id = c.candidato_id
   WHERE c.id = p_candidatura_id;

  -- (b) titularidade por `IS DISTINCT FROM`, NUNCA por `NOT IN`: com um dos lados
  --     NULL o `NOT IN` avalia NULL, o `IF` nao e tomado, e o guard FALHA ABERTO
  --     justamente para o chamador mais suspeito (defeito REAL medido na 42-06).
  --     A forma NULL-safe tambem cobre "candidatura inexistente": `v_dono` fica
  --     NULL, `NULL IS DISTINCT FROM <uid>` e TRUE, e a funcao recusa. Falha
  --     FECHADA por construcao, nao por lembranca.
  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: a candidatura so pode ser retirada pelo proprio titular'
      USING ERRCODE = '42501';
  END IF;

  -- ── IDEMPOTENCIA POR ESTADO, NUNCA POR try/catch ───────────────────────────
  -- Ja retirada devolve A MESMA data, sem mutar nada e sem empurrar o fato para
  -- frente. Um segundo toque no mesmo card nao pode reescrever a data que a tela
  -- ja mostrou ao titular ("Voce retirou sua candidatura em {dd/mm/aaaa}").
  IF v_ja IS NOT NULL THEN
    RETURN v_ja;
  END IF;

  -- ⚠ FECHA NO JA ENCERRADO E NO JA REMOVIDO. Recusa com 22023
  -- (invalid_parameter_value) para que a Edge Function traduza para 400 VALIDATION
  -- com codigo proprio — NUNCA 500: uma candidatura ja encerrada e fato do dominio,
  -- nao falha de servidor. A UI ja nao renderiza a acao nesse estado (UI-SPEC
  -- §Retirar minha candidatura); este ramo e a rede para o caminho nao-UI.
  -- «Encerrada» e `public.candidatura_encerrada(etapa, status)` (Phase 48 / JORN-26):
  -- o knockout fica em `inscricao` com `status = 'rejeitado'` por desenho, e o guard
  -- antigo, so por etapa, o deixava ser retirado — avisando os RH.
  IF v_deleted IS NOT NULL OR public.candidatura_encerrada(v_etapa, v_status) THEN
    RAISE EXCEPTION 'CANDIDATURA_NAO_RETIRAVEL: so uma candidatura em andamento pode ser retirada a pedido'
      USING ERRCODE = '22023';
  END IF;

  -- ── O ENCERRAMENTO: UMA COLUNA ADITIVA, E NADA MAIS ────────────────────────
  -- ⚠ NAO toca `etapa_atual` (esse e o caminho da REJEICAO — ver a PROVENIENCIA no
  -- cabecalho, item 4). ⚠ NAO escreve em `historico_candidatura`, que tem UM unico
  -- escritor desde o M2/Phase 6, e portanto NAO dispara notificacao de transicao.
  -- ⚠ NAO toca `deleted_at`, para que as cinco leituras de RH que filtram
  -- `.is('deleted_at', null)` continuem vendo a linha (Invariante 9 da 45-UI-SPEC:
  -- o silencio tambem e proibido — uma candidatura que hoje soma na etapa e amanha
  -- nao esta la e um recrutador agendando entrevista com quem saiu).
  -- O predicado repete o guard NA ESCRITA: entre o SELECT e o UPDATE a linha pode ter
  -- sido encerrada por outro caminho, e o UPDATE nao pode confiar na leitura.
  UPDATE public.candidaturas c
     SET encerrada_a_pedido_em = now()
   WHERE c.id = p_candidatura_id
     AND c.encerrada_a_pedido_em IS NULL
     AND c.deleted_at IS NULL
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
  RETURNING c.encerrada_a_pedido_em INTO v_out;

  RETURN v_out;
END;
$retirar_candidatura$;

-- ACL vivo reafirmado (lido em 2026-09-21: postgres, service_role, authenticated).
REVOKE ALL ON FUNCTION public.retirar_candidatura(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retirar_candidatura(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- D3 — rejeitar_candidatura. O SELECT passa a ler `status`; o guard terminal passa a
-- ser o predicado canônico. O UPDATE único NÃO muda (48-09 é quem o toca).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rejeitar_candidatura(
  p_candidatura_id uuid,
  p_motivo         public.motivo_rejeicao_rh,
  p_justificativa  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $rejeitar_candidatura$
DECLARE
  v_vaga_owner uuid;
  v_role       text;
  v_etapa      public.etapa_processo;
  v_status     public.status_candidatura;
  v_just       text := btrim(coalesce(p_justificativa, ''));
BEGIN
  -- (0) Role membership guard FIRST (WR-02): candidato/anon rejected before any lookup -> no existence oracle
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (1) Server-authoritative >=50 gate
  IF char_length(v_just) < 50 THEN
    RAISE EXCEPTION 'A justificativa da rejeição precisa de pelo menos 50 caracteres'
      USING ERRCODE = 'check_violation';
  END IF;

  -- (2) Resolve candidatura -> vaga owner + etapa + status
  SELECT v.created_by, c.etapa_atual, c.status
    INTO v_vaga_owner, v_etapa, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2b) Own-vaga guard (WR-04): rh must own; administrador bypasses
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
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
  UPDATE public.candidaturas
     SET etapa_atual         = 'rejeitado',
         status              = 'rejeitado',
         motivo_rejeicao     = p_motivo::text,
         etapa_justificativa = v_just
   WHERE id = p_candidatura_id;
END;
$rejeitar_candidatura$;


-- ---------------------------------------------------------------------------
-- D4 — v_fila_trabalho. Mesmas colunas, mesma ordem; só o filtro terminal muda.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_fila_trabalho
WITH (security_invoker = true) AS
  SELECT c.id                                                             AS candidatura_id,
         c.vaga_id                                                        AS vaga_id,
         v.titulo                                                         AS vaga_titulo,
         c.candidato_id                                                   AS candidato_id,
         ca.nome_completo                                                 AS candidato_nome,
         c.etapa_atual                                                    AS etapa_atual,
         c.status                                                         AS status,
         GREATEST(MAX(h.criado_em), c.data_candidatura, c.created_at)     AS entrou_etapa_em
    FROM public.candidaturas c
    JOIN public.vagas        v  ON v.id  = c.vaga_id
    LEFT JOIN public.candidatos ca ON ca.id = c.candidato_id
    LEFT JOIN public.historico_candidatura h ON h.candidatura_id = c.id
   WHERE c.deleted_at IS NULL
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status)
   GROUP BY c.id, c.vaga_id, v.titulo, c.candidato_id, ca.nome_completo,
            c.etapa_atual, c.status, c.data_candidatura, c.created_at;

GRANT SELECT ON public.v_fila_trabalho TO authenticated;

COMMENT ON VIEW public.v_fila_trabalho IS
  'Phase 34 / KPI-01/03: cross-vaga work queue. security_invoker=true -> scope is inherited '
  'from the RH rh_le_candidaturas vaga-scoped RLS (NOT a DEFINER view). entrou_etapa_em = '
  'MAX(historico.criado_em) (when the candidatura entered its current etapa), coalesced to '
  'data_candidatura/created_at. SLA aging/breach thresholds are applied client-side '
  '(SLA_POR_ETAPA constant). '
  'Phase 48 / JORN-26 (D4): candidaturas ENCERRADAS excluded by public.candidatura_encerrada('
  'etapa_atual, status) — terminal etapa (aprovado/rejeitado) OR terminal status '
  '(rejeitado/finalizado). The knockout (inscricao + rejeitado) and the legacy finalizado '
  'rows in working stages are NOT pending work. encerrada_a_pedido_em is NOT a filter here '
  '(Invariante 9 da 45-UI-SPEC: the withdrawn candidatura stays visible to RH).';


-- ---------------------------------------------------------------------------
-- D6 — funil_kpis, CTE `volume`. Uma linha nova no WHERE; nada mais.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_is_admin boolean := (auth.jwt() #>> '{app_metadata,role}') = 'administrador';
  v_uid      uuid    := auth.uid();
  r          jsonb;
BEGIN
  WITH scoped_hist AS (
    SELECT h.candidatura_id, h.etapa_de, h.etapa_para, h.criado_em, c.vaga_id
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
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
     WHERE (v_is_admin OR v.created_by = v_uid)
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
     WHERE (v_is_admin OR v.created_by = v_uid)
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
     WHERE (v_is_admin OR v.created_by = v_uid)
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

COMMENT ON FUNCTION public.funil_kpis(uuid) IS
  'Phase 32 (3 keys) + Phase 34 KPI-04 (4 keys). SECURITY DEFINER, owner-scoped (v_is_admin OR '
  'vagas.created_by=auth.uid()), PII-free by construction (never ator/candidatos). Keys: '
  'median_time_per_stage, conversion_stage_to_stage, volume_by_stage (P32) + time_to_hire, '
  'knockout_rate, drop_per_stage, no_show_rate (0-agendamento -> taxa=null). Single-arg (uuid) '
  'all-time cohort. Proven by supabase/tests/funil34_kpis_smokes.sql. '
  'Phase 48 / JORN-26 (D6): volume_by_stage of a WORKING stage excludes candidaturas encerradas '
  '(public.candidatura_encerrada — knockout in inscricao, legacy finalizado); the terminal buckets '
  'aprovado/rejeitado count everything in them, as before. Proven by '
  'supabase/tests/p48_candidatura_encerrada_smoke.sql (g).';


-- ---------------------------------------------------------------------------
-- AUTO-VERIFICAÇÃO por catálogo.
-- ---------------------------------------------------------------------------
DO $verifica_p48_02$
DECLARE
  v_ret   text := pg_get_functiondef('public.retirar_candidatura(uuid)'::regprocedure);
  v_rej   text := pg_get_functiondef('public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure);
  v_fk    text := pg_get_functiondef('public.funil_kpis(uuid)'::regprocedure);
  v_view  text := pg_get_viewdef('public.v_fila_trabalho'::regclass, true);
  v_src   text;
  v_upd   text;
  v_cols  text;
  v_opts  text[];
  v_md5   text;
BEGIN
  -- As três funções e a view chamam o predicado canônico.
  IF position('candidatura_encerrada(v_etapa, v_status)' IN v_ret) = 0
     OR position('candidatura_encerrada(c.etapa_atual, c.status)' IN v_ret) = 0 THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: retirar_candidatura sem o predicado canonico no guard E no UPDATE';
  END IF;
  IF position('candidatura_encerrada(v_etapa, v_status)' IN v_rej) = 0 THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: rejeitar_candidatura sem o predicado canonico no guard terminal';
  END IF;
  IF position('candidatura_encerrada(c.etapa_atual, c.status)' IN v_fk) = 0 THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: funil_kpis sem o predicado canonico na CTE volume';
  END IF;
  IF position('candidatura_encerrada(' IN v_view) = 0 THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: v_fila_trabalho sem o predicado canonico';
  END IF;

  -- Os guards/filtros só-por-etapa sumiram.
  IF v_ret ~ 'v_etapa\s+IN\s*\(' OR v_ret ~ 'etapa_atual\s+NOT\s+IN\s*\(' THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: retirar_candidatura AINDA decide por etapa';
  END IF;
  IF v_rej ~ 'v_etapa\s+IN\s*\(' THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: rejeitar_candidatura AINDA tem o guard terminal so-por-etapa';
  END IF;
  IF v_view ~ '<>\s*ALL' OR v_view ~ 'etapa_atual\s+NOT\s+IN' THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: v_fila_trabalho AINDA filtra so por etapa';
  END IF;

  -- O UPDATE único de rejeitar_candidatura é byte a byte o de antes.
  SELECT p.prosrc INTO v_src FROM pg_proc p
   WHERE p.oid = 'public.rejeitar_candidatura(uuid, public.motivo_rejeicao_rh, text)'::regprocedure;
  v_upd := substring(v_src FROM '(UPDATE public\.candidaturas.*?WHERE id = p_candidatura_id;)');
  IF md5(coalesce(v_upd, '')) IS DISTINCT FROM current_setting('p48_02.upd_md5', true) THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: o UPDATE unico de rejeitar_candidatura MUDOU — ele e do plano 48-09, nao deste';
  END IF;

  -- A view: mesmas colunas na mesma ordem, e segue security_invoker.
  SELECT string_agg(c.column_name || ':' || c.udt_name, ',' ORDER BY c.ordinal_position)
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'v_fila_trabalho';
  IF v_cols IS DISTINCT FROM current_setting('p48_02.fila_cols', true) THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: colunas de v_fila_trabalho mudaram: antes [%] depois [%]',
      current_setting('p48_02.fila_cols', true), v_cols;
  END IF;
  SELECT c.reloptions INTO v_opts FROM pg_class c WHERE c.oid = 'public.v_fila_trabalho'::regclass;
  IF NOT ('security_invoker=true' = ANY (coalesce(v_opts, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: v_fila_trabalho perdeu security_invoker (reloptions %)', v_opts;
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.v_fila_trabalho', 'SELECT') THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: authenticated sem SELECT em v_fila_trabalho';
  END IF;

  -- retirar_candidatura: ACL vivo preservado.
  IF has_function_privilege('anon', 'public.retirar_candidatura(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: anon tem EXECUTE em retirar_candidatura';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.retirar_candidatura(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: service_role perdeu EXECUTE em retirar_candidatura — a EF executar-direito-titular quebraria';
  END IF;

  -- A fila, lida agora, não tem nenhuma linha encerrada.
  IF EXISTS (SELECT 1 FROM public.v_fila_trabalho f
               JOIN public.candidaturas c ON c.id = f.candidatura_id
              WHERE public.candidatura_encerrada(c.etapa_atual, c.status)) THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: v_fila_trabalho ainda lista candidatura encerrada';
  END IF;

  -- A purga não foi tocada (D-21).
  SELECT md5(p.prosrc) INTO v_md5 FROM pg_proc p
   WHERE p.oid = 'public.candidaturas_alem_da_janela()'::regprocedure;
  IF v_md5 IS DISTINCT FROM 'b4fdb3a1243f9375cd15a61ef27189f1' THEN
    RAISE EXCEPTION 'P48-02 VERIFICA: a purga MUDOU (md5 %) — D-21 proibe toca-la', v_md5;
  END IF;

  RAISE NOTICE 'P48-02 OK: retirar/rejeitar/funil_kpis/v_fila_trabalho no predicado canonico; UPDATE de rejeitar intacto; colunas da fila intactas; purga intocada';
END
$verifica_p48_02$;
