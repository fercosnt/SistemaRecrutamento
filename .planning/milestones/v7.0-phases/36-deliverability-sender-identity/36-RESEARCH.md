# Phase 36: Deliverability & Sender Identity — Research

**Researched:** 2026-07-21
**Domain:** Entregabilidade de e-mail transacional (Resend) · gestão de segredo (Supabase Vault) · build-output security gate (Node/Vite) · contrato de configuração compartilhado (Deno EF)
**Confidence:** HIGH nas partes verificáveis em repo + docs oficiais Resend/Supabase · MEDIUM no shape exato do record DKIM (varia por conta/era — ver Q1) · nada assumido sobre onde o DNS está hospedado (item aberto do CONTEXT)

> **Escopo desta pesquisa:** aditiva sobre `.planning/research/STACK.md` (M7). Não re-litiga provedor, topologia, SDK-vs-fetch nem templates — tudo isso já está travado no milestone-research e no CONTEXT. O que segue responde às 7 perguntas que o planner precisa para escrever tarefas executáveis.

---

<user_constraints>
## User Constraints (from 36-CONTEXT.md)

### Locked Decisions

**Identidade de Remetente (DELIV-01)**
- **Domínio de envio:** `recruta.beautysmile.com.br` — subdomínio já usado pelo produto (`CriarEditarVagaPage.tsx:565` mostra `recruta.beautysmile.com.br/vagas/{slug}`). O Resend cria os records em `send.recruta.…` (MX + TXT SPF) e `resend._domainkey.recruta.…` (CNAME), então **não colide** com o A record do site. Isola reputação de envio do root corporativo.
- **From:** `Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>` — display name reconhecível, local-part em pt-BR (convenção do domínio) e explicitamente transacional.
- **Reply-To:** `recrutamento@beautysmile.com.br` — caixa real do RH no domínio **root** (separa envio de recepção). Candidato que responde não cai no vazio.
- **DMARC inicial:** `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br` publicado em `_dmarc.recruta.beautysmile.com.br`. Monitorar primeiro; endurecer para `quarantine`/`reject` depois de ter dados de alinhamento (não neste milestone).

**Gestão do Segredo & Guard de Bundle (DELIV-02)**
- **Local do segredo em PROD:** Supabase **Vault** (`vault.create_secret` → lido via `vault.decrypted_secrets` dentro da EF). Espelha o padrão já estabelecido no repo (`edge_invoke_key`, `project_url`, SEC-03). **Nunca** `supabase secrets set` como fonte de verdade em PROD, nunca env `VITE_`.
- **Duas chaves, não uma:** chave *test-mode* para local/`supabase functions serve` (`.env` gitignored) + chave *prod* somente no Vault. Revogar a de dev não derruba PROD.
- **Grep-guard:** novo `scripts/assert-no-secrets.mjs` — irmão de `scripts/assert-chunks.mjs`, mesmo estilo (leitura pura de `build/assets/*`, sem rede, sem eval). Varre por `re_[A-Za-z0-9]{8,}`, `api.resend.com`, `RESEND_API_KEY`; sai não-zero no primeiro hit. **Não** estender `assert-chunks.mjs` (mistura perf com segredo).
- **Enforcement duplo:** encadeado no `postbuild` do `package.json` (falha o `npm run build` local) **e** como step no job `build` do `.github/workflows/ci.yml`, logo após "Bundle gate (PERF-03)". Falha dura nos dois.

**Disciplina Test-Address Dev/CI (DELIV-03)**
- **Artefato de código da P36:** `supabase/functions/_shared/email-config.ts` — constantes From/Reply-To, resolução de modo, e `resolverDestinatario()`; com suite Deno em `supabase/functions/_shared/__tests__/`. A P38 **importa** esse contrato em vez de reinventá-lo.
- **Chave de modo:** env explícito `NOTIFICACOES_MODO ∈ {producao, teste}`, com **default `teste`** — fail-safe. Não inferir de hostname/`SUPABASE_URL`.
- **Comportamento em modo teste:** reescreve o destinatário para `delivered+<evento>@resend.dev` e **preserva o endereço original** em campo separado (para auditoria/ledger na P37+). Não usar `candidatura_id` no `+label` (PII-ish num endereço de terceiro).
- **CI sem chave viva:** CI roda **sem** `RESEND_API_KEY`; o sender é injetado por mock nos testes Deno. `email-config` lança erro explícito se `modo=producao` sem chave presente. Nada de chave test-mode real nos GitHub Secrets.

**Encerramento do Gate Humano & Provisionamento**
- **Fase não bloqueia no DNS:** DELIV-01 entra em VERIFICATION como **HUMAN-UAT pendente**, com runbook passo-a-passo + checklist. A cadeia 37→38→39 não espera propagação DNS.
- **Verificação opt-in:** `scripts/check-resend-dominio.mjs` chama `GET https://api.resend.com/domains` e reporta status + records faltantes. **Nunca no CI**; no-op com aviso claro se não houver chave disponível.
- **Vault só com chave real:** Fernando gera a chave prod no Resend → `vault.create_secret` via Supabase MCP assim que ela existir. **Sem placeholder.** Se a chave não existir durante a P36, o runbook grava o comando exato e a P38 (smoke) cobra.
- **Docs em `docs/runbooks/`:** novo diretório, arquivo `resend-dominio-envio.md`.

### Claude's Discretion
- Formato exato dos regexes do grep-guard e da mensagem de erro (desde que falha dura e apontando o arquivo/offset ofensor).
- Assinatura precisa de `resolverDestinatario()` e shape do retorno (desde que preserve o destinatário original e o evento).
- Estrutura interna do runbook (desde que provider-agnóstica no DNS e com os valores canônicos literais e copiáveis).

### Deferred Ideas (OUT OF SCOPE)
- Endurecer DMARC para `p=quarantine`/`p=reject` — fora do M7.
- Warm-up de reputação / IP dedicado — não pesquisar neste milestone.
- Monitoramento de reputação (dashboard bounce/complaint) — M8+.
- Registro de domínio adicional para links/tracking — não há tracking de clique no v1.

### Item aberto (registrado, não bloqueante)
- **Onde o DNS de `beautysmile.com.br` é hospedado** (Registro.br / Cloudflare / outro) — runbook provider-agnóstico; Fernando preenche na execução.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição (REQUIREMENTS.md) | Suporte desta pesquisa |
|----|------------------------------|-------------------------|
| **DELIV-01** | Domínio de envio (subdomínio dedicado) verificado no Resend com SPF/DKIM (auto) + DMARC (manual), From/Reply-To reais definidos | Q1 (formato exato dos records DNS + região + return-path), Q2 (API `/domains` para o script opt-in), Q7 (pitfalls de propagação/CNAME/SPF), § Runbook, § Validation Architecture (checklist HUMAN-UAT) |
| **DELIV-02** | `RESEND_API_KEY` no Supabase Vault (nunca bundle/`VITE_`); nenhuma chave/URL de provedor no bundle público | Q3 (sintaxe Vault + GRANTs + precedente `20260609000002_prompt_library_rpcs.sql:28-29`), Q5 (contrato exato de `assert-chunks.mjs` a replicar), Pitfalls 4-7 (falso-positivo/negativo do guard), § Security Domain |
| **DELIV-03** | Dev/CI enviam só a `*@resend.dev`, sender mockado nos unit tests, CI sem chave viva | Q4 (comportamento dos endereços de teste + restrição 403), Q6 (padrão de DI/mock no corpus Deno do repo), § Code Examples (`email-config.ts` + suite), Pitfall 8 (Vitest coleta o teste Deno) |
</phase_requirements>

---

## Summary

Esta fase tem três entregáveis independentes que compartilham um único tema — **fail-safe**: (1) um gate humano/DNS documentado por runbook, (2) um guard de build que prova ausência de segredo, e (3) um módulo de configuração Deno que torna "não enviar para gente real" o comportamento *default*. Nenhum deles exige dependência nova: o guard é Node stdlib puro (irmão exato de `scripts/assert-chunks.mjs`), o módulo `email-config.ts` é TypeScript sem imports, e o script de verificação opt-in usa o `fetch` global do Node 20+.

A pesquisa confirmou os shapes externos que faltavam: os records que o Resend devolve são `MX`/`TXT` em `send.<dominio>` apontando para `feedback-smtp.<region>.amazonses.com` (SES por baixo), um `CNAME` DKIM cujo **nome é um token gerado, não literalmente `resend._domainkey`** (correção importante ao CONTEXT — ver Q1), e o DMARC que o Resend **não** publica. A API `/domains` devolve `status` (`not_started`/`pending`/`verified`/`partially_verified`/`partially_failed`/`failed`/`temporary_failure`) no nível do domínio e um `records[]` com `status` por record — exatamente o que o `check-resend-dominio.mjs` precisa pra dizer "falta o TXT SPF".

Três descobertas de repo mudam o plano de forma material e **não estavam no CONTEXT**: (a) **não existe job `build` no `ci.yml`** — o step "Bundle gate (PERF-03)" vive dentro do job `e2e` (`ci.yml:111`), e o `lighthouse` também roda `npm run build`; (b) `supabase/functions/cost-alerter/index.ts:208` **já consome `RESEND_API_KEY` via `Deno.env.get`** e já envia de `alertas@beautysmile.app` — existe um consumidor Resend prévio, com domínio *diferente*; (c) um teste Deno novo em `_shared/__tests__/` é **coletado pelo Vitest** por causa do glob `**/__tests__/**/*.test.ts` em `vite.config.ts:13` e quebra `npm run test:run` se não for adicionado ao `test.exclude` — armadilha já documentada no próprio arquivo ("two Deno tests were never added to this list").

**Primary recommendation:** Escrever `scripts/assert-no-secrets.mjs` como *walk recursivo de todo o `build/`* (não só `build/assets/*.js`) com regex **ancorado em `\b`** e mensagem de erro **mascarada**; encadeá-lo no `postbuild` **antes** do `assert-chunks` e adicioná-lo como step no job **`e2e`** (não "build"). Landar `email-config.ts` sem imports + suite Deno RED-first, e **na mesma tarefa** adicionar a linha de `exclude` no `vite.config.ts`. Provisionar o segredo no Vault com o nome `resend_api_key` (convenção do repo) e — recomendado — landar junto a função `public.ler_resend_api_key()` `SECURITY DEFINER` de argumento zero, sem a qual o EF da P38 **não consegue** ler `vault.decrypted_secrets` (o schema `vault` não é exposto ao PostgREST).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Verificação de domínio / DKIM / SPF / DMARC | **DNS externo + Resend dashboard** (humano) | Runbook em `docs/runbooks/` | Não é código; é estado de zona DNS + estado da conta Resend. Só documentável e checável, nunca "implementável". |
| Prova de que nenhum segredo entra no bundle | **Build tooling (Node)** | CI (`e2e` job) | O único artefato que pode ser inspecionado é a saída do Vite (`build/`). Guard é pós-build, não pré-commit. |
| Armazenamento da chave de provedor | **Postgres / Supabase Vault** | Edge Function (leitor) | Segredo em repouso pertence ao banco cifrado; nenhuma camada cliente participa. |
| Leitura da chave em runtime | **Edge Function (Deno)** via RPC `SECURITY DEFINER` | Postgres | `vault` não é schema exposto ao PostgREST → precisa de wrapper em `public` restrito a `service_role`. |
| Resolução From/Reply-To/modo/destinatário | **`_shared/email-config.ts` (Deno, função pura)** | — | Contrato compartilhado, testável sem rede; P37 (ledger) e P38 (EF) importam, não reimplementam. |
| Envio efetivo (`POST /emails`) | **P38 — fora do escopo desta fase** | — | P36 define *identidade e disciplina*, não o transporte. |
| Cliente React / bundle | **NENHUMA responsabilidade** | — | Zero código de e-mail no tier cliente — essa é literalmente a asserção do DELIV-02. |

---

## Standard Stack

### Core — nenhuma dependência nova

