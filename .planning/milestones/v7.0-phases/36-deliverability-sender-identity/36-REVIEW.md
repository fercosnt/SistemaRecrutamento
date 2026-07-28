---
phase: 36-deliverability-sender-identity
reviewed: 2026-07-22T18:40:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - supabase/functions/_shared/email-config.ts
  - supabase/functions/_shared/__tests__/email-config.test.ts
  - scripts/assert-no-secrets.mjs
  - scripts/check-resend-dominio.mjs
  - supabase/migrations/20260722000001_p36_vault_resend_reader.sql
  - .github/workflows/ci.yml
  - package.json
  - vite.config.ts
  - docs/runbooks/resend-dominio-envio.md
  - .planning/todos/pending/36-resend-chave-divergencia.md
  - .planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md
findings:
  critical: 0
  warning: 4
  info: 10
  total: 14
status: warnings_resolved
fixed_at: 2026-07-22T15:52:00Z
fixed:
  warning: 4
  info: 0
  other: 1
resolved:
  - id: WR-01
    commit: 8e5d4a2
    summary: "suíte Deno passa a provar o fail-safe do DELIV-03 — as 2 mutações fail-open foram mortas"
  - id: WR-03
    commit: f9ae8b5
    summary: "o dig de DKIM do runbook não monta mais FQDN duplicado"
  - id: WR-04
    commit: 1606d5b
    summary: "campo de tracking ausente deixou de ser violação no checker"
  - id: WR-02
    commit: 09f9bf9
    summary: "NOTIFICACOES_MODO documentado no runbook (§ 1, § 7 e § 9 novo) + UAT-36-3"
  - id: LITERAL-CHAVE
    commit: 0d22384
    summary: "literal antigo (exemplo público da doc do Resend) → re_TESTFAKE_000000000000000000EXAMPLE nos 4 arquivos; 4 provas do meta-teste re-executadas"
open:
  - "IN-01 … IN-10 — os 10 Info, deliberadamente aceitos como estão (fora do escopo deste fix)"
  - "IN-11 — nota, não defeito; nunca foi contabilizado em findings.info"
gates_after_fix:
  deno: "216 passed / 0 failed (era 214)"
  vitest: "126 files / 1018 tests passed (inalterado)"
  build: "exit 0 — postbuild: assert-no-secrets PASSED + assert-chunks PASSED"
  lint: "97 erros TS — baseline PRÉ-EXISTENTE inalterado (teto CI 104)"
---

# Phase 36: Code Review Report

**Reviewed:** 2026-07-22T18:40:00Z
**Depth:** standard (com execução empírica dos gates e mutation-testing da suíte Deno)
**Files Reviewed:** 11
**Status original:** issues_found (0 Critical / 4 Warning / 10 Info)
**Status atual:** warnings_resolved — os 4 Warning + o literal com forma de chave real foram corrigidos em 2026-07-22

---

## ✅ Correções aplicadas (2026-07-22)

Os achados abaixo permanecem no corpo deste documento **na íntegra e sem edição** — o histórico do review não é apagado. Cada um ganhou um bloco `RESOLVIDO` no fim da seção, com o commit e a prova.

| Achado | Status | Commit | O que mudou |
|--------|--------|--------|-------------|
| **WR-01** | ✅ resolvido | `8e5d4a2` | 2 casos novos na suíte Deno; **as duas mutações fail-open foram re-executadas e agora falham** |
| **WR-02** | ✅ resolvido | `09f9bf9` | `NOTIFICACOES_MODO` no runbook (§ 1, § 7 e o novo § 9 "Passo 8") + `UAT-36-3` no HUMAN-UAT |
| **WR-03** | ✅ resolvido | `f9ae8b5` | regra de montagem de FQDN com a invariante "`recruta` exatamente uma vez"; `recruta.recruta` virou sinal de erro próprio |
| **WR-04** | ✅ resolvido | `1606d5b` | campo ausente ≠ violação; só `true` explícito reprova; fallback `?? match?.[flag]` acrescentado |
| **Literal com forma de chave real** (§ "Achados já conhecidos", item 1) | ✅ resolvido | `0d22384` | `re_TESTFAKE_000000000000000000EXAMPLE` nos 4 arquivos; as 4 provas do meta-teste re-executadas |
| **IN-01 … IN-10** | ⏸️ abertos por decisão | — | os 10 Info ficam como estão; fora do escopo deste fix |
| **IN-11** | ℹ️ nota, não defeito | — | nunca foi contabilizado como achado |

**Gates depois do fix (todos verdes):**

| Gate | Resultado |
|------|-----------|
| `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` | **216 passed / 0 failed** (era 214) |
| `npm run test:run` | **126 files / 1018 tests passed** (inalterado) |
| `npm run build` (postbuild = `assert-no-secrets` + `assert-chunks`) | **exit 0**, ambos PASSED |
| `npm run lint \| grep -c "error TS"` | **97** antes e depois — baseline PRÉ-EXISTENTE, nenhum erro cita os arquivos tocados (teto CI 104) |

Valores canônicos **não** foram alterados em nenhum commit: `recruta.beautysmile.com.br`, `sa-east-1`, `Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>`, `recrutamento@beautysmile.com.br`, `_dmarc.recruta.beautysmile.com.br`, `resend_api_key`. Zero dependências npm novas. `supabase/functions/cost-alerter/index.ts` e a migration já aplicada em PROD ficaram intocados.

