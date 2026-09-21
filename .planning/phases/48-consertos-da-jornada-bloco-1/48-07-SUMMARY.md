---
phase: 48-consertos-da-jornada-bloco-1
plan: 07
subsystem: notificacoes-titular
tags: [lgpd, exclusao, email, resend, edge-function, jorn-27, jorn-u2]
status: complete

requires:
  - phase: 45
    provides: "executar-direito-titular (pedir/cancelar/executar), enviarRecibo, recibo_enviado_em"
  - phase: 36
    provides: "_shared/email-config.ts (resolverModo, resolverDestinatarioComLabel, exigirSinkTeste)"
provides:
  - "solicitacoes_dados.aviso_pedido_enviado_em / aviso_cancelamento_enviado_em (PROD)"
  - "_shared/email-config: APP_BASE_URL_PADRAO, normalizarBaseApp, montarUrlLogin"
  - "executar-direito-titular v5: aviso a titular no pedido e no cancelamento"
affects: [48-08, 48-16, 48-17, 48-18]

actuals:
  tokens: 13570
  tasks: 2
  commits: 4
plan_head_before: f6dcb96be6678dffa3ba9990edaecceeb621711d

tech-stack:
  added: []
  patterns:
    - "aviso fora do ledger: idempotência por coluna de carimbo + Idempotency-Key no Resend"
    - "envio que DEVOLVE o desfecho ({ok}|{ok:false,causa}) em vez de lançar, quando o fato de domínio já foi gravado"

key-files:
  created:
    - supabase/migrations/20260921000005_p48_aviso_titular.sql
  modified:
    - supabase/functions/_shared/email-config.ts
    - supabase/functions/_shared/__tests__/email-config.test.ts
    - supabase/functions/executar-direito-titular/helpers.ts
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

decisions:
  - "A base do link entra por Deps.appBaseUrl (o wiring lê APP_BASE_URL), e não por Deno.env dentro do handler: a suíte da EF roda sem --allow-env por contrato"
  - "O aviso de pedido carimba com UPDATE ... WHERE aviso_*_enviado_em IS NULL: dois pedir concorrentes não reescrevem o carimbo; o Resend deduplica o envio pela Idempotency-Key por (tipo, pedido)"
  - "Sem e-mail legível do titular, o aviso não é tentado e o log registra aviso_sem_endereco (a resposta não muda)"

metrics:
  duration: "~40 min"
  completed: 2026-09-21
---

# Phase 48 Plan 07: Aviso à titular no pedido e no cancelamento de exclusão — Summary

**Quem pede, ou cancela, a exclusão dos próprios dados agora recebe um e-mail com a data, o link de login que volta para `/candidato/privacidade` e a instrução «Se não foi você…». O envio registra o carimbo em coluna própria (`aviso_*_enviado_em`), nunca em `recibo_enviado_em`, e não passa por `notificacoes_enviadas`.**

## O que foi feito

| Task | Commit | O quê |
|---|---|---|
| 1 RED | `d0a8b793` | 9 casos do aviso de pedido no harness do motor (o único que registra `updates`, `fetchCalls` e toque no ledger) |
| 1 GREEN (tracer) | `e0277af0` | migration aplicada, `montarUrlLogin`, helpers do aviso de pedido, `enviarAvisoTitular` + `avisarPedidoTitular`, EF **v4** deployada |
| 2 RED | `44f47d7d` | 5 casos do cancelamento + 5 casos de `montarUrlLogin`/`normalizarBaseApp` |
| 2 GREEN | `318551df` | helpers e ramo do cancelamento, teste D-07 por padrão, EF **v5** deployada, deferred |

### Em PROD
- **Migration `20260921000005`** aplicada com `node p46apply.cjs migrate`: `md5 361c1d17…` e ledger **BATE** (4794 octetos). As duas colunas foram conferidas em `information_schema` (timestamptz, nullable, com COMMENT).
- **EF `executar-direito-titular` v5** deployada por `node efdeploy.cjs` (`verify_jwt=true`, conforme a tabela). O bundle lido de volta tem `aviso_pedido_enviado_em` 6×, `aviso_cancelamento_enviado_em` 8×, «foi cancelado» 4× e `lgpd@` **0**. O preflight OPTIONS respondeu 200, então a função sobe.
- **Nenhum e-mail foi enviado a titular real.** A prova com conta real (pedido e cancelamento, e-mails na caixa, colunas preenchidas, `recibo_enviado_em` nulo) é do 48-18 (`NOTIFICACOES_MODO=producao`).

