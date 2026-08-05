-- =============================================================================
-- Phase 45 / Plano 45-05 Task 3 — ESPEC EXECUTÁVEL do ERASE-01
-- (faixa etária materializada + k=5 COM supressão complementar · D-45-04/D-45-05)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply de `20260805000003_p45_bias_k5.sql`, deliberadamente
-- RED: a coluna e a função corrigida ainda não existem em PROD. Ele descreve o
-- que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema — é exatamente o
-- movimento que transforma um gate em decoração.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** —
-- nunca pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug
-- upstream anthropics/claude-code#13898). A chamada única é obrigatória por
-- motivo MECÂNICO: `set_config(..., false)` é escopado à SESSÃO, então statements
-- espalhados por chamadas separadas zerariam o contador `smoke45k.pass` e o
-- RESUMO (z) reprovaria um run que na verdade passou (lição da P41-05).
--
-- GATE VERDE = o contador `smoke45k.pass` bate **9** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 9 e o RESUMO reprova ALTO.
-- Esperado FIXO — não há metade adaptativa.
--
-- ⚠ E a lição W-1 da P43 morde AQUI com força. Num batch de chamada única, tudo
-- que vem depois do primeiro `RAISE` é INALCANÇÁVEL e, para quem lê a saída,
-- indistinguível de verde. Na P43 isso apagou 9 asserções. Por isso `K1`–`K3`
-- — as que provam o ERASE-01 propriamente dito — vêm ANTES de qualquer coisa
-- que possa abortar por outro motivo.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE ESCREVE — E TODA ESCRITA É REVERTIDA
-- -----------------------------------------------------------------------------
-- Diferente do `p43_previa_smoke.sql`, aqui não dá para provar o que precisa ser
-- provado sem escrever: com as contagens vivas de PROD (22 candidatos, 9
-- candidaturas, 1 `decisao_final`) QUASE TODA célula de bias fica abaixo de k=5,
-- e a fronteira entre "suprimir" e "publicar" nunca seria exercitada. Um smoke
-- que só olhasse o estado real passaria por VACUIDADE.
--
-- Toda escrita vive dentro de subtransação encerrada por `RAISE`, ou seja
-- **ROLLBACK** — fixture, DDL de desligamento de gatilho e linhas de snapshot são
-- desfeitos. Variáveis PL/pgSQL sobrevivem ao rollback, e por isso as asserções
-- rodam DEPOIS dele, sobre o payload capturado (idioma de
-- `p43_matriz_retencao_smoke.sql`, asserção (g)). A asserção `K9` transforma
-- "nada persistiu" de afirmação em MEDIÇÃO.
--
-- ⚠ Os gatilhos de usuário de `candidatos` e `candidaturas` são desligados DENTRO
-- da subtransação. Eles despacham webhook de n8n e análise de IA por
-- `net.http_post`; enfileirar despacho para linhas que serão revertidas é efeito
-- colateral desnecessário. `DISABLE TRIGGER USER` **não** desliga os gatilhos
-- internos de integridade referencial — as FKs continuam sendo checadas, e é isso
-- que mantém a fixture honesta.
--
-- -----------------------------------------------------------------------------
-- AS 9 ASSERÇÕES — quatro delas NEGATIVAS
-- -----------------------------------------------------------------------------
--   (K1) A coluna `candidatos.faixa_etaria_materializada` existe, é `text`, é
--        NULLABLE (NULL = "ainda não materializada", o estado de 100% das linhas
--        vivas) e tem CHECK de vocabulário fechado nas 5 faixas canônicas.
--   (K2) A PRECEDÊNCIA, não a presença. `pg_get_functiondef` contém
--        `COALESCE(ca.faixa_etaria_materializada, …)` com a coluna como PRIMEIRO
--        argumento, e a derivação por `data_nascimento` DEPOIS dela, no mesmo
--        `COALESCE`. Um teste que só procurasse o nome da coluna passaria com os
--        argumentos invertidos — e invertidos, a sentinela do tombstone é lida
--        como faixa real e a série muda retroativamente.
--   (K3) ⊕ ERASE-01, A ASSERÇÃO CENTRAL — SC#5. Com um candidato sintético:
--        roda o snapshot, materializa a faixa, escreve em `data_nascimento` a
--        MESMA sentinela que o tombstone de 45-07 vai escrever, roda de novo, e
--        exige que a COMPOSIÇÃO DA COORTE seja idêntica (mesmo conjunto de
--        faixas) e que `excluidos_sem_data` não tenha se mexido. É esta asserção
--        que prova que anonimizar não move a coorte de faixa, e ela roda cedo.
--   (K4) Supressão PRIMÁRIA (D-45-04): a faixa de 3 aparece com PRESENÇA
--        declarada e CONTAGEM oculta.
--   (K5) ⊖ Supressão COMPLEMENTAR — a metade sem a qual a primária não faz nada:
--        o total marginal `n_total` some do payload, uma segunda célula (a de
--        menor contagem entre as remanescentes) também é suprimida, e nenhuma
--        contagem publicada fica abaixo do limiar. Duas incógnitas para uma
--        equação: a subtração não isola célula nenhuma.
--   (K6) ⊖ Campos DERIVADOS de célula suprimida ausentes (`selection_rate`,
--        `razao_4_5`, `flag`, e a própria `faixa_referencia` quando ela é a
--        suprimida). Publicar a razão 4/5 de uma célula suprimida devolve a
--        contagem por outro caminho quando `selected` é pequeno.
--   (K7) `small_sample_warning` continua existindo, com o limiar 30 e como campo
--        DISTINTO do marcador de supressão (D-45-05): o < 30 é sinal estatístico,
--        o < 5 é controle de re-identificação. Não colapsam num só número.
--   (K8) ⊖ `proacl` de `gerar_bias_snapshot` não concede EXECUTE a `anon` nem a
--        PUBLIC; e ⊖ o guard recusa com 42501 tanto o papel errado quanto o
--        chamador SEM CLAIM NENHUMA. A segunda metade é a que fecha o defeito
--        sistêmico: um guard NULL-cego (`NOT IN`) avalia NULL, o `IF` não é
--        tomado, e ele falha ABERTO exatamente para o chamador mais suspeito.
--   (K9) ⊖ NEGATIVA E OBRIGATÓRIA — a contagem de `bias_audit_log` é IDÊNTICA
--        antes e depois do smoke, e nenhuma linha histórica dela foi alterada.
--   (z)  RESUMO — exige o total exato de 9 PASS. Run parcial falha AQUI.
--
-- =============================================================================
-- ⚠ SOBRE A ASSERÇÃO K8 E O `authenticated` — divergência DECLARADA do plano
-- =============================================================================
-- O plano 45-05 carrega, em `must_haves`, uma linha dizendo que a função "não é
-- executável por anon, authenticated nem PUBLIC" e, na ação da Task 2, a
-- instrução de "conceder de volta só ao papel que hoje a chama". As duas não
-- podem valer juntas. O chamador vivo é o cliente do navegador em
-- `src/features/admin/bias-audit/services/biasAuditService.ts:98`
-- (`supabase.rpc('gerar_bias_snapshot', …)`), que fala com o Postgres como
-- `authenticated`.
--
-- Revogar de `authenticated` não endureceria nada: apagaria a tela de auditoria
-- de viés do administrador. O controle real é o guard NULL-safe do corpo — que é
-- justamente o que a metade (K8.b) exercita, nas DUAS metades. É idêntico ao que
-- a `20260803000001:112-113` faz com `listar_matriz_retencao`, e ao que a
-- asserção (c) do `p43_previa_smoke.sql` assere para os wrappers chamados pela
-- tela: `anon` sem privilégio nenhum, `authenticated` COM EXECUTE.
--
-- Portanto K8 assere: `anon` ausente, PUBLIC ausente, `authenticated` PRESENTE.
-- Se a intenção do projeto mudar, muda-se a migration e ESTA asserção junto —
-- conscientemente, nunca por acomodação ao que foi aplicado.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada
-- é limpa explicitamente. Os NOTICEs carregam contagens, SQLSTATEs e nomes de
-- objeto — NUNCA PII e nunca o valor de um segredo. Nenhum e-mail é disparado:
-- este smoke não toca `notificacoes_enviadas` nem nenhuma Edge Function.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke45k.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — baseline de (K9). Zero escrita aqui.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_linhas bigint;
  v_hash   text;
