-- =============================================================================
-- Phase 42 / Plano 42-08 Task 2 — ESPEC EXECUTÁVEL do 5º evento do pipeline de
-- comunicação: a notificação ao candidato de que sua revisão foi RESPONDIDA
-- (REVISAO-04 · D-P42-14, LGPD Art. 20)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito **ANTES** da migration `20260730000004`, deliberadamente RED: o CHECK vivo
-- ainda não aceita `revisao_respondida` e o trigger ainda não existe. Ele descreve o
-- que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema, não resolvê-lo — é
-- exatamente o movimento que transforma um gate em decoração.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo mecânico:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke42n.pass` e o RESUMO (z) reprovaria um
-- run que na verdade passou (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke42n.pass` bate **4** no RESUMO (z). O gate NÃO é "não
-- levantou exceção": um run parcial (asserção pulada por erro de ambiente) acumularia
-- < 4 e o RESUMO reprova ALTO. Esperado FIXO — não há metade adaptativa.
--
-- ⚠ ESTE SMOKE ESCREVE — e desfaz tudo que escreve, por construção. As asserções (a) e
-- (b) fazem INSERTs REAIS em `public.notificacoes_enviadas` dentro de subtransações que
-- são SEMPRE revertidas (idioma `RAISE EXCEPTION` com SQLSTATE próprio, capturado logo
-- acima). Provar o CHECK por INSERÇÃO em vez de por leitura de `pg_get_constraintdef` é
-- deliberado: `pg_get_constraintdef` conta o que a constraint DIZ; o INSERT conta o que
-- o banco FAZ, e é o segundo que decide se um e-mail sai. A asserção (y) confirma, ao
-- fim, que nenhuma linha do smoke sobreviveu.
--
-- ⚠ POR QUE O ROLLBACK IMPORTA MAIS AQUI DO QUE PARECE: uma linha de teste esquecida em
-- `notificacoes_enviadas` com `status='pendente'` é ELEGÍVEL à varredura de retry do
-- `pg_cron` (`varrer_retry_notificacoes`, a cada 15 min) e seria re-despachada para a
-- Edge Function a cada ciclo, para sempre. O teardown não é higiene — é contenção.
--
-- -----------------------------------------------------------------------------
-- AS 4 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) O CHECK vivo `notificacoes_enviadas_evento_check` aceita os **6** eventos
--       (`confirmacao`, `avanco`, `convite`, `decisao`, `revisao_solicitada`,
--       `revisao_respondida`) — provado por INSERÇÃO e rollback de uma linha por
--       evento. Inclui `revisao_solicitada`, entregue pela 42-07 e VIVO em PROD:
--       um DROP/ADD que o omitisse quebraria o REVISAO-01 já provado.
--   (b) O mesmo CHECK **REJEITA** um 7º evento inventado, com `23514`. Asserção
--       NEGATIVA de verdade: um INSERT que SUCEDA aqui levanta falha do smoke. Sem
--       ela, um CHECK dropado e nunca readicionado passaria por (a) em verde.
--   (c) `trg_notif_revisao_respondida` existe, é `AFTER UPDATE OF
--       revisao_respondida_em ON public.decisao_final`, e a função tem
--       `SECURITY DEFINER` com `search_path` VAZIO em `proconfig`.
--   (d) NÃO-REGRESSÃO do trigger irmão: `trg_notif_revisao_solicitada` (plano 42-07,
--       vivo em PROD) continua existindo com a MESMA forma. O apply desta migration
--       toca a mesma tabela; um `CREATE TRIGGER` que substituísse o vizinho por
--       descuido derrubaria o REVISAO-01 em silêncio.
--   (y) TEARDOWN ASSERIDO — zero linha remanescente com o prefixo do smoke.
--   (z) RESUMO — exige o total de 4 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: o vocabulário do ledger tal como o banco o impõe, nos dois sentidos
-- (aceita os 6 / recusa o 7º), a existência e a forma exata dos dois triggers de
-- revisão, e a postura de segurança da função nova.
--
-- NÃO COBRE: o round-trip ao vivo (RPC → trigger → Edge Function → Resend → linha de
-- ledger). Isso exige `net.http_post` real e é o passo 6 do checkpoint da Task 3, do
-- orquestrador. Também NÃO cobre a paridade código⟷banco do vocabulário: essa vive no
-- corpus Deno (`vocabulario-eventos.test.ts` + `email-templates.test.ts`), e as duas
-- metades juntas são o que fecha o D-P42-14.
--
-- HIGIENE: `RESET ROLE` em toda troca de papel e ao final; NOTICEs carregam apenas
-- contagens, SQLSTATEs e nomes de objeto — NUNCA PII (nome, e-mail, justificativa) e
-- nunca o valor de um segredo.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke42n.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE (como postgres) — resolve um par (candidatura, candidato) REAL apenas
-- para satisfazer as FKs NOT NULL de `notificacoes_enviadas`. NADA é escrito de
-- forma persistente: as linhas das asserções (a) e (b) vivem só dentro de
-- subtransações revertidas.
--
-- ⚠ Se o par não resolver, levanta exceção ALTO. Um SKIP silencioso aqui seria
-- indistinguível de um CHECK que não existe.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand  uuid;
  v_cando uuid;
  v_antes int;
