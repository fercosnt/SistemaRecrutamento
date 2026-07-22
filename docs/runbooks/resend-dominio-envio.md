# Runbook — Verificação do domínio de envio no Resend (DELIV-01)

**Objetivo:** deixar `recruta.beautysmile.com.br` verificado no Resend (SPF + DKIM automáticos), com o DMARC publicado manualmente, para que os e-mails transacionais do ATS cheguem na **Caixa de entrada** do candidato — não no spam.

**Quem executa:** Fernando (acesso ao dashboard do Resend + ao painel de DNS de `beautysmile.com.br`).
**Quando:** antes do primeiro envio a candidato real (UAT da Phase 41). A Phase 36 **não bloqueia** na propagação de DNS.
**Tempo:** ~20 min de operação + até 72 h de propagação (normalmente minutos).
**Aceite formal:** `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md` (checklist de 9 itens).

---

## 1. Contexto e valores canônicos

Estes valores são **decisões travadas** (36-CONTEXT.md). Copie-os literalmente; não improvise variações.

| Item | Valor |
|------|-------|
| Domínio de envio | `recruta.beautysmile.com.br` |
| Região do Resend | `sa-east-1` (São Paulo) |
| From | `Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>` |
| Reply-To | `recrutamento@beautysmile.com.br` |
| DMARC — nome | `_dmarc.recruta.beautysmile.com.br` |
| DMARC — valor | `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br` |
| Segredo no Supabase Vault | `resend_api_key` |
| Endereços de teste | `delivered@resend.dev` · `bounced@resend.dev` · `complained@resend.dev` (aceitam `+label`) |
| Open tracking / Click tracking | **DESLIGADOS** neste domínio |

> ⚠️ **A região é irreversível na prática.** `sa-east-1` é escolhida na **criação** do domínio e determina o hostname do MX (`feedback-smtp.sa-east-1.amazonses.com`). **Trocar a região depois exige apagar o domínio e RE-VERIFICAR tudo de novo** — records novos, nova propagação, nova janela de risco. Escolha `sa-east-1` na primeira tela e não mexa mais.

> ℹ️ Por que um subdomínio e não `beautysmile.com.br` direto: isola a reputação de envio do domínio corporativo. Se um envio do ATS gerar reclamação, o e-mail humano da empresa não é afetado. O subdomínio já é usado pelo produto (link público de vaga), e os records do Resend ficam em `send.recruta.…` e `<token>._domainkey.recruta.…` — **não colidem** com o A record do site.

---

## 2. Passo 1 — Add Domain no Resend

1. Dashboard do Resend → **Domains** → **Add Domain**.
2. Nome: `recruta.beautysmile.com.br`.
3. Região: **`sa-east-1` (São Paulo)**. Ver o aviso acima antes de confirmar.
4. Return-path: deixar no **default (`send`)**. É literalmente daí que sai o subdomínio `send.recruta.beautysmile.com.br` do MX/SPF. Não use valores criativos tipo `testing` — reduzem credibilidade do envelope.
5. Confirmar. O Resend exibe uma lista de records prontos para copiar.
6. Abra **Domain Settings** desse domínio e **DESLIGUE open tracking e click tracking**.
   Motivo: com tracking ligado o Resend exige um CNAME extra em `links.<domínio>` e reescreve todos os links do e-mail para esse host — o clássico *link/domain mismatch* que dispara filtro de spam. O v1 do M7 é transacional sem opt-out e não mede clique, então tracking só traz risco.

> 🔑 **Sobre o record DKIM: este runbook NÃO transcreve o valor de propósito.**
> Existem **dois shapes em circulação** na documentação do Resend — um CNAME com nome token-prefixado da SES e um TXT com a chave pública — e qual deles você recebe depende da conta/região/época. Transcrever um shape fixo aqui produziria uma verificação que falha em silêncio.
> **Copie exatamente os N records que o dashboard exibir**, campo a campo. O mesmo vale para a saída de `GET /domains/:id` (usada por `npm run check:resend-dominio`).

Os records que o Resend costuma emitir (para calibrar expectativa, **não** para copiar daqui):

| Papel | FQDN final (o que o `dig` do Passo 4 deve resolver) | Tipo | Origem do valor |
|-------|-----------------------------------------------------|------|-----------------|
| SPF (return-path) | `send.recruta.beautysmile.com.br` | `MX` | dashboard — aponta para `feedback-smtp.sa-east-1.amazonses.com`, prioridade `10` |
| SPF | `send.recruta.beautysmile.com.br` | `TXT` | dashboard — `v=spf1 include:amazonses.com ~all` |
| DKIM | *(o nome que o dashboard exibir — ver regra abaixo)* | `CNAME` **ou** `TXT` | **somente** o que o dashboard mostrar |

