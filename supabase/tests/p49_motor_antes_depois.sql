-- =============================================================================
-- p49_motor_antes_depois.sql — o ANTES e o DEPOIS do motor de exclusão (plano 49-19)
-- =============================================================================
-- SÓ LEITURA por construção: um único SELECT. O arquivo NÃO começa com
-- `SET TRANSACTION` porque quem o roda PREFIXA a trava e os dois `set_config`
-- (o SET TRANSACTION tem de ser a primeira instrução da transação):
--
--   SET TRANSACTION READ ONLY;
--   SELECT set_config('p49.titular', '<candidato_id>', false);
--   SELECT set_config('p49.antes',   '{}', false);        -- no ANTES
--   SELECT set_config('p49.antes',   '<json do ANTES>', false);  -- no DEPOIS
--
-- Devolve UMA linha. As colunas `p36_*` são o veredito do DEPOIS, comparando o
-- estado de agora com o JSON do ANTES. Na execução do ANTES elas saem `false`
-- por construção (o `antes` é `{}`) — e isso é esperado, não falha.
--
-- ⚠ POR QUE OS IDS VIAJAM NO JSON DO ANTES
-- Duas provas não podem ser feitas depois do fato sem a lista capturada antes:
--   · `ai_call_logs` — depois da redação, `candidato_id` fica NULL, então não há
--     como reencontrar as linhas que ERAM da conta senão pelos ids do ANTES;
--   · `comparative_ranking` — o vínculo é o texto do prompt citando `id=<uuid>`
--     da candidatura, e o texto vira sentinela. Mesma coisa.
-- Medir «0 linhas com o candidato_id» sozinho seria uma prova vazia: ela passa
-- também se as linhas nunca tiverem existido.
--
-- A sentinela é a MESMA string que `anonimizar_candidato` grava, lida da função
-- viva em 2026-09-27: '[removido a pedido do titular — LGPD Art. 18]'.
-- =============================================================================

