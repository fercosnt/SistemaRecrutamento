-- =============================================================================
-- 20260922000009 — candidaturas : limpa a justificativa GRUDADA na coluna
--                  (Phase 49 / 49-12 / JORN-17 / D-46)
-- =============================================================================
-- O QUE ESTAVA ERRADO. `candidaturas.etapa_justificativa` guardava o critério de
-- UMA transição e continuava lá na transição SEGUINTE, que o relia como se fosse
-- o seu. Pior: a coluna chega ao titular pela exportação de dados, então o texto
-- de uma decisão escorria para o registro de outra etapa. A torneira foi fechada
-- em 20260922000004 (49-06): `avancar_etapa` agora faz
-- `NEW.etapa_justificativa := NULL` depois de gravar a linha do histórico. Esta
-- escrita corrige só o RESÍDUO — as 9 linhas que já estavam grudadas.
--
-- ⚠ O TEXTO NÃO SE PERDE, e é isso que o md5 prova. Só entra no UPDATE a linha
-- cujo `etapa_justificativa` bate BYTE A BYTE (md5) com o `criterio_texto` da
-- linha MAIS RECENTE do `historico_candidatura` da mesma candidatura. A trilha é
-- a fonte; a coluna era uma cópia que sobrou. Uma linha que não batesse ficaria
-- de fora — e o portão abaixo aborta a transação inteira nesse caso, em vez de
-- limpar «o que der».
--
-- DECISÃO DO OPERADOR (D-46 / D-54): `checkpoint:human-verify`
-- `gate="blocking-human"` do 49-12, respondido em 2026-09-23 depois de ler o
-- relatório do ensaio inteiro — os conjuntos linha a linha, a análise de
-- reversibilidade e o aviso de irreversibilidade. Resposta: **aprovada**,
-- incluindo as 2 linhas do titular já anonimizado e a 1 conta real.
--
-- ⚠ A ESCRITA IRMÃ DESTA FOI RECUSADA, e isso muda o que esta aqui significa.
-- A D-47 (`…000010`, que reescreveria `historico_candidatura.criterio_texto`)
-- foi **recusada pelo operador** na mesma resposta: ela editaria uma trilha de
-- auditoria sem que a trilha registrasse ter sido editada. Consequência que fica
-- ABERTA e está registrada no `49-12-SUMMARY.md`: o mesmo texto de justificativa
-- segue em 5 linhas de `historico_candidatura.criterio_texto`. Esta migration
-- fecha o caminho que chega ao titular pela EXPORTAÇÃO (a coluna
-- `etapa_justificativa`); a cópia do histórico continua lá, de propósito. O
-- número de versão `20260922000010` fica DELIBERADAMENTE VAZIO no ledger — não
-- foi reaproveitado, para a sequência não mentir sobre o que existiu.
--
-- ENSAIO (`supabase/tests/p49_retroativos_ensaio.sql`, commit 8ecf92c8), medido
-- em PROD em 2026-09-23 pela MESMA consulta desta escrita, e RE-MEDIDO idêntico
-- imediatamente antes deste apply:
--   d46=9  d46_nao_batem=0  d46_anonimizados=2
--   fila_delta=0 historico_delta=0 notif_delta=0 dfh_delta=0
--   controle_a=1 controle_b=1  ← a medida da fila MORDE (não é medida cega)
-- Pré-estado pinado: fila=0 hist=67 notif=67 dfh=11 d46=9
--
-- NENHUM E-MAIL, e o motivo é estrutural, não otimista. O trigger
-- `candidaturas_avancar_etapa_trg` é BEFORE UPDATE **OF etapa_atual**; o SET
-- abaixo não inclui `etapa_atual`, então o trigger nem é convocado e nenhuma
-- linha de histórico nasce. `trg_candidatura_encerrada_a_pedido` é OF
-- `encerrada_a_pedido_em` e `trg_candidaturas_guard_rejeicao` é OF `status` —
-- nenhum dos dois entra. Mesmo assim as quatro contagens de controle são
-- medidas antes e depois, NA MESMA TRANSAÇÃO, e qualquer delta ≠ 0 aborta.
--
-- EFEITO COLATERAL CONHECIDO E ACEITO: `update_candidaturas_updated_at` é BEFORE
-- UPDATE sem lista de colunas, então `updated_at` avança nas 9 linhas. Igual ao
-- 48-12 / `20260921000014`.
--
-- PORTÃO. Aborta a transação inteira se:
--   · o predicado não devolver EXATAMENTE os 9 ids autorizados (ampliou ou
--     encolheu ⇒ o operador aprovou outra coisa);
--   · qualquer uma das 9 deixar de bater md5 com o histórico (a prova de
--     preservação do texto caiu ⇒ não se limpa);
--   · o UPDATE não tocar exatamente 9 linhas (`ROW_COUNT`);
--   · fila do `pg_net`, `historico_candidatura`, `notificacoes_enviadas` ou
--     `decisao_final_historico` mudarem de tamanho (D-45: o arquivo de snapshots
--     não pode crescer NEM encolher).
-- O array literal é ESCOPO DELIBERADO — a autorização do operador —, não
-- fotografia de um estado que possa envelhecer (D-14 / CLAUDE.md §«Portões:
-- varra pela FORMA»). Nunca alargar.
--
-- ⚠ ORDEM DE APLICAÇÃO: esta versão (`…000009`) entra DEPOIS de `…000012` já
-- estar no ledger. Fora de ordem de versão, de propósito e sem consequência: a
-- `…000012` redefine FUNÇÕES (motor, logs, revisão) e esta escreve LINHAS de
-- `candidaturas` — objetos disjuntos, dono único, estado final independente da
-- ordem relativa.
--
-- TRANSPORTE: `node p46apply.cjs migrate <este arquivo>` (CLAUDE.md, §«Via de
-- apply ATUAL»). Sem `BEGIN;` — a Management API já roda o corpo numa transação.
-- =============================================================================

