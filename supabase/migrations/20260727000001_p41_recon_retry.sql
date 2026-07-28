-- =============================================================================
-- Migration: P41 — reconciliação + retry do ledger de notificação
-- Date: 2026-07-27
-- Milestone: M7 (v7.0 — Comunicação com o Candidato)
-- Phase: 41 (reconciliacao-de-entrega-retry-testing) / Plano 41-03
-- Requirements: RECON-01, RECON-02, RECON-03
-- =============================================================================
--
-- PURPOSE
--   A ÚNICA migration aditiva da P41 — fecha o loop fire-and-forget da entrega.
--   Cada peça tem gêmeo vivo em PROD; isto é adaptação cirúrgica, não construção
--   nova. Em ordem:
--
--   (A) RECON-01 — colunas finais da state machine `pendente -> enviado ->
--       (entregue | falhou | bounce | reclamado)`: `bounce_em` e `reclamado_em`
--       (timestamptz NULL). O enum `status_notificacao` JÁ tem os labels `bounce`
--       e `reclamado` (20260721000001:57-64); faltavam só os carimbos de tempo,
--       deferidos da P37 para cá (STATE / Pending Todos). Forma copiada de
--       20260722000002 (P37, LEDGER-01) — mas SEM NOT NULL: ao contrário do
--       `destinatario_original` da P37 (tabela então vazia), a tabela pode ter
--       ganho linhas, então NOT NULL falharia alto sem backfill possível.
--
--   (B) RECON-02 — `ler_resend_webhook_secret()`: leitora minimamente
--       privilegiada do segredo `resend_webhook_secret` do Vault (o secret Svix
--       que a EF `resend-webhook` da P41-02 usa para verificar a assinatura).
--       Mirror EXATO de `ler_resend_api_key` (20260722000001, P36 DELIV-02):
--       sem argumento (blast-radius de 1 segredo), escopada ao literal,
--       SECURITY DEFINER SET search_path='', NULL graceful, execução só a
--       service_role.
--
--   (C) RECON-03 — `varrer_retry_notificacoes()` + cron `notif-retry-sweep`
--       (*/15 * * * *): rede de segurança do trabalho assíncrono cujo
--       `net.http_post` inicial pode ter se perdido (pg_net é at-most-once,
--       janela ~6h). A função re-invoca a EF `notificar-candidato` em modo retry
--       para cada linha elegível. Esqueleto do hop `net.http_post`+Vault copiado
--       verbatim de 20260726000001 (P39); o cron.schedule de 20260609000003 (P09).
--
-- NÃO CRIAMOS NENHUM ÍNDICE AQUI (RESEARCH anti-pattern; nota P37 41-64)
--   `idx_notif_retry` (btree (proxima_tentativa_em) WHERE status IN
--   ('pendente','falhou')) e `idx_notif_provider_msg` (btree (provider_message_id)
--   WHERE provider_message_id IS NOT NULL) JÁ vivem em PROD desde
--   20260721000001:100-110, e a P37 já provou isso por smoke. Recriá-los daria
--   erro de nome duplicado; recriá-los com IF NOT EXISTS seria um no-op silencioso
--   que mascara divergência de definição. Este arquivo NÃO os toca; o smoke
--   `p41_recon_retry_smoke.sql` os VERIFICA estruturalmente (asserção b).
--
-- INVARIANTE DE SEGURANÇA DA VARREDURA (Pitfall 5 / T-41-09)
--   O Bearer da re-invocação usa `edge_invoke_key` do Vault (== NOTIFICAR_SECRET
--   da EF), NUNCA a chave de service-role. A invariante `edge_invoke_key` ==
--   chave de service-role injetada está QUEBRADA por rotação (STATE 2026-07-26),
--   então usar a chave de service-role daria 401 na EF. A varredura tampouco incrementa
--   `tentativas` — o `net.http_post` é at-most-once e a varredura não sabe o
--   resultado; quem incrementa `tentativas` e grava `proxima_tentativa_em` é a EF,
--   só ao de fato tentar enviar (at-most-once). Cap de rajada: `tentativas < 5`
--   na seleção + `LIMIT 20` por sweep (T-41-10).
--
-- NOTE: sem wrapper transacional externo (BEGIN/COMMIT) — CLAUDE.md D-22. O
--   driver do Supabase já envolve cada migration em sua própria transação, e o
--   wrapper externo é justamente o gatilho do SQLSTATE 42601 em corpo PL/pgSQL
--   `$$` adjacente a COMMENT/REVOKE/cron.schedule. Apply em PROD via Supabase MCP
--   `apply_migration` (NUNCA `supabase db push --linked`) + reconcile do ledger
--   (schema_migrations.version -> prefixo do filename) após o apply. Quem aplica é
--   o Plano GATED 41-05 (subagentes não têm MCP — bug #13898).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (A) RECON-01 · colunas finais da state machine (bounce_em + reclamado_em)
-- ---------------------------------------------------------------------------
-- `timestamptz` NULL, SEM default: NULL significa "o evento ainda não ocorreu".
-- Populadas pela EF `resend-webhook` (P41-02) ao reconciliar por
-- provider_message_id. `enviado_em`/`entregue_em` JÁ existem (20260721000001);
-- estas duas completam os estados terminais bounce/reclamado.
ALTER TABLE public.notificacoes_enviadas
  ADD COLUMN bounce_em timestamptz;

ALTER TABLE public.notificacoes_enviadas
  ADD COLUMN reclamado_em timestamptz;

COMMENT ON COLUMN public.notificacoes_enviadas.bounce_em IS
  'M7/P41 RECON-01/02: timestamp do evento email.bounced do webhook Resend '
  '(estado terminal bounce da state machine). NULL ate o bounce ocorrer. '
  'Gravada pela EF resend-webhook ao reconciliar por provider_message_id.';

COMMENT ON COLUMN public.notificacoes_enviadas.reclamado_em IS
  'M7/P41 RECON-01/02: timestamp do evento email.complained do webhook Resend '
  '(estado terminal reclamado / spam-complaint). NULL ate a reclamacao ocorrer. '
  'Coluna deferida da P37 para a P41 (STATE Pending Todos). Gravada pela EF '
  'resend-webhook ao reconciliar por provider_message_id.';

-- ---------------------------------------------------------------------------
-- (B) RECON-02 · ler_resend_webhook_secret() — leitora escopada do Vault
-- ---------------------------------------------------------------------------
-- Mirror EXATO de ler_resend_api_key (20260722000001, P36 DELIV-02). A EF
-- resend-webhook (verify_jwt=false) chama esta RPC com um client service_role
-- para obter o segredo Svix e verificar a assinatura do webhook em runtime. Sem
-- argumento por DECISÃO DE SEGURANÇA: uma RPC genérica ler_segredo(text) faria um
-- comprometimento de service_role ler TODOS os segredos do Vault (project_url,
-- edge_invoke_key, resend_api_key, …); escopar ao literal limita o blast-radius a
-- UM segredo (T-41-11). SECURITY DEFINER + SET search_path='' + referência
-- totalmente qualificada a vault.decrypted_secrets = imune a sequestro de nome.
CREATE OR REPLACE FUNCTION public.ler_resend_webhook_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'resend_webhook_secret';

  -- NULL = segredo ainda não provisionado (Plano 41-05, ao registrar o webhook
  -- no dashboard Resend). O chamador trata como skip legível; nenhuma exceção é
  -- levantada e o valor NUNCA é logado aqui.
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.ler_resend_webhook_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_resend_webhook_secret() FROM anon;
REVOKE ALL ON FUNCTION public.ler_resend_webhook_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ler_resend_webhook_secret() TO service_role;

COMMENT ON FUNCTION public.ler_resend_webhook_secret() IS
  'M7/P41 RECON-02: leitora do UNICO segredo Vault `resend_webhook_secret` '
  '(secret Svix de verificacao do webhook Resend). Sem argumento por decisao de '
  'seguranca — um comprometimento de service_role expoe UM segredo, nao todos os '
  'do Vault (mirror de ler_resend_api_key da P36). Consumida pela Edge Function '
  'resend-webhook (P41-02) via client service_role; execucao revogada de '
  'PUBLIC/anon/authenticated. Retorna NULL enquanto o segredo nao estiver '
  'provisionado (graceful skip, sem excecao, sem log do valor).';

-- ---------------------------------------------------------------------------
-- (C) RECON-03 · varrer_retry_notificacoes() — re-invoca a EF em modo retry
-- ---------------------------------------------------------------------------
-- Hop net.http_post + Vault copiado verbatim de 20260726000001 (P39). A
-- varredura seleciona as linhas elegíveis (não-terminais, ainda dentro do cap e
-- com o backoff vencido) e re-dispara a EF `notificar-candidato` no branch de
-- retry (sinalizado por `retry_id` no body — P41-01). Cada dispatch em BEGIN…
-- EXCEPTION isolado: uma falha de re-invocação de uma linha NÃO aborta as demais
-- nem levanta erro pro cron. A varredura NÃO incrementa `tentativas` (só a EF, ao
-- tentar — at-most-once).
CREATE OR REPLACE FUNCTION public.varrer_retry_notificacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  r             record;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- segredos ausentes — varredura adiada, ledger intacto (graceful-skip)
  END IF;

  -- Seleção coberta por idx_notif_retry (btree proxima_tentativa_em WHERE status
  -- IN ('pendente','falhou')). tentativas < 5 = cap; NULLS FIRST prioriza as que
  -- nunca foram agendadas; LIMIT 20 é o cinto anti-rajada (free-tier Resend,
  -- T-41-10/T-41-13).
  FOR r IN
    SELECT id, evento, candidatura_id, dedupe_key
      FROM public.notificacoes_enviadas
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
     ORDER BY proxima_tentativa_em NULLS FIRST
     LIMIT 20
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(
          'retry_id', r.id,               -- sinaliza o branch de retry na EF (P41-01)
          'evento', r.evento,
          'candidatura_id', r.candidatura_id,
          -- convite: dedupe_key = '{agendamento_id}:convite' (helpers.ts:38),
          -- então o agendamento_id é o 1º campo. Demais eventos: NULL.
          'agendamento_id',
            CASE WHEN r.evento = 'convite'
                 THEN split_part(r.dedupe_key, ':', 1) END
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM PUBLIC;

COMMENT ON FUNCTION public.varrer_retry_notificacoes() IS
  'M7/P41 RECON-03: varredura de retry acionada pelo cron notif-retry-sweep a '
  'cada 15 min. Re-invoca a EF notificar-candidato (branch retry via retry_id no '
  'body) para cada notificacao nao-terminal (status pendente/falhou) dentro do '
  'cap (tentativas < 5) e com o backoff vencido (proxima_tentativa_em). Bearer = '
  'edge_invoke_key do Vault (== NOTIFICAR_SECRET da EF), NUNCA a chave de '
  'service_role — a invariante esta quebrada por rotacao (Pitfall 5). A varredura '
  'NAO incrementa tentativas: o net.http_post e at-most-once e ela nao sabe o '
  'resultado; quem incrementa e a EF, so ao tentar. LIMIT 20 por sweep = cinto '
  'anti-rajada do free-tier Resend. SECURITY DEFINER + search_path vazio; cada '
  'dispatch isolado em EXCEPTION WHEN OTHERS (uma falha nao aborta as demais).';

-- ---------------------------------------------------------------------------
-- (D) RECON-03 · agendamento cron idempotente (notif-retry-sweep, */15)
-- ---------------------------------------------------------------------------
-- unschedule guard ANTES do schedule: re-aplicar a migration NÃO duplica o job
-- (anti-pattern RESEARCH). O corpo do job é o $sweep$ que só chama a função.
SELECT cron.unschedule('notif-retry-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notif-retry-sweep');

SELECT cron.schedule(
  'notif-retry-sweep',
  '*/15 * * * *',
  $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$
);