---

## Summary

A fase entrega o que promete no eixo mais importante: **o guard de bundle não é teatro**. Verifiquei empiricamente (não por leitura) que `scripts/assert-no-secrets.mjs`:

- varre `build/` inteiro, **incluindo `index.html`** (inventário real: 41 `.js` + 1 `.css` + 1 `.html` = 43 arquivos);
- sai **1** com uma chave plantada em `build/__meta_test_secret.js`, sai **1** com o literal `RESEND_API_KEY` num `.txt`, sai **0** num build limpo;
- **mascara** o match (`starts "re_c..."`) — a chave não vai para o stdout do CI;
- falha duro com `build/` ausente e com `0 arquivos varridos` (não existe caminho de exit 0 sem varredura);
- o `\b` inicial dos regexes é real e testado: `measure_something_really_long_name` **não** casa (o falso-positivo que mataria o gate no primeiro build honesto está prevenido).

Os valores canônicos batem **exatamente** entre `email-config.ts`, o runbook, `check-resend-dominio.mjs`, a migration e o HUMAN-UAT (`recruta.beautysmile.com.br`, `sa-east-1`, `Beauty Smile Recrutamento <nao-responda@…>`, `recrutamento@beautysmile.com.br`, `_dmarc.recruta.…`, segredo `resend_api_key`). O CI não contém nenhuma ocorrência de `RESEND` (`grep -c` = 0) e nenhum `.env*` local declara variável Resend — DELIV-03 "CI sem chave viva" confere. A suíte Deno roda verde (7/7) e o `test.exclude` do Vitest foi adicionado na mesma leva.

Nenhum achado **Critical** sobreviveu à verificação: não encontrei caminho em que a chave vaze (nem no guard, nem no reporter, nem na RPC) nem em que um destinatário real escape em modo `teste`.

O que **não** está sólido são quatro coisas, todas verificáveis:

1. A suíte Deno **passa 7/7 mesmo com o fail-safe do DELIV-03 invertido** — provado por mutação.
2. O artefato durável que o operador vai seguir (runbook + HUMAN-UAT) **nunca menciona `NOTIFICACOES_MODO`**, que é literalmente a chave que decide se o candidato recebe e-mail.
3. O `dig` de DKIM do runbook induz a montar um FQDN duplicado no cenário mais provável.
4. O reporter trata campo **ausente** de tracking como violação, virando falha dura num domínio bem configurado.

---

## Critical Issues

Nenhum. Os três vetores de credencial (bundle, stdout de script, mensagem de erro SQL) foram testados e estão fechados.

---

## Warnings

### WR-01: A suíte Deno continua verde com o fail-safe do DELIV-03 invertido (mutation-proof) — ✅ RESOLVIDO

**File:** `supabase/functions/_shared/__tests__/email-config.test.ts:44-71` (e a ausência de um caso para `resolverModo` no caminho positivo)
**Severidade:** Warning
**Issue:**
Os casos 3, 4 e 5 passam `modo` **explicitamente** como terceiro argumento; os casos 1 e 2 chamam `resolverModo` direto. Consequência: **nenhum teste exercita o binding real do default** `modo: ModoNotificacao = resolverModo()` (`email-config.ts:96`) — que é exatamente a forma como a P38 vai chamar a função (`resolverDestinatario(email, evento)`, sem o terceiro argumento).

Provei isso por mutação, não por leitura. Duas mutações fail-open mantiveram **7 passed / 0 failed**:

```
# Mutação A — o fail-safe vira fail-OPEN
-  modo: ModoNotificacao = resolverModo(),
+  modo: ModoNotificacao = 'producao',
→ ok | 7 passed | 0 failed

# Mutação B — typo no nome da env: 'producao' nunca ativa
-  export function resolverModo(bruto = Deno.env.get('NOTIFICACOES_MODO'))
+  export function resolverModo(bruto = Deno.env.get('NOTIFICACOES_MODE'))
→ ok | 7 passed | 0 failed
```

Cenário de falha concreto: na P38 alguém refatora a assinatura de `resolverDestinatario` (ou renomeia a env num `supabase secrets set`), o CI fica verde, e a primeira evidência do defeito é um e-mail real chegando num candidato a partir de staging (mutação A) ou um milestone inteiro de notificações que nunca sai do sandbox (mutação B). O DELIV-03 se declara "provado por teste automatizado" (`36-01-SUMMARY.md:9`) — hoje ele não está.

**Fix:** dois casos, ambos com save/restore em `finally` (o padrão que o arquivo já usa no caso 1):

