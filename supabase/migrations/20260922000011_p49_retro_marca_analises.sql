-- =============================================================================
-- 20260922000011 — entrevista_analises : marca vigente/superada e reconstrói a
--                  proveniência das análises antigas
--                  (Phase 49 / 49-12 / JORN-12 / D-43 + alargamento de D-30)
-- =============================================================================
-- O QUE ESTAVA ERRADO. As 6 análises de entrevista que já existiam nasceram antes
-- das colunas de estado e proveniência (`20260922000002`, 49-06) e antes da RPC
-- que marca a anterior como superada (`20260922000007`/`000008`, 49-10). Todas as
-- 6 estavam VIGENTES ao mesmo tempo, e uma das candidaturas tinha QUATRO análises
-- vigentes simultâneas — a tela da revisão humana não tem como dizer qual VALE.
-- A torneira já está fechada (a RPC marca na mesma transação); esta escrita
-- corrige só o resíduo.
--
-- O QUE FAZ, em três coisas distintas:
--   (1) `superada_em` nas 3 análises não-vigentes de `bf26ee3c…`. O carimbo NÃO é
--       inventado: é o `created_at` da PRÓXIMA análise do mesmo grupo
--       `(candidatura, tipo)` — o instante em que aquela deixou de valer.
--   (2) `texto_hash` / `ai_call_log_id` nas 5 análises cuja correspondência com
--       `ai_call_logs` é UNÍVOCA, pela igualdade da projeção `{competency, score}`
--       sobre `raw_response->'competency_evaluations'` (RESEARCH §I.4).
--   (3) `provedor_ia` / `modelo_ia` nas MESMAS 5 — ALARGAMENTO DELIBERADO da D-30,
--       assumido pelo operador em 2026-09-23. A D-30 dizia «proveniência
--       desconhecida ⇒ fica NULL». O ensaio mediu que, para estas 5, ela não é
--       desconhecida: é RECONSTRUÍVEL do log vinculado em (2), e os 3 logs
--       envolvidos são todos `provider = anthropic`, `model_id = claude-sonnet-4-6`.
--       O que continua sob a D-30 e NÃO é tocado aqui: `tipo` e `solicitado_por`
--       (genuinamente irrecuperáveis — nada no banco os reconstrói).
--
-- ⚠ A 6ª ANÁLISE NÃO É TOCADA, e é por isso que ela importa. `48f0351e-f485-4916-
-- 9f62-4892a6348c27` (candidatura `a1dd4c42…`, de 2026-06-26) não tem log
-- correspondente em `ai_call_logs` e é a única do seu grupo, então não tem nem
-- vínculo a reconstruir nem sucessora que a supere. Ela fica com `texto_hash`,
-- `ai_call_log_id`, `provedor_ia` e `modelo_ia` NULL — NULL honesto, sob a D-30.
-- Preenchê-la por aproximação seria inventar proveniência, que é o dano que a
-- D-30 existe para impedir.
--
-- ⚠ TRÊS ANÁLISES APONTAM PARA O MESMO LOG (`10dc2cc2…`), e isso é um achado
-- registrado, não um defeito escondido. `5cf856a8`, `99208dea` e `fef2211f` têm
-- projeção de competências byte-idêntica, e existe EXATAMENTE UM log com essa
-- projeção. A correspondência é unívoca na direção que importa aqui (cada análise
-- casa um único log) e NÃO é injetiva na direção inversa. Não há índice único
-- sobre `texto_hash` nem sobre `ai_call_log_id`, então o banco aceita. O que isso
-- provavelmente significa é que a mesma transcrição foi reanalisada e só uma das
-- chamadas ficou logada — e é precisamente por não haver como distinguir qual que
-- o vínculo é o mesmo para as três, em vez de um palpite diferente para cada.
--
-- DECISÃO DO OPERADOR (D-43 / D-54): `checkpoint:human-verify`
-- `gate="blocking-human"` do 49-12, respondido em 2026-09-23 depois de ler o
-- relatório do ensaio. Resposta: **aprovada, COM o backfill de proveniência**,
-- sob duas condições, ambas implementadas como portão abaixo:
--   · a reconstrução é RE-MEDIDA no momento do apply, pela mesma projeção, e a
--     transação ABORTA se a correspondência deixou de ser unívoca para qualquer
--     uma das 5 — a medição de ontem não é carregada para hoje como premissa;
--   · `48f0351e` (sem log), `solicitado_por` e `tipo` ficam intocados.
--
-- ENSAIO (`supabase/tests/p49_retroativos_ensaio.sql`, commit 8ecf92c8), medido
-- em PROD em 2026-09-23 pela MESMA consulta desta escrita, e RE-MEDIDO idêntico
-- imediatamente antes deste apply:
--   d43=5 marcadas, 3 com superada_em, 5 com vinculo
--   fila_delta=0 historico_delta=0 notif_delta=0 dfh_delta=0
--   controle_a=1 controle_b=1  ← a medida da fila MORDE
-- Pré-estado pinado: fila=0 hist=67 notif=67 dfh=11 analises=6
--
-- NENHUM E-MAIL, e aqui o motivo é o mais simples possível: `entrevista_analises`
-- não tem NENHUM trigger (lido do catálogo, `pg_trigger` com `NOT tgisinternal`).
-- Mesmo assim as quatro contagens de controle são medidas antes e depois, na mesma
-- transação, e qualquer delta ≠ 0 aborta.
--
-- ⚠ A ESCRITA IRMÃ D-47 FOI RECUSADA pelo operador (ver
-- `20260922000009_p49_retro_justificativa_grudada.sql` e o `49-12-SUMMARY.md`). O
-- número de versão `20260922000010` fica DELIBERADAMENTE VAZIO no ledger — não foi
-- reaproveitado por esta migration, para a sequência de versões não mentir sobre o
-- que existiu.
--
-- PORTÃO. Aborta a transação inteira se:
--   · o conjunto de análises alvo, medido agora, não for EXATAMENTE os 5 ids
--     autorizados;
--   · o `superada_em` calculado agora divergir do autorizado em qualquer linha;
--   · a projeção de competências não casar EXATAMENTE UM log para qualquer uma
--     das 5, ou casar um log diferente do autorizado;
--   · o `provider`/`model_id` de qualquer log vinculado não for
--     `anthropic`/`claude-sonnet-4-6` (a proveniência escrita é DERIVADA do log,
--     não transcrita — e conferida contra o que o operador aprovou);
--   · o UPDATE não tocar exatamente 5 linhas (`ROW_COUNT`);
--   · fila do `pg_net`, `historico_candidatura`, `notificacoes_enviadas` ou
--     `decisao_final_historico` mudarem de tamanho (D-45);
--   · sobrar qualquer grupo `(candidatura, tipo)` com mais de uma vigente.
-- A tabela literal é ESCOPO DELIBERADO — a autorização do operador —, não
-- fotografia (D-14). Nunca alargar.
--
-- ⚠ ORDEM DE APLICAÇÃO: esta versão (`…000011`) entra DEPOIS de `…000012` já estar
-- no ledger. Fora de ordem de versão, de propósito e sem consequência: a `…000012`
-- redefine FUNÇÕES e esta escreve LINHAS de `entrevista_analises` — objetos
-- disjuntos, dono único.
--
-- TRANSPORTE: `node p46apply.cjs migrate <este arquivo>` (CLAUDE.md, §«Via de
-- apply ATUAL»). Sem `BEGIN;` — a Management API já roda o corpo numa transação.
-- =============================================================================

