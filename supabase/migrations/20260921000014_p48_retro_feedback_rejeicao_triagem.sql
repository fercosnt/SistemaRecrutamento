-- =============================================================================
-- 20260921000014 — candidaturas : grava o `feedback_rejeicao` NEUTRO na rejeição
--                  humana feita antes do conserto  (Phase 48 / 48-12 / JORN-22 / D-18)
-- =============================================================================
-- O QUE ESTAVA ERRADO. Até 20260921000009 (48-09), `rejeitar_candidatura` na
-- triagem não gravava `feedback_rejeicao`, e sem ele a candidata não alcança o
-- cartão «Entenda a decisão» nem a página de explicação `humana_triagem` (Art. 20
-- da LGPD). Esta escrita grava o MESMO texto neutro que a RPC grava desde o
-- conserto — é o que o sistema faria se a rejeição acontecesse hoje.
--
-- DECISÃO DO OPERADOR (D-18): checkpoint:decision do 48-12, resposta literal
-- «ambos» — aplicar (A) e (B) — registrada em 2026-09-21, depois do ensaio.
--
-- ENSAIO (supabase/tests/p48_retroativos_ensaio.sql, commit d7cfa560), medido em
-- PROD às 12:09 (-03) de 2026-09-21 pela MESMA query desta escrita:
--   backfill=1 (bf26ee3c-0ae3-4e92-a99b-6e05efc2a662)
--   fila_delta=0 historico_delta=0 notif_delta=0
-- Re-medido só leitura antes desta escrita: o mesmo id, feedback NULL.
--   bf26ee3c-... (+claude4): triagem → rejeitado em 2026-09-20 13:03,
--   motivo_rejeicao = 'reprovado_avaliacao', sem decisao_final.
--
-- NENHUM E-MAIL. `feedback_rejeicao` não tem trigger nem despacho. Mesmo assim o
-- bloco aborta se `net.http_request_queue`, `historico_candidatura` ou
-- `notificacoes_enviadas` mudarem de tamanho.
--
-- PORTÃO. Aborta a transação inteira se:
--   · o predicado do ensaio não devolver exatamente o id autorizado;
--   · o UPDATE não tocar exatamente 1 linha (ROW_COUNT);
--   · a fila do pg_net, o histórico ou as notificações mudarem.
-- O id literal é ESCOPO DELIBERADO (a autorização do operador), não fotografia
-- (D-14 — nunca alargar).
--
-- EFEITO COLATERAL CONHECIDO: `update_candidaturas_updated_at` toca `updated_at`.
--
-- TRANSPORTE: `node p46apply.cjs migrate <este arquivo>` (CLAUDE.md, «Via de
-- apply ATUAL»). Sem `BEGIN;` — a Management API já roda o corpo numa transação.
-- =============================================================================

DO $$
DECLARE
  -- Texto IDÊNTICO ao que `rejeitar_candidatura` grava desde 20260921000009.
  c_neutro constant text :=
    'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.';
  v_autorizados uuid[] := ARRAY['bf26ee3c-0ae3-4e92-a99b-6e05efc2a662']::uuid[];
  v_conjunto uuid[];
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_tocadas int;
BEGIN
  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
    INTO v_conjunto
    FROM public.candidaturas
   WHERE status = 'rejeitado'
     AND etapa_atual = 'rejeitado'
     AND feedback_rejeicao IS NULL
     AND data_decisao_final IS NULL
     AND motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = candidaturas.id);

  IF v_conjunto IS DISTINCT FROM v_autorizados THEN
    RAISE EXCEPTION 'JORN-22 (B): o predicado devolveu % — a autorizacao e para exatamente % — escopo divergente, nada foi escrito',
      v_conjunto, v_autorizados;
  END IF;

  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;

  UPDATE public.candidaturas
     SET feedback_rejeicao = c_neutro
   WHERE id = ANY (v_autorizados)
     AND status = 'rejeitado'
     AND etapa_atual = 'rejeitado'
     AND feedback_rejeicao IS NULL
     AND data_decisao_final IS NULL
     AND motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = candidaturas.id);
  GET DIAGNOSTICS v_tocadas = ROW_COUNT;

  IF v_tocadas <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'JORN-22 (B): o UPDATE tocou % linha(s), esperado % — nada foi escrito',
      v_tocadas, cardinality(v_autorizados);
  END IF;

  SELECT count(*) INTO v_fila1  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist1  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif1 FROM public.notificacoes_enviadas;

  IF v_fila1 IS DISTINCT FROM v_fila0
     OR v_hist1 IS DISTINCT FROM v_hist0
     OR v_notif1 IS DISTINCT FROM v_notif0 THEN
    RAISE EXCEPTION 'JORN-22 (B): efeito colateral — fila % -> %, historico % -> %, notificacoes % -> % — nada foi escrito (nenhum e-mail retroativo, D-18)',
      v_fila0, v_fila1, v_hist0, v_hist1, v_notif0, v_notif1;
  END IF;

  RAISE NOTICE 'JORN-22 (B): feedback_rejeicao neutro gravado em % linha(s): %', v_tocadas, v_autorizados;
END
$$;