```ts
// (8) o caminho POSITIVO da env — hoje inexistente
Deno.test("DELIV-03 — NOTIFICACOES_MODO='producao' ⇒ 'producao' (env é lida de verdade)", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.set("NOTIFICACOES_MODO", "  PRODUCAO  "); // trim + lowercase
  try {
    assertEquals(resolverModo(), "producao");
  } finally {
    if (original === undefined) Deno.env.delete("NOTIFICACOES_MODO");
    else Deno.env.set("NOTIFICACOES_MODO", original);
  }
});

// (9) o DEFAULT de resolverDestinatario — a chamada real da P38, sem 3º argumento
Deno.test("DELIV-03 — resolverDestinatario sem modo explícito herda o fail-safe da env", () => {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.delete("NOTIFICACOES_MODO");
  try {
    const r = resolverDestinatario("candidato.real@gmail.com", "decisao_final");
    assertEquals(r.para, "delivered+decisao_final@resend.dev");
    assert(r.redirecionado, "sem env explícita o default NÃO pode ser producao");
  } finally {
    if (original !== undefined) Deno.env.set("NOTIFICACOES_MODO", original);
  }
});
```

Confirmei que o caso (9) mata a mutação A e o caso (8) mata a mutação B.

> ### ✅ RESOLVIDO — commit `8e5d4a2`
>
> Os casos (8) e (9) foram adicionados a `supabase/functions/_shared/__tests__/email-config.test.ts`, com um comentário de bloco acima deles explicando por que **não** podem ser reescritos com `modo` explícito.
>
> **As duas mutações foram re-aplicadas ao source e re-executadas** (não inferido — rodado):
>
> | Cenário | Resultado | Morto por |
> |---|---|---|
> | baseline sem mutação | `ok \| 9 passed \| 0 failed` (exit 0) | — |
> | **Mutação A** — `modo: ModoNotificacao = resolverModo()` → `= 'producao'` | `FAILED \| 8 passed \| 1 failed` (**exit 1**) | caso (9) |
> | **Mutação B** — `Deno.env.get('NOTIFICACOES_MODO')` → `('NOTIFICACOES_MODE')` | `FAILED \| 8 passed \| 1 failed` (**exit 1**) | caso (8) |
>
> Ambas as mutações foram revertidas; `git diff` do commit toca **apenas** o arquivo de teste. Cada mutação é morta por um caso diferente (A sobrevive ao caso 8, B sobrevive ao caso 9), então os dois casos são necessários.
>
> Suíte completa: **216 passed / 0 failed** (era 214).

---

### WR-02: `NOTIFICACOES_MODO=producao` não existe em nenhum artefato durável — PROD sairia com 100% dos e-mails silenciosamente desviados — ✅ RESOLVIDO

**File:** `docs/runbooks/resend-dominio-envio.md:159-191` (§ 7, "as três chaves e onde cada uma vive") e `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md:37-81` (UAT-36-2)
**Severidade:** Warning
**Issue:**
`grep -rn "NOTIFICACOES_MODO"` no repo retorna **zero ocorrências** em `docs/` e **zero** no `36-HUMAN-UAT.md`. A única menção fora do código está em `36-01-SUMMARY.md:128` — um artefato de `.planning/phases/`, ou seja, precisamente o tipo de arquivo que o próprio 36-CONTEXT.md (linha 54) justifica **não** usar como lar de procedimento operacional ("não somem no cleanup do milestone, ao contrário de `.planning/phases/…`").

Cenário de falha concreto, seguindo o runbook à risca:
1. Operador executa Passos 1-7 → domínio `verified`, DMARC publicado, `resend_api_key` no Vault, `ler_resend_api_key()` retorna a chave.
2. P38 deploya `notificar-candidato`. `NOTIFICACOES_MODO` nunca foi provisionado como EF secret.
3. `resolverModo()` → `'teste'` (correto, por design). **Sem warn** — `resolverModo` só emite `console.warn` quando o valor é fornecido e malformado (`email-config.ts:64`); ausente é silencioso.
4. Todo e-mail de candidato vai para `delivered+<evento>@resend.dev`, o Resend responde **200**, o ledger da P37 grava sucesso, e nenhum candidato recebe nada. O único sinal é a coluna `redirecionado`, que ninguém está olhando.

O fail-safe está certo; o que falta é o passo que o desarma deliberadamente estar no mesmo documento que o operador tem na mão.

**Fix:** um passo novo no runbook (e o item correspondente no HUMAN-UAT / cobrado pela P38):

```markdown
## 10. Passo 8 — Armar o modo produção (OBRIGATÓRIO antes do 1º envio real)

O `_shared/email-config.ts` é fail-safe: sem `NOTIFICACOES_MODO=producao` **explícito**,
TODO e-mail é desviado para `delivered+<evento>@resend.dev` — com HTTP 200, sem erro e
sem warn. Domínio verificado + chave no Vault NÃO bastam.

    npx supabase secrets set NOTIFICACOES_MODO=producao --project-ref <ref>
    npx supabase secrets list --project-ref <ref>   # confirmar presença

Só depois disso o primeiro envio real acontece. Para reverter a produção ao sandbox,
basta remover ou trocar o secret (qualquer valor != 'producao' cai em 'teste').
```

E acrescentar à tabela de § 7 uma quarta linha: `NOTIFICACOES_MODO` | EF secret (não Vault — não é segredo, é chave de operação) | arma o envio real.

