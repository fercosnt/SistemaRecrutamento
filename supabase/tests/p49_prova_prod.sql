-- =============================================================================
-- p49_prova_prod.sql — a prova da Phase 49 em PROD, pela consulta (plano 49-18)
-- =============================================================================
-- SÓ LEITURA por construção: um único SELECT. Este arquivo NÃO começa com
-- `SET TRANSACTION`, porque quem o roda PREFIXA a trava e o instante T0 — e o
-- `SET TRANSACTION` tem de ser a primeira instrução da transação:
--
--   T0=$(grep -m1 "^T0: " .planning/phases/49-consertos-da-jornada-bloco-2/49-PROVA-PROD.md | cut -d' ' -f2)
--   D=$(mktemp -d)
--   { echo "SET TRANSACTION READ ONLY; SELECT set_config('p49.t0', '$T0', false);"
--     cat supabase/tests/p49_prova_prod.sql; } > "$D/prova.sql"
--   node p46apply.cjs run "$D/prova.sql"
--
-- Devolve UMA linha, um booleano por prova (D-51: confira no banco, nunca só na tela).
--   · contas de teste = `candidatos.email ILIKE '%+claude%'`;
--   · só conta o que aconteceu DEPOIS de T0 (`current_setting('p49.t0')`) — a coluna de
--     instante de cada tabela foi conferida no catálogo vivo em 2026-09-26 e NÃO é a
--     mesma em todas: `redacoes_candidato` usa `ia_processada_em` (é o instante em que a
--     IA avaliou, não o da submissão), as outras quatro tabelas de resultado usam
--     `created_at`, `historico_candidatura` e `notificacoes_enviadas` usam `criado_em`,
--     `decisao_final_historico` usa `arquivado_em`;
--   · conjunto vazio sai `false`, nunca NULL: toda prova POSITIVA exige que o fato
--     exista (EXISTS / `coalesce(bool_and(...), false)`). As provas NEGATIVAS
--     (`p25_*`, `p17_*`, `p3b_*`, `p37_*`, `p12_falha_nunca_vigente`,
--     `p12_uma_vigente_por_tipo`, `p12_sem_hash_duplicado`) são `true` quando nada de
--     errado existe — e por isso podem já sair `true` no baseline. Cada uma delas
--     carrega, ao lado, o conjunto NÃO-VAZIO que ela vigia, para não passar por vacuidade.
--
-- ⚠ O que este arquivo NÃO prova, e por que:
--   · o passo novo do motor (JORN-36 / p36) é do plano 49-19, em consulta própria — a
--     primeira execução real dele é um checkpoint do operador, one-way;
--   · render de tela e de PDF: o banco prova o COMPORTAMENTO, não o texto lido. As
--     conferências humanas ficam no `49-PROVA-PROD.md`.
--
-- ⚠ Duas expectativas desta fase são DECISÕES do operador, não defeitos, e nenhuma prova
--   aqui as contradiz:
--   · a D-47 foi RECUSADA em 2026-09-23 (49-12): 5 linhas de `historico_candidatura`
--     seguem com o texto da justificativa da decisão final, de propósito. Por isso
--     `p37_trilha_sem_texto_da_decisao` é escopada a `criado_em > T0` — uma versão global
--     reprovaria para sempre, e a leitura óbvia do vermelho («a escrita quebrou») levaria
--     alguém a aplicar a migration que o operador declinou;
--   · a proveniência de uma linha `provider='none'` é NULA por desenho — nenhum modelo
--     respondeu (`ai-client.ts`: `model: null`, `log_id: null`). Exigir `modelo_ia` numa
--     análise `falhou` seria exigir proveniência inventada (D-30).
-- =============================================================================
WITH
t AS (
  SELECT current_setting('p49.t0')::timestamptz AS t0
),
teste AS (
  SELECT c.id FROM public.candidatos c WHERE c.email ILIKE '%+claude%'
),
cand AS (
  SELECT cd.* FROM public.candidaturas cd WHERE cd.candidato_id IN (SELECT id FROM teste)
),
-- Candidaturas de teste eliminadas por knockout. São encerradas desde a inscrição e
-- NUNCA deixam de ser (`etapa_atual='inscricao'`, `status='rejeitado'`,
-- `opcao_knockout_id` preenchido) — é por isso que elas, e não «encerrada hoje», são o
-- sujeito das provas do JORN-25: uma candidatura que estava ABERTA no instante da ação e
-- foi encerrada depois faria uma prova de «encerrada hoje» acusar trabalho correto.
ko AS (
  SELECT cd.id, cd.vaga_id FROM cand cd WHERE cd.opcao_knockout_id IS NOT NULL
),
-- ── Resultados de IA de teste depois de T0, tabela por tabela ─────────────────
r_acv AS (
  SELECT a.modelo_ia, a.provedor_ia FROM public.analise_candidato_vaga a, t
   WHERE a.candidatura_id IN (SELECT id FROM cand) AND a.created_at > t.t0
     AND a.status = 'sucesso'
),
r_red AS (
  SELECT r.* FROM public.redacoes_candidato r, t
   WHERE r.candidatura_id IN (SELECT id FROM cand) AND r.ia_processada_em > t.t0
     AND r.analise_ia IS NOT NULL
),
r_gui AS (
  SELECT g.modelo_ia, g.provedor_ia FROM public.entrevista_guias g, t
   WHERE g.candidatura_id IN (SELECT id FROM cand) AND g.created_at > t.t0
),
-- Todas as análises de entrevista de teste nascidas depois de T0 (inclusive as `falhou`)
ea AS (
  SELECT a.* FROM public.entrevista_analises a, t
   WHERE a.candidatura_id IN (SELECT id FROM cand) AND a.created_at > t.t0
),
-- Só as que SÃO resultado: alguma IA respondeu
ea_ok AS (
  SELECT * FROM ea WHERE status_analise IS DISTINCT FROM 'falhou'
),
-- Comparativos depois de T0 que envolvem candidatura de teste.
-- `comparativo_solicitado` não tem `candidatura_id`: o vínculo é o array `candidatura_ids`.
comp AS (
  SELECT cs.* FROM public.comparativo_solicitado cs, t
   WHERE cs.created_at > t.t0
     AND cs.candidatura_ids && ARRAY(SELECT id FROM cand)
),
-- Os comparativos de teste com EXATAMENTE 4 candidaturas (D-59), casados com a linha de
-- log da chamada. ⚠ `comparativo_solicitado` NÃO guarda `ai_call_log_id`, então o casamento
-- é por `vaga_id` + janela de tempo em volta do `created_at` do comparativo — a forma mais
-- estreita disponível. `latencia_ms` vem da PRÓPRIA linha do comparativo (é dela que o
-- produto mede), e `output_token_count` só existe no log.
comp4 AS (
  SELECT cs.id, cs.provedor_ia, cs.modelo_ia, cs.latencia_ms,
         l.output_token_count, l.model_snapshot
    FROM comp cs
    LEFT JOIN public.ai_call_logs l
           ON l.call_type = 'comparative_ranking'
          AND l.provider = 'anthropic'
          AND l.success
          AND l.vaga_id = cs.vaga_id
          AND l.created_at BETWEEN cs.created_at - interval '10 minutes'
                               AND cs.created_at + interval '1 minute'
   WHERE coalesce(array_length(cs.candidatura_ids, 1), 0) = 4
),
-- Linhas de RESULTADO de um fallback depois de T0 (global: `fallback_%` é vocabulário
-- NOVO desta fase — 49-02 —, então qualquer linha assim nasceu do contrato novo).
fb AS (
  SELECT l.* FROM public.ai_call_logs l, t
   WHERE l.created_at > t.t0 AND l.error_code LIKE 'fallback\_%'
),
-- Notificações `avanco` depois de T0, com a etapa em que a candidatura ESTAVA no instante
-- do envio (a última transição registrada até ali). O e-mail recusado pela guarda do 49-03
-- não deixa linha nenhuma no ledger — ausência É o sinal (a guarda vem ANTES do claim de
-- idempotência, de propósito).
avanco_pos_t0 AS (
  SELECT n.id, cd.opcao_knockout_id, h.etapa_para AS etapa_no_envio
    FROM public.notificacoes_enviadas n
    JOIN public.candidaturas cd ON cd.id = n.candidatura_id
   CROSS JOIN t
    LEFT JOIN LATERAL (
      SELECT hh.etapa_para
        FROM public.historico_candidatura hh
       WHERE hh.candidatura_id = n.candidatura_id
         AND hh.criado_em <= n.criado_em
       ORDER BY hh.criado_em DESC, hh.id DESC
       LIMIT 1
    ) h ON true
   WHERE n.evento = 'avanco' AND n.criado_em > t.t0
),
-- Comparativos (de qualquer conta) depois de T0, com o instante de cada um, para checar
-- se algum incluiu candidatura que JÁ ESTAVA encerrada naquele instante.
comp_todos AS (
  SELECT cs.id, cs.created_at, cs.candidatura_ids
    FROM public.comparativo_solicitado cs, t
   WHERE cs.created_at > t.t0
),
-- ── JORN-12: pares de análise de sucesso da MESMA candidatura e do mesmo tipo ─
aba AS (
  SELECT a.candidatura_id, a.tipo,
         count(*) AS n,
         max(a.created_at) AS mais_recente
    FROM ea_ok a
   GROUP BY 1, 2
  HAVING count(*) >= 2
)
SELECT
  -- ═══ JORN-28 / D-28 — proveniência real nas 5 tabelas de resultado ══════════
  -- Em CADA uma das 5 tabelas há ≥1 linha de teste depois de T0, e TODAS elas trazem
  -- `modelo_ia` e `provedor_ia`. `EXISTS` + `bool_and` juntos: conjunto vazio ⇒ `false`.
  (EXISTS (SELECT 1 FROM r_acv) AND coalesce((SELECT bool_and(modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM r_acv), false))
  AND (EXISTS (SELECT 1 FROM r_red) AND coalesce((SELECT bool_and(modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM r_red), false))
  AND (EXISTS (SELECT 1 FROM r_gui) AND coalesce((SELECT bool_and(modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM r_gui), false))
  AND (EXISTS (SELECT 1 FROM ea_ok) AND coalesce((SELECT bool_and(modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM ea_ok), false))
  AND (EXISTS (SELECT 1 FROM comp) AND coalesce((SELECT bool_and(modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM comp), false))
    AS p28_resultados_com_modelo,

  -- O modelo gravado é o modelo REAL, não o alias configurado: `entrevista_analises.modelo_ia`
  -- bate com o `model_snapshot` da linha de log VINCULADA (`ai_call_log_id`, D-38).
  (EXISTS (SELECT 1 FROM ea_ok WHERE ai_call_log_id IS NOT NULL)
   AND coalesce((SELECT bool_and(a.modelo_ia = l.model_snapshot)
                   FROM ea_ok a JOIN public.ai_call_logs l ON l.id = a.ai_call_log_id), false))
    AS p28_modelo_real_bate_log,

  -- D-29 · o teto por chamada do comparativo é o valor DECIDIDO **e** o `model_id` ativo
  -- NÃO é o identificador do fallback forçado. ⚠ Esta consulta não lê o baseline do `.md`:
  -- a igualdade `model_id` antes/depois da janela é conferida na Task 3, com o valor
  -- registrado lá. O que se afirma aqui é que o comparativo não FICOU no modelo inexistente.
  coalesce((SELECT max_tokens = 3600
                   AND model_id IS DISTINCT FROM 'claude-inexistente-p49-fallback-forcado'
              FROM public.prompt_versions
             WHERE call_type = 'comparative_ranking' AND is_active), false)
    AS p28_teto_comparativo_3600,

  -- D-59 · o comparativo de 4 saiu do primário, com sucesso, dentro do teto de saída e
  -- dentro do teto de latência
  EXISTS (SELECT 1 FROM comp4
           WHERE provedor_ia = 'anthropic'
             AND output_token_count IS NOT NULL
             AND output_token_count <= 3600
             AND latencia_ms IS NOT NULL
             AND latencia_ms <= 90000)
    AS p28_comparativo_4_anthropic,

  -- D-59 · a folga medida: TODA saída de 4 candidatos ficou em ≤ 3140 tokens.
  -- ⚠ `false` aqui NÃO é erro a contornar: é o ponto de decisão do D-59 — o teto volta ao
  -- operador ANTES de a fase fechar.
  (EXISTS (SELECT 1 FROM comp4 WHERE provedor_ia = 'anthropic' AND output_token_count IS NOT NULL)
   AND coalesce((SELECT bool_and(output_token_count <= 3140)
                   FROM comp4 WHERE provedor_ia = 'anthropic' AND output_token_count IS NOT NULL), false))
    AS p28_saida_4_ate_3140,

  -- D-27 · um fallback deixa DUAS linhas: a tentativa Anthropic COBRADA (chave nula,
  -- porque um bloqueio/tentativa é EVENTO de auditoria) e a linha do resultado com
  -- `fallback_<causa>`. Existe ≥1 resultado de fallback depois de T0, e TODO ele tem a
  -- tentativa irmã do mesmo `call_type` minutos antes.
  (EXISTS (SELECT 1 FROM fb)
   AND coalesce((SELECT bool_and(EXISTS (
          SELECT 1 FROM public.ai_call_logs a
           WHERE a.call_type = f.call_type
             AND a.provider = 'anthropic'
             AND a.success = false
             AND a.idempotency_key IS NULL
             AND a.created_at <= f.created_at
             AND a.created_at >= f.created_at - interval '10 minutes'))
          FROM fb f), false))
    AS p28_fallback_duas_linhas,

  -- D-27 · e o RESULTADO gravado diz de quem ele é: `provedor_ia='openai'` com o modelo real
  EXISTS (SELECT 1 FROM comp
           WHERE provedor_ia = 'openai'
             AND modelo_ia IS NOT NULL
             AND modelo_ia <> '')
    AS p28_comparativo_fallback_com_provedor,

  -- ═══ JORN-39 — o bloqueio pré-provedor deixa registro, e não quebra a agregação ═
  -- Duas afirmações INDEPENDENTES (não um join): (i) a linha `none` entrou em
  -- `ai_call_logs` — antes, o INSERT morria em 22P02 e o erro era engolido; (ii) a
  -- análise de teste correspondente existe como `falhou` e NÃO é vigente.
  -- ⚠ Independentes de propósito: no caminho `none` o `ai-client` devolve `log_id: null`,
  --   então a análise NÃO aponta para o log. Um join aqui reprovaria o desenho.
  (EXISTS (SELECT 1 FROM public.ai_call_logs l, t
            WHERE l.created_at > t.t0
              AND l.provider = 'none'
              AND l.error_code IN ('prompt_injection_detected', 'cost_cap_exceeded'))
   AND EXISTS (SELECT 1 FROM ea
                WHERE status_analise = 'falhou'
                  AND NOT public.entrevista_analise_vigente(superada_em, status_analise, competencias)))
    AS p39_linha_none,

  -- A agregação de custo aceita o provedor novo — provado ESTRUTURALMENTE, sem esperar a
  -- próxima janela do cron (`30 1 * * *`): a coluna de destino é o MESMO enum que ganhou
  -- `none`, logo o `INSERT ... GROUP BY provider` do job não pode falhar por causa dele.
  -- E, como negativa, nenhuma execução depois de T0 deixou de suceder.
  ((SELECT udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ai_cost_daily' AND column_name = 'provider') = 'llm_provider'
   AND EXISTS (SELECT 1 FROM pg_catalog.pg_enum e JOIN pg_catalog.pg_type ty ON ty.oid = e.enumtypid
                WHERE ty.typname = 'llm_provider' AND e.enumlabel = 'none')
   AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-cost-aggregation' AND active)
   AND NOT EXISTS (SELECT 1 FROM cron.job_run_details d
                     JOIN cron.job j ON j.jobid = d.jobid, t
                    WHERE j.jobname = 'ai-cost-aggregation'
                      AND d.start_time > t.t0
                      AND d.status IS DISTINCT FROM 'succeeded'))
    AS p39_agregacao_sem_falha,

  -- ═══ JORN-07 — a redação nova nasce com a rubrica REAL e as 4 dimensões ═══════
  -- Toda redação de teste avaliada depois de T0 tem `rubrica_versao='bars-prd-1.1'` e o
  -- conjunto de `dimension` em `analise_ia -> dimension_scores` é EXATAMENTE {D1..D4}
  -- (comparação de conjunto, não de contagem: repetir D1 quatro vezes reprova).
  (EXISTS (SELECT 1 FROM r_red)
   AND coalesce((SELECT bool_and(
          r.rubrica_versao = 'bars-prd-1.1'
          AND (SELECT array_agg(DISTINCT ds ->> 'dimension' ORDER BY ds ->> 'dimension')
                 FROM jsonb_array_elements(r.analise_ia -> 'dimension_scores') ds)
              = ARRAY['D1', 'D2', 'D3', 'D4'])
          FROM r_red r), false))
    AS p07_redacao_nova_com_rubrica,

  -- ═══ JORN-25 / 33 / 34 — a candidatura encerrada não anda, não é avisada, não entra ═
  -- Nenhuma candidatura de knockout de teste mudou de etapa depois de T0. Não é vácuo:
  -- o `EXISTS (ko)` afirma que existem candidaturas de knockout sob vigilância.
  (EXISTS (SELECT 1 FROM ko)
   AND NOT EXISTS (SELECT 1 FROM public.historico_candidatura h, t
                    WHERE h.candidatura_id IN (SELECT id FROM ko)
                      AND h.criado_em > t.t0))
    AS p25_knockout_nao_avanca,

  -- Nenhum e-mail de `avanco` depois de T0 foi para candidatura que JÁ ESTAVA encerrada:
  -- nem knockout, nem etapa terminal na última transição anterior ao envio (global).
  -- ⚠ Cobre a metade ETAPA do predicado e o knockout (que é a forma observável da metade
  --   STATUS em PROD). A metade `status='finalizado'` sem etapa terminal não é
  --   reconstruível do ledger — ela está coberta pelo teste Deno do 49-03.
  NOT EXISTS (SELECT 1 FROM avanco_pos_t0 a
               WHERE a.opcao_knockout_id IS NOT NULL
                  OR a.etapa_no_envio IN ('aprovado', 'rejeitado'))
    AS p25_sem_avanco_para_encerrada,

  -- D-34 · nenhum comparativo depois de T0 incluiu candidatura que já estava encerrada
  -- NAQUELE instante (knockout, ou etapa terminal na última transição anterior)
  NOT EXISTS (
    SELECT 1
      FROM comp_todos cs
      CROSS JOIN LATERAL unnest(cs.candidatura_ids) AS u(cid)
      JOIN public.candidaturas cd ON cd.id = u.cid
      LEFT JOIN LATERAL (
        SELECT hh.etapa_para
          FROM public.historico_candidatura hh
         WHERE hh.candidatura_id = cd.id
           AND hh.criado_em <= cs.created_at
         ORDER BY hh.criado_em DESC, hh.id DESC
         LIMIT 1
      ) h ON true
     WHERE cd.opcao_knockout_id IS NOT NULL
        OR h.etapa_para IN ('aprovado', 'rejeitado'))
    AS p25_comparativo_sem_encerrada,

  -- ═══ JORN-12 — uma vigente por tipo, a falha nunca vigente, a análise com dono ═
  -- GLOBAL e por construção: nenhum grupo `(candidatura, tipo)` com duas vigentes.
  -- Não é vácuo — há linhas em `entrevista_analises` (o `EXISTS` afirma isso).
  (EXISTS (SELECT 1 FROM public.entrevista_analises)
   AND NOT EXISTS (
     SELECT 1 FROM public.entrevista_analises a
      WHERE public.entrevista_analise_vigente(a.superada_em, a.status_analise, a.competencias)
      GROUP BY a.candidatura_id, coalesce(a.tipo, '(sem tipo)')
     HAVING count(*) > 1))
    AS p12_uma_vigente_por_tipo,

  -- D-40 · o MESMO texto não cria linha nova: nenhuma análise de sucesso NASCIDA DEPOIS
  -- DE T0 repete o `(candidatura, tipo, texto_hash)` de outra análise de sucesso —
  -- qualquer uma, anterior ou posterior. É a afirmação do conserto: o reaproveitamento é
  -- conferido ANTES da IA, então o pedido repetido devolve a linha existente.
  --
  -- ⚠ Esta prova JÁ FOI GLOBAL, e a global saía `false` no baseline desta sessão com o
  --   conserto inteiro no ar. A causa, medida em 2026-09-26: a candidatura
  --   `bf26ee3c-…` tem TRÊS análises de 2026-09-20 — anteriores ao 49-10 — com o mesmo
  --   `texto_hash` (que a D-43 preencheu retroativamente) e `tipo` NULL (genuinamente
  --   irrecuperável, sob a D-30). A versão global media o ESTADO LEGADO e reprovava para
  --   sempre, com o diagnóstico falso «o reaproveitamento não funciona» — a classe exata do
  --   CLAUDE.md §«Portões: varra pela FORMA»: contagem contra uma fotografia que envelheceu.
  --   A versão de agora é MAIS forte que um simples recorte por data: ela exige que nenhuma
  --   linha nova duplique NADA, inclusive as legadas.
  (EXISTS (SELECT 1 FROM ea_ok WHERE texto_hash IS NOT NULL)
   AND NOT EXISTS (
     SELECT 1 FROM ea_ok n
      WHERE n.texto_hash IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.entrevista_analises o
                     WHERE o.id <> n.id
                       AND o.status_analise IS DISTINCT FROM 'falhou'
                       AND o.candidatura_id = n.candidatura_id
                       AND o.tipo IS NOT DISTINCT FROM n.tipo
                       AND o.texto_hash = n.texto_hash)))
    AS p12_sem_hash_duplicado,

  -- A/B/A · há candidatura de teste com ≥2 análises de sucesso depois de T0 no MESMO tipo
  -- (A e B — o terceiro texto, igual ao A, não cria linha) e a VIGENTE é a mais recente delas
  EXISTS (SELECT 1 FROM aba
           WHERE EXISTS (SELECT 1 FROM ea_ok v
                          WHERE v.candidatura_id = aba.candidatura_id
                            AND v.tipo IS NOT DISTINCT FROM aba.tipo
                            AND v.created_at = aba.mais_recente
                            AND public.entrevista_analise_vigente(v.superada_em, v.status_analise, v.competencias))
             AND NOT EXISTS (SELECT 1 FROM ea_ok o
                              WHERE o.candidatura_id = aba.candidatura_id
                                AND o.tipo IS NOT DISTINCT FROM aba.tipo
                                AND o.created_at < aba.mais_recente
                                AND public.entrevista_analise_vigente(o.superada_em, o.status_analise, o.competencias)))
    AS p12_aba_a_b_a,

  -- D-42 · uma análise que falhou NUNCA é a vigente (global, sobre conjunto não-vazio)
  (EXISTS (SELECT 1 FROM public.entrevista_analises)
   AND NOT EXISTS (SELECT 1 FROM public.entrevista_analises a
                    WHERE a.status_analise = 'falhou'
                      AND public.entrevista_analise_vigente(a.superada_em, a.status_analise, a.competencias)))
    AS p12_falha_nunca_vigente,

  -- D-38 · toda análise NOVA tem dono: tipo, quem pediu e o hash do texto. E toda análise
  -- nova que É resultado tem também o vínculo com o log e a proveniência.
  -- ⚠ As `falhou` do caminho `none` ficam FORA das três últimas exigências, de propósito:
  --   nenhum modelo respondeu, então `modelo_ia`/`provedor_ia`/`ai_call_log_id` nulos são a
  --   VERDADE (`ai-client.ts` devolve `model: null`, `log_id: null`) — exigi-los aqui seria
  --   exigir proveniência inventada, que é o que a D-30 proíbe.
  (EXISTS (SELECT 1 FROM ea)
   AND coalesce((SELECT bool_and(tipo IS NOT NULL AND solicitado_por IS NOT NULL AND texto_hash IS NOT NULL) FROM ea), false)
   AND coalesce((SELECT bool_and(ai_call_log_id IS NOT NULL AND modelo_ia IS NOT NULL AND provedor_ia IS NOT NULL) FROM ea_ok), false))
    AS p12_analise_com_dono,

  -- ═══ JORN-17 / D-46 — a justificativa não gruda de uma transição para a outra ═
  -- Global: era 9, a D-46 levou a 0, e `registrar_decisao` grava a constante sem PII que
  -- o `avancar_etapa` limpa depois de escrever o histórico. Zero é o único valor certo.
  NOT EXISTS (SELECT 1 FROM public.candidaturas WHERE etapa_justificativa IS NOT NULL)
    AS p17_sem_justificativa_grudada,

  -- ═══ JORN-3b — abrir a explicação N vezes não versiona a decisão ═════════════
  -- Nenhuma versão arquivada depois de T0 é IGUAL ao estado corrente da decisão.
  -- ⚠ Comparação por `to_jsonb` da LINHA INTEIRA, com o mapeamento do trigger
  --   (`em → decidido_em`; `id`/`arquivado_em` são do arquivo) e menos as duas colunas
  --   que o `WHEN` do `trg_decisao_final_snapshot` ignora. Coluna nova entra na comparação
  --   por construção — zero lista literal que envelhece (CLAUDE.md §«varra pela FORMA»).
  NOT EXISTS (
    SELECT 1
      FROM public.decisao_final_historico a
      JOIN public.decisao_final d ON d.candidatura_id = a.candidatura_id, t
     WHERE a.arquivado_em > t.t0
       AND (to_jsonb(a.*) - 'id' - 'arquivado_em' - 'decidido_em'
            - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em')
         = (to_jsonb(d.*) - 'id' - 'em'
            - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em'))
    AS p3b_leitura_sem_snapshot,

  -- ═══ JORN-37 / BD-9 — a trilha não carrega o texto da decisão final ═════════
  -- Escopada a `criado_em > T0`: a D-47 foi RECUSADA (49-12) e as 5 linhas ANTERIORES
  -- ficam, por decisão do operador. O que esta prova afirma é que NENHUMA cópia NOVA
  -- nasceu depois de T0 — que é exatamente o que o conserto de código do 49-06 garante.
  NOT EXISTS (
    SELECT 1 FROM public.historico_candidatura h, t
     WHERE h.criado_em > t.t0
       AND h.criterio_texto IS NOT NULL
       AND (EXISTS (SELECT 1 FROM public.decisao_final d
                     WHERE d.candidatura_id = h.candidatura_id
                       AND d.justificativa = h.criterio_texto)
         OR EXISTS (SELECT 1 FROM public.decisao_final_historico q
                     WHERE q.candidatura_id = h.candidatura_id
                       AND q.justificativa = h.criterio_texto)))
    AS p37_trilha_sem_texto_da_decisao;