> 🧩 **O nome do record NÃO é o mesmo campo em todo lugar — e é aqui que se erra.**
> O que o dashboard exibe já embute o `recruta` (o domínio adicionado no Resend é o **subdomínio inteiro**, mas a zona que você edita é `beautysmile.com.br`). Existem então três formas do mesmo nome, e você precisa saber qual cada campo quer:
> - **FQDN final** — `send.recruta.beautysmile.com.br`. É o que o `dig` do Passo 4 recebe e o que alguns painéis (Registro.br) exigem no campo *Name*.
> - **Nome relativo à zona editada** — `send.recruta`. É o que a Cloudflare quer (ela re-acrescenta `beautysmile.com.br` sozinha — ver § 3.1).
> - **Nome exibido pelo dashboard do Resend** — pode ser qualquer uma das duas formas acima, dependendo da conta/época.
>
> **Regra única que fecha os três casos:** o FQDN final tem que conter `recruta` **exatamente uma vez**. Se você contou `recruta` duas vezes (`…recruta.recruta.beautysmile.com.br`), concatenou o sufixo em cima de um nome que já o tinha.

---

## 3. Passo 2 — Publicar os records no DNS

> 📌 **Item aberto — preencher na execução:**
> Provedor de DNS de `beautysmile.com.br`: `____________________` (Cloudflare / Registro.br / outro)
> Quem tem acesso ao painel: `____________________`
> Data em que os records foram publicados: `____________________`

Independente do provedor, a regra que vale sempre: **crie todos os records → confira com `dig` → só então clique Verify** (Passo 4).

### 3.1 Se for Cloudflare

- **Proxy em `DNS Only`** — nuvem **cinza**, nunca laranja. Com o proxy ligado, o CNAME do DKIM resolve para um IP da Cloudflare e a verificação falha sem mensagem útil.
- **Omita o sufixo do domínio no campo *Name***. A Cloudflare re-acrescenta a zona automaticamente. Colar `send.recruta.beautysmile.com.br` produz `send.recruta.beautysmile.com.br.beautysmile.com.br`. Cole apenas `send.recruta` (ou o que a Cloudflare mostrar como resultado no preview do campo).
- **Prioridade do MX:** se `10` já estiver em uso na zona por outro MX, use `20`. Prioridade duplicada gera comportamento indefinido.

### 3.2 Se for Registro.br ou outro provedor

- Alguns formulários exigem o **FQDN completo** no campo de nome (`send.recruta.beautysmile.com.br.`, às vezes com ponto final) em vez do nome relativo que o Resend mostra. Não há regra universal.
- Por isso a conferência com `dig` depois de salvar (Passo 4) é **obrigatória em qualquer provedor** — é ela que revela nome duplicado, nome truncado ou valor com aspas sobrando.
- Se o painel adicionar aspas automaticamente ao valor de um TXT, não adicione aspas manualmente também (duplo aspeamento quebra o SPF).

---

## 4. Passo 3 — Publicar o DMARC (MANUAL, obrigatório)

> ⛔ **Este é o modo de falha nº 1 desta operação.** O Resend **NÃO cria** o record DMARC — ele só documenta. O selo `Verified` no dashboard refere-se **apenas aos records que o próprio Resend emitiu** (SPF/DKIM). É perfeitamente possível ter um domínio `verified` e nenhum DMARC publicado, e é exatamente aí que a taxa de inbox cai, porque Gmail e Outlook passam a aplicar heurística própria.

Crie **manualmente**, na mesma zona:

| Campo | Valor |
|-------|-------|
| Nome | `_dmarc.recruta.beautysmile.com.br` |
| Tipo | `TXT` |
| Valor | `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br` |
| TTL | Auto / 3600 |

`p=none` é deliberado: fase de **monitoramento**. Não rejeita nada; apenas pede relatórios agregados no endereço `rua`. Endurecer para `p=quarantine` ou `p=reject` só depois de acumular relatórios e confirmar que 100% do envio legítimo está alinhado — fora do escopo do M7 (ver § 9).

---

## 5. Passo 4 — Conferir com `dig` ANTES de clicar Verify

Ordem correta e não negociável: **(1) criar todos os records → (2) confirmar por `dig` → (3) clicar Verify.**

