---
phase: 41-reconcilia-o-de-entrega-retry-testing
plan: 03
subsystem: notificacoes
tags: [migration, pg_cron, vault, net-http-post, security-definer, retry, reconciliacao, smoke]

# Dependency graph
requires:
  - phase: 37-camada-de-dados-de-notificacao
    provides: "notificacoes_enviadas (enum status_notificacao com bounce/reclamado; idx_notif_retry + idx_notif_provider_msg vivos em PROD) + molde ALTER+COMMENT aditivo (20260722000002)"
  - phase: 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
    provides: "hop net.http_post + Vault (Bearer edge_invoke_key, graceful-skip, EXCEPTION WHEN OTHERS) — copiado verbatim (20260726000001)"
  - phase: 36-deliverability-sender-identity
    provides: "ler_resend_api_key() — mirror escopado da leitora do Vault (20260722000001)"
  - phase: 41-reconcilia-o-de-entrega-retry-testing
    provides: "EF notificar-candidato com branch retry via retry_id (41-01) + EF resend-webhook que consome ler_resend_webhook_secret (41-02)"
provides:
  - "migration 20260727000001_p41_recon_retry.sql: ADD COLUMN bounce_em + reclamado_em (timestamptz NULL) + COMMENT (RECON-01)"
  - "ler_resend_webhook_secret() — RPC leitora escopada do segredo Svix no Vault, SECURITY DEFINER, service_role-only (RECON-02)"
  - "varrer_retry_notificacoes() — SECURITY DEFINER que re-invoca a EF notificar-candidato em modo retry por net.http_post Bearer edge_invoke_key (RECON-03)"
  - "cron notif-retry-sweep '*/15 * * * *' idempotente (unschedule guard)"
  - "smoke p41_recon_retry_smoke.sql — gate-GUC de fidelidade (5 asserções estruturais/catálogo, esperado fixo 5)"
