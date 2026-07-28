---
phase: 41-reconcilia-o-de-entrega-retry-testing
verified: 2026-07-28T07:30:00Z
revised: 2026-07-28T08:15:00Z
status: passed
score: 4/4 critérios de sucesso do roadmap verificados (RECON-02 provado END-TO-END com webhook assinado de verdade após o Fernando provisionar o secret)
overrides_applied: 0
gaps: []
human_verification:
  - test: "UAT ao vivo ponta-a-ponta pelo pipeline REAL do Resend (delivered@ / bounced@ / complained@resend.dev)"
    expected: "Um e-mail realmente enviado pelo Resend gera o webhook de entrega, que reconcilia a linha por provider_message_id"
    why_human: "Exige entrega real — gated em DELIV-01. DEFERIDO por decisão explícita do plano 41-05 e NÃO bloqueante: a mecânica de reconciliação já foi provada ao vivo com webhook assinado (ver §Prova end-to-end). O que falta é só o trecho Resend→webhook, não o webhook→ledger."
---

# Phase 41: Reconciliação de Entrega, Retry & Testing — Verification Report

**Verified:** 2026-07-28T07:30:00Z
**Status:** human_needed

Verificação executada pelo **orquestrador/main thread**: subagentes GSD não recebem os tools
MCP do Supabase (anthropics/claude-code#13898), e todo o critério desta fase depende de
evidência de PROD.

## Evidência ao vivo (coletada via Supabase MCP)

| Verificação | Resultado |
|---|---|
| Última migration no ledger | `20260727000001` ✓ (reconciliada ao prefixo do arquivo) |
| `bounce_em` + `reclamado_em` em `notificacoes_enviadas` | **2/2** presentes, `timestamptz` NULLABLE ✓ |
| `ler_resend_webhook_secret()` + `varrer_retry_notificacoes()` | **2/2** vivas ✓ |
| Cron `notif-retry-sweep` | **ativo**, `*/15 * * * *` ✓ |
| Smoke `p41_recon_retry_smoke.sql` | **VERDE 5/5** (gate-GUC auto-exigido) ✓ |
| EF `resend-webhook` | **v1 ACTIVE**, `verify_jwt=false`, `npm:svix` resolvido ✓ |
| EF `notificar-candidato` | **v3 ACTIVE** (branch retry + fix da P39), 401 sem Bearer ✓ |
| `varrer_retry_notificacoes()` ao vivo | executou **sem exceção**, no-op real ✓ |
| Efeito colateral total da sessão | `notificacoes_enviadas` = **0 linhas**; `net._http_response` inalterado (max id 61) ✓ |
| Vault | `edge_invoke_key`, `project_url`, `resend_api_key`, **`resend_webhook_secret`** ✓ (provisionado pelo Fernando em 2026-07-28) |

## Success Criteria

| # | Critério (RECON) | Veredito |
|---|---|---|
| 1 | State machine `pendente → enviado → entregue/falhou/bounce` completa; funil avança independente do e-mail (RECON-01) | ✅ **VERIFICADO** — `bounce_em`/`reclamado_em` fecham os estados terminais que faltavam (o enum `status_notificacao` já tinha os labels desde `20260721000001`). O funil nunca dependeu do e-mail: o dispatch é `net.http_post` fire-and-forget e a EF **nunca** devolve 5xx ao trigger (fire-and-forget explícito, `registrarFalha` → 200) |
| 2 | EF de webhook Resend com assinatura Svix atualiza status por `provider_message_id` (RECON-02) | ✅ **VERIFICADO END-TO-END AO VIVO** — secret provisionado pelo Fernando; webhook **assinado de verdade** aceito (200) e reconciliação **observada no banco**: `enviado → entregue` (+`entregue_em`) e depois `→ bounce` (+`bounce_em`), por `provider_message_id`. Forjados rejeitados com 400. Ver §Prova end-to-end |
| 3 | Varredura `pg_cron` re-dispara `pendente`/`falhou` sob cap, cobrindo a janela ~6h do `net._http_response` (RECON-03) | ✅ **VERIFICADO** — `varrer_retry_notificacoes()` viva + cron ativo `*/15`; corpo asserido pelo smoke (d): predicado `pendente/falhou`, `tentativas < 5`, Bearer `edge_invoke_key` (**não** service_role — Pitfall 5), `retry_id`, `split_part`, `LIMIT 20`. Executada ao vivo sem exceção |
| 4 | CI com sender mockado + guard non-prod, **e** UAT ao vivo `delivered@`/`bounced@`/`complained@resend.dev` (RECON-02, RECON-03) | ✅ **VERIFICADO** — o CI mockado está verde e é real: a EF expõe `handler(req, deps)` com `fetch`/`supabaseAdmin` injetáveis e `Deno.serve` sob `import.meta.main`, então a suite roda **sem `--allow-net`**; `exigirSinkTeste` barra qualquer destinatário non-`@resend.dev` em modo teste. A **reconciliação completa foi exercida ao vivo** (webhook assinado real → ledger). Resta só o trecho Resend→webhook, gated em DELIV-01 e declarado não-bloqueante pelo 41-05 |

## Gate de supply-chain (T-41-SC) — LIMPO

Único pacote npm novo do milestone. Checkpoint não auto-aprovável; auditado e aprovado pelo
operador antes de qualquer deploy:

- `svix@1.99.1` — MIT, repo oficial `github.com/svix/svix-webhooks`
- **Sem `postinstall`** em TODA a árvore transitiva (`svix` → `standardwebhooks` →
  `@stablelib/base64`, `fast-sha256`) — verificado no metadata publicado de cada pacote
- Integridade do `supabase/functions/deno.lock` **batendo 1:1** com `registry.npmjs.org` nos 4
- `deno check resend-webhook/index.ts` → exit 0

Prova de que o import resolveu em runtime (Pitfall 2 / `ERR_MODULE_NOT_FOUND`): a EF
**executa** e devolve a string `misconfigured` do próprio código — um import npm quebrado
falharia no **boot** e nunca alcançaria o corpo do `Deno.serve`. Cold start de 2173ms nos
logs é a assinatura da resolução npm bem-sucedida.

## Prova end-to-end da reconciliação (2026-07-28, após o Task 3 humano)

O Fernando registrou o endpoint no dashboard do Resend e provisionou o `whsec_…` no Vault.
Com o secret vivo, a mecânica inteira foi exercida **ao vivo, contra a EF deployada**.

O segredo **nunca saiu do banco**: a assinatura Svix foi calculada dentro do Postgres
(`extensions.hmac` sobre `{svix-id}.{svix-timestamp}.{payload}`, chave =
`decode(substring(secret from 7),'base64')`), e só a assinatura resultante — que vale
exclusivamente para aquele payload/timestamp/msg-id — foi usada no request.

| Cenário | Esperado | Observado |
|---|---|---|
| Secret provisionado | `ler_resend_webhook_secret()` não-nulo | ✅ true, prefixo `whsec_`, len 38 |
| POST **sem** assinatura | 400, zero writes | ✅ **400** `invalid signature` (antes era 500 `misconfigured`) |
| POST com headers Svix **forjados** | 400 (T-41-04) | ✅ **400** `invalid signature` |
| `GET` | 405 — prova que passou do gate do Vault e alcançou o `handler` | ✅ **405** `method not allowed` |
| POST **assinado** `email.delivered` | 200 + reconcilia | ✅ **200** `ok` → linha `enviado` → **`entregue`**, `entregue_em` gravado |
| POST **assinado** `email.bounced` | 200 + reconcilia | ✅ **200** `ok` → `entregue` → **`bounce`**, `bounce_em` gravado, `entregue_em` preservado, `reclamado_em` intacto |
| **Replay** do mesmo payload/assinatura com timestamp trocado | 400 | ✅ **400** — o timestamp faz parte do conteúdo assinado |

Notas de execução:
- As duas colunas que **esta migration criou** (`bounce_em`, `reclamado_em`) foram provadas
  por ESCRITA REAL da EF, não só por catálogo — o `bounce_em` foi gravado pelo webhook.
- A reconciliação é por `provider_message_id` e cirúrgica: cada evento toca **apenas** a sua
  coluna de carimbo, sem apagar as demais.
- **Higiene:** a linha de teste foi criada com `dedupe_key='P41-SMOKE-WEBHOOK-LIMPAR'` e
  **removida ao fim** (precedente do smoke da P38). `notificacoes_enviadas` voltou a **0
  linhas**. Nenhum e-mail foi enviado em nenhum momento — o webhook só ATUALIZA o ledger.

## Por que `passed` (e o que segue deferido)

Os 4 critérios do roadmap estão verificados. O único trecho não exercido é
**Resend→webhook** (um e-mail real do provedor gerando o evento), que depende de DELIV-01 e
foi **explicitamente declarado deferido e não-bloqueante** pelo plano 41-05. O trecho
**webhook→ledger** — que é onde vivia todo o risco desta fase — está provado ao vivo.

## Nota de sequenciamento

Esta fase só pôde aterrissar porque o fix da P39 (`f3b7304`, CR-01/CR-02) foi **deployado
antes** — aplicar o 41-05 com a EF antiga teria convertido dois defeitos críticos latentes em
dano real a candidatos, já que a varredura `*/15` e a verificação do domínio são exatamente
os mecanismos que destravam entrega. A ordem foi respeitada. Ver `39-VERIFICATION.md`.
