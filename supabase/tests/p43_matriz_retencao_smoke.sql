-- =============================================================================
-- Phase 43 / Plano 43-04 Task 3 — ESPEC EXECUTÁVEL da matriz de retenção
-- (RETEN-01 · RETEN-02 · BD-1)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply de `20260801000002_p43_config_retencao.sql`, deliberadamente
-- RED: a tabela e as duas funções ainda não existem em PROD. Ele descreve o que a
-- migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema, não resolvê-lo — é
-- exatamente o movimento que transforma um gate em decoração.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo MECÂNICO:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke43m.pass` e o RESUMO (z) reprovaria um
-- run que na verdade passou (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke43m.pass` bate **11** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial (asserção pulada por erro de ambiente)
-- acumularia < 11 e o RESUMO reprova ALTO. Esperado FIXO — não há metade adaptativa.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE ESCREVE — E DESFAZ TUDO QUE ESCREVE, POR CONSTRUÇÃO
-- -----------------------------------------------------------------------------
-- As asserções (d), (e), (f) e (g) executam `UPDATE`s REAIS em
-- `public.config_retencao_etapa` e uma chamada REAL a `salvar_janela_retencao` (que
-- escreve em `logs_auditoria`), todas dentro de subtransações SEMPRE revertidas
-- (idioma `RAISE EXCEPTION` com SQLSTATE próprio, capturado logo acima).
--
-- Provar o `CHECK` e o guard por EXECUÇÃO em vez de por leitura de
-- `pg_get_constraintdef` / `pg_get_functiondef` é deliberado: a definição conta o que
-- o objeto DIZ; o `UPDATE` e a chamada contam o que o banco FAZ, e é o segundo que
-- decide se uma política de retenção pode ser alterada por quem não deveria.
--
-- -----------------------------------------------------------------------------
-- AS 11 ASSERÇÕES — quatro delas NEGATIVAS
-- -----------------------------------------------------------------------------
--   (a) A tabela existe, RLS está LIGADA, e há EXATAMENTE UMA policy, de SELECT,
--       com `administrador` na expressão de `qual`.
--   (b) ⊖ NEGATIVA — ZERO policies de INSERT/UPDATE/DELETE/ALL. Default-deny é a
--       postura; uma policy de escrita acrescentada depois contornaria a auditoria
--       que o RETEN-02 exige, e sairia daqui em silêncio sem esta metade.
--   (c) Seed: 8 linhas, todas com janela_meses = 24, origem = 'seed', alterado_por
--       NULL. Um estado a menos aqui vira, na Phase 46, candidatura sem regra.
--   (d) O CHECK é provado por UPDATE REAL: 25 e 0 são recusados com 23514.
--   (e) `salvar_janela_retencao` recusa 25 meses (22023), recusa valor idêntico ao
--       atual (22023) e recusa impersonação de papel `rh` (42501).
--   (f) ⊖ NEGATIVA, e é a que fecha o defeito sistêmico — recusa com 42501 o
--       chamador SEM CLAIM NENHUMA. Um guard NULL-cego (`NOT IN`) passaria aqui em
--       silêncio, porque `IF NULL` não é tomado.
--   (g) Uma alteração LEGÍTIMA produz EXATAMENTE UMA linha nova em `logs_auditoria`
--       com acao = 'alterar_janela_retencao', medida por contagem antes/depois
--       DENTRO da mesma subtransação revertida — a ATOMICIDADE é o que se prova.
--   (h) ⊖ NEGATIVA — o `proacl` das duas funções NÃO contém `anon`.
--   (i) O trigger `trg_config_retencao_atualizado_em` existe, é BEFORE UPDATE e
--       aponta para `public.tocar_atualizado_em`.
--   (j) ⊖ NEGATIVA E OBRIGATÓRIA — a contagem de `public.candidaturas` e de
--       `public.candidatos` é IDÊNTICA antes e depois do smoke inteiro. Esta fase é
--       zero-destrutiva POR DESENHO, e esta asserção existe para que isso seja um
--       FATO MEDIDO e não uma intenção declarada.
--   (k) O CAMINHO FELIZ DA LEITURA — `listar_matriz_retencao()` EXECUTA com claim
--       válida e devolve as 8 etapas. Acrescentada em 2026-08-03, depois de a função
--       levantar `42804` em produção com este arquivo em 10/10 verdes: a única
--       asserção que a chamava era a (f), que testa a RECUSA, e o guard levanta na
--       primeira linha do corpo — o `RETURN QUERY` nunca executava.
--       **Toda função com guard precisa de DUAS asserções**: a que prova que recusa
--       quem deve recusar, e a que prova que FUNCIONA para quem deve passar.
--   (z) RESUMO — exige o total de 11 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: a forma e a postura de segurança da tabela nos dois sentidos (a policy que
-- existe / as que não podem existir), o seed exato, o teto imposto pelas DUAS
-- camadas, os quatro modos de recusa da RPC, a atomicidade da trilha de auditoria,
-- o hardening de EXECUTE e a invariante zero-destrutiva.
--
-- NÃO COBRE: a tela do admin (`/admin/retencao`, plano posterior), nem qualquer
-- predicado de purga — que NÃO EXISTE nesta fase e é trabalho da Phase 46.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada é
-- limpa explicitamente. NOTICEs carregam apenas contagens, SQLSTATEs e nomes de
-- objeto — NUNCA PII (nome, e-mail) e nunca o valor de um segredo.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke43m.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — baselines de (j) e o administrador vivo usado por (g).
--
-- ⚠ Se não houver administrador vivo, levanta exceção ALTO. Um SKIP silencioso aqui
-- seria indistinguível de uma RPC que aceita qualquer um: a asserção (g) deixaria de
-- provar a atomicidade e o gate ficaria verde por ausência de teste.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_rh   uuid;
  v_admin_auth uuid;
  v_cands      bigint;
  v_candos     bigint;