DO $$
DECLARE
  -- Proveniência APROVADA pelo operador. Os valores não são escritos daqui: são
  -- CONFERIDOS contra o log vinculado, e o que entra na coluna vem do log.
  c_prov  constant text := 'anthropic';
  c_model constant text := 'claude-sonnet-4-6';

  v_autorizados uuid[] := ARRAY[
    '28a03df2-b18b-4d9e-8aa9-0f1ea87c1099',
    '5cf856a8-f59e-4451-b3cc-bc5dd0166210',
    '99208dea-509c-4c90-aad3-f840e0cb2f9e',
    'd5a6f75f-4c3b-4160-b418-dda927892c46',
    'fef2211f-6abe-4d58-b1f5-7deb492800eb'
  ]::uuid[];

  v_conjunto uuid[];
  v_diverg   text;
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_dfh0 bigint; v_dfh1 bigint;
  v_tocadas int;
  v_sobra int;
  v_escritas text;
BEGIN
  -- ══ A autorização, linha a linha. `superada_em` NULL = «esta não é superada,
  -- só ganha vínculo». O `log_id` é o que o operador viu no ensaio.
  CREATE TEMP TABLE p49_12_autorizado (
    id           uuid primary key,
    superada_em  timestamptz,
    log_id       uuid not null
  ) ON COMMIT DROP;

  INSERT INTO p49_12_autorizado (id, superada_em, log_id) VALUES
    ('28a03df2-b18b-4d9e-8aa9-0f1ea87c1099', NULL,
     '9633ec2f-ef61-4110-b958-61b194cd4f08'),
    ('5cf856a8-f59e-4451-b3cc-bc5dd0166210', NULL,
     '10dc2cc2-9c0e-48f6-88fd-491a427c1605'),
    ('99208dea-509c-4c90-aad3-f840e0cb2f9e', '2026-09-20 01:42:03.893303-03',
     '10dc2cc2-9c0e-48f6-88fd-491a427c1605'),
    ('d5a6f75f-4c3b-4160-b418-dda927892c46', '2026-09-20 01:52:54.271237-03',
     '040c9060-d9cc-4854-8288-17aff9d529b5'),
    ('fef2211f-6abe-4d58-b1f5-7deb492800eb', '2026-09-20 01:53:11.729943-03',
     '10dc2cc2-9c0e-48f6-88fd-491a427c1605');

  -- ══ RE-MEDIÇÃO no momento do apply — MESMOS predicados do ensaio, copiados.
  CREATE TEMP TABLE p49_12_medido ON COMMIT DROP AS
  WITH viv AS (
    SELECT a.id,
           lead(a.created_at) OVER (
             PARTITION BY a.candidatura_id, coalesce(a.tipo, '(sem tipo)')
             ORDER BY a.created_at, a.id) AS prox
      FROM public.entrevista_analises a
     WHERE public.entrevista_analise_vigente(a.superada_em, a.status_analise, a.competencias)
  ),
  proj AS (
    SELECT l.id AS log_id, l.input_hash, l.provider::text AS prov, l.model_id::text AS modelo,
           c.id AS cand_id,
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
    SELECT a.id, count(*) AS n,
           min(p.log_id::text)   AS log_id,
           min(p.input_hash)     AS input_hash,
           min(p.prov)           AS prov,
           min(p.modelo)         AS modelo
      FROM public.entrevista_analises a
      JOIN proj p ON p.cand_id = a.candidatura_id AND p.comp_proj = a.competencias
     GROUP BY a.id
  )
  SELECT v.id,
         v.prox AS superada_em,
         vc.n,
         CASE WHEN vc.n = 1 THEN vc.log_id::uuid END AS log_id,
         CASE WHEN vc.n = 1 THEN vc.input_hash END  AS input_hash,
         CASE WHEN vc.n = 1 THEN vc.prov END        AS prov,
         CASE WHEN vc.n = 1 THEN vc.modelo END      AS modelo
    FROM viv v LEFT JOIN vinc vc ON vc.id = v.id
   WHERE v.prox IS NOT NULL OR vc.n = 1;

  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[]) INTO v_conjunto FROM p49_12_medido;

  IF v_conjunto IS DISTINCT FROM (SELECT array_agg(id ORDER BY id) FROM p49_12_autorizado) THEN
    RAISE EXCEPTION 'JORN-12 (D-43): o predicado devolveu % — a autorizacao e para exatamente % — escopo divergente, nada foi escrito',
      v_conjunto, v_autorizados;
  END IF;

  -- ══ Condição 1 do operador: a correspondência ainda é UNÍVOCA, e é a MESMA.
  SELECT string_agg(
           m.id::text || ': n=' || coalesce(m.n::text, 'sem log')
           || ' log=' || coalesce(m.log_id::text, '-') || ' (autorizado ' || a.log_id::text || ')'
           || ' sup=' || coalesce(m.superada_em::text, '-')
           || ' (autorizado ' || coalesce(a.superada_em::text, '-') || ')'
           || ' prov=' || coalesce(m.prov, '-') || '/' || coalesce(m.modelo, '-'),
           ' ;; ' ORDER BY m.id)
    INTO v_diverg
    FROM p49_12_medido m
    JOIN p49_12_autorizado a ON a.id = m.id
   WHERE m.n IS DISTINCT FROM 1
      OR m.log_id IS DISTINCT FROM a.log_id
      OR m.superada_em IS DISTINCT FROM a.superada_em
      OR m.prov IS DISTINCT FROM c_prov
      OR m.modelo IS DISTINCT FROM c_model;

  IF v_diverg IS NOT NULL THEN
    RAISE EXCEPTION 'JORN-12 (D-43): a reconstrucao deixou de ser univoca ou divergiu do autorizado — % — nada foi escrito (condicao do operador em 2026-09-23: nao carregar a medicao de ontem como premissa)',
      v_diverg;
  END IF;

  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_dfh0   FROM public.decisao_final_historico;

  -- ══ A escrita. `coalesce(a.<col>, …)` = nunca sobrescreve valor já presente.
  -- `provedor_ia`/`modelo_ia` vêm do LOG (derivados), não de uma transcrição.
  WITH u AS (
    UPDATE public.entrevista_analises a
       SET superada_em    = coalesce(a.superada_em, m.superada_em),
           texto_hash     = coalesce(a.texto_hash, m.input_hash),
           ai_call_log_id = coalesce(a.ai_call_log_id, m.log_id),
           provedor_ia    = coalesce(a.provedor_ia, m.prov),
           modelo_ia      = coalesce(a.modelo_ia, m.modelo)
      FROM p49_12_medido m
     WHERE a.id = m.id
       AND a.id = ANY (v_autorizados)
    RETURNING a.id, a.superada_em, a.texto_hash, a.ai_call_log_id, a.provedor_ia, a.modelo_ia
  )
  SELECT count(*)::int,
         string_agg(id::text || '|sup=' || coalesce(superada_em::text, '-')
                    || '|hash=' || coalesce(left(texto_hash, 8), '-')
                    || '|log=' || coalesce(left(ai_call_log_id::text, 8), '-')
                    || '|' || coalesce(provedor_ia, '-') || '/' || coalesce(modelo_ia, '-'),
                    ' ;; ' ORDER BY id)
    INTO v_tocadas, v_escritas
    FROM u;

  IF v_tocadas <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'JORN-12 (D-43): o UPDATE tocou % linha(s), esperado % — nada foi escrito',
      v_tocadas, cardinality(v_autorizados);
  END IF;

  SELECT count(*) INTO v_fila1  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist1  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif1 FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_dfh1   FROM public.decisao_final_historico;

  IF v_fila1 IS DISTINCT FROM v_fila0
     OR v_hist1 IS DISTINCT FROM v_hist0
     OR v_notif1 IS DISTINCT FROM v_notif0
     OR v_dfh1 IS DISTINCT FROM v_dfh0 THEN
    RAISE EXCEPTION 'JORN-12 (D-43): efeito colateral — fila % -> %, historico % -> %, notificacoes % -> %, dfh % -> % — nada foi escrito (nenhum e-mail retroativo; snapshots intocados, D-45)',
      v_fila0, v_fila1, v_hist0, v_hist1, v_notif0, v_notif1, v_dfh0, v_dfh1;
  END IF;

  -- ══ O que a escrita existe para conseguir: nenhum grupo com duas vigentes.
  SELECT count(*)::int INTO v_sobra
    FROM (SELECT candidatura_id, coalesce(tipo, '(sem tipo)') t
            FROM public.entrevista_analises
           WHERE public.entrevista_analise_vigente(superada_em, status_analise, competencias)
           GROUP BY 1, 2 HAVING count(*) > 1) x;

  IF v_sobra <> 0 THEN
    RAISE EXCEPTION 'JORN-12 (D-43): sobraram % grupo(s) (candidatura, tipo) com mais de uma vigente — nada foi escrito', v_sobra;
  END IF;

  RAISE NOTICE 'JORN-12 (D-43): % analise(s) marcadas: %', v_tocadas, v_escritas;
END
$$;
