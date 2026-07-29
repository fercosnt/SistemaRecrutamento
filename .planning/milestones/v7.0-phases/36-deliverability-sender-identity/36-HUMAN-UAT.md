---
status: passed
phase: 36-deliverability-sender-identity
source: [36-VALIDATION.md]
started: 2026-07-22T04:10:00Z
updated: 2026-07-29T00:30:00Z
---

## Current Test

[✅ FECHADO em 2026-07-29. Os 3 itens passaram. UAT-36-1: e-mail chega na Caixa de entrada no Gmail E no Outlook, com SPF/DKIM/DMARC os três PASS, remetente e Reply-To corretos. UAT-36-2: chave no Vault (fechado em 26/07). UAT-36-3: NOTIFICACOES_MODO=producao — o sistema está no ar, provado com destinatário real. Residual único: confirmar click tracking desligado no dashboard do Resend.]

## Context

A Phase 36 fechou todos os trilhos de código da entregabilidade: o guard de bundle (`scripts/assert-no-secrets.mjs`, DELIV-02), o contrato canônico de remetente e modo (`supabase/functions/_shared/email-config.ts`, DELIV-01/DELIV-03) e a RPC leitora do Vault. O que resta do DELIV-01 é **irredutivelmente humano**: colocação em caixa de entrada não é observável por API — nenhum provedor expõe isso — e a publicação dos records DNS depende de um painel externo ao repo.

**A fase NÃO bloqueia na propagação DNS** (decisão travada do 36-CONTEXT.md). A cadeia P37 → P38 → P39 prossegue normalmente, codificando e testando contra os endereços `@resend.dev`. Este gate precisa aterrissar **antes do primeiro envio a candidato real** — cobrado no UAT da Phase 41.

**Procedimento a executar ANTES deste UAT:** `docs/runbooks/resend-dominio-envio.md` (Passos 1 a 7). O reporter opt-in `npm run check:resend-dominio` cobre a parte automatizável (status agregado, região, tracking, status por record); ele **não** vê o DMARC nem a caixa de entrada.

## Tests

### UAT-36-1 — Domínio de envio verificado e e-mail real cai na INBOX (DELIV-01)
- **Pré-requisito:** `docs/runbooks/resend-dominio-envio.md` executado até o Passo 7.
- **Steps:**
1. O domínio `rh.beautysmile.com.br` mostra **Verified** no dashboard do Resend, na região `sa-east-1`.
2. Open tracking e click tracking estão **desligados** nesse domínio (Domain Settings).
3. `dig` confirma os 3-4 records emitidos pelo Resend **e** o TXT em `_dmarc.rh.beautysmile.com.br` (o Resend não publica o DMARC — conferência separada).
4. Enviar 1 e-mail de teste **de** `nao-responda@rh.beautysmile.com.br` **para** uma conta **Gmail** e uma conta **Outlook/Hotmail** pessoais.
5. Em ambas as contas: a mensagem chega na **Caixa de entrada** — não em Spam, não em Promoções com aviso de remetente suspeito.
6. No Gmail, abrir "Mostrar original" e confirmar os três cabeçalhos: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
7. O remetente exibido na lista de mensagens é **"Beauty Smile Recrutamento"**.
8. Responder o e-mail recebido → a resposta chega em `rh@beautysmile.com.br` (Reply-To funcionando).
9. Registrar neste arquivo a data da execução + os prints (dashboard Verified, `dig`, cabeçalhos do Gmail, inbox das duas contas), no padrão dos UATs P22–P35.

