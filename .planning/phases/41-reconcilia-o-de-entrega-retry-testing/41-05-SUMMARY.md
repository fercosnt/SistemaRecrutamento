---
phase: 41-reconcilia-o-de-entrega-retry-testing
plan: 05
status: partial
completed: 2026-07-28
tasks_done: 2
tasks_total: 3
blocked_on: "Task 3 — ação humana (Fernando): registrar o endpoint no dashboard Resend + provisionar `resend_webhook_secret` no Vault"
requirements: [RECON-01, RECON-02, RECON-03]
---

# Plano 41-05 — Aterrissagem em PROD (SUMMARY)

**Resultado: Tasks 1 e 2 PASS. Task 3 permanece com o Fernando (ação humana, sem caminho autônomo).**

Sessão de 2026-07-28. O bloqueio da sessão anterior (MCP `read_only=true`) foi removido pelo
operador; confirmado empiricamente antes de qualquer escrita:
`current_user=postgres`, `session_user=postgres`, `transaction_read_only=off`.

## Pré-requisito cumprido ANTES do 41-05 — redeploy da P39

A ordem obrigatória registrada no STATE (redeploy do fix da P39 **antes** de aplicar o 41-05)
foi respeitada: `notificar-candidato` foi redeployada **v2 → v3** com o fix `f3b7304`
(CR-01/CR-02) **antes** do apply desta migration. Sem isso, aplicar o 41-05 converteria os
dois defeitos críticos em dano real a candidatos. Ver `39-VERIFICATION.md`.

## Task 1 — Gate svix + apply + reconcile + smoke ✅ PASS

### (1) Gate de legitimidade `npm:svix@1.99.1` (T-41-SC) — LIMPO

Checkpoint **não auto-aprovável**; aprovado pelo operador após a auditoria abaixo.

| Critério | Resultado |
|---|---|
| Lib oficial da Svix | ✅ `git+https://github.com/svix/svix-webhooks.git`, licença MIT |
| `postinstall` | ✅ **Ausente** — em `svix` e em TODA a árvore transitiva |
| Fecho de dependências | `svix@1.99.1` → `standardwebhooks@1.0.0` → `@stablelib/base64@1.0.1`, `fast-sha256@1.3.0` |
| Integridade lockfile × registry | ✅ **Match exato** nos 4 pacotes (sha512 comparado 1:1 com `registry.npmjs.org`) |
| Pin no `deno.lock` | ✅ `"npm:svix@1.99.1": "1.99.1"` em `supabase/functions/deno.lock` |
| `deno check resend-webhook/index.ts` | ✅ exit 0 — svix resolve |

`standardwebhooks` é do org oficial do spec (`github.com/standard-webhooks/standard-webhooks`).
Os scripts publicados são `build`/`prepare`/`test`/`prepublishOnly`/lint — **nenhum
`postinstall`**; e o Deno não executa lifecycle scripts de npm de todo modo.

### (2)(3) Apply + reconcile do ledger

- `apply_migration` (nome `p41_recon_retry`) — **NÃO** `db push` (evita 42601 nos corpos `$$`). Retorno `{"success": true}`.
- O MCP gravou a version com timestamp próprio: `20260728000659` / `p41_recon_retry`.
- **Reconcile obrigatório aplicado** → `20260727000001` / `20260727000001_p41_recon_retry`,
  em sequência correta após `20260726000001` (P39). Zero drift novo.

### (4) Smoke `p41_recon_retry_smoke.sql` — **GATE VERDE 5/5**

Rodado via MCP `execute_sql` numa única sessão (para o GUC `smoke41.pass` acumular).
`current_setting('smoke41.pass')` = **5**; a asserção (z) não levantou exceção.

| # | Asserção | Veredito |
|---|---|---|
| a | `bounce_em` + `reclamado_em` existem, `timestamptz`, NULLABLE | ✅ |
| b | `idx_notif_retry` + `idx_notif_provider_msg` preservados na forma viva (migration não os recriou) | ✅ |
| c | `ler_resend_webhook_secret()` SECURITY DEFINER, revogada de PUBLIC/anon/authenticated, EXECUTE só p/ service_role | ✅ |
| d | `varrer_retry_notificacoes()` — predicado pendente/falhou + `tentativas < 5` + Bearer `edge_invoke_key` + `retry_id` + `split_part`, **sem** `service_role` | ✅ |
| e | job `notif-retry-sweep` em `cron.job`, schedule `*/15 * * * *` | ✅ |