> ### ✅ RESOLVIDO — commit `09f9bf9`
>
> `docs/runbooks/resend-dominio-envio.md` — três pontos de entrada, para que o operador tropece na variável independentemente de por onde entre no documento:
> - **§ 1 (valores canônicos):** linha nova "Env que arma o envio real", com o aviso "ausente ⇒ modo `teste` ⇒ nenhum candidato real recebe e-mail".
> - **§ 7 (Passo 6, "as três chaves"):** tabela nova com a **quarta** variável, marcada explicitamente como não-chave/não-segredo → env secret da EF, **não** Vault.
> - **§ 9 NOVO (Passo 8, "Armar o modo produção") — OBRIGATÓRIO antes do 1º envio real:** os dois valores válidos, tabela de resolução dos 4 casos (`producao` / `teste` / ausente / malformado), o default fail-safe, o comando `supabase secrets set`, onde e quando armar (ambiente da EF `notificar-candidato`, na P38, depois do smoke do Passo 7), como desarmar, e por que nunca deduzir o modo de `SUPABASE_URL`/hostname/`NODE_ENV`. Renumeração: "Notas e débitos" § 9 → § 10, com a cross-ref do § 4 atualizada.
>
> `36-HUMAN-UAT.md` — `UAT-36-3` novo, no mesmo formato de `UAT-36-1`/`UAT-36-2` (Origem, modo de falha, Steps numerados, quem cobra, referência, `status: pending`). A prova que fecha o item é **comportamental** — registro no ledger com `redirecionado = false` — e não o `secrets list`, que só mostra nome+hash. A seção **Gaps** ganhou o terceiro item e a frase de fecho passou a dizer que os três são independentes e os três precisam fechar antes do 1º e-mail real.
>
> Verificação: `grep -c "NOTIFICACOES_MODO"` → **7** no runbook e **7** no HUMAN-UAT (era **0** em ambos).

---

### WR-03: O `dig` de DKIM do runbook produz FQDN duplicado no cenário mais provável — e o próprio runbook ensina a interpretar isso como "não propagou" — ✅ RESOLVIDO

**File:** `docs/runbooks/resend-dominio-envio.md:107-121`
**Severidade:** Warning
**Issue:**
O comando prescrito é:

```bash
dig +short CNAME <cole-o-nome-do-dashboard>.recruta.beautysmile.com.br
```

Isso assume que o nome exibido pelo dashboard é **relativo ao domínio de envio** (`recruta.…`). Só que o domínio adicionado no Resend é o subdomínio inteiro (`recruta.beautysmile.com.br`, Passo 1) e a zona DNS editada é `beautysmile.com.br` — o próprio § 3.1 reconhece isso ao mandar colar `send.recruta` na Cloudflare, ou seja, **nomes relativos à zona, com `recruta` embutido**. No caso análogo do SPF, o runbook já escreve o FQDN completo (`send.recruta.beautysmile.com.br`, linhas 104-105), o que confirma que o nome de dashboard traz o `recruta`.

Cenário de falha concreto: o dashboard exibe `resend._domainkey.recruta`; o operador segue a instrução literalmente e roda
`dig +short CNAME resend._domainkey.recruta.recruta.beautysmile.com.br` → **resposta vazia**. A tabela de sinais de erro logo abaixo (linha 118) diz que resposta vazia significa "record ainda não propagou, ou o nome ficou errado" — e a reação natural é mexer no record DKIM que estava certo, que é exatamente o anti-padrão que a linha 135 alerta ("mexer nos records que estavam certos piora a situação"). O runbook induz o modo de falha que ele mesmo documenta.

**Fix:** trocar o bloco por uma regra de montagem de FQDN explícita, sem sufixo fixo:

```bash
# DKIM — monte o FQDN COMPLETO: <nome exibido no dashboard> + "." + <zona editada>.
# Confirme antes de rodar: o FQDN deve conter "recruta" EXATAMENTE UMA VEZ.
# Ex. dashboard mostra "resend._domainkey.recruta" e a zona é beautysmile.com.br:
dig +short CNAME resend._domainkey.recruta.beautysmile.com.br
# Se o dashboard mostrar um nome SEM "recruta", então o sufixo é o domínio de envio:
dig +short CNAME <nome-do-dashboard>.recruta.beautysmile.com.br
```

E acrescentar à lista de sinais de erro da linha 118: "FQDN com `recruta.recruta` → você concatenou o sufixo duas vezes; NÃO mexa nos records."

> ### ✅ RESOLVIDO — commit `f9ae8b5`
>
> Quatro mudanças em `docs/runbooks/resend-dominio-envio.md`:
> 1. **§ 2** — a coluna `Nome (relativo)` da tabela de records virou **`FQDN final (o que o dig do Passo 4 deve resolver)`**, com os valores de SPF explícitos. A coluna antiga dizia `send` enquanto o § 3.1 dizia `send.recruta`: era a mesma ambiguidade de referencial que gera a concatenação dupla.
> 2. **§ 2** — nota nova distinguindo as **três** formas do mesmo nome (FQDN final / relativo à zona editada / exibido pelo dashboard) e fixando a regra única: **o FQDN final contém `recruta` exatamente uma vez**.
> 3. **§ 5** — o bloco `dig` de DKIM não concatena mais às cegas; cobre os três casos (dashboard com FQDN completo ⇒ usar como está; dashboard relativo à zona ⇒ acrescentar `.beautysmile.com.br`; dashboard sem `recruta` ⇒ sufixo é o domínio de envio) e manda conferir a invariante **antes** de rodar.
> 4. **§ 5** — `recruta.recruta` virou sinal de erro próprio, apontando para o **comando `dig`** e não para o DNS, com "**NÃO mexa nos records**". O item "resposta vazia" passou a mandar reler o FQDN **antes** de culpar a propagação.
>
> Verificação: a única instrução de concatenação que sobrou no runbook é `<nome-do-dashboard>.recruta.beautysmile.com.br`, agora explicitamente gated pelo "caso 3 — o dashboard mostra um nome SEM `recruta`", onde a concatenação é de fato correta.

