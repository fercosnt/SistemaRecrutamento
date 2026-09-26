SET TRANSACTION READ ONLY;
-- =============================================================================
-- p49_prontidao_prod.sql — sonda de prontidão da Phase 49 em PROD (plano 49-18, Task 1)
-- =============================================================================
-- SÓ LEITURA, por construção: a primeira instrução trava a transação em READ ONLY,
-- e o resto é um único SELECT sobre o catálogo. Nada aqui escreve, e nada vai para o
-- ledger de migrations. Rodar com:
--
--   node p46apply.cjs sql "$(cat supabase/tests/p49_prontidao_prod.sql)"
--
-- Devolve UMA linha de booleanos. Cada coluna afirma a PRESENÇA de um objeto que um
-- plano da fase (49-01..49-17, 49-20..49-24) pôs no ar. Todas têm de sair `true` antes
-- de chamar o operador para as sessões humanas — senão a sessão humana prova um deploy
-- que faltou, e o diagnóstico sai contra o conserto em vez de contra o canal de
-- publicação (CLAUDE.md §«Esta via NÃO passa pelo git»).
--
-- Forma dos portões (CLAUDE.md, «varra pela FORMA, não pelo sintoma»):
--   · nenhuma contagem contra constante VIVA: as listas nomeadas são checadas por
--     CONTENÇÃO («todos estes estão lá»), então objeto a mais não reprova e objeto a
--     menos reprova. As duas contagens literais que existem (`= 16` das colunas,
--     `= 3600` do teto) não são fotografias: 16 é o tamanho da própria lista escrita
--     ao lado, e 3600 é um valor DECIDIDO (D-29/49-08), não medido;
--   · objeto ausente sai `false`, nunca NULL: `coalesce(bool_and(...), false)` e EXISTS;
--   · as listas literais abaixo são ESCOPO DELIBERADO — são os objetos desta fase,
--     nomeados pelos SUMMARYs de 49-01..49-17 e 49-20..49-24 — e não fotografia do banco.
--
-- ⚠ Esta sonda cobre só o BANCO. Os bundles das Edge Functions e os marcadores do front
-- publicado NÃO são visíveis daqui — eles são conferidos pelos outros dois `<verify>`
-- do plano (Management API `/functions/<slug>/body` e crawler do grafo de import), e o
-- `origin/main..HEAD` vazio pelo terceiro. Uma sonda de banco verde com o front parado
-- no disco é exatamente o falso «conserto que não funciona» de 2026-09-06.
-- =============================================================================
WITH
fn AS (
  SELECT p.proname, p.oid, p.prosrc, p.provolatile
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
),
cols AS (
  SELECT table_name || '.' || column_name AS tc, is_nullable
    FROM information_schema.columns
   WHERE table_schema = 'public'
),
-- as 16 colunas que o 49-01 acrescentou (7 em `entrevista_analises`, 9 nas outras
-- quatro tabelas de resultado). Lista = ESCOPO DELIBERADO, conferida contra o
-- 49-01-SUMMARY e contra o catálogo vivo em 2026-09-26.
-- ⚠ `scores_candidato` NÃO tem par de colunas: a proveniência da SJT vive dentro de
--   `scores_candidato.metadata` (49-23, D-68) — quem procurar colunas lá acha ausência
--   onde há decisão.
novas AS (
  SELECT unnest(ARRAY[
    'entrevista_analises.provedor_ia',     'entrevista_analises.modelo_ia',
    'entrevista_analises.tipo',            'entrevista_analises.solicitado_por',
    'entrevista_analises.texto_hash',      'entrevista_analises.ai_call_log_id',
    'entrevista_analises.superada_em',
    'analise_candidato_vaga.provedor_ia',  'analise_candidato_vaga.modelo_ia',
    'comparativo_solicitado.provedor_ia',  'comparativo_solicitado.modelo_ia',
    'entrevista_guias.provedor_ia',        'entrevista_guias.modelo_ia',
    'redacoes_candidato.provedor_ia',      'redacoes_candidato.modelo_ia',
    'redacoes_candidato.rubrica_versao'
  ]) AS tc
),
trg AS (
  SELECT t.tgname, t.tgrelid, t.tgenabled, pg_catalog.pg_get_triggerdef(t.oid) AS def
    FROM pg_catalog.pg_trigger t
   WHERE NOT t.tgisinternal
)
SELECT
  -- 49-01 · o enum aceita o provedor que não é provedor (JORN-39).
  -- Lido por TEXTO em `pg_enum`: `enum_range()` levantaria «unsafe use of new value».
  EXISTS (SELECT 1 FROM pg_catalog.pg_enum e
            JOIN pg_catalog.pg_type ty ON ty.oid = e.enumtypid
           WHERE ty.typname = 'llm_provider' AND e.enumlabel = 'none')
    AS b01_enum_llm_provider_tem_none,

  -- 49-01 · as 16 colunas novas existem (contenção: a lista está toda no catálogo)
  NOT EXISTS (SELECT 1 FROM novas WHERE tc NOT IN (SELECT tc FROM cols))
    AS b02_16_colunas_novas_existem,

  -- 49-01 / D-55 · e são todas NULÁVEIS (a EF velha ainda grava)
  (SELECT count(*) FROM cols WHERE tc IN (SELECT tc FROM novas) AND is_nullable = 'YES') = 16
    AS b03_16_colunas_novas_nulaveis,

  -- 49-01 / D-39 · a ÚNICA definição de «vigente», e ela é IMMUTABLE
  coalesce((SELECT bool_and(provolatile = 'i') FROM fn
             WHERE oid = to_regprocedure('public.entrevista_analise_vigente(timestamptz, text, jsonb)')),
           false)
    AS b04_entrevista_analise_vigente_immutable,

  -- 49-06 · `avancar_etapa` com a trava D-35 (predicado + GUC), a limpeza JORN-17 e a vigente
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0
                        AND position('app.transicao_sancionada' IN prosrc) > 0
                        AND position('etapa_justificativa' IN prosrc) > 0
                        AND position('entrevista_analise_vigente' IN prosrc) > 0)
              FROM fn WHERE proname = 'avancar_etapa'), false)
    AS b05_avancar_etapa_trava_limpeza_vigente,

  -- 49-06 · `registrar_decisao` sanciona a transição e grava a CONSTANTE sem PII do D-47
  -- (o texto vivo, lido byte a byte — é ele que mantém a justificativa fora da trilha)
  coalesce((SELECT bool_and(position('app.transicao_sancionada' IN prosrc) > 0
                        AND position('Decisão final registrada.' IN prosrc) > 0)
              FROM fn WHERE proname = 'registrar_decisao'), false)
    AS b06_registrar_decisao_guc_e_constante_d47,

  -- 49-06 · `responder_revisao_decisao` sanciona a reabertura
  coalesce((SELECT bool_and(position('app.transicao_sancionada' IN prosrc) > 0)
              FROM fn WHERE proname = 'responder_revisao_decisao'), false)
    AS b07_responder_revisao_com_guc,

  -- 49-06 / JORN-34 · reabrir encerrada mexendo só no `status` é recusado
  coalesce((SELECT bool_and(position('candidatura_encerrada(' IN prosrc) > 0
                        AND position('app.transicao_sancionada' IN prosrc) > 0)
              FROM fn WHERE proname = 'guard_rejeicao_auditada'), false)
    AS b08_guard_rejeicao_com_predicado_e_guc,

  -- 49-07 / JORN-3b · o snapshot só dispara com mudança REAL, e o `WHEN` compara a LINHA
  -- INTEIRA por `to_jsonb` — coluna nova entra na vigilância sem ninguém editar o trigger
  EXISTS (SELECT 1 FROM trg
           WHERE tgname = 'trg_decisao_final_snapshot'
             AND tgrelid = to_regclass('public.decisao_final')
             AND tgenabled <> 'D'
             AND position('to_jsonb' IN def) > 0
             AND position('explicacao_solicitada_em' IN def) > 0
             AND position('alerta_prazo_enviado_em' IN def) > 0)
    AS b09_snapshot_when_por_tojsonb,

  -- 49-07 / JORN-3b · abrir a página da explicação deixou de ESCREVER
  coalesce((SELECT bool_and(position('explicacao_solicitada_em IS NULL' IN prosrc) > 0)
              FROM fn WHERE proname = 'stamp_explicacao_acessada'), false)
    AS b10_stamp_explicacao_idempotente,

  -- 49-10 / D-38 · o ÚNICO escritor de `entrevista_analises`, fechado para o cliente
  coalesce((SELECT bool_and(has_function_privilege('service_role', oid, 'EXECUTE')
                        AND NOT has_function_privilege('authenticated', oid, 'EXECUTE')
                        AND NOT has_function_privilege('anon', oid, 'EXECUTE'))
              FROM fn WHERE proname = 'registrar_analise_entrevista'), false)
    AS b11_registrar_analise_so_service_role,

  -- 49-10 / D-39 · as duas RPCs de revisão escolhem/exigem a análise VIGENTE
  coalesce((SELECT bool_and(position('entrevista_analise_vigente' IN prosrc) > 0)
              FROM fn WHERE proname IN ('salvar_avaliacao_entrevista', 'confirmar_revisao_entrevista')), false)
  AND (SELECT count(DISTINCT proname) FROM fn
        WHERE proname IN ('salvar_avaliacao_entrevista', 'confirmar_revisao_entrevista')) = 2
    AS b12_rpcs_revisao_pela_vigente,

  -- 49-20 / D-62 · o motor tem o passo que apaga respostas e produções do titular
  coalesce((SELECT bool_and(position('apagar_respostas_e_producoes' IN prosrc) > 0)
              FROM fn WHERE proname = 'anonimizar_candidato'), false)
    AS b13_anonimizar_com_apagar_respostas_e_producoes,

  -- 49-08 / D-29 · o teto por chamada do comparativo é o valor DECIDIDO
  coalesce((SELECT max_tokens FROM public.prompt_versions
             WHERE call_type = 'comparative_ranking' AND is_active) = 3600, false)
    AS b14_comparativo_max_tokens_3600,

  -- as migrations desta fase estão todas no ledger (contenção; versão a mais não reprova).
  -- ⚠ `20260922000010` NÃO está na lista, de propósito: a D-47 foi RECUSADA pelo operador
  --   em 2026-09-23 e o número ficou deliberadamente VAZIO (49-12). Exigi-la aqui seria
  --   afirmar, como critério de prontidão, exatamente o que ele declinou.
  NOT EXISTS (SELECT 1 FROM unnest(ARRAY[
      '20260922000001', '20260922000002', '20260922000003', '20260922000004',
      '20260922000005', '20260922000006', '20260922000007', '20260922000008',
      '20260922000009', '20260922000011', '20260922000012', '20260922000013',
      '20260923000001'
    ]) AS v WHERE v NOT IN (SELECT version FROM supabase_migrations.schema_migrations))
    AS b15_migrations_da_fase_no_ledger;
