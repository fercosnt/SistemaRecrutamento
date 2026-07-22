---
status: pending
phase: 36-deliverability-sender-identity
source: [36-VALIDATION.md]
started: 2026-07-22T04:10:00Z
updated: 2026-07-22T15:20:00Z
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

### UAT-36-2 — Provisionar `resend_api_key` no Supabase Vault (DELIV-02)

- **Origem:** Plano 36-05, Task 1 (gate humano). Resposta do operador em 2026-07-22: **`pendente`** — a chave PROD dedicada às notificações ainda não foi gerada no dashboard do Resend.
- **Estado verificado em PROD (2026-07-22, via Supabase MCP):**
  - `select public.ler_resend_api_key() is null as sem_segredo;` → **`true`** (o segredo não existe; graceful skip ativo, como especificado)
  - `public.ler_resend_api_key()` viva: `pronargs = 0`, `prosecdef = true`, `proconfig = ["search_path=\"\""]`
  - Privilégios: `anon` = `false`, `authenticated` = `false`, `public` = `false`, `service_role` = **`true`**
  - Ledger reconciliado: `version = '20260722000001'`, `name = '20260722000001_p36_vault_resend_reader'`
- **Por que ficou pendente:** gerar a chave no dashboard do Resend não tem CLI nem API disponível a partir do repo. A migration leitora (Plano 36-04) já está aplicada; falta apenas o segredo. **Isto NÃO bloqueia a fase** — decisão travada do `36-CONTEXT.md`: a cadeia P37 → P38 → P39 prossegue codificando e testando contra `@resend.dev`.

- **Steps (executar quando a chave existir):**

1. Resend Dashboard → **API Keys** → **Create API Key**. Criar uma chave **NOVA e dedicada** às notificações do ATS (nome sugerido: `notificacoes-ats-prod` / `ats-notificacoes-prod`), com permissão de envio.
   **NÃO reutilizar** a chave que o `cost-alerter` já consome como env secret da EF (`supabase/functions/cost-alerter/index.ts:208`) — o ponto da decisão do usuário é **blast radius separado**: revogar uma não pode derrubar a outra. O `cost-alerter` permanece intocado (débito em `.planning/todos/pending/36-resend-chave-divergencia.md`).
2. Copiar o valor da chave (o Resend só a exibe uma vez). **Não colar em chat, em arquivo do repo, em `.env` versionado, em issue ou em PR.**
3. **Higiene primeiro** — conferir que não existe linha prévia (nunca selecionar o valor):
   ```sql
   select id, name, description, created_at from vault.secrets where name = 'resend_api_key';
   ```
   Se **já existir** uma linha, **NÃO criar outra** (duplicata torna a leitura ambígua): usar `vault.update_secret(<uuid>, <novo valor>, 'resend_api_key', '<descrição>')` com o `id` retornado.
4. Se não existir, criar — **três argumentos POSICIONAIS, nesta ordem: valor, nome, descrição**:
   ```sql
   select vault.create_secret(
     '<COLE-AQUI-A-CHAVE-PROD-REAL>',   -- valor real; NUNCA um placeholder
     'resend_api_key',                   -- nome canônico (snake_case, convenção do repo)
     'Resend PROD send key — M7/P36 DELIV-02. Consumida por notificar-candidato (P38).'
   );
   ```
   Executar no **SQL Editor do Supabase** (preferível por higiene) ou via Supabase MCP `execute_sql`.
5. **Smoke de armazenamento** — prova que o segredo está lá e tem tamanho plausível, sem imprimi-lo:
   ```sql
   select name, length(decrypted_secret) as len from vault.decrypted_secrets where name = 'resend_api_key';
   ```
   Esperado: **1 linha**, `len > 20`. **NUNCA** selecionar `decrypted_secret` cru.
6. **Smoke do caminho de leitura ponta-a-ponta** — prova que o par segredo + RPC do Plano 36-04 funciona junto:
   ```sql
   select public.ler_resend_api_key() is not null as provisionado;
   ```
   Esperado: **`true`**.
7. Registrar neste arquivo a data da execução, o nome do segredo e o `len` observado — **nunca o valor** — e marcar este item como `passed`.

- **⚠️ REGRA TRAVADA — NÃO CRIAR PLACEHOLDER, EM HIPÓTESE ALGUMA.** Nem `CHANGEME`, nem string vazia, nem a chave de test-mode no lugar da PROD. Uma chave falsa no Vault produz um **401 opaco** no primeiro envio real a candidato ("a chave existe, mas não funciona"); a **ausência** produz `NULL`, que `ler_resend_api_key()` já entrega como *graceful skip* legível ("não configurado"). Ausência é diagnosticável; chave falsa não é. Enquanto a chave real não existir, o segredo simplesmente **não existe**.
- **Quem cobra esta pendência:** a **Phase 38** (smoke da EF `notificar-candidato`). Sem o segredo, a EF cai no graceful skip e o smoke de envio real não fecha. O UAT-36-1 (domínio/DNS) é independente e continua `pending` — este item não o resolve, e vice-versa.
- **Referência completa:** `docs/runbooks/resend-dominio-envio.md` § Passo 6 ("As três chaves do Resend e onde cada uma vive").
- **status:** pending

## Gaps

Nenhum must-have automatizado desta fase está vermelho — os gates de código (bundle guard + suíte Deno de `email-config` + `npm run test:run` + `npm run build`) estão verdes. Os itens abertos são:

- **UAT-36-1** — gate humano/DNS do DELIV-01, sem previsão fixa; deve aterrissar antes do UAT da Phase 41.
- **UAT-36-2** — provisionamento do segredo `resend_api_key` no Supabase Vault. Fechado pelo Plano 36-05 como **pendente-humana**: em 2026-07-22 o operador respondeu `pendente` (chave PROD dedicada ainda não gerada no dashboard do Resend). Confirmado por SQL em PROD que `ler_resend_api_key()` retorna `NULL` — o graceful skip esperado — e que **nenhum placeholder foi criado**, por decisão travada do CONTEXT. O comando exato para fechar está no item UAT-36-2 acima e no Passo 6 do runbook. Cobrado pela **Phase 38**.

Nenhum dos dois bloqueia o fechamento da Phase 36 nem a cadeia P37 → P38 → P39.