BEGIN
  -- Candidatura do candidato de teste registrado. Preferimos a conta de teste à
  -- primeira linha que aparecer: as FKs são satisfeitas por qualquer par válido, mas
  -- um erro de escopo que deixasse linha para trás cairia sobre dado de teste.
  SELECT c.id, c.candidato_id INTO v_cand, v_cando
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
    JOIN auth.users u ON u.id = ca.user_id
   WHERE u.email = 'candidato.funil@teste.com'
     AND c.deleted_at IS NULL
   LIMIT 1;

  -- Fallback explícito: qualquer candidatura viva. Registrado em NOTICE para que o
  -- operador saiba qual caminho foi tomado — um fallback mudo é um fato perdido.
  IF v_cand IS NULL THEN
    SELECT c.id, c.candidato_id INTO v_cand, v_cando
      FROM public.candidaturas c
     WHERE c.deleted_at IS NULL
     LIMIT 1;
    RAISE NOTICE 'FIXTURE: conta de teste não resolveu; usando a primeira candidatura viva (as linhas do smoke são revertidas de qualquer modo)';
  END IF;

  IF v_cand IS NULL OR v_cando IS NULL THEN
    RAISE EXCEPTION 'P42N FAIL (fixture): nenhuma candidatura viva para satisfazer as FKs NOT NULL de notificacoes_enviadas — o CHECK não pode ser provado por inserção sem uma linha-alvo válida';
  END IF;

  SELECT count(*) INTO v_antes FROM public.notificacoes_enviadas;

  PERFORM set_config('smoke42n.cand',  v_cand::text,  false);
  PERFORM set_config('smoke42n.cando', v_cando::text, false);
  PERFORM set_config('smoke42n.antes', v_antes::text, false);

  RAISE NOTICE 'FIXTURE ok: par (candidatura, candidato) resolvido; ledger de notificações em % linhas (baseline)', v_antes;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) O CHECK VIVO ACEITA OS 6 EVENTOS — por INSERÇÃO, uma linha por evento,
--     cada uma dentro de uma subtransação SEMPRE revertida.
--
--     `revisao_solicitada` está na lista de propósito: ele é o evento de RH que a
--     42-07 entregou e que está VIVO em PROD (há linhas reais no ledger). Se a
--     migration deste plano reconstruísse o CHECK sem ele, o REVISAO-01 quebraria —
--     esta asserção é o que impede a regressão de passar despercebida.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand     uuid := current_setting('smoke42n.cand')::uuid;
  v_cando    uuid := current_setting('smoke42n.cando')::uuid;
  v_eventos  text[] := ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida'
  ];
  v_ev       text;
  v_aceitos  int := 0;