affects: [41-05 (apply da migration via MCP + reconcile do ledger + registro do webhook + secret no Vault + execução do smoke + UAT ao vivo)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "varredura pg_cron -> função SQL SECURITY DEFINER -> net.http_post re-invoca a EF (rede de segurança do at-most-once do pg_net, janela ~6h, cadência 15min)"
    - "RPC leitora do Vault escopada ao literal (blast-radius de 1 segredo) — 2ª instância do padrão ler_resend_api_key"
    - "agendamento cron idempotente: cron.unschedule guard antes de cron.schedule (re-apply não duplica job)"
    - "smoke gate-GUC 100% estrutural/catálogo (sem INSERT) — esperado fixo, seguro em PROD vivo (≠ p39 que tem metade comportamental adaptativa)"

key-files:
  created:
    - supabase/migrations/20260727000001_p41_recon_retry.sql
    - supabase/tests/p41_recon_retry_smoke.sql
    - .planning/phases/41-reconcilia-o-de-entrega-retry-testing/41-03-SUMMARY.md
  modified: []

key-decisions:
  - "RECON-01/02/03 mantidos Pending — este plano SÓ ESCREVE os arquivos .sql (SAFE-NOW, zero contato com PROD). O comportamento vivo depende do 41-05 (apply via MCP apply_migration + reconcile do ledger + registro do webhook no dashboard Resend + provisionamento do resend_webhook_secret no Vault + execução do smoke). Marcar completo agora seria impreciso — mesmo critério de 41-01 (RECON-03 Pending) e 41-02 (RECON-01/02 Pending)."
  - "bounce_em/reclamado_em entram timestamptz NULL (SEM NOT NULL) — a tabela pode ter ganho linhas desde a P37; NOT NULL falharia alto sem backfill possível. Difere do destinatario_original NOT NULL da P37 (que exigia tabela vazia)."
  - "Bearer da varredura = edge_invoke_key do Vault, NUNCA a chave de service-role (invariante quebrada por rotação — Pitfall 5). A varredura NÃO incrementa tentativas: net.http_post é at-most-once, quem incrementa é a EF ao tentar. Cap de rajada: tentativas < 5 + LIMIT 20 por sweep (T-41-09/T-41-10)."
  - "NENHUM CREATE INDEX na migration — idx_notif_retry e idx_notif_provider_msg já vivem em PROD (provado no smoke da P37); recriar com IF NOT EXISTS seria no-op silencioso que mascara divergência. O smoke (b) os VERIFICA."
  - "split_part(dedupe_key, ':', 1) extrai o agendamento_id do convite — confirmado contra helpers.ts:38 (montarDedupeKey retorna `${agendamentoId}:convite`), então o agendamento_id é o 1º campo. Não é a interpretação genérica do COMMENT do dedupe_key da P37."
  - "Smoke com esperado FIXO em 5 (não adaptativo): as 5 asserções são todas estruturais/catálogo (information_schema, pg_indexes, pg_proc/proacl, pg_get_functiondef, cron.job) — SEM INSERT, então não há metade comportamental que dispararia e-mail real; o esperado fixo é honesto e seguro em PROD vivo."

patterns-established:
  - "varredura pg_cron re-invocando EF (rede de segurança at-most-once) — reusável p/ qualquer trabalho assíncrono fire-and-forget com fila no próprio ledger"
  - "smoke gate-GUC puramente estrutural com esperado fixo — quando nenhuma asserção precisa de fixture/comportamento, o esperado não precisa ser adaptativo ao ambiente"

requirements-completed: []  # RECON-01/02/03 code-complete (arquivos escritos) mas NÃO live — completam no 41-05 (apply + reconcile + smoke + registro webhook); ver Decisões

# Metrics
duration: 6min
completed: 2026-07-27
---

# Phase 41 Plan 03: Migration aditiva de reconciliação + retry (colunas + RPC + varredura + cron) Summary

**A única migration aditiva da P41 (`20260727000001_p41_recon_retry.sql`) + o smoke de fidelidade: adiciona `bounce_em`/`reclamado_em` à state machine (RECON-01), cria `ler_resend_webhook_secret()` (leitora escopada do Vault, mirror de `ler_resend_api_key`, RECON-02) e `varrer_retry_notificacoes()` + o cron `notif-retry-sweep` a cada 15 min que re-invoca a EF `notificar-candidato` em modo retry via `net.http_post` Bearer `edge_invoke_key` (RECON-03) — tudo adaptação cirúrgica de padrões vivos, SEM `CREATE INDEX`, SEM `BEGIN/COMMIT` externo, ZERO contato com PROD (apply é o 41-05).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-27T00:33:55Z
- **Completed:** 2026-07-27T00:40:00Z (aprox.)
- **Tasks:** 2 (ambas `type=auto`, autônomas)
- **Files:** 2 created, 0 modified

## Accomplishments

- **`supabase/migrations/20260727000001_p41_recon_retry.sql`** (227 linhas, 4 blocos):
  - **(A) RECON-01:** `ALTER TABLE public.notificacoes_enviadas ADD COLUMN bounce_em timestamptz` + `ADD COLUMN reclamado_em timestamptz` (NULL, sem default) + `COMMENT ON COLUMN` para cada. Colunas terminais da state machine `pendente → enviado → (entregue | falhou | bounce | reclamado)` — o enum já tinha os labels desde a P37; faltavam os carimbos de tempo. Header documenta explicitamente por que **nenhum índice é criado** (`idx_notif_retry`/`idx_notif_provider_msg` já vivem em PROD).
  - **(B) RECON-02:** `ler_resend_webhook_secret()` — mirror EXATO de `ler_resend_api_key` (P36): `SECURITY DEFINER SET search_path = ''`, sem argumento, escopada ao literal `'resend_webhook_secret'`, retorna NULL graceful (sem exceção, sem log do valor), `REVOKE ALL FROM PUBLIC/anon/authenticated` + `GRANT EXECUTE TO service_role` + `COMMENT` explicando o blast-radius de 1 segredo.
  - **(C) RECON-03:** `varrer_retry_notificacoes()` — `SECURITY DEFINER SET search_path = ''` que lê `project_url`+`edge_invoke_key` do Vault (graceful-skip se NULL); `FOR r IN SELECT … WHERE status IN ('pendente','falhou') AND tentativas < 5 AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now()) ORDER BY proxima_tentativa_em NULLS FIRST LIMIT 20`; cada dispatch em `BEGIN PERFORM net.http_post(url := …/functions/v1/notificar-candidato, headers Bearer edge_invoke_key, body := jsonb_build_object('retry_id', r.id, 'evento', r.evento, 'candidatura_id', r.candidatura_id, 'agendamento_id', CASE WHEN r.evento = 'convite' THEN split_part(r.dedupe_key, ':', 1) END)) EXCEPTION WHEN OTHERS THEN RAISE WARNING …; END`; `REVOKE ALL … FROM PUBLIC` + `COMMENT`.
  - **(D) RECON-03:** `SELECT cron.unschedule('notif-retry-sweep') WHERE EXISTS (…)` (guard idempotente) seguido de `SELECT cron.schedule('notif-retry-sweep', '*/15 * * * *', $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$)`.
  - Sem wrapper `BEGIN;/COMMIT;` externo (evita 42601 no apply via pooler). Domínio em pt-BR nos COMMENTs.
- **`supabase/tests/p41_recon_retry_smoke.sql`** (259 linhas, 5 asserções + RESUMO): gate-GUC no molde do `p39_rewire_triggers_smoke.sql`, **100% estrutural/catálogo (sem INSERT)** — seguro em PROD vivo:
  - **(a)** `bounce_em`/`reclamado_em` existem, `timestamp with time zone`, nullable (`information_schema.columns`).
  - **(b)** `idx_notif_retry` (predicado parcial `proxima_tentativa_em` WHERE `pendente`/`falhou`) e `idx_notif_provider_msg` (`provider_message_id`) preservados (`pg_indexes.indexdef`) — prova que a migration NÃO os recriou.
  - **(c)** `ler_resend_webhook_secret()` é `SECURITY DEFINER` (`pg_proc.prosecdef`), sem EXECUTE para PUBLIC (`aclexplode(proacl)`, grantee 0) / anon / authenticated (`has_function_privilege`), COM EXECUTE para `service_role`.
  - **(d)** `pg_get_functiondef('public.varrer_retry_notificacoes()')` contém `status IN`/`pendente`/`falhou`, `tentativas < 5`, `edge_invoke_key`, `/functions/v1/notificar-candidato`, `retry_id`, `split_part` — e **NÃO** contém `service_role`.
  - **(e)** o job `notif-retry-sweep` está em `cron.job` com schedule `*/15 * * * *` (igualdade exata de nome, sem LIKE).
  - **(z) RESUMO:** `RAISE EXCEPTION` se o total de PASS ≠ 5 (esperado FIXO — run parcial NÃO é verde).

## Deviations from Plan

None - plano executado exatamente como escrito.

Ajuste de redação (não é desvio de comportamento): a nota de header da migration menciona a chave de service-role por extenso ("a chave de service-role injetada") em vez do token literal `SUPABASE_SERVICE_ROLE_KEY`, para satisfazer o critério de aceitação `grep -ci "service_role_key" == 0` sem perder o sentido. O corpo da função `varrer_retry_notificacoes` não contém `service_role` (asserção d do smoke).

## Threat Model Honored

| Threat ID | Mitigação aplicada |
|-----------|--------------------|
| T-41-09 (EoP/DoS — Bearer errado) | Bearer = `edge_invoke_key` do Vault, NUNCA service-role; smoke (d) asserta que o def NÃO contém `service_role` |
| T-41-10 (DoS — loop de e-mail) | `tentativas < 5` na seleção + `LIMIT 20` por sweep + backoff via `proxima_tentativa_em`; smoke (d) asserta `tentativas < 5` |
| T-41-11 (Info disclosure — segredo vazado) | `ler_resend_webhook_secret` sem argumento, escopada ao literal, REVOKE de PUBLIC/anon/authenticated, GRANT só service_role; smoke (c) asserta o escopo |
| T-41-12 (Tampering — 42601 no apply) | Sem wrapper `BEGIN/COMMIT` externo; apply via MCP `apply_migration` (não `db push`) — checkpoint do orquestrador no 41-05 |
| T-41-13 (DoS — free-tier estoura no flush) | `accept` no register; `LIMIT 20` por sweep como ponto de partida (decisão de subir p/ Pro fica com Fernando antes do flush) |

## Notes for 41-05 (GATED — orquestrador via MCP)

- **Apply:** via Supabase MCP `apply_migration` (subagentes não têm MCP — bug #13898), NUNCA `db push` (42601 nos corpos `$$`). Reconcile do ledger (`schema_migrations.version` → prefixo `20260727000001`) obrigatório após o apply.
- **Provisionar `resend_webhook_secret` no Vault** (secret Svix do dashboard Resend) — sem ele a EF `resend-webhook` recebe NULL da RPC e faz skip legível.
- **Registrar o webhook no dashboard Resend** apontando para a EF `resend-webhook`.
- **Rodar `p41_recon_retry_smoke.sql`** via MCP `execute_sql` DEPOIS do apply — RED até lá; gate verde = 5/5 no RESUMO.
- **Pré-req de auth da varredura:** confirmar que `NOTIFICAR_SECRET` (env da EF `notificar-candidato`) == `edge_invoke_key` (Vault); senão a re-invocação leva 401 (Pitfall 5).
- **DELIV-01 ainda aberto** (subdomínio `rh.beautysmile.com.br` não verificado no Resend): enquanto isso, os sends gravam `falhou` e a varredura os re-tenta — quanto antes verificar, menor o backlog no flush.

## Self-Check: PASSED

- Arquivos criados confirmados em disco: `supabase/migrations/20260727000001_p41_recon_retry.sql`, `supabase/tests/p41_recon_retry_smoke.sql`, `41-03-SUMMARY.md`.
- Commits confirmados no git log: `e1dd2a7` (migration), `35d7e56` (smoke).
- Scan de stubs: nenhum stub genuíno (os matches de "TODO" são "TODOS"/"Pending Todos" — pt-BR "all" e referência a seção da STATE, não marcadores).