BEGIN
  SELECT u.id, u.user_id INTO v_admin_rh, v_admin_auth
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador'
     AND u.ativo
     AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin_rh IS NULL THEN
    RAISE EXCEPTION 'P43M FAIL (fixture): nenhum administrador VIVO em usuarios_rh — a asseracao (g) nao pode provar a trilha de auditoria de uma alteracao legitima sem um ator real, e um skip silencioso aqui deixaria o gate verde por ausencia de teste';
  END IF;

  SELECT count(*) INTO v_cands  FROM public.candidaturas;
  SELECT count(*) INTO v_candos FROM public.candidatos;

  PERFORM set_config('smoke43m.admin_rh',   v_admin_rh::text,   false);
  PERFORM set_config('smoke43m.admin_auth', v_admin_auth::text, false);
  PERFORM set_config('smoke43m.cands',      v_cands::text,      false);
  PERFORM set_config('smoke43m.candos',     v_candos::text,     false);

  RAISE NOTICE 'FIXTURE ok: administrador vivo resolvido; baseline zero-destrutiva = % candidaturas / % candidatos', v_cands, v_candos;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) A TABELA EXISTE, RLS LIGADA, E HÁ EXATAMENTE UMA POLICY — DE SELECT,
--     ADMIN-ONLY.
--
--     "Exatamente uma" é load-bearing e não contagem decorativa: a postura desta
--     tabela é UMA leitura restrita e NENHUMA escrita. Duas policies de SELECT já
--     significariam um segundo caminho de leitura que ninguém revisou.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_rls   boolean;
  v_total int;
  v_cmd   text;
  v_qual  text;
BEGIN
  SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'config_retencao_etapa';

  IF v_rls IS NULL THEN
    RAISE EXCEPTION 'P43M FAIL (a): public.config_retencao_etapa NAO existe — a migration 20260801000002 nao foi aplicada';
  END IF;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'P43M FAIL (a): RLS NAO esta ligada em public.config_retencao_etapa — a politica de retencao ficaria legivel por qualquer papel autenticado';
  END IF;

  SELECT count(*) INTO v_total
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'config_retencao_etapa';

  IF v_total <> 1 THEN
    RAISE EXCEPTION 'P43M FAIL (a): esperava EXATAMENTE 1 policy em config_retencao_etapa, encontrei % — a postura desta tabela e uma leitura restrita e nenhuma escrita', v_total;
  END IF;

  SELECT p.cmd, p.qual INTO v_cmd, v_qual
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'config_retencao_etapa';

  IF v_cmd <> 'SELECT' THEN
    RAISE EXCEPTION 'P43M FAIL (a): a unica policy e de comando %, esperado SELECT', v_cmd;
  END IF;
  IF coalesce(v_qual, '') NOT LIKE '%administrador%' THEN
    RAISE EXCEPTION 'P43M FAIL (a): a policy de SELECT nao restringe a administrador (qual = %) — se ela tiver sido copiada da RLS public-read de config_sla_etapa, a politica de retencao esta ao alcance do papel anonimo', coalesce(v_qual, '<nulo>');
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): RLS ligada, exatamente 1 policy, de SELECT, restrita a administrador';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) ⊖ NEGATIVA — ZERO POLICIES DE ESCRITA.
--
--     Sem esta metade, acrescentar depois uma policy de UPDATE "por conveniência"
--     abriria um segundo caminho de escrita que NÃO deixa linha de auditoria,
--     contornando exatamente o que o RETEN-02 pede da RPC. A asserção (a) sozinha
--     não pegaria isso se alguém trocasse a policy de SELECT por uma de ALL.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_escrita int;
  v_nomes   text;