---

### WR-04: `check-resend-dominio.mjs` trata campo de tracking **ausente** como violação e falha duro num domínio corretamente configurado — ✅ RESOLVIDO

**File:** `scripts/check-resend-dominio.mjs:159-169`
**Severidade:** Warning
**Issue:**
```js
for (const flag of ['open_tracking', 'click_tracking']) {
  const value = detail?.[flag]
  if (value === false) { notes.push(...) }
  else { failures.push(`✗ ${flag}: ${String(value)} (expected false) …`) }
}
```

A igualdade é estrita contra `false`, então **`undefined` cai no ramo de falha**. E, diferente de `status` (linha 137) e `region` (linha 148), aqui **não há o fallback `?? match?.[flag]`** para o objeto vindo de `GET /domains` — uma assimetria interna do próprio script, provável por si só sem depender de qual shape a API devolve hoje.

Cenário de falha concreto: o operador desliga os dois trackings no dashboard (Passo 1, item 6), mas o payload de `GET /domains/:id` daquela conta/versão não inclui as chaves. O script imprime `✗ open_tracking: undefined (expected false). Tracking adds a links.<domain> CNAME …  turn it off in Domain Settings` e sai **1**. O operador vai ao dashboard, encontra tracking já desligado, e o relatório fica permanentemente vermelho — um checker sempre vermelho é um checker que se ignora (o mesmo raciocínio que o `assert-no-secrets.mjs:81-85` usa para justificar não colocar o domínio nos PATTERNS).

**Fix:** separar "violação" de "não reportado pela API":

```js
for (const flag of ['open_tracking', 'click_tracking']) {
  const value = detail?.[flag] ?? match?.[flag]
  if (value === false) {
    notes.push(`✓ ${flag}: false`)
  } else if (value === undefined || value === null) {
    notes.push(`… ${flag}: não reportado por esta versão da API — confira em Domain Settings (Passo 1, item 6).`)
  } else {
    failures.push(
      `✗ ${flag}: ${String(value)} (expected false). Tracking adds a links.<domain> CNAME …`,
    )
  }
}
```

> ### ✅ RESOLVIDO — commit `1606d5b`
>
> Aplicado como sugerido, mais duas coisas: o fallback `?? match?.[flag]` (removendo a assimetria interna contra `status`/`region`) e a linha final de `PASSED`, que **deixou de afirmar "tracking off"** quando a API não reportou — passa a dizer `tracking NOT reported by the API (confirm in Domain Settings)`. O relatório não afirma o que não verificou.
>
> **Prova empírica** — harness com `globalThis.fetch` mockado (sem rede real), comparando `git show HEAD:scripts/check-resend-dominio.mjs` com a versão corrigida sob o mesmo payload:
>
> | payload | ANTES | DEPOIS |
> |---|---|---|
> | `detail.{open,click}_tracking = false` | exit 0 ✓ | exit 0 ✓ |
> | `detail` **sem** as duas chaves | **exit 1 ✗** ← o bug | **exit 0 ✓** |
> | `detail.{open,click}_tracking = true` | exit 1 ✓ | exit 1 ✓ |
>
> Prova do fallback (`detail` sem as chaves; entrada de `GET /domains` com `open_tracking: true`, `click_tracking: false`):
> - **ANTES:** `✗ open_tracking: undefined` + `✗ click_tracking: undefined` — reportava falha onde não havia **e perdia a violação real**.
> - **DEPOIS:** `✗ open_tracking: true` + `✓ click_tracking: false` — violação real detectada, exit 1.
>
> `node --check scripts/check-resend-dominio.mjs` → OK.

---

## Info

### IN-01: Código morto no laço de match do guard, posicionado depois do `push`

**File:** `scripts/assert-no-secrets.mjs:167`
**Issue:** `if (m[0].length === 0) re.lastIndex += 1` é inalcançável — os 4 patterns exigem no mínimo `re_` / `api.resend.com` / `RESEND_API_KEY`, nenhum casa string vazia. Pior: se algum dia um pattern de largura zero for adicionado, a linha executa **depois** de `failures.push(...)`, ou seja, o guard já teria registrado um falso-positivo antes de destravar o laço.
**Fix:** remover a linha, ou movê-la para antes do `push` e envolver o `push` num `if (m[0].length > 0)`.

### IN-02: O `try/catch` do `walk()` atribui qualquer erro de I/O a "build/ ausente"

**File:** `scripts/assert-no-secrets.mjs:110-119`
**Issue:** o `catch` cobre a recursão inteira. Um symlink quebrado dentro de `build/` (o `statSync` da linha 103 lança ENOENT) ou um `EACCES` num subdiretório produzem a mensagem `could not read build/ — Run npm run build first`. Falha fechada (correto), mas o diagnóstico aponta para o lugar errado.
**Fix:** capturar o `err` e anexar `err.code`/`err.path` à mensagem; ou envolver só o `readdirSync(BUILD_DIR)` de topo e deixar a recursão registrar `failures.push('✗ unreadable dir: …')`, como já se faz por arquivo na linha 153.