- **🟡 PARCIAL (2026-07-28) — a infraestrutura fechou; falta só o teste de CAIXA DE ENTRADA.**

  **Passos 1 e 3 — ✅ FECHADOS.** O Fernando confirmou `rh.beautysmile.com.br` = **Verified**
  no dashboard do Resend. `dig` ao vivo (2026-07-28) confirma os records emitidos:
  - `send.rh…` TXT → `v=spf1 include:amazonses.com ~all` (SPF)
  - `send.rh…` MX → `10 feedback-smtp.sa-east-1.amazonses.com` (região `sa-east-1` ✓)
  - `resend._domainkey.rh…` TXT → chave pública DKIM

  **Correção sobre o DMARC (o passo 3 exigia um TXT em `_dmarc.rh.…`):** esse registro está
  de fato ausente, **mas isso NÃO é lacuna.** O domínio organizacional publica
  `_dmarc.beautysmile.com.br` = `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@…`, e pela
  **RFC 7489 §6.6.3** um subdomínio sem registro próprio **herda a política do domínio
  organizacional**. O registro raiz não traz tag `sp=`, então `rh.` herda `p=quarantine`.
  Publicar um `_dmarc.rh` só seria necessário para dar ao subdomínio política DIFERENTE da
  raiz. **Não há ação de DNS pendente.**

  **Prova FUNCIONAL de entregabilidade (vai além do que este UAT pedia):** um envio real
  atravessou o Resend e foi aceito — `status='enviado'` com `provider_message_id` real —, e o
  **webhook de entrega do próprio Resend** reconciliou a linha para `entregue` em **5 s**. O
  `403 domain not verified` que bloqueava tudo **acabou**. Registrado em
  `.planning/phases/41-*/41-VERIFICATION.md`.

  **❌ O QUE CONTINUA ABERTO — passos 2 e 4 a 8, irredutivelmente humanos:**
  - Passo 2: confirmar open/click tracking **desligados** em Domain Settings
  - Passos 4–5: enviar de `nao-responda@rh.…` para Gmail **e** Outlook/Hotmail pessoais e
    confirmar chegada na **Caixa de entrada** (não Spam, não Promoções)
  - Passo 6: "Mostrar original" no Gmail → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`
  - Passo 7: remetente exibido = "Beauty Smile Recrutamento"
  - Passo 8: responder → chega em `rh@beautysmile.com.br` (Reply-To)

  Colocação em caixa de entrada **não é observável por API** — nenhum provedor expõe isso.
  Só um humano com as duas contas fecha.

- **✅ EXECUTADO E APROVADO (2026-07-29).** O Fernando rodou o teste mandando o e-mail
  **direto pela API do Resend**, por fora do sistema — isolando "o domínio entrega?" de
  "o sistema está ligado?", de modo que uma eventual falha de spam apareceria antes de
  qualquer candidato estar exposto.

  | Passo | Resultado |
  |---|---|
  | 4–5 · Gmail | ✅ **Caixa de entrada** (não spam, não promoções) |
  | 4–5 · Outlook/Hotmail | ✅ **Caixa de entrada** (latência maior — ver nota) |
  | 6 · Cabeçalhos no Gmail | ✅ **`SPF: PASS` · `DKIM: PASS` · `DMARC: PASS`** — os três |
  | 7 · Remetente exibido | ✅ "Beauty Smile Recrutamento" |
  | 8 · Reply-To | ✅ responder preenche `rh@beautysmile.com.br` |
  | 2 · Open tracking | ✅ desligado |
  | 2 · Click tracking | ⚠️ **não confirmado** (checkbox do operador ficou em branco) |

  O `DMARC: PASS` confirma na prática a análise de herança registrada acima: `rh.` não tem
  registro `_dmarc` próprio e mesmo assim autentica, porque herda a política do domínio
  organizacional (RFC 7489 §6.6.3). Não havia DNS pendente, e o teste ao vivo prova isso.

  **Nota — latência no Outlook.** Esperada, não é defeito: subdomínio recém-verificado ainda
  não acumulou reputação nos filtros da Microsoft. Tende a normalizar com volume orgânico.
  Reparar se persistir após algumas semanas de tráfego real.

  **Residual:** confirmar o **click tracking** desligado em Resend → Domains →
  `rh.beautysmile.com.br` → Settings. Se estiver ativo, reescreve todo link do e-mail para
  um redirecionador e coleta comportamento de clique do candidato sem finalidade declarada.

- **status:** passed

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
- **✅ EXECUTADO (2026-07-26):** chave PROD dedicada (`notificacoes-ats-prod`, separada da do `cost-alerter` — blast radius mantido) provisionada no Vault de PROD (projeto `isljnozzlvckrgjjbjwp`) via `vault.create_secret`. Smoke read-only via Supabase MCP: `count = 1` (sem duplicata), `length(decrypted_secret) = 36`, `ler_resend_api_key() is not null = true`. **Valor nunca registrado.** Nota operacional: a 1ª tentativa gravou no projeto errado e foi migrada para o certo — a cópia no projeto errado deve ser revogada com `vault.delete_secret`. Na mesma sessão, o remetente foi migrado de `recruta.` → `rh.beautysmile.com.br` (From `nao-responda@rh.…`, Reply-To `rh@beautysmile.com.br`) por decisão do operador; `email-config.ts` + `check-resend-dominio.mjs` + runbook + UAT-36-1 atualizados, suíte Deno 9/9 verde.
- **status:** passed

### UAT-36-3 — Armar `NOTIFICACOES_MODO=producao` na EF antes do 1º envio real (DELIV-03)

- **Origem:** code review da Phase 36, achado WR-02. `NOTIFICACOES_MODO` decide se o candidato recebe e-mail, e até então não existia em **nenhum artefato durável de operador** — nem no runbook, nem neste arquivo. A única menção fora do código estava num SUMMARY de `.planning/phases/`, exatamente o tipo de artefato que o `36-CONTEXT.md` (§ Docs em `docs/runbooks/`) justifica **não** usar como lar de procedimento operacional.
- **Por que é gate humano:** setar um secret de Edge Function exige o `project-ref` e credencial de projeto; não há caminho a partir do repo. Igual ao UAT-36-2.

- **O modo de falha que este item previne (é silencioso — este é o ponto):**
  1. Operador executa o runbook inteiro, Passos 1 a 7 → domínio `verified`, DMARC publicado, `resend_api_key` no Vault, `ler_resend_api_key()` retorna a chave.
  2. A P38 deploya `notificar-candidato`. `NOTIFICACOES_MODO` nunca foi provisionado.
  3. `resolverModo()` → `'teste'` (correto, é o fail-safe do DELIV-03). **Sem `console.warn`** — o warn de `email-config.ts` só dispara quando o valor foi *fornecido* e é malformado; **ausente é silencioso**.
  4. Todo e-mail de candidato vai para `delivered+<evento>@resend.dev`, o Resend responde **HTTP 200**, o ledger da P37 grava sucesso, e **nenhum candidato recebe nada**. O único sinal é a coluna `redirecionado`, que ninguém está olhando.

  Domínio verificado (UAT-36-1) e chave no Vault (UAT-36-2) **não bastam**: os três itens são independentes e todos os três precisam fechar.

- **Steps (executar na Phase 38, depois do smoke técnico e ANTES do primeiro envio a candidato real):**

1. Confirmar o estado atual (esperado: a variável **não** aparece na lista):
   ```bash
   npx supabase secrets list --project-ref <project-ref>
   ```
2. Armar o modo produção no ambiente da Edge Function `notificar-candidato`:
   ```bash
   npx supabase secrets set NOTIFICACOES_MODO=producao --project-ref <project-ref>
   ```
   **Valor exato `producao`** — sem acento, minúsculo, sem aspas. Qualquer outra coisa (`prod`, `PRODUCTION`, `produção`, vazio) cai em `teste` por design, e `prod`/`PRODUCTION` ainda emitem `console.warn`; a **ausência** não emite nada.
3. Confirmar que o secret aparece em `npx supabase secrets list --project-ref <project-ref>`. A lista mostra **nome e hash, nunca o valor** — o que é irrelevante aqui, porque `NOTIFICACOES_MODO` **não é segredo**, é chave de operação (por isso vai em env secret da EF e **não** no Vault).
4. Redeployar / reiniciar a EF para que ela leia o novo ambiente.
5. **Prova de comportamento** (é ela que fecha o item, não o `secrets list`): disparar um envio real de teste e confirmar que
   - a mensagem chega no **endereço real** informado, e
   - o registro correspondente no ledger da P37 tem **`redirecionado = false`** e `destinatario_original` igual ao endereço real.
6. Registrar neste arquivo a data da execução e o resultado do passo 5 — **nunca** o valor de nenhuma chave — e marcar este item como `passed`.

- **📌 ATUALIZAÇÃO 2026-07-28 — a variável agora EXISTE, setada como `teste`.** O Fernando
  provisionou `NOTIFICACOES_MODO` nos secrets da Edge Function com valor **`teste`**
  (explicitamente, não por ausência). Isso **fecha o modo de falha silencioso** que este item
  previne: antes, "ausente" era indistinguível de "deliberadamente em teste" e não emitia
  warn algum. Agora o estado é intencional e legível.

  **Confirmado por EXECUÇÃO, não por leitura de config:** um disparo real gravou no ledger
  `modo='teste'`, `destinatario_email='delivered+decisao_final@resend.dev'` e
  `destinatario_original='candidato.funil@teste.com'` — o desvio ao sink funcionou e a trilha
  de auditoria preservou o destinatário real.

  **✅ EXECUTADO (2026-07-29) — `NOTIFICACOES_MODO=producao`. O sistema está no ar.**

  O flip foi feito após o UAT-36-1 passar. A prova de comportamento que este item exige
  (passo 5: "a mensagem chega no endereço REAL e o ledger registra o destinatário real") foi
  obtida com uma candidatura de teste cujo candidato é o **próprio operador**, de modo que o
  caminho real de produção foi exercido sem expor candidato algum:

  ```
  modo=producao
  destinatario_email    = fernando@beautysmile.com.br
  destinatario_original = fernando@beautysmile.com.br   <- IGUAIS: sem desvio ao sink
  status=entregue · ultimo_erro=null
  ```

  E-mail recebido: *"Sua candidatura avançou — [TESTE] Auxiliar de Saúde Bucal (ASB)"*.
  Limpeza pós-teste verificada ao vivo: ledger de volta a **0 linhas**, candidatura
  restaurada em `triagem`, histórico do dia removido.

  **Auditoria de segurança:** `net._http_response` nas 36 h seguintes ao flip registra **um
  único disparo** — exatamente este teste. Nenhum candidato real recebeu e-mail por acidente.

  Registro completo em `.planning/todos/done/m7-ativar-modo-producao.md`.

- **Como desarmar (voltar ao sandbox):** remover o secret ou trocá-lo por qualquer valor diferente de `producao`. Não existe configuração ambígua que envie para pessoa real — o default é sempre `teste`.
- **Prova automatizada que sustenta este item:** `supabase/functions/_shared/__tests__/email-config.test.ts`, casos (8) e (9) — adicionados pelo achado WR-01 do mesmo review. O caso (9) prova que `resolverDestinatario(email, evento)` **sem 3º argumento** (a forma como a P38 chama) redireciona quando a env está ausente; o caso (8) prova que `NOTIFICACOES_MODO='producao'` é lida de verdade. Ambos foram validados por mutação.
- **Quem cobra esta pendência:** a **Phase 38** (smoke da EF `notificar-candidato`), junto com o UAT-36-2.
- **Referência completa:** `docs/runbooks/resend-dominio-envio.md` § 9 ("Passo 8 — Armar o modo produção").
- **status:** passed

## Gaps

Nenhum must-have automatizado desta fase está vermelho — os gates de código (bundle guard + suíte Deno de `email-config` + `npm run test:run` + `npm run build`) estão verdes. Os itens abertos são:

- **UAT-36-1** — ✅ **PASSED (2026-07-29).** Caixa de entrada confirmada no **Gmail e no
  Outlook**, com **`SPF`/`DKIM`/`DMARC` os três `PASS`**, remetente exibido correto e
  Reply-To funcional. O `DMARC: PASS` confirma na prática a herança do domínio organizacional
  (RFC 7489 §6.6.3) — não havia DNS pendente, como analisado. Latência maior no Outlook é
  reputação de subdomínio novo, não defeito.
- **UAT-36-2** — ✅ **PASSED (2026-07-26).** Segredo `resend_api_key` provisionado no Vault de PROD (`isljnozzlvckrgjjbjwp`): `count = 1`, `length = 36`, `ler_resend_api_key() is not null = true` (smoke read-only via MCP; valor nunca registrado). Registro completo no item UAT-36-2 acima. Pendência residual: revogar a cópia criada por engano no projeto errado (`vault.delete_secret`).
- **UAT-36-3** — ✅ **PASSED (2026-07-29).** `NOTIFICACOES_MODO=producao` armado; prova de
  comportamento obtida com destinatário REAL (`destinatario_email == destinatario_original`,
  sem desvio ao sink) usando uma candidatura cujo candidato é o próprio operador. Auditoria
  pós-flip: **um único disparo** em 36 h — o próprio teste. Registro histórico do item: Registrado a partir do achado **WR-02** do code review da Phase 36: o fail-safe do DELIV-03 está correto, mas o passo que o **desarma deliberadamente** não existia em nenhum artefato durável de operador (`grep -rn "NOTIFICACOES_MODO" docs/` retornava zero). Sem este item, é possível seguir o runbook ponta a ponta, subir PROD, e ter 100% dos e-mails de candidato desviados para `@resend.dev` com HTTP 200 e sem warn. Executado na **Phase 38**, antes do primeiro envio real; procedimento em `docs/runbooks/resend-dominio-envio.md` § 9.

Nenhum dos três bloqueia o fechamento da Phase 36 nem a cadeia P37 → P38 → P39. Os três são independentes entre si: domínio verificado (UAT-36-1) + chave no Vault (UAT-36-2) + modo armado (UAT-36-3) — os três precisam fechar antes do primeiro e-mail a candidato real (UAT da Phase 41).
