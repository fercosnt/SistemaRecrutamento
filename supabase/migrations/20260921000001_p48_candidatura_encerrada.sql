-- =============================================================================
-- 20260921000001 — candidatura_encerrada : UM predicado canônico de «acabou»,
--                  e o pedido de exclusão (Defeito 26 / JORN-26) consertado por ele
-- =============================================================================
-- Phase 48 / Plano 48-01 · D-11 (varredura pela forma) · D-21 (escopo) ·
-- `.planning/phases/48-consertos-da-jornada-bloco-1/48-VARREDURA-ETAPA-ATUAL.md`
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-19..21). `registrar_pedido_exclusao`
-- decidia quais candidaturas do titular estavam «em andamento» olhando SÓ a etapa:
--
--     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado')
--
-- O knockout mantém `etapa_atual = 'inscricao'` com `status = 'rejeitado'` POR
-- DESENHO (`submit_candidatura_atomic`, 20260709000014:138-150 — é o que impede
-- `avancar_etapa()` de disparar). Para esse predicado, a candidatura que o knockout
-- já tinha encerrado continuava «em andamento». Efeito medido: 2 candidaturas de
-- knockout (`92522073…`, `25a4231c…`, ambas contas `+claude`) receberam
-- `encerrada_a_pedido_em`, e o trigger `trg_candidatura_encerrada_a_pedido` mandou
-- `candidatura_encerrada_a_pedido` aos 3 RH — o aviso revelou o exercício de um
-- direito do titular sobre um caso que já tinha acabado.
--
-- E há um segundo caso que ninguém nomeou (varredura §2/§4): 4 linhas legadas com
-- `status = 'finalizado'` em etapa de TRABALHO (`triagem`, `entrevista_online`,
-- `decisao_final`) e 1 `rejeitado/finalizado`. Status terminal, etapa não.
--
-- POR QUE UMA FUNÇÃO, E NÃO UM FILTRO NOVO NO MESMO LUGAR. Os Defeitos 22 e 26 são o
-- MESMO erro (D-11): código que usa `etapa_atual` para saber se a candidatura acabou,
-- ignorando `status`. A varredura achou a mesma forma em CINCO objetos vivos não
-- destrutivos (D1 este, D2 `retirar_candidatura`, D3 `rejeitar_candidatura`, D4
-- `v_fila_trabalho`, D6 `funil_kpis`) e num sexto destrutivo (D5, a purga). Consertar
-- cada um com o seu próprio `IN (...)` é plantar cinco verdades que vão divergir.
-- Uma função, chamada pelos cinco — os outros quatro estão em `…000002`.
--
-- O CRITÉRIO NÃO É NOVO. É o `STATUS_TERMINAIS = {'rejeitado','finalizado'}` que o
-- painel do candidato já usa em produção (`DashboardCandidatoPage.tsx:65-67`, e na
-- forma conjuntiva em `:459-464`), promovido a canônico. Por ALLOWLIST de estados
-- terminais — nunca denylist de estados ativos: um valor novo de enum que ninguém
-- classificou cai em «não encerrada», que é o lado que MOSTRA a candidatura ao RH em
-- vez de escondê-la. NULL-safe por COALESCE em cada comparação: etapa de trabalho com
-- status NULO não é encerrada; etapa NULA com status `rejeitado` é.
--
-- O QUE FICA DE FORA, DE PROPÓSITO:
--   · `encerrada_a_pedido_em`. A retirada tem idempotência própria (`IS NULL`) e a
--     Invariante 9 da 45-UI-SPEC exige que a candidatura retirada CONTINUE visível
--     ao RH. Pô-la no predicado a sumiria da fila.
--   · A PURGA (`candidaturas_alem_da_janela()`, allowlist `elegivel_purga` POR ETAPA).
--     É instância conhecida da mesma forma — o knockout nunca fica purgável — mas é
--     mecanismo destrutivo com o flip `dry_run → live` pendente. D-21: registrada em
--     Deferred, NÃO tocada. O `md5(prosrc)` dela é conferido antes E depois abaixo.
--   · As 2 marcas `encerrada_a_pedido_em` erradas já gravadas. Desfazê-las é UPDATE
--     retroativo sobre linha existente → checkpoint do operador (D-18), plano próprio.
--
-- AUTHZ.
--   · `candidatura_encerrada` é IMMUTABLE pura, SEM `SECURITY DEFINER`: não lê tabela
--     nenhuma, só compara os dois argumentos. `REVOKE … FROM PUBLIC, anon` com `anon`
--     NOMEADO — o `pg_default_acl` de `public` concede EXECUTE a `anon` como grant
--     DIRETO, e `FROM PUBLIC` sozinho não o remove (20260805000007:400-412). EXECUTE
--     para `authenticated` (é chamada pela view `security_invoker` e pelo front via
--     RPCs) e `service_role`.
--   · `registrar_pedido_exclusao` mantém o guard em duas metades, a titularidade por
--     `IS DISTINCT FROM`, a assinatura e o retorno. O ACL vivo lido em 2026-09-21
--     (`postgres, service_role, authenticated`; sem `anon`) é reafirmado abaixo.
--
-- IDEMPOTÊNCIA. `CREATE OR REPLACE`. O pré-portão de md5 RECUSA uma segunda execução
-- (o corpo vivo deixa de ser o medido) — é de propósito: re-rodar esta migration sobre
-- um corpo que outra migration já alterou apagaria essa alteração em silêncio. O
-- `p46apply.cjs` também recusa reaplicar uma `version` que já está no ledger.
--
-- BASE DO CORPO. O `CREATE OR REPLACE` de `registrar_pedido_exclusao` parte da
-- definição VIVA (`pg_get_functiondef`, 2026-09-21), que é idêntica, byte a byte, ao
-- corpo de `20260805000002_p45_rpc_pedido_exclusao.sql:129-225` (a `…000009` só mexe
-- no ACL). `md5(prosrc)` vivo = a4bd1c2438d382da5d81bb764ee8aeb6 (4681 octetos).
-- Mudanças no corpo: o predicado do UPDATE, e o comentário acima dele, que descrevia
-- o predicado antigo.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/GRANT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000001_p48_candidatura_encerrada.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação,
-- md5 de statements[1] conferido por leitura de volta. A `version` nasce correta; não
-- há reparo de ledger a fazer).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- (a) PRÉ-PORTÃO — o vivo tem de ser o medido. Um CREATE OR REPLACE sobre um corpo
--     que divergiu apagaria a divergência em silêncio (T-48-01-04). O md5 da purga é
--     a linha de base da prova de não-toque (T-48-01-06).
-- ---------------------------------------------------------------------------
DO $pre_portao$
DECLARE
  v_md5_rpe   text;
  v_md5_purga text;
