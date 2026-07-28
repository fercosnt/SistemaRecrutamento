---
phase: 38-ef-notificar-candidato-comm
plan: 04
subsystem: edge-functions
tags: [checkpoint, deploy, smoke, human-uat, deferred, vault]
status: deferred
outcome: human_needed

# Dependency graph
requires:
  - phase: 38-03
    provides: "supabase/functions/notificar-candidato — a EF a deployar"
  - phase: 36 (UAT-36-2)
    provides: "resend_api_key no Vault — PENDENTE (bloqueia o smoke)"
provides:
  - ".planning/phases/38-ef-notificar-candidato-comm/38-HUMAN-UAT.md — UAT-38-1 (deploy dormente + smoke), blocked_on UAT-36-2"
affects: [39, 41]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Checkpoint de orquestrador (autonomous:false) adiado por decisão do operador — sem mudança em PROD"

key-files:
  created:
    - .planning/phases/38-ef-notificar-candidato-comm/38-HUMAN-UAT.md
  modified: []

key-decisions:
  - "38-04 ADIADO por decisão do operador (2026-07-23): deploy + smoke ficam para uma sessão humana única (provisionar chave → deploy → smoke). Nenhuma mudança em PROD nesta fase"
  - "Estado PROD verificado (read-only, projeto isljnozzlvckrgjjbjwp): EF notificar-candidato NÃO deployada; Vault tem edge_invoke_key+project_url mas NÃO resend_api_key → UAT-36-2 pendente confirmado"
  - "O smoke live (COMM-01 critério 4) é o único proof não-autônomo da fase; adiá-lo não regride o código (COMM-01..06 provados por unit test), mas mantém COMM-01 critério 4 aberto"
  - "A P39 (rewire de triggers) NÃO deve aterrissar antes deste smoke — os triggers precisam de uma EF viva e provada como alvo (cadeia estrita 38→39)"

# Verification
verification:
  automated: "n/a — checkpoint operacional"
  manual: "DEFERIDO — UAT-38-1 registrado, blocked_on UAT-36-2 (chave no Vault)"
  prod_state: "EF não deployada; resend_api_key ausente do Vault (2026-07-23)"
---

# 38-04 — Deploy dormente + smoke (ADIADO — human_needed)

Este plano é um checkpoint de orquestrador (`autonomous: false`). Fiz as verificações **read-only** em PROD (Supabase MCP, projeto `isljnozzlvckrgjjbjwp`) e confirmei o blocker que a própria fase antecipava:

- A EF `notificar-candidato` **ainda não está deployada**.
- O Vault tem `edge_invoke_key` e `project_url`, mas **não** tem `resend_api_key` → **UAT-36-2 continua pendente** (ação humana do Fernando: gerar a chave PROD dedicada no Resend e criar o segredo no Vault). Sem a chave, a EF grava `falhou` (graceful) e o smoke não pode provar `status='enviado'`.

**Decisão do operador (2026-07-23):** adiar deploy + smoke para uma sessão humana única. **Nenhuma mudança foi feita em PROD.** Registrei o procedimento completo (provisionar chave → deploy dormente → smoke → idempotência → limpeza) em `38-HUMAN-UAT.md` (UAT-38-1, `blocked_on: UAT-36-2`).

O código da fase (38-01/02/03) está completo e provado por `deno test` (17/17). O único item aberto é o smoke live (COMM-01 critério 4). A **P39 não deve aterrissar antes deste smoke** (cadeia estrita 38→39: os triggers precisam de uma EF viva e provada).

**Deviations:** plano executado como checkpoint deferido (não como trabalho de código). **Next:** Fernando executa UAT-36-2 + UAT-38-1; o autonomous segue para a Phase 39 com o registro de que a EF ainda não foi smoke-testada em PROD.