BEGIN
  SELECT count(*) INTO v_linhas FROM public.bias_audit_log;

  -- Resumo do conteúdo histórico, não só da contagem: uma linha REESCRITA no
  -- lugar manteria a contagem e mudaria este md5.
  SELECT md5(COALESCE(string_agg(t.id::text || ':' || md5(t.dados::text), '|' ORDER BY t.id), ''))
    INTO v_hash
    FROM public.bias_audit_log t;

  PERFORM set_config('smoke45k.bias_linhas', v_linhas::text, false);
  PERFORM set_config('smoke45k.bias_hash',   v_hash,         false);

  RAISE NOTICE 'P45K FIXTURE ok: baseline da serie historica = % linha(s) em bias_audit_log', v_linhas;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K1) A COLUNA EXISTE, É `text`, É NULLABLE E TEM VOCABULÁRIO FECHADO.
--
--      Nullable é requisito, não descuido: NULL significa "ainda não
--      materializada", que é o estado de 100% das linhas vivas até o primeiro
--      tombstone — e é o que faz o `COALESCE` cair na derivação. Uma coluna
--      NOT NULL aqui exigiria backfill de toda a tabela antes de a fase começar.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_tipo     text;
  v_nullable text;
  v_check    text;
BEGIN
  SELECT c.data_type, c.is_nullable
    INTO v_tipo, v_nullable
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name   = 'candidatos'
     AND c.column_name  = 'faixa_etaria_materializada';

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K1): public.candidatos.faixa_etaria_materializada NAO existe — a migration 20260805000003 nao foi aplicada, e sem essa coluna o tombstone de 45-07 destroi a serie EEOC 4/5 permanentemente (restricao de ordenacao numero 1 do ROADMAP)';
  END IF;
  IF v_tipo <> 'text' THEN
    RAISE EXCEPTION 'P45K FAIL (K1): faixa_etaria_materializada e % , esperado text', v_tipo;
  END IF;
  IF v_nullable <> 'YES' THEN
    RAISE EXCEPTION 'P45K FAIL (K1): faixa_etaria_materializada e NOT NULL — NULL e o valor que significa "ainda nao materializada", e sem ele o COALESCE nao tem como cair na derivacao';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_check
    FROM pg_constraint
   WHERE conrelid = 'public.candidatos'::regclass
     AND contype  = 'c'
     AND conname  = 'check_faixa_etaria_materializada';

  IF v_check IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K1): nao existe CHECK de vocabulario na coluna — uma coluna text livre alimentando um relatorio publicado aceita qualquer string e inventa faixas novas no payload';
  END IF;
  IF v_check NOT LIKE '%18-24%' OR v_check NOT LIKE '%55+%' THEN
    RAISE EXCEPTION 'P45K FAIL (K1): a CHECK nao fecha o vocabulario nas 5 faixas canonicas: %', v_check;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K1): coluna text NULLABLE com vocabulario fechado (%)', v_check;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K2) A PRECEDÊNCIA DO `COALESCE` — o mecanismo, não o nome.
