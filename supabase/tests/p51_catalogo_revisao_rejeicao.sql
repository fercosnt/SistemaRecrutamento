-- =============================================================================
-- Phase 51 / Plano 51-15 — SONDA DE CATÁLOGO de `public.revisao_rejeicao` (JORN-42, D-57 passo 3)
-- =============================================================================
-- PARA QUE SERVE. O passo 3 do checklist D-57 da 49 manda acrescentar a `meta.acrescimos` de
-- `docs/compliance/catalogo-vivo-44.json` as colunas de toda tabela nova do titular, MEDIDAS
-- (nunca copiadas da migration). A tabela `revisao_rejeicao` (migration 20261008000002) só passa
-- a existir em PROD no apply do portão 51-16 — até lá ela só existe DENTRO de um ensaio que aborta.
-- Esta sonda é a medição: ela roda depois das migrations prefixadas pelo `p51_ensaio.cjs` e lê
-- `information_schema.columns` da tabela como o catálogo do banco a descreve naquele instante.
--
-- COMO RODAR (só assim):
--   node scripts/p51_ensaio.cjs --migracoes=supabase/migrations/20261008000002_p51_revisao_rejeicao.sql \
--        supabase/tests/p51_catalogo_revisao_rejeicao.sql
-- e ler a lista do campo `evidencia=` da linha `ENSAIO VERDE`. Depois do apply do 51-16 a mesma
-- consulta é reconfirmada ao vivo (só leitura) — o catálogo versionado registra as duas.
--
-- SÓ LEITURA. Não há `SET TRANSACTION READ ONLY` porque a sonda roda DENTRO do ensaio, na mesma
-- transação em que a migration acabou de escrever (o modo de transação não pode mudar depois da
-- primeira escrita). A única coisa que ela grava é a GUC de sessão `p51.evidencia`.
--
-- O QUE PUBLICA. `p51.evidencia` recebe, SUBSTITUINDO o que havia (o `02:…` do pós-portão da
-- migration — a prova de que ela rodou continua no `prefixadas=[…]` da linha do ensaio e no
-- próprio pós-portão, que reprova a requisição se falhar), um JSON compacto
--   [{"c": <coluna>, "n": <is_nullable>, "o": <ordinal_position>, "t": <data_type>}, …]
-- ordenado por `ordinal_position`. Substitui em vez de anexar porque o consumidor (o `<verify>`
-- do 51-15) lê o campo inteiro como JSON.
--
-- POPULAÇÃO VAZIA = FALHA. Se a tabela não existir no momento da sonda (migration não prefixada,
-- nome errado), a consulta devolve zero linhas — e uma lista vazia publicada como evidência seria
-- uma «medição» que não mediu nada. Por isso zero colunas reprova com `P51C FAIL (catalogo)`.
-- =============================================================================

DO $p51cat$
DECLARE
  v_n    int;
  v_json text;
BEGIN
  SELECT count(*),
         coalesce(
           jsonb_agg(
             jsonb_build_object(
               'c', c.column_name::text,
               't', c.data_type::text,
               'n', c.is_nullable::text,
               'o', c.ordinal_position::int
             ) ORDER BY c.ordinal_position
           )::text,
           '[]')
    INTO v_n, v_json
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name   = c.table_name
     AND t.table_type   = 'BASE TABLE'
   WHERE c.table_schema = 'public'
     AND c.table_name   = 'revisao_rejeicao';

  IF v_n = 0 THEN
    RAISE EXCEPTION 'P51C FAIL (catalogo): public.revisao_rejeicao sem nenhuma coluna no catalogo — a migration 20261008000002 nao foi prefixada ao ensaio; uma lista vazia nao e medicao';
  END IF;

  PERFORM set_config('p51.evidencia', v_json, false);
END
$p51cat$;
