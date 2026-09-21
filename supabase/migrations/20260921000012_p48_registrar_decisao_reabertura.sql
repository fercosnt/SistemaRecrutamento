-- =============================================================================
-- 20260921000012 — registrar_decisao: D-23, fail-closed e a zeragem do ciclo reaberto
--                  (JORN-19 · D-01 · D-10 · D-23)
-- =============================================================================
-- Phase 48 / plano 48-11, Task 2.
--
-- ⚠ A DEFINIÇÃO VIVA DESTA FUNÇÃO NÃO EXISTIA EM ARQUIVO NENHUM. A migration
-- `20260826000004_registrar_decisao_grava_a_data_e_o_status.sql:46-84` reescreveu o corpo com
-- `replace()` + `EXECUTE` sobre `pg_get_functiondef`, e o texto resultante só existia na memória
-- do banco. Este arquivo transcreve o corpo vivo COMPLETO (e não faz outro `replace()` cego) e
-- passa a ser a fonte da definição (regra 10 do operador).
--
-- >>> MEDIDO NO CATÁLOGO VIVO em 2026-09-21 (só leitura, `node p46apply.cjs sql "SET TRANSACTION
-- >>> READ ONLY; select md5(p.prosrc), length(p.prosrc), pg_get_functiondef(p.oid) …"`):
-- >>>   md5(prosrc)    = 3007d45f02f28ac0aeefbfc1eeeb847b
-- >>>   length(prosrc) = 3011
-- >>> A transcrição foi feita a partir do `prosrc` lido, e ela hasheia EXATAMENTE
-- >>> `3007d45f…`: a base está provada, não presumida.
-- >>> DEPOIS do apply, o md5 do corpo novo é lido e registrado no 48-11-SUMMARY.
--
-- O pré-portão abaixo ABORTA o apply se o corpo vivo não for o medido. Um CREATE OR REPLACE
-- sobre um corpo que derivou apagaria a divergência em silêncio, e esta função é o write-path
-- único da decisão final.
--
-- AS MUDANÇAS (todo o resto é o corpo vivo, byte a byte: movimento de etapa/status,
-- `data_decisao_final = now()`, `etapa_justificativa = p_justificativa`, a sanção
-- `app.rejeicao_sancionada`, o guard de dona-da-vaga para `rh`):
--   (i) FAIL-CLOSED (48-RESEARCH §J). O guard vivo era `IF v_role NOT IN ('rh','administrador')`.
--       Com `v_role` NULL (chamador sem JWT), a condição avalia NULL, o IF não é tomado, e a
--       chamada só falhava depois, por acaso, no NOT NULL de `por_usuario`. Passa a ser
--       `coalesce(v_role, '') NOT IN (…)` → 42501, junto com `auth.uid()` obrigatório. O guard
--       SOBE para antes da leitura da candidatura: no lugar antigo, um chamador sem JWT
--       distinguia um id existente (42501) de um inexistente (P0002). É o mesmo oráculo que o
--       p42 (i) documentou em `responder_revisao_decisao`.
--  (ii) D-23: quem teve a decisão revertida NÃO registra a nova decisão do caso. Bloqueio duro,
--       42501, para qualquer `p_decisao`. A decisão revertida é a linha com
--       `revisao_veredito = 'revertida'` E `decisao = 'rejeitado'`, procurada na linha VIGENTE
--       (a janela entre a reabertura e a nova decisão) E em `decisao_final_historico` (depois que
--       um `em_espera` ou a nova decisão a arquivou). Isso também impede que o decisor revertido
--       sobrescreva a decisão de outra pessoa. O filtro `decisao = 'rejeitado'` é load-bearing e
--       vai além da letra do plano: um `em_espera` de C durante a reabertura herda
--       `revisao_veredito='revertida'` na linha com `por_usuario = C`. Sem o filtro, C ficaria
--       travado pela reversão da decisão de A, e o smoke (h) prova isso.
-- (iii) ZERAGEM do ciclo na NOVA decisão de uma linha REABERTA: no `ON CONFLICT … DO UPDATE`,
--       cada coluna do ciclo (`explicacao_solicitada_em`, `revisao_*`, `reaberta_em`,
--       `prazo_nova_decisao_em`, `alerta_prazo_enviado_em`) vira NULL quando
--       `reaberta_em IS NOT NULL` e `EXCLUDED.decisao IN ('aprovado','rejeitado')`. O ciclo não se
--       perde: o `snapshot_decisao_final` AFTER UPDATE lê OLD e o arquiva nas colunas novas de
--       `decisao_final_historico` (20260921000011). Sem a zeragem, a nova rejeição apareceria
--       como «revertida», e `solicitar_revisao_decisao` viraria no-op (`revisao_solicitada_em IS
--       NULL` falso), deixando o Art. 20 inalcançável na decisão nova. O CHECK «resposta
--       completa» fica satisfeito porque tudo vira nulo junto.
--       A5 (decidida aqui): `em_espera` registrado durante a reabertura NÃO é nova decisão
--       (não é decisão comunicada, D-22). O ciclo e o prazo continuam, e o alerta do vencimento
--       (48-13) dispara. Redecisão FORA de reabertura mantém o comportamento de hoje e não zera
--       nada.
--
-- AUTHZ / ACL: o CREATE OR REPLACE preserva o ACL vivo (`postgres, anon, authenticated,
-- service_role` = X). O EXECUTE de `anon` é o `pg_default_acl` e NÃO foi mudado aqui (fora do
-- escopo, registrado em deferred-items). Com o guard (i), um chamador `anon` recebe 42501 antes
-- de qualquer leitura. `authenticated`/`service_role` foram reafirmados abaixo (no-op).
--
-- IDEMPOTÊNCIA: o pré-portão aceita só o md5 de ANTES. Re-aplicar sobre o corpo novo falha de
-- propósito, com mensagem.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- `DO`/`GRANT`/`COMMENT` adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000012_p48_registrar_decisao_reabertura.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — o vivo é o corpo medido (md5 + length).
-- ---------------------------------------------------------------------------
DO $verifica_registrar_decisao_pre$
DECLARE
  v_md5      text;
  v_len      int;
  v_esperado constant text := '3007d45f02f28ac0aeefbfc1eeeb847b';
