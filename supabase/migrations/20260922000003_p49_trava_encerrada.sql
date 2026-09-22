-- =============================================================================
-- 20260922000003 — a trava D-35: o banco recusa mover candidatura ENCERRADA,
--                  e as duas transições sancionadas entram pela GUC
--                  (JORN-25 · D-35 · D-01)
-- =============================================================================
-- Phase 49 / plano 49-06, Task 1 (tracer). Objetos: `public.avancar_etapa()`,
-- `public.responder_revisao_decisao(uuid,text,text)`,
-- `public.registrar_decisao(uuid,public.decisao_final_resultado,text)`.
--
-- ---------------------------------------------------------------------------
-- O QUE ESTAVA ERRADO (medido em PROD em 2026-09-22, só leitura)
-- ---------------------------------------------------------------------------
-- `avancar_etapa()` não tinha NENHUMA trava de candidatura encerrada. O corpo vivo
-- (md5(prosrc) = b1f9225f8b4556457d289519e3b1064d, length 1534) sai cedo quando a etapa não
-- muda (L11-13), exige justificativa na regressão (L15-21), confere a bandeira de entrevista
-- num avanço para além de `entrevista_online` (L24-37) e grava o histórico (L40-47). Nada
-- disso olha o ESTADO ANTERIOR: um knockout `inscricao/rejeitado` movido para
-- `avaliacao_assincrona` era um AVANÇO aceito — gravava linha em `historico_candidatura`,
-- e o `trg_notif_transicao` despachava o evento `avanco`, que virava e-mail «você avançou»
-- para quem já tinha sido eliminado (D-35; a camada da EF é o plano 49-03, já no ar).
--
-- Varredura C1-P4 desta sessão — os escritores VIVOS de `etapa_atual` são cinco, e só dois
-- podem mover uma candidatura encerrada:
--   · `avancar_etapa()`               — é o trigger; passa a ser a trava (este arquivo)
--   · `registrar_decisao`             — move encerrada para terminal (o caso legado
--                                       `triagem/finalizado → aprovado`): sancionado `decisao`
--   · `responder_revisao_decisao`     — `rejeitado/rejeitado → decisao_final/em_analise`
--                                       (D-01, Art. 20): sancionado `reabertura`
--   · `rejeitar_candidatura`          — JÁ recusa encerrada pelo predicado canônico
--                                       («candidatura já encerrada … não pode ser rejeitada
--                                       novamente», check_violation): não precisa de GUC
--   · `submit_candidatura_atomic`     — knockout grava `etapa_atual='inscricao'` sobre
--                                       `inscricao/aguardando_resposta` (etapa igual ⇒ sai no
--                                       early-return) e o caminho feliz é
--                                       `inscricao → triagem` sobre estado NÃO encerrado:
--                                       não precisa de GUC
--
-- ---------------------------------------------------------------------------
-- POR QUE GUC, E NÃO «DESTINO TERMINAL»
-- ---------------------------------------------------------------------------
-- A exceção poderia ser escrita como «mover encerrada é aceito quando o DESTINO é terminal»
-- — e seria um buraco (RESEARCH §H.1). Um PATCH direto `etapa_atual='aprovado'` num knockout,
-- pela policy `rh_avanca_etapa` do PostgREST, tem destino terminal e seria ACEITO, deixando
-- `status='rejeitado'` com etapa `aprovado`. A sanção é da TRANSIÇÃO, e quem a conhece é a
-- RPC que a executa — por isso ela vem por GUC de transação, no idioma já instalado de
-- `app.rejeicao_sancionada`.
--
-- ⚠ `set_config(…, true)` é SET LOCAL: vale até o fim da TRANSAÇÃO, não do statement
-- (RESEARCH Correção 31). Em produção cada RPC é uma transação e a diferença não aparece;
-- num smoke rodado por `p46apply run` (o arquivo inteiro é UMA transação) a sanção vazaria
-- para todo UPDATE seguinte. Por isso a GUC nova é ZERADA logo depois do UPDATE que ela
-- sanciona. A antiga (`app.rejeicao_sancionada`) não é tocada aqui.
--
-- ⚠ Em `responder_revisao_decisao` o reset vem DEPOIS do `GET DIAGNOSTICS v_n = ROW_COUNT`.
-- Um `PERFORM` entre o UPDATE e o `GET DIAGNOSTICS` zeraria o ROW_COUNT, e o guard
-- «reabertura nao moveu a candidatura (0 linhas)» passaria a reprovar a reabertura correta.
--
-- ---------------------------------------------------------------------------
-- ORDEM DOS TRIGGERS BEFORE em `public.candidaturas` (alfabética, medida no catálogo)
-- ---------------------------------------------------------------------------
--   candidaturas_avancar_etapa_trg   BEFORE UPDATE OF etapa_atual → avancar_etapa()
--   trg_candidaturas_guard_rejeicao  BEFORE UPDATE OF status      → guard_rejeicao_auditada()
--   update_candidaturas_updated_at   BEFORE UPDATE               → update_updated_at_column()
-- A trava roda PRIMEIRO. Um UPDATE que só mexe em `status` não aciona
-- `candidaturas_avancar_etapa_trg` (é `... OF etapa_atual`) — reabrir por status é o JORN-34,
-- e a defesa dele é o ramo novo de `guard_rejeicao_auditada`, na migration irmã (…000004).
--
-- ERRO: `check_violation` (23514) com a mensagem
--   «candidatura encerrada (etapa %, status %) — não pode mudar de etapa»
-- Mesmo SQLSTATE que `rejeitar_candidatura` já usa para a recusa de encerrada.
--
-- AUTHZ / ACL: `CREATE OR REPLACE` preserva o ACL vivo. Medido nesta sessão:
-- `anon` TEM EXECUTE em `avancar_etapa` e em `registrar_decisao` (grant direto do
-- `pg_default_acl` — `REVOKE … FROM PUBLIC` sozinho não basta) e NÃO tem em
-- `responder_revisao_decisao`. Os REVOKE abaixo fecham `anon` nas três, nomeando-o.
-- O guard fail-closed de papel de `registrar_decisao` já roda antes de qualquer leitura,
-- então o REVOKE é defesa em profundidade, não o único portão.
--
-- IDEMPOTÊNCIA: o pré-portão aceita SÓ os md5 de ANTES. Re-aplicar sobre o corpo novo falha
-- de propósito, com mensagem. Um `CREATE OR REPLACE` sobre um corpo que derivou apagaria a
-- divergência em silêncio — e estas três funções são o write-path do funil inteiro.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- `DO`/`REVOKE`/`GRANT` adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000003_p49_trava_encerrada.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — os três corpos vivos são os medidos (md5 + length), um IF por função.
-- ---------------------------------------------------------------------------
DO $pre_p49_06$
DECLARE
  v_md5 text;
  v_len int;
  c_avancar   constant text := 'b1f9225f8b4556457d289519e3b1064d';
  c_responder constant text := '1938fbe30a0787a2d7a2d91b52dd222a';
  c_registrar constant text := '36ab0be3ad7b8d8e8a910b2b99e4b2f9';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.avancar_etapa()'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_avancar THEN
    RAISE EXCEPTION 'P49-06 PRE-PORTAO: o corpo VIVO de avancar_etapa tem md5 % (length %), e o medido e % (length 1534). O CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio no trigger central do funil. Apply abortado: reler pg_get_functiondef, refazer a transcricao e so entao reaplicar.', v_md5, v_len, c_avancar;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_responder THEN
    RAISE EXCEPTION 'P49-06 PRE-PORTAO: o corpo VIVO de responder_revisao_decisao tem md5 % (length %), e o medido e % (length 4506). Apply abortado.', v_md5, v_len, c_responder;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_registrar THEN
    RAISE EXCEPTION 'P49-06 PRE-PORTAO: o corpo VIVO de registrar_decisao tem md5 % (length %), e o medido e % (length 7766). Apply abortado.', v_md5, v_len, c_registrar;
  END IF;
