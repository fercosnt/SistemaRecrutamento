-- =============================================================================
-- 20260921000004 — analise_candidato_vaga : marcar (não apagar) a análise de quem
--                  o knockout já eliminou  (Phase 48 / 48-04 / JORN-24 parte b / D-02)
-- =============================================================================
-- O QUE ESTAVA ERRADO. O trigger `trg_candidaturas_analise` (AFTER INSERT em
-- `candidaturas`) despacha `analise-candidato-individual` para TODA candidatura
-- nova. A candidatura nasce `aguardando_resposta` e o knockout é um UPDATE
-- posterior da mesma transação; o `pg_net` entrega depois do COMMIT e a EF, até
-- 2026-09-21, não olhava o estado — então quem o knockout eliminou era analisado
-- por IA 0,5 s depois: tratamento sem finalidade (LGPD art. 6º III), US$ ~0,045
-- cada, e em contradição com a explicação que diz que nenhuma análise foi usada.
--
-- A PARTE (a) — PARAR — não mora aqui: é a guarda da EF (commit 92ab740c,
-- deploy v29 em 2026-09-21), que devolve `skipped:"knockout"` antes da marca
-- `pendente` e de qualquer chamada de IA. A guarda não pode morar no trigger,
-- que nunca vê o knockout (Pitfall 2 do 48-RESEARCH).
--
-- ESTA MIGRATION É A PARTE (b) — O PASSIVO. Decisão do operador D-02: MARCAR, não
-- apagar. Apagar é irreversível, o titular já recebeu essa análise numa cópia
-- LGPD, e a marca é o que deixa auditável que houve tratamento sem finalidade e
-- que ele foi corrigido.
--
-- MEDIDO ANTES (2026-09-21, só leitura, via p46apply `sql`):
--   total de linhas em analise_candidato_vaga ........................ 20
--   conjunto do predicado D-02 (abaixo) ................................ 3
--     candidatura 92522073-484c-46a3-9e9d-8e80afa3c062  análise +0,54 s após o knockout
--     candidatura 0f7b217c-dcb0-44cd-939b-72b7f2c36856  análise +0,52 s
--     candidatura 25a4231c-612b-4f86-9c5a-904ca09f18f4  análise +0,56 s
--   todas `status='sucesso'`, todas de contas de teste `+claude` do operador;
--   total de candidaturas com knockout automático: 3 (nenhuma sem análise).
--
-- PREDICADO D-02 (48-RESEARCH §F): candidatura com
--   motivo_rejeicao = 'knockout_automatico' AND opcao_knockout_id IS NOT NULL,
--   com linha em analise_candidato_vaga criada em ou depois do `criado_em` da
--   linha de historico_candidatura com auto_rejeitado = true.
--   Só essas. NÃO as de quem pediu exclusão, NÃO as de não-contratados (D-02).
--
-- POR QUE COLUNA NOVA E NÃO UM VALOR NOVO EM `status`. `status` é lido por
-- `v_triagem_panel.analise_status`, por `v_analises_presas`, pela fila e pelo hub;
-- mudar o vocabulário dele arrastaria todos os leitores. A marca é ortogonal ao
-- estado da análise: uma análise `sucesso` continua tendo sido feita — o que muda
-- é que a finalidade dela foi descartada.
--
-- ESCRITA RETROATIVA — AUTORIZADA pelo operador (D-02, D-18) para EXATAMENTE este
-- escopo medido. O bloco DO no fim aborta a transação INTEIRA (DDL inclusive) se:
--   · o predicado não devolver exatamente 3 candidaturas;
--   · alguma delas não estiver na lista dos 3 ids autorizados;
--   · o UPDATE não tocar exatamente 3 linhas;
--   · a contagem total da tabela mudar (nenhuma linha é apagada — nunca).
-- A lista literal de ids e a contagem 3 são ESCOPO DELIBERADO (a autorização do
-- operador), não fotografia: esta migration roda uma vez, e um conjunto diferente
-- do autorizado é exatamente o caso em que ela TEM de recusar.
--
-- IDEMPOTÊNCIA: nenhuma, de propósito. `ADD COLUMN` sem `IF NOT EXISTS` (idioma de
-- 20260805000001 §3: `IF NOT EXISTS` transforma «já existe com outra forma» em
-- no-op silencioso). Um segundo apply falha alto na primeira linha.
--
-- CÓPIA LGPD: o veredito de export das duas colunas novas (entram na cópia do
-- titular? — premissa A6 do 48-RESEARCH) é do plano 48-17. Até lá,
-- `docs/compliance/sql/05-export-allowlist-drift.sql` as acusa como sem veredito.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): o bloco `DO $$` com
-- statements adjacentes é a forma exata do 42601, e o endpoint já roda o corpo
-- inteiro numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000004_p48_analise_descartada_knockout.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1 · As duas colunas da marca
-- ---------------------------------------------------------------------------
ALTER TABLE public.analise_candidato_vaga
  ADD COLUMN descartada_em timestamptz,
  ADD COLUMN descartada_motivo text;

ALTER TABLE public.analise_candidato_vaga
  ADD CONSTRAINT analise_candidato_vaga_descartada_motivo_check
    CHECK (descartada_motivo IS NULL OR descartada_motivo IN ('knockout_automatico'));

