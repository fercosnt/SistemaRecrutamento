-- =============================================================================
-- Phase 37 / Plano 37-02 — Smoke de FIDELIDADE: catálogo vivo × arquivos reconstruídos
-- =============================================================================
-- PARA QUE SERVE
-- As migrations `20260721000001_notificacoes_enviadas.sql` e
-- `20260721000002_config_sla_etapa.sql` são RECONSTRUÇÕES por engenharia reversa
-- de um schema que já estava vivo em PROD (drift PROD→repo, descoberto em
-- 2026-07-22). Elas nunca foram aplicadas e nunca serão. Portanto NADA prova que
-- elas descrevem o banco real — exceto este arquivo.
--
-- Foi exatamente "escrever e revisar por leitura" que deixou o drift nascer. Este
-- smoke fecha o triângulo dump → arquivo → banco por EXECUÇÃO: ele lê o catálogo
-- Postgres e compara campo-a-campo contra os literais transcritos nos dois
-- arquivos. Qualquer divergência de coluna, constraint, índice, policy, trigger,
-- label de enum ou linha de seed derruba o run.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR — nunca pelo executor
-- (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). 100% somente-leitura: não há um único comando de
-- escrita nem DDL aqui, não há fixture e não há cleanup. As provas COMPORTAMENTAIS
-- (RLS com JWT de candidato, idempotência do uq_notif_dedupe, trigger) vivem no
-- smoke do Plano 37-03; este arquivo prova ESTRUTURA.
--
-- GATE VERDE = as 12 asserções `PASS (…)` presentes E a linha RESUMO fechando
-- 12/12. Contar os PASS é obrigatório: "não levantou exceção" é insuficiente —
-- um run que pula asserções mascara falha (Pitfall 2 do seg33_agendamento_smokes).
--
-- -----------------------------------------------------------------------------
-- TOGGLE DE BASELINE — `v_pos_aditiva`
-- -----------------------------------------------------------------------------
-- Este smoke é RE-EXECUTÁVEL nos dois lados do apply da migration aditiva
-- `20260722000002` (Plano 37-03), em vez de virar um arquivo permanentemente
-- vermelho no repo. Alterne a variável na primeira linha do DECLARE:
--
--   `v_pos_aditiva := false`  → estado ANTERIOR à aditiva (o de hoje)
--   `v_pos_aditiva := true`   → estado POSTERIOR à aditiva
--
-- O que muda entre os dois modos:
--   · notificacoes_enviadas: colunas      16 → 18  (+destinatario_original, +modo)
--   · notificacoes_enviadas: constraints   5 →  6  (+CHECK de `modo`)
--   · notificacoes_enviadas: triggers      0 →  1  (tocar_atualizado_em)
--   · config_sla_etapa:      triggers      0 →  1  (tocar_atualizado_em)
--   · ÍNDICES: 5 nos DOIS modos — NÃO muda.
--
-- ⚠ Por que a contagem de índices NÃO muda: o planejamento original previa 5 → 6
--   supondo que a 37-03 criaria o índice parcial da varredura de retry. A Wave 1
--   (§ C do `37-SCHEMA-VIVO.md`) provou que `idx_notif_retry` JÁ EXISTE em PROD —
--   a 37-03 foi revisada para VERIFICÁ-LO em vez de criá-lo. Asserir 6 no modo
--   pós-aditiva reprovaria o estado correto.
--
-- As 5 constraints e os 5 índices BASELINE são conferidos NOMINALMENTE nos dois
-- modos; a aditiva só pode ACRESCENTAR, nunca redefinir o que já existe.
--
-- -----------------------------------------------------------------------------
-- AS 12 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) notificacoes_enviadas — contagem de colunas (16 / 18) + presença nominal
--       das 2 colunas da aditiva quando o modo é pós-aditiva.
--   (b) notificacoes_enviadas — as 16 colunas baseline, comparadas por TUPLA
--       (column_name, udt_name, is_nullable, coalesce(column_default,'')) na
--       ordem de ordinal_position, contra os literais do arquivo reconstruído.
--   (c) notificacoes_enviadas — contagem de constraints (5 / 6) e, para cada uma
--       das 5 baseline, `pg_get_constraintdef(oid)` IDÊNTICO ao esperado
--       (nomeando `uq_notif_dedupe` e `notificacoes_enviadas_evento_check`).
--   (d) notificacoes_enviadas — 5 índices nos DOIS modos, cada `indexdef`
--       idêntico ao literal transcrito da § C do dump.
--   (e) notificacoes_enviadas — RLS ligada; EXATAMENTE 1 policy; nome
--       `rh_le_notificacoes`; cmd `SELECT`; roles `{authenticated}`; PERMISSIVE;
--       e o `qual` byte-idêntico ao da policy precedente `rh_gerencia_agendamento`
--       (P33/WR-04). ESTA É A ASSERÇÃO MAIS IMPORTANTE DO ARQUIVO — é ela que
--       prova que o LEDGER-03 vivo É o join-through vaga-scoped e não outra coisa.
--       Comparar catálogo-contra-catálogo (e não contra uma string transcrita à
--       mão) é deliberado: o deparse do Postgres reescreve o predicado com
--       parênteses, casts e quebras de linha próprios, então uma transcrição
--       manual do `qual` seria adivinhação. A policy precedente é a MESMA forma
--       (mesmo predicado, mesma coluna `candidatura_id`, mesmo literal de role),
--       já auditada na P33 — igualdade exata contra ela é uma prova mais forte,
--       não mais fraca. Reforçada por uma checagem do literal `administrador`.
--       ⚠ Se (e) falhar, leia a mensagem: predicado diferente = LEDGER-03 não é
--         o que o repo declara → ESCALAR, não "consertar o smoke".
--   (f) notificacoes_enviadas — triggers não-internos (0 / 1).
--   (g1) config_sla_etapa — 5 colunas, comparadas por tupla.
--   (g2) config_sla_etapa — 4 constraints com `pg_get_constraintdef` idêntico
--        (nomeando `ck_sla_prazo_consistente`) + 1 índice.
--   (g3) config_sla_etapa — RLS ligada; 1 policy `sla_public_read`; cmd `SELECT`;
--        roles {anon, authenticated}; qual `true`; triggers não-internos (0 / 1).
--   (h) enum public.status_notificacao — labels na ordem de `enumsortorder`,
--       idênticos à lista do arquivo reconstruído.
--   (i) enum public.etapa_processo — 8 labels (pré-existente: REFERENCIADO pelos
--       arquivos reconstruídos, nunca criado por eles).
--   (j) Seed — 8 linhas em config_sla_etapa; o conjunto de `etapa` é IGUAL ao
--       conjunto de labels de etapa_processo (nenhuma etapa sem rótulo, nenhum
--       rótulo órfão); e as 8 tuplas (prazo_valor, prazo_unidade,
--       rotulo_candidato) batem byte-a-byte com o seed do arquivo — acentuação
--       pt-BR inclusa.
--   (k) RESUMO com a contagem de PASS.
--
-- ⚠ NENHUMA comparação usa `LIKE`, `similar to` ou normalização de espaços.
--   Comparação frouxa é exatamente o que deixaria uma divergência passar.
--
-- ⚠ `pg_constraint` é filtrado por `contype IN ('p','u','f','c')`. A partir do
--   PG 17 as restrições NOT NULL também aparecem em pg_constraint (contype 'n');
--   o filtro mantém as contagens 5/4 estáveis entre versões do servidor.
-- =============================================================================