--
--      Esta é a asserção que um teste ingênuo erra. Procurar
--      `faixa_etaria_materializada` no corpo passa com os argumentos INVERTIDOS,
--      e invertidos a coluna nunca é usada: `data_nascimento` é NOT NULL com
--      CHECK (< CURRENT_DATE), então a derivação SEMPRE devolve uma faixa e o
--      COALESCE nunca chega no segundo argumento. A sentinela do tombstone
--      viraria uma faixa etária real, em silêncio.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.gerar_bias_snapshot(text)'::regprocedure);

  IF v_def !~ 'COALESCE\(\s*ca\.faixa_etaria_materializada' THEN
    RAISE EXCEPTION 'P45K FAIL (K2): a coluna materializada NAO e o PRIMEIRO argumento do COALESCE da coorte. Com os argumentos invertidos a coluna e inalcancavel (data_nascimento e NOT NULL, logo a derivacao nunca devolve NULL) e a sentinela do tombstone e lida como faixa real';
  END IF;

  IF v_def !~ 'COALESCE\(\s*ca\.faixa_etaria_materializada\s*,.*?data_nascimento' THEN
    RAISE EXCEPTION 'P45K FAIL (K2): a derivacao por data_nascimento nao esta DENTRO do mesmo COALESCE, depois da coluna — sem o fallback, todo candidato ainda nao anonimizado sai da coorte';
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K2): COALESCE com a coluna materializada NA FRENTE e a derivacao como fallback';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K3) ⊕ ERASE-01 / SC#5 — ANONIMIZAR NÃO MOVE A COORTE DE FAIXA.
--
--      Roda o snapshot ANTES e DEPOIS de materializar a faixa e escrever em
--      `data_nascimento` a sentinela do tombstone, e exige que a COMPOSIÇÃO da
--      coorte seja a mesma. A sentinela usada aqui (1900-01-01) cai na faixa
--      `55+` se for derivada — então uma inversão do COALESCE aparece como uma
--      faixa que surgiu e outra que sumiu, e a asserção reprova.
--
--      E exige que `excluidos_sem_data` não se mexa: antes desta migration o
--      contador era `idade IS NULL OR idade < 18`, e o titular anonimizado
--      cairia lá dentro — mudando o denominador da série retroativamente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_vaga        uuid;
  v_ator        uuid;
  v_uid         uuid;
  v_cid         uuid;
  v_caid        uuid;
  v_faixas_1    text[];
  v_faixas_2    text[];
  v_excl_1      int;
  v_excl_2      int;
  v_dados       jsonb;
