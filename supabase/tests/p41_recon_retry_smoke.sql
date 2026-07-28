-- =============================================================================
-- Phase 41 / Plano 41-03 — smoke de FIDELIDADE da reconciliação + retry
-- (RECON-01 · RECON-02 · RECON-03)
-- =============================================================================
-- Gate de aceitação da migration `20260727000001_p41_recon_retry.sql`. Rodar via
-- Supabase MCP `execute_sql` (ou psql num Postgres descartável) DEPOIS que o
-- Plano GATED 41-05 aplicar a migration. RED até lá — as colunas novas, a RPC, a
-- função da varredura e o job cron precisam existir para as asserções resolverem.
--
-- ⚠ TODAS as 5 asserções são ESTRUTURAIS/CATÁLOGO — SEM `INSERT` no ledger, SEM
--   `net.http_post`, SEM disparo de e-mail. São SEGURAS EM PROD VIVO: não tocam
--   dados nem provocam efeito colateral. Por isso o esperado é FIXO em 5 (não há
--   metade comportamental adaptativa como no p39 — nada aqui muda de contagem
--   conforme o ambiente). Um schema pode ter a forma certa e a migration ter
--   recriado um índice, esquecido um REVOKE, ou trocado o Bearer da varredura por
--   service_role; este smoke prova que NADA disso aconteceu.
--
-- GATE VERDE = a contagem AUTO-EXIGIDA `smoke41.pass` bate 5 no RESUMO (z). O gate
--   NÃO é "não levantou exceção": um run parcial (asserção pulada por erro de
--   ambiente) acumularia < 5 e o RESUMO (z) reprova. Cada asserção incrementa o
--   GUC; o RESUMO levanta exceção se o total ≠ 5.
--
-- AS ASSERÇÕES
--   (a) RECON-01 — bounce_em e reclamado_em existem em notificacoes_enviadas,
--       ambas `timestamp with time zone` e NULLABLE (information_schema.columns).
--   (b) RECON — idx_notif_retry e idx_notif_provider_msg CONTINUAM vivos na forma
--       esperada (pg_indexes.indexdef). Prova que a migration NÃO os recriou.
--   (c) RECON-02 — ler_resend_webhook_secret() existe, é SECURITY DEFINER, sem
--       EXECUTE para PUBLIC/anon/authenticated e COM EXECUTE para service_role
--       (pg_proc.prosecdef + has_function_privilege + aclexplode(proacl)).
--   (d) RECON-03 — pg_get_functiondef(varrer_retry_notificacoes) contém o
--       predicado da seleção (status pendente/falhou, tentativas < 5), o Bearer
--       edge_invoke_key, a URL da EF, o retry_id, o split_part — e NÃO contém
--       service_role (Bearer não usa a chave de service-role).
--   (e) RECON-03 — o job notif-retry-sweep está registrado em cron.job com o
--       schedule '*/15 * * * *'.
--   (z) RESUMO — exige o total de 5 PASS; run parcial falha AQUI, não em silêncio.
--
-- ⚠ NB SOBRE `LIKE`: qualquer contagem por nome escaparia '_' (curinga de 1 char
--   em LIKE) com `\_`; aqui as asserções contam por igualdade exata de nome
--   (index/job/coluna) ou por regprocedure — sem LIKE de padrão de nome, então
--   não há risco de casar vizinhos por acidente.
--
-- HIGIENE: RESET ROLE nas trocas; NOTICEs carregam contagens/booleanos, nunca o
--   valor de segredo nem PII. Nenhuma linha é criada ou removida.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke41.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) RECON-01 — colunas finais da state machine: bounce_em + reclamado_em,
--     timestamptz NULLABLE. SEM INSERT — seguro em PROD vivo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_bounce_type text; v_bounce_null text;
  v_recl_type   text; v_recl_null   text;