WITH
  t AS (SELECT current_setting('p49.titular')::uuid AS titular),
  a AS (SELECT current_setting('p49.antes')::jsonb AS antes),
  sent AS (SELECT '[removido a pedido do titular — LGPD Art. 18]'::text AS s),

  -- As candidaturas do titular. Tudo abaixo é escopado por aqui ou pelo candidato_id.
  cds AS (SELECT cd.id FROM public.candidaturas cd CROSS JOIN t WHERE cd.candidato_id = t.titular),

  -- ── 1. As quatro tabelas do passo novo (D-62): da conta e do resto do mundo ──
  pn AS (
    SELECT
      (SELECT count(*) FROM public.respostas_bigfive    x WHERE     EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS bigfive_conta,
      (SELECT count(*) FROM public.respostas_bigfive    x WHERE NOT EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS bigfive_fora,
      (SELECT count(*) FROM public.respostas_disc       x WHERE     EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS disc_conta,
      (SELECT count(*) FROM public.respostas_disc       x WHERE NOT EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS disc_fora,
      (SELECT count(*) FROM public.respostas_formulario x WHERE     EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS form_conta,
      (SELECT count(*) FROM public.respostas_formulario x WHERE NOT EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS form_fora,
      (SELECT count(*) FROM public.respostas_raven      x WHERE     EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS raven_conta,
      (SELECT count(*) FROM public.respostas_raven      x WHERE NOT EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS raven_fora
  ),

  -- ── 2. Colunas de texto/jsonb que o recibo promete — em sentinela ou não ────
  txt AS (
    SELECT
      (SELECT count(*) FROM public.redacoes_candidato r WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = r.candidatura_id)
                                                          AND r.texto = (SELECT s FROM sent)) AS redacao_sent,
      (SELECT count(*) FROM public.redacoes_candidato r WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = r.candidatura_id)
                                                          AND r.texto IS DISTINCT FROM (SELECT s FROM sent)) AS redacao_aberta,
      (SELECT count(*) FROM public.respostas_cultura x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                        AND x.resposta_texto = (SELECT s FROM sent)) AS cultura_sent,
      (SELECT count(*) FROM public.respostas_cultura x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                        AND x.resposta_texto IS DISTINCT FROM (SELECT s FROM sent)) AS cultura_aberta,
      -- ⚠ VARRER PELA FORMA, NÃO PELA STRING. A primeira versão desta consulta comparava
      -- com UMA sentinela literal e reprovou trabalho CORRETO: o motor marca redação com
      -- marcadores diferentes por coluna — texto com '[... removido ... a pedido ...]',
      -- jsonb com {"redigido":"anonimizacao_p45"} / '..._p49' / '..._p49_comparativo'.
      -- O predicado abaixo reconhece a FORMA (chave `redigido`, ou a frase de remoção),
      -- e por isso não envelhece quando nascer um marcador novo.
      (SELECT count(*) FROM public.respostas_avaliacao x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                          AND (x.respostas::text LIKE '%"redigido"%'
                                                            OR x.respostas::text LIKE '%removid%a pedido%')) AS aval_sent,
      (SELECT count(*) FROM public.respostas_avaliacao x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                          AND NOT (x.respostas::text LIKE '%"redigido"%'
                                                                OR x.respostas::text LIKE '%removid%a pedido%')) AS aval_aberta,
      (SELECT count(*) FROM public.cognitivo_respostas x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                          AND x.raw_responses::text LIKE '%'||(SELECT s FROM sent)||'%') AS cognitivo_sent,
      (SELECT count(*) FROM public.cognitivo_respostas x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                          AND x.raw_responses::text NOT LIKE '%'||(SELECT s FROM sent)||'%') AS cognitivo_aberta,
      (SELECT count(*) FROM public.entrevista_analises x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                          AND x.citacoes IS NOT NULL) AS analises_com_citacao,
      (SELECT count(*) FROM public.scores_candidato x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)
                                                       AND x.citacoes IS NOT NULL) AS scores_com_citacao
  ),

  -- ── 3. Citação literal embutida em jsonb (o `cited_evidence` do D-48) ───────
  cit AS (
    SELECT
      (SELECT count(*) FROM public.redacoes_candidato r WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = r.candidatura_id)
                                                          AND r.analise_ia::text LIKE '%cited_evidence%') AS redacao_cited,
      (SELECT count(*) FROM public.scores_candidato s WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = s.candidatura_id)
                                                        AND s.tipo::text = 'sjt'
                                                        AND s.metadata::text LIKE '%cited_evidence%') AS sjt_cited
  ),

  -- ── 4. `ai_call_logs`: os que AINDA apontam para a conta, e a lista do ANTES ─
  logs AS (
    SELECT
      (SELECT count(*) FROM public.ai_call_logs l CROSS JOIN t WHERE l.candidato_id = t.titular) AS com_dono,
      (SELECT coalesce(jsonb_agg(l.id ORDER BY l.created_at), '[]'::jsonb)
         FROM public.ai_call_logs l CROSS JOIN t WHERE l.candidato_id = t.titular) AS ids_agora,
      -- Mesma lição: o log tem sentinela PRÓPRIA (258 caracteres, texto explicando o que
      -- saiu), não a genérica. Exigir igualdade com a genérica reprovava redação correta.
      -- A prova é conjunta: prompt redigido E resposta crua redigida E dono desligado.
      (SELECT count(*) FROM public.ai_call_logs l
        WHERE l.id::text IN (SELECT jsonb_array_elements_text(coalesce((SELECT antes FROM a) -> 'logs_ids', '[]'::jsonb)))
          AND l.candidato_id IS NULL
          AND coalesce(l.user_prompt_template, '') LIKE '%removid%a pedido%'
          AND coalesce(l.raw_response::text, '') LIKE '%"redigido"%') AS antigos_em_sentinela,
      (SELECT jsonb_array_length(coalesce((SELECT antes FROM a) -> 'logs_ids', '[]'::jsonb))) AS antigos_total
  ),

  -- ── 5. `comparative_ranking` que citavam candidatura da conta (D-63) ────────
  comp AS (
    SELECT
      (SELECT coalesce(jsonb_agg(l.id), '[]'::jsonb)
         FROM public.ai_call_logs l
        WHERE l.call_type::text = 'comparative_ranking'
          AND EXISTS (SELECT 1 FROM cds c WHERE l.user_prompt_template LIKE '%'||c.id::text||'%')) AS ids_agora,
      (SELECT count(*) FROM public.ai_call_logs l
        WHERE l.id::text IN (SELECT jsonb_array_elements_text(coalesce((SELECT antes FROM a) -> 'comparativos_ids', '[]'::jsonb)))
          AND l.user_prompt_template = (SELECT s FROM sent)) AS antigos_em_sentinela,
      (SELECT jsonb_array_length(coalesce((SELECT antes FROM a) -> 'comparativos_ids', '[]'::jsonb))) AS antigos_total
  ),

  -- ── 6. `revisao_resultado` (D-60), na corrente e no arquivo ─────────────────
  rev AS (
    SELECT
      (SELECT count(*) FROM public.decisao_final d WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = d.candidatura_id)
                                                     AND d.revisao_resultado IS NOT NULL
                                                     AND d.revisao_resultado IS DISTINCT FROM (SELECT s FROM sent)) AS corrente_aberta,
      (SELECT count(*) FROM public.decisao_final_historico h WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = h.candidatura_id)
                                                              AND h.revisao_resultado IS NOT NULL
                                                              AND h.revisao_resultado IS DISTINCT FROM (SELECT s FROM sent)) AS arquivo_aberto
  ),

  -- ── 7. O que TEM de sobreviver: os scores (o resultado, nunca a resposta) ───
  pres AS (
    SELECT
      (SELECT count(*) FROM public.scores_raven x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS scores_raven,
      (SELECT count(*) FROM public.scores_candidato x WHERE EXISTS (SELECT 1 FROM cds c WHERE c.id = x.candidatura_id)) AS scores_cand
  )

SELECT
  (SELECT titular FROM t)                                    AS titular,
  (SELECT count(*) FROM cds)                                 AS candidaturas_da_conta,

  pn.bigfive_conta, pn.bigfive_fora, pn.disc_conta, pn.disc_fora,
  pn.form_conta,    pn.form_fora,    pn.raven_conta, pn.raven_fora,

  txt.redacao_sent, txt.redacao_aberta, txt.cultura_sent, txt.cultura_aberta,
  txt.aval_sent,    txt.aval_aberta,    txt.cognitivo_sent, txt.cognitivo_aberta,
  txt.analises_com_citacao, txt.scores_com_citacao,

  cit.redacao_cited, cit.sjt_cited,

  logs.com_dono AS logs_com_dono, logs.ids_agora AS logs_ids,
  logs.antigos_em_sentinela AS logs_antigos_sent, logs.antigos_total AS logs_antigos_total,

  comp.ids_agora AS comparativos_ids,
  comp.antigos_em_sentinela AS comparativos_antigos_sent, comp.antigos_total AS comparativos_antigos_total,

  rev.corrente_aberta, rev.arquivo_aberto,
  pres.scores_raven, pres.scores_cand,

  -- ═══ O VEREDITO ═══════════════════════════════════════════════════════════
  -- Cada uma é `true` só quando a propriedade vale E a população não é vazia por
  -- acidente: as que comparam com o ANTES exigem que o ANTES tivesse o que apagar.

  (pn.bigfive_conta = 0 AND pn.disc_conta = 0 AND pn.form_conta = 0 AND pn.raven_conta = 0
   AND coalesce(((SELECT antes FROM a) ->> 'form_conta')::int, 0)
     + coalesce(((SELECT antes FROM a) ->> 'raven_conta')::int, 0) > 0)              AS p36_respostas_apagadas,

  (txt.redacao_aberta = 0 AND txt.cultura_aberta = 0 AND txt.aval_aberta = 0 AND txt.cognitivo_aberta = 0
   AND coalesce(((SELECT antes FROM a) ->> 'redacao_aberta')::int, 0) > 0)           AS p36_textos_em_sentinela,

  (cit.redacao_cited = 0 AND cit.sjt_cited = 0
   AND txt.analises_com_citacao = 0 AND txt.scores_com_citacao = 0)                  AS p36_sem_citacao_literal,

  (logs.com_dono = 0 AND logs.antigos_total > 0
   AND logs.antigos_em_sentinela = logs.antigos_total)                               AS p36_logs_redigidos,

  -- ⚠ Vazio por construção NÃO é violação — e não pode se disfarçar de aprovação.
  -- A `+claude7` nunca entrou num comparativo (medido no ANTES: lista vazia), então
  -- esta coluna sai `true` com a `pop_comparativos` ao lado declarando o vazio. Ler
  -- uma sem a outra é ler metade. Mesmo padrão dos `pop_*` do `p49_prova_prod.sql`.
  (comp.antigos_total = 0
   OR comp.antigos_em_sentinela = comp.antigos_total)                                AS p36_comparativos_redigidos,

  -- ── Discriminadores de população: qual prova acima tinha o que provar ──────
  (coalesce(((SELECT antes FROM a) ->> 'form_conta')::int, 0)
   + coalesce(((SELECT antes FROM a) ->> 'raven_conta')::int, 0) > 0)                AS pop_respostas,
  (coalesce(((SELECT antes FROM a) ->> 'redacao_aberta')::int, 0) > 0)               AS pop_redacao,
  (coalesce(((SELECT antes FROM a) ->> 'cultura_aberta')::int, 0) > 0)               AS pop_cultura,
  (coalesce(((SELECT antes FROM a) ->> 'cognitivo_aberta')::int, 0) > 0)             AS pop_cognitivo,
  (logs.antigos_total > 0)                                                           AS pop_logs,
  (comp.antigos_total > 0)                                                           AS pop_comparativos,
  (coalesce(((SELECT antes FROM a) ->> 'corrente_aberta')::int, 0)
   + coalesce(((SELECT antes FROM a) ->> 'arquivo_aberto')::int, 0) > 0)             AS pop_revisao,

  (rev.corrente_aberta = 0 AND rev.arquivo_aberto = 0)                               AS p36_revisao_redigida_ou_ausente,

  (pres.scores_raven = coalesce(((SELECT antes FROM a) ->> 'scores_raven')::int, -1)
   AND pres.scores_cand = coalesce(((SELECT antes FROM a) ->> 'scores_cand')::int, -1)) AS p36_scores_preservados,

  (pn.bigfive_fora = coalesce(((SELECT antes FROM a) ->> 'bigfive_fora')::int, -1)
   AND pn.disc_fora = coalesce(((SELECT antes FROM a) ->> 'disc_fora')::int, -1)
   AND pn.form_fora = coalesce(((SELECT antes FROM a) ->> 'form_fora')::int, -1)
   AND pn.raven_fora = coalesce(((SELECT antes FROM a) ->> 'raven_fora')::int, -1))  AS p36_outros_intactos

FROM pn, txt, cit, logs, comp, rev, pres;
