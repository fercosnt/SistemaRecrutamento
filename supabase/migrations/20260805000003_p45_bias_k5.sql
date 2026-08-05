-- =============================================================================
-- Phase 45 / Plano 45-05 — ERASE-01
-- A faixa etária ganha onde viver ANTES de `data_nascimento` morrer, e o
-- relatório que existe para provar não-discriminação deixa de ser um caminho de
-- re-identificação (k=5 COM supressão complementar — D-45-04).
-- =============================================================================
--
-- Requirement:          ERASE-01
-- Decisões de origem:   D-45-04 (k=5, presença declarada e contagem oculta)
--                       D-45-05 (`small_sample_warning < 30` permanece SEPARADO)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-05, Tasks 1 e 2
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
-- existe FK daquela tabela para `candidatos` que pudesse cascatear. A única
-- escrita de linha nesta migration é a fixture sintética do bloco de
-- auto-verificação, que roda em subtransação e é revertida por `RAISE`.
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
-- E o segundo pedaço é o D-45-04: hoje a função só SINALIZA
-- (`small_sample_warning < 30`) e NUNCA suprime. Depois da anonimização a coorte
-- encolhe, e uma faixa com 1–2 candidatos somada ao desfecho de seleção
-- re-identifica a pessoa dentro do relatório que existe para provar
-- não-discriminação.
--
-- -----------------------------------------------------------------------------
-- (2) ⚠ POR QUE SUPRIMIR A CÉLULA SEM SUPRIMIR O COMPLEMENTO NÃO SUPRIME NADA
-- -----------------------------------------------------------------------------
-- O payload vigente publica `bands[]` com `applicants`/`selected` por faixa MAIS
-- o total da coorte [`20260625100001:406-417`]. Esses campos FECHAM A CONTA: quem
-- suprime a faixa de 3 e continua publicando o total recupera o 3 por subtração,
-- e a supressão vira decoração.
--
-- É o defeito canônico do controle de divulgação estatística: *"a supressão das
-- células primárias sozinha pode ser facilmente atacada pelos totais marginais;
-- é portanto necessário suprimir células adicionais, chamadas complementares"*
-- [nces.ed.gov/FCSM/pdf/2005FCSM_Dandekar_IXA.pdf · sdctools.github.io/HandbookSDC].
--
-- ⚠ E o teste que "verifica que a célula pequena não aparece" PASSA com o defeito
-- presente. É a mesma classe de lacuna que a `20260803000001` documentou: um
-- contador de asserções verdes mede caminhos exercitados, não caminhos
-- existentes.
--
-- Regra fixada por este plano (a forma é discricionária dentro de D-45-04; a
-- propriedade — o leitor não recupera a célula por aritmética — não é):
--   · supressão PRIMÁRIA: toda faixa com menos de 5 candidatos perde a contagem
--     e mantém a presença declarada;
--   · supressão COMPLEMENTAR: existindo qualquer primária, o total da coorte
--     sai do payload E a faixa de MENOR contagem entre as remanescentes também é
--     suprimida. Duas supressões, porque uma só volta a fechar a conta quando
--     resta uma única faixa não-suprimida;
--   · nenhum campo DERIVADO de célula suprimida é publicado (`applicants`,
--     `selected`, `selection_rate`, `razao_4_5`, `flag`). Publicar a razão 4/5 de
--     uma célula suprimida devolve a contagem por outro caminho quando `selected`
--     é pequeno.
--
-- -----------------------------------------------------------------------------
-- (3) A TENSÃO SC#5 × D-45-04, RESOLVIDA POR ESCRITO — e a leitura vai para
--     dentro do banco, no COMMENT ON FUNCTION, não só para o plano
-- -----------------------------------------------------------------------------
-- `p_periodo` é um RÓTULO, NÃO UM FILTRO: a coorte não tem cláusula de período
-- nenhuma — `p_periodo` só é gravado na coluna `periodo` da tabela de auditoria,
-- e a coorte agrega TODA a tabela de decisão final. Logo "a série continua
-- produzindo os mesmos números para os períodos anteriores" NUNCA significou
-- "reexecutar o snapshot de um período passado devolve o mesmo resultado",
-- porque isso nunca foi verdade.
--
-- A leitura coerente, e ela é decisão deste plano:
--   (a) as LINHAS JÁ GRAVADAS na série permanecem intactas — esta migration não
--       as toca, e não há FK daquela tabela para `candidatos`;
--   (b) a COMPOSIÇÃO DA COORTE não muda por causa da anonimização — que é
--       exatamente o que a materialização da faixa garante;
--   (c) a APRESENTAÇÃO FUTURA suprime células pequenas.
-- Sob qualquer outra leitura, D-45-04 e SC#5 seriam incompatíveis por
-- interpretação, não por código.
--
-- -----------------------------------------------------------------------------
-- (4) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
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
-- CLAUDE.md §Migrations. Este arquivo tem DOIS corpos assim, então a regra morde
-- aqui com força.
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
-- DO BANCO onde está escrita a leitura do SC#5 × D-45-04 e a ordem obrigatória
-- entre esta coluna e o tombstone. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000003';
--
-- -----------------------------------------------------------------------------
-- (5) PROVENIÊNCIA — o que foi copiado, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260803000001_p43_fix_listar_matriz_cast.sql` — INTEIRO, como precedente
--     de PROCESSO: `CREATE OR REPLACE` corretiva numa migration NOVA, a ordem
--     REVOKE/GRANT → `DO` de auto-verificação → `COMMENT`, e o `COMMENT` final
--     que registra o defeito corrigido e por que o gate anterior não o pegou.
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
-- -----------------------------------------------------------------------------
-- (6) DIVERGÊNCIAS DECLARADAS EM RELAÇÃO À LETRA DO PLANO 45-05
-- -----------------------------------------------------------------------------
--   · **O `GRANT EXECUTE` a `authenticated` é PRESERVADO.** O plano carrega uma
--     linha de must-have dizendo que a função recriada "não é executável por
--     anon, authenticated nem PUBLIC" e, dois parágrafos adiante, manda "conceder
--     de volta só ao papel que hoje a chama". As duas não podem valer juntas: o
--     chamador vivo é o cliente do navegador em
--     `src/features/admin/bias-audit/services/biasAuditService.ts:98`
--     (`supabase.rpc('gerar_bias_snapshot', …)`), que fala com o Postgres como
--     `authenticated`. Revogar dali não endureceria nada — apagaria a tela de
--     auditoria de viés do administrador. O controle real é o guard NULL-safe no
--     corpo, e é ele que o smoke exercita nas duas metades. Idêntico ao que a
--     `20260803000001:112-113` faz.
--
--   · **A coluna nasce com CHECK de vocabulário.** Uma coluna `text` livre que
--     alimenta um relatório publicado aceitaria qualquer string e criaria faixas
--     inventadas no payload. A CHECK amarra o vocabulário às cinco faixas
--     canônicas e é o que permite ao `COALESCE` confiar no valor materializado.
--     Segue a convenção de nome VIVA (`check_*`), medida na SONDA 1b — nunca os
--     nomes previstos pela pesquisa, que estavam todos errados.
--
--   · **A coorte sintética da auto-verificação tem TRÊS faixas (3 · 12 · 7), não
--     duas.** Com apenas duas faixas a regra complementar degenera: suprime-se a
--     de 3 e, como só resta uma, suprime-se ela também — nada é publicado, e a
--     asserção de não-recuperação passa por VACUIDADE. Com três, a supressão
--     complementar é exercitada na sua forma interessante: sobra uma faixa
--     publicada e duas escondidas. A letra do plano ("uma faixa de 3, outra de
--     12") continua satisfeita.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- (I) A COLUNA — sem `IF NOT EXISTS`, pelo motivo do bloco (5)
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
  v_role          text;
  v_ref_rate      numeric := 0;
  v_ref_band      text;
  v_n_total       int := 0;
  v_excluidos     int := 0;
  v_small         boolean := false;
  v_bands         jsonb := '[]'::jsonb;
  v_obj           jsonb;
  v_dados         jsonb;
  v_row           public.bias_audit_log;
  v_n_primarias   int := 0;
  v_complementar  text;
  v_ref_suprimida boolean := false;
  v_supr_total    int := 0;
  r               record;
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

  -- (4) Agregado por faixa. `suprimida_primaria` e o UNICO sitio do limiar k=5
  --     (D-45-04) — tudo abaixo le esta coluna, e nao repete o numero.
  CREATE TEMP TABLE _bias_bands ON COMMIT DROP AS
  SELECT
    b.faixa,
    count(*)::int                                AS applicants,
    count(*) FILTER (WHERE b.selected)::int      AS selected,
    (count(*) < 5)                               AS suprimida_primaria
  FROM _bias_cohort b
  WHERE b.faixa IS NOT NULL
  GROUP BY b.faixa;

  SELECT COALESCE(sum(applicants), 0) INTO v_n_total FROM _bias_bands;

  -- (5) faixa_referencia = a de MAIOR selection_rate (EEOC). Calculada sobre
  --     TODAS as faixas, inclusive as que serao suprimidas — suprimir a celula
  --     nao muda qual e a referencia estatistica; muda apenas o que pode ser
  --     PUBLICADO sobre ela.
  SELECT faixa,
         CASE WHEN applicants > 0 THEN selected::numeric / applicants ELSE 0 END
    INTO v_ref_band, v_ref_rate
    FROM _bias_bands
   WHERE applicants > 0
   ORDER BY (selected::numeric / applicants) DESC, faixa ASC
   LIMIT 1;

  -- (6) small_sample_warning — sinal SEPARADO e com o limiar INALTERADO em 30
  --     (D-45-05). Os dois nao colapsam num so numero: o < 30 e sinal
  --     ESTATISTICO (a razao 4/5 e instavel em amostra pequena), o < 5 e
  --     controle de RE-IDENTIFICACAO. A proxima pessoa que ler este codigo vai
  --     querer unifica-los; esta e a razao de nao unificar.
  SELECT EXISTS (SELECT 1 FROM _bias_bands WHERE applicants < 30) INTO v_small;

  -- (7) SUPRESSAO PRIMARIA e COMPLEMENTAR.
  SELECT count(*) INTO v_n_primarias FROM _bias_bands WHERE suprimida_primaria;

  IF v_n_primarias > 0 THEN
    -- A complementar e a faixa de MENOR contagem entre as remanescentes.
    -- Desempate pela ordem canonica da faixa, para que o resultado seja
    -- deterministico entre execucoes (um snapshot nao-deterministico seria
    -- indefensavel numa peca probatoria).
    SELECT b.faixa INTO v_complementar
      FROM _bias_bands b
     WHERE NOT b.suprimida_primaria
     ORDER BY b.applicants ASC,
              array_position(ARRAY['18-24','25-34','35-44','45-54','55+'], b.faixa) ASC
     LIMIT 1;
  END IF;

  -- A referencia esta suprimida? Entao a razao 4/5 do RELATORIO INTEIRO cai: nao
  -- existe razao 4/5 honesta sobre um denominador que nao pode ser publicado, e
  -- publica-la devolveria a taxa da celula escondida por divisao.
  v_ref_suprimida := (v_n_primarias > 0)
    AND v_ref_band IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM _bias_bands WHERE faixa = v_ref_band AND suprimida_primaria)
      OR v_ref_band IS NOT DISTINCT FROM v_complementar
    );

  -- (8) bands[] — presenca declarada, contagem oculta.
  FOR r IN
    SELECT
      b.faixa,
      b.applicants,
      b.selected,
      b.suprimida_primaria,
      ((v_n_primarias > 0) AND b.faixa IS NOT DISTINCT FROM v_complementar) AS suprimida_complementar,
      CASE WHEN b.applicants > 0
           THEN round(b.selected::numeric / b.applicants, 4)
           ELSE NULL END AS selection_rate
    FROM _bias_bands b
    ORDER BY array_position(ARRAY['18-24','25-34','35-44','45-54','55+'], b.faixa)
  LOOP
    IF r.suprimida_primaria OR r.suprimida_complementar THEN
      v_supr_total := v_supr_total + 1;

      -- Some o NUMERO, nao o FATO de a faixa existir. E NENHUM campo derivado
      -- viaja junto: sem applicants, sem selected, sem selection_rate, sem
      -- razao_4_5, sem flag.
      v_bands := v_bands || jsonb_build_object(
        'faixa', r.faixa,
        'suprimida', true,
        'motivo_supressao',
          CASE WHEN r.suprimida_primaria THEN 'k_anonimato_primaria'
               ELSE 'complementar' END
      );
    ELSE
      v_obj := jsonb_build_object(
        'faixa', r.faixa,
        'suprimida', false,
        'applicants', r.applicants,
        'selected', r.selected,
        'selection_rate', r.selection_rate
      );

      IF NOT v_ref_suprimida THEN
        v_obj := v_obj || jsonb_build_object(
          'razao_4_5',
            CASE WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
                 THEN round(r.selection_rate / v_ref_rate, 4)
                 ELSE NULL END,
          'flag',
            CASE WHEN v_ref_rate > 0 AND r.selection_rate IS NOT NULL
                 THEN (r.selection_rate / v_ref_rate) < 0.8
                 ELSE false END
        );
      END IF;

      v_bands := v_bands || v_obj;
    END IF;
  END LOOP;

  -- (9) O payload. Agregados por faixa APENAS — sem rows por candidato, idade
  --     nunca persistida por-row. Limitacao AGE-ONLY honesta (LGPD-01).
  v_dados := jsonb_build_object(
    'metodo', 'eeoc_4_5_age_band_v2_k5',
    'limitacao', 'apenas faixa etária — raça/gênero não coletados (LGPD-01)',
    'populacao', jsonb_build_object(
      'definicao_applicants', 'tem decisao_final',
      'definicao_selected', 'decisao=''aprovado'''
    ),
    'k_supressao', 5,
    'celulas_suprimidas', v_supr_total,
    'supressao_complementar_aplicada', (v_n_primarias > 0),
    'bands', v_bands,
    'small_sample_warning', v_small,
    'limiar_small_sample', 30,
    'excluidos_sem_data', v_excluidos
  );

  -- O total marginal e a chave da subtracao. Existindo qualquer supressao
  -- primaria, ele SAI do payload — junto com a segunda celula (a complementar,
  -- ja aplicada em bands[] acima). Duas incognitas para uma equacao: nenhuma
  -- celula e recuperavel.
  IF v_n_primarias > 0 THEN
    v_dados := v_dados || jsonb_build_object(
      'n_total_suprimido', true,
      'faixa_referencia_suprimida', v_ref_suprimida
    );
    IF NOT v_ref_suprimida THEN
      v_dados := v_dados || jsonb_build_object('faixa_referencia', v_ref_band);
    END IF;
  ELSE
    v_dados := v_dados || jsonb_build_object(
      'n_total', v_n_total,
      'faixa_referencia', v_ref_band
    );
  END IF;

  -- (10) Grava UMA linha e a devolve. Nenhuma linha ja existente e lida ou
  --      alterada aqui — a serie historica so cresce.
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
--
-- O grant de volta a `authenticated` e o papel que HOJE a chama — o cliente do
-- navegador em `biasAuditService.ts:98`. O controle nao e o ACL, e o guard
-- NULL-safe do corpo; ver bloco (6) do cabecalho.
REVOKE ALL ON FUNCTION public.gerar_bias_snapshot(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_bias_snapshot(text) TO authenticated;


-- ---------------------------------------------------------------------------
-- (IV) AUTO-VERIFICAÇÃO — EXECUTA o caminho feliz sobre coorte POPULADA
-- ---------------------------------------------------------------------------
-- Um gate que nao morde nao e um gate. Com as contagens vivas de PROD (22
-- candidatos, 9 candidaturas, 1 decisao_final) QUASE TODA celula fica abaixo de
-- k=5 — o que significa que uma verificacao contra o estado real passaria sem
-- nunca exercitar a fronteira entre suprimir e publicar. Por isso a coorte aqui
-- e SINTETICA e tem tres faixas (3 · 12 · 7).
--
-- Tudo roda em subtransacao encerrada por `RAISE`: a fixture, o DDL de
-- desligamento de gatilho e a linha de snapshot sao revertidos. Variaveis
-- PL/pgSQL sobrevivem ao rollback — e por isso as assercoes rodam DEPOIS dele,
-- sobre o payload capturado (idioma de `p43_matriz_retencao_smoke.sql`, assercao
-- (g)).
--
-- ⚠ Os gatilhos de usuario de `candidatos` e `candidaturas` sao desligados
-- DENTRO da subtransacao. Eles despacham webhook de n8n e analise de IA por
-- `net.http_post`; enfileirar 22 despachos para linhas que serao revertidas e
-- efeito colateral desnecessario. `DISABLE TRIGGER USER` NAO desliga os gatilhos
-- internos de integridade referencial — as FKs continuam sendo checadas, e e
-- isso que mantem a fixture honesta.
DO $verifica_k5$
DECLARE
  v_vaga    uuid;
  v_ator    uuid;
  v_uid     uuid;
  v_cid     uuid;
  v_caid    uuid;
  v_dados   jsonb;
  v_banda   jsonb;
  v_supr    int := 0;
  v_soma    int := 0;
  v_b       int;
  v_i       int;
  v_faixas  text[] := ARRAY['18-24', '25-34', '35-44'];
  v_qtdes   int[]  := ARRAY[3, 12, 7];
  v_idades  int[]  := ARRAY[20, 30, 40];
BEGIN
  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.id LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P45-K5 FALHOU: nenhuma vaga viva — a coorte sintetica nao pode ser montada. Aplicar esta migration sem executar o caminho feliz seria repetir exatamente o defeito que a 20260803000001 corrigiu: verificar so a recusa e chamar aquilo de cobertura';
  END IF;

  BEGIN
    ALTER TABLE public.candidatos   DISABLE TRIGGER USER;
    ALTER TABLE public.candidaturas DISABLE TRIGGER USER;

    -- Ator humano sintetico: decisao_final.por_usuario e NOT NULL — e o
    -- guardrail estrutural de zero-auto-rejeicao (LGPD-02 / RNF-07a).
    v_ator := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, created_at, updated_at)
    VALUES (v_ator, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', now(), now());

    FOR v_b IN 1..3 LOOP
      FOR v_i IN 1..v_qtdes[v_b] LOOP
        v_uid  := gen_random_uuid();
        v_cid  := gen_random_uuid();
        v_caid := gen_random_uuid();

        INSERT INTO auth.users (id, instance_id, aud, role, created_at, updated_at)
        VALUES (v_uid, '00000000-0000-0000-0000-000000000000',
                'authenticated', 'authenticated', now(), now());

        -- Sentinelas que passam nas 7 CHECK vivas de candidatos (SONDA 1b):
        -- celular casa ^\(\d{2}\) \d{5}-\d{4}$, email casa a regex de formato e e
        -- unico por linha, estado e uma das 27 UFs, data_nascimento < CURRENT_DATE.
        INSERT INTO public.candidatos
          (id, user_id, nome_completo, email, celular, cidade, estado, data_nascimento)
        VALUES
          (v_cid, v_uid,
           'FIXTURE P45-05 auto-verificacao',
           'fixture-p45-' || replace(v_cid::text, '-', '') || '@example.invalid',
           '(11) 90000-0000', 'Sao Paulo', 'SP',
           (CURRENT_DATE - (v_idades[v_b] * 365 + 200))::date);

        INSERT INTO public.candidaturas (id, candidato_id, vaga_id)
        VALUES (v_caid, v_cid, v_vaga);

        INSERT INTO public.decisao_final (candidatura_id, decisao, justificativa, por_usuario)
        VALUES (v_caid,
                (CASE WHEN v_i = 1 THEN 'aprovado' ELSE 'rejeitado' END)::public.decisao_final_resultado,
                'Fixture sintetica da migration 20260805000003 (auto-verificacao k=5); esta linha e revertida pelo RAISE ao final desta subtransacao.',
                v_ator);
      END LOOP;
    END LOOP;

    PERFORM set_config('request.jwt.claims',
      json_build_object('app_metadata', json_build_object('role', 'administrador'))::text, true);

    SELECT g.dados INTO v_dados
      FROM public.gerar_bias_snapshot('AUTOVERIFICACAO-20260805000003') g;

    PERFORM set_config('request.jwt.claims', '', true);

    RAISE EXCEPTION 'rollback_autoverificacao_p45_k5' USING ERRCODE = 'P45K5';
  EXCEPTION
    WHEN sqlstate 'P45K5' THEN
      NULL;  -- reversao esperada: fixture, DDL e linha de snapshot desfeitas
  END;

  -- (i) A funcao COMPLETOU. Nao basta "nao levantou": um payload nulo aqui
  --     significaria que a chamada nem chegou ao INSERT.
  IF v_dados IS NULL THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (i): gerar_bias_snapshot nao devolveu payload sobre a coorte sintetica — a funcao nao COMPLETOU o caminho feliz';
  END IF;

  -- (ii) A faixa de 3 aparece com PRESENCA e SEM CONTAGEM.
  SELECT b INTO v_banda
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE b ->> 'faixa' = '18-24';

  IF v_banda IS NULL THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (ii): a faixa 18-24 SUMIU do payload. D-45-04 manda ocultar a CONTAGEM, nao a PRESENCA — some o numero, nao o fato de a faixa existir';
  END IF;
  IF (v_banda ->> 'suprimida') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (ii): a faixa 18-24 (3 candidatos sinteticos) NAO esta marcada como suprimida — o limiar k=5 nao esta em vigor: %', v_banda::text;
  END IF;
  -- `jsonb_exists(...)` e a forma funcional do operador `?`. Usada de proposito:
  -- um `?` solto no corpo atravessa clientes que fazem substituicao de
  -- placeholder, e este arquivo e enviado por MCP.
  IF jsonb_exists(v_banda, 'applicants')     OR jsonb_exists(v_banda, 'selected')
     OR jsonb_exists(v_banda, 'selection_rate')
     OR jsonb_exists(v_banda, 'razao_4_5')   OR jsonb_exists(v_banda, 'flag') THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (ii): a celula suprimida viajou com campo derivado (%) — publicar a razao 4/5 ou a taxa de uma celula suprimida devolve a contagem por outro caminho', v_banda::text;
  END IF;

  -- (iii) O total marginal esta suprimido.
  IF jsonb_exists(v_dados, 'n_total') THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (iii): existe supressao primaria e o total da coorte continua publicado (%) — o leitor recupera a celula por subtracao, e a supressao vira decoracao', v_dados ->> 'n_total';
  END IF;

  -- (iv) DUAS celulas escondidas, entao nenhuma subtracao isola uma delas.
  --      Uma equacao com duas incognitas nao resolve nenhuma — e e ESSA a
  --      propriedade, nao "a celula pequena nao aparece".
  SELECT count(*) INTO v_supr
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'suprimida') = 'true';

  SELECT COALESCE(sum((b ->> 'applicants')::int), 0) INTO v_soma
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'suprimida') = 'false';

  IF v_supr < 2 THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (iv): apenas % celula(s) suprimida(s). Com uma so, a subtracao dos totais marginais a devolve inteira — a supressao complementar e a metade sem a qual a primaria nao faz nada', v_supr;
  END IF;
  IF v_soma = 3 THEN
    RAISE EXCEPTION 'P45-K5 FALHOU (iv): a soma dos applicants publicados (%) coincide com a contagem que deveria estar escondida', v_soma;
  END IF;

  RAISE NOTICE 'P45-K5 OK: coorte sintetica 3/12/7 — funcao COMPLETOU, faixa de 3 com presenca e sem contagem, total marginal suprimido, % celulas escondidas, % applicants publicados. Tudo revertido.',
    v_supr, v_soma;
END
$verifica_k5$;


-- ---------------------------------------------------------------------------
-- (V) O COMMENT — a leitura fica DENTRO do banco, nao so no plano
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.gerar_bias_snapshot(text) IS
  'Phase 15 / LGPD-03, corrigida na Phase 45 / ERASE-01 pela 20260805000003: gera UM snapshot de '
  'adverse-impact por FAIXA ETARIA (regra 4/5 EEOC) e grava UMA linha em bias_audit_log(periodo, '
  'dados) com AGREGADOS POR FAIXA APENAS (sem rows por candidato; idade nunca persistida por-row). '
  'applicants := tem decisao_final; selected := decisao=''aprovado''. AGE-ONLY por design — '
  'raca/genero NAO coletados (LGPD-01). SECURITY DEFINER + search_path=''''; guard NULL-SAFE por '
  'IS DISTINCT FROM: recusa com 42501 tanto o papel errado quanto o chamador SEM claim nenhuma — '
  'DEFINER bypassa RLS, entao este guard e o unico controle. REVOKE ALL de PUBLIC/anon/authenticated '
  'e so entao GRANT EXECUTE a authenticated (o chamador vivo e a tela do admin via '
  'biasAuditService.ts; o controle e o guard, nao o ACL). '
  '--- (1) O QUE MUDOU NA PHASE 45, E POR QUE: a faixa da coorte agora sai de '
  'COALESCE(candidatos.faixa_etaria_materializada, <faixa derivada de data_nascimento>), COM A '
  'COLUNA NA FRENTE. data_nascimento e NOT NULL com CHECK (< CURRENT_DATE), entao a sentinela que o '
  'tombstone de anonimizacao escreve ali cai numa faixa etaria REAL: se a idade continuasse sendo '
  'derivada, anonimizar um titular moveria a coorte de faixa e a serie EEOC 4/5 mudaria '
  'RETROATIVAMENTE. A precedencia e o mecanismo — um COALESCE com os argumentos invertidos passaria '
  'por qualquer teste que apenas procurasse o nome da coluna. E excluidos_sem_data deixou de contar '
  'a linha com faixa materializada: ela TEM faixa conhecida, permanece na coorte e nao muda o '
  'denominador. '
  '--- (2) SUPRESSAO k=5 (D-45-04): toda faixa com menos de 5 candidatos tem a CONTAGEM oculta e a '
  'PRESENCA declarada. ⚠ SUPRIMIR A CELULA SEM SUPRIMIR O COMPLEMENTO NAO SUPRIME NADA: o payload '
  'publica bands[] com applicants/selected MAIS o total da coorte, e esses campos fecham a conta por '
  'subtracao. Por isso, existindo qualquer supressao primaria, o total marginal sai do payload E a '
  'faixa de MENOR contagem entre as remanescentes tambem e suprimida — duas incognitas para uma '
  'equacao. Nenhum campo derivado de celula suprimida e publicado (applicants, selected, '
  'selection_rate, razao_4_5, flag); e se a faixa_referencia for a suprimida, a razao 4/5 do '
  'relatorio inteiro cai, porque nao existe razao 4/5 honesta sobre um denominador impublicavel. '
  'Um teste que so verifique "a celula pequena nao aparece" PASSA com o defeito presente. '
  '--- (3) small_sample_warning (< 30) permanece SINAL SEPARADO e com o limiar INALTERADO (D-45-05): '
  'o < 30 e estatistico (a razao 4/5 e instavel em amostra pequena), o < 5 e controle de '
  're-identificacao. Nao unificar os dois numeros — parecem o mesmo campo e nao sao. '
  '--- (4) p_periodo E UM ROTULO, NAO UM FILTRO: a coorte nao tem clausula de periodo nenhuma; '
  'p_periodo so e gravado na coluna periodo. Logo "a serie continua produzindo os mesmos numeros '
  'para os periodos anteriores" (SC#5) NUNCA significou "reexecutar o snapshot de um periodo passado '
  'devolve o mesmo resultado" — isso nunca foi verdade. A leitura que resolve a tensao SC#5 x '
  'D-45-04, e que e decisao do plano 45-05: as LINHAS JA GRAVADAS na serie permanecem intactas '
  '(nao ha FK desta tabela para candidatos e esta migration nao as mutou); a COMPOSICAO DA COORTE '
  'nao muda por causa da anonimizacao (e o que a faixa materializada garante); a APRESENTACAO FUTURA '
  'suprime celulas pequenas. '
  '--- (5) CONSEQUENCIA DECLARADA PARA O CLIENTE: o payload ganhou os campos suprimida, '
  'motivo_supressao, k_supressao, celulas_suprimidas, supressao_complementar_aplicada, '
  'n_total_suprimido, faixa_referencia_suprimida e limiar_small_sample, e metodo virou '
  'eeoc_4_5_age_band_v2_k5. A tela de auditoria de vies (src/features/admin/bias-audit) ainda le a '
  'forma v1 e precisa aprender a renderizar celula suprimida — debito registrado pelo plano 45-05, '
  'NAO fechado por ele.';