BEGIN
  SELECT md5(p.prosrc) INTO v_md5_rpe
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.oid = 'public.registrar_pedido_exclusao(uuid)'::regprocedure;

  IF v_md5_rpe IS DISTINCT FROM 'a4bd1c2438d382da5d81bb764ee8aeb6' THEN
    RAISE EXCEPTION 'P48-01 PRE-PORTAO: md5(prosrc) de registrar_pedido_exclusao vivo = %, medido = a4bd1c2438d382da5d81bb764ee8aeb6. O corpo mudou desde a leitura de 2026-09-21 — reler o vivo e refazer esta migration a partir dele; o CREATE OR REPLACE apagaria a mudança', v_md5_rpe;
  END IF;

  SELECT md5(p.prosrc) INTO v_md5_purga
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.oid = 'public.candidaturas_alem_da_janela()'::regprocedure;

  IF v_md5_purga IS DISTINCT FROM 'b4fdb3a1243f9375cd15a61ef27189f1' THEN
    RAISE EXCEPTION 'P48-01 PRE-PORTAO: md5(prosrc) de candidaturas_alem_da_janela vivo = %, medido = b4fdb3a1243f9375cd15a61ef27189f1. A purga mudou desde a medicao — a prova de nao-toque (D-21) perderia a linha de base', v_md5_purga;
  END IF;
END
$pre_portao$;


