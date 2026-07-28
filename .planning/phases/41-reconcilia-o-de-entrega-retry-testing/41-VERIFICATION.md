---
phase: 41-reconcilia-o-de-entrega-retry-testing
verified: 2026-07-28T07:30:00Z
revised: 2026-07-28T09:10:00Z
status: passed
score: 4/4 critérios verificados — INCLUSIVE o UAT ao vivo, que deixou de ser deferido: o ciclo completo rodou pelo pipeline REAL do Resend (envio real → webhook real → reconciliação)
overrides_applied: 0
gaps: []
human_verification: []
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

## UAT ao vivo — EXECUTADO (deixou de ser deferido)

Após o Fernando confirmar `rh.beautysmile.com.br` **Verified** no Resend e definir
`NOTIFICACOES_MODO=teste`, o ciclo **inteiro** foi exercido pelo pipeline **REAL** do
provedor — nada sintético.

Disparo feito como o trigger da P39 faz: `net.http_post` com o Bearer lido do Vault **dentro
do SQL** (o `edge_invoke_key` nunca passou pelo agente), corpo ids-only, contra a candidatura
de funil E2E `candidato.funil@teste.com`.

| Etapa da cadeia | Evidência |
|---|---|
| Trigger-equivalente → EF | dispatch aceito |
| EF resolve + reivindica | linha criada, `tentativas=0`, `ultimo_erro=null` |
| **Modo (DELIV-03)** | `modo='teste'` · `destinatario_email='delivered+candidatura_recebida@resend.dev'` · `destinatario_original='candidato.funil@teste.com'` — **candidato real NÃO contatado**, trilha de auditoria preservada |
| **EF → Resend (envio real)** | `status='enviado'`, `enviado_em=01:08:23`, `provider_message_id='e99ec62a-303e-4a55-b6e4-a883187163d8'` — **o `403 domain not verified` ACABOU** |
| **Resend → webhook (real)** | Resend chamou a EF com assinatura Svix legítima |
| **webhook → ledger** | `status='entregue'`, `entregue_em=01:08:28` — **5 s** após o envio, reconciliado por `provider_message_id` |

Isto fecha, de uma vez, o que estava em aberto:

- **DELIV-01 provado FUNCIONALMENTE**, não só por flag de dashboard — um envio real
  atravessou e foi aceito. Era a maior incógnita restante do milestone.
- **`NOTIFICACOES_MODO=teste` confirmado por EXECUÇÃO** (o `modo` gravado no ledger), não por
  leitura de configuração — e o desvio ao sink funcionou como especificado.
- **RECON-02 pelo caminho REAL** — a prova anterior usava assinatura sintética; esta veio do
  próprio Resend.

**Higiene:** a linha foi **removida** ao fim (o `dedupe_key` bloquearia uma confirmação
futura legítima dessa candidatura E2E). `notificacoes_enviadas` de volta a **0 linhas**.

## Por que `passed`

Os 4 critérios do roadmap estão verificados, incluindo o UAT ao vivo — que o plano 41-05
havia deferido atrás de DELIV-01 e que, com o domínio verificado, pôde ser executado de fato.
Não resta nenhum trecho da cadeia por exercitar.

## Nota de sequenciamento

Esta fase só pôde aterrissar porque o fix da P39 (`f3b7304`, CR-01/CR-02) foi **deployado
antes** — aplicar o 41-05 com a EF antiga teria convertido dois defeitos críticos latentes em
dano real a candidatos, já que a varredura `*/15` e a verificação do domínio são exatamente
os mecanismos que destravam entrega. A ordem foi respeitada. Ver `39-VERIFICATION.md`.