### O contrato, provado por teste (102/102 na EF, 20/20 em `email-config`)
- `pedir`/`cancelar` com sucesso fazem **1 POST** ao Resend, com `to` igual ao e-mail da titular (ou o sink `delivered+aviso_exclusao_*@resend.dev` em modo teste) e `Idempotency-Key` presente. O carimbo próprio é gravado, e a resposta sai **idêntica** à de antes (`assertEquals` sobre o objeto inteiro).
- Com o carimbo já preenchido, 0 POST e nenhum UPDATE. Dois `pedir` seguidos geram 1 aviso (BORDA).
- Quando o envio falha (Resend 500, rede fora, sem chave, sem endereço), a resposta continua 200 e idêntica, a coluna fica NULA e o log registra `aviso_<causa>`. O log não leva id completo, e-mail, chave nem URL.
- **Titular SEM candidatura** também recebe o aviso: não há nenhuma leitura de `candidaturas` e o ledger não é tocado (BORDA).
- Em nenhum cenário de `pedir` ou `cancelar` algum patch contém `recibo_enviado_em`, e `notificacoes_enviadas` nunca é tocada. `grep recibo_enviado_em index.ts` só acha a allowlist de colunas, a leitura de órfãos (`.is(...)`) e o passo 4.
- O corpo tem a data (`dd/mm/aaaa` em SP) e `https://rh.beautysmile.com.br/auth/login?redirect=%2Fcandidato%2Fprivacidade`. Não tem id do pedido, id do titular nem endereço do domínio. A asserção D-07 **morde**: com um endereço injetado temporariamente no corpo, (p48-e) e (p48-m) falharam; o arquivo foi restaurado.
- `montarUrlLogin`: com env malformada ou `http:`, cai no default. `redirect` só é aceito se for caminho interno (`//`, `/\`, absoluto, relativo, com espaço ou caractere de controle viram o login puro). `email-config.ts` continua sem nenhum `import`.
- As suítes vizinhas que importam `email-config` passaram: `notificar-candidato` 27/27 e `notificar-rh` 38/38.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] O `<verify>` roda `deno test supabase/functions/_shared/`, e o diretório já reprovava antes deste plano**
- **Found during:** baseline da Task 1
- **Issue:** `_shared/__tests__/strict-schema.test.ts` é um arquivo **vitest** (`expect`). Sob `deno test` o type-check falha (TS7053) e, com `--no-check`, o arquivo lança «Uncaught error» (167 passam, 1 falha). Isso é pré-existente.
- **Fix:** rodei os arquivos que este plano toca (`email-config.test.ts` + `email-templates.test.ts`: 46/46) e o diretório inteiro com `--no-check`, onde a única falha é aquele arquivo. O caso foi registrado em `deferred-items.md`. Fora do escopo, não consertei.

**2. [Rule 1 — o portão não media o que dizia] O grep D-07 do `<verify>` acharia as próprias asserções negativas do teste**
- **Found during:** Task 2
- **Issue:** as asserções `!html.includes("lgpd@")` contêm a string que o grep procura. O verify reprovaria trabalho correto.
- **Fix:** troquei por um padrão (`RE_ENDERECO_DOMINIO`): qualquer endereço `@beautysmile.com.br`, inclusive com espaço antes do `@`. É mais forte que o anterior e não carrega o literal. A mordida foi provada por mutação.
- **Commit:** `318551df`

**3. [Rule 2 — conformidade com o contrato da suíte] A base do link entra por `Deps.appBaseUrl`, e não por `Deno.env.get` no handler**
- **Issue:** o plano dizia `montarUrlLogin(Deno.env.get('APP_BASE_URL') || undefined, …)` dentro do ramo. Mas a suíte desta EF roda **sem `--allow-env`** por contrato (docblock de `Deps.modo`), então a leitura de env teria de sair do handler.
- **Fix:** o wiring do `Deno.serve` lê `APP_BASE_URL` e passa a base por `deps.appBaseUrl`. O comportamento em PROD é o mesmo (a env não existe, então vale o default). A suíte passou sem permissão nenhuma (102/102).

**4. [Rule 2] `montarUrlLogin` é mais estrito que a letra do plano**
- O plano pedia recusar `redirect` que não comece com `/` ou que comece com `//`. Também recuso `/\` e caractere de controle ou espaço, que é a classe CWE-601 que `resolveRedirect` já trata no front. É o primeiro cinto, não o único.

### TDD Gate Compliance
- As duas tasks tiveram RED (`test(48-07)`) antes do GREEN (`feat(48-07)`). O RED da Task 1 falhou 8/9 pela ausência do aviso; o (p48-b), de idempotência, já passava trivialmente porque nada era enviado. O RED da Task 2 falhou 3/5 pelo mesmo motivo; (p48-k) e (p48-n) passavam porque a chave de idempotência nasceu no tracer.
- Os 5 casos de `email-config.test.ts` já nasceram **verdes**: a função foi criada no tracer da Task 1 e o plano pôs os testes dela na Task 2. Registro isso aqui, sem esconder.

## Threat Surface
Nenhuma superfície nova além do `<threat_model>`. Os controles T-48-07-01..06 estão implementados e testados (aviso, colunas próprias, corpo sem id nem literal, log por código, redirect interno, `exigirSinkTeste`). T-48-07-SC: nada foi instalado.

## Notas para os próximos planos
- **48-08 / 48-16:** `notificar-candidato` e `notificar-rh` também importam `_shared/email-config.ts`. Os exports novos são aditivos e só chegam ao bundle delas no próximo deploy de cada uma, sem mudança de comportamento até lá. `notificar-rh/helpers.ts` ainda tem sua própria `APP_BASE_URL_PADRAO`/`montarUrlFila`, e a consolidação é do 48-16.
- **48-17:** as duas colunas novas não têm veredito de export. A cópia LGPD exporta por allowlist, então elas ficam **fora** (fail-safe), no mesmo estado das 7 colunas de estado do P45 (ver `deferred-items.md`).
- **48-18:** para provar em PROD, faça com a conta de teste um pedido e depois um cancelamento. Em seguida confira `aviso_pedido_enviado_em` e `aviso_cancelamento_enviado_em` preenchidos, `recibo_enviado_em IS NULL` e os dois e-mails na caixa. Aviso não entregue aparece como `aviso_pedido_enviado_em IS NULL AND situacao='agendado'`.
- O rodapé de `layoutBase` diz «Você o recebeu porque se candidatou a uma vaga». Para uma titular sem candidatura a frase é imprecisa. O mesmo vale para o recibo P45, e `layoutBase` é compartilhado, por isso não mexi. Fica registrado.

## Known Stubs
Nenhum.

## Self-Check: PASSED