-- ---------------------------------------------------------------------------
-- (b) A função canônica.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.candidatura_encerrada(
  p_etapa  public.etapa_processo,
  p_status public.status_candidatura
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $candidatura_encerrada$
  SELECT COALESCE(p_etapa IN ('aprovado', 'rejeitado'), false)
      OR COALESCE(p_status IN ('rejeitado', 'finalizado'), false)
$candidatura_encerrada$;


-- ---------------------------------------------------------------------------
-- (c) ACL — `anon` NOMEADO.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.candidatura_encerrada(public.etapa_processo, public.status_candidatura)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidatura_encerrada(public.etapa_processo, public.status_candidatura)
  TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- (d) COMMENT.
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.candidatura_encerrada(public.etapa_processo, public.status_candidatura) IS
  'Phase 48 / JORN-26 / D-11 / D-21: o predicado CANONICO de "candidatura encerrada". '
  'true se etapa em {aprovado, rejeitado} OU status em {rejeitado, finalizado}; cada '
  'comparacao envolvida em COALESCE(..., false) — NULL nao e terminal. '
  'Origem: STATUS_TERMINAIS do painel do candidato (DashboardCandidatoPage.tsx:65), '
  'promovido a canonico; espelho TS em src/lib/candidatura/candidaturaEncerrada.ts '
  '(plano 48-02) — mesma allowlist, escrita duas vezes: o SQL DECIDE, o TS esconde a acao. '
  'ALLOWLIST de terminais, nunca denylist de ativos: valor de enum novo cai em "nao '
  'encerrada", o lado que MOSTRA a candidatura ao RH. '
  'Existe porque o knockout mantem etapa_atual=inscricao com status=rejeitado POR '
  'DESENHO, e todo predicado que olha so a etapa erra exatamente ali (Defeitos 22 e 26). '
  'encerrada_a_pedido_em fica FORA de proposito: a candidatura retirada continua '
  'visivel ao RH (Invariante 9 da 45-UI-SPEC). '
  'Chamada por registrar_pedido_exclusao, retirar_candidatura, rejeitar_candidatura, '
  'v_fila_trabalho e funil_kpis. '
  'NAO chamada pela purga (candidaturas_alem_da_janela, allowlist elegivel_purga por '
  'etapa): instancia conhecida da mesma forma — o knockout nunca fica purgavel — NAO '
  'consertada aqui por ser mecanismo destrutivo com flip dry_run->live pendente (D-21, Deferred).';


-- ---------------------------------------------------------------------------
-- (e) D1 — registrar_pedido_exclusao, a partir do corpo VIVO, com UMA troca: o
--     predicado do UPDATE de `candidaturas`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pedido_exclusao(p_candidato_id uuid)
RETURNS TABLE(solicitacao_id uuid, executar_em timestamp with time zone, candidaturas_encerradas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $registrar_pedido_exclusao$
#variable_conflict use_column
DECLARE
  v_uid        uuid := auth.uid();
  v_dono       uuid;
  v_dias       integer;
  v_id         uuid;
  v_executar   timestamptz;
  v_encerradas integer := 0;
BEGIN
  -- ── GUARD, DUAS METADES, E A SEGUNDA É A QUE FECHA O DEFEITO SISTÊMICO ─────
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Toda função DEFINER
  --     nova neste projeto nasce executável por `anon` (`pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO), e o `REVOKE` abaixo é a outra
  --     metade — mas um guard que dependesse só do ACL seria um guard confiado a
  --     uma configuração de schema.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao registra pedido de exclusao'
      USING ERRCODE = '42501';
  END IF;

  -- (b) titularidade por `IS DISTINCT FROM`, NUNCA por `NOT IN`: com um dos lados
  --     NULL o `NOT IN` avalia NULL, o `IF` não é tomado, e o guard FALHA ABERTO
  --     justamente para o chamador mais suspeito (defeito REAL medido na 42-06).
  --     Aqui a forma NULL-safe também cobre "candidato inexistente": `v_dono` fica
  --     NULL, `NULL IS DISTINCT FROM <uid>` é TRUE, e a função recusa. Falha
  --     FECHADA por construção, não por lembrança.
  SELECT c.user_id INTO v_dono
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: o pedido de exclusao so pode ser registrado pelo proprio titular'
      USING ERRCODE = '42501';
  END IF;

  -- ── IDEMPOTÊNCIA POR ESTADO, NUNCA POR try/catch ──────────────────────────
  -- Um pedido já agendado devolve A MESMA linha, sem mutar nada — e sem empurrar a
  -- data para frente. Empurrar o prazo a cada clique transformaria a janela de
  -- arrependimento num relógio que o próprio titular não consegue esgotar. E
  -- resolver isso por `EXCEPTION WHEN unique_violation` exigiria um índice único
  -- parcial que ninguém pediu, além de tornar o no-op indistinguível de uma corrida.
  SELECT s.id, s.executar_em INTO v_id, v_executar
    FROM public.solicitacoes_dados s
   WHERE s.candidato_id = p_candidato_id
     AND s.tipo = 'exclusao'
     AND s.situacao = 'agendado'
   ORDER BY s.solicitado_em DESC
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_executar, 0;
    RETURN;
  END IF;

  -- ── A JANELA VEM DA CONFIG, E A AUSÊNCIA DELA É ERRO, NUNCA UM DEFAULT ─────
  -- Um número compilado aqui seria uma segunda verdade sobre o mesmo fato, e a
  -- divergência apareceria entre o que foi PROMETIDO na tela e o que foi EXECUTADO
  -- sobre os dados. Falhar alto é a única saída honesta: a tela sabe degradar (ela
  -- renderiza a data alvo sem a contagem de dias); o motor, não.
  SELECT j.dias INTO v_dias
    FROM public.config_janela_exclusao j
   WHERE j.chave = 'exclusao_arrependimento';

  IF v_dias IS NULL THEN
    RAISE EXCEPTION 'CONFIG_AUSENTE: config_janela_exclusao sem a linha exclusao_arrependimento — a janela NAO pode ser assumida por default, porque um numero compilado aqui viraria mentira silenciosa na tela do titular'
      USING ERRCODE = 'P0001';
  END IF;

  -- `now()` é constante dentro da transação, então `executar_em` calculado com
  -- `now()` é IDÊNTICO a `solicitado_em + janela` — que é o que a auto-verificação
  -- no fim deste arquivo assere.
  INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, executar_em)
  VALUES (p_candidato_id, 'exclusao', 'agendado', now() + (v_dias * INTERVAL '1 day'))
  RETURNING id, executar_em INTO v_id, v_executar;

  -- ── O ENCERRAMENTO: UMA COLUNA ADITIVA, E NADA MAIS ───────────────────────
  -- ⚠ NÃO toca `etapa_atual`. ⚠ NÃO chama caminho de rejeição algum. ⚠ NÃO escreve
  -- em `historico_candidatura` (que tem UM único escritor desde o M2/Phase 6) e
  -- portanto NÃO dispara notificação de transição. ⚠ NÃO toca `deleted_at`, para
  -- que as cinco leituras de RH que filtram `.is('deleted_at', null)` continuem
  -- vendo a linha (Invariante 9 da 45-UI-SPEC: o silêncio também é proibido).
  --
  -- Candidatura já encerrada não é encerrada a pedido: encerrar um processo que já
  -- acabou seria carimbar um fato que não aconteceu — e o trigger
  -- `trg_candidatura_encerrada_a_pedido` avisaria os RH do exercício de um direito do
  -- titular sobre um caso que já tinha acabado. «Encerrada» é decidido por
  -- `public.candidatura_encerrada(etapa, status)` (Phase 48 / JORN-26), e NÃO só pela
  -- etapa: o knockout mantém `etapa_atual = 'inscricao'` com `status = 'rejeitado'`
  -- por desenho, e o predicado antigo (`etapa_atual NOT IN (aprovado, rejeitado)`)
  -- o tratava como em andamento — Defeito 26.
  UPDATE public.candidaturas c
     SET encerrada_a_pedido_em = now()
   WHERE c.candidato_id = p_candidato_id
     AND c.encerrada_a_pedido_em IS NULL
     AND c.deleted_at IS NULL
     AND NOT public.candidatura_encerrada(c.etapa_atual, c.status);

  GET DIAGNOSTICS v_encerradas = ROW_COUNT;

  RETURN QUERY SELECT v_id, v_executar, v_encerradas;
END;
$registrar_pedido_exclusao$;

-- ACL vivo reafirmado (lido em 2026-09-21: postgres, service_role, authenticated).
REVOKE ALL ON FUNCTION public.registrar_pedido_exclusao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pedido_exclusao(uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------------
-- (f) AUTO-VERIFICAÇÃO por leitura de catálogo — e por execução da função pura.
-- ---------------------------------------------------------------------------
DO $verifica_p48_01$
DECLARE
  v_def       text := pg_get_functiondef('public.registrar_pedido_exclusao(uuid)'::regprocedure);
  v_fn        regprocedure := 'public.candidatura_encerrada(public.etapa_processo, public.status_candidatura)'::regprocedure;
  v_vol       "char";
  v_secdef    boolean;
  v_md5_purga text;
BEGIN
  IF position('public.candidatura_encerrada(c.etapa_atual, c.status)' IN v_def) = 0 THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: registrar_pedido_exclusao instalada SEM a chamada ao predicado canonico';
  END IF;
  -- Com as aspas: o comentário do corpo cita o predicado antigo SEM aspas, de propósito.
  IF v_def ~* 'etapa_atual\s+NOT\s+IN\s*\(\s*''aprovado''' THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: registrar_pedido_exclusao instalada AINDA com o predicado so-por-etapa';
  END IF;

  SELECT p.provolatile, p.prosecdef INTO v_vol, v_secdef FROM pg_proc p WHERE p.oid = v_fn;
  IF v_vol IS DISTINCT FROM 'i' THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: candidatura_encerrada nao e IMMUTABLE (provolatile = %)', v_vol;
  END IF;
  IF v_secdef IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: candidatura_encerrada nasceu SECURITY DEFINER — nao le tabela, nao precisa';
  END IF;

  IF has_function_privilege('anon', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: anon tem EXECUTE em candidatura_encerrada — o REVOKE nomeado nao pegou';
  END IF;
  IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: authenticated SEM EXECUTE em candidatura_encerrada — a view security_invoker quebraria';
  END IF;
  IF has_function_privilege('anon', 'public.registrar_pedido_exclusao(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: anon tem EXECUTE em registrar_pedido_exclusao';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.registrar_pedido_exclusao(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: authenticated perdeu EXECUTE em registrar_pedido_exclusao — o titular nao conseguiria pedir exclusao';
  END IF;

  -- As bordas que a varredura nomeou, executadas (não só lidas).
  IF public.candidatura_encerrada('inscricao', 'rejeitado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: knockout (inscricao, rejeitado) NAO e encerrada';
  END IF;
  IF public.candidatura_encerrada('triagem', 'finalizado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: legado (triagem, finalizado) NAO e encerrada';
  END IF;
  IF public.candidatura_encerrada('triagem', 'em_analise') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: em andamento (triagem, em_analise) e encerrada';
  END IF;
  IF public.candidatura_encerrada('triagem', NULL) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: (triagem, NULL) devolveu algo diferente de false — NULL nao e terminal';
  END IF;
  IF public.candidatura_encerrada(NULL, 'rejeitado') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: (NULL, rejeitado) NAO e encerrada';
  END IF;

  -- A purga não foi tocada (D-21).
  SELECT md5(p.prosrc) INTO v_md5_purga
    FROM pg_proc p WHERE p.oid = 'public.candidaturas_alem_da_janela()'::regprocedure;
  IF v_md5_purga IS DISTINCT FROM 'b4fdb3a1243f9375cd15a61ef27189f1' THEN
    RAISE EXCEPTION 'P48-01 VERIFICA: a purga MUDOU (md5 %) — D-21 proibe toca-la', v_md5_purga;
  END IF;

  RAISE NOTICE 'P48-01 OK: candidatura_encerrada IMMUTABLE, sem anon; registrar_pedido_exclusao chama o predicado canonico; purga intocada';
END
$verifica_p48_01$;