| Ferramenta | Versão verificada | Propósito | Por que é o padrão |
|-----------|-------------------|-----------|--------------------|
| **Node stdlib** (`node:fs`, `node:path`, `node:url`) | Node 24.10.0 local / **Node 20** no CI (`ci.yml:63`) | `scripts/assert-no-secrets.mjs` | Exatamente o que `assert-chunks.mjs` usa. Zero dependência, zero rede, zero `eval` — a propriedade de segurança do gate é *ele próprio não ser um vetor*. [VERIFIED: leitura de `scripts/assert-chunks.mjs:26-28`] |
| **`fetch` global do Node** | Estável desde Node 18 | `scripts/check-resend-dominio.mjs` (opt-in) | Sem `axios`/`node-fetch`. O script é opt-in e nunca roda no CI. [VERIFIED: `node --version` = v24.10.0; CI usa Node 20] |
| **Deno 2.7.7** + `https://deno.land/std@0.224.0/assert/mod.ts` | pin do repo | Suite de `email-config.ts` | Pin já usado por todo o corpus (`cost-alerter-messages.test.ts:14`, `ai-client.test.ts:26`). [VERIFIED: `deno --version` = 2.7.7; grep no repo] |
| **Supabase Vault** (`supabase_vault`) | Extensão gerenciada, já em uso | Guarda de `RESEND_API_KEY` | Já load-bearing: `project_url`, `edge_invoke_key`, `n8n_webhook_base`. [VERIFIED: `20260610000003_reprocessar_rpc.sql:63-66`, `20260706110005_sec03_n8n_serverside.sql:61-62`] |
| **Supabase MCP** `apply_migration` / `execute_sql` | — | Aplicar migration + `vault.create_secret` em PROD | `db push --linked` quebra em corpos `$$` adjacentes a `COMMENT`/`GRANT` (SQLSTATE 42601). [VERIFIED: `CLAUDE.md` § Migrations + db push] |

### Supporting

| Item | Uso | Quando |
|------|-----|--------|
| `dig` / `nslookup` | Conferir propagação DNS antes de clicar "Verify" | Passo do runbook (ambos disponíveis localmente) |
| Supabase CLI 2.105.0 | `supabase functions serve` local com `.env` (chave test-mode) | Dev local apenas |

### Alternatives Considered

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| Vault + RPC `SECURITY DEFINER` | `supabase secrets set RESEND_API_KEY` (env da EF) | **Já é o que `cost-alerter` faz** (`index.ts:208`) e satisfaz o objetivo de segurança do DELIV-02 (env de EF nunca toca o bundle). Custa 1 hop a menos. **Rejeitado pelo CONTEXT** — Vault é a decisão travada. Custo real a orçar: a RPC wrapper (ver Q3). |
| Walk recursivo de `build/` | Só `build/assets/*.js` (literal do CONTEXT) | O literal cobre o caso provável mas deixa `build/index.html`, CSS e futuros `.map` fora. Recomendo o walk — é um superset estrito, mesma leitura pura, custo ~0. |
| `dnsjs`/`dns-packet` no script opt-in | — | Não. O `GET /domains/:id` já devolve `records[].status` autoritativo do lado do Resend; resolver DNS localmente só adiciona uma segunda fonte de verdade divergente. |

### Installation

```bash
# NADA. Zero pacotes novos nesta fase.
# - assert-no-secrets.mjs      → node: stdlib
# - check-resend-dominio.mjs   → fetch global (Node 18+)
# - _shared/email-config.ts    → TypeScript puro, zero imports
# - suite Deno                 → deno.land/std pin já usado no repo
```

---

## Package Legitimacy Audit

**Esta fase não instala nenhum pacote externo.** Nenhum `npm install`, nenhum `npm:` specifier novo, nenhum import remoto novo além do `deno.land/std@0.224.0` já pinado e em uso no corpus.

| Package | Registry | Disposition |
|---------|----------|-------------|
| — | — | Nenhum pacote adicionado |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Nota de ferramental: `slopcheck` não estava disponível neste ambiente (`command -v slopcheck` → ausente) e `ctx7` também não. Como o delta de dependências é **zero**, o gate de legitimidade é vacuamente satisfeito — não há nada para o planner gatear atrás de `checkpoint:human-verify`. Se o planner introduzir qualquer pacote, o gate volta a valer e todos devem ser marcados `[ASSUMED]`.*

---

## Perguntas da Pesquisa (Q1–Q7)

### Q1 — Formato exato dos registros DNS que o Resend exige hoje

O Resend roda sobre **Amazon SES**. Ao adicionar um domínio via dashboard ou `POST /domains`, ele devolve um array `records[]` já pronto para copiar. Shape canônico (exemplo oficial da doc, região `us-east-1`):

| `record` | `name` (relativo ao domínio adicionado) | `type` | `value` | `priority` | `ttl` |
|----------|------------------------------------------|--------|---------|-----------|-------|
| `SPF` | `send` | `MX` | `feedback-smtp.us-east-1.amazonses.com` | `10` | `Auto` |
| `SPF` | `send` | `TXT` | `"v=spf1 include:amazonses.com ~all"` | — | `Auto` |
| `DKIM` | `<token>._domainkey` | `CNAME` | `<token>.dkim.amazonses.com.` | — | `Auto` |
| `Tracking` *(só se tracking ligado)* | `links.<domain>` | `CNAME` | `links1.resend-dns.com` | — | `Auto` |

[CITED: resend.com/docs/api-reference/domains/create-domain — exemplo de resposta completo]

**Aplicado a `recruta.beautysmile.com.br`**, os FQDNs a criar na zona `beautysmile.com.br` são:

- `send.recruta.beautysmile.com.br` → **MX** `feedback-smtp.us-east-1.amazonses.com` prioridade `10`
- `send.recruta.beautysmile.com.br` → **TXT** `v=spf1 include:amazonses.com ~all`
- `<token>._domainkey.recruta.beautysmile.com.br` → **CNAME** `<token>.dkim.amazonses.com.`
- `_dmarc.recruta.beautysmile.com.br` → **TXT** `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br` (**manual** — o Resend não publica)

⚠️ **Correção material ao CONTEXT.md (L33):** o CONTEXT diz `CNAME resend._domainkey.recruta.…`. A doc oficial do `POST /domains` mostra o nome DKIM como um **token gerado** (`nhapbbryle57yxg3fbjytyodgbt2kyyg._domainkey`), não o literal `resend._domainkey`. Separadamente, a doc de Domains descreve DKIM como podendo ser um **TXT com a chave pública** (Resend usa DKIM 1024-bit próprio em algumas contas). Ou seja: **existem dois shapes em circulação** e qual você recebe depende da conta/região/época. **Consequência para o plano:** o runbook **NÃO PODE hardcodar** o record DKIM. Ele deve instruir "copie os N records exatamente como o dashboard/`GET /domains/:id` mostrar" e listar apenas os valores realmente canônicos (o domínio, o From, o Reply-To, o DMARC). Confiança neste ponto: **MEDIUM** — é exatamente por isso que o CONTEXT já pedia um runbook provider-agnóstico. [CITED: resend.com/docs/api-reference/domains/create-domain vs resend.com/docs/dashboard/domains/introduction]

**Região:** valores aceitos são `us-east-1`, `eu-west-1`, `sa-east-1`, `ap-northeast-1`. Default `us-east-1`. Para audiência BR existe `sa-east-1` (São Paulo) — latência é irrelevante para e-mail assíncrono, mas `sa-east-1` mantém o dado em território nacional, o que é um argumento LGPD leve. **A região é escolhida na criação do domínio e determina o hostname do MX** (`feedback-smtp.sa-east-1.amazonses.com`), então mudá-la depois exige re-verificar. Recomendação: registrar a escolha explicitamente no runbook. [CITED: resend.com/docs/api-reference/domains/create-domain]

**Return-path:** parâmetro `custom_return_path`, default `"send"` → é literalmente daí que sai o `send.<domain>`. A doc alerta para não usar valores como `"testing"` que reduzem credibilidade. **Não há registro adicional** além dos acima; o return-path *é* o MX+TXT em `send.`. [CITED: resend.com/docs/api-reference/domains/create-domain]

**Tracking:** o record `links.<domain>` só aparece se open/click tracking estiver ligado. O CONTEXT deferiu tracking ("não há tracking de clique no v1") → **o runbook deve mandar desligar open+click tracking no domínio**, o que elimina esse CNAME e o risco de "link/domain mismatch" que dispara filtro de spam (PITFALLS.md L134).

### Q2 — API de domínios do Resend (o que o `check-resend-dominio.mjs` pode automatizar)

| Endpoint | Método | Auth | Resposta relevante |
|----------|--------|------|--------------------|
| `https://api.resend.com/domains` | `GET` | `Authorization: Bearer re_…` | `{ object:"list", has_more, data:[{ id, name, status, created_at, region, capabilities:{sending,receiving} }] }` — **sem** `records[]` |
| `https://api.resend.com/domains/:id` | `GET` | idem | tudo acima **+** `open_tracking`, `click_tracking`, `tracking_subdomain`, e `records:[{ record, name, type, ttl, value, priority, status }]` |
| `https://api.resend.com/domains/:id/verify` | `POST` | idem | `{ object:"domain", id }` — dispara verificação **assíncrona**; domínio vai para `pending` |

[CITED: resend.com/docs/api-reference/domains/{list-domains,get-domain,verify-domain}]

**Enum de `status` (domínio):** `not_started` · `pending` · `verified` · `partially_verified` · `partially_failed` · `failed` · `temporary_failure`. [CITED: resend.com/docs/dashboard/domains/introduction]

**O que o script opt-in consegue provar, portanto:**
1. O domínio `recruta.beautysmile.com.br` **existe** na conta (match por `name` no `GET /domains`).
2. O `status` agregado dele.
3. **Quais records individuais ainda não estão OK** — via `records[].status` do `GET /domains/:id`. Esse é o valor real: transforma "não verificou" em "faltou o TXT SPF em `send`".
4. Se `open_tracking`/`click_tracking` estão ligados (deveriam estar desligados — Q1).

**O que ele NÃO consegue provar:** que o e-mail cai na *inbox* e não no spam. Isso é irredutivelmente humano (ver § Validation Architecture).

**Regras de higiene do script (obrigatórias):**
- Sem chave em env → **no-op com aviso e `exit 0`** (é opt-in, não gate).
- **Nunca** imprimir a chave, nem em erro. Se o Resend responder 401, imprimir "401 — chave inválida ou ausente", não o header.
- **Nunca** chamar `POST /verify` automaticamente sem flag explícita (ex.: `--verify`); um verify prematuro só gera ruído de status.
- **Nunca** no `ci.yml` e **nunca** no `postbuild`.

### Q3 — Supabase Vault: sintaxe, leitura e permissões

**Criação** (assinatura atual, 3 args posicionais — `secret`, `name`, `description`):
```sql
select vault.create_secret(
  're_…',                                   -- valor real; NUNCA placeholder (CONTEXT)
  'resend_api_key',                          -- nome canônico
  'Resend PROD send key — M7/P36 DELIV-02'
);
```
[CITED: supabase.com/docs/guides/database/vault + raw docs `vault.mdx`]

**Atualização:** `select vault.update_secret('<uuid>', '<novo valor>', '<nome>', '<descrição>');`

**Leitura:** `select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key';`

**Precedente no próprio repo** [VERIFIED — grep direto]:
- `supabase/migrations/20260609000002_prompt_library_rpcs.sql:28-29` — o comando `vault.create_secret(...)` documentado inline para `project_url` e `edge_invoke_key`.
- `supabase/migrations/20260610000003_reprocessar_rpc.sql:63-66` — leitura: `SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';` (+ `edge_invoke_key`), com **graceful skip** em `NULL` nas linhas 68-72.
- `supabase/migrations/20260706110005_sec03_n8n_serverside.sql:61-62, 118-119, 178-179` — mesmo idioma para `n8n_webhook_base`, sempre `SECURITY DEFINER` + `SET search_path = ''` + `REVOKE ALL … FROM PUBLIC`.

