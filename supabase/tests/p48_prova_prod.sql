-- =============================================================================
-- p48_prova_prod.sql — a prova da Phase 48 em PROD, pela consulta (plano 48-18)
-- =============================================================================
-- SÓ LEITURA por construção: um único SELECT. Este arquivo NÃO começa com
-- `SET TRANSACTION`, porque quem o roda PREFIXA a trava e o instante T0 — e o
-- `SET TRANSACTION` tem de ser a primeira instrução da transação:
--
--   T0=$(grep -m1 "^T0: " .planning/phases/48-consertos-da-jornada-bloco-1/48-PROVA-PROD.md | cut -d' ' -f2)
--   { echo "SET TRANSACTION READ ONLY; SELECT set_config('p48.t0', '$T0', false);"
--     cat supabase/tests/p48_prova_prod.sql; } > "$D/prova.sql"
--   node p46apply.cjs run "$D/prova.sql"
--
-- Devolve UMA linha, um booleano por prova (D-19: no banco, nunca só na tela).
--   · contas de teste = `candidatos.email ILIKE '%+claude%'`;
--   · só conta o que aconteceu DEPOIS de T0 (`current_setting('p48.t0')`);
--   · conjunto vazio sai `false`, nunca NULL: toda prova positiva exige que o fato
--     exista (EXISTS / coalesce(bool_and(...), false)); as provas negativas
--     (p1_agendamento_invalido_fora, p1_fila_sem_encerrada,
--     p1_sem_encerrada_a_pedido_errada) são `true` quando nada de errado existe — e
--     por isso podem já sair `true` no baseline.
--
-- Nomes de tabela, coluna, valor de enum e formato de chave conferidos contra o
-- catálogo e contra as migrations 20260921000001..17 (ver 48-PROVA-PROD.md).
-- =============================================================================
WITH
t AS (
  SELECT current_setting('p48.t0')::timestamptz AS t0
),
teste AS (
  SELECT c.id FROM public.candidatos c WHERE c.email ILIKE '%+claude%'
),
cand AS (
  SELECT cd.* FROM public.candidaturas cd WHERE cd.candidato_id IN (SELECT id FROM teste)
),
-- ledger de e-mails das candidaturas de teste depois de T0 (candidato e RH)
notif AS (
  SELECT n.*
    FROM public.notificacoes_enviadas n, t
   WHERE n.candidatura_id IN (SELECT id FROM cand)
     AND n.criado_em > t.t0
),
-- (Parte 1) rejeição humana na triagem depois de T0: transição para `rejeitado`
-- que não é knockout, numa candidatura que NUNCA teve decisão final
rej_triagem AS (
  SELECT cd.id AS candidatura_id, h.id AS historico_id,
         cd.feedback_rejeicao, cd.data_decisao_final
    FROM cand cd
    JOIN public.historico_candidatura h ON h.candidatura_id = cd.id, t
   WHERE h.etapa_para = 'rejeitado'
     AND h.criado_em > t.t0
     AND NOT h.auto_rejeitado
     AND cd.opcao_knockout_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = cd.id)
),
-- (Parte 1) inscrições de teste eliminadas por knockout depois de T0
ko AS (
  SELECT cd.id, cd.candidato_id, cd.vaga_id
    FROM cand cd, t
   WHERE cd.created_at > t.t0
     AND cd.status = 'rejeitado'
     AND cd.opcao_knockout_id IS NOT NULL
),
-- (Parte 2) candidaturas de teste reabertas depois de T0 (veredito `revertida`)
reab AS (
  SELECT h.candidatura_id, min(h.criado_em) AS reaberta_hist_em
    FROM public.historico_candidatura h, t
   WHERE h.candidatura_id IN (SELECT id FROM cand)
     AND h.etapa_de = 'rejeitado'
     AND h.etapa_para = 'decisao_final'
     AND h.criado_em > t.t0
     AND h.criterio_texto LIKE 'Candidatura reaberta%'
   GROUP BY h.candidatura_id
),
-- (Parte 2) a decisão vigente de cada reaberta, registrada DEPOIS da reabertura e
-- com o ciclo zerado
vigente AS (
  SELECT r.candidatura_id, d.por_usuario
    FROM reab r
    JOIN public.decisao_final d ON d.candidatura_id = r.candidatura_id
   WHERE d.decisao IN ('aprovado', 'rejeitado')
     AND d.em > r.reaberta_hist_em
     AND d.revisao_veredito IS NULL
     AND d.revisao_solicitada_em IS NULL
     AND d.revisao_respondida_em IS NULL
     AND d.reaberta_em IS NULL
     AND d.prazo_nova_decisao_em IS NULL
),
-- (Parte 2) a decisão revertida, arquivada depois de T0
arquivo_revertida AS (
  SELECT a.candidatura_id, a.por_usuario
    FROM public.decisao_final_historico a, t
   WHERE a.candidatura_id IN (SELECT candidatura_id FROM reab)
     AND a.revisao_veredito = 'revertida'
     AND a.decisao = 'rejeitado'
     AND a.arquivado_em > t.t0
)
SELECT
  -- ─── Parte 1 ────────────────────────────────────────────────────────────────
  -- JORN-15 / D-09: inscrição nova de teste recebeu a confirmação
  EXISTS (SELECT 1 FROM notif n JOIN cand cd ON cd.id = n.candidatura_id, t
           WHERE n.evento = 'confirmacao'
             AND n.status IN ('enviado', 'entregue')
             AND cd.created_at > t.t0)
    AS p1_confirmacao_d09_enviada,

  -- JORN-24: houve inscrição com knockout depois de T0, e nenhuma delas gerou
  -- análise nem chamada de IA
  EXISTS (SELECT 1 FROM ko)
  AND NOT EXISTS (
    SELECT 1 FROM ko k, t
     WHERE EXISTS (SELECT 1 FROM public.analise_candidato_vaga a WHERE a.candidatura_id = k.id)
        OR EXISTS (SELECT 1 FROM public.ai_call_logs l
                    WHERE l.candidato_id = k.candidato_id
                      AND l.vaga_id = k.vaga_id
                      AND l.created_at > t.t0))
    AS p1_knockout_sem_analise,

  -- JORN-22: a rejeição na triagem tem o texto neutro exato e nenhuma data de decisão final
  coalesce((SELECT bool_and(r.feedback_rejeicao = 'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.'
                            AND r.data_decisao_final IS NULL)
              FROM rej_triagem r), false)
    AS p1_triagem_feedback_neutro,

  -- JORN-20 / JORN-18: cada rejeição na triagem gerou 1 linha `decisao` com a chave
  -- da própria transição, enviada/entregue
  coalesce((SELECT bool_and(EXISTS (
              SELECT 1 FROM notif n
               WHERE n.candidatura_id = r.candidatura_id
                 AND n.evento = 'decisao'
                 AND n.dedupe_key = r.candidatura_id::text || ':decisao:' || r.historico_id::text
                 AND n.status IN ('enviado', 'entregue')))
              FROM rej_triagem r), false)
    AS p1_triagem_decisao_avisada,

  -- D-22 / JORN-15: liberar a avaliação cognitiva avisou o candidato
  EXISTS (SELECT 1 FROM notif n
           WHERE n.evento = 'cognitivo_liberado'
             AND n.status IN ('enviado', 'entregue'))
    AS p1_cognitivo_avisado,

  -- JORN-D5: nenhum agendamento online escrito depois de T0 com link inválido (global)
  NOT EXISTS (SELECT 1 FROM public.agendamentos_entrevista a, t
               WHERE a.tipo = 'online'
                 AND greatest(a.created_at, a.updated_at) > t.t0
                 AND (a.local_ou_link IS NULL OR a.local_ou_link !~ '^https?://'))
    AS p1_agendamento_invalido_fora,

  -- JORN-06: uma submissão nova de Big Five gerou devolutiva
  EXISTS (SELECT 1 FROM public.devolutivas_candidato d, t
           WHERE d.candidato_id IN (SELECT id FROM teste)
             AND d.created_at > t.t0)
    AS p1_devolutiva_gerada,

  -- JORN-26: a fila de trabalho não tem candidatura encerrada (global)
  NOT EXISTS (SELECT 1 FROM public.v_fila_trabalho f
               WHERE public.candidatura_encerrada(f.etapa_atual, f.status))
    AS p1_fila_sem_encerrada,

  -- JORN-26 (Defeito 26): nenhuma candidatura já encerrada recebeu carimbo de
  -- «encerrada a pedido» depois de T0 (global)
  NOT EXISTS (SELECT 1 FROM public.candidaturas c, t
               WHERE c.encerrada_a_pedido_em > t.t0
                 AND public.candidatura_encerrada(c.etapa_atual, c.status))
    AS p1_sem_encerrada_a_pedido_errada,

  -- ─── Parte 2 ────────────────────────────────────────────────────────────────
  -- JORN-19 / D-01: o veredito `revertida` reabriu a candidatura, com justificativa própria
  EXISTS (SELECT 1 FROM reab)
    AS p2_reabertura_registrada,

  -- JORN-19 / JORN-18: a resposta à revisão avisou a candidata, com a chave do ciclo
  EXISTS (SELECT 1 FROM notif n JOIN reab r ON r.candidatura_id = n.candidatura_id
           WHERE n.evento = 'revisao_respondida'
             AND n.dedupe_key ~ ('^' || n.candidatura_id::text || ':revisao_respondida:[0-9]+$')
             AND n.status IN ('enviado', 'entregue'))
    AS p2_revisao_respondida_avisada,

  -- JORN-18: o pedido de revisão avisou o RH com a chave do ciclo e do destinatário
  EXISTS (SELECT 1 FROM notif n JOIN reab r ON r.candidatura_id = n.candidatura_id
           WHERE n.evento = 'revisao_solicitada'
             AND n.dedupe_key ~ ('^' || n.candidatura_id::text || ':revisao_solicitada:[0-9]+:'))
    AS p2_revisao_solicitada_com_ciclo,

  -- JORN-18: redecidir avisou de novo — >= 2 chaves `decisao` distintas, a última
  -- depois da reabertura, com a chave da transição, enviada/entregue
  EXISTS (SELECT 1 FROM reab r
           WHERE (SELECT count(DISTINCT n.dedupe_key) FROM public.notificacoes_enviadas n
                   WHERE n.candidatura_id = r.candidatura_id AND n.evento = 'decisao') >= 2
             AND EXISTS (SELECT 1 FROM public.notificacoes_enviadas n
                          WHERE n.candidatura_id = r.candidatura_id
                            AND n.evento = 'decisao'
                            AND n.criado_em > r.reaberta_hist_em
                            AND n.dedupe_key ~ ':decisao:[0-9a-f-]{36}$'
                            AND n.status IN ('enviado', 'entregue')))
    AS p2_redecisao_avisada,

  -- JORN-19: a nova decisão zerou o ciclo na linha vigente e a revertida ficou no arquivo
  EXISTS (SELECT 1 FROM vigente v
           WHERE EXISTS (SELECT 1 FROM arquivo_revertida a WHERE a.candidatura_id = v.candidatura_id))
    AS p2_ciclo_zerado_e_arquivado,

  -- D-23: quem teve a decisão revertida não é quem registrou a nova
  EXISTS (SELECT 1 FROM vigente v
           WHERE EXISTS (SELECT 1 FROM arquivo_revertida a WHERE a.candidatura_id = v.candidatura_id)
             AND NOT EXISTS (SELECT 1 FROM arquivo_revertida a
                              WHERE a.candidatura_id = v.candidatura_id
                                AND a.por_usuario = v.por_usuario))
    AS p2_d23,

  -- JORN-27: pedido e cancelamento de exclusão avisados, e o recibo pós-exclusão não saiu
  EXISTS (SELECT 1 FROM public.solicitacoes_dados s, t
           WHERE s.candidato_id IN (SELECT id FROM teste)
             AND s.tipo = 'exclusao'
             AND s.aviso_pedido_enviado_em > t.t0
             AND s.aviso_cancelamento_enviado_em > t.t0
             AND s.recibo_enviado_em IS NULL)
    AS p2_titular_avisado;