BEGIN
  FOREACH v_ev IN ARRAY v_eventos LOOP
    BEGIN
      INSERT INTO public.notificacoes_enviadas
        (evento, candidatura_id, candidato_id, template,
         destinatario_email, destinatario_original, dedupe_key, status, modo)
      VALUES
        (v_ev, v_cand, v_cando, 'smoke42n',
         'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
         'smoke42n:' || v_ev, 'pendente', 'teste');

      -- Chegou aqui ⇒ o CHECK aceitou. Variáveis de PL/pgSQL NÃO são revertidas por
      -- rollback de subtransação, então o contador sobrevive à reversão da linha.
      v_aceitos := v_aceitos + 1;

      -- ROLLBACK INTENCIONAL da subtransação: a linha já provou o que tinha de provar
      -- e não pode sobreviver (seria re-despachada pela varredura de retry a cada 15
      -- minutos). SQLSTATE próprio para não confundir com falha real.
      RAISE EXCEPTION 'rollback_smoke42n' USING ERRCODE = 'P4208';
    EXCEPTION
      WHEN sqlstate 'P4208' THEN
        NULL;  -- reversão esperada; segue para o próximo evento
      WHEN check_violation THEN
        RAISE EXCEPTION 'P42N FAIL (a): o CHECK vivo de evento REJEITOU ''%'' com 23514 — o vocabulário do ledger está incompleto. Se o evento for revisao_solicitada, a migration 20260730000004 reconstruiu o CHECK SEM ele e QUEBROU o REVISAO-01 já entregue em PROD', v_ev;
    END;
  END LOOP;

  IF v_aceitos <> 6 THEN
    RAISE EXCEPTION 'P42N FAIL (a): apenas % de 6 eventos foram aceitos pelo CHECK vivo', v_aceitos;
  END IF;

  PERFORM set_config('smoke42n.pass', (coalesce(nullif(current_setting('smoke42n.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): o CHECK vivo aceitou os 6 eventos por inserção real (todas revertidas)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) ASSERÇÃO NEGATIVA — o CHECK REJEITA um 7º evento inventado, com 23514.
--     Sem esta metade, um CHECK DROPado e nunca readicionado passaria por (a) em
--     verde: um `evento text NOT NULL` sem CHECK aceita as 6 strings e todas as
--     outras. É esta asserção que distingue "aceita os 6" de "aceita qualquer coisa".
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand  uuid := current_setting('smoke42n.cand')::uuid;
  v_cando uuid := current_setting('smoke42n.cando')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('evento_inventado_smoke42n', v_cand, v_cando, 'smoke42n',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke42n:inventado', 'pendente', 'teste');

    -- Um SUCESSO aqui é FALHA do smoke: o vocabulário do ledger deixou de ser fechado.
    RAISE EXCEPTION 'P42N FAIL (b): o CHECK vivo ACEITOU o evento inventado ''evento_inventado_smoke42n'' — o vocabulário do ledger não está mais fechado (constraint ausente ou substituída por uma sem lista de valores)'
      USING ERRCODE = 'P4209';
  EXCEPTION
    WHEN sqlstate 'P4209' THEN
      RAISE;  -- propaga a falha do smoke
    WHEN check_violation THEN
      PERFORM set_config('smoke42n.pass', (coalesce(nullif(current_setting('smoke42n.pass', true), ''), '0')::int + 1)::text, false);
      RAISE NOTICE 'PASS (b): o CHECK vivo rejeitou o 7º evento inventado com 23514 (vocabulário fechado)';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) CATÁLOGO — trg_notif_revisao_respondida: existe na tabela certa, com a
--     cláusula de coluna certa, e a função é DEFINER com search_path VAZIO.
--
--     A cláusula `AFTER UPDATE OF revisao_respondida_em` é LOAD-BEARING, não estilo:
--     sem ela o trigger dispararia em TODO update de `decisao_final` (inclusive nos
--     que apenas registram a SOLICITAÇÃO), e o guard de transição do corpo seria a
--     única coisa entre o funil e um dispatch espúrio.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_def       text;
  v_secdef    boolean;
  v_proconfig text[];
BEGIN
  SELECT pg_get_triggerdef(t.oid), p.prosecdef, p.proconfig
    INTO v_def, v_secdef, v_proconfig
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND t.tgname = 'trg_notif_revisao_respondida'
     AND NOT t.tgisinternal;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P42N FAIL (c): trg_notif_revisao_respondida NÃO existe em public.decisao_final — a resposta do RH não notifica o candidato (REVISAO-04 incompleto)';
  END IF;
  IF v_def NOT LIKE '%AFTER UPDATE OF revisao_respondida_em%' THEN
    RAISE EXCEPTION 'P42N FAIL (c): trg_notif_revisao_respondida não é AFTER UPDATE OF revisao_respondida_em — dispararia em updates que não respondem revisão: %', v_def;
  END IF;
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P42N FAIL (c): a função do trigger NÃO é SECURITY DEFINER — não leria o Vault para montar o dispatch';
  END IF;
  IF v_proconfig IS NULL
     OR NOT ('search_path=' = ANY(v_proconfig) OR 'search_path=""' = ANY(v_proconfig)) THEN
    RAISE EXCEPTION 'P42N FAIL (c): a função do trigger não tem search_path VAZIO em proconfig (%) — DEFINER sem search_path fixo é sequestrável',
      coalesce(array_to_string(v_proconfig, ','), '<nulo>');
  END IF;

  PERFORM set_config('smoke42n.pass', (coalesce(nullif(current_setting('smoke42n.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): trg_notif_revisao_respondida é AFTER UPDATE OF revisao_respondida_em, DEFINER com search_path vazio';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) NÃO-REGRESSÃO DO IRMÃO — trg_notif_revisao_solicitada (42-07) intacto.
--
--     Esta migration mexe na MESMA tabela (`decisao_final`) e no MESMO CHECK que a
--     42-07 acabou de entregar. O irmão está VIVO em PROD e é o REVISAO-01 inteiro;
--     um descuido que o dropasse sairia daqui em silêncio — pedidos de revisão
--     deixariam de chegar ao RH e ninguém veria erro em lugar nenhum.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_triggerdef(t.oid) INTO v_def
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.decisao_final'::regclass
     AND t.tgname = 'trg_notif_revisao_solicitada'
     AND NOT t.tgisinternal;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P42N FAIL (d): trg_notif_revisao_solicitada DESAPARECEU de public.decisao_final — o apply desta migration derrubou o REVISAO-01 entregue pela 42-07';
  END IF;
  IF v_def NOT LIKE '%AFTER UPDATE OF revisao_solicitada_em%' THEN
    RAISE EXCEPTION 'P42N FAIL (d): trg_notif_revisao_solicitada mudou de forma — esperado AFTER UPDATE OF revisao_solicitada_em: %', v_def;
  END IF;

  PERFORM set_config('smoke42n.pass', (coalesce(nullif(current_setting('smoke42n.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): trg_notif_revisao_solicitada (42-07) continua vivo e com a mesma forma';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (y) TEARDOWN ASSERIDO — nenhuma linha do smoke sobreviveu, e o ledger voltou ao
--     tamanho anterior. As subtransações já revertem tudo; esta asserção existe
--     porque "deveria ter revertido" e "reverteu" são afirmações diferentes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_resto int;
  v_agora int;
  v_antes int := coalesce(nullif(current_setting('smoke42n.antes', true), ''), '-1')::int;
BEGIN
  SELECT count(*) INTO v_resto
    FROM public.notificacoes_enviadas
   WHERE dedupe_key LIKE 'smoke42n:%' OR template = 'smoke42n';

  IF v_resto <> 0 THEN
    -- Remoção defensiva ANTES de falhar: uma linha 'pendente' esquecida vira dispatch
    -- recorrente do cron. Falhamos depois de conter o dano, não antes.
    DELETE FROM public.notificacoes_enviadas
     WHERE dedupe_key LIKE 'smoke42n:%' OR template = 'smoke42n';
    RAISE EXCEPTION 'P42N FAIL (y): % linha(s) do smoke sobreviveram às subtransações (removidas agora) — o idioma de rollback não está funcionando como escrito', v_resto;
  END IF;

  SELECT count(*) INTO v_agora FROM public.notificacoes_enviadas;
  IF v_antes >= 0 AND v_agora <> v_antes THEN
    RAISE EXCEPTION 'P42N FAIL (y): o ledger saiu de % para % linhas — o smoke deixou efeito colateral', v_antes, v_agora;
  END IF;

  RAISE NOTICE 'TEARDOWN ok: zero linha do smoke remanescente; ledger de volta a % linhas', v_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 4;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke42n.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P42N FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