**Convenção de nome:** os três segredos existentes são `snake_case` minúsculo (`project_url`, `edge_invoke_key`, `n8n_webhook_base`). **Recomendo `resend_api_key`**, não `RESEND_API_KEY` — o CONTEXT trava *onde* o segredo vive, não *como se chama*. (Decisão de Claude's-discretion; registrar no runbook porque a P38 precisa ler pelo mesmo nome.)

**⚠️ O gap que o CONTEXT não cobre — como a EF lê isso.** O schema `vault` **não é exposto ao PostgREST**, então `supabase.from('decrypted_secrets').schema('vault')` de dentro da EF falha. O padrão sancionado é uma função `SECURITY DEFINER` em `public`, restrita a `service_role`. [CITED: supabase.com/docs/guides/database/vault §"protect access to this view with SQL privilege settings"; makerkit.dev/blog/tutorials/supabase-vault — SQL + GRANTs; corroborado por supabase/discussions]

Recomendação de segurança **mais estreita** que o exemplo público (que expõe `read_secret(text)` genérico — um comprometimento de `service_role` leria *todos* os segredos):

```sql
-- Leitor de UM segredo, sem argumento → superfície mínima.
create or replace function public.ler_resend_api_key()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v text;
begin
  select decrypted_secret into v
    from vault.decrypted_secrets where name = 'resend_api_key';
  return v;   -- NULL = não provisionado → o chamador faz graceful skip
end;
$$;

revoke all on function public.ler_resend_api_key() from public;
revoke all on function public.ler_resend_api_key() from anon;
revoke all on function public.ler_resend_api_key() from authenticated;
grant execute on function public.ler_resend_api_key() to service_role;
```

**Se essa RPC deve landar na P36 ou na P38** é uma decisão do planner. Argumento para P36: sem ela o DELIV-02 é "o segredo está guardado num cofre que ninguém consegue abrir" — o requisito fica formalmente satisfeito mas operacionalmente incompleto, e a P38 descobre o problema tarde. Argumento para P38: o CONTEXT delimita o escopo da P36 e a RPC é infra de consumo. **Recomendo landar na P36** como migration file-only (mesma disciplina do SEC-03: o arquivo só *lê* o segredo, quem *cria* é o executor via MCP).

⚠️ **Aplicação:** corpo `$$` + `REVOKE`/`GRANT` adjacentes é exatamente o gatilho do `SQLSTATE 42601` documentado no `CLAUDE.md`. Aplicar via **Supabase MCP `apply_migration`**, sem wrapper `BEGIN;/COMMIT;`, e reconciliar o ledger — o caminho já estabelecido (24-08).

### Q4 — Endereços de teste do Resend

| Endereço | Simula | `+label`? |
|----------|--------|-----------|
| `delivered@resend.dev` | Entrega bem-sucedida | ✅ sim |
| `bounced@resend.dev` | Hard bounce SMTP `550 5.1.1` | ✅ sim |
| `complained@resend.dev` | Reclamação de spam | ✅ sim |
| `suppressed@resend.dev` | Supressão | ❌ **não suportado ainda** |

[CITED: resend.com/docs/dashboard/emails/send-test-emails]

Dois fatos operacionais da mesma doc:
1. **Contam contra a cota da conta.** Free tier ≈ 3.000/mês, 100/dia [MEDIUM — STACK.md L161, preços derivam]. Um loop de teste desatento queima cota.
2. `+label` existe justamente "para rastrear respostas de webhook em cenários de teste específicos" — que é exatamente o uso do `delivered+<evento>@resend.dev` decidido no CONTEXT. ✅ A decisão está alinhada com o uso pretendido pela doc.

**⚠️ A restrição que muda o plano:** com `onboarding@resend.dev` como From (domínio não verificado), o Resend responde **403** com a mensagem literal:

> "You can only send testing emails to your own email address (your-email-address@domain.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."

[CITED: resend.com/docs/knowledge-base/403-error-resend-dev-domain]

A doc **não lista exceção para `delivered@resend.dev`** — ela diz explicitamente "apenas o endereço de e-mail associado à sua conta Resend". Confiança: **MEDIUM** — a ausência de menção às test-addresses não é prova de que sejam bloqueadas, e a prática comunitária de usar `onboarding@ → delivered@` é difundida. Mas o planner **não deve assumir que funciona**.

**Consequências práticas (e por que isso é quase inofensivo aqui):**
- O **CI não é afetado** — CI roda sem chave e com sender mockado; nenhuma chamada real acontece. DELIV-03 fecha sem tocar nisso.
- O **dev local** com chave test-mode e domínio ainda não verificado **pode** tomar 403 ao mandar para `delivered+…@resend.dev`. Mitigação sem custo: enquanto o domínio não estiver verificado, o smoke local usa **o e-mail da conta do Fernando** como destino; depois de verificado, `delivered@resend.dev` funciona sem restrição (a restrição é do *domínio remetente*, não do destinatário).
- **Registrar isso no runbook** como uma nota de ordem: "antes de verificar o domínio, teste contra seu próprio e-mail; depois, contra `delivered@`".

### Q5 — O contrato exato de `scripts/assert-chunks.mjs` a replicar

Contrato lido integralmente de `scripts/assert-chunks.mjs` (150 linhas):

| Elemento | Como é feito | Linha |
|----------|--------------|-------|
| Shebang | `#!/usr/bin/env node` | 1 |
| Docblock | JSDoc de bloco: 1 linha de título (`nome.mjs — o gate X`), parágrafo de propósito, **declaração explícita de postura de segurança** ("Reads ONLY the local `build/assets/*.js` output — no untrusted input, no network, no eval"), onde roda ("under the BUILD gate, NOT Vitest"), como invocar standalone, e uma **lista numerada das asserções** | 2-25 |
| `@see` | 2 referências a `.planning/…` com número de linha | 23-24 |
| Imports | só `node:fs`, `node:path`, `node:url` | 26-28 |
| Resolução de caminho | `__dirname` via `dirname(fileURLToPath(import.meta.url))` → `join(__dirname, '..', 'build', 'assets')` | 30-31 |
| Constantes de gate | `const` maiúsculo com comentário explicando **de onde veio o número** | 33-44 |
| Acumuladores | `const failures = []` / `const notes = []` — coleta tudo, **não** aborta no primeiro | 46-47 |
| Diretório ausente | `try/readdirSync` → `catch` → `console.error` com instrução de conserto (`Run \`npm run build\` first`) + `process.exit(1)` | 53-63 |
| Diretório vazio | check separado → `exit(1)` | 65-71 |
| Inventário legível | imprime tabela ordenada por tamanho antes de qualquer asserção | 73-81 |
| Falha | mensagem começa com `✗ `, cita o arquivo/marcador ofensor **e o que fazer** (`add build.rollupOptions…`), com o ID do requisito entre parênteses (`PERF-03`) | 88-90, 106-109, 116-120 |
| Sucesso | mensagem começa com `✓ ` | 86, 102-104 |
| Report final | `for (n of notes) console.log(n)` → se `failures.length` → `console.error('\nassert-chunks FAILED:')` + lista + `process.exit(1)` | 139-146 |
| Saída verde | `console.log('\n✓ assert-chunks PASSED — all PERF-03 chunk conditions met.\n')` + `process.exit(0)` | 148-149 |
| Idioma | **inglês** (código técnico — consistente com `CLAUDE.md`) | — |

**Invocação:**
- `package.json:98` → `"postbuild": "node scripts/assert-chunks.mjs"` (roda automaticamente após **todo** `npm run build`)
- `package.json:99` → `"assert:chunks": "node scripts/assert-chunks.mjs"` (alias standalone)
- `ci.yml:111-112` → step `Bundle gate (PERF-03)` — **dentro do job `e2e`**, logo após o step `Build`

**⚠️ Correção material ao CONTEXT.md (L42):** o CONTEXT fala em "step no job `build` do `.github/workflows/ci.yml`". **Não existe job `build`.** Os jobs são `unit`, `deno-test`, `e2e`, `lighthouse`. O step "Bundle gate (PERF-03)" está em `e2e` (`ci.yml:111`). O job `lighthouse` também roda `npm run build` (`ci.yml:135`) e portanto **também** dispara o `postbuild`. Logo, ao encadear o guard no `postbuild`, ele passa a ser enforçado em **dois** jobs de CI automaticamente; o step dedicado (para sinal de falha limpo e distinto, exatamente a justificativa escrita em `ci.yml:108-110`) deve ir para o job **`e2e`**, imediatamente antes ou depois do "Bundle gate (PERF-03)".

**Diretório de saída correto: `build/`.** Confirmado em `vite.config.ts:123` (`outDir: 'build'`) e no `CLAUDE.md` (`npm run build # Producao → build/`). `.gitignore` ignora tanto `build` quanto `dist` (linhas 12-13, 34-35) mas o Vite só escreve em `build/`. **Não** escanear `dist/`.

**Extensões a varrer — recomendação:** walk **recursivo de todo o `build/`** com *blacklist* binária, em vez de whitelist de extensões:
- Varrer: tudo que não for `.png .jpg .jpeg .gif .webp .avif .ico .svgz .woff .woff2 .ttf .otf .eot .mp4 .webm .pdf .zip`.
- Isso cobre `build/index.html`, `build/assets/*.js`, `build/assets/*.css`, `.map` (hoje não emitidos — `build.sourcemap` não está setado no `vite.config.ts`, mas cobre um flip futuro), `.json`, `.webmanifest`, e qualquer arquivo copiado de `public/`.
- Por que superset e não o literal do CONTEXT (`build/assets/*`): um `VITE_RESEND_…` inlinado poderia aparecer num `<script>` inline do `index.html`; e o custo de varrer 3 arquivos a mais é nulo.
- `.svg` **deve** ser varrido (é texto).

### Q6 — Testabilidade Deno sem rede: o padrão de injeção do repo

O comando do CI é `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (`ci.yml:87`) — **sem `--allow-net`**, por design ("tests inject mocks", `ci.yml:78`). Existem **três** padrões de mock no repo, e o correto para esta fase é o (A):

**(A) Dependency injection via objeto `deps` — o padrão dominante.** `callAi(args, deps)` recebe `{ anthropic, openai, supabase, breaker, … }` (`_shared/ai-client.ts:386-410`) e os testes passam fakes hand-rolled (`ai-client.test.ts:38-70`). Idem nas EFs: `handler(req, deps)` com `{ supabaseAdmin, supabaseUser }` (`submit-candidatura/index.test.ts:175-177`). **É este o padrão para o sender do DELIV-03** — a P38 deve expor `enviarEmail(payload, deps)` com `deps.send`, e a P36 já deve *desenhar* `email-config.ts` de modo a não precisar de nenhuma injeção (é função pura).

**(B) Stub de `globalThis.fetch` com restauração em `finally`** — `submit-candidatura/index.test.ts:159-168`:
```ts
async function withStubbedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch;
  try { return await fn(); } finally { globalThis.fetch = original; }
}
```
Útil só para código legado fire-and-forget. Preferir (A).

**(C) `Deno.env.set` / `Deno.env.delete` em `try/finally`** — `ai-client.test.ts:507,527,676,685,697,706`. **É este o padrão para testar `NOTIFICACOES_MODO`.**

**Guarda de env malformado — precedente direto a copiar:** `parseIntEnv()` (`_shared/ai-client.ts`, docblock "AI-07") lê um env, e em valor inválido **cai no default + `console.warn`** em vez de propagar lixo. O `resolverModo()` deve fazer exatamente o mesmo: `NOTIFICACOES_MODO=prod` (typo) → `teste` + warn, nunca `producao`. Fail-safe por precedente do repo, não por invenção.

**Custo zero de CI:** o job `deno-test` já roda o diretório inteiro `supabase/functions`; um teste novo em `_shared/__tests__/` é coletado automaticamente. **Nenhuma edição em `ci.yml` é necessária para o DELIV-03.**

### Q7 — Riscos e pitfalls específicos

Cobertos em detalhe na seção § Common Pitfalls abaixo (Pitfalls 1-9). Resumo do que responde diretamente à pergunta:

- **Propagação/verificação:** verify prematuro → `pending`/`failed` sem sinal útil; CNAME achatado e proxy Cloudflare são as duas causas mais comuns de DKIM que "existe mas não valida"; a doc do Resend para Cloudflare exige explicitamente `DNS Only`.
- **Conflito de SPF:** **não há conflito** neste desenho — o TXT SPF vai em `send.recruta.beautysmile.com.br`, um nome que quase certamente não existe hoje. Um SPF no root `beautysmile.com.br` é irrelevante para o return-path do Resend. O risco real é o *inverso*: alguém "consolidar" o SPF no root e quebrar o alinhamento.
- **Falso-positivo do guard:** o regex `re_[A-Za-z0-9]{8,}` **sem âncora** casa dentro de `measure_something` / `store_identifier` em código minificado. Ancorar com `\b`. E `beautysmile.com.br` **está no bundle hoje** (`ErrorBoundary.tsx:202`, `AutorizacoesStep.tsx:188`, `NovoUsuarioDialog.tsx:146`) e `recruta.beautysmile.com.br` também (`CriarEditarVagaPage.tsx:565`) — o domínio de envio **jamais** pode ser um padrão do guard.
- **Comentários:** um comentário em `src/` mencionando `RESEND_API_KEY` **não** vira falso-positivo — o guard lê `build/`, e o esbuild minifier remove comentários. É outra razão para o guard ser pós-build e não pré-commit.
- **Sourcemaps:** não emitidos hoje; varrer `.map` mesmo assim (custo zero, cobre um flip futuro).
- **`build/` vs `dist/`:** `build/` é o correto (`vite.config.ts:123`). Apontar para `dist/` produziria um guard que **sempre passa** — o pior modo de falha possível.

---

## Architecture Patterns

### System Architecture Diagram

```
┌───────────────────────── FASE 36: três trilhos independentes ─────────────────────────┐
│                                                                                        │
│  TRILHO A — Identidade (humano/DNS, assíncrono)                                        │
│                                                                                        │
│   Fernando ──► Resend Dashboard ──► "Add Domain: recruta.beautysmile.com.br"           │
│                     │                          │                                       │
│                     │                          └─► records[] (MX+TXT em send.,         │
│                     │                                 CNAME DKIM token)                │
│                     ▼                                        │                         │
│              docs/runbooks/                                  ▼                         │
│              resend-dominio-envio.md ────────────► Provedor DNS (Registro.br/CF/?)     │
│                     │                                        │                         │
│                     │                                  + TXT _dmarc (MANUAL)           │
│                     │                                        │                         │
│                     │                                        ▼                         │
│                     │                              [propagação ~min..48h]              │
│                     │                                        │                         │
│                     ▼                                        ▼                         │
│         scripts/check-resend-dominio.mjs ──GET──► api.resend.com/domains{,/:id}        │
│         (OPT-IN, nunca no CI)            ◄──────  status + records[].status            │
│                     │                                                                  │
│                     └──► relatório: "falta TXT SPF em send" / "verified"                │
│                                          │                                             │
│                                          ▼                                             │
│                              HUMAN-UAT: envio real → INBOX? (irredutível)              │
│                                                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────    │
│  TRILHO B — Segredo + prova de não-vazamento (código, síncrono)                        │
│                                                                                        │
│   Resend (chave PROD) ──► [MCP execute_sql] ──► vault.create_secret('re_…',            │
│                                                    'resend_api_key', '…')              │
│                                                          │                             │
│                                                          ▼                             │
│                                                  vault.secrets (cifrado em disco)      │
│                                                          │                             │
│                                       public.ler_resend_api_key()  SECURITY DEFINER    │
│                                       GRANT EXECUTE → service_role  (schema vault      │
│                                          NÃO é exposto ao PostgREST)                   │
│                                                          │                             │
│                                                          └──► [P38] EF notificar-…     │
│                                                                                        │
│   src/**  ──vite build──►  build/  ──► scripts/assert-no-secrets.mjs                    │
│                              │            walk recursivo, regex ancorado                │
│                              │            match ⇒ arquivo+offset MASCARADO ⇒ exit 1     │
│                              │                        │                                 │
│              npm postbuild ──┘                        ├── local: falha `npm run build` │
│              ci.yml job e2e ──────────────────────────┤── CI: falha o job e2e          │
│              ci.yml job lighthouse (via postbuild) ───┘                                 │
│                                                                                        │
│  ─────────────────────────────────────────────────────────────────────────────────    │
│  TRILHO C — Contrato de configuração (código, síncrono)                                │
│                                                                                        │
│   Deno.env NOTIFICACOES_MODO ──► _shared/email-config.ts (PURO, zero imports)          │
│        (ausente/inválido ⇒ 'teste')          │                                          │
│                                              ├─ FROM / REPLY_TO / DOMINIO_ENVIO         │
│                                              ├─ resolverModo()      → fail-safe         │
│                                              ├─ resolverDestinatario(email, evento)     │
│                                              │     teste ⇒ delivered+<evento>@resend.dev│
│                                              │     sempre ⇒ preserva destinatario_orig  │
│                                              └─ exigirChaveApi(modo) → throw se prod    │
│                                                        │            sem chave           │
│                                                        ▼                                │
│                       _shared/__tests__/email-config.test.ts (deno test, SEM net)      │
│                                                        │                                │
│                       vite.config.ts test.exclude ◄────┘  (senão o Vitest coleta e      │
│                                                            `npm run test:run` quebra)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
scripts/
├── assert-chunks.mjs            # existente — modelo de estilo
├── assert-no-secrets.mjs        # NOVO — gate DELIV-02 (postbuild + CI e2e)
└── check-resend-dominio.mjs     # NOVO — opt-in DELIV-01 (NUNCA no CI)

supabase/
├── functions/_shared/
│   ├── email-config.ts          # NOVO — contrato DELIV-03 (zero imports)
│   └── __tests__/
│       └── email-config.test.ts # NOVO — suite Deno
└── migrations/
    └── 2026………_p36_vault_resend_reader.sql   # NOVO (recomendado) — RPC leitora

docs/runbooks/                   # NOVO diretório
└── resend-dominio-envio.md      # runbook DELIV-01, provider-agnóstico

# EDITADOS (3 linhas ao todo):
package.json      → postbuild encadeado + script assert:no-secrets
.github/workflows/ci.yml → 1 step novo no job `e2e`
vite.config.ts    → 1 entrada em test.exclude
```

### Pattern 1 — Build-output security gate (leitura pura, falha dura, mensagem mascarada)

**What:** um `.mjs` que lê a saída do build e prova uma propriedade negativa ("nenhum segredo aqui").
**When to use:** sempre que o requisito é "X não pode estar no bundle". É a única forma de asserção que não depende de disciplina humana.
**Contrato específico deste gate (além do de `assert-chunks.mjs`):**
- **Nunca imprimir o match.** Imprimir `arquivo:offset` + nome do padrão + excerto **mascarado** (ex.: primeiros 4 chars + `…` + comprimento). Um guard que loga o segredo em CI público *é* o vazamento.
- **Coletar todos os hits** antes de sair (mesmo padrão `failures[]`), para que um build ruim mostre tudo de uma vez.
- **Falhar também quando `build/` não existir** — um guard que "passa" porque não achou nada para ler é um falso verde.
- Contar e imprimir quantos arquivos/bytes foram varridos: um `0 files scanned` visível é o antídoto para o modo de falha silenciosa.

### Pattern 2 — Fail-safe env resolution (default = a opção segura)

**What:** ler um env de modo, e em ausência **ou valor inválido** cair no modo que não causa dano.
**Precedente no repo:** `parseIntEnv()` em `_shared/ai-client.ts` (AI-07) — NaN/≤0 → default + `console.warn`.
**Aplicação:** `resolverModo()` → `'teste'` quando `NOTIFICACOES_MODO` é `undefined`, `''`, `'prod'`, `'production'`, `'PRODUCAO'`(?) — decidir se o match é case-sensitive estrito (recomendo: `trim().toLowerCase()` e aceitar apenas `producao`; qualquer outra coisa → `teste` + warn).

### Pattern 3 — Módulo `_shared` sem imports (deploy-bundle-safe)

**What:** `email-config.ts` **não importa nada** — nem `zod`, nem `deno.land/std`, nem `npm:`.
**Why:** (a) evita a necessidade de `import_map = "./functions/deno.json"` no `config.toml` para as EFs que o consumirem (acoplamento CI-07 documentado em `config.toml:3-5`); (b) imuniza contra o *bundle-freeze* do `_shared` (PITFALLS.md Pitfall 11) na medida em que um módulo puro tem superfície mínima; (c) mantém `deno test` sem `--allow-net`.
**Regra:** se em algum momento parecer necessário validar o env com zod aqui — **não**. Uma comparação de string em 3 linhas resolve, e o custo de acoplamento é desproporcional.

### Anti-Patterns to Avoid

- **Estender `assert-chunks.mjs`** com asserções de segredo. O CONTEXT já rejeitou; a razão técnica é que os dois gates têm ciclos de vida e donos diferentes (um afrouxa quando o bundle cresce legitimamente; o outro nunca afrouxa).
- **Guard pré-commit em `src/`** em vez de pós-build em `build/`. Um grep em `src/` gera falso-positivo em comentário/teste e falso-negativo para qualquer coisa que o Vite inline a partir de `.env`. O bundle é a verdade.
- **Placeholder no Vault** (`'CHANGEME'`). Uma chave falsa produz `401` opaco no primeiro envio real; `NULL` produz um graceful-skip legível. O CONTEXT já travou isso e a razão é sólida.
- **Inferir o modo de `SUPABASE_URL`/hostname.** Já travado no CONTEXT. A razão adicional: `supabase functions serve` local e o deploy PROD compartilham forma de URL o suficiente para que a heurística um dia acerte errado.
- **Colocar o domínio de envio nos padrões do grep-guard.** `recruta.beautysmile.com.br` **já está no bundle** hoje (`CriarEditarVagaPage.tsx:565`). O guard falharia imediatamente e por motivo errado.
- **Usar `POST /domains/:id/verify` dentro do script opt-in por default.** Verify é uma ação com efeito de estado no provedor; um script de *leitura* não deve tê-lo sem flag.
- **RPC genérica `ler_segredo(text)`** exposta a `service_role`. Preferir a variante sem argumento, escopada a um segredo.

---

## Don't Hand-Roll

| Problema | Não construa | Use | Por quê |
|----------|--------------|-----|---------|
| Autenticação de e-mail (SPF/DKIM) | Assinatura DKIM própria, gestão de chave | Verificação de domínio do Resend (auto-gera os records) | Rotação de chave, alinhamento SES, formato de header — tudo resolvido. |
| Cifra do segredo em repouso | Cifrar a chave numa coluna com `pgcrypto` na mão | `vault.create_secret` / `vault.decrypted_secrets` | A chave de cifra fica **fora** do banco; um dump do disco não vaza o segredo. Já é o padrão do repo. |
| Checagem de estado dos records DNS | Resolver DNS localmente e comparar strings | `GET /domains/:id` → `records[].status` | O Resend/SES é a autoridade sobre "esse record satisfaz a verificação". Resolver local diverge (TTL, cache, view split-horizon). |
| Detecção de secret em texto | Um scanner genérico de entropia | 3-4 regexes ancorados e específicos + `\b` | Entropia gera falso-positivo massivo em bundle minificado (hashes de chunk, base64 inline de assets). |
| Roteamento de destinatário em não-prod | `if (process.env.NODE_ENV !== 'production')` espalhado | Um único `resolverDestinatario()` no `_shared` | O CONTEXT já identificou: sem o contrato central, DELIV-03 é não-verificável e a P38 reinventa. |
| Framework de teste Deno | — | `deno test` + `deno.land/std@0.224.0/assert` | Já é o corpus do repo, já roda blocking no CI (`ci.yml:79-87`). |

**Key insight:** os três entregáveis da P36 são todos *asserções sobre ausência* (ausência de segredo no bundle, ausência de envio a pessoa real em não-prod, ausência de spoofing). Asserções negativas só têm valor se o mecanismo que as verifica **falhar ruidosamente quando não consegue verificar**. Todo design acima é orientado por isso: `build/` ausente → falha; env ausente → modo seguro; segredo ausente → `NULL` legível, não placeholder.

---

## Common Pitfalls

### Pitfall 1 — "Verified = pronto": DMARC nunca é publicado

**O que dá errado:** o domínio fica `verified` no dashboard (SPF+DKIM auto), a equipe considera concluído, e o DMARC nunca entra. Sem DMARC, Gmail/Outlook aplicam heurística própria e a taxa de inbox cai.
**Por que acontece:** o Resend **não** cria o `_dmarc` automaticamente — ele só documenta. `verified` refere-se apenas aos records que ele mesmo emitiu.
**Como evitar:** o checklist do runbook trata DMARC como um item **separado e obrigatório**, com o valor literal já pronto para colar. O `check-resend-dominio.mjs` **não** verá o DMARC (não está no `records[]` do Resend) → o runbook deve incluir `dig TXT _dmarc.recruta.beautysmile.com.br` como verificação manual.
**Sinal de alerta:** `GET /domains/:id` → `status: "verified"` mas `dig TXT _dmarc.…` vazio.
[CITED: resend.com/docs/dashboard/domains/dmarc; corroborado por `.planning/research/PITFALLS.md:138`]

### Pitfall 2 — Cloudflare: proxy laranja + sufixo de domínio duplicado

**O que dá errado:** dois erros clássicos, ambos silenciosos: (a) o record é criado com o **proxy ligado** (nuvem laranja) → o CNAME DKIM resolve para IP da Cloudflare e a verificação falha; (b) cola-se `send.recruta.beautysmile.com.br` no campo *Name* e a Cloudflare **acrescenta o domínio de novo**, produzindo `send.recruta.beautysmile.com.br.beautysmile.com.br`.
**Como evitar:** a doc do Resend para Cloudflare é explícita: *"Confirm your proxy settings are set to `DNS Only`"* e *"Omit your domain from the record values in Resend when you paste"*. Também alerta para **não repetir a prioridade** de um MX já existente (se `10` estiver em uso, usar `20`/`30`).
**Sinal de alerta:** `dig CNAME <token>._domainkey.recruta.beautysmile.com.br` devolve algo que não termina em `.dkim.amazonses.com`.
**Nota:** o provedor de DNS ainda é item aberto do CONTEXT. O runbook deve ter uma seção "se for Cloudflare" com esses três avisos e uma seção genérica "se for Registro.br/outro" com a instrução equivalente (nome relativo vs FQDN — o Registro.br usa FQDN completo em alguns formulários; o runbook deve mandar **conferir com `dig` após salvar**, o que é provider-agnóstico).
[CITED: resend.com/docs/dashboard/domains/cloudflare]

### Pitfall 3 — Verify prematuro e a janela de propagação

**O que dá errado:** clicar "Verify" antes da propagação → `pending` e depois `failed`/`temporary_failure`; a pessoa conclui que errou os records e começa a mexer, piorando.
**Como evitar:** o runbook impõe a ordem — (1) criar todos os records, (2) **confirmar com `dig`** cada um localmente, (3) só então Verify. E documenta que `pending` é normal e que `failed` após propagação confirmada é que é sinal real.
**Sinal de alerta:** `status: "temporary_failure"` — literalmente significa "tente de novo depois", não "está errado".
[CITED: resend.com/docs/dashboard/domains/introduction — enum de status]

### Pitfall 4 — Regex sem âncora: falso-positivo em bundle minificado

**O que dá errado:** o padrão literal do CONTEXT, `re_[A-Za-z0-9]{8,}`, casa **dentro** de identificadores minificados/preservados: `measure_something` contém `re_something` (11 chars ≥ 8). O guard fica vermelho no primeiro build e a reação natural é afrouxá-lo — matando o gate.
**Como evitar:** ancorar. Chaves Resend têm a forma observada `re_<8>_<24>` (fixture **sintética** usada pelo meta-teste, com essa mesma forma: `re_TESTFAKE_000000000000000000EXAMPLE`). Recomendo dois padrões:
- estrito (o shape real): `/\bre_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}\b/`
- deriva de formato (rede de segurança): `/\bre_[A-Za-z0-9_]{28,}\b/`
O `\b` inicial é o que impede o match dentro de `measure_`/`store_` (a posição entre duas letras não é fronteira de palavra).
**Sinal de alerta:** o guard falha num build recém-clonado, antes de qualquer código Resend existir. Esse é o teste de sanidade — **rode o guard contra o `build/` atual do `main` antes de encadeá-lo**; ele deve passar.
[VERIFIED: análise do formato de chave em resend.com/docs/api-reference/api-keys/create-api-key; ancoragem é raciocínio sobre regex, não citação]

### Pitfall 5 — Incluir o domínio de envio nos padrões do guard

**O que dá errado:** adicionar `beautysmile.com.br` ou `recruta.beautysmile.com.br` à lista de padrões → o guard falha **sempre**, porque essas strings já estão no bundle legitimamente.
**Evidência no repo:** `src/components/pages/CriarEditarVagaPage.tsx:565` (`Preview: recruta.beautysmile.com.br/vagas/{slug}`), `src/components/ErrorBoundary.tsx:202` (`mailto:suporte@beautysmile.com.br`), `src/features/cadastro/components/steps/AutorizacoesStep.tsx:188` (`mailto:lgpd@beautysmile.com.br`), `src/features/admin/components/NovoUsuarioDialog.tsx:146` (placeholder).
**Como evitar:** os padrões são **exatamente** três famílias: (a) chave `re_…`, (b) `api.resend.com`, (c) `RESEND_API_KEY`. Nada de domínio da Beauty Smile, nada de `resend.dev` (que também poderia, um dia, aparecer legitimamente numa doc renderizada).

### Pitfall 6 — Apontar o guard para `dist/` (falso verde permanente)

**O que dá errado:** `.gitignore` lista tanto `build` quanto `dist`, e a maioria dos projetos Vite usa `dist/`. Um guard apontado para `dist/` nunca encontra nada e sempre passa.
**Como evitar:** `outDir: 'build'` está em `vite.config.ts:123`; usar `join(__dirname, '..', 'build')` exatamente como `assert-chunks.mjs:31`. **E** falhar duro quando o diretório não existe (também como `assert-chunks.mjs:53-63`) — é essa cláusula que converte "apontei pro lugar errado" de falso-verde em erro visível.

### Pitfall 7 — O guard vaza o segredo no log do CI

**O que dá errado:** a mensagem de falha imprime o trecho casado. O log do GitHub Actions é retido e frequentemente visível — o gate de segurança vira o vetor de vazamento.
**Como evitar:** imprimir `arquivo`, `offset`, nome do padrão, comprimento do match e no máximo os 4 primeiros caracteres. O GitHub mascara valores de `secrets.*` mas **não** mascara uma chave que apareceu no bundle por acidente.

### Pitfall 8 — O teste Deno novo quebra `npm run test:run` (Vitest o coleta)

**O que dá errado:** `vite.config.ts:13` define `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`. Um novo `supabase/functions/_shared/__tests__/email-config.test.ts` **casa** esse glob → o Vitest tenta carregá-lo, falha ao resolver `https://deno.land/std@…` e o job `unit` fica vermelho.
**Evidência de que isso já aconteceu:** o próprio `vite.config.ts:38-43` documenta — *"two Deno `__tests__/` tests using https://deno.land specifiers were never added to this list"* — e lista `essay-schemas.test.ts` e `consolidar-decisao-final/**` como o conserto retroativo. O arquivo também explica (linhas 44-48) por que **não** existe um glob amplo `_shared/__tests__/**`: `strict-schema.test.ts` é um probe Vitest que precisa continuar rodando.
**Como evitar:** adicionar `'supabase/functions/_shared/__tests__/email-config.test.ts'` ao `test.exclude` **na mesma tarefa** que cria o teste. Não em tarefa separada — o intervalo entre as duas é CI vermelho.
**Sinal de alerta:** `npm run test:run` falha com erro de resolução de `https://` num arquivo que você acabou de criar.

### Pitfall 9 — Divergência com o consumidor Resend que já existe

**O que dá errado:** `supabase/functions/cost-alerter/index.ts:208` **já** lê `RESEND_API_KEY` de `Deno.env.get` e envia de `alertas@beautysmile.app` para `dpo@beautysmile.app` (linhas 214-216) — note o TLD **`.app`**, não `.com.br`. Isso significa que: (a) já existe um `RESEND_API_KEY` provisionado como env secret da EF em PROD (ou o alerta silenciosamente pula — o código faz graceful degradation na linha 209-212); (b) a P36 introduz uma **segunda** fonte de verdade (Vault) para a mesma chave; (c) `beautysmile.app` pode não ser um domínio verificado, o que faria esses alertas internos falharem em 403 hoje sem ninguém notar.
**Como evitar:** decisão explícita do planner, documentada no runbook — recomendo **não migrar o `cost-alerter` nesta fase** (fora do escopo travado; é alerta interno, não candidato) mas **registrar a divergência** numa nota do runbook e como item deferido. O que a P36 **deve** fazer é verificar, ao provisionar, se já existe um `RESEND_API_KEY` como EF secret e decidir se é a mesma chave ou uma nova.
**Sinal de alerta adicional:** se o `cost-alerter` estiver enviando de `alertas@beautysmile.app` sem domínio verificado, esse é um bug latente de entregabilidade que a P36 é a fase natural para *detectar* (mesmo que conserte depois).
[VERIFIED: leitura de `supabase/functions/cost-alerter/index.ts:204-222`]

---

## Code Examples

### `scripts/assert-no-secrets.mjs` — esqueleto conforme o contrato de `assert-chunks.mjs`

```js
#!/usr/bin/env node
/**
 * assert-no-secrets.mjs — the DELIV-02 build-output secret gate.
 *
 * Asserts that `npm run build` produced a bundle carrying NO Resend provider
 * secret or endpoint. Reads ONLY the local `build/` output — no untrusted
 * input, no network, no eval (same posture as assert-chunks.mjs).
 *
 * Runs under the BUILD gate, NOT Vitest (`scripts/**` is excluded in vite.config.ts).
 * Invoke standalone: `node scripts/assert-no-secrets.mjs`.
 *
 * The 3 assertions:
 *   1. No Resend API key (`re_<id>_<secret>`) in any text asset.
 *   2. No `api.resend.com` endpoint literal.
 *   3. No `RESEND_API_KEY` identifier (would mean a VITE_-style inline).
 *
 * SAFETY: a match is reported MASKED (file + byte offset + first 4 chars).
 * Never print the matched value — a CI log is not a secret store.
 *
 * @see .planning/phases/36-deliverability-sender-identity/36-RESEARCH.md (Q5, Pitfalls 4-7)
 * @see scripts/assert-chunks.mjs (sibling gate, PERF-03)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUILD_DIR = join(__dirname, '..', 'build')   // vite.config.ts:123 → outDir: 'build'

// Binary extensions are skipped; EVERYTHING else is scanned (html, js, css,
// svg, json, map, webmanifest…) — a leak in index.html is still a leak.
const BINARY_EXT = /\.(png|jpe?g|gif|webp|avif|ico|svgz|woff2?|ttf|otf|eot|mp4|webm|pdf|zip)$/i

// Resend key shape observed in the official docs: re_<8-12>_<24+>.
// The leading \b is load-bearing: without it `measure_something` matches.
const PATTERNS = [
  { name: 'resend-api-key',        re: /\bre_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}\b/g },
  { name: 'resend-key-formatdrift', re: /\bre_[A-Za-z0-9_]{28,}\b/g },
  { name: 'resend-endpoint',       re: /api\.resend\.com/g },
  { name: 'resend-key-identifier', re: /RESEND_API_KEY/g },
]
// NOTE: `beautysmile.com.br` / `recruta.beautysmile.com.br` are DELIBERATELY absent —
// they are shipped legitimately (CriarEditarVagaPage.tsx:565, ErrorBoundary.tsx:202).

// … walk BUILD_DIR recursively, collect failures[], print scanned-file count,
//     mask every match, exit(1) on any failure or on a missing/empty build/.
```

### `supabase/functions/_shared/email-config.ts` — contrato sugerido

```ts
/**
 * `_shared/email-config.ts` — contrato canônico de remetente e destinatário (P36 / DELIV-01+03).
 *
 * ZERO imports por design: nenhum `zod`, nenhum `deno.land/std`, nenhum `npm:` —
 * assim as EFs consumidoras (P38) não precisam de `import_map` no config.toml
 * e `deno test` roda sem `--allow-net`.
 *
 * A P37 (ledger) e a P38 (EF notificar-candidato) IMPORTAM daqui. Não reimplementar.
 */

