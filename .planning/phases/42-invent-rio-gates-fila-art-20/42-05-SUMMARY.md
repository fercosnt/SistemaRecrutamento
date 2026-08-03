---
phase: 42-invent-rio-gates-fila-art-20
plan: 05
subsystem: compliance
tags: [lgpd, cron, pg_cron, backup, pitr, storage, ddl, drift]

requires:
  - phase: 42-02
    provides: "docs/compliance/ criada e indexada"
provides:
  - "cron-inventory.md — os 3 cron.job vivos, rastreáveis, com o gate bloqueante NÃO disparado"
  - "ddl-idiom-sweep.md — 7/7 ocorrências A+B verificadas contra o catálogo vivo"
  - "backup-posture.md — Storage sem backup (PITR PENDENTE)"
  - "achados-inventario.md — correções à semente e achados estruturais"
  - "Fato datado de blast radius do INVENT-05: 0 linhas"
affects: [45-motor-exclusao, 46-purga-automatica, 47-consolidacao]

tech-stack:
  added: []
  patterns:
    - "Gate bloqueante declarado ANTES da coleta (contagem esperada de jobs), não interpretado depois"

key-files:
  created:
    - docs/compliance/cron-inventory.md
    - docs/compliance/ddl-idiom-sweep.md
    - docs/compliance/backup-posture.md
    - docs/compliance/achados-inventario.md
    - docs/compliance/sql/02-cron-live.sql
  modified: []

key-decisions:
  - "INVENT-02 entregue PARCIAL e marcado como tal no próprio artefato, em vez de adiado inteiro ou preenchido por suposição"
  - "A refutação da premissa do INVENT-04 é registrada como achado, não escondida para o requirement parecer cumprido"

patterns-established:
  - "Artefato que sabe estar incompleto declara isso no topo, com o que falta e o que aquilo bloqueia"

requirements-completed: [INVENT-03, INVENT-04]

coverage:
  - id: D1
    description: "Diff dos cron.job vivos contra o repositório, cada job rastreável a uma migration"
    requirement: "INVENT-03"
    verification:
      - kind: other
        ref: "SELECT ... FROM cron.job → exatamente 3 jobs, todos active, nomes e schedules conforme esperado; gate bloqueante não disparou"
        status: pass
    human_judgment: false
  - id: D2
    description: "Varredura do idioma ADD COLUMN IF NOT EXISTS identificando cláusulas FK silenciadas"
    requirement: "INVENT-04"
    verification:
      - kind: other
        ref: "grep → 16 ocorrências / 8 arquivos / 1 classe A / 6 classe B; as 7 conferidas contra information_schema + pg_constraint: 7/7 landed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Status de backup registrado como fato datado, com o registro explícito de que Storage não é coberto"
    requirement: "INVENT-02"
    verification:
      - kind: manual_procedural
        ref: "backup-posture.md — metade Storage estabelecida; metade PITR NÃO verificada (sem SUPABASE_ACCESS_TOKEN, MCP não expõe backups)"
        status: fail
    human_judgment: true
    rationale: "Exige credencial de operador (Management API) ou sessão de dashboard. Não é automatizável pelo agente. Rastreado em .planning/todos/pending/42-pitr-nao-verificado-bloqueia-p45.md"

duration: 30min
completed: 2026-07-29
status: complete
---

# Phase 42 / Plan 05: Cron, DDL e postura de backup — Summary

**Os três jobs vivos batem com o repositório, o idioma acusado não silenciou nada, e a causa do drift que o ROADMAP dava como identificada segue desconhecida.**

## Accomplishments

- **INVENT-03 ✅** — exatamente **3** `cron.job`, todos `active`, todos rastreáveis a migration.
  O gate bloqueante (qualquer 4º job ou corpo divergente) **não disparou** — descarta a hipótese de
  caminho de escrita apontado para purga fora do repositório.
- **INVENT-04 ✅** — 16 ocorrências / 8 arquivos; **1** classe A e **6** classe B. As 7 verificadas
  contra o **catálogo vivo**: **7/7 landed corretamente**.
- **INVENT-02 ⚠ PARCIAL** — metade Storage entregue; metade PITR bloqueada por credencial.
- **Fato datado de blast radius do INVENT-05:** `ai_call_logs` = **0 linhas**.

## A premissa do INVENT-04 foi refutada nos dois níveis

1. A citação da semente aponta para a tabela errada — `20260421000001:193` altera `autorizacoes`,
   não `candidatos`.
2. Não há drift em `candidatos.user_id` — vivo e repo dizem `ON DELETE CASCADE`, idênticos.

E as 7 ocorrências do idioma **landed todas**. O idioma pode silenciar FK; **neste repositório não
silenciou nenhuma.**

**O risco real de fidelidade de schema é outro (A-01):** ~40 tabelas legadas têm DDL fora do ledger,
em 49 scripts `docs/sql/sql/*.sql`. Um inventário que leia só `supabase/migrations/` vê um fragmento
e se declara completo.

## Correção ao enunciado do INVENT-05 (A-07)

O bug é **latente, não ativo**. Com `candidate_ai_decisions` vazia, a subquery devolve zero linhas e
`x NOT IN (conjunto vazio)` é `TRUE` — **o cron apaga corretamente hoje**. Arma-se quando existir
linha protegida com elemento `NULL` no array.

O efeito da correção é **impedir que o `DELETE` pare de apagar no futuro, em silêncio** — não
"voltar a apagar". E com 0 linhas, a correção não pode apagar nada hoje: é a janela mais segura
possível para tocar um `DELETE` vivo.

## Deviations from Plan

1. **INVENT-02 entregue pela metade, declaradamente.** Sem `SUPABASE_ACCESS_TOKEN` e sem dashboard,
   o PITR não é obtenível pelo agente. Preferi entregar a metade Storage — que é a que a Phase 45
   mais usa e que não dependia de credencial — e marcar a outra como **bloqueio da Phase 45** no
   topo do próprio artefato. Rastreado em `42-pitr-nao-verificado-bloqueia-p45.md`.
2. **As 7 verificações A+B foram feitas contra o catálogo já coletado no 42-04**, em vez de 7
   consultas novas. Mesma fonte, mesma data, menos ida e volta a PROD.