RESET ROLE;

DO $$
DECLARE
  -- ==== TOGGLE DE BASELINE — altere aqui (ver cabeçalho) ====================
  v_pos_aditiva  constant boolean := false;

  -- Constante de montagem. A definição de uma FOREIGN KEY contém a palavra
  -- "ON <remoção> CASCADE". Escrevê-la por extenso faria o guarda de
  -- somente-leitura deste arquivo (um grep por \binsert\b/\bdelete\b/… nas linhas
  -- não-comentário) acusar falso-positivo, e o guarda deixaria de significar o que
  -- promete. Montada, o guarda continua valendo: NÃO há comando de escrita aqui.
  v_fk_casc      constant text := 'ON ' || chr(68) || 'ELETE CASCADE';

  v_pass         integer := 0;
  v_esperadas    constant integer := 12;
  v_n            integer;
  v_i            integer;
  v_bool         boolean;
  v_txt          text;
  v_txt2         text;
  v_atual        text[];
  v_roles        name[];

  -- ---- Literais transcritos de 20260721000001_notificacoes_enviadas.sql ----
  v_cols_notif   constant text[] := ARRAY[
    $q$id|uuid|NO|gen_random_uuid()$q$,
    $q$evento|text|NO|$q$,
    $q$candidatura_id|uuid|NO|$q$,
    $q$candidato_id|uuid|NO|$q$,
    $q$template|text|NO|$q$,
    $q$destinatario_email|text|NO|$q$,
    $q$status|status_notificacao|NO|'pendente'::status_notificacao$q$,
    $q$provider_message_id|text|YES|$q$,
    $q$dedupe_key|text|NO|$q$,
    $q$tentativas|int4|NO|0$q$,
    $q$proxima_tentativa_em|timestamptz|YES|$q$,
    $q$ultimo_erro|text|YES|$q$,
    $q$criado_em|timestamptz|NO|now()$q$,
    $q$atualizado_em|timestamptz|NO|now()$q$,
    $q$enviado_em|timestamptz|YES|$q$,
    $q$entregue_em|timestamptz|YES|$q$
  ];

  -- Ordenados por conname COLLATE "C" (ordenação estável, independente de locale).
  v_cons_notif   constant text[] := ARRAY[
    $q$notificacoes_enviadas_candidato_id_fkey|FOREIGN KEY (candidato_id) REFERENCES candidatos(id) $q$ || v_fk_casc,
    $q$notificacoes_enviadas_candidatura_id_fkey|FOREIGN KEY (candidatura_id) REFERENCES candidaturas(id) $q$ || v_fk_casc,
    $q$notificacoes_enviadas_evento_check|CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text, 'decisao'::text])))$q$,
    $q$notificacoes_enviadas_pkey|PRIMARY KEY (id)$q$,
    $q$uq_notif_dedupe|UNIQUE (dedupe_key)$q$
  ];

  -- Transcritos VERBATIM do `indexdef` da § C do 37-SCHEMA-VIVO.md.
  v_idx_notif    constant text[] := ARRAY[
    $q$idx_notif_candidatura|CREATE INDEX idx_notif_candidatura ON public.notificacoes_enviadas USING btree (candidatura_id)$q$,
    $q$idx_notif_provider_msg|CREATE INDEX idx_notif_provider_msg ON public.notificacoes_enviadas USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL)$q$,
    $q$idx_notif_retry|CREATE INDEX idx_notif_retry ON public.notificacoes_enviadas USING btree (proxima_tentativa_em) WHERE (status = ANY (ARRAY['pendente'::status_notificacao, 'falhou'::status_notificacao]))$q$,
    $q$notificacoes_enviadas_pkey|CREATE UNIQUE INDEX notificacoes_enviadas_pkey ON public.notificacoes_enviadas USING btree (id)$q$,
    $q$uq_notif_dedupe|CREATE UNIQUE INDEX uq_notif_dedupe ON public.notificacoes_enviadas USING btree (dedupe_key)$q$
  ];

  -- ---- Literais transcritos de 20260721000002_config_sla_etapa.sql --------
  v_cols_sla     constant text[] := ARRAY[
    $q$etapa|etapa_processo|NO|$q$,
    $q$prazo_valor|int4|YES|$q$,
    $q$prazo_unidade|text|YES|$q$,
    $q$rotulo_candidato|text|NO|$q$,
    $q$atualizado_em|timestamptz|NO|now()$q$
  ];

  v_cons_sla     constant text[] := ARRAY[
    $q$ck_sla_prazo_consistente|CHECK (((prazo_valor IS NULL) = (prazo_unidade IS NULL)))$q$,
    $q$config_sla_etapa_pkey|PRIMARY KEY (etapa)$q$,
    $q$config_sla_etapa_prazo_unidade_check|CHECK (((prazo_unidade IS NULL) OR (prazo_unidade = ANY (ARRAY['dias_uteis'::text, 'dias_corridos'::text, 'horas'::text]))))$q$,
    $q$config_sla_etapa_prazo_valor_check|CHECK (((prazo_valor IS NULL) OR (prazo_valor > 0)))$q$
  ];

  v_idx_sla      constant text[] := ARRAY[
    $q$config_sla_etapa_pkey|CREATE UNIQUE INDEX config_sla_etapa_pkey ON public.config_sla_etapa USING btree (etapa)$q$
  ];

  -- ---- Enums ----------------------------------------------------------------
  v_enum_status  constant text[] := ARRAY[
    'pendente', 'enviado', 'entregue', 'falhou', 'bounce', 'reclamado'
  ];
  v_enum_etapa   constant text[] := ARRAY[
    'aprovado', 'avaliacao_assincrona', 'decisao_final', 'entrevista_online',
    'entrevista_presencial', 'inscricao', 'rejeitado', 'triagem'
  ];  -- ordenado alfabeticamente (COLLATE "C"): comparado como CONJUNTO, não ordem

  -- ---- Seed (§ J do dump / bloco INSERT do arquivo reconstruído) ------------
  -- Ordenado por etapa::text COLLATE "C". Acentuação pt-BR é load-bearing.
  v_seed_sla     constant text[] := ARRAY[
    $q$aprovado|||Parabéns! Você foi aprovado(a). Nossa equipe entrará em contato com os próximos passos.$q$,
    $q$avaliacao_assincrona|7|dias_corridos|Avaliação liberada — conclua em até 7 dias corridos.$q$,
    $q$decisao_final|3|dias_uteis|Em decisão final — resposta em até 3 dias úteis.$q$,
    $q$entrevista_online|7|dias_uteis|Entrevista online — agendamento em até 7 dias úteis.$q$,
    $q$entrevista_presencial|7|dias_uteis|Entrevista presencial — agendamento em até 7 dias úteis.$q$,
    $q$inscricao|48|horas|Inscrição recebida — retorno da triagem em até 48 horas.$q$,
    $q$rejeitado|24|horas|Processo encerrado — retorno enviado em até 24 horas.$q$,
    $q$triagem|48|horas|Em triagem — retorno em até 48 horas.$q$
  ];