/** Domínio de envio verificado no Resend (DELIV-01). */
export const DOMINIO_ENVIO = 'recruta.beautysmile.com.br' as const
export const REMETENTE_NOME = 'Beauty Smile Recrutamento' as const
export const REMETENTE_EMAIL = `nao-responda@${DOMINIO_ENVIO}` as const
/** Header `from` pronto para a API do Resend. */
export const FROM = `${REMETENTE_NOME} <${REMETENTE_EMAIL}>` as const
/** Caixa REAL do RH, no domínio root (separa envio de recepção). */
export const REPLY_TO = 'recrutamento@beautysmile.com.br' as const

export type ModoNotificacao = 'producao' | 'teste'

/** Os 4 eventos do M7 — usados como `+label` no endereço de teste. */
export type EventoNotificacao =
  | 'candidatura_recebida'
  | 'avaliacao_liberada'
  | 'convite_entrevista'
  | 'decisao_final'

/**
 * Fail-safe: ausente OU inválido ⇒ 'teste'. Espelha a guarda de env malformado
 * de `parseIntEnv()` em ai-client.ts (AI-07): valor ruim cai no default seguro
 * com warn, nunca propaga.
 */
export function resolverModo(bruto = Deno.env.get('NOTIFICACOES_MODO')): ModoNotificacao {
  const v = (bruto ?? '').trim().toLowerCase()
  if (v === 'producao') return 'producao'
  if (v !== '' && v !== 'teste') {
    console.warn(`[email-config] NOTIFICACOES_MODO="${bruto}" inválido → 'teste' (fail-safe)`)
  }
  return 'teste'
}