BEGIN
  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.id LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K3): nenhuma vaga viva — a fixture nao pode ser montada, e sem fixture esta assercao passaria por VACUIDADE (a coorte real de PROD tem 1 linha)';
  END IF;

  BEGIN
    ALTER TABLE public.candidatos   DISABLE TRIGGER USER;
    ALTER TABLE public.candidaturas DISABLE TRIGGER USER;

    -- Ator humano sintetico: decisao_final.por_usuario e NOT NULL — guardrail
    -- estrutural de zero-auto-rejeicao (LGPD-02 / RNF-07a).
    v_ator := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, created_at, updated_at)
    VALUES (v_ator, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', now(), now());

    v_uid  := gen_random_uuid();
    v_cid  := gen_random_uuid();
    v_caid := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, created_at, updated_at)
    VALUES (v_uid, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', now(), now());

    -- ~30 anos => faixa 25-34 pela derivacao. Sentinelas que passam nas 7 CHECK
    -- vivas de candidatos (SONDA 1b de 45-SONDAS-PROD.md).
    INSERT INTO public.candidatos
      (id, user_id, nome_completo, email, celular, cidade, estado, data_nascimento)
    VALUES
      (v_cid, v_uid, 'FIXTURE P45-05 K3',
       'fixture-p45k3-' || replace(v_cid::text, '-', '') || '@example.invalid',
       '(11) 90000-0000', 'Sao Paulo', 'SP', (CURRENT_DATE - (30 * 365 + 200))::date);

    INSERT INTO public.candidaturas (id, candidato_id, vaga_id) VALUES (v_caid, v_cid, v_vaga);

    INSERT INTO public.decisao_final (candidatura_id, decisao, justificativa, por_usuario)
    VALUES (v_caid, 'aprovado'::public.decisao_final_resultado,
            'Fixture sintetica do smoke p45_bias_k5 (K3, SC#5); revertida pelo RAISE ao final desta subtransacao.',
            v_ator);

    PERFORM set_config('request.jwt.claims',
      json_build_object('app_metadata', json_build_object('role', 'administrador'))::text, false);

    -- (1) ANTES da anonimizacao
    SELECT g.dados INTO v_dados FROM public.gerar_bias_snapshot('SMOKE-K3-ANTES') g;
    SELECT array_agg(b ->> 'faixa' ORDER BY b ->> 'faixa') INTO v_faixas_1
      FROM jsonb_array_elements(v_dados -> 'bands') b;
    v_excl_1 := (v_dados ->> 'excluidos_sem_data')::int;

    -- (2) O TOMBSTONE, NA ORDEM OBRIGATORIA: materializa a faixa PRIMEIRO, e so
    --     entao destroi data_nascimento. A ordem inversa e a corrupcao permanente
    --     que a restricao numero 1 do ROADMAP nomeia.
    UPDATE public.candidatos SET faixa_etaria_materializada = '25-34' WHERE id = v_cid;
    UPDATE public.candidatos SET data_nascimento = DATE '1900-01-01'  WHERE id = v_cid;

    -- (3) DEPOIS da anonimizacao
    SELECT g.dados INTO v_dados FROM public.gerar_bias_snapshot('SMOKE-K3-DEPOIS') g;
    SELECT array_agg(b ->> 'faixa' ORDER BY b ->> 'faixa') INTO v_faixas_2
      FROM jsonb_array_elements(v_dados -> 'bands') b;
    v_excl_2 := (v_dados ->> 'excluidos_sem_data')::int;

    PERFORM set_config('request.jwt.claims', '', false);

    RAISE EXCEPTION 'rollback_smoke45k_k3' USING ERRCODE = 'P45K3';
  EXCEPTION
    WHEN sqlstate 'P45K3' THEN
      NULL;  -- reversao esperada; as variaveis abaixo sobreviveram
  END;

  IF v_faixas_1 IS NULL OR v_faixas_2 IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K3): o snapshot nao devolveu faixas em uma das duas execucoes — a funcao nao COMPLETOU o caminho feliz';
  END IF;
  IF NOT ('25-34' = ANY (v_faixas_1)) THEN
    RAISE EXCEPTION 'P45K FAIL (K3): o candidato sintetico de ~30 anos nao caiu em 25-34 ANTES da anonimizacao (faixas: %) — a fixture nao esta medindo o que promete', v_faixas_1;
  END IF;
  IF v_faixas_2 IS DISTINCT FROM v_faixas_1 THEN
    RAISE EXCEPTION 'P45K FAIL (K3): a COMPOSICAO DA COORTE mudou por causa da anonimizacao. Antes: %. Depois: %. A sentinela 1900-01-01 esta sendo lida como faixa etaria real (55+), ou seja o COALESCE nao tem a coluna materializada na frente — e a serie EEOC 4/5 acabou de mudar RETROATIVAMENTE, que e exatamente o que o SC#5 proibe', v_faixas_1, v_faixas_2;
  END IF;
  IF v_excl_2 IS DISTINCT FROM v_excl_1 THEN
    RAISE EXCEPTION 'P45K FAIL (K3): excluidos_sem_data saiu de % para % depois da anonimizacao — a linha com tombstone entrou no contador de excluidos e mudou o denominador da serie. Ela TEM faixa conhecida e permanece na coorte', v_excl_1, v_excl_2;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K3): coorte IDENTICA antes e depois do tombstone (%), excluidos_sem_data inalterado em % — anonimizar nao move a coorte de faixa (SC#5). Tudo revertido.', v_faixas_1, v_excl_1;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE DA COORTE POPULADA — construída UMA vez, revertida, e o payload
-- capturado num GUC para que `K4`–`K7` a leiam sem reconstruí-la quatro vezes.
--
-- TRÊS faixas (3 · 12 · 7), não duas, e a razão é a diferença entre um teste e
-- uma decoração: com apenas duas faixas a regra complementar degenera —
-- suprime-se a de 3 e, como só resta uma, suprime-se ela também. Nada é
-- publicado, e `K5` passaria por VACUIDADE. Com três sobra uma faixa publicada e
-- duas escondidas, que é a forma em que a supressão complementar de fato morde.
--
-- ⚠ O `set_config` do payload roda DEPOIS do rollback, de propósito: um
-- `set_config` executado dentro da subtransação seria desfeito junto com ela.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_vaga   uuid;
  v_ator   uuid;
  v_uid    uuid;
  v_cid    uuid;
  v_caid   uuid;
  v_dados  jsonb;
  v_b      int;
  v_i      int;
  v_qtdes  int[]  := ARRAY[3, 12, 7];
  v_idades int[]  := ARRAY[20, 30, 40];
BEGIN
  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.id LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (fixture da coorte): nenhuma vaga viva — sem coorte populada as assercoes K4-K7 passariam por vacuidade, que e o defeito que este arquivo existe para nao ter';
  END IF;

  BEGIN
    ALTER TABLE public.candidatos   DISABLE TRIGGER USER;
    ALTER TABLE public.candidaturas DISABLE TRIGGER USER;

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

        INSERT INTO public.candidatos
          (id, user_id, nome_completo, email, celular, cidade, estado, data_nascimento)
        VALUES
          (v_cid, v_uid, 'FIXTURE P45-05 coorte',
           'fixture-p45c-' || replace(v_cid::text, '-', '') || '@example.invalid',
           '(11) 90000-0000', 'Sao Paulo', 'SP',
           (CURRENT_DATE - (v_idades[v_b] * 365 + 200))::date);

        INSERT INTO public.candidaturas (id, candidato_id, vaga_id) VALUES (v_caid, v_cid, v_vaga);

        INSERT INTO public.decisao_final (candidatura_id, decisao, justificativa, por_usuario)
        VALUES (v_caid,
                (CASE WHEN v_i = 1 THEN 'aprovado' ELSE 'rejeitado' END)::public.decisao_final_resultado,
                'Fixture sintetica do smoke p45_bias_k5 (coorte 3/12/7); revertida pelo RAISE ao final desta subtransacao.',
                v_ator);
      END LOOP;
    END LOOP;

    PERFORM set_config('request.jwt.claims',
      json_build_object('app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT g.dados INTO v_dados FROM public.gerar_bias_snapshot('SMOKE-COORTE-3-12-7') g;

    PERFORM set_config('request.jwt.claims', '', false);

    RAISE EXCEPTION 'rollback_smoke45k_coorte' USING ERRCODE = 'P45KC';
  EXCEPTION
    WHEN sqlstate 'P45KC' THEN
      NULL;  -- reversao esperada
  END;

  IF v_dados IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (fixture da coorte): gerar_bias_snapshot nao devolveu payload sobre a coorte 3/12/7 — a funcao nao COMPLETOU';
  END IF;

  PERFORM set_config('smoke45k.payload', v_dados::text, false);
  RAISE NOTICE 'P45K fixture da coorte ok: payload 3/12/7 capturado e fixture revertida';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K4) SUPRESSÃO PRIMÁRIA — presença declarada, contagem oculta.
--
--      Some o NÚMERO, não o FATO de a faixa existir. Uma faixa que desaparece do
--      relatório é uma afirmação diferente (e falsa): a de que não há ninguém ali.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_dados jsonb := current_setting('smoke45k.payload')::jsonb;
  v_banda jsonb;
BEGIN
  SELECT b INTO v_banda
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE b ->> 'faixa' = '18-24';

  IF v_banda IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K4): a faixa 18-24 SUMIU do payload. D-45-04 manda ocultar a CONTAGEM, nao a PRESENCA — apagar a faixa afirma que nao ha ninguem ali, o que e falso';
  END IF;
  IF (v_banda ->> 'suprimida') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'P45K FAIL (K4): a faixa 18-24 (3 candidatos sinteticos) NAO esta marcada como suprimida — o limiar k=5 nao esta em vigor: %', v_banda::text;
  END IF;
  IF jsonb_exists(v_banda, 'applicants') OR jsonb_exists(v_banda, 'selected') THEN
    RAISE EXCEPTION 'P45K FAIL (K4): a celula suprimida ainda publica a contagem (%) — a supressao esta so no rotulo', v_banda::text;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K4): faixa 18-24 presente e sem contagem (%)', v_banda::text;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K5) ⊖ SUPRESSÃO COMPLEMENTAR — a metade sem a qual a primária não faz nada.