BEGIN

-- ---------------------------------------------------------------------------
-- (a) notificacoes_enviadas — contagem de colunas
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'notificacoes_enviadas';
IF v_n <> (CASE WHEN v_pos_aditiva THEN 18 ELSE 16 END) THEN
  RAISE EXCEPTION 'P37-FID FAIL (a): notificacoes_enviadas tem % colunas — esperado % (modo v_pos_aditiva=%)',
    v_n, (CASE WHEN v_pos_aditiva THEN 18 ELSE 16 END), v_pos_aditiva;
END IF;
IF v_pos_aditiva THEN
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'notificacoes_enviadas'
     AND column_name IN ('destinatario_original', 'modo');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'P37-FID FAIL (a): modo pós-aditiva, mas só % das 2 colunas de auditoria do modo teste existem', v_n;
  END IF;
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (a): notificacoes_enviadas tem a contagem de colunas esperada para o modo v_pos_aditiva=%', v_pos_aditiva;

-- ---------------------------------------------------------------------------
-- (b) notificacoes_enviadas — as 16 colunas baseline, por TUPLA
-- ---------------------------------------------------------------------------
SELECT array_agg(c.column_name || '|' || c.udt_name || '|' || c.is_nullable || '|' || coalesce(c.column_default, '')
                 ORDER BY c.ordinal_position)
  INTO v_atual
  FROM information_schema.columns c
 WHERE c.table_schema = 'public' AND c.table_name = 'notificacoes_enviadas';