export interface DestinatarioResolvido {
  /** Endereço que vai efetivamente no campo `to` do Resend. */
  para: string
  /** Endereço REAL do candidato — sempre preservado (ledger P37, auditoria). */
  destinatario_original: string
  modo: ModoNotificacao
  /** true quando o envio foi desviado para o endereço de teste. */
  redirecionado: boolean
}

export function resolverDestinatario(
  emailReal: string,
  evento: EventoNotificacao,
  modo: ModoNotificacao = resolverModo(),
): DestinatarioResolvido {
  if (modo === 'producao') {
    return { para: emailReal, destinatario_original: emailReal, modo, redirecionado: false }
  }
  // `+label` sanitizado: só [a-z_] — um label malformado quebraria o header.
  const label = evento.replace(/[^a-z_]/g, '')
  return {
    para: `delivered+${label}@resend.dev`,
    destinatario_original: emailReal,
    modo,
    redirecionado: true,
  }
}

/** Em `producao` sem chave, falhar EXPLICITAMENTE (não 401 opaco do provedor). */
export function exigirChaveApi(chave: string | undefined, modo: ModoNotificacao): string {
  if (modo === 'producao' && !chave) {
    throw new Error(
      '[email-config] modo=producao sem RESEND_API_KEY — segredo não provisionado ' +
        "(Vault 'resend_api_key'). Envio abortado.",
    )
  }
  return chave ?? ''
}
```

### Suite Deno — casos que a fase precisa cobrir

```ts
// supabase/functions/_shared/__tests__/email-config.test.ts
// Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
//        supabase/functions/_shared/__tests__/email-config.test.ts
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  FROM, REPLY_TO, DOMINIO_ENVIO,
  resolverModo, resolverDestinatario, exigirChaveApi,
} from "../email-config.ts";