END
$pre_p49_06$;


-- ---------------------------------------------------------------------------
-- (1) avancar_etapa() — corpo VIVO completo + a trava D-35 logo depois do early-return.
--     Nada mais muda aqui: a limpeza de `etapa_justificativa` (JORN-17) e a bandeira só
--     da análise vigente (D-39) são da migration irmã …000004.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.avancar_etapa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ator    uuid := auth.uid();
  v_blocked boolean;
BEGIN
  IF NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
    RETURN NEW;
  END IF;

  -- (P49-06 / D-35 / JORN-25) TRAVA DE CANDIDATURA ENCERRADA.
  --   Olha o ESTADO ANTERIOR pelo predicado canônico `public.candidatura_encerrada`
  --   (etapa IN (aprovado, rejeitado) OR status IN (rejeitado, finalizado)) — nunca uma
  --   cópia do predicado. Quem já saiu do funil não muda de etapa, e por isso não gera
  --   linha de histórico nem despacho de `avanco`.
  --   As DUAS exceções são transições sancionadas pela RPC que as executa, por GUC de
  --   transação: `reabertura` (responder_revisao_decisao, D-01/Art. 20) e `decisao`
  --   (registrar_decisao, inclusive o legado `triagem/finalizado → aprovado`).
  --   Sancionar por GUC e NÃO por destino terminal: um PATCH `etapa_atual='aprovado'` num
  --   knockout, pela policy `rh_avanca_etapa`, passaria pela regra de destino (RESEARCH §H.1).
  --   D8 preservado: a trava recusa mover ENCERRADA; não exige evidência de nada de quem
  --   está em andamento.
  IF public.candidatura_encerrada(OLD.etapa_atual, OLD.status)
     AND coalesce(current_setting('app.transicao_sancionada', true), '') NOT IN ('reabertura', 'decisao') THEN
    RAISE EXCEPTION 'candidatura encerrada (etapa %, status %) — não pode mudar de etapa', OLD.etapa_atual, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.etapa_atual IN ('aprovado', 'rejeitado') THEN
    NULL;
  ELSIF NEW.etapa_atual < OLD.etapa_atual THEN
    IF NEW.etapa_justificativa IS NULL OR btrim(NEW.etapa_justificativa) = '' THEN
      RAISE EXCEPTION 'Regressão de etapa exige justificativa preenchida';
    END IF;
  END IF;

  -- Phase-14 flag guard (ENTREV-03 / RF-24) — preserved
  IF NEW.etapa_atual > OLD.etapa_atual
     AND NEW.etapa_atual > 'entrevista_online'
     AND NEW.etapa_atual NOT IN ('aprovado', 'rejeitado') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.entrevista_analises ea
       WHERE ea.candidatura_id = NEW.id
         AND ea.bloqueio_avanco = true
         AND ea.revisao_confirmada_em IS NULL
    ) INTO v_blocked;
    IF v_blocked THEN
      RAISE EXCEPTION 'bloqueio: revise a bandeira de linguagem/sotaque antes de avancar'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- DBMIG-02: auto_rejeitado true only for a sanctioned terminal auto-reject
  INSERT INTO public.historico_candidatura
    (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
  VALUES
    (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
     v_ator,
     (v_ator IS NULL AND current_setting('app.rejeicao_sancionada', true) IS NOT DISTINCT FROM 'on'
      AND NEW.etapa_atual = 'rejeitado'),
     now());

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.avancar_etapa() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.avancar_etapa() FROM anon;


-- ---------------------------------------------------------------------------
-- (2) responder_revisao_decisao — corpo VIVO completo + a GUC `reabertura` em volta do
--     UPDATE de reabertura. O reset vem DEPOIS do `GET DIAGNOSTICS` (um PERFORM entre os
--     dois zeraria o ROW_COUNT e o guard de «0 linhas» reprovaria a reabertura correta).
-- ---------------------------------------------------------------------------
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
  v_row          public.decisao_final;
  v_uid          uuid := auth.uid();
  v_role         text := (select auth.jwt() #>> '{app_metadata,role}');
  v_etapa        public.etapa_processo;
  v_status       public.status_candidatura;
  v_data_limite  date;
  v_prazo        timestamptz;
  v_n            int;
BEGIN
  IF coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

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

  -- 48-11 / JORN-19 / D-01: `revertida` REABRE — e so ha o que reabrir sobre uma rejeicao
  -- vigente. Conferido ANTES de qualquer escrita (zero escrita na recusa). A candidatura e
  -- lida FOR UPDATE: entre esta leitura e o UPDATE abaixo ninguem a move.
  IF p_veredito = 'revertida' THEN
    IF v_row.decisao IS DISTINCT FROM 'rejeitado' THEN
      RAISE EXCEPTION 'nada a reabrir: a decisao desta candidatura nao e rejeitado'
        USING errcode = '22023';
    END IF;

    SELECT c.etapa_atual, c.status INTO v_etapa, v_status
      FROM public.candidaturas c
     WHERE c.id = p_candidatura_id
       FOR UPDATE;

    IF v_etapa IS DISTINCT FROM 'rejeitado' OR v_status IS DISTINCT FROM 'rejeitado' THEN
      RAISE EXCEPTION 'nada a reabrir: a candidatura nao esta rejeitado/rejeitado'
        USING errcode = '22023';
    END IF;

    -- D-10 / A3: 10 dias corridos em SP; vence no FIM do 10o dia (00:00 de SP do 11o).
    v_data_limite := (pg_catalog.now() AT TIME ZONE 'America/Sao_Paulo')::date + 10;
    v_prazo       := ((v_data_limite + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  -- Veredito + reabertura no MESMO UPDATE: um snapshot so (o 3b nao e agravado).
  UPDATE public.decisao_final
     SET revisao_veredito      = p_veredito,
         revisao_resultado     = p_justificativa,
         revisao_por_usuario   = v_uid,
         revisao_respondida_em = pg_catalog.now(),
         reaberta_em           = CASE WHEN p_veredito = 'revertida'
                                      THEN pg_catalog.now() ELSE reaberta_em END,
         prazo_nova_decisao_em = CASE WHEN p_veredito = 'revertida'
                                      THEN v_prazo ELSE prazo_nova_decisao_em END
   WHERE candidatura_id = p_candidatura_id
   RETURNING * INTO v_row;

  IF p_veredito = 'revertida' THEN
    -- Reabrir, NAO aprovar (D-01, RNF-07a): volta a decisao_final / em_analise, aguardando nova
    -- decisao humana. `rejeitado -> decisao_final` e regressao: avancar_etapa() exige a
    -- justificativa NESTE UPDATE — texto proprio, nunca a residual (Defeito 17) nem a do revisor
    -- (vai a historico_candidatura.criterio_texto, visivel ao titular). data_decisao_final = NULL
    -- (A4): o cartao «Entenda a decisao» some ate a nova decisao.
    --
    -- (P49-06 / D-35) A candidatura esta `rejeitado/rejeitado` — ENCERRADA pelo predicado
    -- canonico. A trava de avancar_etapa() recusaria este UPDATE; a reabertura do Art. 20 e
    -- uma das DUAS transicoes sancionadas, e a sancao e declarada aqui, na RPC que a executa.
    PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'decisao_final',
           status = 'em_analise',
           etapa_justificativa = format(
             'Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
             to_char(v_data_limite, 'DD/MM/YYYY')),
           data_decisao_final = NULL
     WHERE id = p_candidatura_id;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    -- (P49-06) O reset vem DEPOIS do GET DIAGNOSTICS de proposito: um PERFORM entre o UPDATE
    -- e o GET DIAGNOSTICS zeraria o ROW_COUNT e o guard abaixo reprovaria a reabertura
    -- correta. `set_config(…, true)` vale ate o fim da TRANSACAO (Correcao 31) — sem o reset
    -- a sancao vazaria para todo UPDATE seguinte da mesma transacao (num smoke, o arquivo
    -- inteiro e UMA transacao).
    PERFORM set_config('app.transicao_sancionada', '', true);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'reabertura nao moveu a candidatura (% linhas) — nada foi gravado', v_n;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.responder_revisao_decisao(uuid, text, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- (3) registrar_decisao — corpo VIVO completo + a GUC `decisao` em volta de CADA um dos
--     dois UPDATEs de `candidaturas`, com reset logo depois de cada um.
--     A constante sem PII do D-47 é da migration irmã …000004.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_decisao(
  p_candidatura_id uuid,
  p_decisao        public.decisao_final_resultado,
  p_justificativa  text
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_vaga_owner uuid;
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

  -- (1) Resolve the candidatura -> its vaga owner. A missing candidatura -> not found.
  SELECT v.created_by
    INTO v_vaga_owner
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada (%)', p_candidatura_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- (2) Own-vaga guard (the role guard moved to the top, fail-closed). rh -> must own.
  --     administrador -> bypass.
  IF v_role = 'rh' AND v_vaga_owner IS DISTINCT FROM (select auth.uid()) THEN
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
  --     etapa as-is. Fold status + etapa_atual + honest etapa_justificativa into ONE UPDATE. The
  --     candidaturas UPDATE fires avancar_etapa() which writes the ONE historico_candidatura row.
  --
  -- (P49-06 / D-35) A candidatura pode JA estar encerrada quando a decisao e registrada — o
  --     caso legado `triagem/finalizado → aprovado` e exatamente esse. «Decisao» e uma das
  --     DUAS transicoes sancionadas: a GUC e ligada antes de CADA UPDATE e zerada logo depois
  --     (Correcao 31: `set_config(…, true)` vale ate o fim da TRANSACAO e vazaria para o
  --     UPDATE seguinte num smoke).
  IF p_decisao = 'aprovado' THEN
    PERFORM set_config('app.transicao_sancionada', 'decisao', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           status = 'finalizado',
           data_decisao_final = now(),
           etapa_justificativa = p_justificativa
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
           etapa_justificativa = p_justificativa
     WHERE id = p_candidatura_id;
    PERFORM set_config('app.transicao_sancionada', '', true);
  END IF;
  -- em_espera: NO etapa change (decision row only).

  -- RETURN the decisao_final row (readback — no silent no-op).
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- PÓS-PORTÃO — o instalado contém o que entrou E o que não podia sumir.
--   Todas as asserções do pós-portão de 20260921000012:265-294 continuam valendo para
--   `registrar_decisao`, e ele ganha as duas GUCs.
-- ---------------------------------------------------------------------------
DO $pos_p49_06$
DECLARE
  v_av   text := pg_get_functiondef('public.avancar_etapa()'::regprocedure);
  v_re   text := pg_get_functiondef('public.responder_revisao_decisao(uuid,text,text)'::regprocedure);
  v_rd   text := pg_get_functiondef('public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure);
  v_g    int;
  v_z    int;
  v_m_av text;
  v_m_re text;
  v_m_rd text;
BEGIN
  -- (1) avancar_etapa: a trava entrou, e nada vivo saiu.
  IF position('candidatura_encerrada(OLD.etapa_atual, OLD.status)' IN v_av) = 0
     OR position('app.transicao_sancionada' IN v_av) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: avancar_etapa sem a trava D-35 (predicado canonico + GUC sancionada)';
  END IF;
  IF position('Regressão de etapa exige justificativa' IN v_av) = 0
     OR position('app.rejeicao_sancionada' IN v_av) = 0
     OR position('bloqueio: revise a bandeira' IN v_av) = 0
     OR position('INSERT INTO public.historico_candidatura' IN v_av) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: avancar_etapa perdeu um trecho vivo (regressao / rejeicao_sancionada / bandeira / historico)';
  END IF;

  -- (2) responder_revisao_decisao: set + reset, e o reset DEPOIS do GET DIAGNOSTICS.
  IF position('set_config(''app.transicao_sancionada'', ''reabertura'', true)' IN v_re) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: responder_revisao_decisao sem a sancao reabertura';
  END IF;
  v_g := position('GET DIAGNOSTICS' IN v_re);
  v_z := position('set_config(''app.transicao_sancionada'', '''', true)' IN v_re);
  IF v_g = 0 OR v_z = 0 OR v_z < v_g THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: em responder_revisao_decisao o reset da GUC (pos %) tem de vir DEPOIS do GET DIAGNOSTICS (pos %) — um PERFORM entre o UPDATE e o GET DIAGNOSTICS zera o ROW_COUNT', v_z, v_g;
  END IF;
  IF position('nada a reabrir: a candidatura nao esta rejeitado/rejeitado' IN v_re) = 0
     OR position('FOR UPDATE' IN v_re) = 0
     OR position('Candidatura reaberta após revisão (Art. 20)' IN v_re) = 0
     OR position('data_decisao_final = NULL' IN v_re) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: responder_revisao_decisao perdeu um trecho vivo (guard de reabrir / FOR UPDATE / texto proprio / data nula)';
  END IF;

  -- (3) registrar_decisao: as duas GUCs, e TODAS as asserções herdadas da 20260921000012.
  IF position('set_config(''app.transicao_sancionada'', ''decisao'', true)' IN v_rd) = 0
     OR position('set_config(''app.transicao_sancionada'', '''', true)' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: registrar_decisao sem a sancao decisao (ou sem o reset dela)';
  END IF;
  IF position('coalesce(v_role, '''') NOT IN' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: registrar_decisao sem o guard fail-closed coalesce(v_role';
  END IF;
  IF position('(D-23)' IN v_rd) = 0 OR position('public.decisao_final_historico h' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: registrar_decisao sem o guard D-23 (vigente + arquivo)';
  END IF;
  IF position('df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN (''aprovado'',''rejeitado'')' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: registrar_decisao sem a zeragem condicionada a reabertura';
  END IF;
  IF position('app.rejeicao_sancionada' IN v_rd) = 0
     OR position('data_decisao_final = now()' IN v_rd) = 0
     OR position('status = ''finalizado''' IN v_rd) = 0
     OR position('v_vaga_owner IS DISTINCT FROM' IN v_rd) = 0
     OR position('ON CONFLICT (candidatura_id)' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: registrar_decisao perdeu um trecho vivo (sancao / data / status / dona-da-vaga / upsert)';
  END IF;
  IF position('IF v_role NOT IN' IN v_rd) > 0 THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: o guard fail-OPEN antigo continua no corpo de registrar_decisao';
  END IF;

  -- (4) ACL: anon sem EXECUTE nas três.
  IF has_function_privilege('anon', 'public.avancar_etapa()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: anon ainda tem EXECUTE em alguma das tres funcoes (avancar=%, responder=%, registrar=%)',
      has_function_privilege('anon', 'public.avancar_etapa()'::regprocedure, 'EXECUTE'),
      has_function_privilege('anon', 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure, 'EXECUTE'),
      has_function_privilege('anon', 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure, 'EXECUTE');
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-06 POS-PORTAO: o REVOKE derrubou o EXECUTE de authenticated numa das duas RPCs do RH';
  END IF;

  SELECT md5(p.prosrc) INTO v_m_av FROM pg_catalog.pg_proc p WHERE p.oid = 'public.avancar_etapa()'::regprocedure;
  SELECT md5(p.prosrc) INTO v_m_re FROM pg_catalog.pg_proc p WHERE p.oid = 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure;
  SELECT md5(p.prosrc) INTO v_m_rd FROM pg_catalog.pg_proc p WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;
  RAISE NOTICE 'P49-06 md5(prosrc) NOVOS — avancar_etapa=% responder_revisao_decisao=% registrar_decisao=%', v_m_av, v_m_re, v_m_rd;
END
$pos_p49_06$;
