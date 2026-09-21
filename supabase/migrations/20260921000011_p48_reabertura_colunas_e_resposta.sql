-- =============================================================================
-- 20260921000011 — «revertida» passa a REABRIR a candidatura (JORN-19 · D-01 · D-10)
-- =============================================================================
-- Phase 48 / plano 48-11, Task 1 (tracer).
--
-- O QUE ESTAVA ERRADO (Defeito 19, medido na validação de 2026-09-19..21). O veredito
-- `revertida` de `responder_revisao_decisao` gravava só `revisao_veredito`,
-- `revisao_resultado`, `revisao_por_usuario` e `revisao_respondida_em`. A decisão continuava
-- `rejeitado` em `decisao_final`, e a candidatura seguia `etapa_atual='rejeitado'`,
-- `status='rejeitado'`. O e-mail `revisao_respondida`, por sua vez, dizia ao titular que «a
-- decisão anterior foi revista». O sistema documentava uma revisão sem próximo passo: a
-- rejeição que o revisor derrubou continuava valendo.
--
-- O CONSERTO — Desenho A do 48-RESEARCH §E.3, decidido pelo operador em D-01 («reabrir, não
-- reverter»). No ramo `revertida`, na MESMA transação da resposta:
--   · `decisao_final` recebe `reaberta_em = now()` e `prazo_nova_decisao_em` no MESMO UPDATE
--     do veredito (um snapshot só, então o Defeito 3b não se agrava);
--   · `candidaturas` volta a `etapa_atual='decisao_final'`, `status='em_analise'`, aguardando
--     nova decisão. NUNCA vai a `aprovado`: nenhuma decisão automática (D-01, RNF-07a);
--   · a regressão `rejeitado → decisao_final` (o `avancar_etapa()` exige justificativa no
--     MESMO UPDATE) leva texto PRÓPRIO, que se assinaria: «Candidatura reaberta após revisão
--     (Art. 20) — aguardando nova decisão até DD/MM/AAAA.». Não usa a `etapa_justificativa`
--     residual (Defeito 17, fora de escopo, contornado) nem a justificativa do revisor. O texto
--     vai para `historico_candidatura.criterio_texto`, que chega ao titular;
--   · `data_decisao_final = NULL` (premissa A4, decidida aqui). O cartão «Entenda a decisão»
--     some até haver decisão nova. A data antiga continua em `decisao_final.em`, no snapshot e
--     no histórico.
-- O aviso ao candidato é o `revisao_respondida` que já existe. `trg_notif_transicao` não
-- despacha para `etapa_para='decisao_final'`. A cópia do e-mail é corrigida no 48-13.
--
-- PRAZO (D-10: 10 dias corridos; premissa A3 do RESEARCH, decidida aqui):
--   v_data_limite         := (now() AT TIME ZONE 'America/Sao_Paulo')::date + 10
--   prazo_nova_decisao_em := ((v_data_limite + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
-- Ou seja: 00:00 (horário de SP) do 11º dia, que é o FIM do 10º dia. A data dita ao
-- candidato é `v_data_limite` (dia da reabertura em SP + 10). Vencido o prazo, o sistema SÓ
-- ALERTA o RH (48-13). Não decide nada.
--
-- ARQUIVO DO CICLO. `decisao_final_historico` ganha nullable as colunas do ciclo
-- (explicação, revisão, reabertura, alerta), e `snapshot_decisao_final()` passa a copiá-las
-- de OLD. É isso que permite ao 48-11 Task 2 ZERAR o ciclo na nova decisão sem perder a
-- trilha: o snapshot AFTER UPDATE lê OLD, portanto arquiva antes da zeragem. Os CHECKs de
-- `decisao_final` NÃO são copiados para o arquivo, que guarda o que houve e não impõe forma.
-- O 3b (snapshot em todo UPDATE) segue fora de escopo: só acrescentamos colunas ao INSERT.
--
-- BASE: corpos VIVOS lidos por `pg_get_functiondef` em 2026-09-21 (só leitura) —
--   responder_revisao_decisao  md5(prosrc) = c7fef6254a09b33cbcdbb70966f526cf (1798 octetos)
--   snapshot_decisao_final     md5(prosrc) = 6eefacbfc91eacfed5a1774150198aad (234 octetos)
--   avancar_etapa (NÃO redefinida; lida para confirmar a regra da regressão)
--                              md5(prosrc) = b1f9225f8b4556457d289519e3b1064d (1534 octetos)
-- O pré-portão abaixo ABORTA se um dos dois redefinidos divergir: o CREATE OR REPLACE
-- apagaria em silêncio uma mudança viva que este arquivo não conhece.
--
-- AUTHZ: todos os guards vivos de `responder_revisao_decisao` foram mantidos, na mesma ordem.
-- Entre eles: o papel com coalesce (fail-closed), o sub obrigatório, decisor ≠ revisor
-- (42501) e a idempotência (22023 «já respondida»). O guard novo («nada a reabrir», 22023)
-- vem DEPOIS de todos eles e ANTES de qualquer escrita. O `revertida` só é aceito se a
-- decisão for `rejeitado` e a candidatura estiver `rejeitado/rejeitado`, lida com
-- `FOR UPDATE`. ACL reafirmado como está vivo: `anon` sem EXECUTE, `authenticated` e
-- `service_role` com EXECUTE. `snapshot_decisao_final` é função de trigger e o ACL dela não
-- muda (o CREATE OR REPLACE preserva).
--
-- IDEMPOTÊNCIA: os ADD COLUMN vão SEM `IF NOT EXISTS`, de propósito (idioma de
-- `20260805000001:211-215`): uma coluna já existente com outra forma tem de falhar alto. O
-- pré-portão recusa um re-apply sobre os corpos novos.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpos PL/pgSQL `$$` com
-- `DO`/`REVOKE`/`COMMENT` adjacentes são a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000011_p48_reabertura_colunas_e_resposta.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — os vivos são os corpos medidos.
-- ---------------------------------------------------------------------------
DO $pre_p48_11a$
DECLARE
  v_resp text;
  v_snap text;
BEGIN
  SELECT md5(p.prosrc) INTO v_resp FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure;
  SELECT md5(p.prosrc) INTO v_snap FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.snapshot_decisao_final()'::regprocedure;
  IF v_resp IS DISTINCT FROM 'c7fef6254a09b33cbcdbb70966f526cf' THEN
    RAISE EXCEPTION 'P48-11 PRE-PORTAO: responder_revisao_decisao vivo md5 = %, medido = c7fef6254a09b33cbcdbb70966f526cf — o CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio; reler o vivo e refazer esta migration', v_resp;
  END IF;
  IF v_snap IS DISTINCT FROM '6eefacbfc91eacfed5a1774150198aad' THEN
    RAISE EXCEPTION 'P48-11 PRE-PORTAO: snapshot_decisao_final vivo md5 = %, medido = 6eefacbfc91eacfed5a1774150198aad — reler o vivo e refazer esta migration', v_snap;
  END IF;
END
$pre_p48_11a$;

-- ---------------------------------------------------------------------------
-- (a) decisao_final — as colunas da reabertura.
-- ---------------------------------------------------------------------------
ALTER TABLE public.decisao_final
  ADD COLUMN reaberta_em timestamptz,
  ADD COLUMN prazo_nova_decisao_em timestamptz,
  ADD COLUMN alerta_prazo_enviado_em timestamptz;

ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_reabertura_prazo_coerente_check
  CHECK ((reaberta_em IS NULL) = (prazo_nova_decisao_em IS NULL));

COMMENT ON COLUMN public.decisao_final.reaberta_em IS
  'Phase 48 / JORN-19 / D-01: instante em que o veredito revertida REABRIU a candidatura '
  '(responder_revisao_decisao, mesma transacao). Reabrir NAO e aprovar: a candidatura volta a '
  'decisao_final / em_analise aguardando NOVA decisao humana (RNF-07a). NULL fora de um ciclo '
  'reaberto. Zerada por registrar_decisao quando a nova decisao (aprovado/rejeitado) e registrada; '
  'o valor anterior fica em decisao_final_historico (snapshot AFTER UPDATE le OLD).';

COMMENT ON COLUMN public.decisao_final.prazo_nova_decisao_em IS
  'Phase 48 / JORN-19 / D-10: prazo de 10 DIAS CORRIDOS para a nova decisao. Formula (premissa A3, '
  'decidida no 48-11): data_limite := (reaberta_em AT TIME ZONE America/Sao_Paulo)::date + 10; '
  'prazo := (data_limite + 1)::timestamp AT TIME ZONE America/Sao_Paulo — 00:00 de SP do 11o dia, '
  'isto e, o FIM do 10o dia. A data dita ao candidato e data_limite. Vencido o prazo sem nova '
  'decisao, o sistema SO ALERTA o RH (48-13) — nunca decide. Preenchido junto com reaberta_em '
  '(CHECK decisao_final_reabertura_prazo_coerente_check).';

COMMENT ON COLUMN public.decisao_final.alerta_prazo_enviado_em IS
  'Phase 48 / JORN-19 / D-10: idempotencia por estado da varredura de prazo vencido (48-13): '
  'gravado quando o alerta ao RH e despachado, para que a varredura diaria nao alerte duas vezes '
  'o mesmo ciclo. Zerado com o resto do ciclo na nova decisao.';

-- ---------------------------------------------------------------------------
-- (b) decisao_final_historico — o arquivo do ciclo (todas nullable, sem CHECK copiado).
-- ---------------------------------------------------------------------------
ALTER TABLE public.decisao_final_historico
  ADD COLUMN explicacao_solicitada_em timestamptz,
  ADD COLUMN revisao_solicitada_em timestamptz,
  ADD COLUMN revisao_veredito text,
  ADD COLUMN revisao_resultado text,
  ADD COLUMN revisao_por_usuario uuid,
  ADD COLUMN revisao_respondida_em timestamptz,
  ADD COLUMN reaberta_em timestamptz,
  ADD COLUMN prazo_nova_decisao_em timestamptz,
  ADD COLUMN alerta_prazo_enviado_em timestamptz;

COMMENT ON COLUMN public.decisao_final_historico.explicacao_solicitada_em IS
  'Phase 48 / JORN-19: copia de OLD.explicacao_solicitada_em no instante do arquivamento. Arquivo '
  'do ciclo — preserva o que houve antes de registrar_decisao zerar o ciclo na nova decisao.';
COMMENT ON COLUMN public.decisao_final_historico.revisao_solicitada_em IS
  'Phase 48 / JORN-19: copia de OLD.revisao_solicitada_em (pedido de revisao do Art. 20).';
COMMENT ON COLUMN public.decisao_final_historico.revisao_veredito IS
  'Phase 48 / JORN-19: copia de OLD.revisao_veredito (mantida/revertida). Sem CHECK: o arquivo '
  'guarda o que houve, nao impoe forma. Uma linha com revertida + decisao=rejeitado e a decisao '
  'que foi revertida — registrar_decisao le isso para o D-23 (o decisor revertido nao redecide).';
COMMENT ON COLUMN public.decisao_final_historico.revisao_resultado IS
  'Phase 48 / JORN-19: copia de OLD.revisao_resultado (justificativa do revisor). Texto interno do '
  'RH — nao vai a trilha do candidato.';
COMMENT ON COLUMN public.decisao_final_historico.revisao_por_usuario IS
  'Phase 48 / JORN-19: copia de OLD.revisao_por_usuario (quem respondeu a revisao). Sem FK, como '
  'por_usuario desta tabela: arquivo.';
COMMENT ON COLUMN public.decisao_final_historico.revisao_respondida_em IS
  'Phase 48 / JORN-19: copia de OLD.revisao_respondida_em.';
COMMENT ON COLUMN public.decisao_final_historico.reaberta_em IS
  'Phase 48 / JORN-19: copia de OLD.reaberta_em (reabertura pelo veredito revertida).';
COMMENT ON COLUMN public.decisao_final_historico.prazo_nova_decisao_em IS
  'Phase 48 / JORN-19: copia de OLD.prazo_nova_decisao_em (prazo de 10 dias corridos, D-10).';
COMMENT ON COLUMN public.decisao_final_historico.alerta_prazo_enviado_em IS
  'Phase 48 / JORN-19: copia de OLD.alerta_prazo_enviado_em.';

-- ---------------------------------------------------------------------------
-- (c) snapshot_decisao_final — corpo vivo + as colunas do ciclo no INSERT (valores de OLD).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_decisao_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.decisao_final_historico
    (candidatura_id, decisao, justificativa, por_usuario, decidido_em,
     explicacao_solicitada_em, revisao_solicitada_em, revisao_veredito, revisao_resultado,
     revisao_por_usuario, revisao_respondida_em, reaberta_em, prazo_nova_decisao_em,
     alerta_prazo_enviado_em)
  VALUES
    (OLD.candidatura_id, OLD.decisao, OLD.justificativa, OLD.por_usuario, OLD.em,
     OLD.explicacao_solicitada_em, OLD.revisao_solicitada_em, OLD.revisao_veredito, OLD.revisao_resultado,
     OLD.revisao_por_usuario, OLD.revisao_respondida_em, OLD.reaberta_em, OLD.prazo_nova_decisao_em,
     OLD.alerta_prazo_enviado_em);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.snapshot_decisao_final() IS
  'Phase 25 / FUNIL-09 (A26): AFTER UPDATE ON decisao_final — INSERTs OLD.(candidatura_id, decisao, '
  'justificativa, por_usuario, em) into decisao_final_historico so every overwrite (amendment/em_espera) '
  'is archived with its original human actor preserved (LGPD-02). SECURITY DEFINER + search_path='''' '
  '(bypasses the client-INSERT block). One trigger owns capture — no per-writer manual INSERT. '
  'Phase 48 / 48-11 (JORN-19): tambem arquiva o CICLO (explicacao_solicitada_em, revisao_*, reaberta_em, '
  'prazo_nova_decisao_em, alerta_prazo_enviado_em) de OLD — e o que permite a registrar_decisao zerar o '
  'ciclo na nova decisao sem perder a trilha. Defeito 3b (snapshot em todo UPDATE) fora de escopo.';

-- ---------------------------------------------------------------------------
-- (d) responder_revisao_decisao — corpo vivo + o ramo `revertida` que reabre.
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
    UPDATE public.candidaturas
       SET etapa_atual = 'decisao_final',
           status = 'em_analise',
           etapa_justificativa = format(
             'Candidatura reaberta após revisão (Art. 20) — aguardando nova decisão até %s.',
             to_char(v_data_limite, 'DD/MM/YYYY')),
           data_decisao_final = NULL
     WHERE id = p_candidatura_id;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'reabertura nao moveu a candidatura (% linhas) — nada foi gravado', v_n;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_revisao_decisao(uuid, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- (e) COMMENT — o ramo novo.
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.responder_revisao_decisao(uuid, text, text) IS
  'Unico write-path da resposta a revisao de decisao (LGPD Art. 20, REVISAO-03). decisao_final nao tem '
  'policy de UPDATE, logo este DEFINER e o unico caminho. Guard FAIL-CLOSED: papel resolvido com coalesce '
  '(sem JWT -> 42501, nunca no-op) e sub obrigatorio (42501). Recusa 42501 se o chamador for o decisor '
  '(REVISAO-05, sem override de administrador) e tambem se a decisao original nao tiver autoria registrada. '
  '22023 se nao houver pedido de revisao, se ja respondida, se veredito fora de mantida/revertida, ou se a '
  'justificativa tiver menos de 50 caracteres. P0002 se a decisao nao existir. '
  'Phase 48 / 48-11 (JORN-19, D-01, D-10): o veredito revertida REABRE a candidatura na MESMA transacao — '
  'decisao_final.reaberta_em = now() e prazo_nova_decisao_em no MESMO UPDATE do veredito; candidaturas vai a '
  'etapa_atual=decisao_final / status=em_analise, aguardando NOVA decisao humana — nunca aprovado (reabrir '
  'nao e aprovar; RNF-07a). A regressao rejeitado->decisao_final leva etapa_justificativa PROPRIA '
  '(«Candidatura reaberta apos revisao (Art. 20) — aguardando nova decisao ate DD/MM/AAAA.»), nunca a '
  'residual (Defeito 17) nem a do revisor. A3: prazo = 00:00 de America/Sao_Paulo do dia (data da '
  'reabertura em SP + 11), ou seja, fim do 10o dia corrido; a data dita ao candidato e a de SP + 10. '
  'A4: data_decisao_final = NULL na reabertura (a data antiga fica em decisao_final.em, no snapshot e no '
  'historico). 22023 «nada a reabrir» se revertida vier sobre decisao que nao e rejeitado ou candidatura '
  'que nao esta rejeitado/rejeitado — antes de qualquer escrita. mantida nao reabre nada. Nao despacha '
  'notificacao: o aviso ao candidato e o revisao_respondida do trigger (a copia do e-mail e corrigida no '
  '48-13). REVOKE de PUBLIC e de anon, GRANT EXECUTE a authenticated e service_role.';

-- ---------------------------------------------------------------------------
-- (f) PÓS-PORTÃO — o que foi instalado é o que este arquivo diz.
-- ---------------------------------------------------------------------------
DO $pos_p48_11a$
DECLARE
  v_resp text := pg_get_functiondef('public.responder_revisao_decisao(uuid,text,text)'::regprocedure);
  v_snap text := pg_get_functiondef('public.snapshot_decisao_final()'::regprocedure);
  v_col  text;
  v_n    int;
BEGIN
  FOREACH v_col IN ARRAY ARRAY['reaberta_em', 'prazo_nova_decisao_em', 'alerta_prazo_enviado_em'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'decisao_final'
                      AND column_name = v_col AND is_nullable = 'YES') THEN
      RAISE EXCEPTION 'P48-11 POS-PORTAO: decisao_final.% ausente ou NOT NULL', v_col;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'decisao_final_historico' AND is_nullable = 'YES'
     AND column_name IN ('explicacao_solicitada_em', 'revisao_solicitada_em', 'revisao_veredito',
                         'revisao_resultado', 'revisao_por_usuario', 'revisao_respondida_em',
                         'reaberta_em', 'prazo_nova_decisao_em', 'alerta_prazo_enviado_em');
  IF v_n IS DISTINCT FROM 9 THEN  -- escopo deliberado: as 9 colunas que ESTE arquivo cria
    RAISE EXCEPTION 'P48-11 POS-PORTAO: decisao_final_historico tem % das 9 colunas do ciclo', v_n;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.decisao_final'::regclass
                    AND conname = 'decisao_final_reabertura_prazo_coerente_check') THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: CHECK de coerencia reaberta_em/prazo ausente';
  END IF;

  IF position('America/Sao_Paulo' IN v_resp) = 0
     OR position('em_analise' IN v_resp) = 0
     OR position('Candidatura reaberta' IN v_resp) = 0
     OR position('data_decisao_final = NULL' IN v_resp) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: responder_revisao_decisao instalada SEM o ramo de reabertura';
  END IF;
  IF position('v_uid = v_row.por_usuario' IN v_resp) = 0
     OR position('revisao ja respondida' IN v_resp) = 0
     OR position('coalesce(v_role, '''')' IN v_resp) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: responder_revisao_decisao perdeu um guard vivo (decisor / idempotencia / fail-closed)';
  END IF;
  IF position('revisao_veredito' IN v_snap) = 0 OR position('OLD.reaberta_em' IN v_snap) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: snapshot_decisao_final instalada SEM as colunas do ciclo';
  END IF;

  IF has_function_privilege('anon', 'public.responder_revisao_decisao(uuid,text,text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: anon tem EXECUTE em responder_revisao_decisao';
  END IF;
END
$pos_p48_11a$;
