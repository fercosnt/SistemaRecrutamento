---
status: pending
phase: 36-deliverability-sender-identity
source: [36-VALIDATION.md]
started: 2026-07-22T04:10:00Z
updated: 2026-07-22T04:10:00Z
---

## Current Test

[awaiting human execution — requires access to the Resend dashboard, to the DNS panel of `beautysmile.com.br`, and to personal Gmail + Outlook/Hotmail inboxes]

## Context

A Phase 36 fechou todos os trilhos de código da entregabilidade: o guard de bundle (`scripts/assert-no-secrets.mjs`, DELIV-02), o contrato canônico de remetente e modo (`supabase/functions/_shared/email-config.ts`, DELIV-01/DELIV-03) e a RPC leitora do Vault. O que resta do DELIV-01 é **irredutivelmente humano**: colocação em caixa de entrada não é observável por API — nenhum provedor expõe isso — e a publicação dos records DNS depende de um painel externo ao repo.

**A fase NÃO bloqueia na propagação DNS** (decisão travada do 36-CONTEXT.md). A cadeia P37 → P38 → P39 prossegue normalmente, codificando e testando contra os endereços `@resend.dev`. Este gate precisa aterrissar **antes do primeiro envio a candidato real** — cobrado no UAT da Phase 41.

**Procedimento a executar ANTES deste UAT:** `docs/runbooks/resend-dominio-envio.md` (Passos 1 a 7). O reporter opt-in `npm run check:resend-dominio` cobre a parte automatizável (status agregado, região, tracking, status por record); ele **não** vê o DMARC nem a caixa de entrada.

## Tests

### UAT-36-1 — Domínio de envio verificado e e-mail real cai na INBOX (DELIV-01)
- **Pré-requisito:** `docs/runbooks/resend-dominio-envio.md` executado até o Passo 7.
- **Steps:**
1. O domínio `recruta.beautysmile.com.br` mostra **Verified** no dashboard do Resend, na região `sa-east-1`.
2. Open tracking e click tracking estão **desligados** nesse domínio (Domain Settings).
3. `dig` confirma os 3-4 records emitidos pelo Resend **e** o TXT em `_dmarc.recruta.beautysmile.com.br` (o Resend não publica o DMARC — conferência separada).
4. Enviar 1 e-mail de teste **de** `nao-responda@recruta.beautysmile.com.br` **para** uma conta **Gmail** e uma conta **Outlook/Hotmail** pessoais.
5. Em ambas as contas: a mensagem chega na **Caixa de entrada** — não em Spam, não em Promoções com aviso de remetente suspeito.
6. No Gmail, abrir "Mostrar original" e confirmar os três cabeçalhos: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
7. O remetente exibido na lista de mensagens é **"Beauty Smile Recrutamento"**.
8. Responder o e-mail recebido → a resposta chega em `recrutamento@beautysmile.com.br` (Reply-To funcionando).
9. Registrar neste arquivo a data da execução + os prints (dashboard Verified, `dig`, cabeçalhos do Gmail, inbox das duas contas), no padrão dos UATs P22–P35.
- **status:** pending

## Gaps

Nenhum must-have automatizado desta fase está vermelho — os gates de código (bundle guard + suíte Deno de `email-config` + `npm run test:run` + `npm run build`) estão verdes. Os itens abertos são:

- **Este UAT** — gate humano/DNS do DELIV-01, sem previsão fixa; deve aterrissar antes do UAT da Phase 41.
- **Provisionamento do segredo no Vault** (`resend_api_key`) — depende de o Fernando gerar a chave PROD dedicada no dashboard do Resend. Sem placeholder, por decisão do CONTEXT. Tratado pelo Plano 36-05; o comando exato está no Passo 6 do runbook.