```bash
# SPF / return-path
dig +short MX  send.recruta.beautysmile.com.br
dig +short TXT send.recruta.beautysmile.com.br

# DKIM — NÃO acrescente sufixo às cegas. Monte o FQDN final e CONFIRA antes de rodar:
# o FQDN tem que conter "recruta" EXATAMENTE UMA VEZ (ver a regra do § 2).
#
#   caso 1 — o dashboard já mostra o FQDN completo (contém "beautysmile.com.br"):
#            use o nome COMO ESTÁ, sem concatenar nada.
#            ex.: dashboard mostra "resend._domainkey.recruta.beautysmile.com.br"
dig +short CNAME resend._domainkey.recruta.beautysmile.com.br
#
#   caso 2 — o dashboard mostra o nome relativo à ZONA que você editou (contém
#            "recruta", mas não "beautysmile.com.br"): acrescente ".beautysmile.com.br".
#            ex.: dashboard mostra "resend._domainkey.recruta"
dig +short CNAME resend._domainkey.recruta.beautysmile.com.br
#
#   caso 3 — o dashboard mostra um nome SEM "recruta": aí sim o sufixo é o
#            domínio de envio inteiro.
dig +short CNAME <nome-do-dashboard>.recruta.beautysmile.com.br
#
# Se o dashboard indicou TXT em vez de CNAME, mesma regra de nome, só troca o tipo:
dig +short TXT   <o-mesmo-FQDN-montado-acima>

# DMARC (o Resend nunca verá este — é conferência sua)
dig +short TXT _dmarc.recruta.beautysmile.com.br
```

Cada comando deve devolver **exatamente** o valor colado no painel. Sinais de erro comuns:

- **FQDN com `recruta.recruta`** (ou com `beautysmile.com.br` duas vezes) → você concatenou o sufixo em cima de um nome que já o tinha. O erro está no **comando `dig`**, não no DNS: corrija o FQDN e rode de novo. **NÃO mexa nos records** — ver o aviso no fim desta seção.
- Resposta vazia → **primeiro releia o FQDN que você digitou** (regra do § 2: `recruta` exatamente uma vez). Só depois de o nome estar comprovadamente certo é que "resposta vazia" significa "record ainda não propagou" ou nome errado no painel (sufixo duplicado no campo *Name* — ver § 3.1).
- O CNAME do DKIM devolve algo que **não** termina em `.dkim.amazonses.com` → proxy da Cloudflare ligado.
- TXT com aspas duplicadas (`""v=spf1…""`) → duplo aspeamento do painel.

Só depois de todos os `dig` responderem, volte ao dashboard e clique **Verify**.

**Como ler o status depois do Verify:**

| Status | Significado |
|--------|-------------|
| `not_started` | Verify ainda não foi acionado |
| `pending` | **Normal.** Verificação assíncrona em andamento — espere |
| `temporary_failure` | "Tente de novo depois" — **não** é erro de configuração |
| `partially_verified` / `partially_failed` | Parte dos records passou; olhe o status **por record** |
| `verified` | SPF/DKIM OK (⚠️ não diz nada sobre o DMARC) |
| `failed` **após** propagação confirmada por `dig` | Único sinal real de erro. Só aqui vale mexer nos records |

Clicar Verify repetidamente antes da propagação só gera ruído de status — e a reação natural (mexer nos records que estavam certos) piora a situação.

---

## 6. Passo 5 — Verificar por script

Com uma chave do Resend em mãos:

```bash
RESEND_API_KEY=<sua-chave> npm run check:resend-dominio
# equivalente: RESEND_API_KEY=<sua-chave> node scripts/check-resend-dominio.mjs
```

O script reporta: se o domínio existe na conta, o `status` agregado, a `region` (esperada `sa-east-1`), `open_tracking`/`click_tracking` (esperados `false`) e o **status de cada record** — que é o valor real: transforma "não verificou" em "faltou o TXT SPF em `send`".

Regras de uso:

- A chave é passada **por variável de ambiente na invocação**, nunca commitada, nunca em `.env` versionado.
- Sem chave no ambiente, o script é **no-op com aviso e exit 0** — é um relatório opt-in, não um portão.
- **Este script nunca roda no CI**, nem no `postbuild`, nem em git hook. Ele faz rede e exigiria uma chave viva nos GitHub Secrets; o CI roda deliberadamente sem chave.
- O script **não vê o DMARC** (não está no `records[]` do Resend). Use o `dig` do Passo 4.

---

## 7. Passo 6 — As três chaves do Resend e onde cada uma vive

São **três chaves distintas**, com escopos que não se misturam:

| # | Chave | Onde vive | Para quê |
|---|-------|-----------|----------|
| a | **test-mode** (dev local) | `.env` local, **gitignored** | `supabase functions serve`, smokes locais. Revogá-la não derruba PROD |
| b | **PROD de notificações** (nova, dedicada) | **Somente** Supabase Vault, sob o nome `resend_api_key` | EF `notificar-candidato` (P38) |
| c | **legada do `cost-alerter`** | Env secret da Edge Function (como está hoje) | Alertas internos de custo. **NÃO é migrada nesta fase** |