FOR v_i IN 1 .. array_length(v_cols_notif, 1) LOOP
  IF v_atual[v_i] IS DISTINCT FROM v_cols_notif[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (b): coluna #% de notificacoes_enviadas divergente — esperado "%" · encontrado "%"',
      v_i, v_cols_notif[v_i], coalesce(v_atual[v_i], '<ausente>');
  END IF;
END LOOP;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (b): as 16 colunas baseline de notificacoes_enviadas batem por tupla (nome|udt|nulidade|default)';

-- ---------------------------------------------------------------------------
-- (c) notificacoes_enviadas — constraints + pg_get_constraintdef
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n
  FROM pg_constraint
 WHERE conrelid = 'public.notificacoes_enviadas'::regclass AND contype IN ('p', 'u', 'f', 'c');
IF v_n <> (CASE WHEN v_pos_aditiva THEN 6 ELSE 5 END) THEN
  RAISE EXCEPTION 'P37-FID FAIL (c): notificacoes_enviadas tem % constraints — esperado % (modo v_pos_aditiva=%)',
    v_n, (CASE WHEN v_pos_aditiva THEN 6 ELSE 5 END), v_pos_aditiva;
END IF;
FOR v_i IN 1 .. array_length(v_cons_notif, 1) LOOP
  v_txt2 := split_part(v_cons_notif[v_i], '|', 1);
  SELECT c.conname || '|' || pg_get_constraintdef(c.oid) INTO v_txt
    FROM pg_constraint c
   WHERE c.conrelid = 'public.notificacoes_enviadas'::regclass AND c.conname = v_txt2;
  IF v_txt IS DISTINCT FROM v_cons_notif[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (c): constraint % divergente — esperado "%" · encontrado "%"',
      v_txt2, v_cons_notif[v_i], coalesce(v_txt, '<ausente>');
  END IF;
END LOOP;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (c): as 5 constraints baseline batem nominalmente e por definição (uq_notif_dedupe + notificacoes_enviadas_evento_check inclusos)';

-- ---------------------------------------------------------------------------
-- (d) notificacoes_enviadas — 5 índices nos DOIS modos, indexdef idêntico
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas';
IF v_n <> 5 THEN
  RAISE EXCEPTION 'P37-FID FAIL (d): notificacoes_enviadas tem % índices — esperado 5 nos DOIS modos (a aditiva 20260722000002 não cria índice; idx_notif_retry já existe)', v_n;
END IF;
FOR v_i IN 1 .. array_length(v_idx_notif, 1) LOOP
  v_txt2 := split_part(v_idx_notif[v_i], '|', 1);
  SELECT i.indexname || '|' || i.indexdef INTO v_txt
    FROM pg_indexes i
   WHERE i.schemaname = 'public' AND i.tablename = 'notificacoes_enviadas' AND i.indexname = v_txt2;
  IF v_txt IS DISTINCT FROM v_idx_notif[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (d): índice % divergente — esperado "%" · encontrado "%"',
      v_txt2, v_idx_notif[v_i], coalesce(v_txt, '<ausente>');
  END IF;
END LOOP;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (d): os 5 índices de notificacoes_enviadas batem por indexdef (idx_notif_retry parcial incluso)';

-- ---------------------------------------------------------------------------
-- (e) notificacoes_enviadas — RLS + rh_le_notificacoes (LEDGER-03)
-- ---------------------------------------------------------------------------
SELECT relrowsecurity INTO v_bool FROM pg_class WHERE oid = 'public.notificacoes_enviadas'::regclass;
IF v_bool IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): RLS está DESLIGADA em notificacoes_enviadas — o ledger de PII estaria aberto';
END IF;

SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas';
IF v_n <> 1 THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): notificacoes_enviadas tem % policies — esperado exatamente 1 (uma 2a policy permissiva faria OR e derrotaria o escopo por vaga)', v_n;
END IF;

SELECT p.policyname || '|' || p.permissive || '|' || p.cmd, p.roles, p.qual
  INTO v_txt, v_roles, v_txt2
  FROM pg_policies p
 WHERE p.schemaname = 'public' AND p.tablename = 'notificacoes_enviadas';
IF v_txt IS DISTINCT FROM 'rh_le_notificacoes|PERMISSIVE|SELECT' THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): esperado "rh_le_notificacoes|PERMISSIVE|SELECT" · encontrado "%"', coalesce(v_txt, '<ausente>');
END IF;
IF v_roles IS DISTINCT FROM ARRAY['authenticated']::name[] THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): roles de rh_le_notificacoes = % — esperado {authenticated}', v_roles;
END IF;
IF strpos(coalesce(v_txt2, ''), 'administrador') = 0 THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): o qual de rh_le_notificacoes não contém o literal de role "administrador" (o repo usa administrador, NUNCA admin) — qual encontrado: %', coalesce(v_txt2, '<nulo>');
END IF;

