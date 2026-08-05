-- =============================================================================
-- Phase 45 / Plano 45-05 — ERASE-01
-- A faixa etária ganha onde viver ANTES de `data_nascimento` morrer.
-- =============================================================================
--
-- Requirement:          ERASE-01
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-05, Task 1
--
-- CORRETIVA · ZERO-DESTRUTIVA. Um `ALTER TABLE ... ADD COLUMN` aditivo e um
-- `CREATE OR REPLACE FUNCTION`. Nenhuma linha de candidato tocada, nenhuma
-- policy, nenhum privilégio removido de quem já o tinha (`CREATE OR REPLACE`
-- preserva o ACL; o REVOKE/GRANT ao final apenas reafirma o estado pretendido,
-- de forma idempotente). O molde integral desta forma é
-- `20260803000001_p43_fix_listar_matriz_cast.sql`.
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NENHUMA LINHA E NÃO MUTA NENHUMA LINHA JÁ GRAVADA
-- NA SÉRIE HISTÓRICA DE BIAS.**
--
-- Não há `DELETE`, não há `DROP`, e não há mutação das linhas históricas da
-- tabela de auditoria de viés — elas permanecem byte-idênticas por desenho, e não
-- existe FK daquela tabela para `candidatos` que pudesse cascatear.
--
-- -----------------------------------------------------------------------------
-- (1) O QUE MUDA, E POR QUE A ORDEM É A RESTRIÇÃO Nº 1 DO ROADMAP
-- -----------------------------------------------------------------------------
-- `gerar_bias_snapshot()` deriva a idade por JOIN VIVO em
-- `candidatos.data_nascimento`, no momento do snapshot
-- [`20260625100001_decisao_final_phase15.sql:322-331`]. E `data_nascimento` é
-- `NOT NULL` com `CHECK (data_nascimento < CURRENT_DATE)` — medido ao vivo em
-- 2026-08-05, SONDA 1 de `45-SONDAS-PROD.md`.
--
-- Consequência aritmética: a sentinela que o tombstone do 45-07 vai escrever
-- naquela coluna **cai numa faixa etária real**. Não existe valor de sentinela
-- que não caia: a CHECK exige uma data no passado, e toda data no passado tem
-- idade. Se a faixa continuasse sendo derivada, anonimizar um titular moveria a
-- coorte de faixa — e a série EEOC 4/5 mudaria RETROATIVAMENTE, que é
-- exatamente o que o SC#5 proíbe.
--
-- A saída é materializar a faixa ANTES e lê-la COM PRECEDÊNCIA:
--   `COALESCE(ca.faixa_etaria_materializada, <faixa derivada de data_nascimento>)`
-- Com a coluna na frente, a sentinela **nunca é lida**. A precedência não é
-- estilo — é o mecanismo inteiro, e um `COALESCE` com os argumentos invertidos
-- passaria por qualquer teste que apenas procurasse o nome da coluna.
--
-- -----------------------------------------------------------------------------
-- (2) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). É o plano **45-11** (portão destrutivo) que
-- aplica; o plano 45-05 apenas AUTORA este arquivo.
--
-- ⚠ ORDEM DE APPLY NÃO-NEGOCIÁVEL: esta migration entra NA FRENTE da
-- `p45_anonimizar_candidato`. A coluna que o tombstone preenche nasce aqui; um
-- tombstone aplicado antes desta migration corrompe a série EEOC 4/5
-- PERMANENTEMENTE (restrição de ordenação nº 1 do ROADMAP).
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o wrapper externo é o gatilho documentado do
-- SQLSTATE 42601 ("cannot insert multiple commands into a prepared statement")
-- quando há corpo delimitado por cifrões adjacente a `COMMENT`/`GRANT`/`REVOKE` —
-- CLAUDE.md §Migrations.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version`
-- (um timestamp do instante do apply, não o do nome deste arquivo). Reparar logo
-- depois:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000003'
--    WHERE name LIKE '%p45_bias_k5%';
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado. Duas das
-- cinco migrations do M8 chegaram a PROD com os comentários descartados por essa
-- via. Aqui a perda de um `COMMENT` NÃO é benigna: eles são o único lugar DENTRO
-- DO BANCO onde está escrita a ordem obrigatória entre esta coluna e o tombstone.
-- Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000003';
--
-- -----------------------------------------------------------------------------
-- (3) PROVENIÊNCIA — o que foi copiado, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260803000001_p43_fix_listar_matriz_cast.sql` — INTEIRO, como precedente
--     de PROCESSO: `CREATE OR REPLACE` corretiva numa migration NOVA e a ordem
--     REVOKE/GRANT → `DO` de auto-verificação → `COMMENT`.
--
--   · `20260804000001_p44_config_sla_dados.sql:1-105` — o cabeçalho de migration
--     do M8 (escopo negativo, protocolo de apply, reparo de ledger, md5,
--     proveniência).
--
--   · ⚠ **`20260625100001_decisao_final_phase15.sql` NÃO É EDITADA.** Migration
--     aplicada é imutável por convenção deste repositório. O
--     `45-CONTEXT §O que NÃO pode ser tocado` nomeia aquele ARQUIVO, não a
--     FUNÇÃO — e a função tem de mudar de qualquer modo, porque D-45-04 exige. O
--     idioma vivo para corrigir uma função é exatamente este:
--     `CREATE OR REPLACE` numa migration nova.
--
--   · ⚠ **`ADD COLUMN IF NOT EXISTS` é DELIBERADAMENTE NÃO USADO.** O idioma
--     condicional é a causa MEDIDA do drift mais crítico deste banco: aplicado a
--     uma coluna pré-existente, ele silenciou a cláusula FK de
--     `candidatos.user_id` e o repositório passou a descrever uma semântica que o
--     banco nunca teve [`.planning/research/FK-AUDIT-LIVE.md:14`]. Aqui um no-op
--     silencioso significaria snapshot lendo `data_nascimento` tombstoneada —
--     ou seja, o defeito que esta migration existe para impedir, instalado sem
--     erro nenhum. Se a coluna já existir, esta migration DEVE falhar alto.
--
-- ⚠ ESTE ARQUIVO AINDA NÃO ESTÁ COMPLETO: a supressão k=5 (D-45-04) entra na
-- Task 2 deste mesmo plano, no mesmo arquivo. **Não aplicar o estado
-- intermediário** — ele materializa a faixa mas ainda publica contagens sem
-- supressão.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- (I) A COLUNA — sem `IF NOT EXISTS`, pelo motivo do bloco (3)
-- ---------------------------------------------------------------------------
ALTER TABLE public.candidatos
  ADD COLUMN faixa_etaria_materializada text;