BEGIN
  SELECT count(*), coalesce(string_agg(p.policyname || ':' || p.cmd, ', '), '')
    INTO v_escrita, v_nomes
    FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.tablename = 'config_retencao_etapa'
     AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  IF v_escrita <> 0 THEN
    RAISE EXCEPTION 'P43M FAIL (b): existe(m) % policy(ies) de ESCRITA em config_retencao_etapa (%) — ha um caminho de alteracao que NAO passa por salvar_janela_retencao e portanto NAO deixa trilha de auditoria', v_escrita, v_nomes;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): zero policy de INSERT/UPDATE/DELETE/ALL — default-deny intacto, a RPC auditada e o unico caminho de escrita';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) SEED — 8 linhas, todas em 24 meses, origem 'seed', alterado_por NULL.
--
--     ⚠ Esta asserção é escrita para o estado RECÉM-APLICADO. Se um administrador
--     já tiver alterado alguma janela pela tela (origem = 'admin'), ela reprova de
--     propósito: o gate desta fase é sobre o estado NASCENTE da matriz, e uma
--     alteração legítima posterior significa que o smoke cumpriu seu papel e não
--     deve ser re-rodado como se fosse regressão.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_total   int;
  v_em24    int;
  v_seed    int;
  v_semdono int;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE c.janela_meses = 24),
         count(*) FILTER (WHERE c.origem = 'seed'),
         count(*) FILTER (WHERE c.alterado_por IS NULL)
    INTO v_total, v_em24, v_seed, v_semdono
    FROM public.config_retencao_etapa c;

  IF v_total <> 8 THEN
    RAISE EXCEPTION 'P43M FAIL (c): a matriz tem % linhas, esperado 8 (o enum etapa_processo inteiro) — um estado ausente vira, na Phase 46, candidatura sem regra de retencao', v_total;
  END IF;
  IF v_em24 <> 8 THEN
    RAISE EXCEPTION 'P43M FAIL (c): apenas % de 8 linhas estao em 24 meses — o seed BD-1 e o TETO JA CONSENTIDO pela copy do cadastro, uniforme por decisao do operador', v_em24;
  END IF;
  IF v_seed <> 8 OR v_semdono <> 8 THEN
    RAISE EXCEPTION 'P43M FAIL (c): % linha(s) com origem=seed e % com alterado_por nulo, esperado 8/8 — alguma linha ja foi alterada, ou o seed gravou procedencia errada', v_seed, v_semdono;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): 8/8 estados semeados em 24 meses, origem=seed, sem alterador';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) O CHECK PROVADO POR UPDATE REAL — 25 e 0 recusados com 23514.
--
--     `pg_get_constraintdef` contaria o que a constraint DIZ. O UPDATE conta o que
--     o banco FAZ, e é o segundo que decide se uma janela fora do teto consentido
--     pode ser gravada. Ambos os UPDATEs rodam em subtransações revertidas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_recusados int := 0;
  v_valor     int;
  v_valores   int[] := ARRAY[25, 0];