--
--      A ARITMÉTICA, explicitamente: o payload publicava `bands[]` com
--      `applicants` por faixa MAIS `n_total`. Com essas duas coisas, quem lê faz
--      `n_total − Σ(publicados)` e recupera a célula escondida inteira. É o
--      ataque canônico por totais marginais, e ele derrota k=5 sozinho.
--
--      A não-recuperação exige DUAS coisas juntas, e é isso que se assere aqui:
--        (a) nenhum total marginal publicado — `n_total` fora do payload; e
--        (b) DUAS células escondidas, não uma. Com uma só, qualquer total que o
--            leitor obtenha por fora isola a célula. Com duas, a mesma subtração
--            devolve apenas a SOMA das duas: uma equação, duas incógnitas.
--      E (c): nenhuma contagem publicada abaixo do limiar — se sobrasse uma, a
--      supressão teria deixado passar exatamente o que existe para esconder.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_dados       jsonb := current_setting('smoke45k.payload')::jsonb;
  v_escondidas  int;
  v_complement  int;
  v_soma_pub    int;
  v_min_pub     int;
BEGIN
  -- (a) o total marginal saiu do payload
  IF jsonb_exists(v_dados, 'n_total') THEN
    RAISE EXCEPTION 'P45K FAIL (K5.a): existe supressao primaria e o total marginal continua publicado (n_total = %). O leitor subtrai a soma das faixas publicadas e recupera a celula escondida inteira — suprimir a celula sem suprimir o complemento NAO SUPRIME NADA', v_dados ->> 'n_total';
  END IF;
  IF (v_dados ->> 'supressao_complementar_aplicada') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'P45K FAIL (K5.a): o payload nao declara que a supressao complementar foi aplicada, com a coorte 3/12/7 que garante supressao primaria: %', v_dados::text;
  END IF;

  SELECT count(*) INTO v_escondidas
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'suprimida') = 'true';

  SELECT count(*) INTO v_complement
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'motivo_supressao') = 'complementar';

  SELECT COALESCE(sum((b ->> 'applicants')::int), 0),
         COALESCE(min((b ->> 'applicants')::int), 999999)
    INTO v_soma_pub, v_min_pub
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'suprimida') = 'false';

  -- (b) duas incognitas para uma equacao
  IF v_escondidas < 2 THEN
    RAISE EXCEPTION 'P45K FAIL (K5.b): apenas % celula(s) escondida(s). Com uma so, qualquer total obtido por fora isola a celula por subtracao. A supressao complementar existe para que a mesma conta devolva a SOMA de duas celulas, nunca uma', v_escondidas;
  END IF;
  IF v_complement <> 1 THEN
    RAISE EXCEPTION 'P45K FAIL (K5.b): esperava EXATAMENTE 1 celula suprimida por regra complementar (a de menor contagem entre as remanescentes), encontrei %. Zero significa que a regra nao rodou; mais de uma significa que ela nao esta ancorada no minimo', v_complement;
  END IF;

  -- (c) nenhuma contagem publicada abaixo do limiar
  IF v_min_pub < 5 THEN
    RAISE EXCEPTION 'P45K FAIL (K5.c): existe contagem PUBLICADA abaixo do limiar k=5 (menor publicada = %) — a supressao primaria deixou passar exatamente o que existe para esconder', v_min_pub;
  END IF;
  IF v_soma_pub = 3 THEN
    RAISE EXCEPTION 'P45K FAIL (K5.c): a soma dos applicants publicados (%) coincide com a contagem que deveria estar escondida', v_soma_pub;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K5): sem total marginal, % celulas escondidas (1 complementar), % applicants publicados, menor publicada = % — a subtracao nao isola celula nenhuma', v_escondidas, v_soma_pub, v_min_pub;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K6) ⊖ NENHUM CAMPO DERIVADO DE CÉLULA SUPRIMIDA É PUBLICADO.