-- Vocabulário fechado nas cinco faixas canônicas do snapshot. NULL continua
-- significando "ainda não materializada" — é o caso normal de 100% das linhas
-- vivas hoje, e é o que faz o COALESCE cair na derivação.
ALTER TABLE public.candidatos
  ADD CONSTRAINT check_faixa_etaria_materializada
  CHECK (
    faixa_etaria_materializada IS NULL
    OR faixa_etaria_materializada IN ('18-24', '25-34', '35-44', '45-54', '55+')
  );

COMMENT ON COLUMN public.candidatos.faixa_etaria_materializada IS
  'Phase 45 / ERASE-01: a faixa etaria do candidato CONGELADA, para que a serie EEOC 4/5 nao '
  'dependa de uma coluna que a anonimizacao vai destruir. '
  'QUEM ESCREVE: o tombstone de anonimizacao (plano 45-07) — e escreve AQUI ANTES de tocar '
  'data_nascimento. A ordem e a restricao de ordenacao numero 1 do ROADMAP, nao preferencia: '
  'data_nascimento e NOT NULL com CHECK (< CURRENT_DATE), logo QUALQUER sentinela que o tombstone '
  'escreva ali cai numa faixa etaria REAL. Anonimizar antes de materializar corrompe a serie '
  'PERMANENTEMENTE e sem levantar erro nenhum. '
  'QUEM LE: gerar_bias_snapshot(), com PRECEDENCIA — COALESCE(faixa_etaria_materializada, '
  '<faixa derivada de data_nascimento>). Com a coluna na frente a sentinela nunca e lida. '
  'NULL = ainda nao materializada (estado de 100% das linhas ate o primeiro tombstone). '
  'CHECK de vocabulario fechado nas 5 faixas canonicas: uma coluna text livre alimentando um '
  'relatorio publicado inventaria faixas novas no payload. '
  'NAO e PII adicional — e uma GENERALIZACAO da data de nascimento (k-anonimato), estritamente '
  'menos identificante que a coluna de origem.';