// (1) FAIL-SAFE: env ausente ⇒ teste
Deno.test("DELIV-03 — NOTIFICACOES_MODO ausente ⇒ 'teste' (fail-safe)", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.delete("NOTIFICACOES_MODO");
  try { assertEquals(resolverModo(), "teste"); }
  finally { if (original !== undefined) Deno.env.set("NOTIFICACOES_MODO", original); }
});

// (2) FAIL-SAFE: valor inválido (typo 'prod') ⇒ teste, NUNCA producao
Deno.test("DELIV-03 — 'prod' (typo) ⇒ 'teste', nunca 'producao'", () => {
  assertEquals(resolverModo("prod"), "teste");
  assertEquals(resolverModo("PRODUCTION"), "teste");
  assertEquals(resolverModo(""), "teste");
});

// (3) modo teste redireciona e PRESERVA o original
Deno.test("DELIV-03 — modo teste ⇒ delivered+<evento>@resend.dev, original preservado", () => {
  const r = resolverDestinatario("candidato.real@gmail.com", "convite_entrevista", "teste");
  assertEquals(r.para, "delivered+convite_entrevista@resend.dev");
  assertEquals(r.destinatario_original, "candidato.real@gmail.com");
  assert(r.redirecionado);
});

// (4) NENHUM evento em modo teste escapa para fora de @resend.dev  ← a asserção do DELIV-03
Deno.test("DELIV-03 — os 4 eventos em modo teste terminam em @resend.dev", () => {
  for (const ev of ["candidatura_recebida","avaliacao_liberada","convite_entrevista","decisao_final"] as const) {
    const r = resolverDestinatario("alguem@empresa.com", ev, "teste");
    assert(r.para.endsWith("@resend.dev"), `${ev} vazou para ${r.para}`);
  }
});

// (5) producao passa direto
Deno.test("DELIV-01 — modo producao envia ao endereço real, sem redirecionar", () => {
  const r = resolverDestinatario("candidato.real@gmail.com", "decisao_final", "producao");
  assertEquals(r.para, "candidato.real@gmail.com");
  assertEquals(r.redirecionado, false);
});

// (6) producao sem chave ⇒ erro EXPLÍCITO
Deno.test("DELIV-02 — producao sem chave lança erro explícito (não 401 opaco)", () => {
  assertThrows(() => exigirChaveApi(undefined, "producao"), Error, "RESEND_API_KEY");
  assertEquals(exigirChaveApi(undefined, "teste"), "");   // teste tolera ausência
});

// (7) constantes canônicas congeladas (DELIV-01)
Deno.test("DELIV-01 — From/Reply-To/domínio são os valores canônicos do CONTEXT", () => {
  assertEquals(DOMINIO_ENVIO, "recruta.beautysmile.com.br");
  assertEquals(FROM, "Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>");
  assertEquals(REPLY_TO, "recrutamento@beautysmile.com.br");
  assert(!FROM.includes("resend.dev"), "From de produção nunca pode ser onboarding@resend.dev");
});
```

### Provisionamento do segredo (executor / Supabase MCP)

```sql
-- 0) Higiene: existe algo com esse nome?
select id, name, description, created_at from vault.secrets where name = 'resend_api_key';

-- 1) Criar (SOMENTE com a chave PROD real — sem placeholder, decisão do CONTEXT)
select vault.create_secret(
  're_…',
  'resend_api_key',
  'Resend PROD send key — M7/P36 DELIV-02. Consumida por notificar-candidato (P38).'
);

-- 2) Conferir leitura (não imprimir o valor num log compartilhado)
select name, length(decrypted_secret) as len
  from vault.decrypted_secrets where name = 'resend_api_key';
```

### Encadeamento no `package.json` e no CI

```jsonc
// package.json — segurança ANTES de performance: se algo vazou, o número do chunk é irrelevante.
"postbuild": "node scripts/assert-no-secrets.mjs && node scripts/assert-chunks.mjs",
"assert:chunks": "node scripts/assert-chunks.mjs",
"assert:no-secrets": "node scripts/assert-no-secrets.mjs",
```

```yaml
# .github/workflows/ci.yml — job `e2e` (NÃO existe job `build`), junto ao gate PERF-03
      - name: Bundle gate (PERF-03)
        run: node scripts/assert-chunks.mjs
      # DELIV-02: prova que nenhuma chave/endpoint do Resend entrou no bundle público.
      # Self-gates via postbuild acima; este step re-roda para sinal de falha distinto.
      - name: Secret gate (DELIV-02)
        run: node scripts/assert-no-secrets.mjs
