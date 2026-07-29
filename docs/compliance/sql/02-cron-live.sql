-- =============================================================================
-- 02-cron-live.sql — Catálogo dos `cron.job` vivos + blast radius do INVENT-05
-- =============================================================================
--
-- Requirement coberto : INVENT-03 (diff cron vivo × repositório)
--                       INVENT-05 (fato datado de blast radius ANTES do fix)
-- Milestone           : M8 / v8.0 — Phase 42
-- Autoria             : 2026-07-29
-- Natureza            : **READ-ONLY — seguro em PROD.** Zero statement de escrita.
--
-- Como executar
-- -------------
-- Pelo orquestrador / main thread, via `execute_sql` do MCP do Supabase contra
-- o projeto `isljnozzlvckrgjjbjwp`. Subagentes GSD não recebem esses tools.
--
-- ⚠ GATE BLOQUEANTE (consulta (a))
-- Esperado: EXATAMENTE 3 jobs, todos `active = true`:
--   · ai-cost-aggregation        `30 1 * * *`
--   · ai-logs-retention-cleanup  `0 2 * * *`
--   · notif-retry-sweep          `*/15 * * * *`
-- Qualquer 4º job, ou qualquer job cujo `command` divirja do arquivo de
-- migration que o declara, é ACHADO BLOQUEANTE: significa que existe um caminho
-- de escrita apontado para uma purga fora do repositório. PARE e escale.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (a) CATÁLOGO DOS JOBS VIVOS — devolver `command` na ÍNTEGRA, sem truncar.
--     O diff byte a byte contra o arquivo de migration depende disso.
-- -----------------------------------------------------------------------------
SELECT jobid, jobname, schedule, active, database, username, command
  FROM cron.job
 ORDER BY jobname;


-- -----------------------------------------------------------------------------
-- (b) BLAST RADIUS do INVENT-05 — o fato datado que precede o fix.
--
--     ⚠ PRECISÃO (medida em 2026-07-29): o enunciado do requirement diz que o
--     `NOT IN` com subquery NULL-able "apaga zero em silêncio". O mecanismo está
--     certo, mas a condição de disparo não é a que o enunciado sugere:
--
--       · Com `candidate_ai_decisions` VAZIA, a subquery devolve ZERO linhas, e
--         `x NOT IN (conjunto vazio)` é TRUE — não NULL. Hoje o cron apaga
--         CORRETAMENTE. O bug NÃO está ativo.
--       · O bug arma-se quando existir linha protegida (status em review) E o
--         `ai_call_log_ids` de alguma delas contiver elemento NULL.
--
--     Portanto o efeito da correção não é "voltar a apagar" — é impedir que
--     pare de apagar no futuro, em silêncio.
-- -----------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.ai_call_logs)                                        AS ai_call_logs_total,
  (SELECT count(*) FROM public.ai_call_logs WHERE retain_until < now())             AS elegiveis_por_retencao,
  (SELECT count(*) FROM public.candidate_ai_decisions)                              AS cad_total,
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE status IN ('candidate_review_requested','human_reviewing'))               AS cad_protegidas,
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE ai_call_log_ids IS NULL)                                                  AS cad_ids_null,
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE status IN ('candidate_review_requested','human_reviewing')
      AND ai_call_log_ids IS NULL)                                                  AS cad_protegidas_ids_null,
  (SELECT count(*) FROM public.candidate_ai_decisions
    WHERE status IN ('candidate_review_requested','human_reviewing')
      AND array_position(ai_call_log_ids, NULL) IS NOT NULL)                        AS cad_protegidas_com_elemento_null,
  now() AT TIME ZONE 'UTC'                                                          AS coletado_em_utc;


-- -----------------------------------------------------------------------------
-- (c) PAPÉIS VIVOS DE `usuarios_rh` — insumo do predicado de destinatários da
--     EF `notificar-rh` (plano 42-07).
--
--     ⚠ DOIS VOCABULÁRIOS DE PAPEL COEXISTEM NESTE SISTEMA:
--       · `usuarios_rh.role` (CHECK): administrador | gerente | recrutador | visualizador
--       · JWT `app_metadata.role`:    administrador | rh | candidato
--         (o hook mapeia `recrutador` → `rh`)
--     Um filtro literal por `role IN ('rh','administrador')` sobre a TABELA
--     descarta TODO recrutador — nenhuma linha de `usuarios_rh` tem role 'rh'.
--     Medido em 2026-07-29: 4 administrador + 1 recrutador, todos ativos.
--     O recrutador é exatamente quem o filtro errado teria silenciado.
-- -----------------------------------------------------------------------------
SELECT role, ativo, (deleted_at IS NULL) AS vivo, count(*)
  FROM public.usuarios_rh
 GROUP BY 1, 2, 3
 ORDER BY 1;