### IN-03: `resend-key-formatdrift` tem superfície de falso-positivo em blobs base64url

**File:** `scripts/assert-no-secrets.mjs:77`
**Issue:** o docblock justifica o `\b` apenas contra identificadores minificados, e isso funciona (verificado: `measure_something_really_long_name` não casa). Mas `\b` também é criado por `-`, que é caractere de alfabeto base64url. Verificado empiricamente: `"data:font/woff;base64,AAAA-re_REDACTED_P36_SYNTHETIC_TEST_KEY"` **casa** o pattern 2. Hoje não há blob desses no bundle (o gate está verde), mas um `data:` URI inline futuro deixa o gate vermelho sem vazamento nenhum.
**Fix:** não é urgente; se acontecer, restringir para `(?<![A-Za-z0-9_-])re_…` em vez de `\b`.

### IN-04: `BUILD_DIR` é uma duplicata literal do `outDir`, sem verificação de frescor

**File:** `scripts/assert-no-secrets.mjs:62-65`
**Issue:** o comentário aponta `vite.config.ts:123 → outDir: 'build'`, mas a constante é uma cópia manual. Se o `outDir` mudar, o `postbuild` e a invocação standalone `npm run assert:no-secrets` varrem um `build/` **obsoleto** (gitignored, permanece em disco) e saem 0 tendo verificado bytes antigos. No CI o efeito é benigno (checkout limpo → sem `build/` → exit 1), então o risco é só local.
**Fix:** ou importar o valor de uma constante compartilhada, ou acrescentar uma asserção de frescor (ex.: o `mtime` mais recente sob `build/` deve ser posterior ao início do processo quando invocado por `postbuild`).

### IN-05: `process.exit()` logo após `console.error` pode truncar a saída em pipe do CI

**File:** `scripts/assert-no-secrets.mjs:118,127,186,190` · `scripts/check-resend-dominio.mjs:72,214,218`
**Issue:** quando stdout/stderr é pipe (é o caso no GitHub Actions), as escritas do Node são assíncronas e `process.exit()` pode terminar o processo antes do flush. Num gate de segurança isso significa "o CI ficou vermelho mas o log não diz onde". `assert-chunks.mjs` tem o mesmo padrão — é precedente do repo, não regressão desta fase.
**Fix:** trocar `process.exit(1)` por `process.exitCode = 1` (e deixar o script terminar naturalmente); o código de saída é o mesmo e o flush é garantido.

### IN-06: `SELECT … INTO` sem `LIMIT 1` enquanto o próprio UAT da fase avisa que duplicata é possível

**File:** `supabase/migrations/20260722000001_p36_vault_resend_reader.sql:63-64`
**Issue:** `SELECT decrypted_secret INTO v_chave FROM vault.decrypted_secrets WHERE name = 'resend_api_key';` — em PL/pgSQL, `INTO` sem `STRICT` pega a **primeira linha em ordem indefinida** e ignora as demais em silêncio. O `36-HUMAN-UAT.md:56` afirma explicitamente que duplicata é possível ("Se já existir uma linha, NÃO criar outra (duplicata torna a leitura ambígua)"), o que torna o cenário não-hipotético: após uma rotação feita com `create_secret` em vez de `update_secret`, a EF pode receber a chave **revogada** e falhar com 401 intermitente conforme o plano de execução mudar. O idioma segue o precedente do repo (`reprocessar_rpc.sql:64`, `sec03_n8n_serverside.sql:62`), por isso Info e não Warning.
**Fix:** `ORDER BY created_at DESC LIMIT 1` (determinístico, sempre a mais recente), ou `INTO STRICT` com `EXCEPTION WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION 'segredo resend_api_key duplicado no Vault'` — mensagem que nomeia o segredo, nunca o valor.

### IN-07: `resolverDestinatario` não valida `emailReal`

**File:** `supabase/functions/_shared/email-config.ts:93-108`
**Issue:** em `producao`, `resolverDestinatario('', 'decisao_final', 'producao')` devolve `{ para: '' }` sem erro; a falha só aparece como 422 do provedor. Contradiz a filosofia declarada do próprio módulo em `exigirChaveApi` ("falha AQUI com mensagem acionável — em vez de deixar o provedor devolver um 401 opaco"). Não é vetor de vazamento nem de injeção (a API do Resend é JSON, então CRLF em header não se aplica).
**Fix:** guardar cedo — `if (!emailReal?.includes('@')) throw new Error('[email-config] destinatário vazio ou sem @ — envio abortado')`.

### IN-08: Caso 7 contém uma asserção tautológica

**File:** `supabase/functions/_shared/__tests__/email-config.test.ts:82-84`
**Issue:** `assert(!FROM.includes("resend.dev"))` vem logo depois de `assertEquals(FROM, "Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>")`. A segunda asserção é implicada pela primeira e não pode falhar isoladamente — ela sugere cobrir o risco "From de produção virou `onboarding@resend.dev`", mas o `assertEquals` já o cobre integralmente.
**Fix:** manter só o `assertEquals` (o comentário explicativo tem valor; a asserção não), ou reposicionar o guard `resend.dev` para uma função que o P38 realmente possa variar.