BEGIN
  SELECT md5(p.prosrc), length(p.prosrc) INTO v_md5, v_len
    FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;

  IF v_md5 IS DISTINCT FROM v_esperado THEN
    RAISE EXCEPTION 'P48-11 PRE-PORTAO: o corpo VIVO de registrar_decisao tem md5 % (length %), e o medido e % (length 3011). O CREATE OR REPLACE abaixo APAGARIA a divergencia em silencio no write-path unico da decisao final. Apply abortado: reler pg_get_functiondef, refazer a transcricao e so entao reaplicar.', v_md5, v_len, v_esperado;
  END IF;
END
$verifica_registrar_decisao_pre$;

-- ---------------------------------------------------------------------------
-- registrar_decisao — corpo VIVO completo + (i) fail-closed, (ii) D-23, (iii) zeragem.
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
  IF p_decisao = 'aprovado' THEN
    UPDATE public.candidaturas
       SET etapa_atual = 'aprovado',
           status = 'finalizado',
           data_decisao_final = now(),
           etapa_justificativa = p_justificativa
     WHERE id = p_candidatura_id;
  ELSIF p_decisao = 'rejeitado' THEN
    -- FUNIL-02: sanction this status->rejeitado for the guard_rejeicao_auditada trigger
    -- (is_local=true -> SET LOCAL, txn-scoped, pooler-safe) BEFORE the UPDATE.
    PERFORM set_config('app.rejeicao_sancionada', 'on', true);
    UPDATE public.candidaturas
       SET etapa_atual = 'rejeitado',
           status = 'rejeitado',
           data_decisao_final = now(),
           etapa_justificativa = p_justificativa
     WHERE id = p_candidatura_id;
  END IF;
  -- em_espera: NO etapa change (decision row only).

  -- RETURN the decisao_final row (readback — no silent no-op).
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.registrar_decisao(uuid, public.decisao_final_resultado, text) IS
  'Phase 15 + Phase 25 / DECISAO-03 + FUNIL-02/09: captura a decisao final de RH gravando decisao_final (UNICO '
  'writer). por_usuario := auth.uid() SEMPRE (LGPD-02). UPSERT via ON CONFLICT(candidatura_id); historico de '
  'emendas arquivado pelo trigger snapshot_decisao_final. rejeitado -> set_config(app.rejeicao_sancionada=on, '
  'is_local) + UPDATE unico {etapa_atual, status, data_decisao_final, etapa_justificativa}; aprovado -> '
  'etapa_atual=aprovado + status=finalizado + data_decisao_final + justificativa; em_espera NAO muda etapa. '
  'Dispara avancar_etapa (UMA row). NUNCA auto-decide (RNF-07a). '
  'Phase 48 / 48-11 (JORN-19): (i) FAIL-CLOSED — papel com coalesce e sub obrigatorio, ANTES de ler a '
  'candidatura (sem JWT -> 42501, sem oraculo de existencia). (ii) D-23 — quem teve a decisao revertida '
  '(linha com revisao_veredito=revertida e decisao=rejeitado, na vigente OU em decisao_final_historico) nao '
  'registra a nova decisao do caso, qualquer p_decisao -> 42501; qualquer outro RH/admin decide. (iii) na '
  'NOVA decisao (aprovado/rejeitado) de uma linha REABERTA (reaberta_em IS NOT NULL) o ciclo e ZERADO no '
  'mesmo upsert (explicacao_solicitada_em, revisao_*, reaberta_em, prazo_nova_decisao_em, '
  'alerta_prazo_enviado_em) — depois de o snapshot AFTER UPDATE (que le OLD) te-lo arquivado nas colunas do '
  'ciclo de decisao_final_historico; sem isso a nova rejeicao pareceria revertida e o Art. 20 ficaria '
  'inalcancavel nela. A5: em_espera durante a reabertura NAO e nova decisao (ciclo e prazo continuam). '
  'Redecisao fora de reabertura: comportamento de antes, nada zerado. Texto vivo transcrito de '
  'pg_get_functiondef (o patch dinamico 20260826000004 nao deixava o corpo em arquivo). '
  'GRANT EXECUTE TO authenticated, service_role.';

