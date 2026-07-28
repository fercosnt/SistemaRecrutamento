---
phase: 41-reconcilia-o-de-entrega-retry-testing
plan: 05
status: complete
completed: 2026-07-28
tasks_done: 3
tasks_total: 3
blocked_on: null
requirements: [RECON-01, RECON-02, RECON-03]
---

# Plano 41-05 — Aterrissagem em PROD (SUMMARY)

**Resultado: Tasks 1, 2 e 3 PASS. O loop fire-and-forget está FECHADO e provado ao vivo.**

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

### ✅ Critério "POST sem assinatura → 400" — RESOLVIDO após a Task 3

Enquanto o Vault não tinha o secret, o POST devolvia **500 `misconfigured`** (correto: o
wiring lê o segredo **antes** de delegar ao `handler`, então a EF falhava fechada antes do
ponto da verificação Svix). Com o secret provisionado, virou **400 `invalid signature`**,
como especificado. Ver Task 3.

## Prova ao vivo de RECON-03 (segura)

`SELECT public.varrer_retry_notificacoes();` executou **sem exceção** e foi um **no-op real**:

- `notificacoes_enviadas` = **0 linhas** (nada elegível a re-tentar)
- `net._http_response` sem novas linhas (max id continua **61**), 0 dispatches em 10 min
- `cron.job` → `notif-retry-sweep | */15 * * * * | active=true`

## Task 3 — ✅ PASS (ação humana do Fernando + verificação do orquestrador)

O Fernando registrou o endpoint em https://resend.com/webhooks apontando para
`https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/resend-webhook`
(`email.delivered` / `email.bounced` / `email.complained`) e provisionou o `whsec_…` no Vault
como `resend_webhook_secret`.

**Confirmado sem expor o valor:** `ler_resend_webhook_secret()` não-nulo, prefixo `whsec_`,
comprimento 38 (formato Svix legítimo, não placeholder). Vault agora:
`edge_invoke_key`, `project_url`, `resend_api_key`, `resend_webhook_secret`.

### Prova end-to-end da reconciliação (RECON-02)

Assinatura Svix calculada **dentro do Postgres** (`extensions.hmac` sobre
`{svix-id}.{svix-timestamp}.{payload}`, chave = `decode(substring(secret from 7),'base64')`),
de modo que **o segredo nunca saiu do banco** — só a assinatura, válida exclusivamente para
aquele payload/timestamp/msg-id, foi usada no request.

| Cenário | Observado |
|---|---|
| POST **sem** assinatura | **400** `invalid signature` (antes 500) |
| POST com headers Svix **forjados** | **400** `invalid signature` (T-41-04) |
| `GET` | **405** — prova que passou do gate do Vault e alcançou o `handler` |
| POST **assinado** `email.delivered` | **200** → `enviado` → **`entregue`**, `entregue_em` gravado |
| POST **assinado** `email.bounced` | **200** → `entregue` → **`bounce`**, `bounce_em` gravado, `entregue_em` preservado |
| **Replay** com timestamp trocado | **400** — o timestamp integra o conteúdo assinado |

As duas colunas criadas por esta migration (`bounce_em`, `reclamado_em`) foram provadas por
**escrita real da EF**, não só por catálogo.

**Higiene:** linha de teste (`dedupe_key='P41-SMOKE-WEBHOOK-LIMPAR'`) criada e **removida ao
fim** — `notificacoes_enviadas` voltou a **0 linhas** (precedente do smoke da P38). Nenhum
e-mail foi enviado: o webhook apenas ATUALIZA o ledger.

## Requirements

| Req | Estado |
|---|---|
| RECON-01 | ✅ state machine completa — `bounce_em`/`reclamado_em` vivas e **escritas pela EF ao vivo** |
| RECON-02 | ✅ **provado end-to-end** — webhook assinado aceito, reconciliação por `provider_message_id` observada no banco; forjados e replays rejeitados com 400 |
| RECON-03 | ✅ `varrer_retry_notificacoes()` viva + cron `notif-retry-sweep` ativo `*/15`, executada sem exceção |

## UAT ao vivo — DEFERIDO (não bloqueante)

O UAT ponta-a-ponta pelo pipeline REAL do Resend (`delivered@`/`bounced@`/`complained@resend.dev`)
segue deferido atrás de **DELIV-01**, conforme o plano. Não bloqueia o fecho: o trecho
**webhook→ledger** — onde vivia todo o risco desta fase — está provado ao vivo; o que resta é
só o trecho **Resend→webhook**.