```

---

## Runtime State Inventory

*(fase majoritariamente aditiva, mas com estado externo relevante — preenchido explicitamente)*

| Categoria | Itens encontrados | Ação necessária |
|-----------|-------------------|------------------|
| Dados armazenados | **Nenhum** — a P36 não cria/altera tabela de dados. `vault.secrets` ganha 1 linha (`resend_api_key`), o que é config, não dado de domínio. | Provisionar 1 segredo via MCP |
| Config de serviço vivo | **Resend (conta):** domínio `recruta.beautysmile.com.br` a criar; open/click tracking a **desligar**; 2 API keys a gerar (test-mode + prod). **DNS `beautysmile.com.br`:** 3-4 records novos + 1 TXT DMARC — provedor ainda **desconhecido** (item aberto do CONTEXT). Nada disso vive em git. | Runbook + gate humano |
| Estado registrado no SO | **Nenhum** | — Verificado: sem cron/launchd/tarefa envolvida nesta fase. |
| Segredos / env vars | `RESEND_API_KEY` **já existe como EF secret** consumido por `cost-alerter/index.ts:208` (+ `COST_ALERTER_FROM`/`COST_ALERTER_TO`). Novo: `NOTIFICACOES_MODO` (EF env, default seguro se ausente → não precisa ser provisionado). `.env` local ganha a chave test-mode (gitignored). | Verificar se a chave existente é reaproveitada ou substituída; **não** migrar `cost-alerter` nesta fase (Pitfall 9) |
| Artefatos de build | `build/` é git-ignored e regenerado; nenhum artefato instalado fica obsoleto. | — |

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|------------------|------------------|--------------|---------|
| DKIM CNAME com selector fixo | Selector **token** gerado por domínio (SES) — e, em algumas contas, DKIM como **TXT** com chave 1024-bit própria do Resend | Gradual; a doc de Domains e a de API divergem hoje | Runbook **não pode** hardcodar o record DKIM (Q1) |
| Domínio verificado = tudo pronto | `status` granular por record + `partially_verified` / `temporary_failure` | Resend "New Domain Verification Experience" | O script opt-in consegue dizer *qual* record falta |
| `p=quarantine` direto | `p=none` + `rua` primeiro, endurecer com dados | Prática corrente de DMARC | Alinhado com o CONTEXT; **diverge** de `PITFALLS.md:142` que sugeria `p=quarantine` — o CONTEXT (mais recente) vence |
| Segredo em env da EF | Vault + RPC `SECURITY DEFINER` | Padrão Supabase corrente | Custa 1 hop; exige a wrapper function (Q3) |

**Deprecado / desatualizado:**
- `.planning/research/ARCHITECTURE.md:260` recomenda `supabase secrets set RESEND_API_KEY` — **superseded** pela decisão travada do CONTEXT (Vault). Manter `cost-alerter` como está não é regressão; é escopo.
- `.planning/research/STACK.md:177` sugere `mail.beautysmile.com.br` — **superseded** por `recruta.beautysmile.com.br`.
- `.planning/research/PITFALLS.md:142` sugere DMARC `p=quarantine` inicial — **superseded** por `p=none` (CONTEXT).

---

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|-------|-------|------------------|
| A1 | O DKIM entregue para este domínio será o CNAME token-prefixado da SES (e não um TXT `resend._domainkey`) | Q1 | Baixo — o runbook manda copiar o que o dashboard mostrar; a suposição só afeta o exemplo ilustrativo |
| A2 | `delivered@resend.dev` **não** é exceção à restrição 403 de domínio não-verificado | Q4 | Médio — se for exceção, o passo "teste contra seu próprio e-mail primeiro" vira desnecessário (custo: um passo extra no runbook, não um bug) |
| A3 | Chaves Resend seguem `re_<8-12>_<24+>` | Pitfall 4 / guard | Baixo — o segundo padrão (`re_[A-Za-z0-9_]{28,}`) cobre deriva de formato |
| A4 | Não existe ainda nenhum record em `send.recruta.beautysmile.com.br` nem `_dmarc.recruta.…` | Pitfall/SPF | Baixo — o runbook manda conferir com `dig` antes de criar |
| A5 | O `RESEND_API_KEY` já provisionado como EF secret (consumido por `cost-alerter`) existe de fato em PROD | Pitfall 9 | Médio — se não existe, os alertas de custo estão silenciosamente sem e-mail desde a P23; a P36 é a fase certa para descobrir |
| A6 | Free tier ≈ 3.000/mês, 100/dia | Q4 | Baixo nesta fase (só smokes); relevante na P41 |
| A7 | `beautysmile.app` (From do `cost-alerter`) não é um domínio verificado no Resend | Pitfall 9 | Médio — se não for, é um bug latente pré-existente, não introduzido aqui |

---

## Open Questions (RESOLVED)

> Q1–Q4 foram decididas em 2026-07-22 e registradas no `36-CONTEXT.md` § "Correções e Decisões Pós-Research". Q5 é a única em aberto e é legitimamente de tempo-de-execução (ação humana), não bloqueando planejamento nem execução dos trilhos de código.

1. **A RPC leitora do Vault (`public.ler_resend_api_key()`) entra na P36 ou na P38?**
   - Sabemos: o schema `vault` não é exposto ao PostgREST; a EF não lê `decrypted_secrets` sem wrapper.
   - Não está claro: o CONTEXT delimita a P36 a "provisionar o segredo", sem mencionar o leitor.
   - Recomendação: **landar na P36** como migration file-only. Sem ela, DELIV-02 é formalmente satisfeito mas operacionalmente incompleto, e a P38 descobre tarde.
   - **RESOLVED (2026-07-22): P36.** Implementado no Plano 36-04 (`20260722000001_p36_vault_resend_reader.sql`), função sem argumento, `SECURITY DEFINER`, `GRANT EXECUTE` só a `service_role`.

2. **Nome do segredo no Vault: `resend_api_key` ou `RESEND_API_KEY`?**
   - Sabemos: os 3 segredos existentes são snake_case minúsculo.
   - Recomendação: `resend_api_key`. Registrar literalmente no runbook — a P38 lê pelo mesmo nome.
   - **RESOLVED (2026-07-22): `resend_api_key`.** Usado consistentemente nos Planos 36-04 e 36-05 e no runbook.

3. **Região do Resend: `us-east-1` (default) ou `sa-east-1` (São Paulo)?**
   - Sabemos: muda o hostname do MX; trocar depois exige re-verificar; irrelevante para latência.
   - Não está claro: se há preferência LGPD por manter o hop em território nacional.
   - Recomendação: decidir **antes** de criar o domínio (é uma decisão de 1 clique agora e uma re-verificação depois). Default `us-east-1` é aceitável; registrar a escolha.
   - **RESOLVED (2026-07-22): `sa-east-1` (São Paulo)**, escolhido pelo Fernando — candidatos e RH são todos no Brasil; processamento em território nacional é a melhor postura sob LGPD. O runbook (Plano 36-03) destaca que trocar exige re-verificar o domínio.

4. **O `RESEND_API_KEY` já provisionado (consumido pelo `cost-alerter`) é reaproveitado como chave prod ou gera-se uma nova?**
   - Recomendação: **nova chave prod dedicada** ao pipeline de candidatos (blast radius menor; revogar uma não derruba a outra), mantendo a do `cost-alerter` intacta. Documentar as três chaves no runbook: dev/test-mode, prod-notificações, cost-alerter (legada).
   - **RESOLVED (2026-07-22): nova chave dedicada**, escolhido pelo Fernando. O `cost-alerter` fica intocado; a divergência (uma chave Resend ainda em env secret) e o bug latente do TLD `.app` viram débito registrado (Plano 36-04, Task 3).

5. **Onde está hospedado o DNS de `beautysmile.com.br`?** (item aberto herdado do CONTEXT) — bloqueia a *execução* do gate humano, não o planejamento. O runbook sai com seções "Cloudflare" e "genérico (Registro.br/outro)".
   - **EM ABERTO — legítimo, não-bloqueante.** É informação de tempo-de-execução que só o Fernando tem; o runbook é provider-agnóstico exatamente para não depender dela. Fecha junto com o HUMAN-UAT do DELIV-01.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|-----------|--------|----------|
| Node.js | `assert-no-secrets.mjs`, `check-resend-dominio.mjs` | ✓ | v24.10.0 local / 20 no CI | — |
| npm | scripts / build | ✓ | 11.6.0 | — |
| Deno | suite `email-config.test.ts` | ✓ | 2.7.7 (CI: `v2.x`) | — |
| Supabase CLI | `functions serve` local | ✓ | 2.105.0 | Supabase MCP para PROD |
| Supabase MCP (`apply_migration` / `execute_sql`) | `vault.create_secret` + migration da RPC | ✓ (servidor MCP configurado) | — | SQL Editor manual + `migration repair` (CLAUDE.md) |
| `dig` / `nslookup` | conferência de propagação no runbook | ✓ | ambos no PATH | web (dnschecker.org) |
| **Chave Resend PROD** | `vault.create_secret`, smoke real | ✗ | — | **Nenhum** — gate humano; runbook grava o comando exato e a P38 cobra |
| **Acesso ao DNS de `beautysmile.com.br`** | criar os records | ✗ (provedor desconhecido) | — | **Nenhum** — gate humano |
| **Conta Resend (dashboard)** | Add Domain, gerar chaves, desligar tracking | ✗ (não verificável daqui) | — | **Nenhum** — gate humano |
| `slopcheck` / `ctx7` | auditoria de pacote | ✗ | — | N/A — zero pacotes novos nesta fase |

**Dependências ausentes SEM fallback (todas são o gate humano do DELIV-01/02):** chave Resend PROD, acesso ao DNS, acesso ao dashboard Resend. **Elas não bloqueiam a fase** — o CONTEXT já decidiu que DELIV-01 fecha como HUMAN-UAT pendente e que a cadeia 37→38→39 não espera. Os trilhos B (guard) e C (`email-config`) são 100% executáveis hoje.

**Dependências ausentes COM fallback:** nenhuma.

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework (frontend) | Vitest 4.1.9 — `vite.config.ts` `test` block, env `happy-dom` |
| Framework (Edge Functions) | `deno test` (Deno 2.7.7) + `deno.land/std@0.224.0/assert` |
| Config file | `vite.config.ts` (Vitest) · `supabase/functions/deno.json` (Deno import map + exclude) |
| Comando rápido | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared/__tests__/email-config.test.ts` · `node scripts/assert-no-secrets.mjs` |
| Comando suíte completa | `npm run test:run` · `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` · `npm run build` (dispara ambos os gates via `postbuild`) |
| Gates de build | `postbuild` → `assert-no-secrets` **&&** `assert-chunks` |

### Phase Requirements → Test Map

| Req | Comportamento | Tipo | Comando automatizado | Existe? |
|-----|---------------|------|----------------------|---------|
| DELIV-01 | Constantes canônicas From/Reply-To/domínio congeladas; From nunca é `resend.dev` | unit (Deno) | `deno test … email-config.test.ts` (caso 7) | ❌ Wave 0 |
| DELIV-01 | Domínio existe na conta Resend e cada record está `verified` | script opt-in | `node scripts/check-resend-dominio.mjs` (**não** no CI) | ❌ Wave 0 |
| DELIV-01 | DMARC publicado | manual + `dig` | `dig +short TXT _dmarc.recruta.beautysmile.com.br` → contém `v=DMARC1; p=none` | ❌ runbook |
| DELIV-01 | **E-mail real cai na INBOX, não no spam** | **HUMAN-UAT** | irredutível — checklist abaixo | ❌ HUMAN-UAT |
| DELIV-02 | Nenhuma chave/endpoint Resend no bundle público | build gate | `npm run build` (postbuild) **e** `node scripts/assert-no-secrets.mjs` | ❌ Wave 0 |
| DELIV-02 | O gate é real, não no-op | meta-teste | rodar o guard contra um `build/` com um `re_…` sintético plantado ⇒ **exit 1** | ❌ Wave 0 |
| DELIV-02 | Segredo existe no Vault e é legível pela RPC | smoke SQL | `select name, length(decrypted_secret) from vault.decrypted_secrets where name='resend_api_key';` → 1 linha, len > 20 | ❌ (depende da chave real) |
| DELIV-03 | Env ausente/inválido ⇒ modo `teste` | unit (Deno) | casos 1-2 | ❌ Wave 0 |
| DELIV-03 | Modo teste redireciona p/ `@resend.dev` preservando o original | unit (Deno) | casos 3-4 | ❌ Wave 0 |
| DELIV-03 | Modo produção sem chave ⇒ erro explícito | unit (Deno) | caso 6 | ❌ Wave 0 |
| DELIV-03 | CI não precisa de chave viva | CI (observável) | job `deno-test` verde sem nenhum secret Resend configurado | ✅ (já é o estado atual) |
| DELIV-03 | O teste novo não quebra o Vitest | CI | `npm run test:run` verde após adicionar `test.exclude` | ✅ infra, ❌ a linha |

### Validação de cada Success Criterion do ROADMAP

**SC1 (DELIV-01) — parcialmente automatizável.**
- Automatizado: `node scripts/check-resend-dominio.mjs` → domínio presente, `status: "verified"`, todos os `records[].status` OK, `click_tracking:false` + `open_tracking:false`.
- Automatizado: `dig +short TXT _dmarc.recruta.beautysmile.com.br` retorna o valor canônico.
- Automatizado: `deno test … email-config.test.ts` prova que From/Reply-To estão congelados no código.
- **HUMAN-UAT (irredutível — "cai na inbox" não é observável por API):**
  1. Domínio `recruta.beautysmile.com.br` mostra **Verified** no dashboard Resend.
  2. Open tracking e click tracking **desligados** nesse domínio.
  3. `dig` confirma os 3-4 records + o TXT `_dmarc`.
  4. Enviar 1 e-mail de teste **de** `nao-responda@recruta.beautysmile.com.br` **para** uma conta **Gmail** e uma **Outlook/Hotmail** pessoais.
  5. Em ambas: a mensagem está na **Caixa de entrada**, não em Spam/Promoções-com-aviso.
  6. No Gmail: "Mostrar original" → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
  7. O remetente exibido é **"Beauty Smile Recrutamento"**.
  8. Responder o e-mail → a resposta chega em `recrutamento@beautysmile.com.br`.
  9. Registrar data + prints no `36-HUMAN-UAT.md` (padrão P22-P35).

**SC2 (DELIV-02) — totalmente automatizável.**
```bash
npm run build                       # postbuild roda assert-no-secrets && assert-chunks
node scripts/assert-no-secrets.mjs  # exit 0 + "N files scanned"
grep -rn "RESEND\|api\.resend\.com" build/ ; echo "exit=$?"   # exit 1 = nenhum match (cross-check independente)
```
Mais o **meta-teste** que prova que o gate não é no-op: plantar `re_TESTFAKE_000000000000000000EXAMPLE` num arquivo temporário dentro de `build/`, rodar o guard, exigir **exit 1**, remover. Sem esse passo o SC2 é indistinguível de um script que sempre passa (a lição literal do docblock do `assert-chunks.mjs:12-13`).
Mais o smoke SQL do Vault (quando a chave existir).