BEGIN
  FOREACH v_valor IN ARRAY v_valores LOOP
    BEGIN
      UPDATE public.config_retencao_etapa c
         SET janela_meses = v_valor
       WHERE c.etapa = 'inscricao';

      -- Chegou aqui ⇒ o CHECK ACEITOU um valor fora de 1..24. Reverte a linha antes
      -- de falhar: falhamos depois de conter o dano, não antes.
      RAISE EXCEPTION 'P43M FAIL (d): o CHECK vivo ACEITOU janela_meses = % — o teto de 24 meses nao esta imposto na TABELA, e a RPC passa a ser a unica camada', v_valor
        USING ERRCODE = 'P4390';
    EXCEPTION
      WHEN sqlstate 'P4390' THEN
        RAISE;  -- propaga a falha do smoke (a linha já foi revertida com a subtx)
      WHEN check_violation THEN
        -- Recusa esperada; a subtransação já reverteu.
        v_recusados := v_recusados + 1;
    END;
  END LOOP;

  IF v_recusados <> 2 THEN
    RAISE EXCEPTION 'P43M FAIL (d): apenas % de 2 valores fora do intervalo foram recusados com 23514', v_recusados;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): o CHECK recusou 25 e 0 com 23514, por UPDATE real (ambos revertidos)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) A RPC RECUSA: teto (22023), no-op (22023) e papel `rh` (42501).
--
--     A impersonação é por `set_config('request.jwt.claims', …)` com
--     `app_metadata.role` — nunca por leitura de catálogo. O guard lê a claim, então
--     é a claim que tem de ser exercitada; verificar `pg_get_functiondef` provaria
--     apenas que o texto do guard existe, não que ele RECUSA.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke43m.admin_auth')::uuid;
  v_atual      int;
  v_ok         int := 0;
BEGIN
  SELECT c.janela_meses INTO v_atual
    FROM public.config_retencao_etapa c WHERE c.etapa = 'triagem';

  -- (e.1) TETO — 25 meses recusado com 22023, com claim de administrador VÁLIDA:
  -- é a recusa pela regra, não pela autorização.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM public.salvar_janela_retencao('triagem', 25);
    RAISE EXCEPTION 'P43M FAIL (e.1): salvar_janela_retencao ACEITOU 25 meses — o teto nao esta imposto no SERVIDOR, e o cap da tela e cosmetico por definicao'
      USING ERRCODE = 'P4391';
  EXCEPTION
    WHEN sqlstate 'P4391' THEN RAISE;
    WHEN sqlstate '22023' THEN v_ok := v_ok + 1;
  END;

  -- (e.2) NO-OP — salvar o valor que já está lá é RECUSA, não sucesso silencioso:
  -- escreveria uma linha de auditoria afirmando uma alteração que não houve.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM public.salvar_janela_retencao('triagem', v_atual);
    RAISE EXCEPTION 'P43M FAIL (e.2): salvar_janela_retencao ACEITOU um valor identico ao atual — a trilha de auditoria ganharia uma linha de alteracao que nao houve'
      USING ERRCODE = 'P4392';
  EXCEPTION
    WHEN sqlstate 'P4392' THEN RAISE;
    WHEN sqlstate '22023' THEN v_ok := v_ok + 1;
  END;

  -- (e.3) PAPEL ERRADO — `rh` é papel real deste sistema e não administrador.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    PERFORM public.salvar_janela_retencao('triagem', 12);
    RAISE EXCEPTION 'P43M FAIL (e.3): salvar_janela_retencao ACEITOU chamada com papel rh — a politica de retencao da empresa e alteravel por qualquer recrutador'
      USING ERRCODE = 'P4393';
  EXCEPTION
    WHEN sqlstate 'P4393' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ok <> 3 THEN
    RAISE EXCEPTION 'P43M FAIL (e): apenas % de 3 recusas ocorreram com o SQLSTATE esperado', v_ok;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): a RPC recusou teto (22023), no-op (22023) e papel rh (42501)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) ⊖ NEGATIVA — CHAMADOR SEM CLAIM NENHUMA É RECUSADO COM 42501.