BEGIN
  SELECT data_type, is_nullable INTO v_bounce_type, v_bounce_null
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'notificacoes_enviadas'
     AND column_name = 'bounce_em';
  SELECT data_type, is_nullable INTO v_recl_type, v_recl_null
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'notificacoes_enviadas'
     AND column_name = 'reclamado_em';

  IF v_bounce_type IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (a): coluna bounce_em NÃO existe — RECON-01 incompleto';
  END IF;
  IF v_recl_type IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (a): coluna reclamado_em NÃO existe — RECON-01 incompleto';
  END IF;
  IF v_bounce_type <> 'timestamp with time zone' OR v_recl_type <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'P41 FAIL (a): tipos inesperados (bounce_em=% reclamado_em=%) — esperado timestamptz', v_bounce_type, v_recl_type;
  END IF;
  IF v_bounce_null <> 'YES' OR v_recl_null <> 'YES' THEN
    RAISE EXCEPTION 'P41 FAIL (a): colunas NÃO são nullable (bounce_em=% reclamado_em=%) — NOT NULL falharia num ledger com linhas', v_bounce_null, v_recl_null;
  END IF;

  PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): bounce_em e reclamado_em existem, timestamptz e nullable';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) RECON — idx_notif_retry e idx_notif_provider_msg PRESERVADOS. A migration
--     P41 NÃO cria índice; estes já vivem em PROD (20260721000001 / nota P37).
--     Se a P41 os tivesse recriado, a forma poderia divergir — aqui exigimos a
--     forma viva conhecida. SEM INSERT — seguro em PROD vivo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_retry text; v_provider text;
BEGIN
  SELECT indexdef INTO v_retry FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas'
     AND indexname = 'idx_notif_retry';
  SELECT indexdef INTO v_provider FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'notificacoes_enviadas'
     AND indexname = 'idx_notif_provider_msg';

  IF v_retry IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (b): idx_notif_retry NÃO existe — a varredura de retry faria seq scan num ledger crescente';
  END IF;
  -- Forma viva: btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou').
  -- NÃO exigir status como 1ª coluna da chave (o predicado parcial já o fixa; a
  -- forma viva é a correta — mesma decisão da asserção (m) do p37).
  IF strpos(v_retry, 'proxima_tentativa_em') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (b): idx_notif_retry não indexa proxima_tentativa_em: %', v_retry;
  END IF;
  IF strpos(v_retry, 'WHERE') = 0 OR strpos(v_retry, 'pendente') = 0 OR strpos(v_retry, 'falhou') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (b): idx_notif_retry perdeu o predicado parcial pendente/falhou: %', v_retry;
  END IF;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (b): idx_notif_provider_msg NÃO existe — a reconciliação por webhook (P41-02) faria seq scan';
  END IF;
  IF strpos(v_provider, 'provider_message_id') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (b): idx_notif_provider_msg não indexa provider_message_id: %', v_provider;
  END IF;

  PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): idx_notif_retry e idx_notif_provider_msg preservados na forma viva — a migration não os recriou';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) RECON-02 — ler_resend_webhook_secret(): SECURITY DEFINER + escopo de
--     execução. PUBLIC/anon/authenticated SEM execute; service_role COM execute.
--     A ausência de policy é a única barreira do segredo — provada por catálogo
--     de privilégios (T-41-11). SEM INSERT — seguro em PROD vivo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_oid         oid;
  v_secdef      boolean;
  v_proacl      aclitem[];
  v_anon        boolean;
  v_auth        boolean;
  v_srole       boolean;
  v_public_exec boolean;