-- ---------------------------------------------------------------------------
-- PÓS-PORTÃO — o instalado contém as três mudanças E o que não podia sumir.
-- ---------------------------------------------------------------------------
DO $pos_p48_11b$
DECLARE
  v_def text := pg_get_functiondef('public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure);
  v_md5 text;
BEGIN
  IF position('coalesce(v_role, '''') NOT IN' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: registrar_decisao sem o guard fail-closed coalesce(v_role';
  END IF;
  IF position('(D-23)' IN v_def) = 0 OR position('public.decisao_final_historico h' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: registrar_decisao sem o guard D-23 (vigente + arquivo)';
  END IF;
  IF position('df.reaberta_em IS NOT NULL AND EXCLUDED.decisao IN (''aprovado'',''rejeitado'')' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: registrar_decisao sem a zeragem condicionada a reabertura';
  END IF;
  IF position('app.rejeicao_sancionada' IN v_def) = 0
     OR position('data_decisao_final = now()' IN v_def) = 0
     OR position('status = ''finalizado''' IN v_def) = 0
     OR position('v_vaga_owner IS DISTINCT FROM' IN v_def) = 0
     OR position('ON CONFLICT (candidatura_id)' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: registrar_decisao perdeu um trecho vivo (sancao / data / status / dona-da-vaga / upsert)';
  END IF;
  IF position('IF v_role NOT IN' IN v_def) > 0 THEN
    RAISE EXCEPTION 'P48-11 POS-PORTAO: o guard fail-OPEN antigo continua no corpo';
  END IF;
  SELECT md5(p.prosrc) INTO v_md5 FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.registrar_decisao(uuid,public.decisao_final_resultado,text)'::regprocedure;
  RAISE NOTICE 'P48-11 registrar_decisao instalada — md5(prosrc) novo = %', v_md5;
END
$pos_p48_11b$;
