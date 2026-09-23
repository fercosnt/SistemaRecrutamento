-- =============================================================================
-- Phase 49 / Plano 49-12 — ENSAIO das três escritas retroativas
--                          (D-46 / JORN-17 · D-47 / JORN-37 · D-43 / JORN-12)
-- =============================================================================
-- ⚠ É UM ENSAIO. NUNCA COMITA. O bloco termina SEMPRE em `RAISE EXCEPTION`: a
-- exceção aborta a transação inteira da requisição (a Management API roda o corpo
-- numa transação só — CLAUDE.md, «Via de apply ATUAL», propriedade 1) e a MENSAGEM
-- da exceção é o relatório. Saída esperada do `p46apply` = código ≠ 0 com
-- `ENSAIO OK: ...` no texto. Qualquer outra exceção é achado, não sucesso.
--
-- POR QUE EXISTE (D-54). UPDATE retroativo sobre linha existente é checkpoint do
-- operador, com contagem antes/depois. O operador decide sobre números medidos
-- pela MESMA query que escreveria — não sobre uma estimativa nem sobre um número
-- herdado da pesquisa. Os predicados abaixo são os que as migrations
-- 20260922000009/000010/000011 copiam (cada uma, se aprovada):
--
--   (D-46) `candidaturas.etapa_justificativa` → NULL. A justificativa de uma
--          transição grudava na coluna e era relida pela transição SEGUINTE
--          (torneira fechada no 49-06). Só entram no UPDATE as linhas cujo valor
--          bate md5, byte a byte, com o `criterio_texto` da linha MAIS RECENTE do
--          histórico da mesma candidatura — o texto não se perde.
--   (D-47) `historico_candidatura.criterio_texto` → a constante sem PII
--          'Decisão final registrada.' (a MESMA que `registrar_decisao` grava
--          desde o 49-06) nas linhas que carregam a justificativa da decisão
--          final. A trilha vai ao titular; a justificativa é BD-9 e fica na
--          fonte, `decisao_final.justificativa`. A seleção casa a decisão
--          CORRENTE **e** qualquer versão ARQUIVADA (Correção 11).
--   (D-43) `entrevista_analises` → marca `superada_em` nas não-vigentes de cada
--          grupo `(candidatura, tipo)` e preenche `texto_hash`/`ai_call_log_id`
--          onde a correspondência com `ai_call_logs` é UNÍVOCA. `tipo`,
--          `solicitado_por`, `provedor_ia` e `modelo_ia` NÃO são tocados aqui.
--
-- ⚠ A ORDEM É LOAD-BEARING, e é a ordem das versões (000009 → 000010 → 000011).
-- A D-47 reescreve `criterio_texto` de linhas do histórico que são JUSTAMENTE as
-- mais recentes de três das candidaturas da D-46. Se a D-47 rodasse primeiro, a
-- guarda de md5 da D-46 deixaria de bater e a limpeza recusaria essas três — não
-- por defeito, mas porque a prova de preservação do texto teria sido apagada
-- antes de ser usada. O ensaio roda na mesma ordem pelo mesmo motivo.
--
-- O QUE MEDE, além de ROW_COUNT e ids:
--   · fila_delta   — `net.http_request_queue` antes/depois das três escritas.
--   · historico_delta / notif_delta / dfh_delta — `historico_candidatura`,
--                    `notificacoes_enviadas`, `decisao_final_historico` (D-45: o
--                    arquivo de snapshots não pode crescer nem encolher).
--   · controle_a / controle_b — PROVAM QUE A MEDIDA DA FILA MORDE. Duas
--                    subtransações que se revertem:
--                    (a) re-marca `encerrada_a_pedido_em` (NULL → now()) numa
--                        candidatura do conjunto D-46 — dispara
--                        `trg_candidatura_encerrada_a_pedido` →
--                        `trg_notif_candidatura_encerrada` (contém `net.http_post`).
--                    (b) INSERE uma linha em `historico_candidatura` — dispara
--                        `trg_notif_transicao` (idem). Este é o controle que
--                        importa para a D-47: ele mostra que a tabela ENFILEIRA
--                        no INSERT, e que o `fila_delta = 0` da D-47 vem de ela
--                        ser um UPDATE, não de a medida ser cega.
--                    Esperado ≥ 1 em cada. Se derem 0, `fila_delta=0` não prova
--                    nada. As duas subtransações revertem e, de qualquer forma,
--                    a requisição inteira aborta: nada chega ao worker.
--
-- TRIGGERS VIVOS das três tabelas (lidos do catálogo em 2026-09-23, só leitura):
--   candidaturas: `candidaturas_avancar_etapa_trg` BEFORE UPDATE **OF etapa_atual**
--     (a D-46 não põe `etapa_atual` no SET ⇒ o trigger nem é convocado);
--     `trg_candidatura_encerrada_a_pedido` AFTER UPDATE **OF encerrada_a_pedido_em**;
--     `trg_candidaturas_guard_rejeicao` BEFORE UPDATE **OF status**;
--     `update_candidaturas_updated_at` BEFORE UPDATE (toca `updated_at` — efeito
--     colateral conhecido e aceito, igual ao do 48-12).
--   historico_candidatura: `trg_notif_transicao` AFTER **INSERT** — um UPDATE não
--     o convoca (é o que o controle (b) demonstra pelo lado positivo).
--   entrevista_analises: NENHUM trigger, e nenhum índice único sobre `texto_hash`.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_retroativos_ensaio.sql`
-- =============================================================================

DO $$
DECLARE
  -- Constante IDÊNTICA à que `registrar_decisao` grava desde 20260922000004 (49-06).
  c_constante constant text := 'Decisão final registrada.';

  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_dfh0 bigint; v_dfh1 bigint;

  v_d46_seguro uuid[]; v_d46_nao uuid[]; v_d46_anon int; v_n46 int;
  v_d47 uuid[]; v_d47_cands int; v_n47 int;
  v_d43 uuid[]; v_n43 int; v_d43_sup int; v_d43_vinc int; v_d43_trios text;

  v_ctrl_id uuid; v_ctrl_a bigint := -1;
  v_ctrl_hist uuid; v_ctrl_b bigint := -1;
BEGIN
  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_dfh0   FROM public.decisao_final_historico;

  -- ======================================================= (D-46) classificação
  -- Bate md5 com o `criterio_texto` da linha MAIS RECENTE do histórico da mesma
  -- candidatura ⇒ entra no UPDATE. Não bate ⇒ fica de fora e é REPORTADO. O
  -- predicado não é ajustado para caber (D-49).
  WITH ult AS (
    SELECT h.candidatura_id, h.criterio_texto,
           row_number() OVER (PARTITION BY h.candidatura_id
                              ORDER BY h.criado_em DESC, h.id DESC) rn
      FROM public.historico_candidatura h
  ),
  cls AS (
    SELECT c.id,
           (u.criterio_texto IS NOT NULL
            AND md5(c.etapa_justificativa) = md5(u.criterio_texto)) AS bate,
           -- domínio do e-mail, nunca o endereço (Correção 35)
           (ca.email LIKE '%@invalido.local') AS anonimizado
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
      LEFT JOIN ult u ON u.candidatura_id = c.id AND u.rn = 1
     WHERE c.etapa_justificativa IS NOT NULL
  )
  SELECT coalesce(array_agg(id ORDER BY id) FILTER (WHERE bate), '{}'::uuid[]),
         coalesce(array_agg(id ORDER BY id) FILTER (WHERE NOT bate), '{}'::uuid[]),
         count(*) FILTER (WHERE bate AND anonimizado)
    INTO v_d46_seguro, v_d46_nao, v_d46_anon
    FROM cls;

  UPDATE public.candidaturas
     SET etapa_justificativa = NULL
   WHERE id = ANY (v_d46_seguro)
     AND etapa_justificativa IS NOT NULL;
  GET DIAGNOSTICS v_n46 = ROW_COUNT;

  -- ============================================================ (D-47) seleção
  -- Casa a decisão CORRENTE **e** qualquer versão ARQUIVADA (Correção 11: uma das
  -- 5 linhas só casa o arquivo).
  SELECT coalesce(array_agg(h.id ORDER BY h.id), '{}'::uuid[]),
         count(DISTINCT h.candidatura_id)
    INTO v_d47, v_d47_cands
    FROM public.historico_candidatura h
   WHERE EXISTS (SELECT 1 FROM public.decisao_final d
                  WHERE d.candidatura_id = h.candidatura_id
                    AND d.justificativa = h.criterio_texto)
      OR EXISTS (SELECT 1 FROM public.decisao_final_historico a
                  WHERE a.candidatura_id = h.candidatura_id
                    AND a.justificativa = h.criterio_texto);

  UPDATE public.historico_candidatura h
     SET criterio_texto = c_constante
   WHERE h.id = ANY (v_d47);
  GET DIAGNOSTICS v_n47 = ROW_COUNT;

  -- ============================================================ (D-43) marcação
  -- `superada_em` = `created_at` da PRÓXIMA vigente do MESMO grupo
  -- `(candidatura, tipo)` — o instante em que ela deixou de valer, e não um
  -- carimbo inventado. `texto_hash`/`ai_call_log_id` só onde o casamento com
  -- `ai_call_logs` é UNÍVOCO (exatamente um log); sem isso, ficam NULL.
  WITH viv AS (
    SELECT a.id, a.created_at,
           lead(a.created_at) OVER (
             PARTITION BY a.candidatura_id, coalesce(a.tipo, '(sem tipo)')
             ORDER BY a.created_at, a.id) AS prox
      FROM public.entrevista_analises a
     WHERE public.entrevista_analise_vigente(a.superada_em, a.status_analise, a.competencias)
  ),
  proj AS (
    SELECT l.id AS log_id, l.input_hash, c.id AS cand_id,
           (SELECT jsonb_agg(jsonb_build_object('competency', e->>'competency',
                                                'score', e->'score') ORDER BY ord)
              FROM jsonb_array_elements(l.raw_response->'competency_evaluations')
                   WITH ORDINALITY t(e, ord)) AS comp_proj
      FROM public.ai_call_logs l
      JOIN public.candidaturas c
        ON c.candidato_id = l.candidato_id AND c.vaga_id = l.vaga_id
     WHERE l.call_type = 'transcript_analysis' AND l.success
  ),
  vinc AS (
    SELECT a.id, count(*) AS n, min(p.log_id::text) AS log_id, min(p.input_hash) AS input_hash
      FROM public.entrevista_analises a
      JOIN proj p ON p.cand_id = a.candidatura_id AND p.comp_proj = a.competencias
     GROUP BY a.id
  ),
  alvo AS (
    SELECT v.id, v.prox AS superada_em,
           CASE WHEN vc.n = 1 THEN vc.input_hash END AS texto_hash,
           CASE WHEN vc.n = 1 THEN vc.log_id::uuid END AS ai_call_log_id
      FROM viv v LEFT JOIN vinc vc ON vc.id = v.id
     WHERE v.prox IS NOT NULL OR vc.n = 1        -- linha sem marca e sem vínculo não é tocada
  ),
  u AS (
    UPDATE public.entrevista_analises a
       SET superada_em    = coalesce(a.superada_em, t.superada_em),
           texto_hash     = coalesce(a.texto_hash, t.texto_hash),
           ai_call_log_id = coalesce(a.ai_call_log_id, t.ai_call_log_id)
      FROM alvo t
     WHERE a.id = t.id
    RETURNING a.id, t.superada_em, t.texto_hash, t.ai_call_log_id
  )
  SELECT count(*)::int,
         coalesce(array_agg(id ORDER BY id), '{}'::uuid[]),
         count(*) FILTER (WHERE superada_em IS NOT NULL)::int,
         count(*) FILTER (WHERE ai_call_log_id IS NOT NULL)::int,
         string_agg(id::text || '|sup=' || coalesce(superada_em::text, '-')
                    || '|hash=' || coalesce(left(texto_hash, 8), '-')
                    || '|log='  || coalesce(left(ai_call_log_id::text, 8), '-'),
                    ' ;; ' ORDER BY id)
    INTO v_n43, v_d43, v_d43_sup, v_d43_vinc, v_d43_trios
    FROM u;

  -- ============================================================ efeito colateral
  SELECT count(*) INTO v_fila1  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist1  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif1 FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_dfh1   FROM public.decisao_final_historico;

  -- ============================== controle (a): UPDATE que DEVE enfileirar e-mail
  SELECT id INTO v_ctrl_id
    FROM public.candidaturas
   WHERE id = ANY (v_d46_seguro) AND encerrada_a_pedido_em IS NULL
   ORDER BY id LIMIT 1;
  IF v_ctrl_id IS NOT NULL THEN
    BEGIN
      UPDATE public.candidaturas SET encerrada_a_pedido_em = now() WHERE id = v_ctrl_id;
      SELECT count(*) - v_fila1 INTO v_ctrl_a FROM net.http_request_queue;
      RAISE EXCEPTION 'p49_ctrl_revert' USING ERRCODE = 'P0001';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'p49_ctrl_revert' THEN RAISE; END IF;
    END;
  END IF;

  -- ============ controle (b): INSERT em historico_candidatura, que DEVE enfileirar
  v_ctrl_hist := v_d47[1];
  IF v_ctrl_hist IS NOT NULL THEN
    BEGIN
      INSERT INTO public.historico_candidatura (candidatura_id, etapa_de, etapa_para, criterio_texto)
      SELECT h.candidatura_id, h.etapa_de, h.etapa_para, 'CONTROLE P49-12 (revertido)'
        FROM public.historico_candidatura h WHERE h.id = v_ctrl_hist;
      SELECT count(*) - v_fila1 INTO v_ctrl_b FROM net.http_request_queue;
      RAISE EXCEPTION 'p49_ctrl_revert' USING ERRCODE = 'P0001';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'p49_ctrl_revert' THEN RAISE; END IF;
    END;
  END IF;

  RAISE EXCEPTION 'ENSAIO OK: d46=% (%) d46_nao_batem=% (%) d46_anonimizados=% d47=% linhas em % candidaturas (%) d43=% marcadas, % com superada_em, % com vinculo (%) fila_delta=% historico_delta=% notif_delta=% dfh_delta=% controle_a=% controle_b=%',
    v_n46, coalesce(array_to_string(v_d46_seguro, ', '), '-'),
    cardinality(v_d46_nao), coalesce(nullif(array_to_string(v_d46_nao, ', '), ''), '-'),
    v_d46_anon,
    v_n47, v_d47_cands, coalesce(array_to_string(v_d47, ', '), '-'),
    v_n43, v_d43_sup, v_d43_vinc, coalesce(v_d43_trios, '-'),
    v_fila1 - v_fila0, v_hist1 - v_hist0, v_notif1 - v_notif0, v_dfh1 - v_dfh0,
    v_ctrl_a, v_ctrl_b;
END
$$;