### IN-09: `die()` não tem contrato `never`; `match.id` depende do `process.exit` interno

**File:** `scripts/check-resend-dominio.mjs:68-73,120-132`
**Issue:** `if (!match) { die([...]) }` não tem `return`/`throw`; a linha 132 usa `match.id` logo em seguida. Funciona só porque `die` chama `process.exit(1)`. O mesmo vale para os `die` dentro de `callResend` (linhas 89, 97, 103, 109), cujos caminhos "pós-die" ficam formalmente alcançáveis. Uma refatoração que troque `process.exit` por `process.exitCode` (ver IN-05) converte silenciosamente isso num `TypeError: Cannot read properties of undefined`.
**Fix:** fazer `die()` terminar com `throw new Error(...)` capturado num handler de topo, ou usar `process.exitCode = 1; throw new Error('aborted')`. Em `.mjs` sem tipos, um `return die([...])` explícito nos call-sites também documenta a intenção.

### IN-10: Com `--verify`, o script sai 1 imediatamente após disparar a verificação

**File:** `scripts/check-resend-dominio.mjs:193-215`
**Issue:** os `failures` são coletados **antes** do POST de verify (linhas 134-190). Ao rodar `--verify` num domínio ainda `not_started`, o script dispara a verificação com sucesso e em seguida sai 1 por causa dos status pré-verify que ele mesmo acabou de tornar obsoletos. O texto "re-run this script in a few minutes" mitiga, mas o exit code contradiz a ação bem-sucedida.
**Fix:** quando `WANT_VERIFY` for true e o POST tiver sucedido, imprimir os `failures` como informativos e sair 0 (o `status` pré-verify não é mais o estado corrente).

### IN-11 (nota, não defeito): `resolverModo()` lança sob Deno sem `--allow-env`

**File:** `supabase/functions/_shared/email-config.ts:61`
**Issue:** o default parameter avalia `Deno.env.get(...)` no momento da chamada; sem `--allow-env` isso lança `PermissionDenied` em vez de cair em `'teste'`. Falha **fechada** (não envia), então está alinhado ao fail-safe — registrado só para que a P38 não interprete a exceção como bug do módulo. A suíte roda com `--allow-env` (`ci.yml:87`), então o CI não é afetado.
**Fix:** nenhum necessário; se quiser robustez, envolver em `try { … } catch { return 'teste' }`.

---

## Avaliação dos achados já conhecidos (opinião solicitada)

**1. Literal com forma de chave Resend no repo — DISCORDO da aceitação. Recomendo trocar.** — ✅ RESOLVIDO

O argumento "é exemplo público da documentação de terceiro" é verdadeiro e irrelevante para quem consome o repo:

- Um scanner de segredo não distingue proveniência. O **GitHub Push Protection** tem detector de parceiro para Resend API Key, e a regra `resend-api-key` do **gitleaks** (`re_[a-zA-Z0-9_\-]{20,}`) casa este literal. O arquivo está em `scripts/`, ou seja, no caminho varrido por qualquer job de secret scanning que este repo venha a adotar.
- O literal está em **4 arquivos** — cada alerta futuro exige 4 dismissals. O custo real não é o alerta, é o hábito de dispensá-lo: a próxima chave de verdade entra pela mesma porta.
- O guard não precisa dele. Ele precisa de *qualquer* string que case `\bre_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}\b` **e** `\bre_[A-Za-z0-9_]{28,}\b`.

**Literal exato recomendado:** `re_TESTFAKE_000000000000000000EXAMPLE`

Verificado: casa os dois patterns (`true`/`true`), 37 caracteres, entropia baixíssima (`TESTFAKE`, zeros, `EXAMPLE`) — o que também reduz a chance de disparar as regras baseadas em entropia, além de ser auto-evidente para um leitor humano. Substituir nos 4 lugares (`scripts/assert-no-secrets.mjs:36,43`, `36-02-PLAN.md`, `36-02-SUMMARY.md`, `36-RESEARCH.md`) e reexecutar a prova (a) do meta-teste, que continua válida sem alteração de procedimento.