--
--      `selection_rate` é `selected/applicants`; `razao_4_5` é
--      `selection_rate/ref_rate`. Publicar qualquer um deles para uma célula
--      suprimida devolve a contagem por divisão quando `selected` é pequeno — e
--      `selected` pequeno é justamente o caso da célula que se quis esconder.
--      E se a `faixa_referencia` for a suprimida, a razão 4/5 do relatório
--      INTEIRO cai: não existe razão 4/5 honesta sobre um denominador que não
--      pode ser publicado.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_dados   jsonb := current_setting('smoke45k.payload')::jsonb;
  v_ofensor text;
  v_ref_sup boolean;
  v_vazados int;
BEGIN
  SELECT string_agg(b::text, ' | ') INTO v_ofensor
    FROM jsonb_array_elements(v_dados -> 'bands') b
   WHERE (b ->> 'suprimida') = 'true'
     AND (jsonb_exists(b, 'applicants') OR jsonb_exists(b, 'selected')
          OR jsonb_exists(b, 'selection_rate') OR jsonb_exists(b, 'razao_4_5')
          OR jsonb_exists(b, 'flag'));

  IF v_ofensor IS NOT NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K6): celula suprimida viajando com campo derivado — %. A taxa e a razao 4/5 devolvem a contagem por divisao quando selected e pequeno, que e exatamente o caso da celula escondida', v_ofensor;
  END IF;

  v_ref_sup := COALESCE((v_dados ->> 'faixa_referencia_suprimida')::boolean, false);

  IF v_ref_sup AND jsonb_exists(v_dados, 'faixa_referencia') THEN
    RAISE EXCEPTION 'P45K FAIL (K6): a faixa_referencia esta suprimida e mesmo assim e publicada — nomear a faixa de MAIOR taxa de selecao entre as escondidas e informacao sobre a celula escondida';
  END IF;

  IF v_ref_sup THEN
    SELECT count(*) INTO v_vazados
      FROM jsonb_array_elements(v_dados -> 'bands') b
     WHERE jsonb_exists(b, 'razao_4_5') OR jsonb_exists(b, 'flag');
    IF v_vazados > 0 THEN
      RAISE EXCEPTION 'P45K FAIL (K6): a faixa_referencia esta suprimida e % faixa(s) ainda publicam razao_4_5/flag — nao existe razao 4/5 honesta sobre um denominador impublicavel, e rate/razao devolve o ref_rate por divisao', v_vazados;
    END IF;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K6): zero campo derivado em celula suprimida; faixa_referencia_suprimida = %', v_ref_sup;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K7) `small_sample_warning` CONTINUA SEPARADO, COM O LIMIAR 30 (D-45-05).
