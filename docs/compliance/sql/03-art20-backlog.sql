-- =============================================================================
-- 03-art20-backlog.sql — Passivo de pedidos de revisão do Art. 20 (LGPD)
-- =============================================================================
--
-- Requirement coberto : REVISAO-06
-- Decisão de origem   : D-P42-19 (o número é entregue ANTES de qualquer tela)
-- Milestone           : M8 / v8.0 — Phase 42
-- Autoria             : 2026-07-29
-- Natureza            : **READ-ONLY — seguro de executar em PROD.**
--                       Zero statement de escrita. Nenhum INSERT/UPDATE/DELETE/
--                       DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE neste arquivo.
--
-- Como executar
-- -------------
-- Pelo **orquestrador / main thread**, via `execute_sql` do MCP do Supabase
-- contra o projeto `isljnozzlvckrgjjbjwp`. Subagentes GSD não recebem os tools
-- MCP do Supabase (premissa de planejamento de wave registrada na STATE.md),
-- por isso esta consulta é um checkpoint de orquestrador e não uma task
-- automatizada.
--
-- ⚠ NOTA DE PRECISÃO — o predicado de "pendente" MUDA durante esta fase
-- ----------------------------------------------------------------------
-- Enquanto as colunas `revisao_veredito` / `revisao_respondida_em` não
-- existirem (elas nascem na migration do plano 42-06), "pendente" só pode ser
-- expresso como:
--
--     revisao_solicitada_em IS NOT NULL AND revisao_resultado IS NULL
--
-- A PARTIR da migration do plano 42-06, o predicado canônico passa a ser:
--
--     revisao_solicitada_em IS NOT NULL AND revisao_respondida_em IS NULL
--
-- e é **esse** que a fila (`listar_revisoes_decisao`) usa. Qualquer re-medição
-- posterior a essa migration TEM de usar a segunda forma — senão a contagem
-- "antes" e a contagem "depois" medem coisas diferentes em silêncio, e a
-- comparação que dá sentido ao fato datado vira ruído.
--
-- As duas formas estão escritas abaixo justamente para que a re-execução
-- pós-migration não dependa da memória de ninguém.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (a) AGREGADO — os números que o artefato `art20-backlog.md` transcreve.
--     Forma PRÉ-migration (predicado: revisao_resultado IS NULL).
--
-- ⚠ DUAS SEMÂNTICAS DE "DIAS DE ESPERA" — medidas em 2026-07-29, divergem em 1
--   sobre a MESMA linha (32 vs 33). Não é bug de nenhuma das duas; são
--   definições diferentes:
--
--     · maior_espera_dias_intervalo  = EXTRACT(day FROM now() - ts)
--       Trunca o intervalo: conta períodos completos de 24 h decorridos.
--     · maior_espera_dias_calendario = now()::date - ts::date
--       Conta fronteiras de dia-calendário cruzadas.
--
--   **A semântica canônica desta fase é a de CALENDÁRIO.** É a que o CONTEXT
--   trava para a fila ("dias corridos inteiros", `date-fns
--   differenceInCalendarDays`) e portanto a que o badge de acompanhamento
--   exibe. A forma de intervalo fica registrada ao lado apenas para que a
--   divergência seja explícita e não reapareça como surpresa — um artefato
--   dizendo "32" enquanto a tela diz "33" é precisamente o tipo de
--   inconsistência silenciosa que esta fase existe para eliminar.
--
--   Origem: a consulta proposta em `42-RESEARCH.md` §E9 usava a forma de
--   intervalo. A divergência só apareceu ao executar as duas contra PROD.
-- -----------------------------------------------------------------------------
SELECT
  count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL
                     AND d.revisao_resultado IS NULL)                     AS pendentes,
  count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL)             AS solicitadas_total,
  min(d.revisao_solicitada_em) FILTER (WHERE d.revisao_resultado IS NULL) AS mais_antigo_pendente,
  max(now()::date - d.revisao_solicitada_em::date)
      FILTER (WHERE d.revisao_resultado IS NULL)                          AS maior_espera_dias_calendario,
  max(EXTRACT(day FROM now() - d.revisao_solicitada_em))
      FILTER (WHERE d.revisao_resultado IS NULL)                          AS maior_espera_dias_intervalo,
  now() AT TIME ZONE 'UTC'                                                AS coletado_em_utc
  FROM public.decisao_final d;


-- -----------------------------------------------------------------------------
-- (b) DETALHAMENTO — dimensiona o `LIMIT 200` server-side de
--     `listar_revisoes_decisao` (plano 42-06) e o cap de scroll da tabela
--     (plano 42-09). Forma PRÉ-migration.
--
--     ⚠ O resultado desta consulta contém IDENTIFICADORES (`candidatura_id`,
--     `por_usuario`). Eles servem para inspeção ao vivo e **não** podem ser
--     copiados para `docs/compliance/art20-backlog.md` — o artefato é versionado
--     no Git e recebe apenas agregados e, no máximo, a distribuição de
--     `dias_em_espera`.
-- -----------------------------------------------------------------------------
SELECT d.candidatura_id, d.decisao, d.por_usuario, d.revisao_solicitada_em,
       (now()::date - d.revisao_solicitada_em::date) AS dias_em_espera
  FROM public.decisao_final d
 WHERE d.revisao_solicitada_em IS NOT NULL AND d.revisao_resultado IS NULL
 ORDER BY d.revisao_solicitada_em ASC;


-- =============================================================================
-- FORMA PÓS-MIGRATION (plano 42-06 em diante) — usar ESTA a partir daí.
-- Mantida comentada até as colunas existirem; descomentar substitui as duas
-- consultas acima, não as complementa.
-- =============================================================================
--
-- -- (a') AGREGADO — predicado canônico: revisao_respondida_em IS NULL
-- SELECT
--   count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL
--                      AND d.revisao_respondida_em IS NULL)                     AS pendentes,
--   count(*) FILTER (WHERE d.revisao_solicitada_em IS NOT NULL)                 AS solicitadas_total,
--   min(d.revisao_solicitada_em) FILTER (WHERE d.revisao_respondida_em IS NULL) AS mais_antigo_pendente,
--   max(EXTRACT(day FROM now() - d.revisao_solicitada_em))
--       FILTER (WHERE d.revisao_respondida_em IS NULL)                          AS maior_espera_dias
--   FROM public.decisao_final d;
--
-- -- (b') DETALHAMENTO — predicado canônico: revisao_respondida_em IS NULL
-- SELECT d.candidatura_id, d.decisao, d.por_usuario, d.revisao_solicitada_em,
--        (now()::date - d.revisao_solicitada_em::date) AS dias_em_espera
--   FROM public.decisao_final d
--  WHERE d.revisao_solicitada_em IS NOT NULL AND d.revisao_respondida_em IS NULL
--  ORDER BY d.revisao_solicitada_em ASC;
