---
phase: 41-reconcilia-o-de-entrega-retry-testing
verified: 2026-07-28T07:30:00Z
status: human_needed
score: 3/4 critérios de sucesso do roadmap verificados autonomamente; o 4º (UAT ao vivo) é humano e gated em DELIV-01
overrides_applied: 0
gaps: []
human_verification:
  - test: "41-05 Task 3 — registrar o endpoint em https://resend.com/webhooks apontando p/ https://isljnozzlvckrgjjbjwp.supabase.co/functions/v1/resend-webhook (eventos email.delivered / email.bounced / email.complained), copiar o whsec_ e provisionar no Vault como `resend_webhook_secret`"
    expected: "`select public.ler_resend_webhook_secret() is not null;` devolve true (sem imprimir o valor)"
    why_human: "O signing secret só passa a existir depois do registro no dashboard do Resend, que não expõe API. Não há caminho autônomo."
  - test: "Após provisionar o secret: POST à resend-webhook SEM assinatura Svix válida"
    expected: "400 `invalid signature` (hoje é 500 `misconfigured`, correto enquanto o secret não existe) e ZERO escrita em notificacoes_enviadas"
    why_human: "Depende do item anterior — o wiring lê o Vault antes de delegar ao handler, então a verificação Svix é inalcançável sem o secret."
  - test: "UAT ao vivo da reconciliação completa via delivered@ / bounced@ / complained@resend.dev"
    expected: "Cada evento reconcilia a linha correspondente por provider_message_id: status entregue/bounce/reclamado + o carimbo (entregue_em/bounce_em/reclamado_em)"
    why_human: "Exige entrega real — gated em DELIV-01 (domínio verificado no Resend). DEFERIDO por decisão do plano 41-05; NÃO bloqueia o fecho da fase."
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
| Vault | `edge_invoke_key`, `project_url`, `resend_api_key` — **sem** `resend_webhook_secret` ⏸ |

## Success Criteria

| # | Critério (RECON) | Veredito |
|---|---|---|
| 1 | State machine `pendente → enviado → entregue/falhou/bounce` completa; funil avança independente do e-mail (RECON-01) | ✅ **VERIFICADO** — `bounce_em`/`reclamado_em` fecham os estados terminais que faltavam (o enum `status_notificacao` já tinha os labels desde `20260721000001`). O funil nunca dependeu do e-mail: o dispatch é `net.http_post` fire-and-forget e a EF **nunca** devolve 5xx ao trigger (fire-and-forget explícito, `registrarFalha` → 200) |
| 2 | EF de webhook Resend com assinatura Svix atualiza status por `provider_message_id` (RECON-02) | ⏸ **CÓDIGO VERIFICADO, COMPORTAMENTO GATED** — EF deployada v1 ACTIVE (`verify_jwt=false`), `npm:svix` resolvido, `idx_notif_provider_msg` vivo, allowlist dos 3 eventos testada em CI. **Falta o `resend_webhook_secret` no Vault** (ação humana) — sem ele a EF falha **fechada** (500, zero writes), então a reconciliação real ainda não pôde ser exercida |
| 3 | Varredura `pg_cron` re-dispara `pendente`/`falhou` sob cap, cobrindo a janela ~6h do `net._http_response` (RECON-03) | ✅ **VERIFICADO** — `varrer_retry_notificacoes()` viva + cron ativo `*/15`; corpo asserido pelo smoke (d): predicado `pendente/falhou`, `tentativas < 5`, Bearer `edge_invoke_key` (**não** service_role — Pitfall 5), `retry_id`, `split_part`, `LIMIT 20`. Executada ao vivo sem exceção |
| 4 | CI com sender mockado + guard non-prod, **e** UAT ao vivo `delivered@`/`bounced@`/`complained@resend.dev` (RECON-02, RECON-03) | ⏸ **METADE VERIFICADA** — o CI mockado está verde e é real: a EF expõe `handler(req, deps)` com `fetch`/`supabaseAdmin` injetáveis e `Deno.serve` sob `import.meta.main`, então a suite roda **sem `--allow-net`**; `exigirSinkTeste` barra qualquer destinatário non-`@resend.dev` em modo teste. **O UAT ao vivo está DEFERIDO atrás de DELIV-01 por decisão explícita do plano 41-05 — não bloqueia o fecho** |

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

## Por que `human_needed` e não `passed`

Tudo que era automatizável está vivo e provado. O que resta **não tem caminho autônomo**: o
signing secret `whsec_…` só passa a existir depois de registrar o endpoint no dashboard do
Resend, que não expõe API. Sem esse secret, o critério 2 não pode ser exercido de ponta a
ponta e o teste de postura "400 sem assinatura" é inalcançável por construção.

O critério 4 (UAT ao vivo) já era **deliberadamente deferido** pelo plano 41-05 atrás de
DELIV-01 e declarado **não bloqueante** — a prova autônoma da fase é o CI mockado
(41-01/02/04) somado ao smoke SQL 5/5 (41-03), e ambos estão verdes.

## Nota de sequenciamento

Esta fase só pôde aterrissar porque o fix da P39 (`f3b7304`, CR-01/CR-02) foi **deployado
antes** — aplicar o 41-05 com a EF antiga teria convertido dois defeitos críticos latentes em
dano real a candidatos, já que a varredura `*/15` e a verificação do domínio são exatamente
os mecanismos que destravam entrega. A ordem foi respeitada. Ver `39-VERIFICATION.md`.
