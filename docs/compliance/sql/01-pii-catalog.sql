-- =============================================================================
-- 01-pii-catalog.sql — Catálogo VIVO de colunas e FKs do schema `public`
-- =============================================================================
--
-- Requirement coberto : INVENT-01
-- Decisão de origem   : D-P42-17 (formato duplo YAML+MD) · D-P42-18 (semente = catálogo vivo)
-- Milestone           : M8 / v8.0 — Phase 42
-- Autoria             : 2026-07-29
-- Natureza            : **READ-ONLY — seguro em PROD.** Zero statement de escrita.
--                       Todas as consultas são sobre CATÁLOGO; nenhuma lê valor
--                       de linha de dado, portanto nenhuma devolve PII.
--
-- POR QUE CATÁLOGO VIVO E NUNCA ARQUIVOS DE MIGRATION
-- ---------------------------------------------------
-- O DDL base de ~40 tabelas legadas deste projeto vive FORA do ledger de
-- migrations, em `docs/sql/sql/*.sql` (49 scripts que nunca foram registrados
-- como migration). Um inventário construído a partir de `supabase/migrations/`
-- enxerga um FRAGMENTO do schema e se declara completo — que é exatamente o
-- modo de falha que este milestone existe para eliminar. A única fonte
-- autoritativa é o catálogo do banco vivo.
--
-- Como executar
-- -------------
-- Pelo **orquestrador / main thread**, via `execute_sql` do MCP do Supabase
-- contra o projeto `isljnozzlvckrgjjbjwp`. Subagentes GSD não recebem esses
-- tools. A consulta (a) é grande (993 linhas em 2026-07-29): se o transporte
-- truncar, executar em fatias por faixa de `table_name` (o idioma usado na
-- coleta original foi `< 'e'`, `>= 'e' AND < 'r'`, `>= 'r'`) e concatenar.
--
-- Destino: `docs/compliance/pii-inventory.yaml` (fonte) → `pii-inventory.md`
-- (gerado por `docs/compliance/sql/gen-pii-md.cjs`).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (a) CATÁLOGO COLUNA-A-COLUNA do schema `public`, só tabelas BASE.
--     Formato pipe-delimited para diff estável:
--       tabela|coluna|tipo|nullable|default
-- -----------------------------------------------------------------------------
SELECT string_agg(linha, E'\n' ORDER BY linha) AS catalogo
FROM (
  SELECT c.table_name || '|' || c.column_name || '|' || c.data_type || '|' ||
         c.is_nullable || '|' || COALESCE(c.column_default, '-') AS linha
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name  = c.table_name
     AND t.table_type  = 'BASE TABLE'
   WHERE c.table_schema = 'public'
) s;


-- -----------------------------------------------------------------------------
-- (b) TODAS as FKs de `public` que apontam para `auth.users`, com o ON DELETE
--     de cada uma. É o insumo direto do plano de exclusão da Phase 45:
--       · CASCADE  → a linha morre junto com o Auth
--       · SET NULL → a linha SOBREVIVE órfã a qualquer CASCADE (ERASE-09)
--       · sem cláusula (= NO ACTION) → a espinha de auditoria (ERASE-08),
--         que NUNCA pode ser relaxada para CASCADE
-- -----------------------------------------------------------------------------
SELECT
  c.conname                     AS constraint_name,
  n.nspname || '.' || t.relname AS tabela,
  pg_get_constraintdef(c.oid)   AS definicao
FROM pg_constraint c
JOIN pg_class     t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE c.contype = 'f'
  AND n.nspname = 'public'
  AND pg_get_constraintdef(c.oid) LIKE '%auth.users%'
ORDER BY tabela, c.conname;


-- -----------------------------------------------------------------------------
-- (c) EVIDÊNCIA PONTUAL — `public.candidatos.user_id`.
--
--     ⚠ Esta consulta existe para REFUTAR ou CONFIRMAR uma afirmação da
--     semente. `.planning/research/FK-AUDIT-LIVE.md` atribui o "drift de
--     `candidatos.user_id`" à linha 193 de `20260421000001` — mas aquela linha
--     altera **`autorizacoes`**, não `candidatos`.
--
--     Resultado em 2026-07-29:
--       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
--     idêntico ao repositório (`docs/sql/sql/02-tabela-candidatos.sql:14`).
--     **Não há drift nesta FK.** Ver `achados-inventario.md`.
-- -----------------------------------------------------------------------------
SELECT
  c.conname                   AS constraint_name,
  pg_get_constraintdef(c.oid) AS definicao
FROM pg_constraint c
JOIN pg_class     t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE c.contype = 'f'
  AND n.nspname = 'public'
  AND t.relname = 'candidatos'
  AND c.conname = 'candidatos_user_id_fkey';


-- -----------------------------------------------------------------------------
-- (d) TOTAIS de escopo — os números que o cabeçalho do YAML declara.
--     Re-executar isto é a forma barata de detectar que o inventário envelheceu.
-- -----------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE')  AS tabelas_public,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public')                                AS colunas_public,
  (SELECT count(*) FROM pg_constraint c
     JOIN pg_class     t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public')               AS fks_public,
  now() AT TIME ZONE 'UTC'                                        AS coletado_em_utc;