--
--     ESTA É A ASSERÇÃO QUE FECHA O DEFEITO SISTÊMICO. O idioma difundido no
--     repositório — `IF v_role NOT IN ('rh','administrador')` — avalia NULL quando
--     não há JWT, e um `IF` NULL **não é tomado**: o guard FALHA ABERTO exatamente
--     para o chamador mais suspeito. Em SECURITY DEFINER isso é grave porque DEFINER
--     bypassa RLS e o guard do corpo é o único controle. Defeito REAL medido na
--     42-06 (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`: 61
--     funções DEFINER com EXECUTE para anon, 39 chamáveis via PostgREST).
--
--     Um guard NULL-cego passaria por (e) em verde e reprovaria SÓ aqui.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ok int := 0;
BEGIN
  -- Sem claim alguma: auth.jwt() resolve NULL e o guard tem de recusar mesmo assim.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    PERFORM public.salvar_janela_retencao('triagem', 12);
    RAISE EXCEPTION 'P43M FAIL (f): salvar_janela_retencao ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO. Trocar IS DISTINCT FROM por NOT IN reintroduz exatamente este defeito'
      USING ERRCODE = 'P4394';
  EXCEPTION
    WHEN sqlstate 'P4394' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  -- Mesma prova para a função de LEITURA: sem guard, ela exporia a politica de
  -- retencao e os nomes dos administradores por baixo da RLS admin-only.
  BEGIN
    PERFORM * FROM public.listar_matriz_retencao();
    RAISE EXCEPTION 'P43M FAIL (f): listar_matriz_retencao ACEITOU chamada SEM CLAIM NENHUMA — um DEFINER sem guard le a tabela por baixo da RLS e devolve a politica de retencao mais os nomes dos administradores'
      USING ERRCODE = 'P4395';
  EXCEPTION
    WHEN sqlstate 'P4395' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  IF v_ok <> 2 THEN
    RAISE EXCEPTION 'P43M FAIL (f): apenas % de 2 funcoes recusaram o chamador sem claim com 42501', v_ok;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): as DUAS funcoes recusaram o chamador sem claim nenhuma com 42501 (guard NULL-safe)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (g) ATOMICIDADE — uma alteração legítima produz EXATAMENTE UMA linha nova em
--     `logs_auditoria`, medida DENTRO da mesma subtransação que é revertida.
--
--     Medir dentro é o ponto inteiro: se a linha de auditoria fosse escrita por
--     outro caminho (trigger assíncrono, job posterior), a contagem aqui daria 0 e
--     a promessa da copy do diálogo — "A alteração fica registrada na trilha de
--     auditoria" — seria verdadeira só eventualmente. Variáveis de PL/pgSQL NÃO são
--     revertidas pelo rollback da subtransação, então o delta sobrevive à reversão
--     da linha.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke43m.admin_auth')::uuid;
  v_admin_rh   uuid := current_setting('smoke43m.admin_rh')::uuid;
  v_atual      int;
  v_novo       int;
  v_delta      int := -1;
  v_origem     text := '<nao medido>';
  v_autor      uuid;
BEGIN
  SELECT c.janela_meses INTO v_atual
    FROM public.config_retencao_etapa c WHERE c.etapa = 'rejeitado';

  -- Valor diferente do atual, sempre dentro de 1..24 (o no-op é recusado por (e.2)).
  v_novo := CASE WHEN v_atual = 12 THEN 11 ELSE 12 END;

  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT count(*) INTO v_delta
      FROM public.logs_auditoria l WHERE l.acao = 'alterar_janela_retencao';

    PERFORM public.salvar_janela_retencao('rejeitado', v_novo);

    SELECT count(*) - v_delta INTO v_delta
      FROM public.logs_auditoria l WHERE l.acao = 'alterar_janela_retencao';

    SELECT c.origem, c.alterado_por INTO v_origem, v_autor
      FROM public.config_retencao_etapa c WHERE c.etapa = 'rejeitado';

    -- ROLLBACK INTENCIONAL: a alteração e sua linha de auditoria já provaram o que
    -- tinham de provar e NÃO podem sobreviver — este smoke roda contra PROD e não
    -- pode deixar a política de retenção alterada nem poluir a trilha probatória.
    RAISE EXCEPTION 'rollback_smoke43m' USING ERRCODE = 'P4396';
  EXCEPTION
    WHEN sqlstate 'P4396' THEN
      NULL;  -- reversão esperada; as variáveis abaixo sobreviveram
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_delta <> 1 THEN
    RAISE EXCEPTION 'P43M FAIL (g): a alteracao legitima produziu % linha(s) nova(s) de auditoria, esperado exatamente 1 — se for 0, o PERFORM log_auditoria nao roda na mesma transacao e a promessa da copy do dialogo nao tem codigo que a execute', v_delta;
  END IF;
  IF v_origem <> 'admin' THEN
    RAISE EXCEPTION 'P43M FAIL (g): apos a alteracao a origem ficou %, esperado admin — a Phase 46 usa esse discriminador para saber se alguem ESCOLHEU o numero ou se ninguem o contestou', v_origem;
  END IF;
  IF v_autor IS DISTINCT FROM v_admin_rh THEN
    RAISE EXCEPTION 'P43M FAIL (g): alterado_por nao aponta para o administrador resolvido no servidor a partir de auth.uid()';
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): 1 linha de auditoria por alteracao, na MESMA transacao; origem=admin e alterado_por resolvido no servidor (tudo revertido)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (h) ⊖ NEGATIVA — `anon` NÃO tem EXECUTE em nenhuma das duas funções.
--
--     `REVOKE ALL … FROM PUBLIC` sozinho NÃO remove o grant que o `pg_default_acl`
--     de `public` concede a `anon` em todo CREATE FUNCTION — ele é direto e nomeado.
--     Esta asserção é o gate que impede a regressão para o idioma incompleto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, p.proacl
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('listar_matriz_retencao', 'salvar_janela_retencao')
  LOOP
    v_checadas := v_checadas + 1;

    IF r.proacl IS NULL THEN
      RAISE EXCEPTION 'P43M FAIL (h): public.% tem proacl NULO — nenhum REVOKE/GRANT explicito foi aplicado, logo o default ACL (que concede EXECUTE a anon) esta em vigor', r.proname;
    END IF;

    IF EXISTS (
      SELECT 1 FROM aclexplode(r.proacl) a
       JOIN pg_roles g ON g.oid = a.grantee
      WHERE g.rolname = 'anon'
    ) THEN
      RAISE EXCEPTION 'P43M FAIL (h): o papel anon TEM privilegio em public.% (proacl = %) — o REVOKE precisa nomear anon explicitamente, nao apenas PUBLIC', r.proname, r.proacl::text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM aclexplode(r.proacl) a
       JOIN pg_roles g ON g.oid = a.grantee
      WHERE g.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'P43M FAIL (h): authenticated NAO tem EXECUTE em public.% — a tela do admin nao conseguiria chamar a funcao', r.proname;
    END IF;
  END LOOP;

  IF v_checadas <> 2 THEN
    RAISE EXCEPTION 'P43M FAIL (h): encontrei % das 2 funcoes esperadas em public — a migration nao criou ambas', v_checadas;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): as 2 funcoes existem, anon sem privilegio nenhum, authenticated com EXECUTE';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (i) O TRIGGER DE `atualizado_em` — existe, é BEFORE UPDATE, e aponta para a
--     função HERDADA `public.tocar_atualizado_em` (nunca uma cópia nova).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_def   text;
  v_fname text;
BEGIN
  SELECT pg_get_triggerdef(t.oid), p.proname
    INTO v_def, v_fname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
   WHERE t.tgrelid = 'public.config_retencao_etapa'::regclass
     AND t.tgname = 'trg_config_retencao_atualizado_em'
     AND NOT t.tgisinternal;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P43M FAIL (i): trg_config_retencao_atualizado_em NAO existe — atualizado_em nao seria carimbado e a trilha da matriz perderia o quando';
  END IF;
  IF v_def NOT LIKE '%BEFORE UPDATE%' THEN
    RAISE EXCEPTION 'P43M FAIL (i): o trigger nao e BEFORE UPDATE: %', v_def;
  END IF;
  IF v_fname <> 'tocar_atualizado_em' THEN
    RAISE EXCEPTION 'P43M FAIL (i): o trigger aponta para %, esperado tocar_atualizado_em — a funcao da P37 e REUSADA, nunca redefinida nem copiada', v_fname;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (i): trg_config_retencao_atualizado_em e BEFORE UPDATE e reusa public.tocar_atualizado_em';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (j) ⊖ NEGATIVA E OBRIGATÓRIA — ZERO LINHA DE CANDIDATO TOCADA.
--
--     A Phase 43 é zero-destrutiva POR DESENHO, e "por desenho" só vale alguma coisa
--     se for MEDIDO. Esta asserção compara a contagem de `candidaturas` e de
--     `candidatos` com a baseline capturada na FIXTURE, antes de qualquer escrita do
--     smoke. Ela também é a asserção que um futuro predicado de purga acidentalmente
--     ligado nesta fase reprovaria — que é precisamente o acidente contra o qual a
--     fase inteira foi desenhada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cands_antes  bigint := current_setting('smoke43m.cands')::bigint;
  v_candos_antes bigint := current_setting('smoke43m.candos')::bigint;
  v_cands_agora  bigint;
  v_candos_agora bigint;
  v_matriz       int;
BEGIN
  SELECT count(*) INTO v_cands_agora  FROM public.candidaturas;
  SELECT count(*) INTO v_candos_agora FROM public.candidatos;

  IF v_cands_agora <> v_cands_antes THEN
    RAISE EXCEPTION 'P43M FAIL (j): public.candidaturas saiu de % para % linhas durante o smoke — a Phase 43 e zero-destrutiva POR DESENHO e acabou de deixar de ser', v_cands_antes, v_cands_agora;
  END IF;
  IF v_candos_agora <> v_candos_antes THEN
    RAISE EXCEPTION 'P43M FAIL (j): public.candidatos saiu de % para % linhas durante o smoke', v_candos_antes, v_candos_agora;
  END IF;

  -- Teardown asserido da própria matriz: as subtransações de (d), (e) e (g) já
  -- reverteram tudo; "deveria ter revertido" e "reverteu" são afirmações diferentes.
  SELECT count(*) INTO v_matriz
    FROM public.config_retencao_etapa c
   WHERE c.origem <> 'seed' OR c.janela_meses <> 24 OR c.alterado_por IS NOT NULL;

  IF v_matriz <> 0 THEN
    RAISE EXCEPTION 'P43M FAIL (j): % linha(s) da matriz sobreviveram alteradas as subtransacoes do smoke — o idioma de rollback nao esta funcionando como escrito, e a politica de retencao de PROD ficou com valor de teste', v_matriz;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (j): % candidaturas / % candidatos INALTERADOS, e a matriz voltou ao seed — zero acao destrutiva, medido', v_cands_agora, v_candos_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (k) O CAMINHO FELIZ DA LEITURA — acrescentada em 2026-08-03, e ela existe por
--     causa de um defeito que este arquivo deixou passar com 10/10 verdes.
--
--     `listar_matriz_retencao()` levantava `42804` em TODA chamada bem-sucedida:
--     `usuarios_rh.nome_completo` e `varchar(255)` e o `RETURNS TABLE` declara
--     `text`, e `RETURN QUERY` exige IDENTIDADE de tipo. A tela `/admin/retencao`
--     nao carregava. Corrigido por `20260803000001` com um `::text`.
--
--     ⚠ POR QUE ESTE SMOKE NAO PEGOU: a assercao (f) e a UNICA que chamava esta
--     funcao, e o cenario dela e "chamador SEM CLAIM deve receber 42501". O guard
--     levanta na PRIMEIRA linha do corpo — o `RETURN QUERY` nunca executava. As
--     demais assercoes leem `config_retencao_etapa` DIRETAMENTE.
--
--     A licao, que vale alem deste arquivo: **um contador de assercoes verdes mede
--     caminhos EXERCITADOS, nao caminhos EXISTENTES.** Uma funcao cujo unico teste
--     e a recusa esta, para efeito de corpo, sem teste nenhum. Toda funcao com
--     guard precisa de DUAS assercoes — a que prova que ela recusa quem deve
--     recusar, e a que prova que ela FUNCIONA para quem deve passar.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid := current_setting('smoke43m.admin_auth')::uuid;
  v_linhas     int;
  v_etapas     int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_auth::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);

  -- Executa de verdade. Um 42804 aqui reprova, e era exatamente o que acontecia.
  SELECT count(*), count(DISTINCT m.etapa)
    INTO v_linhas, v_etapas
    FROM public.listar_matriz_retencao() m;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_linhas <> 8 THEN
    RAISE EXCEPTION 'P43M FAIL (k): listar_matriz_retencao devolveu % linha(s), esperado 8 — a leitura da matriz e o unico caminho da tela do admin, e ela precisa devolver o enum etapa_processo inteiro', v_linhas;
  END IF;
  IF v_etapas <> 8 THEN
    RAISE EXCEPTION 'P43M FAIL (k): % etapas DISTINTAS em 8 linhas — ha duplicata, e a tela renderizaria a mesma etapa duas vezes', v_etapas;
  END IF;

  PERFORM set_config('smoke43m.pass', (coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (k): listar_matriz_retencao EXECUTA com claim valida e devolve as 8 etapas (o caminho que (f) nunca alcancava)';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 11;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke43m.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P43M FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asseracoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
