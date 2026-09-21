-- =============================================================================
-- 20260921000013 — candidaturas : desfaz as 2 marcas erradas de
--                  `encerrada_a_pedido_em` em candidaturas de KNOCKOUT
--                  (Phase 48 / 48-12 / JORN-26 / D-18)
-- =============================================================================
-- O QUE ESTAVA ERRADO. O Defeito 26 (`registrar_pedido_exclusao`, conserto no
-- 48-01) carimbava `encerrada_a_pedido_em` também em candidaturas que o knockout
-- já tinha encerrado. Uma candidatura eliminada pelo knockout não foi «encerrada a
-- pedido» — a marca é falsa. Os avisos ao RH que ela gerou já saíram; esta escrita
-- corrige o DADO, não o aviso.
--
-- DECISÃO DO OPERADOR (D-18): checkpoint:decision do 48-12, resposta literal
-- «ambos» — aplicar (A) e (B) — registrada em 2026-09-21, depois do ensaio.
--
-- ENSAIO (supabase/tests/p48_retroativos_ensaio.sql, commit d7cfa560), medido em
-- PROD às 12:09 (-03) de 2026-09-21 pela MESMA query desta escrita:
--   ENSAIO OK: desfazer=2 (25a4231c-612b-4f86-9c5a-904ca09f18f4,
--   92522073-484c-46a3-9e9d-8e80afa3c062) backfill=1 (bf26ee3c-...)
--   fila_delta=0 historico_delta=0 notif_delta=0 controle_fila=1
-- Re-medido só leitura antes desta escrita: o mesmo conjunto de 2 ids.
--   92522073-484c-46a3-9e9d-8e80afa3c062 (+claude2) era 2026-09-06 12:35:07-03
--   25a4231c-612b-4f86-9c5a-904ca09f18f4 (+claude4) era 2026-09-20 20:38:25-03
--
-- NENHUM E-MAIL. O único trigger que reage a esta coluna,
-- `trg_candidatura_encerrada_a_pedido`, tem WHEN (OLD IS NULL AND NEW IS NOT
-- NULL); esta escrita é NOT NULL → NULL e não casa. O ensaio provou que a medida
-- da fila morde (controle_fila=1 no sentido oposto). Mesmo assim o bloco abaixo
-- aborta se `net.http_request_queue`, `historico_candidatura` ou
-- `notificacoes_enviadas` mudarem de tamanho.
--
-- PORTÃO. Aborta a transação inteira se:
--   · o predicado do ensaio não devolver exatamente os 2 ids autorizados;
--   · o UPDATE não tocar exatamente 2 linhas (ROW_COUNT);
--   · a fila do pg_net, o histórico ou as notificações mudarem.
-- A lista literal de ids é ESCOPO DELIBERADO (a autorização do operador), não
-- fotografia: roda uma vez, e um conjunto diferente é exatamente o caso em que
-- ela TEM de recusar (D-14 — nunca alargar).
--
-- EFEITO COLATERAL CONHECIDO: `update_candidaturas_updated_at` toca `updated_at`
-- das 2 linhas.
--
-- TRANSPORTE: `node p46apply.cjs migrate <este arquivo>` (CLAUDE.md, «Via de
-- apply ATUAL»). Sem `BEGIN;` — a Management API já roda o corpo numa transação.
-- =============================================================================

DO $$
DECLARE
  v_autorizados uuid[] := ARRAY[
    '25a4231c-612b-4f86-9c5a-904ca09f18f4',
    '92522073-484c-46a3-9e9d-8e80afa3c062'
  ]::uuid[];
  v_conjunto uuid[];
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_tocadas int;
BEGIN
  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
    INTO v_conjunto
    FROM public.candidaturas
   WHERE encerrada_a_pedido_em IS NOT NULL
     AND etapa_atual = 'inscricao'
     AND status = 'rejeitado'
     AND opcao_knockout_id IS NOT NULL;

  IF v_conjunto IS DISTINCT FROM v_autorizados THEN
    RAISE EXCEPTION 'JORN-26 (A): o predicado devolveu % — a autorizacao e para exatamente % — escopo divergente, nada foi escrito',
      v_conjunto, v_autorizados;
  END IF;

  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;

  UPDATE public.candidaturas
     SET encerrada_a_pedido_em = NULL
   WHERE id = ANY (v_autorizados)
     AND encerrada_a_pedido_em IS NOT NULL
     AND etapa_atual = 'inscricao'
     AND status = 'rejeitado'
     AND opcao_knockout_id IS NOT NULL;
  GET DIAGNOSTICS v_tocadas = ROW_COUNT;

  IF v_tocadas <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'JORN-26 (A): o UPDATE tocou % linha(s), esperado % — nada foi escrito',
      v_tocadas, cardinality(v_autorizados);
  END IF;

  SELECT count(*) INTO v_fila1  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist1  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif1 FROM public.notificacoes_enviadas;

  IF v_fila1 IS DISTINCT FROM v_fila0
     OR v_hist1 IS DISTINCT FROM v_hist0
     OR v_notif1 IS DISTINCT FROM v_notif0 THEN
    RAISE EXCEPTION 'JORN-26 (A): efeito colateral — fila % -> %, historico % -> %, notificacoes % -> % — nada foi escrito (nenhum e-mail retroativo, D-18)',
      v_fila0, v_fila1, v_hist0, v_hist1, v_notif0, v_notif1;
  END IF;

  RAISE NOTICE 'JORN-26 (A): % marca(s) de encerrada_a_pedido_em desfeitas em knockout: %', v_tocadas, v_autorizados;
END
$$;