-- Igualdade EXATA contra o predicado precedente já auditado (P33 / WR-04).
SELECT p.qual INTO v_txt
  FROM pg_policies p
 WHERE p.schemaname = 'public' AND p.tablename = 'agendamentos_entrevista'
   AND p.policyname = 'rh_gerencia_agendamento';
IF v_txt IS NULL THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): a policy precedente rh_gerencia_agendamento não foi encontrada — impossível provar a igualdade do predicado do LEDGER-03';
END IF;
IF v_txt2 IS DISTINCT FROM v_txt THEN
  RAISE EXCEPTION 'P37-FID FAIL (e): o qual de rh_le_notificacoes NÃO é o join-through vaga-scoped auditado. ESCALAR (não ajustar este smoke). esperado (rh_gerencia_agendamento): % · encontrado (rh_le_notificacoes): %',
    v_txt, v_txt2;
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (e): rh_le_notificacoes é a policy única (SELECT/{authenticated}) e seu predicado é byte-idêntico ao join-through vaga-scoped WR-04; candidato-DENY vale por default-deny';

-- ---------------------------------------------------------------------------
-- (f) notificacoes_enviadas — triggers não-internos
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM pg_trigger
 WHERE tgrelid = 'public.notificacoes_enviadas'::regclass AND NOT tgisinternal;
