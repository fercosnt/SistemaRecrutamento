-- =============================================================================
-- Phase 48 / Plano 48-12 — ENSAIO das duas escritas retroativas (JORN-26 · JORN-22)
-- =============================================================================
-- ⚠ É UM ENSAIO. NUNCA COMITA. O bloco termina SEMPRE em `RAISE EXCEPTION`: a
-- exceção aborta a transação inteira da requisição (a Management API roda o corpo
-- numa transação só — CLAUDE.md, «Via de apply ATUAL», propriedade 1) e a MENSAGEM
-- da exceção é o relatório. Saída esperada do `p46apply` = código ≠ 0 com
-- `ENSAIO OK: ...` no texto. Qualquer outra exceção é achado, não sucesso.
--
-- POR QUE EXISTE (D-18). UPDATE retroativo sobre linha existente é checkpoint do
-- operador com contagem antes/depois. O operador decide sobre números medidos pela
-- MESMA query que escreveria — não sobre uma estimativa. Os predicados abaixo são
-- os que as migrations 20260921000013/000014 copiam (se aprovadas):
--
--   (A) desfaz as marcas de `encerrada_a_pedido_em` que o Defeito 26
--       (`registrar_pedido_exclusao`, conserto no 48-01) deixou em candidaturas de
--       KNOCKOUT. Forma do knockout: status='rejeitado' com etapa_atual='inscricao'
--       e opcao_knockout_id preenchido.
--   (B) grava o `feedback_rejeicao` NEUTRO — texto IDÊNTICO ao que
--       `rejeitar_candidatura` grava desde 20260921000009 (48-09) — na rejeição
--       humana feita ANTES do conserto (sem feedback, sem `decisao_final`, não
--       knockout). Devolve o Art. 20 a quem foi rejeitado antes do conserto.
--
-- O QUE MEDE, além de ROW_COUNT e ids:
--   · fila_delta   — `net.http_request_queue` antes/depois das duas escritas.
--                    O único trigger de UPDATE que despacha e-mail e olha estas
--                    colunas é `trg_candidatura_encerrada_a_pedido`, com
--                    WHEN (OLD IS NULL AND NEW IS NOT NULL) — (A) é NOT NULL→NULL,
--                    não casa. `feedback_rejeicao` não tem trigger nenhum.
--   · historico_delta / notif_delta — `historico_candidatura`,
--                    `notificacoes_enviadas`.
--   · controle     — PROVA QUE A MEDIDA DA FILA MORDE: numa subtransação que se
--                    reverte, re-marca (NULL→NOT NULL) uma das linhas de (A) e
--                    conta a fila. Esperado controle_fila=1 (o aviso ao RH seria
--                    enfileirado). Se der 0, `fila_delta=0` não prova nada.
--                    A subtransação é revertida e, de qualquer forma, a
--                    requisição inteira aborta no fim: nada chega ao worker.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_retroativos_ensaio.sql`
-- Depois, conferir resíduo zero por leitura (48-12-SUMMARY registra a query).
-- =============================================================================

DO $$
DECLARE
  c_neutro constant text :=
    'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.';
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_n_a int; v_n_b int;
  v_ids_a text; v_ids_b text;
  v_antes_a text; v_antes_b text;
  v_depois_a text; v_depois_b text;
  v_ctrl_id uuid; v_ctrl_fila bigint := -1;
BEGIN
  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;

  -- ---------------------------------------------------------------- (A) antes
  SELECT string_agg(id::text || '=' || encerrada_a_pedido_em::text, ', ' ORDER BY id)
    INTO v_antes_a
    FROM public.candidaturas
   WHERE encerrada_a_pedido_em IS NOT NULL
     AND etapa_atual = 'inscricao'
     AND status = 'rejeitado'
     AND opcao_knockout_id IS NOT NULL;

  -- (A) o UPDATE — predicado copiado pela migration 000013
  WITH u AS (
    UPDATE public.candidaturas
       SET encerrada_a_pedido_em = NULL
     WHERE encerrada_a_pedido_em IS NOT NULL
       AND etapa_atual = 'inscricao'
       AND status = 'rejeitado'
       AND opcao_knockout_id IS NOT NULL
    RETURNING id
  )
  SELECT count(*), string_agg(id::text, ', ' ORDER BY id) INTO v_n_a, v_ids_a FROM u;

  SELECT string_agg(id::text || '=' || coalesce(encerrada_a_pedido_em::text, 'NULL'), ', ' ORDER BY id)
    INTO v_depois_a
    FROM public.candidaturas
   WHERE id::text = ANY (string_to_array(coalesce(v_ids_a, ''), ', '));

  -- ---------------------------------------------------------------- (B) antes
  SELECT string_agg(id::text || '=' || coalesce(feedback_rejeicao, 'NULL'), ', ' ORDER BY id)
    INTO v_antes_b
    FROM public.candidaturas
   WHERE status = 'rejeitado'
     AND etapa_atual = 'rejeitado'
     AND feedback_rejeicao IS NULL
     AND data_decisao_final IS NULL
     AND motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = candidaturas.id);

  -- (B) o UPDATE — predicado copiado pela migration 000014
  WITH u AS (
    UPDATE public.candidaturas
       SET feedback_rejeicao = c_neutro
     WHERE status = 'rejeitado'
       AND etapa_atual = 'rejeitado'
       AND feedback_rejeicao IS NULL
       AND data_decisao_final IS NULL
       AND motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'
       AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = candidaturas.id)
    RETURNING id
  )
  SELECT count(*), string_agg(id::text, ', ' ORDER BY id) INTO v_n_b, v_ids_b FROM u;

  SELECT string_agg(id::text || '=' || coalesce(feedback_rejeicao, 'NULL'), ', ' ORDER BY id)
    INTO v_depois_b
    FROM public.candidaturas
   WHERE id::text = ANY (string_to_array(coalesce(v_ids_b, ''), ', '));

  SELECT count(*) INTO v_fila1  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist1  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif1 FROM public.notificacoes_enviadas;

  -- ------------------------------------------- controle positivo (subtransação)
  v_ctrl_id := split_part(coalesce(v_ids_a, ''), ', ', 1)::uuid;
  IF v_ctrl_id IS NOT NULL THEN
    BEGIN
      UPDATE public.candidaturas SET encerrada_a_pedido_em = now() WHERE id = v_ctrl_id;
      SELECT count(*) - v_fila1 INTO v_ctrl_fila FROM net.http_request_queue;
      RAISE EXCEPTION 'p48_ctrl_revert' USING ERRCODE = 'P0001';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'p48_ctrl_revert' THEN RAISE; END IF;
    END;
  END IF;

  RAISE EXCEPTION 'ENSAIO OK: desfazer=% (%) backfill=% (%) fila_delta=% historico_delta=% notif_delta=% controle_fila=% | A antes: % | A depois: % | B antes: % | B depois: %',
    v_n_a, coalesce(v_ids_a, '-'), v_n_b, coalesce(v_ids_b, '-'),
    v_fila1 - v_fila0, v_hist1 - v_hist0, v_notif1 - v_notif0, v_ctrl_fila,
    coalesce(v_antes_a, '-'), coalesce(v_depois_a, '-'),
    coalesce(v_antes_b, '-'), coalesce(v_depois_b, '-');
END
$$;
