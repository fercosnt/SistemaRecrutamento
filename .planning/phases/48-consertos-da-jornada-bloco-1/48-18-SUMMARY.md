---
phase: 48-consertos-da-jornada-bloco-1
plan: 18
subsystem: prova-prod
status: complete
tags: [prova-prod, d-19, jorn-06, jorn-18, jorn-19, jorn-27, uat, sessao-humana]

requires: [48-01, 48-02, 48-03, 48-04, 48-05, 48-06, 48-07, 48-08, 48-09, 48-10, 48-11, 48-12, 48-13, 48-14, 48-15, 48-16, 48-17, 48-19]
provides:
  - "p48_prontidao_prod.sql — 25/25 objetos da fase no ar antes de chamar o operador"
  - "p48_prova_prod.sql — 17 booleanos, um por prova, contados depois de T0 e só em conta +claude: 17/17 true em 2026-09-22"
  - "48-PROVA-PROD.md — T0, prontidão, linha de base, as duas sessões humanas com as conferências do operador, contraprovas e o que não foi rodado"
affects: [phase-48-verification]

actuals:
  tasks: 3
  commits: 3
plan_head_before: 816b7b08

key-files:
  created:
    - supabase/tests/p48_prontidao_prod.sql
    - supabase/tests/p48_prova_prod.sql
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-PROVA-PROD.md
  modified:
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-18-PLAN.md
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md

key-decisions:
  - "Consultas rodadas pelo MCP do Supabase, só leitura (SET TRANSACTION READ ONLY): o Keychain recusa o token do p46apply.cjs ao processo do Claude (exit 36), como no 48-05"
  - "Operador (sessão 1): os Defeitos 30 e 31 entram no JORN-06 — viraram o plano 48-19, provado aqui pelo passo (m)"
  - "Nenhum reset de conta de teste: inscrições novas bastaram (+claude5, +claude6); teardown e flip da purga não rodados"

requirements-completed: [JORN-20, JORN-27, JORN-18, JORN-15, JORN-U2, JORN-24, JORN-06, JORN-19, JORN-D5]

coverage:
  - id: T1
    description: "Tudo o que a fase construiu está no ar antes da sessão humana"
    verification:
      - kind: integration
        ref: "p48_prontidao_prod.sql 25/25; 7 bundles com os marcadores; 6 marcadores do front no chunk certo (47 chunks); origin/main..HEAD vazio"
        status: pass
    human_judgment: false
  - id: S1
    description: "Sessão 1 — confirmação D-09, knockout sem IA, rejeição na triagem avisada e explicada, cognitivo avisado, link inválido recusado, devolutiva gerada"
    requirement: [JORN-15, JORN-U2, JORN-20, JORN-22, JORN-24, JORN-06, JORN-D5, JORN-26]
    verification:
      - kind: integration
        ref: "p48_prova_prod.sql — as 9 p1_* true"
        status: pass
    human_judgment: true
    rationale: "Cópia de e-mail e tela conferidas pelo operador (48-PROVA-PROD.md §4)"
  - id: S2
    description: "Sessão 2 — revisão, reabertura com prazo, D-23, redecisão avisada, avisos do titular, devolutiva nova com o texto oficial"
    requirement: [JORN-18, JORN-19, JORN-27, JORN-06]
    verification:
      - kind: integration
        ref: "p48_prova_prod.sql — as 8 p2_* true; contraprovas: md5 5/5 páginas = template do disco; três RH distintos na cadeia D-23; prazo gravado = limite exclusivo da fórmula do 48-11"
        status: pass
    human_judgment: true
    rationale: "Diálogo do RH2, recusa do RH-A, caixa e painel da candidata e caixa do titular conferidos pelo operador (48-PROVA-PROD.md §5)"

completed: 2026-09-22
---

# Phase 48 Plan 18: prova em PROD pela consulta Summary

**Os sete critérios de sucesso da Phase 48 estão provados em produção, medidos no banco. A consulta `p48_prova_prod.sql`, rodada só leitura com o T0 `2026-09-21T23:00:36Z`, devolve 17 de 17 `true`. As conferências de caixa e de tela feitas pelo operador nas duas sessões batem com o que o banco mostra. A sessão 1 achou dois defeitos novos na devolutiva (30 e 31); o operador decidiu consertá-los dentro do JORN-06, e eles foram consertados no 48-19 e provados na sessão 2, com o texto servido idêntico byte a byte ao template oficial.**

## O que foi feito

| Task | Entrega | Commit |
|---|---|---|
| 1 (tracer) | Sonda de prontidão (25/25), consulta de prova, T0, linha de base | `dd6089e3` |
| 2 (sessão 1) | 9/9 `p1_*`; Defeitos 30/31 → 48-19; `p1_devolutiva_gerada` corrigida | `cf010939` |
| 3 (sessão 2) | 17/17; contraprovas; observações fora do bloco registradas | este commit |

## Desvios

**1. [Teste] A `p1_devolutiva_gerada` não conseguia passar.** Ela comparava `devolutivas_candidato.candidato_id`, que guarda o uid do Auth, com `candidatos.id`. Na sessão 1, saiu `false` com a devolutiva já gravada no banco. A conferência de forma da Task 1 verificou que a coluna existia, mas não o que ela guarda. Corrigi para filtrar por `candidatura_id` (48-19).

**2. [Escopo] O 48-19 nasceu dentro da prova.** Os defeitos 30 e 31 só apareceram quando a primeira devolutiva real foi gerada, depois do conserto do 401. Por decisão do operador, o JORN-06 não fechou sem eles.

## Não rodado

`p47_teardown_dados_de_teste.sql` e o flip `p_confirmo_live := true` da purga não foram rodados, e não houve reset de conta.

## Fora do Bloco 1, registrado

- O rodapé da devolutiva: «revisado por psicólogo(a)» e o termo «self-assessment». A frase negada **fica**, por decisão do operador.
- O botão «Acompanhar candidatura».
- O e-mail de aprovação neutro (PP-14).
- Os defeitos 21 e 23 (Blocos 3 e 4).
- O canal `lgpd@` (PP-16).