Todas estruturais/catálogo — zero INSERT, zero `net.http_post`, zero e-mail. Seguras em PROD vivo.

## Task 2 — Deploy resend-webhook + verificação de postura ✅ PASS (1 critério deferido)

- **`resend-webhook` deployada v1, ACTIVE, `verify_jwt=false`** (MCP `deploy_edge_function`).
  Bundle: `resend-webhook/index.ts` (entrypoint) + `resend-webhook/helpers.ts`.
- **`npm:svix` RESOLVEU no deploy — Pitfall 2 descartado.** Prova: a EF **executa** e devolve
  a string `misconfigured` do próprio código (cold start 2173ms, depois 368/614ms nos logs).
  Um `ERR_MODULE_NOT_FOUND` falharia no **boot**, nunca alcançaria o corpo da `Deno.serve`.
- **`notificar-candidato` v3 ACTIVE**, self-auth intacta: `curl` sem Bearer → **401**, Bearer
  inválido → **401**, corpo `{"ok":false,"error_code":"UNAUTHORIZED",...}` (resposta da EF,
  não do gateway). Logs confirmam `version: 3`.
- **URL do webhook (insumo da Task 3):**
  `https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/resend-webhook`

### ⏸ Critério deferido — "POST sem assinatura → 400"

Hoje um POST sem assinatura devolve **500 `misconfigured`**, não 400. Isso é **correto e
esperado**: `resend_webhook_secret` ainda não existe no Vault, e o wiring de produção lê o
segredo **antes** de delegar ao `handler` — então a EF falha fechada antes do ponto onde a
verificação Svix acontece. O critério 400 só é testável **depois** da Task 3. O que já está
provado: a EF é inalcançável sem configuração válida e **não escreve nada** (`ledger = 0`).

## Prova ao vivo de RECON-03 (segura)

`SELECT public.varrer_retry_notificacoes();` executou **sem exceção** e foi um **no-op real**:

- `notificacoes_enviadas` = **0 linhas** (nada elegível a re-tentar)
- `net._http_response` sem novas linhas (max id continua **61**), 0 dispatches em 10 min
- `cron.job` → `notif-retry-sweep | */15 * * * * | active=true`

## Task 3 — PENDENTE (ação humana do Fernando)

Sem caminho autônomo: o `whsec_…` só existe depois do registro no dashboard, e o dashboard
não tem API para isso.

1. Registrar em https://resend.com/webhooks apontando para
   `https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/resend-webhook`,
   assinando `email.delivered` / `email.bounced` / `email.complained`.
2. Copiar o signing secret `whsec_…`.
3. Provisionar no Vault como `resend_webhook_secret` (literal, **sem placeholder** — ausência
   = NULL diagnosticável, mirror UAT-36-2).
4. Confirmar `select public.ler_resend_webhook_secret() is not null;` → `true` (sem imprimir o valor).
5. Re-testar a postura: POST sem assinatura Svix → deve virar **400** (não mais 500), zero writes.

Estado do Vault agora: `edge_invoke_key`, `project_url`, `resend_api_key` — **sem**
`resend_webhook_secret` (`ler_resend_webhook_secret()` devolve NULL, graceful).

## Requirements

| Req | Estado |
|---|---|
| RECON-01 | ✅ state machine completa — `bounce_em`/`reclamado_em` vivas; EF de reconciliação deployada |
| RECON-02 | ⏸ código + RPC + índice vivos; **reconciliação real gated no secret do Vault** (Task 3) |
| RECON-03 | ✅ `varrer_retry_notificacoes()` viva + cron `notif-retry-sweep` ativo `*/15`, executada sem exceção |

## UAT ao vivo — DEFERIDO (não bloqueante)

O UAT `delivered@`/`bounced@`/`complained@resend.dev` segue deferido atrás de **DELIV-01**
(verificação do domínio no Resend), conforme o plano. Não bloqueia o fecho da fase — a prova
autônoma é o CI mockado (41-01/02/04) + o smoke SQL 5/5.
