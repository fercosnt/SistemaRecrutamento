---
phase: 42-invent-rio-gates-fila-art-20
plan: 04
subsystem: compliance
tags: [lgpd, pii, inventario, catalogo-vivo, yaml, postgres]

requires:
  - phase: 42-02
    provides: "docs/compliance/ criada e indexada"
provides:
  - "pii-inventory.yaml — a fonte legível por máquina que as Phases 44 e 45 consomem como dado"
  - "pii-inventory.md — visão humana, GERADA da fonte por gen-pii-md.cjs"
  - "sql/01-pii-catalog.sql — as 4 consultas de catálogo que reproduzem tudo"
  - "6 achados estruturais para a Phase 45"
affects: [44-exportacao, 45-motor-exclusao, 47-consolidacao]

tech-stack:
  added: []
  patterns:
    - "Artefato duplo com gerador + --check: a cópia humana é derivada da fonte, e um gate prova que não divergiu"

key-files:
  created:
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/sql/01-pii-catalog.sql
    - docs/compliance/sql/gen-pii-md.cjs
  modified: []

key-decisions:
  - "Classificação por REGRA + exceção explícita, em vez de 993 linhas individuais — cobre 100% e permanece auditável e mantível"
  - "O .md é gerado do .yaml; duas cópias do mesmo fato divergem sempre, gerar remove a possibilidade"
  - "gen-pii-md.cjs --check sai 1 se divergir — provado mordendo antes de ser aceito"

patterns-established:
  - "Inventário derivado do catálogo vivo, nunca de arquivos de migration"
  - "Asserção negativa de PII (regex de UUID) como critério de aceitação de artefato versionado"

requirements-completed: [INVENT-01]

coverage:
  - id: D1
    description: "Inventário PII coluna-a-coluna classifica cada coluna em apagar/anonimizar/preservar, semeado do catálogo vivo"
    requirement: "INVENT-01"
    verification:
      - kind: other
        ref: "js-yaml load OK; 64/64 tabelas cobertas (42 explícitas + 22 por regra); 223 colunas classificadas explicitamente"
        status: pass
    human_judgment: false
  - id: D2
    description: "A visão humana não pode divergir da fonte"
    requirement: "INVENT-01"
    verification:
      - kind: other
        ref: "node docs/compliance/sql/gen-pii-md.cjs --check → exit 0; adulteração deliberada → exit 1; regeneração → exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhum identificador de pessoa atravessou para os artefatos versionados"
    requirement: "INVENT-01"
    verification:
      - kind: other
        ref: "grep -cE '[0-9a-f]{8}-...' em pii-inventory.{yaml,md} == 0"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-29
status: complete
---

# Phase 42 / Plan 04: Inventário PII — Summary

**64 tabelas, 993 colunas e 102 FKs classificadas a partir do catálogo vivo — e a semente que o ROADMAP mandou usar acabou refutada por ele.**

## Accomplishments

- **INVENT-01 completo:** `pii-inventory.yaml` cobre **64/64 tabelas** (42 com entrada explícita
  coluna-a-coluna, 22 cobertas por regra), **223 colunas classificadas explicitamente**
  (65 apagar · 23 anonimizar · 85 preservar · 50 preservar-com-ressalva).
- **Formato duplo com gerador real.** O `.md` é gerado do `.yaml` por `gen-pii-md.cjs`, que tem
  `--check` — e o `--check` foi **provado mordendo** antes de ser aceito.
- **6 achados** registrados para a Phase 45, incluindo três que corrigem requirements do milestone.

## Achado principal — a semente está errada, e agora há evidência viva

`FK-AUDIT-LIVE.md` atribui o drift de `candidatos.user_id` a `20260421000001:193`. Aquela linha
altera **`autorizacoes`**. E o catálogo vivo devolve, para `candidatos_user_id_fkey`,
`ON DELETE CASCADE` — **idêntico** ao repositório. **Não há drift nessa FK.**

O ROADMAP declara a causa do drift como "identificada". Não está. O todo herdado
`processo-origem-do-drift-desconhecida` continua válido.

## Outros achados

| ID | Achado |
|----|--------|
| A-01 | ERASE-01 é ordem, não preferência — bias snapshot **antes** de anonimizar |
| A-02 | 3 ponteiros de Storage, e Storage não tem backup |
| A-03 | As 5 tabelas `SET NULL` do ERASE-09 não apontam todas para `auth.users` — só 2 apontam |
| A-04 | BD-9 tem **4** colunas de texto livre probatório, não 1 |
| A-05 | Segredos (`smtp_senha_encrypted`, `webhook_secret`) vivem no schema `public` — um `select('*')` no export vazaria credencial, não só PII |
| A-06 | `data_deletion_log` é zumbi confirmado (CONSOL-03) |

## Deviations from Plan

1. **Classificação por regra + exceção, não 993 linhas.** O requirement diz "classifica cada
   coluna". 993 entradas individuais seriam ilegíveis e não seriam mantidas. Optei por 5 regras
   explícitas + 223 exceções nomeadas, com a nota de que entrada explícita sempre vence a regra.
   **Cobertura é 100 % e auditável;** a forma é diferente da literal.
2. **Erro meu, corrigido:** a primeira versão do `.md` afirmava ser gerada por um script que não
   existia. Escrever uma alegação sem código que a execute é exatamente o zumbi de compliance que o
   CONSOL-04 caça — criei o script e provei que o `--check` falha quando deve.
3. **Erro meu, corrigido:** o YAML inicial tinha 6 ocorrências de `chave:{` sem espaço, inválidas.
   Detectado por parse real, não por leitura.