> ### ✅ RESOLVIDO — commit `0d22384`
>
> Trocado nos 4 arquivos. Além do literal, foram corrigidas as frases que atribuíam proveniência ("exemplo público da doc do Resend") — agora falsas — e o docblock de `assert-no-secrets.mjs` ganhou um parágrafo explicando **por que** a fixture é sintética, para que ninguém a troque de volta.
>
> **As 4 provas do meta-teste foram re-executadas** (não só a (a)), contra um `build/` recém-gerado:
>
> | Prova | Resultado |
> |---|---|
> | (a) fixture em `build/__meta_test_secret.js` | **exit 1** — `resend-api-key` + `resend-key-formatdrift`, `(37 chars, starts "re_T...")` |
> | (b) `https://api.resend.com/emails` | **exit 1** — `resend-endpoint`, `(14 chars, starts "api....")` |
> | (c) `RESEND_API_KEY` | **exit 1** — `resend-key-identifier`, `(14 chars, starts "RESE...")` |
> | (d) a mesma fixture **dentro de `build/index.html`** | **exit 1** — `build/index.html @byte 527`, prova que o walk não se limita a `build/assets/*` |
>
> Em (a) e (d), `grep -c '000000000000000000EXAMPLE'` na saída → **0**: a chave sintética nunca aparece inteira, só o prefixo mascarado `re_T...`.
>
> **Restauração, sem resíduo:** `npm run build` → exit 0; `grep -c` no `build/index.html` → 0; `ls build/__meta_test_secret.js` → *No such file or directory*; `node scripts/assert-no-secrets.mjs` → **exit 0** (`✓ assert-no-secrets PASSED`); `grep -rl` no `build/` inteiro → nenhum resíduo; `git status --porcelain` → limpo.
>
> A transcrição do meta-teste em `36-02-SUMMARY.md` foi atualizada com os números reais observados agora (`37 chars` / `re_T...`; eram `36 chars` / `re_c...`).
>
> Critério de sucesso: um `grep -rn` pelas duas metades do literal antigo (o prefixo `re_c1tp…` e o sufixo `…FmFcWCv`) no repo inteiro → **zero ocorrências**. Este documento deliberadamente **não** transcreve nenhuma das duas — reconstruí-las aqui reintroduziria exatamente o problema que o commit `0d22384` eliminou.

**2. `cost-alerter` intocado — CONCORDO.** O débito em `.planning/todos/pending/36-resend-chave-divergencia.md` é honesto e preciso: registra o levantamento real (`secrets list` mostrando presença sem valor), marca o Item B como **não confirmado** em vez de assumir, e a recomendação da opção (i) — segunda RPC sem argumento em vez de generalizar para `ler_segredo(text)` — é a leitura correta de blast radius. Nada a acrescentar.

**3. `.husky/pre-commit` vermelho — CONCORDO** que é débito pré-existente. Verifiquei que `tsconfig.json` inclui `scripts` mas não define `allowJs`/`checkJs`, então os dois `.mjs` novos não entram na contagem `tsc`: a fase de fato não mexeu no baseline.

**4. DELIV-01 / Vault como HUMAN-UAT pendente — CONCORDO, com uma ressalva.** O caminho de leitura do Vault está provado só no ramo negativo (`ler_resend_api_key() is null` → `true`). Isso já prova mais do que parece — se o *owner* da função não enxergasse `vault.decrypted_secrets`, a chamada teria levantado `permission denied` em vez de devolver `true`, e se a coluna não existisse o PL/pgSQL teria falhado na primeira execução. O que continua sem prova é apenas o **casamento do literal `'resend_api_key'`** com o nome que o operador vai criar. Se quiser fechar isso hoje sem violar a regra "sem placeholder", dá para provar dentro de uma transação descartada:

```sql
BEGIN;
  SELECT vault.create_secret('nao-persistido', 'resend_api_key', 'smoke transitório P36');
  SELECT public.ler_resend_api_key() IS NOT NULL AS caminho_de_leitura_ok;  -- esperado: true
ROLLBACK;   -- nada persiste; nenhum placeholder existe após o ROLLBACK
```

Opcional — o UAT-36-2 passo 6 já cobre isso quando a chave real existir.

---

## Verificações executadas (evidência)

| Verificação | Comando | Resultado |
|---|---|---|
| Guard varre `index.html` | `node scripts/assert-no-secrets.mjs` | 43 arquivos: 41 `.js` + 1 `.css` + **1 `.html`** |
| Guard é real (chave) | plantar `re_c1tp…` em `build/` | `exit=1`, match **mascarado** (`starts "re_c..."`) |
| Guard é real (identificador) | plantar `RESEND_API_KEY` em `build/__meta2.txt` | `exit=1` |
| Build limpo | remover o plantado | `exit=0` |
| `\b` previne falso-positivo | regex vs `measure_something_really_long_name` | não casa ✓ |
| Suíte Deno | `deno test --allow-env --allow-read --config … email-config.test.ts` | 7 passed / 0 failed |
| Mutação fail-open A | default → `'producao'` | **7 passed** (WR-01) |
| Mutação fail-open B | env → `NOTIFICACOES_MODE` | **7 passed** (WR-01) |
| CI sem chave viva | `grep -c "RESEND" .github/workflows/ci.yml` | `0` ✓ |
| Env local sem chave | `grep RESEND .env.local .env.test .env*.example` | nenhuma ✓ |
| Valores canônicos | cruzamento email-config × runbook × checker × migration × UAT | idênticos ✓ |
| Vitest não coleta o teste Deno | `vite.config.ts:58` (path literal, não glob) | correto ✓ |
| Gate roda nos 2 jobs que buildam | `e2e` (build + step dedicado) e `lighthouse` (build → `postbuild`) | correto ✓ |

---

_Reviewed: 2026-07-22T18:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

_Fixed: 2026-07-22T15:52:00Z_
_Fixer: Claude (gsd-code-fixer) — 5 commits atômicos: `8e5d4a2`, `f9ae8b5`, `1606d5b`, `09f9bf9`, `0d22384`_
_Escopo do fix: os 4 Warning + o literal com forma de chave real. Os 10 Info ficaram como estão, por decisão._