-- ---------------------------------------------------------------------------
-- (II) A FUNÇÃO — assinatura, tipo de retorno e semântica preservados
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gerar_bias_snapshot(
  p_periodo text
)
RETURNS public.bias_audit_log
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $gerar_bias_snapshot$
DECLARE
  v_role        text;
  v_ref_rate    numeric := 0;
  v_ref_band    text;
  v_n_total     int := 0;
  v_excluidos   int := 0;
  v_small       boolean := false;
  v_bands       jsonb := '[]'::jsonb;
  v_dados       jsonb;
  v_row         public.bias_audit_log;
  r             record;
BEGIN
  -- (1) Guard NULL-SAFE, por IS DISTINCT FROM. Em SECURITY DEFINER um guard
  --     NULL-cego (`NOT IN`) falha ABERTO para quem chama sem JWT: o IF avalia
  --     NULL e nao e tomado. DEFINER bypassa RLS, entao este guard e o UNICO
  --     controle sobre um relatorio de desfecho de selecao. 42501 e o mesmo
  --     codigo de `insufficient_privilege` da versao anterior — o cliente ja o
  --     mapeia para UNAUTHORIZED (biasAuditService.ts).
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode gerar o snapshot de bias'
      USING ERRCODE = '42501';
  END IF;

  -- (2) A COORTE. `ON COMMIT DROP` nao basta para reentrancia: duas chamadas na
  --     MESMA transacao (o smoke faz isso de proposito, para provar o SC#5)
  --     colidiriam com "relation already exists". O DROP explicito e o que torna
  --     a funcao chamavel duas vezes na mesma transacao.
  DROP TABLE IF EXISTS pg_temp._bias_cohort;
  DROP TABLE IF EXISTS pg_temp._bias_bands;

  --     ⚠ A PRECEDENCIA DO COALESCE E O MECANISMO INTEIRO DO ERASE-01.
  --     A coluna materializada vem PRIMEIRO. A derivacao por data_nascimento e
  --     apenas o fallback para quem ainda nao foi anonimizado. Invertidos, a
  --     sentinela do tombstone (NOT NULL + CHECK < CURRENT_DATE, logo sempre uma
  --     data com idade) seria lida como faixa real e a serie mudaria
  --     retroativamente.
  CREATE TEMP TABLE _bias_cohort ON COMMIT DROP AS
  SELECT
    df.candidatura_id,
    (df.decisao = 'aprovado') AS selected,
    (ca.faixa_etaria_materializada IS NOT NULL) AS faixa_materializada,
    CASE
      WHEN ca.data_nascimento IS NULL THEN NULL
      ELSE date_part('year', age(ca.data_nascimento))::int
    END AS idade,
    COALESCE(
      ca.faixa_etaria_materializada,
      CASE
        WHEN ca.data_nascimento IS NULL                                             THEN NULL
        WHEN date_part('year', age(ca.data_nascimento))::int BETWEEN 18 AND 24      THEN '18-24'
        WHEN date_part('year', age(ca.data_nascimento))::int BETWEEN 25 AND 34      THEN '25-34'
        WHEN date_part('year', age(ca.data_nascimento))::int BETWEEN 35 AND 44      THEN '35-44'
        WHEN date_part('year', age(ca.data_nascimento))::int BETWEEN 45 AND 54      THEN '45-54'
        WHEN date_part('year', age(ca.data_nascimento))::int >= 55                  THEN '55+'
        ELSE NULL
      END
    ) AS faixa
  FROM public.decisao_final df
  JOIN public.candidaturas c ON c.id = df.candidatura_id
  JOIN public.candidatos  ca ON ca.id = c.candidato_id;

  -- (3) Excluidos = SEM FAIXA CONHECIDA. A mudanca em relacao a versao anterior:
  --     uma linha com faixa materializada TEM faixa conhecida e NAO pertence
  --     aqui. Antes o contador era `idade IS NULL OR idade < 18` — e o titular
  --     anonimizado cairia dentro, mudando o denominador da serie
  --     retroativamente. Ele PERMANECE na coorte, na mesma faixa de antes.
  SELECT count(*) INTO v_excluidos
    FROM _bias_cohort
   WHERE faixa_materializada IS NOT TRUE
     AND (idade IS NULL OR idade < 18);

  -- (4) Agregado por faixa, a partir da faixa ja resolvida pelo COALESCE.
  CREATE TEMP TABLE _bias_bands ON COMMIT DROP AS
  SELECT
    b.faixa,
    count(*)::int                           AS applicants,
    count(*) FILTER (WHERE b.selected)::int AS selected
  FROM _bias_cohort b
  WHERE b.faixa IS NOT NULL
  GROUP BY b.faixa;

  SELECT COALESCE(sum(applicants), 0) INTO v_n_total FROM _bias_bands;

  -- (5) faixa_referencia = a de MAIOR selection_rate (EEOC).
  SELECT faixa,
         CASE WHEN applicants > 0 THEN selected::numeric / applicants ELSE 0 END
    INTO v_ref_band, v_ref_rate
    FROM _bias_bands
   WHERE applicants > 0
   ORDER BY (selected::numeric / applicants) DESC, faixa ASC
   LIMIT 1;

  -- (6) small_sample_warning quando alguma faixa tem menos de 30 candidatos.
  SELECT EXISTS (SELECT 1 FROM _bias_bands WHERE applicants < 30) INTO v_small;

  -- (7) bands[] com razao_4_5 + flag por faixa, na ordem etaria canonica.
  FOR r IN
    SELECT
      b.faixa,
      b.applicants,
      b.selected,
      CASE WHEN b.applicants > 0
           THEN round(b.selected::numeric / b.applicants, 4)
           ELSE NULL END AS selection_rate
    FROM _bias_bands b
    ORDER BY array_position(ARRAY['18-24','25-34','35-44','45-54','55+'], b.faixa)
  LOOP
    v_bands := v_bands || jsonb_build_object(
      'faixa', r.faixa,
      'applicants', r.applicants,
      'selected', r.selected,
      'selection_rate', r.selection_rate,
      'razao_4_5',
        CASE WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
             THEN round(r.selection_rate / v_ref_rate, 4)
             ELSE NULL END,
      'flag',
        CASE WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
             THEN (r.selection_rate / v_ref_rate) < 0.8
             ELSE false END
    );
  END LOOP;

  -- (8) O payload. Agregados por faixa APENAS — sem rows por candidato, idade
  --     nunca persistida por-row. Limitacao AGE-ONLY honesta (LGPD-01).
  v_dados := jsonb_build_object(
    'metodo', 'eeoc_4_5_age_band_v1',
    'limitacao', 'apenas faixa etária — raça/gênero não coletados (LGPD-01)',
    'populacao', jsonb_build_object(
      'definicao_applicants', 'tem decisao_final',
      'definicao_selected', 'decisao=''aprovado'''
    ),
    'faixa_referencia', v_ref_band,
    'bands', v_bands,
    'n_total', v_n_total,
    'small_sample_warning', v_small,
    'excluidos_sem_data', v_excluidos
  );

  -- (9) Grava UMA linha e a devolve. Nenhuma linha ja existente e lida ou
  --     alterada aqui — a serie historica so cresce.
  INSERT INTO public.bias_audit_log (periodo, dados)
  VALUES (p_periodo, v_dados)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$gerar_bias_snapshot$;


-- ---------------------------------------------------------------------------
-- (III) REVOKE NOMINAL — reafirmado, e o `anon` NOMEADO
-- ---------------------------------------------------------------------------
-- `CREATE OR REPLACE` ja preserva o ACL; isto reafirma o estado pretendido de
-- forma idempotente e LEGIVEL nesta migration. Nomear `anon` e OBRIGATORIO:
-- `FROM PUBLIC` sozinho NAO remove nada, porque o `pg_default_acl` do schema
-- `public` concede EXECUTE a `anon` e `authenticated` como grant DIRETO em todo
-- `CREATE FUNCTION` (medido na P42-06: 61 funcoes DEFINER com EXECUTE para anon).
REVOKE ALL ON FUNCTION public.gerar_bias_snapshot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_bias_snapshot(text) TO authenticated;