--
--      Os dois sinais parecem o mesmo campo e não são: o < 30 é ESTATÍSTICO (a
--      razão 4/5 é instável em amostra pequena e o relatório precisa dizer isso),
--      o < 5 é controle de RE-IDENTIFICAÇÃO. Colapsá-los num só número perde uma
--      das duas afirmações — e a próxima pessoa que ler o código vai querer
--      unificá-los. Esta asserção é o que torna a unificação um ato consciente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_dados jsonb := current_setting('smoke45k.payload')::jsonb;
  v_def   text;
BEGIN
  IF NOT jsonb_exists(v_dados, 'small_sample_warning') THEN
    RAISE EXCEPTION 'P45K FAIL (K7): small_sample_warning sumiu do payload — o sinal estatistico foi colapsado no controle de re-identificacao, e o relatorio deixou de avisar que a razao 4/5 e instavel';
  END IF;
  IF (v_dados ->> 'limiar_small_sample') IS DISTINCT FROM '30' THEN
    RAISE EXCEPTION 'P45K FAIL (K7): o limiar do small_sample_warning e %, esperado 30 (D-45-05 manda manter INALTERADO)', v_dados ->> 'limiar_small_sample';
  END IF;
  IF (v_dados ->> 'k_supressao') IS DISTINCT FROM '5' THEN
    RAISE EXCEPTION 'P45K FAIL (K7): k_supressao e %, esperado 5 (D-45-04)', v_dados ->> 'k_supressao';
  END IF;
  IF (v_dados ->> 'limiar_small_sample') = (v_dados ->> 'k_supressao') THEN
    RAISE EXCEPTION 'P45K FAIL (K7): os dois limiares colapsaram num so numero — sao coisas diferentes e o payload tem de carregar as duas';
  END IF;

  v_def := pg_get_functiondef('public.gerar_bias_snapshot(text)'::regprocedure);
  IF v_def !~ 'applicants\s*<\s*30' THEN
    RAISE EXCEPTION 'P45K FAIL (K7): o corpo nao contem mais o predicado do limiar 30 — o campo pode estar sendo publicado sem ninguem o calcular';
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K7): small_sample_warning = % com limiar 30, distinto do k_supressao 5', v_dados ->> 'small_sample_warning';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K8) ⊖ `proacl` SEM `anon` E SEM PUBLIC · ⊖ GUARD RECUSA AS DUAS METADES.
--
--      `REVOKE ALL … FROM PUBLIC` sozinho NÃO remove o grant que o
--      `pg_default_acl` de `public` concede a `anon` — ele é direto e nomeado
--      (medido na P42-06: 61 funções DEFINER com EXECUTE para anon). PUBLIC é
--      `grantee = 0` em `aclexplode` e não aparece num JOIN com `pg_roles`, por
--      isso é checado separadamente.
--
--      `authenticated` DEVE ter EXECUTE — ver o bloco de divergência declarada no
--      cabeçalho. O controle não é o ACL, é o guard; e a metade (b) é a que fecha
--      o defeito sistêmico, porque um guard NULL-cego passa pela primeira metade
--      em verde e falha ABERTO para quem chega sem claim nenhuma.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_acl     aclitem[];
  v_ofensor text;
  v_ok      int := 0;