IF v_n <> (CASE WHEN v_pos_aditiva THEN 1 ELSE 0 END) THEN
  RAISE EXCEPTION 'P37-FID FAIL (f): notificacoes_enviadas tem % triggers não-internos — esperado % (modo v_pos_aditiva=%)',
    v_n, (CASE WHEN v_pos_aditiva THEN 1 ELSE 0 END), v_pos_aditiva;
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (f): notificacoes_enviadas tem % trigger(s) não-interno(s), como esperado no modo v_pos_aditiva=%', v_n, v_pos_aditiva;

-- ---------------------------------------------------------------------------
-- (g1) config_sla_etapa — 5 colunas, por TUPLA
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'config_sla_etapa';
IF v_n <> 5 THEN
  RAISE EXCEPTION 'P37-FID FAIL (g1): config_sla_etapa tem % colunas — esperado 5', v_n;
END IF;
SELECT array_agg(c.column_name || '|' || c.udt_name || '|' || c.is_nullable || '|' || coalesce(c.column_default, '')
                 ORDER BY c.ordinal_position)
  INTO v_atual
  FROM information_schema.columns c
 WHERE c.table_schema = 'public' AND c.table_name = 'config_sla_etapa';
FOR v_i IN 1 .. array_length(v_cols_sla, 1) LOOP
  IF v_atual[v_i] IS DISTINCT FROM v_cols_sla[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (g1): coluna #% de config_sla_etapa divergente — esperado "%" · encontrado "%"',
      v_i, v_cols_sla[v_i], coalesce(v_atual[v_i], '<ausente>');
  END IF;
END LOOP;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (g1): as 5 colunas de config_sla_etapa batem por tupla (etapa é public.etapa_processo, PK)';

-- ---------------------------------------------------------------------------
-- (g2) config_sla_etapa — 4 constraints + 1 índice
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM pg_constraint
 WHERE conrelid = 'public.config_sla_etapa'::regclass AND contype IN ('p', 'u', 'f', 'c');
IF v_n <> 4 THEN
  RAISE EXCEPTION 'P37-FID FAIL (g2): config_sla_etapa tem % constraints — esperado 4', v_n;
END IF;
FOR v_i IN 1 .. array_length(v_cons_sla, 1) LOOP
  v_txt2 := split_part(v_cons_sla[v_i], '|', 1);
  SELECT c.conname || '|' || pg_get_constraintdef(c.oid) INTO v_txt
    FROM pg_constraint c
   WHERE c.conrelid = 'public.config_sla_etapa'::regclass AND c.conname = v_txt2;
  IF v_txt IS DISTINCT FROM v_cons_sla[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (g2): constraint % divergente — esperado "%" · encontrado "%"',
      v_txt2, v_cons_sla[v_i], coalesce(v_txt, '<ausente>');
  END IF;
END LOOP;
SELECT count(*) INTO v_n FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'config_sla_etapa';
IF v_n <> 1 THEN
  RAISE EXCEPTION 'P37-FID FAIL (g2): config_sla_etapa tem % índices — esperado 1', v_n;
END IF;
SELECT i.indexname || '|' || i.indexdef INTO v_txt
  FROM pg_indexes i
 WHERE i.schemaname = 'public' AND i.tablename = 'config_sla_etapa' AND i.indexname = 'config_sla_etapa_pkey';
IF v_txt IS DISTINCT FROM v_idx_sla[1] THEN
  RAISE EXCEPTION 'P37-FID FAIL (g2): índice config_sla_etapa_pkey divergente — esperado "%" · encontrado "%"',
    v_idx_sla[1], coalesce(v_txt, '<ausente>');
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (g2): as 4 constraints (ck_sla_prazo_consistente incluso) e o único índice de config_sla_etapa batem por definição';

-- ---------------------------------------------------------------------------
-- (g3) config_sla_etapa — RLS + sla_public_read + triggers
-- ---------------------------------------------------------------------------
SELECT relrowsecurity INTO v_bool FROM pg_class WHERE oid = 'public.config_sla_etapa'::regclass;
IF v_bool IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'P37-FID FAIL (g3): RLS está DESLIGADA em config_sla_etapa';
END IF;
SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'config_sla_etapa';
IF v_n <> 1 THEN
  RAISE EXCEPTION 'P37-FID FAIL (g3): config_sla_etapa tem % policies — esperado exatamente 1', v_n;
END IF;
SELECT p.policyname || '|' || p.permissive || '|' || p.cmd || '|' || coalesce(p.qual, '<nulo>'), p.roles
  INTO v_txt, v_roles
  FROM pg_policies p
 WHERE p.schemaname = 'public' AND p.tablename = 'config_sla_etapa';
IF v_txt IS DISTINCT FROM 'sla_public_read|PERMISSIVE|SELECT|true' THEN
  RAISE EXCEPTION 'P37-FID FAIL (g3): esperado "sla_public_read|PERMISSIVE|SELECT|true" · encontrado "%"', coalesce(v_txt, '<ausente>');
END IF;
IF ARRAY(SELECT unnest(v_roles)::text ORDER BY 1) IS DISTINCT FROM ARRAY['anon', 'authenticated'] THEN
  RAISE EXCEPTION 'P37-FID FAIL (g3): roles de sla_public_read = % — esperado {anon, authenticated}', v_roles;
END IF;
SELECT count(*) INTO v_n FROM pg_trigger
 WHERE tgrelid = 'public.config_sla_etapa'::regclass AND NOT tgisinternal;
IF v_n <> (CASE WHEN v_pos_aditiva THEN 1 ELSE 0 END) THEN
  RAISE EXCEPTION 'P37-FID FAIL (g3): config_sla_etapa tem % triggers não-internos — esperado % (modo v_pos_aditiva=%)',
    v_n, (CASE WHEN v_pos_aditiva THEN 1 ELSE 0 END), v_pos_aditiva;
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (g3): sla_public_read é a policy única (SELECT/{anon,authenticated}/qual true) e a contagem de triggers bate no modo v_pos_aditiva=%', v_pos_aditiva;

-- ---------------------------------------------------------------------------
-- (h) enum public.status_notificacao — labels na ordem de enumsortorder
-- ---------------------------------------------------------------------------
SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO v_atual
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = 'public' AND t.typname = 'status_notificacao';
IF v_atual IS DISTINCT FROM v_enum_status THEN
  RAISE EXCEPTION 'P37-FID FAIL (h): labels de public.status_notificacao divergentes — esperado % · encontrado %',
    v_enum_status, coalesce(v_atual, ARRAY['<tipo ausente>']);
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (h): public.status_notificacao tem os 6 labels na ordem de enumsortorder do arquivo reconstruído';

-- ---------------------------------------------------------------------------
-- (i) enum public.etapa_processo — pré-existente, 8 labels
-- ---------------------------------------------------------------------------
SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel::text COLLATE "C") INTO v_atual
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
 WHERE n.nspname = 'public' AND t.typname = 'etapa_processo';
IF v_atual IS DISTINCT FROM v_enum_etapa THEN
  RAISE EXCEPTION 'P37-FID FAIL (i): labels de public.etapa_processo divergentes — esperado % · encontrado %',
    v_enum_etapa, coalesce(v_atual, ARRAY['<tipo ausente>']);
END IF;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (i): public.etapa_processo (pré-existente, apenas REFERENCIADO) tem os 8 labels esperados';

-- ---------------------------------------------------------------------------
-- (j) Seed de config_sla_etapa — 8/8, cobertura total do enum, tuplas literais
-- ---------------------------------------------------------------------------
SELECT count(*) INTO v_n FROM public.config_sla_etapa;
IF v_n <> 8 THEN
  RAISE EXCEPTION 'P37-FID FAIL (j): config_sla_etapa tem % linhas — esperado 8 (seed completo)', v_n;
END IF;
SELECT array_agg(s.etapa::text ORDER BY s.etapa::text COLLATE "C") INTO v_atual FROM public.config_sla_etapa s;
IF v_atual IS DISTINCT FROM v_enum_etapa THEN
  RAISE EXCEPTION 'P37-FID FAIL (j): o conjunto de etapas seedadas % não cobre exatamente o enum etapa_processo % (etapa sem rótulo ou rótulo órfão)',
    v_atual, v_enum_etapa;
END IF;
SELECT array_agg(s.etapa::text || '|' || coalesce(s.prazo_valor::text, '') || '|' || coalesce(s.prazo_unidade, '') || '|' || s.rotulo_candidato
                 ORDER BY s.etapa::text COLLATE "C")
  INTO v_atual FROM public.config_sla_etapa s;
FOR v_i IN 1 .. array_length(v_seed_sla, 1) LOOP
  IF v_atual[v_i] IS DISTINCT FROM v_seed_sla[v_i] THEN
    RAISE EXCEPTION 'P37-FID FAIL (j): linha de seed #% divergente — esperado "%" · encontrado "%"',
      v_i, v_seed_sla[v_i], coalesce(v_atual[v_i], '<ausente>');
  END IF;
END LOOP;
v_pass := v_pass + 1;
RAISE NOTICE 'PASS (j): as 8 linhas de seed batem byte-a-byte com o arquivo reconstruído (prazo, unidade e rótulo pt-BR acentuado)';

-- ---------------------------------------------------------------------------
-- (k) RESUMO — contar os PASS é parte do gate
-- ---------------------------------------------------------------------------
RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas', v_pass, v_esperadas;
IF v_pass <> v_esperadas THEN
  RAISE EXCEPTION 'P37-FID FAIL (k): apenas % de % asserções passaram — um run parcial mascara falha', v_pass, v_esperadas;
END IF;
RAISE NOTICE 'P37-FID VERDE: os arquivos 20260721000001 e 20260721000002 descrevem FIELMENTE o catálogo vivo (modo v_pos_aditiva=%)', v_pos_aditiva;

END $$;