BEGIN
  SELECT p.oid, p.prosecdef, p.proacl INTO v_oid, v_secdef, v_proacl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'ler_resend_webhook_secret';

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (c): ler_resend_webhook_secret() NÃO existe — RECON-02 incompleto';
  END IF;
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P41 FAIL (c): ler_resend_webhook_secret() NÃO é SECURITY DEFINER — leria o Vault sem privilégio elevado';
  END IF;

  -- proacl NULL = privilégios DEFAULT (PUBLIC tem EXECUTE) → o REVOKE não rodou.
  IF v_proacl IS NULL THEN
    RAISE EXCEPTION 'P41 FAIL (c): proacl NULL — privilégios default, PUBLIC ainda executa (REVOKE ausente)';
  END IF;

  v_anon := has_function_privilege('anon', v_oid, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', v_oid, 'EXECUTE');
  IF v_anon OR v_auth THEN
    RAISE EXCEPTION 'P41 FAIL (c): anon/authenticated ainda têm EXECUTE (anon=% auth=%) — segredo exposto via PostgREST', v_anon, v_auth;
  END IF;

  -- PUBLIC = grantee oid 0 em aclexplode.
  SELECT EXISTS (
    SELECT 1 FROM aclexplode(v_proacl) a
     WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) INTO v_public_exec;
  IF v_public_exec THEN
    RAISE EXCEPTION 'P41 FAIL (c): PUBLIC ainda tem EXECUTE em ler_resend_webhook_secret()';
  END IF;

  v_srole := has_function_privilege('service_role', v_oid, 'EXECUTE');
  IF NOT v_srole THEN
    RAISE EXCEPTION 'P41 FAIL (c): service_role NÃO tem EXECUTE — a EF resend-webhook não conseguiria ler o segredo';
  END IF;

  PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): ler_resend_webhook_secret() é SECURITY DEFINER, revogada de PUBLIC/anon/authenticated, executável só por service_role';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) RECON-03 — corpo de varrer_retry_notificacoes() via pg_get_functiondef
--     (SEM INSERT, seguro em PROD vivo): predicado de seleção + Bearer correto +
--     URL da EF + retry_id + split_part, e SEM service_role no header.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.varrer_retry_notificacoes()'::regprocedure);

  IF strpos(v_def, 'status IN') = 0 OR strpos(v_def, 'pendente') = 0 OR strpos(v_def, 'falhou') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não seleciona status pendente/falhou — a varredura pegaria linhas terminais';
  END IF;
  IF strpos(v_def, 'tentativas < 5') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não capa em tentativas < 5 — loop de e-mail sem freio (T-41-10)';
  END IF;
  IF strpos(v_def, 'edge_invoke_key') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não lê edge_invoke_key do Vault — Bearer errado (Pitfall 5)';
  END IF;
  IF strpos(v_def, '/functions/v1/notificar-candidato') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não re-invoca a EF notificar-candidato';
  END IF;
  IF strpos(v_def, 'retry_id') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não envia retry_id — a EF não entraria no branch de retry (P41-01)';
  END IF;
  IF strpos(v_def, 'split_part') = 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes não deriva o agendamento_id do dedupe_key via split_part';
  END IF;
  IF strpos(v_def, 'service_role') > 0 THEN
    RAISE EXCEPTION 'P41 FAIL (d): varrer_retry_notificacoes contém service_role no corpo — o Bearer DEVE ser edge_invoke_key (T-41-09)';
  END IF;

  PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): varrer_retry_notificacoes — predicado pendente/falhou + tentativas<5 + Bearer edge_invoke_key + retry_id + split_part, sem service_role';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) RECON-03 — o job cron notif-retry-sweep está registrado com o schedule
--     '*/15 * * * *'. Igualdade exata de nome (sem LIKE). SEM INSERT.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_sched text; v_n int;
BEGIN
  SELECT count(*), max(schedule) INTO v_n, v_sched
    FROM cron.job WHERE jobname = 'notif-retry-sweep';

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P41 FAIL (e): há % job(s) notif-retry-sweep em cron.job (esperado 1) — unschedule guard ou schedule falhou', v_n;
  END IF;
  IF v_sched IS DISTINCT FROM '*/15 * * * *' THEN
    RAISE EXCEPTION 'P41 FAIL (e): notif-retry-sweep tem schedule "%" (esperado */15 * * * *)', v_sched;
  END IF;

  PERFORM set_config('smoke41.pass', (coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): job notif-retry-sweep registrado em cron.job com schedule */15 * * * *';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO = 5 (todas estruturais/catálogo,
--     nenhuma comportamental adaptativa). Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_n int; v_esperado int := 5;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke41.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P41 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas (todas estruturais/catálogo) — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
