-- =============================================================================
-- 20260922000004 — a trilha registra só o que aconteceu: a justificativa não gruda,
--                  a decisão final não vaza para a trilha, o portão olha a análise VIGENTE,
--                  e reabrir por status é recusado
--                  (JORN-17 · JORN-37/D-47 · D-39 · JORN-34)
-- =============================================================================
-- Phase 49 / plano 49-06, Task 2. Objetos: `public.avancar_etapa()`,
-- `public.registrar_decisao(uuid,public.decisao_final_resultado,text)`,
-- `public.guard_rejeicao_auditada()`.
-- Irmã da `20260922000003_p49_trava_encerrada.sql` (a trava D-35 e a GUC de sanção), aplicada
-- nesta mesma onda e neste mesmo plano — as quatro funções têm um dono só (D-55).
--
-- ---------------------------------------------------------------------------
-- O QUE ESTAVA ERRADO (medido em PROD em 2026-09-22, só leitura)
-- ---------------------------------------------------------------------------
-- (i) JORN-17 — A JUSTIFICATIVA GRUDA. `avancar_etapa()` LÊ `NEW.etapa_justificativa` em dois
--     lugares (o portão de regressão e a cópia para `historico_candidatura.criterio_texto`) e
--     NUNCA a limpa. A coluna é de ESTADO, não de evento: o texto de uma transição sobrevive na
--     linha e é consumido pela transição seguinte. Duas consequências medidas:
--       · o histórico da transição N+1 recebe o motivo da transição N (o titular lê um motivo
--         que não é o daquela mudança — e `historico_candidatura.criterio_texto` ENTRA na cópia
--         do titular, `exportAllowlist.ts:792`);
--       · o portão de regressão fica DESARMADO: um PATCH que regride sem mandar
--         `etapa_justificativa` encontra o valor residual na linha, `btrim(…) <> ''` passa, e a
--         regressão acontece sem motivo novo. É a forma exata que o `oper31 (c)` vigia — e que
--         o valor residual tornava inofensiva.
--     Resíduo vivo: 9 linhas de `candidaturas` com `etapa_justificativa` não nula, e as 9
--     casam md5 com o `criterio_texto` mais recente daquela candidatura (varredura C2 #2). A
--     limpeza RETROATIVA dessas 9 é o D-46 (plano 49-12, com checkpoint) — aqui só se fecha a
--     TORNEIRA. Premissa registrada: uma escrita de `etapa_justificativa` SEM mudança de etapa
--     não aciona o trigger (`BEFORE UPDATE OF etapa_atual`) e ainda seria consumida pela
--     transição seguinte; o kickoff mediu que a UI sempre manda a justificativa JUNTO com a
--     etapa (`triagemService.ts:446-458`, que nunca omite a coluna do SET).
--
-- (ii) D-47 / JORN-37 — A JUSTIFICATIVA DA DECISÃO FINAL VAZA PELA TRILHA. Os dois UPDATEs de
--     `registrar_decisao` copiavam `p_justificativa` para `etapa_justificativa`, e
--     `avancar_etapa` a copiava dali para `historico_candidatura.criterio_texto` — que o titular
--     recebe. O BD-9 guarda esse texto: ele é a deliberação interna do RH, e a fonte dele é
--     `decisao_final.justificativa`. Medido: 5 cópias em 4 candidaturas (RESEARCH Correção 11),
--     uma delas casando uma justificativa já ARQUIVADA. A limpeza retroativa das 5 é o D-47 do
--     plano 49-12; aqui a trilha passa a registrar que HOUVE a decisão, não o texto dela.
--     ⚠ ESCOPO (RESEARCH Correção 28): isto NÃO se estende a `rejeitar_candidatura`. A
--     justificativa de ETAPA (rejeição na triagem, regressão) chega ao titular por decisão já
--     tomada e com aviso na própria tela (`avisoJustificativa.ts`) — é transparência devida,
--     não vazamento. Só a da decisão final é BD-9, e `rejeitar_candidatura` não muda aqui.
--
-- (iii) D-39 — O PORTÃO DE AVANÇO OLHA ANÁLISE JÁ SUPERADA. O `EXISTS` sobre
--     `entrevista_analises` não filtrava nada além de `bloqueio_avanco` e
--     `revisao_confirmada_em`: uma bandeira de uma análise SUPERADA (`superada_em` preenchida),
--     ou de uma análise que FALHOU, ou sem competências, travava o avanço para sempre. Passa a
--     chamar `public.entrevista_analise_vigente(superada_em, status_analise, competencias)` — a
--     ÚNICA definição de «vigente», criada no plano 49-01. A função é CHAMADA, nunca copiada: a
--     lacuna do JORN-12 é justamente quatro leitores com quatro definições divergentes.
--
-- (iv) JORN-34 — REABRIR ENCERRADA SÓ PELO STATUS. `UpdateStatusModal` oferecia
--     `rejeitado → em_analise` por `updateCandidaturaStatus` (status só). Como
--     `candidaturas_avancar_etapa_trg` é `BEFORE UPDATE OF etapa_atual`, um UPDATE que não
--     lista a etapa NÃO o aciona — e a trava D-35 da migration irmã não vê esse caminho. O
--     front já deixou de oferecer (plano 49-05: `VALID_TRANSITIONS.rejeitado = []`); esta é a
--     camada que RECUSA.
--
-- ---------------------------------------------------------------------------
-- POR QUE A GUARDA JORN-34 É ESCOPADA A `auth.uid() IS NOT NULL`
-- ---------------------------------------------------------------------------
-- O caminho a fechar é o do CLIENTE: um PATCH pela policy `rh_avanca_etapa` SEMPRE tem JWT.
-- Sem o escopo, a guarda quebraria o idioma de fixture de 8 smokes, que constroem estado com
-- `INSERT status='rejeitado'` (desarma `trg_notif_confirmacao`) + `UPDATE status='em_analise'`
-- rodando como `postgres` SEM JWT. A premissa A4 do RESEARCH foi CONFERIDA smoke a smoke nesta
-- sessão — 11 sítios de UPDATE em 8 arquivos, todos com `request.jwt.claims` vazio ou não
-- definido na linha do UPDATE (`auth.uid()` NULL, medido), e NENHUM deles mudando `etapa_atual`:
--   p42_revisao_art20_smoke:508 · p45_motor_exclusao_smoke:880 (claims nunca definidas no
--   arquivo → `current_setting(…, true)` NULL) e :2284 · p48_candidatura_encerrada_smoke:264 e
--   :273 · p48_dedupe_smoke:187 e :320 · p48_cognitivo_notifica_smoke:137 ·
--   p48_reabertura_smoke:200 e :520 · p48_prazo_reabertura_smoke:183 ·
--   p48_rejeicao_triagem_smoke:161.
-- Nenhuma fixture precisou ser ajustada por causa desta guarda. A ÚNICA fixture consertada na
-- fase é a F4 de `p48_reabertura_smoke`, e foi pela TRAVA da migration irmã (ela muda a etapa),
-- não por esta guarda.
--
-- A exceção é a GUC `reabertura` (e só ela): `responder_revisao_decisao` move
-- `rejeitado/rejeitado → decisao_final/em_analise`, ou seja OLD encerrada e NEW não encerrada,
-- com JWT de RH. `registrar_decisao` não precisa de exceção aqui: os dois UPDATEs dele levam a
-- estado ENCERRADO, e a guarda exige `NOT candidatura_encerrada(NEW…)`.
--
-- ORDEM DOS TRIGGERS BEFORE em `public.candidaturas` (alfabética, medida no catálogo):
--   candidaturas_avancar_etapa_trg → trg_candidaturas_guard_rejeicao → update_candidaturas_updated_at
-- A trava D-35 roda primeiro; esta guarda é a segunda. Um RAISE em qualquer das duas desfaz as
-- duas atomicamente, e o AFTER `trg_n8n_status_candidatura` (que só dispara no sucesso do
-- statement) nunca despacha.
--
-- ERRO: `check_violation` (23514) nos dois ramos de `guard_rejeicao_auditada`.
--
-- AUTHZ / ACL: `CREATE OR REPLACE` preserva o ACL vivo. Medido: `anon` TEM EXECUTE em
-- `guard_rejeicao_auditada` (grant direto do `pg_default_acl`; `REVOKE … FROM PUBLIC` sozinho
-- não basta). Os REVOKE abaixo o nomeiam. `avancar_etapa` e `registrar_decisao` já foram
-- fechados na migration irmã; os REVOKE aqui são no-op idempotente.
--
-- IDEMPOTÊNCIA: o pré-portão aceita SÓ os md5 de ANTES — que são os md5 DEPOIS da
-- `…000003` (impressos pelo `RAISE NOTICE` do pós-portão dela e lidos de volta do catálogo).
-- Re-aplicar sobre o corpo novo falha de propósito, com mensagem.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- `DO`/`REVOKE`/`COMMENT` adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — os QUATRO corpos vivos são os medidos DEPOIS da …000003.
--   `responder_revisao_decisao` não muda nesta migration, e é pinada de propósito: o contrato
--   da GUC de sanção é compartilhado, e uma divergência nela invalidaria as asserções daqui.
-- ---------------------------------------------------------------------------
DO $pre_p49_06b$
DECLARE
  v_md5 text;
  v_len int;
  c_avancar   constant text := 'f329b540f9144e7d53a731f30bf45bdb';
  c_registrar constant text := 'a9fa9adb4fa37fff811cff480cabec77';
  c_responder constant text := '301ca807c5a41b9bac417e16f6321682';
  c_guard     constant text := '9836d3f9ded1762b7f5989803130244d';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.avancar_etapa()'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_avancar THEN
    RAISE EXCEPTION 'P49-06b PRE-PORTAO: o corpo VIVO de avancar_etapa tem md5 % (length %), e o medido depois da 20260922000003 e % (length 2811). Apply abortado: reler pg_get_functiondef, refazer a transcricao e so entao reaplicar.', v_md5, v_len, c_avancar;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_registrar THEN
    RAISE EXCEPTION 'P49-06b PRE-PORTAO: o corpo VIVO de registrar_decisao tem md5 % (length %), e o medido e % (length 8440). Apply abortado.', v_md5, v_len, c_registrar;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_responder THEN
    RAISE EXCEPTION 'P49-06b PRE-PORTAO: o corpo VIVO de responder_revisao_decisao tem md5 % (length %), e o medido e % (length 5326). Esta funcao NAO muda nesta migration; a divergencia significa que a GUC de sancao derivou. Apply abortado.', v_md5, v_len, c_responder;
  END IF;

  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p WHERE p.oid = 'public.guard_rejeicao_auditada()'::regprocedure;
  IF v_md5 IS DISTINCT FROM c_guard THEN
    RAISE EXCEPTION 'P49-06b PRE-PORTAO: o corpo VIVO de guard_rejeicao_auditada tem md5 % (length %), e o medido e % (length 708). Apply abortado.', v_md5, v_len, c_guard;
  END IF;

  -- O predicado único de «vigente» (plano 49-01) tem de existir: esta migration o CHAMA.
  IF to_regprocedure('public.entrevista_analise_vigente(timestamptz,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'P49-06b PRE-PORTAO: public.entrevista_analise_vigente(timestamptz,text,jsonb) nao existe — a migration 20260922000002 (plano 49-01) nao esta aplicada, e o portao de avanco abaixo a CHAMA';
  END IF;
END
$pre_p49_06b$;


-- ---------------------------------------------------------------------------
-- (1) avancar_etapa() — corpo vivo (já com a trava D-35) + a bandeira só da VIGENTE (D-39)
--     + a limpeza da justificativa consumida (JORN-17).
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
  --
  -- (P49-06 / D-39 / JORN-12) A bandeira olha SÓ a análise VIGENTE, pelo predicado ÚNICO
  --   `public.entrevista_analise_vigente(superada_em, status_analise, competencias)` do plano
  --   49-01 — a função é CHAMADA, nunca tem o texto dela copiado: a lacuna do JORN-12 é
  --   exatamente quatro leitores com quatro definições divergentes de «vigente». Antes disto,
  --   uma bandeira de uma análise SUPERADA (ou que FALHOU, ou sem competências) travava o
  --   avanço para sempre, porque nada além de `bloqueio_avanco`/`revisao_confirmada_em` era
  --   filtrado.
  IF NEW.etapa_atual > OLD.etapa_atual
     AND NEW.etapa_atual > 'entrevista_online'
     AND NEW.etapa_atual NOT IN ('aprovado', 'rejeitado') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.entrevista_analises ea
       WHERE ea.candidatura_id = NEW.id
         AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)
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

  -- (P49-06 / JORN-17) A justificativa acabou de ser CONSUMIDA — ela é de EVENTO, e o evento
  --   é a linha de `historico_candidatura` gravada acima (que guarda o texto byte a byte, e que
  --   ENTRA na cópia do titular). Deixá-la na linha a transformaria em ESTADO: a próxima
  --   transição herdaria este motivo no histórico dela, e o portão de regressão acima ficaria
  --   DESARMADO — um PATCH que regride sem mandar `etapa_justificativa` encontraria o valor
  --   residual e passaria. Esta é uma trigger BEFORE, então a atribuição a NEW é o que a linha
  --   guarda.
  --   Nenhum trigger posterior lê a coluna [MEDIDO em 2026-09-22, RESEARCH §J.1]:
  --   `trg_candidaturas_guard_rejeicao` lê `status`, `update_candidaturas_updated_at` não lê
  --   nada da linha, e o AFTER `trg_candidatura_encerrada_a_pedido` lê
  --   `encerrada_a_pedido_em`. E nenhuma transição sancionada depende de o valor sobreviver:
  --   `responder_revisao_decisao` e `registrar_decisao` escrevem o texto no próprio UPDATE e
  --   não o relêem.
  --   O resíduo das 9 linhas vivas é o D-46 (plano 49-12, com checkpoint) — aqui se fecha a
  --   torneira, não se limpa o passado.
  NEW.etapa_justificativa := NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.avancar_etapa() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.avancar_etapa() FROM anon;

COMMENT ON FUNCTION public.avancar_etapa() IS
  'Phase 6 + Phase 14 + Phase 27 + Phase 49 / FUNIL-02 + FUNIL-03 + ENTREV-03 + DBMIG-02 + '
  'JORN-25/D-35 + JORN-17 + D-39: BEFORE UPDATE OF etapa_atual on candidaturas. '
  'Sai cedo se a etapa nao muda. '
  '(P49/D-35) TRAVA: recusa (check_violation, «candidatura encerrada (etapa %, status %) — nao '
  'pode mudar de etapa») mover uma candidatura cujo ESTADO ANTERIOR e encerrado pelo predicado '
  'canonico public.candidatura_encerrada(OLD.etapa_atual, OLD.status), EXCETO quando a GUC de '
  'transacao app.transicao_sancionada esta em reabertura (responder_revisao_decisao, D-01/Art. 20) '
  'ou decisao (registrar_decisao, inclusive o legado triagem/finalizado -> aprovado). A sancao e '
  'da TRANSICAO e nunca do DESTINO: pela regra de destino um PATCH etapa_atual=aprovado num '
  'knockout passaria (RESEARCH H.1). D8 preservado: recusa mover encerrada, nao exige evidencia. '
  'Avanco/salto livres; terminais permitidos de qualquer etapa; regressao bloqueada sem '
  'etapa_justificativa nao vazia. '
  '(P49/D-39) O portao da Phase 14 segura um avanco para alem de entrevista_online enquanto '
  'existe analise de entrevista VIGENTE com bloqueio_avanco=true e revisao_confirmada_em IS NULL '
  '(RF-24). «Vigente» e o predicado UNICO public.entrevista_analise_vigente(superada_em, '
  'status_analise, competencias) do plano 49-01, CHAMADO e nunca copiado (JORN-12): uma bandeira '
  'de analise superada, que falhou, ou sem competencias nao bloqueia mais. '
  'DBMIG-02: auto_rejeitado = (ator IS NULL AND app.rejeicao_sancionada=on AND '
  'NEW.etapa_atual=rejeitado) — sistema + sancionado + terminal; avanco de sobrevivente grava '
  'false (RNF-07a). '
  '(P49/JORN-17) Depois de gravar a linha de historico, NEW.etapa_justificativa := NULL. A '
  'justificativa e de EVENTO: o evento e a linha de historico_candidatura (que guarda o texto e '
  'entra na copia do titular). Deixa-la na linha a tornaria ESTADO — a transicao seguinte '
  'herdaria o motivo alheio, e o portao de regressao ficaria desarmado por valor residual. '
  'Nenhum trigger posterior le a coluna (medido). '
  'SECURITY DEFINER + search_path='''' (auth.uid() e GUC-based, D-09). '
  'REVOKE ALL FROM PUBLIC, anon.';


-- ---------------------------------------------------------------------------
-- (2) registrar_decisao — corpo vivo (já com a GUC `decisao`) + D-47: a trilha registra que
--     HOUVE a decisão, com uma constante sem PII; o texto continua em
--     `decisao_final.justificativa`, que é a fonte (BD-9).
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
$$;

REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- (3) guard_rejeicao_auditada — o ramo vivo intacto + o ramo IRMÃO do JORN-34.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_rejeicao_auditada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only fires when status CROSSES INTO 'rejeitado'.
  IF NEW.status = 'rejeitado' AND OLD.status IS DISTINCT FROM 'rejeitado' THEN
    -- Allowed iff EITHER a sanctioned DEFINER RPC set the txn-local flag, OR this same
    -- UPDATE also drives an etapa_atual transition (audited by avancar_etapa). Otherwise
    -- it is the A9 hole (status-only reject, no trail) -> RAISE.
    IF current_setting('app.rejeicao_sancionada', true) IS DISTINCT FROM 'on'
       AND NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual THEN
      RAISE EXCEPTION 'Rejeição sem trilha de auditoria não é permitida (RNF-07a / LGPD-02)'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- (P49-06 / JORN-34) RAMO IRMÃO, no sentido INVERSO: sair de candidatura ENCERRADA
  --   mexendo SÓ no status. `candidaturas_avancar_etapa_trg` é `BEFORE UPDATE OF etapa_atual`,
  --   então um UPDATE que não lista a etapa não o aciona — a trava D-35 não vê este caminho, e
  --   era por ele que o `UpdateStatusModal` reabria uma candidatura encerrada sem histórico,
  --   sem justificativa e sem autor. Reabrir tem caminho próprio e AUDITADO: o pedido de
  --   revisão da decisão (`responder_revisao_decisao`, D-01/Art. 20), cuja transição declara a
  --   sanção `reabertura` — a ÚNICA exceção aqui.
  --   `registrar_decisao` não precisa de exceção: os dois UPDATEs dele levam a estado
  --   ENCERRADO, e este ramo exige `NOT candidatura_encerrada(NEW…)`.
  --
  --   ESCOPO `auth.uid() IS NOT NULL` — deliberado, e é o que torna a guarda aplicável hoje:
  --   o caminho a fechar é o do CLIENTE (um PATCH pela policy `rh_avanca_etapa` SEMPRE tem
  --   JWT). Sem o escopo, a guarda quebraria o idioma de fixture de 8 smokes, que constroem
  --   estado com `INSERT status='rejeitado'` + `UPDATE status='em_analise'` rodando como
  --   `postgres` sem JWT. A premissa A4 do RESEARCH foi conferida smoke a smoke antes deste
  --   apply: 11 sítios em 8 arquivos, todos com `request.jwt.claims` vazio ou não definido.
  IF public.candidatura_encerrada(OLD.etapa_atual, OLD.status)
     AND NOT public.candidatura_encerrada(NEW.etapa_atual, NEW.status)
     AND auth.uid() IS NOT NULL
     AND coalesce(current_setting('app.transicao_sancionada', true), '') IS DISTINCT FROM 'reabertura' THEN
    RAISE EXCEPTION 'candidatura encerrada não pode ser reaberta pelo status — use o pedido de revisão (Art. 20)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_rejeicao_auditada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_rejeicao_auditada() FROM anon;

COMMENT ON FUNCTION public.guard_rejeicao_auditada() IS
  'Phase 25 + Phase 49 / FUNIL-02 (A9) + JORN-34: BEFORE UPDATE OF status on candidaturas. '
  'RAMO 1 (Phase 25): dispara quando status CRUZA PARA rejeitado (NEW.status=rejeitado AND OLD '
  'IS DISTINCT FROM rejeitado) e RAISEa check_violation (RNF-07a / LGPD-02) a menos que a '
  'rejeicao seja sancionada — ou uma RPC DEFINER ligou a GUC txn-local app.rejeicao_sancionada=on '
  '(registrar_decisao / submit_candidatura_atomic), ou o mesmo UPDATE tambem transiciona '
  'etapa_atual (auditado por avancar_etapa). '
  'RAMO 2 (P49/JORN-34), sentido inverso: recusa (check_violation) SAIR de candidatura encerrada '
  'mexendo so no status — candidatura_encerrada(OLD…) AND NOT candidatura_encerrada(NEW…) AND '
  'auth.uid() IS NOT NULL AND app.transicao_sancionada <> reabertura. Como este trigger e '
  '... OF status, ele e a unica defesa desse caminho: candidaturas_avancar_etapa_trg e '
  '... OF etapa_atual e nao dispara num UPDATE que nao lista a etapa, logo a trava D-35 nao o ve. '
  'Reabrir tem caminho proprio e auditado (responder_revisao_decisao, D-01/Art. 20), que declara '
  'a sancao reabertura — a unica excecao. O escopo por auth.uid() fecha o PATCH do cliente pela '
  'policy rh_avanca_etapa e preserva o idioma de fixture de 8 smokes, que rodam como postgres sem '
  'JWT (premissa A4, conferida smoke a smoke). '
  'SECURITY DEFINER + search_path='''' (auth.uid() GUC-based, survives DEFINER). Coexiste com '
  'candidaturas_avancar_etapa_trg (audita primeiro) e trg_n8n_status_candidatura (AFTER, so no '
  'sucesso). REVOKE ALL FROM PUBLIC, anon.';


-- ---------------------------------------------------------------------------
-- PÓS-PORTÃO — presença do que entrou E AUSÊNCIA das formas antigas.
-- ---------------------------------------------------------------------------
DO $pos_p49_06b$
DECLARE
  v_av   text := pg_get_functiondef('public.avancar_etapa()'::regprocedure);
  v_rd   text := pg_get_functiondef('public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure);
  v_gd   text := pg_get_functiondef('public.guard_rejeicao_auditada()'::regprocedure);
  v_m_av text;
  v_m_rd text;
  v_m_gd text;
  v_vig  boolean;
BEGIN
  -- (1) avancar_etapa: vigente + limpeza entraram; a trava da …000003 e o resto do vivo ficaram.
  IF position('entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias)' IN v_av) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: avancar_etapa nao chama o predicado unico de vigente (D-39/JORN-12)';
  END IF;
  IF position('NEW.etapa_justificativa := NULL' IN v_av) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: avancar_etapa nao limpa etapa_justificativa depois de consumi-la (JORN-17)';
  END IF;
  IF position('candidatura_encerrada(OLD.etapa_atual, OLD.status)' IN v_av) = 0
     OR position('app.transicao_sancionada' IN v_av) = 0
     OR position('Regressão de etapa exige justificativa' IN v_av) = 0
     OR position('app.rejeicao_sancionada' IN v_av) = 0
     OR position('bloqueio: revise a bandeira' IN v_av) = 0
     OR position('INSERT INTO public.historico_candidatura' IN v_av) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: avancar_etapa perdeu um trecho vivo (trava D-35 / GUC / regressao / rejeicao_sancionada / bandeira / historico)';
  END IF;
  -- AUSÊNCIA: a limpeza vem DEPOIS do INSERT no historico, nunca antes (antes, o historico
  -- gravaria NULL e a trilha perderia o motivo de TODA transicao).
  IF position('NEW.etapa_justificativa := NULL' IN v_av) < position('INSERT INTO public.historico_candidatura' IN v_av) THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: a limpeza de etapa_justificativa esta ANTES do INSERT no historico — o criterio_texto sairia NULL em toda transicao';
  END IF;

  -- (2) registrar_decisao: a constante entrou e a copia do texto SAIU.
  IF position('Decisão final registrada.' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao nao grava a constante sem PII em etapa_justificativa (D-47)';
  END IF;
  -- ⚠ A busca da forma ANTIGA e montada por concatenacao DE PROPOSITO: o portao estatico do
  --   plano (`node -e` sobre este arquivo) reprova o arquivo se o literal
  --   «etapa_justificativa␣=␣p_justificativa» aparecer no trecho de registrar_decisao — e a
  --   propria assercao de AUSENCIA o faria aparecer. O que e asserido e identico.
  IF position('etapa_justificativa = ' || 'p_justificativa' IN v_rd) > 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao AINDA copia a justificativa da decisao para etapa_justificativa — ela chegaria ao titular por historico_candidatura.criterio_texto (BD-9 / D-47)';
  END IF;
  -- Herdadas da 20260921000012 (todas seguem valendo) + as GUCs da …000003.
  IF position('set_config(''app.transicao_sancionada'', ''decisao'', true)' IN v_rd) = 0
     OR position('set_config(''app.transicao_sancionada'', '''', true)' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao perdeu a sancao decisao (ou o reset dela)';
  END IF;
  IF position('coalesce(v_role, '''') NOT IN' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao sem o guard fail-closed coalesce(v_role';
  END IF;
  IF position('(D-23)' IN v_rd) = 0 OR position('public.decisao_final_historico h' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao sem o guard D-23 (vigente + arquivo)';
  END IF;
  IF position('df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN (''aprovado'',''rejeitado'')' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao sem a zeragem condicionada a reabertura';
  END IF;
  IF position('app.rejeicao_sancionada' IN v_rd) = 0
     OR position('data_decisao_final = now()' IN v_rd) = 0
     OR position('status = ''finalizado''' IN v_rd) = 0
     OR position('v_vaga_owner IS DISTINCT FROM' IN v_rd) = 0
     OR position('ON CONFLICT (candidatura_id)' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao perdeu um trecho vivo (sancao / data / status / dona-da-vaga / upsert)';
  END IF;
  IF position('IF v_role NOT IN' IN v_rd) > 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: o guard fail-OPEN antigo continua no corpo de registrar_decisao';
  END IF;
  -- A justificativa continua indo para a FONTE (decisao_final), senao o D-47 teria APAGADO o texto.
  IF position('(p_candidatura_id, p_decisao, p_justificativa, (select auth.uid()))' IN v_rd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: registrar_decisao nao grava mais p_justificativa em decisao_final — o D-47 MOVE o texto, nao o apaga';
  END IF;

  -- (3) guard_rejeicao_auditada: o ramo novo entrou e o ramo vivo ficou.
  IF position('auth.uid() IS NOT NULL' IN v_gd) = 0
     OR position('candidatura_encerrada(NEW.etapa_atual, NEW.status)' IN v_gd) = 0
     OR position('candidatura_encerrada(OLD.etapa_atual, OLD.status)' IN v_gd) = 0
     OR position('use o pedido de revisão (Art. 20)' IN v_gd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: guard_rejeicao_auditada sem o ramo JORN-34 completo (OLD encerrada + NEW nao encerrada + escopo por auth.uid + mensagem)';
  END IF;
  IF position('''reabertura''' IN v_gd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: o ramo JORN-34 nao excetua a GUC reabertura — a propria reabertura do Art. 20 seria recusada (D-01)';
  END IF;
  IF position('Rejeição sem trilha de auditoria não é permitida' IN v_gd) = 0
     OR position('app.rejeicao_sancionada' IN v_gd) = 0
     OR position('NEW.etapa_atual IS NOT DISTINCT FROM OLD.etapa_atual' IN v_gd) = 0 THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: guard_rejeicao_auditada perdeu o ramo vivo da Phase 25 (A9)';
  END IF;

  -- (4) ACL: anon sem EXECUTE nas tres redefinidas.
  IF has_function_privilege('anon', 'public.avancar_etapa()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.guard_rejeicao_auditada()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: anon ainda tem EXECUTE em alguma das tres funcoes';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-06b POS-PORTAO: o REVOKE derrubou o EXECUTE de authenticated em registrar_decisao';
  END IF;

  -- (5) Tabela-verdade EXECUTADA do predicado que o portao passou a chamar (existencia nao e
  --     comportamento — idioma do 49-01): vigente / superada / falhou / sem competencias.
  SELECT public.entrevista_analise_vigente(NULL, 'concluida', '{"a":1}'::jsonb) INTO v_vig;
  IF v_vig IS NOT TRUE THEN RAISE EXCEPTION 'P49-06b POS-PORTAO: vigente(NULL, concluida, {}) devolveu % (esperado true)', v_vig; END IF;
  SELECT public.entrevista_analise_vigente(now(), 'concluida', '{"a":1}'::jsonb) INTO v_vig;
  IF v_vig IS NOT FALSE THEN RAISE EXCEPTION 'P49-06b POS-PORTAO: vigente(superada) devolveu % (esperado false)', v_vig; END IF;
  SELECT public.entrevista_analise_vigente(NULL, 'falhou', '{"a":1}'::jsonb) INTO v_vig;
  IF v_vig IS NOT FALSE THEN RAISE EXCEPTION 'P49-06b POS-PORTAO: vigente(falhou) devolveu % (esperado false)', v_vig; END IF;
  SELECT public.entrevista_analise_vigente(NULL, 'concluida', NULL) INTO v_vig;
  IF v_vig IS NOT FALSE THEN RAISE EXCEPTION 'P49-06b POS-PORTAO: vigente(sem competencias) devolveu % (esperado false)', v_vig; END IF;

  SELECT md5(p.prosrc) INTO v_m_av FROM pg_catalog.pg_proc p WHERE p.oid = 'public.avancar_etapa()'::regprocedure;
  SELECT md5(p.prosrc) INTO v_m_rd FROM pg_catalog.pg_proc p WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;
  SELECT md5(p.prosrc) INTO v_m_gd FROM pg_catalog.pg_proc p WHERE p.oid = 'public.guard_rejeicao_auditada()'::regprocedure;
  RAISE NOTICE 'P49-06b md5(prosrc) NOVOS — avancar_etapa=% registrar_decisao=% guard_rejeicao_auditada=%', v_m_av, v_m_rd, v_m_gd;
END
$pos_p49_06b$;