**SC3 (DELIV-03) — totalmente automatizável.**
```bash
deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions
npm run test:run     # prova que o teste Deno novo não quebrou o Vitest
```
Mais uma asserção de ambiente: `grep -rn "RESEND" .github/workflows/ci.yml` deve retornar **zero** — o CI não referencia nenhum secret Resend.

### Sampling Rate

- **Por commit de tarefa:** `node scripts/assert-no-secrets.mjs` (após um `npm run build`) · `deno test … email-config.test.ts`
- **Por merge de wave:** `npm run build` (ambos os gates) · `deno test … supabase/functions` · `npm run test:run`
- **Phase gate:** suíte completa verde + meta-teste do guard + `36-HUMAN-UAT.md` criado com o checklist SC1 pendente e explicitamente marcado como tal antes do `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `supabase/functions/_shared/__tests__/email-config.test.ts` — cobre DELIV-01 (constantes) + DELIV-03 (modo/destinatário/chave)
- [ ] `vite.config.ts` → 1 entrada em `test.exclude` para o arquivo acima (**mesma tarefa**, não separada — Pitfall 8)
- [ ] `scripts/assert-no-secrets.mjs` — cobre DELIV-02
- [ ] Meta-teste do guard (plantar/remover secret sintético) — prova que DELIV-02 não é no-op
- [ ] `scripts/check-resend-dominio.mjs` — automatiza a parte checável do DELIV-01
- [ ] `docs/runbooks/resend-dominio-envio.md` — novo diretório + runbook
- [ ] Instalação de framework: **nenhuma** — Vitest e Deno já instalados e já rodando no CI

---

## Security Domain

### ASVS Categories aplicáveis

| Categoria ASVS | Aplica | Controle padrão nesta fase |
|----------------|--------|-----------------------------|
| V2 Authentication | não | Nenhum fluxo de autenticação de usuário é tocado |
| V3 Session Management | não | — |
| V4 Access Control | **sim** | `GRANT EXECUTE … TO service_role` + `REVOKE` de `public`/`anon`/`authenticated` na RPC leitora do Vault; `SECURITY DEFINER` + `SET search_path = ''` (idioma já padrão no repo) |
| V5 Input Validation | **sim** | Sanitização do `+label` em `resolverDestinatario` (só `[a-z_]`); normalização defensiva de `NOTIFICACOES_MODO` (qualquer valor não reconhecido ⇒ `teste`) |
| V6 Cryptography | **sim** | **Nunca** cifrar a chave à mão — `vault.create_secret` (chave de cifra fora do banco). DKIM gerado pelo provedor. |
| V7 Error Handling & Logging | **sim** | O guard **não** loga o segredo casado (mascarar); o script opt-in **não** loga a API key; `exigirChaveApi` produz erro explícito sem revelar valor |
| V14 Configuration | **sim** | Segredo fora do bundle (asserção mecânica), default fail-safe, duas chaves com blast radius separado |

### Known Threat Patterns

| Padrão | STRIDE | Mitigação padrão |
|--------|--------|------------------|
| Chave de provedor inlinada no bundle público via `VITE_` | Information Disclosure | Segredo só no Vault + `assert-no-secrets.mjs` como prova mecânica, não como convenção |
| Segredo vazado no log de CI pela própria mensagem do guard | Information Disclosure | Match mascarado (arquivo+offset+4 chars) |
| Spoofing de remetente Beauty Smile (phishing a candidatos) | Spoofing | SPF + DKIM + DMARC alinhados; `p=none` é monitoramento, o endurecimento é deferido mas o `rua` já dá visibilidade |
| Envio acidental a candidato real a partir de dev/CI | Tampering / Repudiation (reputacional) | Default `teste` + redirecionamento forçado a `@resend.dev` + CI sem chave viva |
| RPC leitora de Vault com escopo largo (`ler_segredo(text)`) | Elevation of Privilege | Função **sem argumento**, escopada a um único segredo |
| Chave única compartilhada entre dev, alertas e produção | Elevation of Privilege | Três chaves separadas; revogar uma não derruba as outras |
| Script opt-in acidentalmente promovido a step de CI (exigindo chave nos GitHub Secrets) | Information Disclosure | Docblock explícito "NEVER in CI" + no-op silencioso sem chave + zero referências a `RESEND` no `ci.yml` (asserção do SC3) |

---

## Project Constraints (from CLAUDE.md)

| Diretiva | Impacto nesta fase |
|----------|--------------------|
| Domínio em pt-BR, código técnico em en | `email-config.ts` usa nomes pt-BR (`resolverDestinatario`, `EventoNotificacao`, `producao`/`teste`); os scripts `.mjs` seguem o inglês de `assert-chunks.mjs` |
| **NUNCA** `supabaseAdmin`/service_role no client-side | Nenhum código desta fase toca `src/` (só `vite.config.ts` test-exclude). O guard **prova** essa propriedade para o segredo Resend |
| Operações privilegiadas em Edge Functions | Leitura do Vault via RPC restrita a `service_role`, chamada de dentro da EF (P38) |
| Enums/nomes DB em snake_case pt-BR | Segredo Vault: `resend_api_key`; função: `public.ler_resend_api_key()` |
| `database.types.ts` nunca editado à mão | Não aplicável — nenhuma tabela nova |
| Migrations com `$$` → 42601 via `db push` | A migration da RPC leitora usa `apply_migration` (MCP), sem `BEGIN;/COMMIT;`, com reconcile do ledger |
| `npm run lint` = `tsc --noEmit`, baseline congelado em **104** | `.mjs` não é type-checked (`allowJs` desligado, `tsconfig.json` inclui `scripts` mas só `.ts`) → **0 crescimento**. `email-config.ts` está sob `supabase/functions/`, fora do `include` do tsconfig → também 0. Confirmar com `npm run -s lint 2>&1 \| grep -c "error TS"` ≤ 104 |
| Linguagem de produto: "avaliação comportamental/cognitiva" | Aplica-se aos templates (P38), não aqui — mas o `evento` `avaliacao_liberada` já respeita |

---

## Sources

### Primary (HIGH confidence)
- **Repo, lido diretamente:** `scripts/assert-chunks.mjs` (contrato completo do gate) · `package.json:95-113` · `.github/workflows/ci.yml:38-138` (jobs reais; step PERF-03 em `e2e:111`) · `vite.config.ts:9-48,121-144` (Vitest include/exclude, `outDir:'build'`, manualChunks) · `tsconfig.json` (include `scripts`, sem `allowJs`) · `supabase/functions/deno.json` · `supabase/functions/_shared/constants.ts` · `supabase/functions/_shared/ai-client.ts` (`deps`, `parseIntEnv`) · `supabase/functions/_shared/__tests__/{ai-client,cost-alerter-messages}.test.ts` (DI + `Deno.env.set/delete`) · `supabase/functions/submit-candidatura/index.test.ts:145-185` (stub de `globalThis.fetch`) · `supabase/functions/cost-alerter/index.ts:204-222` (**consumidor Resend pré-existente**) · `supabase/migrations/20260610000003_reprocessar_rpc.sql:63-72` · `supabase/migrations/20260706110005_sec03_n8n_serverside.sql:52-99` · `supabase/migrations/20260609000002_prompt_library_rpcs.sql:28-29` (`vault.create_secret`) · `supabase/config.toml:1-40` · `src/components/pages/CriarEditarVagaPage.tsx:565` · `src/components/ErrorBoundary.tsx:202` — **HIGH**
- **Docs oficiais Resend (WebFetch):** `/docs/api-reference/domains/create-domain` (records[] com valores reais, regiões, `custom_return_path`) · `/docs/api-reference/domains/get-domain` (shape completo + `records[].status`) · `/docs/api-reference/domains/list-domains` (curl + JSON) · `/docs/api-reference/domains/verify-domain` · `/docs/dashboard/domains/introduction` (enum de status) · `/docs/dashboard/domains/dmarc` · `/docs/dashboard/domains/cloudflare` (proxy DNS-only, sufixo, prioridade MX) · `/docs/dashboard/emails/send-test-emails` (`+label`, cota) · `/docs/knowledge-base/403-error-resend-dev-domain` (mensagem literal) — **HIGH**
- **Docs oficiais Supabase (WebFetch):** `supabase.com/docs/guides/database/vault` + `raw.githubusercontent.com/supabase/supabase/master/apps/docs/content/guides/database/vault.mdx` (`create_secret`/`update_secret`/`decrypted_secrets`) — **HIGH**
- **Planning interno:** `.planning/phases/36-deliverability-sender-identity/36-CONTEXT.md` · `.planning/REQUIREMENTS.md:15-19` · `.planning/ROADMAP.md:53-63` · `.planning/STATE.md` · `.planning/research/{STACK,PITFALLS,ARCHITECTURE}.md` — **HIGH** (contexto de projeto, não fato externo)

### Secondary (MEDIUM confidence)
- `makerkit.dev/blog/tutorials/supabase-vault` — SQL do `SECURITY DEFINER` + GRANTs para `service_role`; corroborado pela doc oficial ("protect access to this view with the appropriate SQL privilege settings") e por discussões supabase — **MEDIUM→HIGH por corroboração**
- WebSearch (Brave/built-in) sobre a restrição 403 do `onboarding@resend.dev` — múltiplas fontes convergentes apontando para a mesma KB oficial — **MEDIUM**
- Formato de chave `re_<8-12>_<24+>` — forma observada em doc/ferramenta de terceiros, coerente com o `re_xxxxxxxxx` da doc oficial. A fixture do meta-teste é sintética e tem essa forma: `re_TESTFAKE_000000000000000000EXAMPLE` — **MEDIUM**

### Tertiary (LOW confidence — sinalizado para validação)
- Free tier 3.000/mês, 100/dia (herdado de `STACK.md:161`, preços derivam) — irrelevante nesta fase, relevante na P41
- A afirmação de que `delivered@resend.dev` **não** é exceção ao 403 é uma leitura de *ausência* na doc, não uma negativa afirmada. Tratada como A2 no Assumptions Log; a mitigação (testar contra o próprio e-mail antes de verificar o domínio) custa um passo e elimina o risco

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — delta de dependências é zero; todas as ferramentas verificadas por execução local (`node`/`npm`/`deno`/`supabase --version`)
- **Contrato do guard de bundle:** HIGH — `assert-chunks.mjs` lido integralmente; `outDir`, `postbuild` e o step de CI verificados linha a linha (com **duas correções materiais ao CONTEXT**: não existe job `build`; `build/assets/*` é subconjunto do que convém varrer)
- **Vault (sintaxe + precedente):** HIGH — doc oficial + 3 migrations do próprio repo com `arquivo:linha`
- **Vault (caminho de leitura da EF):** MEDIUM-HIGH — a necessidade da RPC `SECURITY DEFINER` é convergente entre doc oficial, tutorial e discussões, mas **não há precedente no repo** de EF lendo Vault (as leituras atuais são todas de dentro do Postgres). Marcado como Open Question 1
- **DNS / Resend domains API:** HIGH nos endpoints e no enum de status; **MEDIUM no shape do record DKIM** (doc de API e doc de dashboard divergem) — mitigado por um runbook que manda copiar do dashboard
- **Endereços de teste:** HIGH em comportamento e `+label`; **MEDIUM** na interação com a restrição 403 pré-verificação (A2)
- **Padrão de teste Deno:** HIGH — três padrões distintos localizados com `arquivo:linha`; a armadilha do Vitest está documentada no próprio `vite.config.ts`
- **Pitfalls:** HIGH — 6 dos 9 vêm de leitura direta do repo (incluindo o consumidor Resend pré-existente e a colisão do glob do Vitest, nenhum dos dois no CONTEXT)

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 dias) — exceto o shape dos records DNS do Resend, que convém reconfirmar via `GET /domains/:id` **no momento da execução** do gate humano (é a única fonte de verdade que não fica stale)
</content>
</invoke>