BEGIN
  SELECT p.proacl INTO v_acl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'gerar_bias_snapshot';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'P45K FAIL (K8): public.gerar_bias_snapshot NAO existe';
  END IF;
  IF v_acl IS NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K8): proacl NULO — nenhum REVOKE explicito esta em vigor, logo o pg_default_acl do schema (que concede EXECUTE a anon como grant DIRETO em todo CREATE FUNCTION) governa, e o relatorio de desfecho de selecao esta chamavel por papel anonimo via PostgREST';
  END IF;

  SELECT string_agg(coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type, ', ')
    INTO v_ofensor
    FROM aclexplode(v_acl) a
    LEFT JOIN pg_roles g ON g.oid = a.grantee
   WHERE a.grantee = 0 OR g.rolname = 'anon';

  IF v_ofensor IS NOT NULL THEN
    RAISE EXCEPTION 'P45K FAIL (K8.a): gerar_bias_snapshot concede privilegio a papel anonimo/PUBLIC (%) — o REVOKE precisa NOMEAR anon, nao apenas PUBLIC', v_ofensor;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM aclexplode(v_acl) a JOIN pg_roles g ON g.oid = a.grantee
     WHERE g.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'P45K FAIL (K8.a): authenticated NAO tem EXECUTE — a tela de auditoria de vies do administrador (biasAuditService.ts) deixaria de conseguir gerar snapshot. O controle e o guard do corpo, nao o ACL';
  END IF;

  -- (b.1) papel `rh` — papel REAL deste sistema, e nao administrador.
  PERFORM set_config('request.jwt.claims',
    json_build_object('app_metadata', json_build_object('role', 'rh'))::text, false);
  BEGIN
    PERFORM public.gerar_bias_snapshot('SMOKE-K8-RH');
    RAISE EXCEPTION 'P45K FAIL (K8.b.1): gerar_bias_snapshot ACEITOU chamada com papel rh — qualquer recrutador gera e le o relatorio de adverse impact'
      USING ERRCODE = 'P45K8';
  EXCEPTION
    WHEN sqlstate 'P45K8' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  -- (b.2) SEM CLAIM NENHUMA. auth.jwt() resolve NULL e o guard tem de recusar
  --       mesmo assim. E a metade que um `NOT IN` deixa passar.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);
  BEGIN
    PERFORM public.gerar_bias_snapshot('SMOKE-K8-SEM-CLAIM');
    RAISE EXCEPTION 'P45K FAIL (K8.b.2): gerar_bias_snapshot ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO. Trocar IS DISTINCT FROM por NOT IN reintroduz exatamente este defeito'
      USING ERRCODE = 'P45K9';
  EXCEPTION
    WHEN sqlstate 'P45K9' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ok <> 2 THEN
    RAISE EXCEPTION 'P45K FAIL (K8.b): apenas % de 2 recusas ocorreram com 42501 (papel rh + sem claim)', v_ok;
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K8): anon e PUBLIC sem privilegio, authenticated com EXECUTE, e as duas metades do guard recusaram com 42501 (proacl = %)', v_acl::text;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (K9) ⊖ NEGATIVA E OBRIGATÓRIA — A SÉRIE HISTÓRICA NÃO FOI TOCADA.
--
--      A metade dinâmica do SC#5. `K3` e a fixture da coorte EXECUTARAM o
--      snapshot quatro vezes, e cada execução faz um INSERT: se qualquer uma
--      tivesse escapado do `ROLLBACK`, a contagem apareceria aqui. E o md5 do
--      conteúdo cobre o outro modo de falha: uma linha REESCRITA no lugar
--      manteria a contagem e mudaria o resumo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_antes  bigint := current_setting('smoke45k.bias_linhas')::bigint;
  v_hash_a text   := current_setting('smoke45k.bias_hash');
  v_agora  bigint;
  v_hash_b text;
BEGIN
  SELECT count(*) INTO v_agora FROM public.bias_audit_log;
  SELECT md5(COALESCE(string_agg(t.id::text || ':' || md5(t.dados::text), '|' ORDER BY t.id), ''))
    INTO v_hash_b
    FROM public.bias_audit_log t;

  IF v_agora <> v_antes THEN
    RAISE EXCEPTION 'P45K FAIL (K9): bias_audit_log saiu de % para % linhas durante o smoke — alguma execucao de snapshot escapou da subtransacao revertida e a serie historica ganhou linha de fixture', v_antes, v_agora;
  END IF;
  IF v_hash_b IS DISTINCT FROM v_hash_a THEN
    RAISE EXCEPTION 'P45K FAIL (K9): a contagem de bias_audit_log nao mudou mas o CONTEUDO mudou — alguma linha historica foi reescrita. O SC#5 promete que as linhas ja gravadas permanecem intactas, e nao ha FK dessa tabela para candidatos que justificasse isso';
  END IF;

  PERFORM set_config('smoke45k.pass', (coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P45K PASS (K9): % linha(s) em bias_audit_log, conteudo byte-identico apos 4 execucoes de snapshot revertidas', v_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO em 9. Run parcial falha AQUI.
--
--     O gate NÃO é "não levantou exceção". Num batch de chamada única, tudo
--     depois do primeiro `RAISE` é inalcançável e some da saída sem deixar
--     rastro de reprovação — foi assim que a P43 perdeu 9 asserções (lição W-1).
--     O contador é o que transforma silêncio em falha.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_asserts  int;
  v_esperado int := 9;
BEGIN
  v_asserts := coalesce(nullif(current_setting('smoke45k.pass', true), ''), '0')::int;
  IF v_asserts <> 9 THEN
    RAISE EXCEPTION 'P45K FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_asserts, v_esperado;
  END IF;
  RAISE NOTICE 'P45K RESUMO: % assercoes PASS de % esperadas — gate VERDE', v_asserts, v_esperado;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