DO $$
DECLARE
  -- ESCOPO DELIBERADO: os 9 ids que o operador aprovou em 2026-09-23, sobre o
  -- conjunto do ensaio. Não é fotografia — é a autorização.
  v_autorizados uuid[] := ARRAY[
    '0b1c887b-079a-4ef1-bb50-f8b3e2f3624f',
    '2ce20fbf-df1a-4850-b7ee-1c2a0fb88a13',
    '38945a50-063b-41cf-8678-eef9360ad561',
    '6e5d8051-5133-4444-afa6-1c87f12eea0a',
    'a111296a-4a56-4eda-a6b8-3c5312048e3a',
    'a1dd4c42-bc92-4c37-a584-dc19a59a631d',
    'bf26ee3c-0ae3-4e92-a99b-6e05efc2a662',
    'c912aa17-f348-407c-8f31-b427aade75fa',
    'd31c78bb-46b4-4585-8b62-1c9e8e3c2e7a'
  ]::uuid[];

  v_conjunto uuid[];      -- todas as candidaturas com a coluna não nula, AGORA
  v_batem    uuid[];      -- as que batem md5 com o histórico, AGORA
  v_fila0 bigint; v_fila1 bigint;
  v_hist0 bigint; v_hist1 bigint;
  v_notif0 bigint; v_notif1 bigint;
  v_dfh0 bigint; v_dfh1 bigint;
  v_tocadas int;
BEGIN
  -- MESMO predicado do ensaio, copiado — não reescrito.
  WITH ult AS (
    SELECT h.candidatura_id, h.criterio_texto,
           row_number() OVER (PARTITION BY h.candidatura_id
                              ORDER BY h.criado_em DESC, h.id DESC) rn
      FROM public.historico_candidatura h
  ),
  cls AS (
    SELECT c.id,
           (u.criterio_texto IS NOT NULL
            AND md5(c.etapa_justificativa) = md5(u.criterio_texto)) AS bate
      FROM public.candidaturas c
      LEFT JOIN ult u ON u.candidatura_id = c.id AND u.rn = 1
     WHERE c.etapa_justificativa IS NOT NULL
  )
  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[]),
         coalesce(array_agg(id ORDER BY id) FILTER (WHERE bate), '{}'::uuid[])
    INTO v_conjunto, v_batem
    FROM cls;

  IF v_conjunto IS DISTINCT FROM v_autorizados THEN
    RAISE EXCEPTION 'JORN-17 (D-46): o predicado devolveu % — a autorizacao e para exatamente % — escopo divergente, nada foi escrito',
      v_conjunto, v_autorizados;
  END IF;

  IF v_batem IS DISTINCT FROM v_autorizados THEN
    RAISE EXCEPTION 'JORN-17 (D-46): % nao batem mais md5 com o historico (batem: %) — a prova de preservacao do texto caiu, nada foi escrito',
      cardinality(v_autorizados) - cardinality(v_batem), v_batem;
  END IF;

  SELECT count(*) INTO v_fila0  FROM net.http_request_queue;
  SELECT count(*) INTO v_hist0  FROM public.historico_candidatura;
  SELECT count(*) INTO v_notif0 FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_dfh0   FROM public.decisao_final_historico;

  UPDATE public.candidaturas
     SET etapa_justificativa = NULL
   WHERE id = ANY (v_autorizados)
     AND etapa_justificativa IS NOT NULL;
  GET DIAGNOSTICS v_tocadas = ROW_COUNT;

  IF v_tocadas <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'JORN-17 (D-46): o UPDATE tocou % linha(s), esperado % — nada foi escrito',
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
    RAISE EXCEPTION 'JORN-17 (D-46): efeito colateral — fila % -> %, historico % -> %, notificacoes % -> %, dfh % -> % — nada foi escrito (nenhum e-mail retroativo, D-46/JORN-12; snapshots intocados, D-45)',
      v_fila0, v_fila1, v_hist0, v_hist1, v_notif0, v_notif1, v_dfh0, v_dfh1;
  END IF;

  RAISE NOTICE 'JORN-17 (D-46): etapa_justificativa limpa em % linha(s): %', v_tocadas, v_autorizados;
END
$$;