Criar a chave (b): Resend Dashboard → **API Keys** → **Create API Key**. Nome sugerido: `notificacoes-ats-prod`. **Não reutilize** a chave do `cost-alerter`.

### Provisionar no Vault

Executar via **Supabase MCP** (`execute_sql`), assim que a chave PROD real existir. Assinatura atual: 3 argumentos posicionais — valor, nome, descrição.

```sql
select vault.create_secret(
  '<COLE-AQUI-A-CHAVE-PROD-REAL>',            -- valor real; NUNCA um placeholder
  'resend_api_key',                            -- nome canônico (snake_case, convenção do repo)
  'Resend PROD send key — M7/P36 DELIV-02'
);
```

> ⚠️ **Não crie placeholder.** Uma chave falsa no Vault produz um `401` opaco em produção ("a chave existe, mas não funciona"); a **ausência** do segredo produz `NULL`, que o código já trata com *graceful skip* e uma mensagem legível ("não configurado"). Ausência é diagnosticável; chave falsa não é.

Smoke de leitura (não imprime o segredo, só prova que ele está lá e tem tamanho plausível):

```sql
select name, length(decrypted_secret) from vault.decrypted_secrets where name = 'resend_api_key';
```

Esperado: 1 linha, `length` > 20.

---

## 8. Passo 7 — Smoke de envio e a restrição 403

A ordem aqui importa, porque o Resend restringe envios de domínio não verificado:

1. **ANTES do domínio estar verificado:** com o From ainda em domínio não verificado, o Resend responde **403** com a mensagem *"You can only send testing emails to your own email address"*. Nesse estágio, o primeiro smoke local deve usar **o e-mail da própria conta Resend do Fernando** como destino. A documentação não abre exceção explícita para os endereços `@resend.dev` nesse cenário — não assuma que funcionam antes da verificação.
2. **DEPOIS de verificado:** o From passa a ser `nao-responda@recruta.beautysmile.com.br` e o destino pode ser `delivered@resend.dev` (ou `delivered+<evento>@resend.dev`, que é o formato usado pelo modo `teste` do `_shared/email-config.ts`). A restrição é do **domínio remetente**, não do destinatário.
3. Use `bounced@resend.dev` e `complained@resend.dev` quando quiser exercitar os caminhos de falha (relevante na P41, webhook de reconciliação).

> 💸 Os endereços de teste **contam contra a cota da conta** (free tier ≈ 3.000/mês, 100/dia). Um loop de teste desatento queima cota real.

Depois do smoke técnico, execute o aceite humano: `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md`.

---

## 9. Notas e débitos conhecidos

**(a) Segunda chave Resend fora do Vault — `cost-alerter`.**
`supabase/functions/cost-alerter/index.ts:208` já consome `RESEND_API_KEY` como **env secret da Edge Function** e envia de `alertas@beautysmile.app` para `dpo@beautysmile.app` — note o TLD **`.app`**, não `.com.br`. Isso significa duas coisas: (1) existe uma segunda fonte de verdade para uma chave Resend neste projeto, divergente da disciplina "só no Vault" do DELIV-02 — que aqui se lê estritamente como *"a chave **de notificações** vive apenas no Vault"*; e (2) `beautysmile.app` provavelmente **não é um domínio verificado**, o que faria esses alertas internos falharem em `403` hoje sem ninguém notar — um bug latente de entregabilidade.
**Decisão travada: o `cost-alerter` NÃO é refatorado nesta fase** (é alerta interno, não candidato; está fora do escopo da P36). Esta nota é informativa; o item formal de débito é registrado pelo Plano 36-04.

**(b) DMARC começa em `p=none`.**
Fase de monitoramento, por escolha. Endurecer para `p=quarantine` e depois `p=reject` só depois de acumular relatórios `rua` e confirmar alinhamento de 100% do envio legítimo (incluindo qualquer outro sistema que envie por este subdomínio). Deferido — fora do M7.

**(c) O que este runbook não cobre.**
Colocação em caixa de entrada não é observável por API — nenhum provedor expõe isso. Warm-up de reputação e IP dedicado não se justificam no volume do ATS. Monitoramento de bounce/complaint chega na Phase 41 (webhook Resend + ledger de status).

---

## Referências

- `scripts/check-resend-dominio.mjs` — o reporter opt-in do Passo 5
- `supabase/functions/_shared/email-config.ts` — From/Reply-To/modo canônicos em código
- `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md` — aceite formal (9 itens)
- `.planning/phases/36-deliverability-sender-identity/36-RESEARCH.md` § Q1–Q4 e § Common Pitfalls 1, 2, 3 e 9
