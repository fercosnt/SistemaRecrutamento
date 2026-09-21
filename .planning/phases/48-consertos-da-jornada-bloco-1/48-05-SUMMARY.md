---
phase: 48-consertos-da-jornada-bloco-1
plan: 05
subsystem: avaliacao
status: complete
tags: [jorn-06, big-five, devolutiva, edge-function, sec-04, supabase-js, prod]

requires: []
provides:
  - "48-EVIDENCIA-JORN06.md — a causa do 401 MEDIDA em PROD antes do conserto (H1 confirmada)"
  - "submit-bigfive-final v13 em PROD: Bearer explícito no functions.invoke da devolutiva + log por código da falha"
  - "gerar-devolutiva-bigfive v24 em PROD: sem o diagnóstico temporário, guarda SEC-04 e verify_jwt=false inalterados"
  - "backlog de devolutivas medido (2, ambas de conta de teste) e RECUSADO pelo operador, com registro"
affects: [48-18]

actuals:
  tasks: 4
  commits: 6
plan_head_before: e4ea0d33

tech-stack:
  added: []
  patterns:
    - "Medir a causa antes do conserto: instrumentação que loga só presença/formato/comprimento, deploy, submissão de prova pelo operador, leitura do log no mesmo dia — e o conserto só depois de a medição casar com a hipótese"
    - "Chamador servidor→servidor com chave sb_secret_ manda o Authorization EXPLÍCITO: o supabase-js não repete a chave como Bearer quando não há sessão"

key-files:
  created:
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-EVIDENCIA-JORN06.md
  modified:
    - supabase/functions/submit-bigfive-final/index.ts
    - supabase/functions/submit-bigfive-final/index.test.ts
    - supabase/functions/gerar-devolutiva-bigfive/index.ts
    - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "Causa medida (H1): a devolutiva recebia o apikey sb_secret e NENHUM Authorization; o supabase-js 2.116.0 (omitApiKeyAsBearer) não põe a chave como Bearer sem sessão, e a guarda SEC-04 compara o Bearer com SUPABASE_SERVICE_ROLE_KEY → 401 em toda devolutiva"
  - "Conserto: o único chamador legítimo passa Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> explicitamente; guarda e verify_jwt=false não mudam"
  - "O diagnóstico diag-auth saiu no deploy do conserto, junto com classificarFormatoCredencial e seus testes (sem consumidor em produção); o log por código do submit FICA"
  - "Retroativo do backlog RECUSADO pelo operador: as 2 candidaturas são de conta de teste; a prova do JORN-06 é a submissão nova do 48-18"

requirements-completed: []

coverage:
  - id: D1
    description: "A causa do 401 medida em PROD antes do conserto — linha da guarda + diag-auth casando com H1"
    requirement: JORN-06
    verification:
      - kind: integration
        ref: "48-EVIDENCIA-JORN06.md — function_logs/function_edge_logs da requisição 01a0c58f-7b0b-7393-bb8e-e6cb7706a454 (2026-09-21T20:01:51Z): auth_presente:false, apikey_formato:sb_secret, esperado_formato:sb_secret; edge 401 v23; submit v12 com devolutiva_status 401"
        status: pass
    human_judgment: false
  - id: D2
    description: "O conserto: Bearer explícito, nenhum log com a chave, diagnóstico removido"
    requirement: JORN-06
    verification:
      - kind: unit
        ref: "deno test --allow-all supabase/functions/submit-bigfive-final/ supabase/functions/gerar-devolutiva-bigfive/ — 26 passed, 0 failed"
        status: pass
    human_judgment: false
  - id: D3
    description: "O conserto no ar, conferido pelo bundle vivo"
    requirement: JORN-06
    verification:
      - kind: other
        ref: "MCP list_edge_functions + get_edge_function: gerar-devolutiva-bigfive v24 (9/9 arquivos byte a byte iguais ao disco, diag-auth 0×); submit-bigfive-final v13 (Authorization: Bearer + serviceKey no invoke e no wiring)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Backlog medido e decidido pelo operador"
    requirement: JORN-06
    verification:
      - kind: other
        ref: "verify da Task 4 — «RETROATIVO RECUSADO — backlog de conta de teste registrado e nao gerado», exit 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Uma submissão NOVA de Big Five pelo navegador, depois do conserto, cria linha em devolutivas_candidato"
    requirement: JORN-06
    verification: []
    human_judgment: true
    rationale: "É a única prova do wiring real do Deno.serve + functions.invoke; pertence ao 48-18 (sessão 1, passo f)"

completed: 2026-09-21
---

# Phase 48 Plan 05: Devolutiva do Big Five (JORN-06) Summary

**A devolutiva do Big Five dava 401 em toda submissão, e o candidato não via nada: o submit respondia `{ok:true}` e engolia o erro. A causa foi medida em PROD antes de qualquer conserto. A chamada interna chegava sem `Authorization`, porque o supabase-js, com chave `sb_secret_` e sem sessão, não repete a chave como Bearer. O conserto manda o Bearer explicitamente. Está no ar em `submit-bigfive-final` v13 e `gerar-devolutiva-bigfive` v24, conferido no bundle vivo. O backlog de 2 devolutivas de conta de teste foi recusado pelo operador.**

## O que aconteceu, em ordem

| Task | O que | Commit |
|---|---|---|
| 1 (tracer) | Instrumentação sem vazar: `diag-auth` na devolutiva (presença, formato, comprimento, nome da env; nunca o valor) e log por código no submit. Deploy de v23 e v12 | `694dce1e` |
| 2 (operador) | Submissão de prova com a conta `+claude1` às 20:01Z. Log lido no mesmo dia pelo orquestrador via MCP. **H1 confirmada** | `09c659a4` |
| 3 | RED do Bearer explícito, depois o conserto e a remoção do diagnóstico. Backlog medido só leitura: 2 pares, ambos de teste | `c9e3694f`, `ac2feea8`, `7445a87d` |
| 3 (deploy) | Operador rodou `efdeploy.cjs` no próprio Terminal às 22:35Z. Bundles conferidos pelo MCP | `b26c6e7d` |
| 4 (operador) | Retroativo **RECUSADO** | este commit |

## Deviations from Plan

**1. [Ambiente] O deploy do conserto foi feito pelo operador, não pelo Claude.**
O Keychain do macOS respondeu `errSecInteractionNotAllowed` (exit 36) ao processo do Claude, dentro e fora do sandbox, mesmo depois de o operador destravá-lo no Terminal: são sessões de segurança diferentes. O `efdeploy.cjs` lê o token de lá. O deploy pelo MCP (`deploy_edge_function`) foi recusado de propósito: exigiria transcrever ~112 KB de código, que é justamente a via que o `efdeploy.cjs` existe para evitar. O operador rodou os dois deploys no Terminal dele, e o token não passou pelo Claude. Por isso o deploy ficou ~5 h atrasado em relação ao commit do conserto. Nesse intervalo, o `diag-auth` seguiu logando formato e comprimento da credencial, nunca o valor.

**2. [Letra] Versão do supabase-js.** O RESEARCH citava 2.110.9. O runtime registrou 2.116.0. O comportamento medido é o mesmo.

## Fora de escopo (registrado em `deferred-items.md`)

`candidaturas.data_bigfive_enviado` está nulo nos 3 de 3 scores `big_five` de PROD: o `submit-bigfive-final` não carimba essa coluna. É anterior à fase e não é o JORN-06.

## Next

JORN-06 só fecha com a prova do 48-18: uma submissão nova pelo navegador criando linha em `devolutivas_candidato`.