ALTER TABLE public.analise_candidato_vaga
  ADD CONSTRAINT analise_candidato_vaga_descartada_coerente_check
    CHECK ((descartada_em IS NULL) = (descartada_motivo IS NULL));

COMMENT ON COLUMN public.analise_candidato_vaga.descartada_em IS
  'Phase 48 / JORN-24 / D-02: quando esta analise foi MARCADA como tratamento sem finalidade '
  '(a IA analisou alguem que o knockout ja tinha eliminado). NULL = analise com finalidade. '
  'A LINHA NAO E APAGADA: apagar e irreversivel, o titular ja recebeu esta analise numa copia '
  'LGPD, e a marca e o que deixa auditavel que houve tratamento sem finalidade e que ele foi '
  'corrigido. Preenchida junto com descartada_motivo (CHECK de coerencia). '
  'Daqui para frente a EF analise-candidato-individual nao analisa mais quem o knockout eliminou '
  '(skipped:knockout) — esta coluna marca o passivo anterior a guarda.';

COMMENT ON COLUMN public.analise_candidato_vaga.descartada_motivo IS
  'Phase 48 / JORN-24 / D-02: por que a analise foi descartada. Vocabulario fechado por CHECK: '
  'knockout_automatico. NULL junto com descartada_em. '
  'POR QUE NAO UM VALOR NOVO EM status: status (pendente/sucesso/falhou) e lido por '
  'v_triagem_panel.analise_status, v_analises_presas, pela fila e pelo hub — mudar o vocabulario '
  'arrastaria todos os leitores, e a analise continua tendo sido feita; o que foi descartado e a '
  'finalidade dela, nao o estado. A linha NAO e apagada.';

-- ---------------------------------------------------------------------------
-- 2 · Escrita retroativa com portão de escopo (D-02 — autorizada para 3 linhas)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- Escopo AUTORIZADO pelo operador (medido em 2026-09-21; ver cabeçalho).
  v_autorizados   uuid[] := ARRAY[
    '92522073-484c-46a3-9e9d-8e80afa3c062',
    '0f7b217c-dcb0-44cd-939b-72b7f2c36856',
    '25a4231c-612b-4f86-9c5a-904ca09f18f4'
  ]::uuid[];
  v_conjunto      uuid[];
  v_fora          uuid[];
  v_total_antes   bigint;
  v_total_depois  bigint;
  v_tocadas       int;
BEGIN
  SELECT count(*) INTO v_total_antes FROM public.analise_candidato_vaga;

  SELECT coalesce(array_agg(a.candidatura_id ORDER BY a.candidatura_id), '{}'::uuid[])
    INTO v_conjunto
    FROM public.analise_candidato_vaga a
    JOIN public.candidaturas c ON c.id = a.candidatura_id
    JOIN LATERAL (
      SELECT min(h.criado_em) AS knockout_em
        FROM public.historico_candidatura h
       WHERE h.candidatura_id = c.id
         AND h.auto_rejeitado = true
    ) k ON k.knockout_em IS NOT NULL
   WHERE c.motivo_rejeicao = 'knockout_automatico'
     AND c.opcao_knockout_id IS NOT NULL
     AND a.created_at >= k.knockout_em;

  IF cardinality(v_conjunto) <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'D-02: o predicado devolveu % candidatura(s), a autorizacao e para exatamente % — escopo divergente, nada foi marcado',
      cardinality(v_conjunto), cardinality(v_autorizados);
  END IF;

  SELECT coalesce(array_agg(x), '{}'::uuid[]) INTO v_fora
    FROM unnest(v_conjunto) AS x
   WHERE x <> ALL (v_autorizados);
  IF cardinality(v_fora) > 0 THEN
    RAISE EXCEPTION 'D-02: candidatura(s) fora do escopo autorizado no conjunto: % — nada foi marcado', v_fora;
  END IF;

  UPDATE public.analise_candidato_vaga
     SET descartada_em     = now(),
         descartada_motivo = 'knockout_automatico'
   WHERE candidatura_id = ANY (v_conjunto)
     AND candidatura_id = ANY (v_autorizados)
     AND descartada_em IS NULL;
  GET DIAGNOSTICS v_tocadas = ROW_COUNT;

  IF v_tocadas <> cardinality(v_autorizados) THEN
    RAISE EXCEPTION 'D-02: o UPDATE tocou % linha(s), esperado exatamente % — abortado', v_tocadas, cardinality(v_autorizados);
  END IF;

  SELECT count(*) INTO v_total_depois FROM public.analise_candidato_vaga;
  IF v_total_depois IS DISTINCT FROM v_total_antes THEN
    RAISE EXCEPTION 'D-02: a contagem total mudou (% -> %) — marcar, nunca apagar; abortado', v_total_antes, v_total_depois;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3 · Auto-verificação do que ficou instalado
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'analise_candidato_vaga'
         AND column_name IN ('descartada_em', 'descartada_motivo')) <> 2 THEN
    RAISE EXCEPTION 'colunas de descarte ausentes em analise_candidato_vaga';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.analise_candidato_vaga'::regclass
                    AND conname = 'analise_candidato_vaga_descartada_motivo_check')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.analise_candidato_vaga'::regclass
                    AND conname = 'analise_candidato_vaga_descartada_coerente_check') THEN
    RAISE EXCEPTION 'CHECKs de descarte ausentes em analise_candidato_vaga';
  END IF;
END $$;
